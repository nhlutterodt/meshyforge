// MeshyForge — Tauri application library
//
// Source: UI/UX §14.4 (command registration order)

pub mod app_state;
pub mod commands;
pub mod meshy;
pub mod provider;
pub mod security;
pub mod storage;

use app_state::AppState;
use tauri::Manager;

/// Entry point for the Tauri application.
pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;

            let state = AppState::new(data_dir)?;
            app.manage(state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // ─── Keychain commands (Phase 1) ────────────────
            commands::keychain::set_api_key,
            commands::keychain::get_api_key,
            commands::keychain::validate_api_key,
            commands::keychain::delete_api_key,
            // ─── API commands (Phase 1) ─────────────────────
            commands::api::get_credit_balance,
            commands::api::fetch_animation_library,
            // ─── Asset commands (Phase 1) ───────────────────
            commands::assets::get_all_assets,
            commands::assets::search_assets,
            commands::assets::update_tags,
            commands::assets::toggle_favorite,
            commands::assets::update_notes,
            commands::assets::delete_asset,
            commands::assets::get_storage_usage,
            commands::assets::reveal_in_file_manager,
            commands::assets::read_file_as_data_uri,
            commands::assets::save_completed_task,
            // ─── Task commands (Phase 3 — registered early) ─
            commands::api::create_text_to_3d,
            commands::api::create_image_to_3d,
            commands::api::create_multi_image_to_3d,
            commands::api::create_remesh,
            commands::api::create_retexture,
            commands::api::create_convert,
            commands::api::create_resize,
            commands::api::create_uv_unwrap,
            commands::api::create_rigging,
            commands::api::create_animation,
            commands::api::create_text_to_image,
            commands::api::create_image_to_image,
            commands::api::create_multi_color_print,
            commands::api::create_analyze_printability,
            commands::api::create_repair_printability,
            commands::api::poll_task,
            commands::api::stream_task,
            commands::api::delete_task,
            commands::api::download_asset,
        ])
        .run(tauri::generate_context!())?;
    Ok(())
}
