use crate::storage::recovery_protocol::{
    backup_path, is_valid_backup_id, platform_data_dir, recovery_request_path,
    recovery_result_path, startup_status_path, RecoveryOperation, RecoveryRequest,
};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum RecoveryUiState {
    Normal,
    RecoveryRequired,
    RecoveryInProgress,
    RecoveryFailed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryStatus {
    pub state: RecoveryUiState,
    pub backup_ids: Vec<String>,
    pub quarantine_exists: bool,
    pub failure_code: Option<String>,
}

#[tauri::command]
pub fn recovery_status() -> Result<RecoveryStatus, String> {
    recovery_status_inner(&platform_data_dir()?)
}

pub(crate) fn recovery_status_inner(data_dir: &Path) -> Result<RecoveryStatus, String> {
    let recovery_dir = data_dir.join("recovery");
    let backup_dir = recovery_dir.join("backups");
    let mut backup_ids = Vec::new();
    if backup_dir.exists() {
        for entry in fs::read_dir(&backup_dir).map_err(|_| "RECOVERY_DIRECTORY_UNAVAILABLE")? {
            let path = entry
                .map_err(|_| "RECOVERY_DIRECTORY_UNAVAILABLE")?
                .path();
            let id = path.file_name().and_then(|name| name.to_str());
            if let Some(id) = id {
                if is_valid_backup_id(id) && backup_path(&backup_dir, id).is_ok() {
                    backup_ids.push(id.to_string());
                }
            }
        }
    }
    backup_ids.sort();
    let quarantine_exists = recovery_dir.join("quarantine").exists();
    let failure_code = read_failure_code(&recovery_result_path(data_dir));
    let state = if failure_code.is_some() {
        RecoveryUiState::RecoveryFailed
    } else if recovery_request_path(data_dir).exists() {
        RecoveryUiState::RecoveryInProgress
    } else if startup_status_path(data_dir).exists() {
        RecoveryUiState::RecoveryRequired
    } else {
        RecoveryUiState::Normal
    };
    Ok(RecoveryStatus {
        state,
        backup_ids,
        quarantine_exists,
        failure_code,
    })
}

#[tauri::command]
pub fn request_recovery_restore(backup_id: String) -> Result<(), String> {
    let data_dir = platform_data_dir()?;
    request_recovery_restore_inner(&data_dir, &backup_id)?;
    let executable = std::env::current_exe()
        .map_err(|_| "RECOVERY_EXECUTABLE_UNAVAILABLE".to_string())?;
    Command::new(executable)
        .arg("--recovery-mode")
        .spawn()
        .map_err(|_| "RECOVERY_PROCESS_START_FAILED".to_string())?;
    std::process::exit(0);
}

pub(crate) fn request_recovery_restore_inner(
    data_dir: &Path,
    backup_id: &str,
) -> Result<(), String> {
    let backup_dir = data_dir.join("recovery").join("backups");
    backup_path(&backup_dir, backup_id)?;
    let request = RecoveryRequest {
        operation: RecoveryOperation::Restore,
        backup_id: backup_id.to_string(),
        attempt: 0,
    };
    let request_path = recovery_request_path(data_dir);
    let parent = request_path
        .parent()
        .ok_or_else(|| "RECOVERY_REQUEST_PATH_INVALID".to_string())?;
    fs::create_dir_all(parent).map_err(|_| "RECOVERY_REQUEST_WRITE_FAILED".to_string())?;
    let temporary = request_path.with_extension("tmp");
    let contents = serde_json::to_vec(&request)
        .map_err(|_| "RECOVERY_REQUEST_SERIALIZATION_FAILED".to_string())?;
    fs::write(&temporary, contents).map_err(|_| "RECOVERY_REQUEST_WRITE_FAILED".to_string())?;
    fs::rename(temporary, request_path).map_err(|_| "RECOVERY_REQUEST_COMMIT_FAILED".to_string())
}

fn read_failure_code(path: &Path) -> Option<String> {
    let contents = fs::read_to_string(path).ok()?;
    let result: crate::storage::recovery_protocol::RecoveryResult =
        serde_json::from_str(&contents).ok()?;
    result.failure_code
}