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

/// Helper: JSON error string (CSD §7.2 pattern), matching `api.rs`/`assets.rs`.
fn error_json(code: &str, message: &str) -> String {
    serde_json::to_string(&serde_json::json!({
        "code": code,
        "message": message,
    }))
    .unwrap_or_else(|_| format!("{{\"code\":\"{}\",\"message\":\"{}\"}}", code, message))
}

/// Map a stable bare recovery code (as produced by the inner functions and
/// `platform_data_dir`) to a human-readable message. Unknown codes fall back
/// to the code itself so the envelope never hides a new code entirely.
fn enrich(code: &str) -> String {
    match code {
        "RECOVERY_DIRECTORY_UNAVAILABLE" => "The recovery directory is unavailable.",
        "INVALID_BACKUP_ID" => "The selected backup is not valid.",
        "BACKUP_NOT_FOUND" => "The selected backup could not be found.",
        "INVALID_BACKUP_PATH" => "The selected backup path is not valid.",
        "RECOVERY_EXECUTABLE_UNAVAILABLE" => "The application executable could not be located.",
        "RECOVERY_PROCESS_START_FAILED" => "The recovery process could not be started.",
        "RECOVERY_REQUEST_PATH_INVALID" => "The recovery request path is not valid.",
        "RECOVERY_REQUEST_WRITE_FAILED" => "The recovery request could not be written.",
        "RECOVERY_REQUEST_SERIALIZATION_FAILED" => "The recovery request could not be serialized.",
        "RECOVERY_REQUEST_COMMIT_FAILED" => "The recovery request could not be committed.",
        "APP_DATA_DIRECTORY_UNAVAILABLE" => "The application data directory is unavailable.",
        "APP_DATA_DIRECTORY_UNSUPPORTED" => {
            "The application data directory is not supported on this platform."
        }
        _ => code,
    }
    .to_string()
}

/// Command-boundary error mapping: wrap a bare stable code in the shared
/// `{"code": "...", "message": "..."}` JSON envelope.
fn envelope_error(code: String) -> String {
    error_json(&code, &enrich(&code))
}

#[tauri::command]
pub fn recovery_status() -> Result<RecoveryStatus, String> {
    let data_dir = platform_data_dir().map_err(envelope_error)?;
    recovery_status_inner(&data_dir).map_err(envelope_error)
}

