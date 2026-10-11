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
use commands::recovery::{RecoveryStatus, RecoveryUiState};
use std::fs;
use std::process::Command;
use storage::recovery_protocol::{
    next_attempt, parse_process_mode, parse_request, platform_data_dir, recovery_request_path,
    recovery_result_path, serialize_result, ProcessMode, RecoveryOutcome, RecoveryResult,
};
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
            commands::recovery::recovery_status,
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
            commands::api::create_text_to_motion,
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
        .run(app_context())?;
    Ok(())
}

/// The single `generate_context!` expansion for both builders. On macOS each
/// expansion embeds an Info.plist symbol (`_EMBED_INFO_PLIST`), so expanding
/// it in both `run` and `run_recovery_ui` fails to link.
fn app_context() -> tauri::Context<tauri::Wry> {
    tauri::generate_context!()
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
            if database_path.exists() {
                match preflight_integrity(&database_path) {
                    storage::database::IntegrityStatus::Corrupt => {
                        write_startup_recovery_status(&data_dir)?;
                        return run_recovery_ui();
                    }
                    storage::database::IntegrityStatus::Ok => {
                        clear_stale_recovery_state(&data_dir);
                    }
                    storage::database::IntegrityStatus::Unavailable => {}
                }
            } else {
                clear_stale_recovery_state(&data_dir);
            }
            run().map_err(|_| "APPLICATION_START_FAILED".to_string())
        }
    }
}

/// Best-effort removal of the stale startup status and recovery result so a
/// healthy normal launch reports `Normal`. The dead-letter request and the
/// quarantine directory are evidence and are never touched here.
fn clear_stale_recovery_state(data_dir: &std::path::Path) {
    for path in [
        storage::recovery_protocol::startup_status_path(data_dir),
        recovery_result_path(data_dir),
    ] {
        // NotFound is the common case; any other failure is non-fatal because
        // the app must still start.
        let _ = fs::remove_file(path);
    }
}

/// Runs the read-only integrity check, retrying while the result is
/// `Unavailable` (for example SQLITE_BUSY from another instance). Persistent
/// unavailability is never treated as corruption.
fn preflight_integrity(database_path: &std::path::Path) -> storage::database::IntegrityStatus {
    const ATTEMPTS: usize = 3;
    const RETRY_DELAY: std::time::Duration = std::time::Duration::from_millis(200);
    let mut status = storage::database::IntegrityStatus::Unavailable;
    for attempt in 0..ATTEMPTS {
        status = storage::Database::file_integrity_check(database_path);
        if status != storage::database::IntegrityStatus::Unavailable {
            break;
        }
        if attempt + 1 < ATTEMPTS {
            std::thread::sleep(RETRY_DELAY);
        }
    }
    status
}

/// Recovery-mode entry point: runs the restore, then relaunches the normal
/// executable on every terminal path. The normal launch's preflight decides
/// whether the user sees the library or the recovery UI, and because the
/// request is always retired it can never respawn recovery mode.
fn run_recovery_process() -> Result<(), String> {
    let data_dir = platform_data_dir()?;
    run_recovery_process_inner(&data_dir);
    let executable =
        std::env::current_exe().map_err(|_| "RECOVERY_EXECUTABLE_UNAVAILABLE".to_string())?;
    Command::new(executable)
        .spawn()
        .map_err(|_| "APPLICATION_RESTART_FAILED".to_string())?;
    Ok(())
}

