use crate::storage::recovery_protocol::{backup_path, LOCK_STEAL_AFTER_MILLIS};
use crate::storage::Database;
use rusqlite::{Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

const BACKUP_PREFIX: &str = "backup-";
const BACKUP_SUFFIX: &str = ".db";
const DEFAULT_RETENTION: usize = 3;

pub struct RecoveryManager {
    database_path: PathBuf,
    recovery_dir: PathBuf,
    retention: usize,
    /// N11: re-validates recovery-lock ownership immediately before the
    /// destructive quarantine step. `None` = no lock context (legacy/test
    /// callers); the restart-mode path always supplies one.
    lock_check: Option<Box<dyn Fn() -> bool>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct QuarantineReport {
    pub quarantine_id: String,
    pub files: Vec<String>,
}

impl RecoveryManager {
    pub fn new(database_path: impl Into<PathBuf>, recovery_dir: impl Into<PathBuf>) -> Self {
        Self {
            database_path: database_path.into(),
            recovery_dir: recovery_dir.into(),
            retention: DEFAULT_RETENTION,
            lock_check: None,
        }
    }

    pub fn with_retention(mut self, retention: usize) -> Self {
        self.retention = retention.max(1);
        self
    }

    /// N11: supply the held recovery lock's ownership checker so a restore
    /// whose lock was stolen mid-attempt aborts before the destructive step.
    pub fn with_lock_check(mut self, check: impl Fn() -> bool + 'static) -> Self {
        self.lock_check = Some(Box::new(check));
        self
    }

    // L1 / SAN-01 disposition table (TASK-0050 PR-C). Every raw OS-error site
    // below was replaced with a fixed code. ALL are retry-safe: none moves the
    // LIVE database — they operate on backup files, staging validation, or the
    // clock — so NONE belongs in LIVE_DATABASE_DISPLACED_CODES (lib.rs). The
    // quarantine/rollback paths that CAN displace the live set already return
    // fixed displaced codes (M5). Codes: BACKUP_CREATE_FAILED (online/file
    // backup), BACKUP_DIRECTORY_FAILED (mkdir), BACKUP_INTEGRITY_FAILED (copy
    // corrupt), BACKUP_WRITE_FAILED (rename), BACKUP_ROTATION_FAILED (retain),
    // BACKUP_INTEGRITY_CHECK_FAILED (pragma probe), RECOVERY_CLOCK_UNAVAILABLE.
    pub fn create_backup(&self, database: &Database) -> Result<PathBuf, String> {
        self.write_backup(|temporary_path| {
            database
                .backup_to(temporary_path)
                .map_err(|_| "BACKUP_CREATE_FAILED".to_string())
        })
    }

    /// Backs up a database file that is not open in this process (used before
    /// pending migrations run). The source is read through a normal read-only
    /// connection, never `immutable=1`, so committed rows still sitting in the
    /// WAL are included in the copy.
    pub fn create_backup_from_file(&self, source: &Path) -> Result<PathBuf, String> {
        self.write_backup(|temporary_path| {
            let source_connection = Connection::open_with_flags(
                source,
                OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
            )
            .map_err(|_| "BACKUP_CREATE_FAILED".to_string())?;
            let mut destination =
                Connection::open(temporary_path).map_err(|_| "BACKUP_CREATE_FAILED".to_string())?;
            let backup = rusqlite::backup::Backup::new(&source_connection, &mut destination)
                .map_err(|_| "BACKUP_CREATE_FAILED".to_string())?;
            backup
                .run_to_completion(32, std::time::Duration::from_millis(10), None)
                .map_err(|_| "BACKUP_CREATE_FAILED".to_string())
        })
    }

    /// Shared backup flow: `.tmp` file, integrity check, rename, rotation.
    fn write_backup(
        &self,
        copy_into: impl FnOnce(&Path) -> Result<(), String>,
    ) -> Result<PathBuf, String> {
        let backup_dir = self.recovery_dir.join("backups");
        fs::create_dir_all(&backup_dir).map_err(|_| "BACKUP_DIRECTORY_FAILED".to_string())?;
        let timestamp = current_timestamp()?;
        let final_path = backup_dir.join(format!("{BACKUP_PREFIX}{timestamp}{BACKUP_SUFFIX}"));
        let temporary_path = backup_dir.join(format!("{BACKUP_PREFIX}{timestamp}.tmp"));

        if let Err(error) = copy_into(&temporary_path) {
            let _ = fs::remove_file(&temporary_path);
            return Err(error);
        }
        if !integrity_check(&temporary_path)? {
            let _ = fs::remove_file(&temporary_path);
            return Err("BACKUP_INTEGRITY_FAILED".to_string());
        }
        sync_file_contents(&temporary_path)?;
        fs::rename(&temporary_path, &final_path).map_err(|_| "BACKUP_WRITE_FAILED".to_string())?;
        self.rotate_backups()?;
        Ok(final_path)
    }

    pub fn quarantine_live_database(&self) -> Result<Option<PathBuf>, String> {
        Ok(self
            .quarantine_live_database_with_report()?
            .map(|(path, _)| path))
    }

    pub fn quarantine_live_database_with_report(
        &self,
    ) -> Result<Option<(PathBuf, QuarantineReport)>, String> {
        if !self.database_path.exists() {
            return Ok(None);
        }
        let quarantine_id = quarantine_id_for()?;
        let quarantine_dir = self.recovery_dir.join("quarantine").join(&quarantine_id);
        // M5: if the quarantine directory cannot even be created, nothing has
        // moved yet, so the live set is intact — but the code must still be a
        // FIXED one. A raw OS string here is unrecognised by the caller, which
        // then treats the launch as "no evidence" and starts fresh (SAN-01 +
        // M5, same defect as the rollback path below).
        fs::create_dir_all(&quarantine_dir).map_err(|_| "QUARANTINE_FAILED".to_string())?;
        // L6: collect the full live set (main + -wal/-shm/-journal) through one
        // helper so quarantine, rollback and TASK-0055's orphan sweep agree.
        let files = live_database_set(&self.database_path, true);

        let mut moved = Vec::new();
        let report = QuarantineReport {
            quarantine_id: quarantine_id.clone(),
            files: files
                .iter()
                .filter_map(|path| path.file_name()?.to_str().map(str::to_owned))
                .collect(),
        };
        let report_json = serde_json::to_vec(&report).map_err(|_| "RECOVERY_METADATA_FAILED")?;
        fs::write(quarantine_dir.join("report.json"), report_json)
            .map_err(|_| "RECOVERY_METADATA_FAILED")?;
        for source in &files {
            let file_name = source
                .file_name()
                .ok_or_else(|| "Database file has no file name".to_string())?;
            let destination = quarantine_dir.join(file_name);
            if let Err(error) = fs::rename(source, &destination) {
                log::warn!("Quarantine move failed: {error}");
                let mut rollback_failed = false;
                for (original, moved_path) in moved.iter().rev() {
                    if fs::rename(moved_path, original).is_err() {
                        rollback_failed = true;
                    }
                }
                let _ = fs::remove_dir(&quarantine_dir);
                // M5 + SAN-01. Two defects in one line, previously
                // `Err(error.to_string())`:
                //   1. raw OS text crossed this boundary, which is exactly what
                //      every other error here avoids by returning a fixed code;
                //   2. an UNRECOGNISED code let the caller treat a partially
                //      moved live set as "no evidence" and start fresh — i.e.
                //      create an empty database over the wreckage.
                // A clean rollback means the live set is intact, so a retry is
                // safe; a failed rollback means files are split across two
                // locations and only the recovery UI may touch them.
                return Err(if rollback_failed {
                    "QUARANTINE_ROLLBACK_FAILED".to_string()
                } else {
                    "QUARANTINE_FAILED".to_string()
                });
            }
            moved.push((source.clone(), destination));
        }
        Ok(Some((quarantine_dir, report)))
    }

    pub fn restore_backup(&self, backup_id: &str) -> Result<PathBuf, String> {
        let source = backup_path(&self.recovery_dir.join("backups"), backup_id)?;
        validate_backup_candidate(&source)?;
        // M2: a per-attempt staging name. The fixed `restore.tmp` let two
        // concurrent recoveries copy, migrate and rename the SAME file. The
        // exclusive lock is the primary control; this is what makes a stolen or
        // bypassed lock degrade instead of corrupt.
        let staging_path = staging_path_for(&self.database_path);
        sweep_abandoned_staging(&self.database_path, &staging_path);
        remove_stale_staging_file(&staging_path)?;
        // Declared before `staged_database` so it drops AFTER the connection
        // closes — on Windows an open handle would make the removal fail.
        let mut staged = StagedRestore::new(staging_path.clone());

        fs::copy(&source, &staging_path).map_err(|_| "BACKUP_STAGE_FAILED".to_string())?;
        let staged_database = match Database::open(&staging_path) {
            Ok(database) => database,
            Err(_) => return Err("BACKUP_MIGRATION_FAILED".to_string()),
        };
        if !staged_database
            .integrity_check()
            .map_err(|_| "BACKUP_INTEGRITY_CHECK_FAILED".to_string())?
        {
            return Err("BACKUP_INTEGRITY_CHECK_FAILED".to_string());
        }
        // After migrations the staged copy must match the reference schema built
        // from MIGRATIONS; a crafted schema_version must not let a foreign or
        // partial database replace the live one.
        if !staged_database.matches_current_schema().unwrap_or(false) {
            return Err("BACKUP_SCHEMA_MISMATCH".to_string());
        }
        drop(staged_database);
        // `?` here used to leak the staging set: the fixed name hid it because
        // the next run cleaned up. A unique name would not be so forgiving, so
        // the guard owns cleanup on every exit path.
        checkpoint_staged_database(&staging_path)?;
        // L2: the staged copy is newly written; flush it before the rename that
        // makes it the live database, so a crash cannot commit a torn file.
        sync_file_contents(&staging_path)?;

        // N11: the lock may have been stolen during the (potentially slow)
        // copy/migrate/checkpoint above. Re-validate ownership IMMEDIATELY
        // before the destructive step — a loser that proceeds here could
        // quarantine the winner's already-restored database. Nothing has
        // moved yet, so this code is retry-safe and NOT a displaced-DB code.
        if self.lock_check.as_ref().is_some_and(|check| !check()) {
            return Err("RECOVERY_LOCK_LOST".to_string());
        }

        let (quarantine_dir, _) = self
            .quarantine_live_database_with_report()?
            .ok_or_else(|| "LIVE_DATABASE_MISSING".to_string())?;
        if fs::rename(&staging_path, &self.database_path).is_err() {
            restore_quarantined_live_set(&quarantine_dir, &self.database_path)?;
            return Err("DATABASE_REPLACEMENT_FAILED".to_string());
        }
        staged.disarm();
        Ok(source)
    }

    fn rotate_backups(&self) -> Result<(), String> {
        let backup_dir = self.recovery_dir.join("backups");
        let mut backups = fs::read_dir(backup_dir)
            .map_err(|_| "BACKUP_ROTATION_FAILED".to_string())?
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .filter(|path| {
                path.file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| {
                        name.starts_with(BACKUP_PREFIX) && name.ends_with(BACKUP_SUFFIX)
                    })
            })
            .collect::<Vec<_>>();
        backups.sort_by(|left, right| right.file_name().cmp(&left.file_name()));
        for path in backups.into_iter().skip(self.retention) {
            fs::remove_file(path).map_err(|_| "BACKUP_ROTATION_FAILED".to_string())?;
        }
        Ok(())
    }
}

fn integrity_check(path: &Path) -> Result<bool, String> {
    let connection =
        Connection::open(path).map_err(|_| "BACKUP_INTEGRITY_CHECK_FAILED".to_string())?;
    let result: String = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|_| "BACKUP_INTEGRITY_CHECK_FAILED".to_string())?;
    Ok(result == "ok")
}

