use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

const RECOVERY_MODE: &str = "--recovery-mode";
const MAX_ATTEMPTS: u8 = 1;
const APP_IDENTIFIER: &str = "com.meshyforge.app";
const REQUEST_FILE: &str = "recovery/request.json";
const DEAD_LETTER_FILE: &str = "recovery-request.failed.json";
const RESULT_FILE: &str = "recovery/result.json";
const STARTUP_STATUS_FILE: &str = "recovery/startup-status.json";
const LOCK_FILE: &str = "recovery/restore.lock";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProcessMode {
    Normal,
    Recovery,
}

pub fn recovery_request_path(data_dir: &Path) -> std::path::PathBuf {
    data_dir.join(REQUEST_FILE)
}

/// Dead-letter location for a retired request, next to the request itself.
pub fn dead_letter_request_path(request_path: &Path) -> std::path::PathBuf {
    request_path.with_file_name(DEAD_LETTER_FILE)
}

pub fn recovery_result_path(data_dir: &Path) -> std::path::PathBuf {
    data_dir.join(RESULT_FILE)
}

pub fn startup_status_path(data_dir: &Path) -> std::path::PathBuf {
    data_dir.join(STARTUP_STATUS_FILE)
}

pub fn recovery_lock_path(data_dir: &Path) -> std::path::PathBuf {
    data_dir.join(LOCK_FILE)
}

/// Audit M2. A recovery lock older than this is treated as abandoned.
///
/// The claim in `claim_and_restore` is read → `next_attempt` → write, so without
/// mutual exclusion two launches can both read `attempt: 0`, both write
/// `attempt: 1`, and both restore. `create_new` gives the atomicity; this window
/// gives liveness, because a killed process cannot run its `Drop`.
///
/// 60s is far above a real restore (copy, migrate, integrity check, checkpoint,
/// rename — sub-second for a typical library) yet short enough that a crash does
/// not strand the user. Stealing early is survivable rather than catastrophic
/// precisely because each restore now stages under its OWN name: the loser of a
/// stolen lock finds the live database already moved and fails closed with
/// `LIVE_DATABASE_MISSING`, which the recovery UI owns.
pub const LOCK_STEAL_AFTER_MILLIS: u64 = 60_000;

/// Exclusive ownership of a recovery attempt. Removes the lock file on drop, so
/// every ordinary exit — including an early `?` return or a panic — releases it.
pub struct RecoveryLock {
    path: std::path::PathBuf,
    owner: LockOwner,
}

impl Drop for RecoveryLock {
    fn drop(&mut self) {
        // Only release a lock we still OWN. If this attempt was slow enough to
        // be judged abandoned, the file now belongs to whoever stole it, and
        // deleting it unconditionally would unlock THAT process mid-restore.
        let Ok(contents) = std::fs::read_to_string(&self.path) else {
            return;
        };
        if serde_json::from_str::<LockOwner>(&contents).ok().as_ref() == Some(&self.owner) {
            let _ = std::fs::remove_file(&self.path);
        }
    }
}

/// Identity of one acquisition. `nonce` makes two acquisitions by the same PID
/// within the same millisecond distinguishable, so a stale guard can never match
/// a newer lock by coincidence.
#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
struct LockOwner {
    pid: u32,
    acquired_at: u64,
    nonce: u64,
}

static LOCK_NONCE: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis() as u64)
        .unwrap_or(0)
}

/// Creates the lock file with `O_CREAT|O_EXCL`, which is atomic on both NTFS and
/// POSIX. Success is ownership; `AlreadyExists` means someone else owns it.
fn write_new_lock(path: &Path, now: u64) -> std::io::Result<LockOwner> {
    use std::io::Write;
    let owner = LockOwner {
        pid: std::process::id(),
        acquired_at: now,
        nonce: LOCK_NONCE.fetch_add(1, std::sync::atomic::Ordering::Relaxed),
    };
    let bytes = serde_json::to_vec(&owner).map_err(std::io::Error::other)?;
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)?;
    file.write_all(&bytes)?;
    Ok(owner)
}

