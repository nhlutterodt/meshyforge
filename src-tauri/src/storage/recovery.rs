use crate::storage::Database;
use crate::storage::recovery_protocol::backup_path;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const BACKUP_PREFIX: &str = "backup-";
const BACKUP_SUFFIX: &str = ".db";
const DEFAULT_RETENTION: usize = 3;

pub struct RecoveryManager {
    database_path: PathBuf,
    recovery_dir: PathBuf,
    retention: usize,
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
        }
    }

    pub fn with_retention(mut self, retention: usize) -> Self {
        self.retention = retention.max(1);
        self
    }

    pub fn create_backup(&self, database: &Database) -> Result<PathBuf, String> {
        let backup_dir = self.recovery_dir.join("backups");
        fs::create_dir_all(&backup_dir).map_err(|error| error.to_string())?;
        let timestamp = current_timestamp()?;
        let final_path = backup_dir.join(format!("{BACKUP_PREFIX}{timestamp}{BACKUP_SUFFIX}"));
        let temporary_path = backup_dir.join(format!("{BACKUP_PREFIX}{timestamp}.tmp"));

        database
            .backup_to(&temporary_path)
            .map_err(|error| error.to_string())?;
        if !integrity_check(&temporary_path)? {
            let _ = fs::remove_file(&temporary_path);
            return Err("Backup failed integrity validation".to_string());
        }
        fs::rename(&temporary_path, &final_path).map_err(|error| error.to_string())?;
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
        let quarantine_id = current_timestamp()?;
        let quarantine_dir = self.recovery_dir.join("quarantine").join(&quarantine_id);
        fs::create_dir_all(&quarantine_dir).map_err(|error| error.to_string())?;
        let mut files = vec![self.database_path.clone()];
        for suffix in ["-wal", "-shm"] {
            let sidecar = PathBuf::from(format!("{}{}", self.database_path.display(), suffix));
            if sidecar.exists() {
                files.push(sidecar);
            }
        }

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
                for (original, moved_path) in moved.iter().rev() {
                    let _ = fs::rename(moved_path, original);
                }
                let _ = fs::remove_dir(&quarantine_dir);
                return Err(error.to_string());
            }
            moved.push((source.clone(), destination));
        }
        Ok(Some((quarantine_dir, report)))
    }

    pub fn restore_latest_valid(&self) -> Result<Option<PathBuf>, String> {
        let backups = self.valid_backups()?;
        let Some(source) = backups.into_iter().next() else {
            return Ok(None);
        };
        let temporary_path = self
            .database_path
            .with_extension("restore.tmp");
        fs::copy(&source, &temporary_path).map_err(|error| error.to_string())?;
        if !integrity_check(&temporary_path)? {
            let _ = fs::remove_file(&temporary_path);
            return Err("Restore candidate failed integrity validation".to_string());
        }
        fs::rename(&temporary_path, &self.database_path).map_err(|error| error.to_string())?;
        Ok(Some(source))
    }

    pub fn restore_backup(&self, backup_id: &str) -> Result<PathBuf, String> {
        let source = backup_path(&self.recovery_dir.join("backups"), backup_id)?;
        let staging_path = self.database_path.with_extension("restore.tmp");
        remove_stale_staging_file(&staging_path)?;

        fs::copy(&source, &staging_path).map_err(|_| "BACKUP_STAGE_FAILED".to_string())?;
        let staged_database = match Database::open(&staging_path) {
            Ok(database) => database,
            Err(_) => {
                let _ = fs::remove_file(&staging_path);
                return Err("BACKUP_MIGRATION_FAILED".to_string());
            }
        };
        if !staged_database
            .integrity_check()
            .map_err(|_| "BACKUP_INTEGRITY_CHECK_FAILED".to_string())?
        {
            drop(staged_database);
            let _ = fs::remove_file(&staging_path);
            return Err("BACKUP_INTEGRITY_CHECK_FAILED".to_string());
        }
        drop(staged_database);
        checkpoint_staged_database(&staging_path)?;

        let (quarantine_dir, _) = self
            .quarantine_live_database_with_report()?
            .ok_or_else(|| "LIVE_DATABASE_MISSING".to_string())?;
        if fs::rename(&staging_path, &self.database_path).is_err() {
            restore_quarantined_live_set(&quarantine_dir, &self.database_path)?;
            return Err("DATABASE_REPLACEMENT_FAILED".to_string());
        }
        Ok(source)
    }

    pub fn recover(&self) -> Result<Option<PathBuf>, String> {
        self.quarantine_live_database()?;
        self.restore_latest_valid()
    }

    fn valid_backups(&self) -> Result<Vec<PathBuf>, String> {
        let backup_dir = self.recovery_dir.join("backups");
        if !backup_dir.exists() {
            return Ok(Vec::new());
        }
        let mut backups = fs::read_dir(backup_dir)
            .map_err(|error| error.to_string())?
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
        backups.retain(|path| integrity_check(path).unwrap_or(false));
        Ok(backups)
    }

    fn rotate_backups(&self) -> Result<(), String> {
        let backup_dir = self.recovery_dir.join("backups");
        let mut backups = fs::read_dir(backup_dir)
            .map_err(|error| error.to_string())?
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
            fs::remove_file(path).map_err(|error| error.to_string())?;
        }
        Ok(())
    }
}

fn integrity_check(path: &Path) -> Result<bool, String> {
    let connection = Connection::open(path).map_err(|error| error.to_string())?;
    let result: String = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;
    Ok(result == "ok")
}

fn remove_stale_staging_file(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    if !path.is_file() {
        return Err("STALE_STAGING_PATH_INVALID".to_string());
    }
    fs::remove_file(path).map_err(|_| "STALE_STAGING_FILE_UNREMOVABLE".to_string())
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
    for suffix in ["-wal", "-shm"] {
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
        .map_err(|error| error.to_string())?;
    Ok(elapsed.as_millis().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::meshy::models::AssetRecord;

    fn test_asset(id: &str) -> AssetRecord {
        AssetRecord {
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
    fn rotates_backups_and_restores_the_newest_valid_copy() {
        let temp_dir = tempfile::tempdir().unwrap();
        let database_path = temp_dir.path().join("meshyforge.db");
        let manager = RecoveryManager::new(&database_path, temp_dir.path().join("recovery"));
        let database = Database::open(&database_path).unwrap();
        database.insert_asset(&test_asset("recoverable")).unwrap();
        manager.create_backup(&database).unwrap();

        fs::write(
            manager.recovery_dir.join("backups").join("backup-9999999999999.db"),
            b"not a sqlite database",
        )
        .unwrap();
        drop(database);

        let restored = manager.recover().unwrap();
        assert!(restored.is_some());
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
            serde_json::from_slice(&fs::read(quarantine_dir.join("report.json")).unwrap())
                .unwrap();
        assert_eq!(report.files, vec!["meshyforge.db"]);
    }

    #[test]
    fn refuses_empty_replacement_when_no_backup_is_valid() {
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

        assert_eq!(manager.recover().unwrap(), None);
        assert!(!database_path.exists());
        assert_eq!(
            fs::read_dir(manager.recovery_dir.join("quarantine"))
                .unwrap()
                .count(),
            1
        );
    }

    #[test]
    fn restores_selected_backup_after_removing_stale_stage() {
        let temp_dir = tempfile::tempdir().unwrap();
        let database_path = temp_dir.path().join("meshyforge.db");
        let manager = RecoveryManager::new(&database_path, temp_dir.path().join("recovery"));
        let database = Database::open(&database_path).unwrap();
        database.insert_asset(&test_asset("selected-backup")).unwrap();
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
}