const SQLITE_HEADER: &[u8; 16] = b"SQLite format 3\0";
const MIN_SQLITE_FILE_BYTES: u64 = 100;
const REQUIRED_BACKUP_TABLES: [&str; 2] = ["schema_version", "assets"];

/// Validates a backup candidate before it is copied, migrated or allowed to
/// displace the live database. Runs no migrations and writes nothing.
fn validate_backup_candidate(path: &Path) -> Result<(), String> {
    let not_sqlite = || "BACKUP_NOT_SQLITE".to_string();
    let length = fs::metadata(path).map_err(|_| not_sqlite())?.len();
    if length < MIN_SQLITE_FILE_BYTES {
        return Err(not_sqlite());
    }
    let mut header = [0u8; 16];
    fs::File::open(path)
        .and_then(|mut file| file.read_exact(&mut header))
        .map_err(|_| not_sqlite())?;
    if &header != SQLITE_HEADER {
        return Err(not_sqlite());
    }
    // `immutable=1` keeps SQLite from creating -wal/-shm sidecars next to the
    // backup when the file header is flagged WAL.
    let connection = Connection::open_with_flags(
        immutable_read_only_uri(path),
        OpenFlags::SQLITE_OPEN_READ_ONLY
            | OpenFlags::SQLITE_OPEN_NO_MUTEX
            | OpenFlags::SQLITE_OPEN_URI,
    )
    .map_err(|_| not_sqlite())?;
    for table in REQUIRED_BACKUP_TABLES {
        let present: bool = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
                [table],
                |row| row.get(0),
            )
            .map_err(|_| not_sqlite())?;
        if !present {
            return Err("BACKUP_SCHEMA_MISSING".to_string());
        }
    }
    Ok(())
}

