use tauri::Manager;
use std::process::{Command, Child};
use std::sync::Mutex;
use std::path::PathBuf;

struct BackendProcess(Mutex<Option<Child>>);

fn find_backend_binary() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let exe_dir = exe.parent()?;

    let target = env!("TARGET_TRIPLE");

    // Sidecar binary name with target triple (Tauri externalBin convention)
    let binary_name = if cfg!(windows) {
        format!("market-pos-api-{}.exe", target)
    } else {
        format!("market-pos-api-{}", target)
    };

    // Check next to executable (bundled app location)
    let candidate = exe_dir.join(&binary_name);
    if candidate.exists() {
        return Some(candidate);
    }

    // Development fallback: check in binaries/ relative to src-tauri
    let candidate = exe_dir.join("binaries").join(&binary_name);
    if candidate.exists() {
        return Some(candidate);
    }

    // Development fallback: plain name without triple
    let plain_name = if cfg!(windows) { "market-pos-api.exe" } else { "market-pos-api" };
    let candidate = exe_dir.join(plain_name);
    if candidate.exists() {
        return Some(candidate);
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Ensure data directory exists
            let data_dir = dirs::home_dir()
                .unwrap_or_default()
                .join(".market-pos");
            let _ = std::fs::create_dir_all(&data_dir);

            match find_backend_binary() {
                Some(binary_path) => {
                    println!("Starting backend from: {:?}", binary_path);

                    let child = Command::new(&binary_path)
                        .spawn();

                    match child {
                        Ok(process) => {
                            app.manage(BackendProcess(Mutex::new(Some(process))));
                            println!("Backend started successfully");
                        }
                        Err(e) => {
                            eprintln!("Failed to start backend: {} (binary: {:?})", e, binary_path);
                            app.manage(BackendProcess(Mutex::new(None)));
                        }
                    }
                }
                None => {
                    eprintln!("Backend binary not found! The app will not be able to save data.");
                    app.manage(BackendProcess(Mutex::new(None)));
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

                // Kill backend process
                if let Some(state) = app_handle.try_state::<BackendProcess>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(child) = guard.as_mut() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}
