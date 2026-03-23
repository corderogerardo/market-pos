fn main() {
    // Make TARGET available at compile time so lib.rs can find the sidecar binary
    if let Ok(target) = std::env::var("TARGET") {
        println!("cargo:rustc-env=TARGET_TRIPLE={}", target);
    }
    tauri_build::build();
}