/// Builds a `file:` URI that opens `path` read-only and immutable.
fn immutable_read_only_uri(path: &Path) -> String {
    let native = native_path_bytes(path);
    // C3-a: `//?/` is the Windows NT namespace prefix; only Windows paths carry
    // it. On Unix a path may legitimately begin `//?/` (a directory named `?`),
    // so stripping there would point at the wrong file.
    #[cfg(windows)]
    let raw = native.strip_prefix(b"//?/").unwrap_or(&native);
    #[cfg(not(windows))]
    let raw = native.as_slice();
    let mut uri = String::from("file:");
    if !raw.starts_with(b"/") {
        uri.push('/');
    }
    for &byte in raw {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'/' | b'-' | b'_' | b'.' | b'~' | b':') {
            uri.push(char::from(byte));
        } else {
            uri.push_str(&format!("%{byte:02X}"));
        }
    }
    uri.push_str("?mode=ro&immutable=1");
    uri
}

/// Path bytes for the SQLite URI. On Unix the raw OS bytes are kept, so a
/// non-UTF-8 directory still percent-encodes to the real file. Windows paths
/// are UTF-16; only unpaired surrogates (not producible by normal Windows
/// tooling) would be lossy, and separators are normalised to `/`.
#[cfg(unix)]
fn native_path_bytes(path: &Path) -> Vec<u8> {
    use std::os::unix::ffi::OsStrExt;
    path.as_os_str().as_bytes().to_vec()
}

#[cfg(not(unix))]
fn native_path_bytes(path: &Path) -> Vec<u8> {
    path.to_string_lossy().replace('\\', "/").into_bytes()
}

/// Distinguishes attempts within one process; the PID distinguishes processes.
static STAGING_SEQUENCE: AtomicU64 = AtomicU64::new(0);

/// A staging path unique to this attempt. Per-call rather than merely
/// per-process, so two restores inside one process cannot collide either.
fn staging_path_for(database_path: &Path) -> PathBuf {
    let sequence = STAGING_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    database_path.with_extension(format!("restore-{}-{sequence}.tmp", std::process::id()))
}

/// I3: quarantine directories were named by millisecond timestamp alone, so two
/// quarantines within one millisecond (a stolen-lock retry, or the removed legacy
/// `recover`) shared a directory and could overwrite each other's evidence.
/// Mirror the staging name's pid + per-call sequence so every quarantine is
/// unique. The ID is opaque metadata (a directory name + report field); nothing
/// parses it as a number, so the format change is safe.
static QUARANTINE_SEQUENCE: AtomicU64 = AtomicU64::new(0);

fn quarantine_id_for() -> Result<String, String> {
    let timestamp = current_timestamp()?;
    let sequence = QUARANTINE_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    Ok(format!("{timestamp}-{}-{sequence}", std::process::id()))
}

/// Owns the staging set until the replacement succeeds. A `Drop` guard rather
/// than per-branch removal because the leak that mattered was on a `?` path
/// nobody had written a cleanup for.
struct StagedRestore {
    path: PathBuf,
    armed: bool,
}

impl StagedRestore {
    fn new(path: PathBuf) -> Self {
        Self { path, armed: true }
    }

    fn disarm(&mut self) {
        self.armed = false;
    }
}

impl Drop for StagedRestore {
    fn drop(&mut self) {
        if self.armed {
            let _ = remove_stale_staging_file(&self.path);
        }
    }
}

fn is_older_than(path: &Path, millis: u64) -> bool {
    let Ok(modified) = fs::metadata(path).and_then(|meta| meta.modified()) else {
        return false;
    };
    // A stamp in the future yields Err, and "cannot tell" must not delete.
    let Ok(age) = SystemTime::now().duration_since(modified) else {
        return false;
    };
    u64::try_from(age.as_millis()).unwrap_or(0) >= millis
}

/// Removes staging sets abandoned by earlier runs, including the legacy fixed
/// name left by versions before M2.
///
/// Unique names mean nothing ever re-names a crashed run's file, so without this
/// every crash would strand a database-sized copy. The age gate shares the
/// lock's abandonment window deliberately: an unconditional sweep would delete
/// a LIVE concurrent restore's staging file, which is a new race introduced by
/// the cleanup — the exact failure shape this programme refuses to ship quietly.
fn sweep_abandoned_staging(database_path: &Path, keep: &Path) {
    let (Some(parent), Some(stem)) = (
        database_path.parent(),
        database_path.file_stem().and_then(|stem| stem.to_str()),
    ) else {
        return;
    };
    let prefix = format!("{stem}.restore-");
    let legacy = format!("{stem}.restore.tmp");
    let Ok(entries) = fs::read_dir(parent) else {
        return;
    };
    for entry in entries.filter_map(Result::ok) {
        let path = entry.path();
        let Some(name) = path.file_name().and_then(|name| name.to_str()) else {
            continue;
        };
        if path == keep {
            continue;
        }
        // The legacy fixed name is not producible by any current code path, so
        // no live attempt can own it: it is always abandoned, whatever its age.
        // Per-attempt names ARE age-gated, because a young one may belong to a
        // restore running right now.
        let abandoned = name == legacy
            || (name.starts_with(&prefix)
                && name.ends_with(".tmp")
                && is_older_than(&path, LOCK_STEAL_AFTER_MILLIS));
        if !abandoned {
            continue;
        }
        let _ = remove_stale_staging_file(&path);
    }
}

