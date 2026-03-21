use tauri::Manager;
use std::process::{Command, Child};
use std::sync::Mutex;
use std::path::PathBuf;

struct PythonBackend(Mutex<Option<Child>>);

fn find_backend_dir() -> Option<PathBuf> {
    // 1. Check relative to the executable (bundled app)
    //    Exe is at: .../Market POS.app/Contents/MacOS/market-pos
    //    Backend is at: .../Market/backend
    if let Ok(exe) = std::env::current_exe() {
        let mut dir = exe.clone();
        // Walk up from the exe and look for backend/ at each level
        for _ in 0..10 {
            dir = match dir.parent() {
                Some(p) => p.to_path_buf(),
                None => break,
            };
            let candidate = dir.join("backend");
            if candidate.join("app").join("main.py").exists() {
                return Some(candidate);
            }
        }
    }

    // 2. Check relative to current working directory
    if let Ok(cwd) = std::env::current_dir() {
        let candidate = cwd.join("backend");
        if candidate.join("app").join("main.py").exists() {
            return Some(candidate);
        }
        let candidate = cwd.join("../backend");
        if candidate.join("app").join("main.py").exists() {
            return Some(candidate);
        }
    }

    // 3. Check config file for stored path
    let config_path = dirs::home_dir()
        .unwrap_or_default()
        .join(".market-pos")
        .join("backend_path");
    if config_path.exists() {
        if let Ok(path) = std::fs::read_to_string(&config_path) {
            let candidate = PathBuf::from(path.trim());
            if candidate.join("app").join("main.py").exists() {
                return Some(candidate);
            }
        }
    }

    None
}

fn find_python(backend_dir: &PathBuf) -> PathBuf {
    // Check venv first
    let venv_python = backend_dir.join("venv/bin/python3");
    if venv_python.exists() {
        return venv_python;
    }
    // Fall back to system python
    PathBuf::from("python3")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let backend_dir = find_backend_dir();

            match backend_dir {
                Some(dir) => {
                    let python = find_python(&dir);

                    // Save path for future reference
                    let config_dir = dirs::home_dir()
                        .unwrap_or_default()
                        .join(".market-pos");
                    let _ = std::fs::create_dir_all(&config_dir);
                    let _ = std::fs::write(
                        config_dir.join("backend_path"),
                        dir.to_string_lossy().as_bytes(),
                    );

                    let child = Command::new(&python)
                        .args(["-m", "uvicorn", "app.main:app", "--port", "8000"])
                        .current_dir(&dir)
                        .spawn();

                    match child {
                        Ok(process) => {
                            app.manage(PythonBackend(Mutex::new(Some(process))));
                            println!("Python backend started: {:?} in {:?}", python, dir);
                        }
                        Err(e) => {
                            eprintln!("Failed to start backend: {} (python: {:?}, dir: {:?})", e, python, dir);
                            app.manage(PythonBackend(Mutex::new(None)));
                        }
                    }
                }
                None => {
                    eprintln!("Backend directory not found!");
                    app.manage(PythonBackend(Mutex::new(None)));
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle: &tauri::AppHandle, event: tauri::RunEvent| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                // Trigger backup before exit
                let _ = Command::new("curl")
                    .args(["-s", "-X", "POST", "http://localhost:8000/sync/backup"])
                    .output();

                // Kill Python backend
                if let Some(state) = app_handle.try_state::<PythonBackend>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(child) = guard.as_mut() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}