/// Age of the lock, preferring the recorded stamp and falling back to the file's
/// mtime. The fallback matters: `create_new` and the write are two steps, so a
/// racing process can observe a still-empty file. Judging that by content alone
/// would call a microseconds-old lock "corrupt" and steal it.
fn lock_age_millis(path: &Path, now: u64) -> Option<u64> {
    if let Ok(contents) = std::fs::read_to_string(path) {
        if let Ok(owner) = serde_json::from_str::<LockOwner>(&contents) {
            return Some(now.saturating_sub(owner.acquired_at));
        }
    }
    let modified = std::fs::metadata(path).ok()?.modified().ok()?;
    let stamp = modified.duration_since(UNIX_EPOCH).ok()?.as_millis() as u64;
    Some(now.saturating_sub(stamp))
}

/// Takes the recovery lock, or returns `None` when another attempt owns it.
pub fn acquire_recovery_lock(data_dir: &Path) -> Option<RecoveryLock> {
    acquire_recovery_lock_at(data_dir, now_millis(), LOCK_STEAL_AFTER_MILLIS)
}

/// `now` and `steal_after` are parameters so the abandonment path is testable
/// without waiting out the real window — the same seam as
/// `MeshyClient::download_file_capped`.
pub(crate) fn acquire_recovery_lock_at(
    data_dir: &Path,
    now: u64,
    steal_after: u64,
) -> Option<RecoveryLock> {
    let path = recovery_lock_path(data_dir);
    std::fs::create_dir_all(path.parent()?).ok()?;
    match write_new_lock(&path, now) {
        Ok(owner) => return Some(RecoveryLock { path, owner }),
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
        Err(_) => return None,
    }
    // An unreadable lock is abandoned rather than permanent: a lock nobody can
    // ever clear is the dead-end class this recovery path keeps having to fix.
    let abandoned = lock_age_millis(&path, now).map_or(true, |age| age >= steal_after);
    if !abandoned {
        return None;
    }
    let _ = std::fs::remove_file(&path);
    // Re-create rather than assume: another process may have won the same race.
    let owner = write_new_lock(&path, now).ok()?;
    Some(RecoveryLock { path, owner })
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
    let recovery_count = args
        .iter()
        .filter(|arg| arg.as_str() == RECOVERY_MODE)
        .count();
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

/// A backup ID is exactly `backup-<one or more ASCII digits>.db`, the shape
/// produced by `RecoveryManager::create_backup`.
pub fn is_valid_backup_id(backup_id: &str) -> bool {
    if backup_id.len() > 80 {
        return false;
    }
    backup_id
        .strip_prefix("backup-")
        .and_then(|rest| rest.strip_suffix(".db"))
        .is_some_and(|digits| {
            !digits.is_empty() && digits.chars().all(|character| character.is_ascii_digit())
        })
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
        assert!(parse_process_mode(&[
            argument("meshyforge"),
            argument(RECOVERY_MODE),
            argument("x")
        ])
        .is_err());
        assert!(parse_process_mode(&[
            argument("meshyforge"),
            argument(RECOVERY_MODE),
            argument(RECOVERY_MODE)
        ])
        .is_err());
    }

    #[test]
    fn rejects_invalid_backup_identifiers_and_retry_loops() {
        for backup_id in [
            "",
            "../backup.db",
            "C:\\backup.db",
            ".hidden.db",
            "backup.txt",
            "x.db",
            "backup-.db",
            "backup-1a.db",
            "backup-1.db.db",
            "backup-1.tmp",
            "Backup-1.db",
            "backup-1.db ",
            "backup--1.db",
            "backup-\u{ff11}.db",
        ] {
            assert!(!is_valid_backup_id(backup_id), "accepted {backup_id:?}");
        }
        assert!(is_valid_backup_id("backup-1.db"));
        assert!(is_valid_backup_id("backup-100.db"));
        assert!(is_valid_backup_id("backup-1760000000000.db"));
        assert!(
            parse_request(r#"{"operation":"restore","backup_id":"backup-1.db","attempt":2}"#)
                .is_err()
        );
        assert!(
            parse_request(r#"{"operation":"restore","backup_id":"backup-1.db","attempt":1}"#)
                .is_ok()
        );
    }

    #[test]
    fn claims_recovery_once_then_exhausts_attempts() {
        let request =
            parse_request(r#"{"operation":"restore","backup_id":"backup-1.db","attempt":0}"#)
                .unwrap();
        let claimed = next_attempt(&request).unwrap();
        assert_eq!(claimed.attempt, 1);
        assert_eq!(
            next_attempt(&claimed),
            Err("RECOVERY_ATTEMPTS_EXHAUSTED".to_string())
        );
    }

    #[test]
    fn resolves_only_a_regular_file_inside_the_recovery_directory() {
        let directory = tempfile::tempdir().unwrap();
        fs::write(directory.path().join("backup-1.db"), b"backup").unwrap();
        assert!(backup_path(directory.path(), "backup-1.db").is_ok());
        assert!(backup_path(directory.path(), "../backup-1.db").is_err());
        assert!(backup_path(directory.path(), "missing.db").is_err());
        fs::write(directory.path().join("x.db"), b"backup").unwrap();
        assert_eq!(
            backup_path(directory.path(), "x.db"),
            Err("INVALID_BACKUP_ID".to_string())
        );
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

    // ─── Audit M2: exclusive recovery lock ───────────────────────────────────

    #[test]
    fn second_lock_acquisition_fails_while_the_first_is_held() {
        let dir = tempfile::tempdir().unwrap();
        let _first = acquire_recovery_lock(dir.path()).expect("first acquisition");
        assert!(
            acquire_recovery_lock(dir.path()).is_none(),
            "two concurrent recoveries must not both own the claim"
        );
    }

    #[test]
    fn lock_is_released_when_the_guard_drops() {
        let dir = tempfile::tempdir().unwrap();
        {
            let _lock = acquire_recovery_lock(dir.path()).unwrap();
            assert!(recovery_lock_path(dir.path()).exists());
        }
        assert!(!recovery_lock_path(dir.path()).exists());
        assert!(acquire_recovery_lock(dir.path()).is_some());
    }

    #[test]
    fn abandoned_lock_is_stolen_only_after_the_window() {
        let dir = tempfile::tempdir().unwrap();
        let _held = acquire_recovery_lock_at(dir.path(), 1_000, 60_000).unwrap();
        assert!(acquire_recovery_lock_at(dir.path(), 2_000, 60_000).is_none());
        assert!(acquire_recovery_lock_at(dir.path(), 61_000, 60_000).is_some());
    }

    #[test]
    fn releasing_a_stolen_lock_does_not_unlock_its_new_owner() {
        // A slow attempt judged abandoned must not, on its way out, delete the
        // lock belonging to the process that replaced it.
        let dir = tempfile::tempdir().unwrap();
        let stale = acquire_recovery_lock_at(dir.path(), 1_000, 60_000).unwrap();
        let current = acquire_recovery_lock_at(dir.path(), 61_000, 60_000).unwrap();
        drop(stale);
        assert!(
            recovery_lock_path(dir.path()).exists(),
            "the slow owner must not delete the lock the new owner holds"
        );
        assert!(acquire_recovery_lock_at(dir.path(), 62_000, 60_000).is_none());
        drop(current);
        assert!(!recovery_lock_path(dir.path()).exists());
    }

    #[test]
    fn a_just_created_empty_lock_is_not_mistaken_for_an_abandoned_one() {
        // create_new and the write are two steps, so a racing process can observe
        // a still-empty file. Judging by content alone would steal a live lock.
        let dir = tempfile::tempdir().unwrap();
        let path = recovery_lock_path(dir.path());
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, b"").unwrap();
        assert!(acquire_recovery_lock_at(dir.path(), now_millis(), 60_000).is_none());
    }

    #[test]
    fn an_unparseable_lock_is_stolen_once_it_is_old() {
        // Fail open on garbage: a lock nobody can ever clear is the permanent
        // dead-end class this recovery path keeps having to fix.
        let dir = tempfile::tempdir().unwrap();
        let path = recovery_lock_path(dir.path());
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, b"not json").unwrap();
        let later = now_millis() + 120_000;
        assert!(acquire_recovery_lock_at(dir.path(), later, 60_000).is_some());
    }
}