fn remove_stale_staging_file(path: &Path) -> Result<(), String> {
    // M3: removing only the staging DATABASE leaves its -wal/-shm behind, and
    // SQLite will REPLAY that stale sidecar onto the next staged copy — a
    // corrupt restore produced by a cleanup that looked complete. Remove the
    // whole set, or fail closed.
    for candidate in [
        path.to_path_buf(),
        sidecar_path(path, "-wal"),
        sidecar_path(path, "-shm"),
        sidecar_path(path, "-journal"),
    ] {
        if !candidate.exists() {
            continue;
        }
        if !candidate.is_file() {
            return Err("STALE_STAGING_PATH_INVALID".to_string());
        }
        fs::remove_file(&candidate).map_err(|_| "STALE_STAGING_FILE_UNREMOVABLE".to_string())?;
    }
    Ok(())
}

fn sidecar_path(path: &Path, suffix: &str) -> PathBuf {
    PathBuf::from(format!("{}{suffix}", path.display()))
}

/// L6: the live database set is the main file plus its WAL/SHM/rollback-journal
/// sidecars. `-journal` was previously omitted from quarantine, so a rollback
/// journal could survive a quarantine and be replayed onto a later database.
/// `include_main=false` collects only orphaned sidecars — the shape TASK-0055's
/// start-fresh needs when the main DB is absent (ADR-0023 D1-F1): an orphaned
/// `-wal` must never be replayed onto a fresh database. PR-D wires the full-set
/// case; the orphan case is unit-tested here and consumed by TASK-0055.
fn live_database_set(database_path: &Path, include_main: bool) -> Vec<PathBuf> {
    let mut files = Vec::new();
    if include_main && database_path.exists() {
        files.push(database_path.to_path_buf());
    }
    for suffix in ["-wal", "-shm", "-journal"] {
        let sidecar = sidecar_path(database_path, suffix);
        if sidecar.exists() {
            files.push(sidecar);
        }
    }
    files
}

/// L2: flush a freshly written file's contents to disk before it is renamed into
/// place. Without this, a crash can leave the rename durable while the file's
/// bytes are not — an empty or torn database at the destination. Applied to the
/// backup temp and the staged restore, the two newly-written files that become
/// durable by rename.
fn sync_file_contents(path: &Path) -> Result<(), String> {
    // Windows FlushFileBuffers requires a WRITE-access handle; a read-only
    // `File::open` fails with ACCESS_DENIED. Open write-only (the file is ours
    // and writable); fsync on a write fd is valid on Unix too.
    let file = fs::OpenOptions::new()
        .write(true)
        .open(path)
        .map_err(|_| "RECOVERY_SYNC_FAILED".to_string())?;
    file.sync_all()
        .map_err(|_| "RECOVERY_SYNC_FAILED".to_string())
}

fn checkpoint_staged_database(path: &Path) -> Result<(), String> {
    let connection = Connection::open(path).map_err(|_| "BACKUP_CHECKPOINT_FAILED".to_string())?;
    connection
        .execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
        .map_err(|_| "BACKUP_CHECKPOINT_FAILED".to_string())?;
    Ok(())
}

fn restore_quarantined_live_set(quarantine_dir: &Path, database_path: &Path) -> Result<(), String> {
    let database_name = database_path
        .file_name()
        .ok_or_else(|| "DATABASE_PATH_INVALID".to_string())?;
    let quarantined_database = quarantine_dir.join(database_name);
    if quarantined_database.exists() {
        fs::rename(quarantined_database, database_path)
            .map_err(|_| "DATABASE_ROLLBACK_FAILED".to_string())?;
    }
    for suffix in ["-wal", "-shm", "-journal"] {
        let sidecar = PathBuf::from(format!("{}{}", database_path.display(), suffix));
        let quarantined_sidecar = quarantine_dir.join(
            sidecar
                .file_name()
                .ok_or_else(|| "DATABASE_PATH_INVALID".to_string())?,
        );
        if quarantined_sidecar.exists() {
            fs::rename(quarantined_sidecar, sidecar)
                .map_err(|_| "DATABASE_ROLLBACK_FAILED".to_string())?;
        }
    }
    Ok(())
}

