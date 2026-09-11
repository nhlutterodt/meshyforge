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
use storage::recovery_protocol::{
    parse_process_mode, parse_request, platform_data_dir, recovery_request_path,
    recovery_result_path, serialize_result, next_attempt, ProcessMode, RecoveryOutcome,
    RecoveryResult,
};
use commands::recovery::{RecoveryStatus, RecoveryUiState};
use tauri::Manager;
use std::fs;
use std::process::Command;

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
            commands::recovery::recovery_status,
            commands::recovery::request_recovery_restore,
            // ─── API commands (Phase 1) ─────────────────────
            commands::api::get_credit_balance,
            commands::api::fetch_animation_library,
            commands::api::cache_animation_preview,
            // ─── Asset commands (Phase 1) ───────────────────
            commands::assets::get_all_assets,
            commands::assets::search_assets,
            commands::assets::update_tags,
            commands::assets::toggle_favorite,
            commands::assets::update_notes,
            commands::assets::delete_asset,
            commands::assets::get_storage_usage,
            commands::assets::reveal_in_file_manager,
            commands::assets::export_asset,
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
            commands::api::create_creative_lab,
            commands::api::poll_task,
            commands::api::stream_task,
            commands::api::delete_task,
            commands::api::download_asset,
        ])
        .run(tauri::generate_context!())?;
    Ok(())
}

pub fn run_process(args: &[String]) -> Result<(), String> {
    match parse_process_mode(args)? {
        ProcessMode::Recovery => run_recovery_process(),
        ProcessMode::Normal => {
            let data_dir = platform_data_dir()?;
            let request_path = recovery_request_path(&data_dir);
            if request_path.exists() {
                let executable = std::env::current_exe()
                    .map_err(|_| "RECOVERY_EXECUTABLE_UNAVAILABLE".to_string())?;
                Command::new(executable)
                    .arg("--recovery-mode")
                    .spawn()
                    .map_err(|_| "RECOVERY_PROCESS_START_FAILED".to_string())?;
                return Ok(());
            }
            let database_path = data_dir.join("meshyforge.db");
            if database_path.exists()
                && !storage::Database::file_integrity_check(&database_path).unwrap_or(false)
            {
                write_startup_recovery_status(&data_dir)?;
                return run_recovery_ui();
            }
            run().map_err(|_| "APPLICATION_START_FAILED".to_string())
        }
    }
}

fn run_recovery_process() -> Result<(), String> {
    let data_dir = platform_data_dir()?;
    let request_path = recovery_request_path(&data_dir);
    let result_path = recovery_result_path(&data_dir);
    let serialized_request = fs::read_to_string(&request_path)
        .map_err(|_| "RECOVERY_REQUEST_UNAVAILABLE".to_string())?;
    let request = match parse_request(&serialized_request) {
        Ok(request) => request,
        Err(code) => {
            write_recovery_result(&result_path, RecoveryResult {
                outcome: RecoveryOutcome::Failed,
                backup_id: None,
                failure_code: Some(code.clone()),
            })?;
            let _ = fs::remove_file(&request_path);
            return Err(code);
        }
    };
    let claimed_request = next_attempt(&request)?;
    write_atomic(
        &request_path,
        serde_json::to_string(&claimed_request)
            .map_err(|_| "RECOVERY_REQUEST_SERIALIZATION_FAILED".to_string())?
            .as_bytes(),
    )?;

    let manager = storage::RecoveryManager::new(
        data_dir.join("meshyforge.db"),
        data_dir.join("recovery"),
    );
    let result = match manager.restore_backup(&request.backup_id) {
        Ok(_) => RecoveryResult {
            outcome: RecoveryOutcome::Restored,
            backup_id: Some(request.backup_id),
            failure_code: None,
        },
        Err(code) => RecoveryResult {
            outcome: RecoveryOutcome::Failed,
            backup_id: Some(request.backup_id),
            failure_code: Some(code),
        },
    };
    write_recovery_result(&result_path, result.clone())?;
    if result.outcome == RecoveryOutcome::Restored {
        fs::remove_file(&request_path).map_err(|_| "RECOVERY_REQUEST_CLEANUP_FAILED".to_string())?;
        let _ = fs::remove_file(storage::recovery_protocol::startup_status_path(&data_dir));
        let executable = std::env::current_exe()
            .map_err(|_| "RECOVERY_EXECUTABLE_UNAVAILABLE".to_string())?;
        Command::new(executable)
            .spawn()
            .map_err(|_| "APPLICATION_RESTART_FAILED".to_string())?;
    } else {
        fs::remove_file(&request_path).map_err(|_| "RECOVERY_REQUEST_CLEANUP_FAILED".to_string())?;
    }
    Ok(())
}

fn write_startup_recovery_status(data_dir: &std::path::Path) -> Result<(), String> {
    let status = RecoveryStatus {
        state: RecoveryUiState::RecoveryRequired,
        backup_ids: Vec::new(),
        quarantine_exists: data_dir.join("recovery").join("quarantine").exists(),
        failure_code: Some("DATABASE_INTEGRITY_CHECK_FAILED".to_string()),
    };
    let path = storage::recovery_protocol::startup_status_path(data_dir);
    let parent = path
        .parent()
        .ok_or_else(|| "RECOVERY_STATUS_PATH_INVALID".to_string())?;
    fs::create_dir_all(parent).map_err(|_| "RECOVERY_STATUS_WRITE_FAILED".to_string())?;
    let temporary = path.with_extension("tmp");
    let contents = serde_json::to_vec(&status)
        .map_err(|_| "RECOVERY_STATUS_SERIALIZATION_FAILED".to_string())?;
    fs::write(&temporary, contents).map_err(|_| "RECOVERY_STATUS_WRITE_FAILED".to_string())?;
    fs::rename(temporary, path).map_err(|_| "RECOVERY_STATUS_COMMIT_FAILED".to_string())
}

fn run_recovery_ui() -> Result<(), String> {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::recovery::recovery_status,
            commands::recovery::request_recovery_restore,
        ])
        .run(tauri::generate_context!())
        .map_err(|_| "RECOVERY_UI_START_FAILED".to_string())
}

fn write_recovery_result(path: &std::path::Path, result: RecoveryResult) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "RECOVERY_RESULT_PATH_INVALID".to_string())?;
    fs::create_dir_all(parent).map_err(|_| "RECOVERY_RESULT_WRITE_FAILED".to_string())?;
    let serialized = serialize_result(&result)?;
    write_atomic(path, serialized.as_bytes())
}

fn write_atomic(path: &std::path::Path, contents: &[u8]) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "RECOVERY_METADATA_PATH_INVALID".to_string())?;
    fs::create_dir_all(parent).map_err(|_| "RECOVERY_METADATA_WRITE_FAILED".to_string())?;
    let temporary = path.with_extension("tmp");
    fs::write(&temporary, contents).map_err(|_| "RECOVERY_METADATA_WRITE_FAILED".to_string())?;
    fs::rename(&temporary, path).map_err(|_| "RECOVERY_METADATA_COMMIT_FAILED".to_string())
}
