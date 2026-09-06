use serde::{Deserialize, Serialize};
use std::path::Path;

const RECOVERY_MODE: &str = "--recovery-mode";
const MAX_ATTEMPTS: u8 = 1;
const APP_IDENTIFIER: &str = "com.meshyforge.app";
const REQUEST_FILE: &str = "recovery/request.json";
const RESULT_FILE: &str = "recovery/result.json";
const STARTUP_STATUS_FILE: &str = "recovery/startup-status.json";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProcessMode {
    Normal,
    Recovery,
}

pub fn recovery_request_path(data_dir: &Path) -> std::path::PathBuf {
    data_dir.join(REQUEST_FILE)
}

pub fn recovery_result_path(data_dir: &Path) -> std::path::PathBuf {
    data_dir.join(RESULT_FILE)
}

pub fn startup_status_path(data_dir: &Path) -> std::path::PathBuf {
    data_dir.join(STARTUP_STATUS_FILE)
}

pub fn platform_data_dir() -> Result<std::path::PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        return std::env::var_os("APPDATA")
            .map(|path| std::path::PathBuf::from(path).join(APP_IDENTIFIER))
            .ok_or_else(|| "APP_DATA_DIRECTORY_UNAVAILABLE".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        return std::env::var_os("HOME")
            .map(|path| {
                std::path::PathBuf::from(path)
                    .join("Library")
                    .join("Application Support")
                    .join(APP_IDENTIFIER)
            })
            .ok_or_else(|| "APP_DATA_DIRECTORY_UNAVAILABLE".to_string());
    }

    #[cfg(target_os = "linux")]
    {
        let root = std::env::var_os("XDG_DATA_HOME")
            .map(std::path::PathBuf::from)
            .or_else(|| {
                std::env::var_os("HOME")
                    .map(|path| std::path::PathBuf::from(path).join(".local").join("share"))
            })
            .ok_or_else(|| "APP_DATA_DIRECTORY_UNAVAILABLE".to_string())?;
        return Ok(root.join(APP_IDENTIFIER));
    }

    #[allow(unreachable_code)]
    Err("APP_DATA_DIRECTORY_UNSUPPORTED".to_string())
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RecoveryOperation {
    Restore,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RecoveryRequest {
    pub operation: RecoveryOperation,
    pub backup_id: String,
    pub attempt: u8,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum RecoveryOutcome {
    Restored,
    NoValidBackup,
    Failed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RecoveryResult {
    pub outcome: RecoveryOutcome,
    pub backup_id: Option<String>,
    pub failure_code: Option<String>,
}

pub fn parse_process_mode(args: &[String]) -> Result<ProcessMode, String> {
    let recovery_count = args.iter().filter(|arg| arg.as_str() == RECOVERY_MODE).count();
    if recovery_count == 0 {
        return Ok(ProcessMode::Normal);
    }
    if recovery_count > 1 || args.len() != 2 {
        return Err("INVALID_RECOVERY_MODE".to_string());
    }
    Ok(ProcessMode::Recovery)
}

pub fn parse_request(serialized: &str) -> Result<RecoveryRequest, String> {
    let request: RecoveryRequest =
        serde_json::from_str(serialized).map_err(|_| "INVALID_RECOVERY_REQUEST".to_string())?;
    if request.operation != RecoveryOperation::Restore
        || request.attempt > MAX_ATTEMPTS
        || !is_valid_backup_id(&request.backup_id)
    {
        return Err("INVALID_RECOVERY_REQUEST".to_string());
    }
    Ok(request)
}

pub fn serialize_result(result: &RecoveryResult) -> Result<String, String> {
    serde_json::to_string(result).map_err(|_| "RECOVERY_RESULT_SERIALIZATION_FAILED".to_string())
}

pub fn next_attempt(request: &RecoveryRequest) -> Result<RecoveryRequest, String> {
    if request.attempt >= MAX_ATTEMPTS {
        return Err("RECOVERY_ATTEMPTS_EXHAUSTED".to_string());
    }
    let mut claimed = request.clone();
    claimed.attempt += 1;
    Ok(claimed)
}

pub fn is_valid_backup_id(backup_id: &str) -> bool {
    if backup_id.is_empty()
        || backup_id.len() > 80
        || backup_id.contains(['/', '\\', ':'])
        || backup_id.starts_with('.')
        || !backup_id.ends_with(".db")
    {
        return false;
    }
    backup_id
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.'))
}

pub fn backup_path(recovery_dir: &Path, backup_id: &str) -> Result<std::path::PathBuf, String> {
    if !is_valid_backup_id(backup_id) {
        return Err("INVALID_BACKUP_ID".to_string());
    }
    let root = recovery_dir
        .canonicalize()
        .map_err(|_| "RECOVERY_DIRECTORY_UNAVAILABLE".to_string())?;
    let candidate = root.join(backup_id);
    let canonical = candidate
        .canonicalize()
        .map_err(|_| "BACKUP_NOT_FOUND".to_string())?;
    if canonical.parent() != Some(root.as_path()) || !canonical.is_file() {
        return Err("INVALID_BACKUP_PATH".to_string());
    }
    Ok(canonical)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn argument(value: &str) -> String {
        value.to_string()
    }

    #[test]
    fn parses_normal_and_recovery_modes() {
        assert_eq!(
            parse_process_mode(&[argument("meshyforge")]).unwrap(),
            ProcessMode::Normal
        );
        assert_eq!(
            parse_process_mode(&[argument("meshyforge"), argument(RECOVERY_MODE)]).unwrap(),
            ProcessMode::Recovery
        );
    }

    #[test]
    fn rejects_ambiguous_or_repeated_recovery_modes() {
        assert!(parse_process_mode(&[argument("meshyforge"), argument(RECOVERY_MODE), argument("x")]).is_err());
        assert!(parse_process_mode(&[argument("meshyforge"), argument(RECOVERY_MODE), argument(RECOVERY_MODE)]).is_err());
    }

    #[test]
    fn rejects_invalid_backup_identifiers_and_retry_loops() {
        for backup_id in ["", "../backup.db", "C:\\backup.db", ".hidden.db", "backup.txt"] {
            assert!(!is_valid_backup_id(backup_id), "accepted {backup_id:?}");
        }
        assert!(parse_request(r#"{"operation":"restore","backup_id":"backup-1.db","attempt":2}"#).is_err());
        assert!(parse_request(r#"{"operation":"restore","backup_id":"backup-1.db","attempt":1}"#).is_ok());
    }

    #[test]
    fn claims_recovery_once_then_exhausts_attempts() {
        let request = parse_request(
            r#"{"operation":"restore","backup_id":"backup-1.db","attempt":0}"#,
        )
        .unwrap();
        let claimed = next_attempt(&request).unwrap();
        assert_eq!(claimed.attempt, 1);
        assert_eq!(next_attempt(&claimed), Err("RECOVERY_ATTEMPTS_EXHAUSTED".to_string()));
    }

    #[test]
    fn resolves_only_a_regular_file_inside_the_recovery_directory() {
        let directory = tempfile::tempdir().unwrap();
        fs::write(directory.path().join("backup-1.db"), b"backup").unwrap();
        assert!(backup_path(directory.path(), "backup-1.db").is_ok());
        assert!(backup_path(directory.path(), "../backup-1.db").is_err());
        assert!(backup_path(directory.path(), "missing.db").is_err());
    }

    #[test]
    fn serializes_only_sanitized_result_metadata() {
        let result = RecoveryResult {
            outcome: RecoveryOutcome::Failed,
            backup_id: None,
            failure_code: Some("NO_VALID_BACKUP".to_string()),
        };
        let serialized = serialize_result(&result).unwrap();
        assert!(serialized.contains("NO_VALID_BACKUP"));
        assert!(!serialized.contains(std::path::MAIN_SEPARATOR));
    }
}