/// Performs the recovery attempt for `data_dir` without spawning processes.
///
/// Every terminal path (restored, exhausted attempts, unreadable or invalid
/// request, restore failure) retires `request.json` so the next normal launch
/// does not start recovery mode again. Failures are recorded as a sanitized
/// `Failed` result with a stable code (best effort).
fn run_recovery_process_inner(data_dir: &std::path::Path) -> RecoveryResult {
    let request_path = recovery_request_path(data_dir);
    let result_path = recovery_result_path(data_dir);

    let result = match claim_and_restore(data_dir, &request_path) {
        Ok(backup_id) => RecoveryResult {
            outcome: RecoveryOutcome::Restored,
            backup_id: Some(backup_id),
            failure_code: None,
        },
        Err((backup_id, code)) => RecoveryResult {
            outcome: RecoveryOutcome::Failed,
            backup_id,
            failure_code: Some(code),
        },
    };

    let _ = write_recovery_result(&result_path, result.clone());
    retire_request(&request_path);
    if result.outcome == RecoveryOutcome::Restored {
        let _ = fs::remove_file(storage::recovery_protocol::startup_status_path(data_dir));
    }
    result
}

/// Reads, validates and claims the request, then restores the backup. On
/// failure returns the backup ID (when known) and a stable failure code.
fn claim_and_restore(
    data_dir: &std::path::Path,
    request_path: &std::path::Path,
) -> Result<String, (Option<String>, String)> {
    let unknown = |code: String| (None, code);
    let serialized_request = fs::read_to_string(request_path)
        .map_err(|_| unknown("RECOVERY_REQUEST_UNAVAILABLE".to_string()))?;
    let request = parse_request(&serialized_request).map_err(unknown)?;
    let known = |code: String| (Some(request.backup_id.clone()), code);
    let claimed_request = next_attempt(&request).map_err(known)?;
    let claimed_json = serde_json::to_string(&claimed_request)
        .map_err(|_| known("RECOVERY_REQUEST_SERIALIZATION_FAILED".to_string()))?;
    write_atomic(request_path, claimed_json.as_bytes()).map_err(known)?;

    let manager =
        storage::RecoveryManager::new(data_dir.join("meshyforge.db"), data_dir.join("recovery"));
    manager
        .restore_backup(&request.backup_id)
        .map(|_| request.backup_id.clone())
        .map_err(known)
}

