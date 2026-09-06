// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let args = std::env::args().collect::<Vec<_>>();
    if let Err(error) = meshyforge::run_process(&args) {
        eprintln!("MeshyForge could not start: {error}");
        std::process::exit(1);
    }
}