pub(crate) fn recovery_status_inner(data_dir: &Path) -> Result<RecoveryStatus, String> {
    let recovery_dir = data_dir.join("recovery");
    let backup_dir = recovery_dir.join("backups");
    let mut backup_ids = Vec::new();
    if backup_dir.exists() {
        for entry in fs::read_dir(&backup_dir).map_err(|_| "RECOVERY_DIRECTORY_UNAVAILABLE")? {
            let path = entry.map_err(|_| "RECOVERY_DIRECTORY_UNAVAILABLE")?.path();
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
    let data_dir = platform_data_dir().map_err(envelope_error)?;
    request_recovery_restore_inner(&data_dir, &backup_id).map_err(envelope_error)?;
    let executable = std::env::current_exe()
        .map_err(|_| envelope_error("RECOVERY_EXECUTABLE_UNAVAILABLE".to_string()))?;
    Command::new(executable)
        .arg("--recovery-mode")
        .spawn()
        .map_err(|_| envelope_error("RECOVERY_PROCESS_START_FAILED".to_string()))?;
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

#[cfg(test)]
mod tests {
    use super::*;

    /// Every stable bare code that can reach the recovery command boundary:
    /// codes produced inside this module plus codes surfaced through
    /// `platform_data_dir()` and `recovery_protocol::backup_path()`.
    const MAPPED_RECOVERY_CODES: &[&str] = &[
        "RECOVERY_DIRECTORY_UNAVAILABLE",
        "INVALID_BACKUP_ID",
        "BACKUP_NOT_FOUND",
        "INVALID_BACKUP_PATH",
        "RECOVERY_EXECUTABLE_UNAVAILABLE",
        "RECOVERY_PROCESS_START_FAILED",
        "RECOVERY_REQUEST_PATH_INVALID",
        "RECOVERY_REQUEST_WRITE_FAILED",
        "RECOVERY_REQUEST_SERIALIZATION_FAILED",
        "RECOVERY_REQUEST_COMMIT_FAILED",
        "APP_DATA_DIRECTORY_UNAVAILABLE",
        "APP_DATA_DIRECTORY_UNSUPPORTED",
    ];

    /// True for SCREAMING_SNAKE_CASE literals of the shape used by bare
    /// recovery error codes.
    fn looks_like_stable_code(text: &str) -> bool {
        text.len() >= 4
            && text
                .chars()
                .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || c == '_')
    }

    /// Collect the quoted stable-code literals appearing in a source file.
    fn bare_code_literals(source: &str) -> Vec<String> {
        let mut found = Vec::new();
        let mut current = String::new();
        let mut inside_literal = false;
        for character in source.chars() {
            if character == '"' {
                if inside_literal && looks_like_stable_code(&current) {
                    found.push(current.clone());
                }
                current.clear();
                inside_literal = !inside_literal;
            } else if inside_literal {
                current.push(character);
            }
        }
        found
    }

    #[test]
    fn error_json_builds_the_shared_envelope() {
        let raw = error_json("my_code", "something went wrong");
        let parsed: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(parsed["code"], "my_code");
        assert_eq!(parsed["message"], "something went wrong");
    }

    #[test]
    fn every_stable_recovery_code_is_enriched_at_the_boundary() {
        for code in MAPPED_RECOVERY_CODES {
            let raw = envelope_error((*code).to_string());
            let parsed: serde_json::Value = serde_json::from_str(&raw)
                .unwrap_or_else(|_| panic!("envelope for {code} must be valid JSON"));
            assert_eq!(parsed["code"], *code, "code must survive the IPC boundary");
            let message = parsed["message"]
                .as_str()
                .unwrap_or_else(|| panic!("message missing for {code}"));
            assert!(!message.trim().is_empty(), "message empty for {code}");
            assert_ne!(
                message, *code,
                "{code} has no human-readable message in enrich()"
            );
        }
    }

    #[test]
    fn unknown_codes_keep_the_code_as_the_message() {
        let raw = envelope_error("not-a-known-recovery-code".to_string());
        let parsed: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(parsed["code"], "not-a-known-recovery-code");
        assert_eq!(parsed["message"], "not-a-known-recovery-code");
    }

    #[test]
    fn all_bare_codes_produced_at_this_boundary_are_mapped() {
        // Codes produced inside this module (implementation section only).
        let source = include_str!("recovery.rs");
        let implementation = source
            .split("#[cfg(test)]")
            .next()
            .expect("recovery.rs must contain a test module");
        let mut produced = bare_code_literals(implementation);
        // Codes that reach the boundary from outside this file:
        // `platform_data_dir()` and `recovery_protocol::backup_path()`, which
        // the inner functions call and propagate unchanged.
        produced.extend_from_slice(&[
            "APP_DATA_DIRECTORY_UNAVAILABLE".to_string(),
            "APP_DATA_DIRECTORY_UNSUPPORTED".to_string(),
            "INVALID_BACKUP_ID".to_string(),
            "BACKUP_NOT_FOUND".to_string(),
            "INVALID_BACKUP_PATH".to_string(),
        ]);
        produced.sort();
        produced.dedup();
        let mut expected: Vec<String> = MAPPED_RECOVERY_CODES
            .iter()
            .map(|c| c.to_string())
            .collect();
        expected.sort();
        assert_eq!(
            produced, expected,
            "a new bare recovery code was added without mapping it in enrich() and MAPPED_RECOVERY_CODES"
        );
    }

    #[test]
    fn listing_and_request_only_accept_real_backup_ids() {
        let data_dir = tempfile::tempdir().unwrap();
        let backups = data_dir.path().join("recovery").join("backups");
        fs::create_dir_all(&backups).unwrap();
        for name in ["backup-1.db", "backup-100.db", "x.db", "backup-1.db-shm"] {
            fs::write(backups.join(name), b"file").unwrap();
        }

        let status = recovery_status_inner(data_dir.path()).unwrap();
        assert_eq!(status.backup_ids, vec!["backup-1.db", "backup-100.db"]);
        assert_eq!(
            request_recovery_restore_inner(data_dir.path(), "x.db"),
            Err("INVALID_BACKUP_ID".to_string())
        );
        assert!(!recovery_request_path(data_dir.path()).exists());
    }
}