/// Moves the request aside to a dead-letter file (replacing any older one);
/// if that fails, deletes it. Best effort: the request must not remain.
fn retire_request(request_path: &std::path::Path) {
    if !request_path.exists() {
        return;
    }
    let dead_letter = storage::recovery_protocol::dead_letter_request_path(request_path);
    let _ = fs::remove_file(&dead_letter);
    if fs::rename(request_path, &dead_letter).is_ok() {
        return;
    }
    if fs::remove_file(request_path).is_err() {
        let _ = fs::remove_dir_all(request_path);
    }
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
        .run(app_context())
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

#[cfg(test)]
mod tests {
    use super::*;
    use commands::recovery::recovery_status_inner;

    fn write_stale_failure_state(data_dir: &std::path::Path) {
        write_startup_recovery_status(data_dir).unwrap();
        write_recovery_result(
            &recovery_result_path(data_dir),
            RecoveryResult {
                outcome: RecoveryOutcome::Failed,
                backup_id: None,
                failure_code: Some("BACKUP_NOT_FOUND".to_string()),
            },
        )
        .unwrap();
    }

    /// Creates a live DB holding one asset, plus a real backup of it.
    /// Returns (live DB bytes, backup ID).
    fn seed_data_dir(data_dir: &std::path::Path) -> (Vec<u8>, String) {
        let database_path = data_dir.join("meshyforge.db");
        let manager = storage::RecoveryManager::new(&database_path, data_dir.join("recovery"));
        let backup_id = {
            let database = storage::Database::open(&database_path).unwrap();
            let backup = manager.create_backup(&database).unwrap();
            backup.file_name().unwrap().to_str().unwrap().to_string()
        };
        (fs::read(&database_path).unwrap(), backup_id)
    }

    fn write_request(data_dir: &std::path::Path, contents: &[u8]) {
        let path = recovery_request_path(data_dir);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, contents).unwrap();
    }

    fn read_result(data_dir: &std::path::Path) -> RecoveryResult {
        let contents = fs::read_to_string(recovery_result_path(data_dir)).unwrap();
        serde_json::from_str(&contents).unwrap()
    }

    fn assert_failed_and_retired(
        data_dir: &std::path::Path,
        returned: &RecoveryResult,
        expected_code: &str,
        live_bytes: &[u8],
    ) {
        assert_eq!(returned.outcome, RecoveryOutcome::Failed);
        assert_eq!(returned.failure_code.as_deref(), Some(expected_code));
        let written = read_result(data_dir);
        assert_eq!(written.outcome, RecoveryOutcome::Failed);
        assert_eq!(written.failure_code.as_deref(), Some(expected_code));
        assert!(
            !recovery_request_path(data_dir).exists(),
            "request.json must be retired so normal launch cannot respawn recovery"
        );
        assert_eq!(
            fs::read(data_dir.join("meshyforge.db")).unwrap(),
            live_bytes,
            "live DB must be untouched"
        );
        assert!(!data_dir.join("recovery").join("quarantine").exists());
    }

    #[test]
    fn exhausted_attempts_request_is_retired_with_failed_result() {
        let data_dir = tempfile::tempdir().unwrap();
        let (live_bytes, backup_id) = seed_data_dir(data_dir.path());
        write_request(
            data_dir.path(),
            format!(r#"{{"operation":"restore","backup_id":"{backup_id}","attempt":1}}"#)
                .as_bytes(),
        );

        let result = run_recovery_process_inner(data_dir.path());

        assert_failed_and_retired(
            data_dir.path(),
            &result,
            "RECOVERY_ATTEMPTS_EXHAUSTED",
            &live_bytes,
        );
        assert!(
            storage::recovery_protocol::dead_letter_request_path(&recovery_request_path(
                data_dir.path()
            ))
            .exists()
        );
    }

    #[test]
    fn invalid_or_unreadable_request_is_retired_with_failed_result() {
        let cases: [(&str, &[u8]); 2] = [
            ("not json", b"{ definitely not json"),
            ("non-utf8", &[0xFF, 0xFE, 0xFD, 0x00]),
        ];
        for (label, contents) in cases {
            let data_dir = tempfile::tempdir().unwrap();
            let (live_bytes, _) = seed_data_dir(data_dir.path());
            write_request(data_dir.path(), contents);

            let result = run_recovery_process_inner(data_dir.path());

            let expected = if label == "non-utf8" {
                "RECOVERY_REQUEST_UNAVAILABLE"
            } else {
                "INVALID_RECOVERY_REQUEST"
            };
            assert_failed_and_retired(data_dir.path(), &result, expected, &live_bytes);
        }
    }

    #[test]
    fn request_that_is_a_directory_is_retired_with_failed_result() {
        let data_dir = tempfile::tempdir().unwrap();
        let (live_bytes, _) = seed_data_dir(data_dir.path());
        fs::create_dir_all(recovery_request_path(data_dir.path())).unwrap();

        let result = run_recovery_process_inner(data_dir.path());

        assert_failed_and_retired(
            data_dir.path(),
            &result,
            "RECOVERY_REQUEST_UNAVAILABLE",
            &live_bytes,
        );
    }

    #[test]
    fn request_naming_a_missing_backup_is_retired_with_failed_result() {
        let data_dir = tempfile::tempdir().unwrap();
        let (live_bytes, _) = seed_data_dir(data_dir.path());
        write_request(
            data_dir.path(),
            br#"{"operation":"restore","backup_id":"backup-5.db","attempt":0}"#,
        );

        let result = run_recovery_process_inner(data_dir.path());

        assert_failed_and_retired(data_dir.path(), &result, "BACKUP_NOT_FOUND", &live_bytes);
        assert_eq!(result.backup_id.as_deref(), Some("backup-5.db"));
    }

    #[test]
    fn retiring_a_request_replaces_an_older_dead_letter() {
        let data_dir = tempfile::tempdir().unwrap();
        let (_, _) = seed_data_dir(data_dir.path());
        let dead_letter = storage::recovery_protocol::dead_letter_request_path(
            &recovery_request_path(data_dir.path()),
        );
        fs::write(&dead_letter, b"old").unwrap();
        write_request(data_dir.path(), b"{ new garbage");

        run_recovery_process_inner(data_dir.path());

        assert_eq!(fs::read(&dead_letter).unwrap(), b"{ new garbage");
        assert!(!recovery_request_path(data_dir.path()).exists());
    }

    #[test]
    fn successful_restore_clears_request_and_startup_status() {
        let data_dir = tempfile::tempdir().unwrap();
        let (_, backup_id) = seed_data_dir(data_dir.path());
        write_startup_recovery_status(data_dir.path()).unwrap();
        fs::write(data_dir.path().join("meshyforge.db"), b"corrupt live db").unwrap();
        write_request(
            data_dir.path(),
            format!(r#"{{"operation":"restore","backup_id":"{backup_id}","attempt":0}}"#)
                .as_bytes(),
        );

        let result = run_recovery_process_inner(data_dir.path());

        assert_eq!(result.outcome, RecoveryOutcome::Restored);
        assert_eq!(
            read_result(data_dir.path()).outcome,
            RecoveryOutcome::Restored
        );
        assert!(!recovery_request_path(data_dir.path()).exists());
        assert!(!storage::recovery_protocol::startup_status_path(data_dir.path()).exists());
        assert_eq!(
            storage::Database::file_integrity_check(&data_dir.path().join("meshyforge.db")),
            storage::database::IntegrityStatus::Ok
        );
    }

    #[test]
    fn clearing_stale_state_removes_status_and_result_but_keeps_evidence() {
        let data_dir = tempfile::tempdir().unwrap();
        write_stale_failure_state(data_dir.path());
        let recovery_dir = data_dir.path().join("recovery");
        fs::create_dir_all(recovery_dir.join("quarantine").join("1")).unwrap();
        let dead_letter = recovery_dir.join("recovery-request.failed.json");
        fs::write(&dead_letter, b"{}").unwrap();

        clear_stale_recovery_state(data_dir.path());

        assert!(!storage::recovery_protocol::startup_status_path(data_dir.path()).exists());
        assert!(!recovery_result_path(data_dir.path()).exists());
        assert!(dead_letter.exists());
        assert!(recovery_dir.join("quarantine").join("1").exists());
    }

    #[test]
    fn clearing_stale_state_tolerates_absent_files() {
        let data_dir = tempfile::tempdir().unwrap();
        clear_stale_recovery_state(data_dir.path());
        clear_stale_recovery_state(data_dir.path());
    }

    #[test]
    fn stale_files_report_recovery_until_cleared_then_normal() {
        let data_dir = tempfile::tempdir().unwrap();
        write_stale_failure_state(data_dir.path());
        let before = recovery_status_inner(data_dir.path()).unwrap();
        assert!(matches!(before.state, RecoveryUiState::RecoveryFailed));

        fs::remove_file(recovery_result_path(data_dir.path())).unwrap();
        let before = recovery_status_inner(data_dir.path()).unwrap();
        assert!(matches!(before.state, RecoveryUiState::RecoveryRequired));

        write_stale_failure_state(data_dir.path());
        clear_stale_recovery_state(data_dir.path());
        let after = recovery_status_inner(data_dir.path()).unwrap();
        assert!(matches!(after.state, RecoveryUiState::Normal));
        assert!(after.failure_code.is_none());
    }

    #[test]
    fn normal_builder_does_not_register_the_destructive_restore_command() {
        let source = include_str!("lib.rs");
        let start = source.find("pub fn run() ->").unwrap();
        let end = source.find("fn app_context()").unwrap();
        let normal_builder = &source[start..end];
        assert!(normal_builder.contains("commands::recovery::recovery_status"));
        assert!(!normal_builder.contains("request_recovery_restore"));

        let ui_start = source.find("fn run_recovery_ui()").unwrap();
        let ui_end = source[ui_start..].find("\n}\n").unwrap() + ui_start;
        assert!(source[ui_start..ui_end].contains("request_recovery_restore"));
    }
}