fn current_timestamp() -> Result<String, String> {
    let elapsed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "RECOVERY_CLOCK_UNAVAILABLE".to_string())?;
    Ok(elapsed.as_millis().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::meshy::models::AssetRecord;

    fn test_asset(id: &str) -> AssetRecord {
        AssetRecord {
            rights: Default::default(),
            id: id.to_string(),
            meshy_type: "text-to-3d-preview".to_string(),
            parent_task_id: None,
            prompt: Some("recovery test".to_string()),
            image_url: None,
            ai_model: None,
            status: "SUCCEEDED".to_string(),
            progress: 100,
            consumed_credits: 1,
            thumbnail_path: None,
            file_paths_json: "{}".to_string(),
            texture_paths_json: "[]".to_string(),
            notes: String::new(),
            tags_json: "[]".to_string(),
            created_at: 1,
            started_at: 1,
            finished_at: 1,
            downloaded_at: 0,
            error_message: None,
            has_textures: false,
            has_rig: false,
            has_animation: false,
            favorite: false,
            last_viewed_at: 0,
        }
    }

    #[test]
    fn restores_a_valid_backup_and_quarantines_the_live_set_with_report() {
        // I3: the legacy `recover`/`restore_latest_valid` pair (no staging
        // coordination, no rollback) is removed; restore_backup is the only
        // restore path. Newest-valid SELECTION now belongs to the listing
        // (I2 / PR-E); here we pin the restore + quarantine-report contract.
        let temp_dir = tempfile::tempdir().unwrap();
        let database_path = temp_dir.path().join("meshyforge.db");
        let manager = RecoveryManager::new(&database_path, temp_dir.path().join("recovery"));
        let database = Database::open(&database_path).unwrap();
        database.insert_asset(&test_asset("recoverable")).unwrap();
        let backup = manager.create_backup(&database).unwrap();
        let backup_id = backup.file_name().unwrap().to_str().unwrap().to_string();
        // A newer-named but non-SQLite file must not be chosen or accepted.
        fs::write(
            manager
                .recovery_dir
                .join("backups")
                .join("backup-9999999999999.db"),
            b"not a sqlite database",
        )
        .unwrap();
        drop(database);

        manager.restore_backup(&backup_id).unwrap();
        let recovered_database = Database::open(&database_path).unwrap();
        assert_eq!(
            recovered_database.get_all_assets().unwrap()[0].id,
            "recoverable"
        );
        assert_eq!(
            fs::read_dir(manager.recovery_dir.join("quarantine"))
                .unwrap()
                .count(),
            1
        );
        let quarantine_dir = fs::read_dir(manager.recovery_dir.join("quarantine"))
            .unwrap()
            .next()
            .unwrap()
            .unwrap()
            .path();
        let report: QuarantineReport =
            serde_json::from_slice(&fs::read(quarantine_dir.join("report.json")).unwrap()).unwrap();
        assert_eq!(report.files, vec!["meshyforge.db"]);
    }

    #[test]
    fn refuses_a_corrupt_backup_and_preserves_the_live_set() {
        // I3: legacy `recover` quarantined FIRST then returned None when no
        // backup validated, displacing the live set for nothing. restore_backup
        // validates the candidate BEFORE any quarantine, so a corrupt backup is
        // refused with the live set untouched — no empty replacement, no needless
        // displacement. The no-valid-backup terminal state is owned by the
        // process layer (lib.rs), not by a storage call that moves files.
        let temp_dir = tempfile::tempdir().unwrap();
        let database_path = temp_dir.path().join("meshyforge.db");
        let manager = RecoveryManager::new(&database_path, temp_dir.path().join("recovery"));
        fs::create_dir_all(manager.recovery_dir.join("backups")).unwrap();
        fs::write(
            manager.recovery_dir.join("backups").join("backup-1.db"),
            b"corrupt",
        )
        .unwrap();
        fs::write(&database_path, b"corrupt live database").unwrap();

        assert_eq!(
            manager.restore_backup("backup-1.db"),
            Err("BACKUP_NOT_SQLITE".to_string())
        );
        assert!(
            database_path.exists(),
            "the live set must not be displaced for a refused backup"
        );
        assert!(!manager.recovery_dir.join("quarantine").exists());
    }

    fn seed_live_database(path: &Path) -> Vec<u8> {
        {
            let database = Database::open(path).unwrap();
            database.insert_asset(&test_asset("live-asset")).unwrap();
        }
        fs::read(path).unwrap()
    }

    fn restore_manager(temp_dir: &tempfile::TempDir) -> (RecoveryManager, PathBuf) {
        let database_path = temp_dir.path().join("meshyforge.db");
        let manager = RecoveryManager::new(&database_path, temp_dir.path().join("recovery"));
        fs::create_dir_all(manager.recovery_dir.join("backups")).unwrap();
        (manager, database_path)
    }

    #[test]
    fn restore_rejects_zero_byte_backup_and_leaves_live_database_untouched() {
        let temp_dir = tempfile::tempdir().unwrap();
        let (manager, database_path) = restore_manager(&temp_dir);
        let live_bytes = seed_live_database(&database_path);
        fs::write(
            manager.recovery_dir.join("backups").join("backup-1.db"),
            b"",
        )
        .unwrap();

        assert_eq!(
            manager.restore_backup("backup-1.db"),
            Err("BACKUP_NOT_SQLITE".to_string())
        );
        assert_eq!(fs::read(&database_path).unwrap(), live_bytes);
        assert!(!manager.recovery_dir.join("quarantine").exists());
        assert!(!database_path.with_extension("restore.tmp").exists());
    }

    #[test]
    fn restore_rejects_foreign_non_sqlite_file() {
        let temp_dir = tempfile::tempdir().unwrap();
        let (manager, database_path) = restore_manager(&temp_dir);
        let live_bytes = seed_live_database(&database_path);
        fs::write(
            manager.recovery_dir.join("backups").join("backup-2.db"),
            vec![b'x'; 4096],
        )
        .unwrap();

        assert_eq!(
            manager.restore_backup("backup-2.db"),
            Err("BACKUP_NOT_SQLITE".to_string())
        );
        assert_eq!(fs::read(&database_path).unwrap(), live_bytes);
        assert!(!manager.recovery_dir.join("quarantine").exists());
    }

    #[test]
    fn restore_rejects_sqlite_file_without_app_schema() {
        let temp_dir = tempfile::tempdir().unwrap();
        let (manager, database_path) = restore_manager(&temp_dir);
        let live_bytes = seed_live_database(&database_path);
        {
            let foreign =
                Connection::open(manager.recovery_dir.join("backups").join("backup-3.db")).unwrap();
            foreign
                .execute_batch(
                    "CREATE TABLE unrelated (id INTEGER PRIMARY KEY, payload TEXT);
                     INSERT INTO unrelated (payload) VALUES ('x');",
                )
                .unwrap();
        }

        assert_eq!(
            manager.restore_backup("backup-3.db"),
            Err("BACKUP_SCHEMA_MISSING".to_string())
        );
        assert_eq!(fs::read(&database_path).unwrap(), live_bytes);
        assert!(!manager.recovery_dir.join("quarantine").exists());
    }

    #[test]
    fn restore_rejects_spoofed_schema_that_skips_migrations() {
        // Minimal tables named like the app's, plus a schema_version high
        // enough (or exactly current) that run_migrations skips every
        // migration. Neither may replace the live database.
        //
        // NOTE (migration 003): this case must probe a version at-or-above
        // `latest_schema_version()`. It previously used `2`, which was "exactly
        // current" when migration 002 was the head; once 003 was added, 2
        // became a *genuinely* outdated schema, so run_migrations tried to
        // apply 003 to a table set that cannot support it and the restore
        // failed closed as BACKUP_MIGRATION_FAILED instead (covered separately
        // below). Keep this list in step with `latest_schema_version()` — a
        // hardcoded stale number here silently stops testing the skip path.
        let latest = crate::storage::database::latest_schema_version();
        for version in [99, latest] {
            let temp_dir = tempfile::tempdir().unwrap();
            let (manager, database_path) = restore_manager(&temp_dir);
            let live_bytes = seed_live_database(&database_path);
            let backup_id = "backup-4.db";
            {
                let spoof =
                    Connection::open(manager.recovery_dir.join("backups").join(backup_id)).unwrap();
                spoof
                    .execute_batch(&format!(
                        "CREATE TABLE schema_version (version INTEGER, applied_at INTEGER);
                         INSERT INTO schema_version VALUES ({version}, 0);
                         CREATE TABLE assets (id TEXT PRIMARY KEY);"
                    ))
                    .unwrap();
            }

            assert_eq!(
                manager.restore_backup(backup_id),
                Err("BACKUP_SCHEMA_MISMATCH".to_string()),
                "version {version}"
            );
            assert_eq!(fs::read(&database_path).unwrap(), live_bytes);
            assert!(!manager.recovery_dir.join("quarantine").exists());
        }
    }

    #[test]
    fn restore_fails_closed_when_a_spoofed_backup_cannot_be_migrated() {
        // A crafted backup whose schema_version claims a real, superseded
        // version but whose tables cannot actually accept the pending
        // migrations. Migration 003 indexes `assets(created_at, id)`, which
        // this `assets` table has no columns for, so the staged migration
        // fails. The restore must refuse — and must do so by the same
        // fail-closed path as any other rejection: the live database is
        // byte-identical afterwards and nothing was quarantined.
        //
        // This is the case that a stale `version: 2` in the test above used to
        // exercise implicitly once migration 003 landed.
        let temp_dir = tempfile::tempdir().unwrap();
        let (manager, database_path) = restore_manager(&temp_dir);
        let live_bytes = seed_live_database(&database_path);
        let backup_id = "backup-6.db";
        {
            let spoof =
                Connection::open(manager.recovery_dir.join("backups").join(backup_id)).unwrap();
            spoof
                .execute_batch(
                    "CREATE TABLE schema_version (version INTEGER, applied_at INTEGER);
                     INSERT INTO schema_version VALUES (2, 0);
                     CREATE TABLE assets (id TEXT PRIMARY KEY);",
                )
                .unwrap();
        }

        assert_eq!(
            manager.restore_backup(backup_id),
            Err("BACKUP_MIGRATION_FAILED".to_string())
        );
        assert_eq!(
            fs::read(&database_path).unwrap(),
            live_bytes,
            "a failed staged migration must not touch the live database"
        );
        assert!(!manager.recovery_dir.join("quarantine").exists());
    }

    // APFS (macOS) and NTFS reject invalid-UTF-8 names; ext4 accepts them.
    #[cfg(target_os = "linux")]
    #[test]
    fn validation_accepts_backup_under_non_utf8_directory() {
        use std::os::unix::ffi::OsStrExt;
        let temp_dir = tempfile::tempdir().unwrap();
        let directory = temp_dir
            .path()
            .join(std::ffi::OsStr::from_bytes(b"data-\xff"));
        fs::create_dir(&directory).unwrap();
        let backup = directory.join("backup-1.db");
        drop(Database::open(&backup).unwrap());

        assert!(immutable_read_only_uri(&backup).contains("data-%FF/"));
        assert_eq!(validate_backup_candidate(&backup), Ok(()));
    }

    #[test]
    fn real_backup_matches_current_schema_after_migration() {
        let database = Database::open_in_memory().unwrap();
        assert!(database.matches_current_schema().unwrap());
    }

    #[test]
    fn restore_rejects_non_conforming_backup_id() {
        let temp_dir = tempfile::tempdir().unwrap();
        let (manager, database_path) = restore_manager(&temp_dir);
        let live_bytes = seed_live_database(&database_path);
        fs::copy(
            &database_path,
            manager.recovery_dir.join("backups").join("x.db"),
        )
        .unwrap();

        assert_eq!(
            manager.restore_backup("x.db"),
            Err("INVALID_BACKUP_ID".to_string())
        );
        assert_eq!(fs::read(&database_path).unwrap(), live_bytes);
    }

    #[test]
    fn validation_does_not_modify_a_real_backup_or_add_files() {
        let temp_dir = tempfile::tempdir().unwrap();
        let (manager, database_path) = restore_manager(&temp_dir);
        let database = Database::open(&database_path).unwrap();
        let backup = manager.create_backup(&database).unwrap();
        let list = || {
            let mut names: Vec<_> = fs::read_dir(backup.parent().unwrap())
                .unwrap()
                .map(|entry| entry.unwrap().file_name().into_string().unwrap())
                .collect();
            names.sort();
            names
        };
        let names_before = list();
        let bytes_before = fs::read(&backup).unwrap();
        validate_backup_candidate(&backup).unwrap();
        assert_eq!(list(), names_before);
        assert_eq!(fs::read(&backup).unwrap(), bytes_before);
    }

    #[test]
    fn restores_selected_backup_after_removing_stale_stage() {
        let temp_dir = tempfile::tempdir().unwrap();
        let database_path = temp_dir.path().join("meshyforge.db");
        let manager = RecoveryManager::new(&database_path, temp_dir.path().join("recovery"));
        let database = Database::open(&database_path).unwrap();
        database
            .insert_asset(&test_asset("selected-backup"))
            .unwrap();
        let backup_path = manager.create_backup(&database).unwrap();
        let backup_id = backup_path.file_name().unwrap().to_str().unwrap();
        fs::write(database_path.with_extension("restore.tmp"), b"stale").unwrap();
        drop(database);

        let restored = manager.restore_backup(backup_id).unwrap();
        assert_eq!(restored.file_name().unwrap(), backup_id);
        let restored_database = Database::open(&database_path).unwrap();
        assert_eq!(
            restored_database.get_all_assets().unwrap()[0].id,
            "selected-backup"
        );
        assert!(!database_path.with_extension("restore.tmp").exists());
    }

    #[test]
    fn stale_staging_sidecars_are_removed_with_the_staging_database() {
        // Audit M3: SQLite REPLAYS a `-wal` onto the next database opened at the
        // same path, so a cleanup that removes only the staging DATABASE leaves a
        // corrupt restore waiting to happen.
        let temp = tempfile::tempdir().unwrap();
        let staging = temp.path().join("meshyforge.restore.tmp");
        fs::write(&staging, b"stale").unwrap();
        fs::write(sidecar_path(&staging, "-wal"), b"stale wal").unwrap();
        fs::write(sidecar_path(&staging, "-shm"), b"stale shm").unwrap();

        remove_stale_staging_file(&staging).unwrap();

        assert!(!staging.exists());
        assert!(
            !sidecar_path(&staging, "-wal").exists(),
            "a stale -wal would be replayed onto the next staged copy"
        );
        assert!(!sidecar_path(&staging, "-shm").exists());
    }

    #[test]
    fn quarantine_failure_returns_a_fixed_code_not_os_text() {
        // Audit M5 + SAN-01. Two coupled defects: raw OS text crossed the error
        // boundary, and because the caller cannot recognise that string it
        // treated a failed quarantine as "no evidence" and started fresh — an
        // empty database created over the wreckage.
        let temp = tempfile::tempdir().unwrap();
        let database_path = temp.path().join("meshyforge.db");
        fs::write(&database_path, b"db").unwrap();
        let recovery_dir = temp.path().join("recovery");
        fs::create_dir_all(&recovery_dir).unwrap();
        // Occupy the quarantine path with a FILE so directory creation fails.
        fs::write(recovery_dir.join("quarantine"), b"not a directory").unwrap();

        let manager = RecoveryManager::new(&database_path, &recovery_dir);
        let error = manager.quarantine_live_database().unwrap_err();

        assert_eq!(
            error, "QUARANTINE_FAILED",
            "the failure must be a fixed code the caller can recognise"
        );
        assert!(
            !error.contains('\\') && !error.contains('/'),
            "raw OS path text must not cross this boundary: {error}"
        );
        // Nothing moved, so the live database is untouched.
        assert!(database_path.exists());
    }

    // ─── Audit M2: per-attempt staging ───────────────────────────────────────

    /// Backdates a file so the abandonment window can be tested without waiting.
    fn age_file(path: &Path, millis: u64) {
        let when = SystemTime::now() - std::time::Duration::from_millis(millis);
        let file = fs::OpenOptions::new().write(true).open(path).unwrap();
        file.set_times(fs::FileTimes::new().set_modified(when))
            .unwrap();
    }

    fn staging_leftovers(dir: &Path) -> Vec<String> {
        fs::read_dir(dir)
            .unwrap()
            .filter_map(Result::ok)
            .map(|entry| entry.file_name().to_string_lossy().into_owned())
            .filter(|name| name.contains(".restore-") || name.contains(".restore.tmp"))
            .collect()
    }

    #[test]
    fn staging_names_are_unique_per_call() {
        let database_path = Path::new("meshyforge.db");
        let first = staging_path_for(database_path);
        let second = staging_path_for(database_path);
        assert_ne!(
            first, second,
            "two attempts must never stage through the same file"
        );
        assert!(first
            .to_string_lossy()
            .contains(&format!("restore-{}-", std::process::id())));
    }

    #[test]
    fn backup_failure_returns_a_fixed_code_not_os_text() {
        // L1 / SAN-01: a failed backup must not leak raw OS error text across
        // the recovery boundary (the M5 defect class, here in the backup path).
        let temp = tempfile::tempdir().unwrap();
        let manager = RecoveryManager::new(
            temp.path().join("meshyforge.db"),
            temp.path().join("recovery"),
        );
        let error = manager
            .create_backup_from_file(&temp.path().join("does-not-exist.db"))
            .unwrap_err();
        assert_eq!(error, "BACKUP_CREATE_FAILED");
        assert!(
            !error.contains('/') && !error.contains('\\'),
            "raw OS path text crossed the boundary: {error}"
        );
    }

    // C3-a: `//?/` is only the Windows NT prefix; on Unix it can be a real
    // directory named `?` and must survive percent-encoding, not be stripped.
    #[cfg(unix)]
    #[test]
    fn unix_path_with_nt_like_prefix_is_not_stripped() {
        let uri = immutable_read_only_uri(Path::new("//?/real.db"));
        assert!(uri.contains("%3F"), "the `?` must survive on unix: {uri}");
        assert!(
            !uri.starts_with("file:/real.db"),
            "prefix stripped on unix: {uri}"
        );
    }

    #[test]
    fn quarantine_preserves_the_rollback_journal() {
        // L6: -journal was omitted from the quarantine set, so a rollback
        // journal could survive and be replayed onto a later database.
        let temp = tempfile::tempdir().unwrap();
        let database_path = temp.path().join("meshyforge.db");
        fs::write(&database_path, b"db").unwrap();
        fs::write(sidecar_path(&database_path, "-journal"), b"journal").unwrap();
        let manager = RecoveryManager::new(&database_path, temp.path().join("recovery"));

        let (quarantine_dir, report) = manager
            .quarantine_live_database_with_report()
            .unwrap()
            .expect("live set present");
        assert!(quarantine_dir.join("meshyforge.db-journal").exists());
        assert!(!sidecar_path(&database_path, "-journal").exists());
        assert!(report.files.contains(&"meshyforge.db-journal".to_string()));
    }

    #[test]
    fn live_database_set_orphan_mode_collects_sidecars_without_main() {
        // L6 / ADR-0023 D1-F1 foundation: with the main DB absent, the orphan
        // mode collects only sidecars (incl -journal) so TASK-0055 can sweep them
        // before creating a fresh database. No main file is invented.
        let temp = tempfile::tempdir().unwrap();
        let database_path = temp.path().join("meshyforge.db");
        fs::write(sidecar_path(&database_path, "-wal"), b"wal").unwrap();
        fs::write(sidecar_path(&database_path, "-shm"), b"shm").unwrap();
        fs::write(sidecar_path(&database_path, "-journal"), b"journal").unwrap();

        let orphans = live_database_set(&database_path, false);
        assert_eq!(orphans.len(), 3);
        assert!(!orphans.contains(&database_path));

        fs::write(&database_path, b"db").unwrap();
        let full = live_database_set(&database_path, true);
        assert_eq!(full.len(), 4);
        assert!(full.contains(&database_path));
    }

    #[test]
    fn sync_file_contents_flushes_a_real_file_and_refuses_a_missing_one() {
        // L2: the fsync helper succeeds on a real file and returns a fixed code
        // (not OS text) when the path is absent. Durability itself is not
        // observable without crash injection; the wiring (fsync immediately
        // before each data rename) is verified by review.
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("file.db");
        fs::write(&path, b"bytes").unwrap();
        assert!(sync_file_contents(&path).is_ok());
        assert_eq!(
            sync_file_contents(&temp.path().join("absent.db")),
            Err("RECOVERY_SYNC_FAILED".to_string())
        );
    }

    #[test]
    fn quarantine_ids_are_unique_per_call() {
        // I3: millisecond-only IDs collided within one millisecond. pid + a
        // per-call sequence make every quarantine directory unique.
        let first = quarantine_id_for().unwrap();
        let second = quarantine_id_for().unwrap();
        assert_ne!(
            first, second,
            "two quarantines must never share a directory"
        );
        assert!(first.contains(&format!("-{}-", std::process::id())));
    }

    #[test]
    fn abandoned_staging_sets_are_swept_but_a_live_one_is_not() {
        let temp = tempfile::tempdir().unwrap();
        let database_path = temp.path().join("meshyforge.db");

        let abandoned = temp.path().join("meshyforge.restore-999999-0.tmp");
        fs::write(&abandoned, b"old").unwrap();
        fs::write(sidecar_path(&abandoned, "-wal"), b"old wal").unwrap();
        fs::write(sidecar_path(&abandoned, "-shm"), b"old shm").unwrap();
        age_file(&abandoned, LOCK_STEAL_AFTER_MILLIS + 1_000);

        // Young, and NOT the path this attempt is using: only the age gate can
        // save it, which is what stops the sweep becoming a new race.
        let other_live = temp.path().join("meshyforge.restore-888888-0.tmp");
        fs::write(&other_live, b"in flight").unwrap();
        let keep = temp.path().join("meshyforge.restore-777777-0.tmp");
        fs::write(&keep, b"ours").unwrap();

        sweep_abandoned_staging(&database_path, &keep);

        assert!(!abandoned.exists());
        assert!(!sidecar_path(&abandoned, "-wal").exists());
        assert!(!sidecar_path(&abandoned, "-shm").exists());
        assert!(
            other_live.exists(),
            "a concurrent restore's staging file must survive the sweep"
        );
        assert!(keep.exists());
    }

    #[test]
    fn a_rejected_restore_leaves_no_staging_set_behind() {
        // The staging name is unique now, so a leak is no longer hidden by the
        // next run reusing the same fixed path.
        let temp_dir = tempfile::tempdir().unwrap();
        let (manager, database_path) = restore_manager(&temp_dir);
        let live_bytes = seed_live_database(&database_path);
        let backup_id = "backup-7.db";
        {
            let spoof =
                Connection::open(manager.recovery_dir.join("backups").join(backup_id)).unwrap();
            spoof
                .execute_batch(&format!(
                    "CREATE TABLE schema_version (version INTEGER, applied_at INTEGER);
                     INSERT INTO schema_version VALUES ({}, 0);
                     CREATE TABLE assets (id TEXT PRIMARY KEY);",
                    crate::storage::database::latest_schema_version()
                ))
                .unwrap();
        }

        assert_eq!(
            manager.restore_backup(backup_id),
            Err("BACKUP_SCHEMA_MISMATCH".to_string())
        );
        assert_eq!(fs::read(&database_path).unwrap(), live_bytes);
        assert!(
            staging_leftovers(temp_dir.path()).is_empty(),
            "leftovers: {:?}",
            staging_leftovers(temp_dir.path())
        );
    }

    #[test]
    fn restore_rejects_a_backup_with_matching_names_but_a_hostile_trigger() {
        // C2-a at the boundary that matters. This backup carries the REAL
        // schema — every table, column name, type and the current version all
        // match — plus one extra trigger. The old name-only comparison accepted
        // it, which is the overclaim the finding was about.
        let temp_dir = tempfile::tempdir().unwrap();
        let (manager, database_path) = restore_manager(&temp_dir);
        let live_bytes = seed_live_database(&database_path);
        let backup_id = "backup-8.db";
        let backup_file = manager.recovery_dir.join("backups").join(backup_id);
        {
            drop(Database::open(&backup_file).unwrap());
            let conn = Connection::open(&backup_file).unwrap();
            conn.execute_batch(
                "CREATE TRIGGER exfiltrate AFTER INSERT ON assets BEGIN SELECT 1; END;",
            )
            .unwrap();
            // Checkpoint so the trigger is in the main file: restore copies only
            // the .db, and an uncheckpointed -wal would make this test pass for
            // the wrong reason.
            conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
                .unwrap();
        }

        assert_eq!(
            manager.restore_backup(backup_id),
            Err("BACKUP_SCHEMA_MISMATCH".to_string())
        );
        assert_eq!(
            fs::read(&database_path).unwrap(),
            live_bytes,
            "a rejected backup must leave the live database byte-identical"
        );
        assert!(!manager.recovery_dir.join("quarantine").exists());
    }

    #[test]
    fn restore_aborts_before_quarantine_when_lock_ownership_was_lost() {
        // N11: a stolen-lock loser must never reach the destructive step —
        // it could quarantine the winner's already-restored database.
        let temp_dir = tempfile::tempdir().unwrap();
        let database_path = temp_dir.path().join("meshyforge.db");
        let live_bytes = seed_live_database(&database_path);
        let manager = RecoveryManager::new(&database_path, temp_dir.path().join("recovery"))
            .with_lock_check(|| false);
        let backup_id = {
            let database = Database::open(&database_path).unwrap();
            let backup = manager.create_backup(&database).unwrap();
            backup.file_name().unwrap().to_str().unwrap().to_string()
        };

        assert_eq!(
            manager.restore_backup(&backup_id),
            Err("RECOVERY_LOCK_LOST".to_string())
        );
        assert_eq!(fs::read(&database_path).unwrap(), live_bytes);
        assert!(!manager.recovery_dir.join("quarantine").exists());
        assert!(staging_leftovers(temp_dir.path()).is_empty());
    }

    #[test]
    fn restore_proceeds_when_lock_ownership_is_confirmed() {
        let temp_dir = tempfile::tempdir().unwrap();
        let database_path = temp_dir.path().join("meshyforge.db");
        let manager = RecoveryManager::new(&database_path, temp_dir.path().join("recovery"))
            .with_lock_check(|| true);
        let backup_id = {
            let database = Database::open(&database_path).unwrap();
            database.insert_asset(&test_asset("owned")).unwrap();
            let backup = manager.create_backup(&database).unwrap();
            backup.file_name().unwrap().to_str().unwrap().to_string()
        };

        assert!(manager.restore_backup(&backup_id).is_ok());
        let restored = Database::open(&database_path).unwrap();
        assert_eq!(restored.get_all_assets().unwrap()[0].id, "owned");
    }
}
