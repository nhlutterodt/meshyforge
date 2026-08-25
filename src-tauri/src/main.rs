// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if let Err(error) = meshyforge::run() {
        eprintln!("MeshyForge could not start: {error}");
        std::process::exit(1);
    }
}
