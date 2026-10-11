// MeshyForge — Application State
//
// AppState is shared across all Tauri commands via State<'_, AppState>.
// It holds the TaskProvider (constructed at startup from the keychain key),
// the Database, and the app data directory path.
//
// Source: ADR-0004 — AppState holds Mutex<Option<Arc<dyn TaskProvider>>>
// (Option C: mutex guards the Option, Arc allows concurrent access).

use crate::meshy::MeshyClient;
use crate::provider::TaskProvider;
use crate::storage::{Database, RecoveryManager};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

pub struct AppState {
    /// The provider, behind a mutex-guarded Option (key set / not set)
    /// and an Arc (concurrent access without holding the lock during
    /// network calls). `provider()` locks briefly to clone the Arc,
    /// then unlocks before any async work.
    pub provider: Mutex<Option<Arc<dyn TaskProvider>>>,
    pub database: Database,
    pub data_dir: PathBuf,
}

/// ADR-0008 / finding I1: snapshot an existing database into the recovery
/// backups directory before pending migrations rewrite it. Fail-open: any
/// failure is logged with a stable code and startup continues.
fn backup_before_pending_migration(db_path: &Path, data_dir: &Path) {
    if !db_path.exists() {
        return;
    }
    match Database::pending_migration(db_path) {
        Ok(None) => {}
        Ok(Some(_)) => {
            let manager = RecoveryManager::new(db_path, data_dir.join("recovery"));
            if manager.create_backup_from_file(db_path).is_err() {
                log::warn!("PRE_MIGRATION_BACKUP_FAILED");
            }
        }
        Err(_) => log::warn!("PRE_MIGRATION_BACKUP_FAILED"),
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AppStateError {
    #[error("Application state unavailable")]
    ClientLock,
}

impl AppState {
    /// Create a new AppState with the given data directory, loading the
    /// initial API key from the real OS keychain.
    pub fn new(data_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        Self::new_with_keychain(data_dir, &crate::security::RealKeychain)
    }

    /// Create a new AppState with the given data directory, loading the
    /// initial API key via the given `Keychain`. Lets tests inject an
    /// `InMemoryKeychain` instead of reading whatever key happens to be
    /// stored in the real OS credential store on the machine running them.
    pub fn new_with_keychain(
        data_dir: PathBuf,
        keychain: &dyn crate::security::Keychain,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let db_path = data_dir.join("meshyforge.db");
        backup_before_pending_migration(&db_path, &data_dir);
        let database = Database::open(&db_path)?;

        // If a key exists, construct a MeshyClient boxed as a TaskProvider.
        let provider = keychain
            .get()?
            .map(|key| Arc::new(MeshyClient::new(key)) as Arc<dyn TaskProvider>);

        Ok(Self {
            provider: Mutex::new(provider),
            database,
            data_dir,
        })
    }

    /// Get a reference to the provider, if an API key has been set.
    /// Locks the mutex only long enough to clone the Arc, then unlocks.
    pub fn provider(&self) -> Option<Arc<dyn TaskProvider>> {
        let guard = self.provider.lock().ok()?;
        guard.as_ref().map(Arc::clone)
    }

    /// Set a new API key, creating a new provider.
    pub fn set_api_key(&self, key: String) -> Result<(), AppStateError> {
        let mut guard = self
            .provider
            .lock()
            .map_err(|_| AppStateError::ClientLock)?;
        *guard = Some(Arc::new(MeshyClient::new(key)) as Arc<dyn TaskProvider>);
        Ok(())
    }

    /// Clear the API key and provider.
    pub fn clear_api_key(&self) -> Result<(), AppStateError> {
        let mut guard = self
            .provider
            .lock()
            .map_err(|_| AppStateError::ClientLock)?;
        *guard = None;
        Ok(())
    }

    /// Get the directory where a task's assets should be stored.
    pub fn asset_dir(&self, task_id: &str) -> PathBuf {
        self.data_dir.join("assets").join(task_id)
    }

    /// Directory holding locally cached animation preview images (ADR-0011).
    /// Separate from `assets/` because previews are provider catalogue data,
    /// not user-owned generated output, and may be purged without data loss.
    pub fn preview_cache_dir(&self) -> PathBuf {
        self.data_dir.join("previews")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::security::InMemoryKeychain;

    fn temp_data_dir() -> PathBuf {
        tempfile::tempdir().unwrap().keep()
    }

    /// Every test here constructs `AppState` via `new_with_keychain` with an
    /// `InMemoryKeychain`, not `AppState::new`, so these tests don't observe
    /// whatever key may actually be stored in the real OS keychain on the
    /// machine running them.
    fn new_test_state(dir: PathBuf) -> AppState {
        AppState::new_with_keychain(dir, &InMemoryKeychain::new()).unwrap()
    }

    #[test]
    fn new_creates_database_and_no_provider_without_key() {
        let dir = temp_data_dir();
        let state = new_test_state(dir.clone());

        // Database should be openable (file exists)
        assert!(dir.join("meshyforge.db").exists());

        // No API key in keychain during tests → provider should be None
        assert!(state.provider().is_none());
    }

    #[test]
    fn set_api_key_makes_provider_available() {
        let dir = temp_data_dir();
        let state = new_test_state(dir);

        assert!(state.provider().is_none());
        state.set_api_key("msy_test_key".to_string()).unwrap();
        assert!(state.provider().is_some());
    }

    #[test]
    fn clear_api_key_removes_provider() {
        let dir = temp_data_dir();
        let state = new_test_state(dir);

        state.set_api_key("msy_test_key".to_string()).unwrap();
        assert!(state.provider().is_some());

        state.clear_api_key().unwrap();
        assert!(state.provider().is_none());
    }

    #[test]
    fn provider_returns_arc_clone_each_call() {
        let dir = temp_data_dir();
        let state = new_test_state(dir);
        state.set_api_key("msy_test_key".to_string()).unwrap();

        let p1 = state.provider();
        let p2 = state.provider();
        assert!(p1.is_some());
        assert!(p2.is_some());
        // Arc clones point to the same underlying data
        assert!(Arc::ptr_eq(&p1.unwrap(), &p2.unwrap()));
    }

    #[test]
    fn asset_dir_joins_data_dir_assets_and_task_id() {
        let dir = temp_data_dir();
        let state = new_test_state(dir.clone());

        let asset_dir = state.asset_dir("task-123");
        assert_eq!(asset_dir, dir.join("assets").join("task-123"));
    }

    #[test]
    fn set_api_key_overrides_previous_key() {
        let dir = temp_data_dir();
        let state = new_test_state(dir);

        state.set_api_key("key_one".to_string()).unwrap();
        state.set_api_key("key_two".to_string()).unwrap();

        // Provider should be set (we can't check the key directly through
        // the trait, but we can verify it's Some)
        let provider = state.provider();
        assert!(provider.is_some());
    }

    // ─── Pre-migration backup (ADR-0008, I1) ────────────────────────

    use crate::storage::database::latest_schema_version;
    use rusqlite::Connection;

    /// Builds a schema-v1 database exactly as the 1.0 release left it.
    fn create_v1_database(path: &Path, wal: bool, asset_id: &str) -> Connection {
        let connection = Connection::open(path).unwrap();
        if wal {
            let mode: String = connection
                .query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0))
                .unwrap();
            assert_eq!(mode, "wal");
        }
        connection
            .execute_batch(include_str!("../migrations/001_initial.sql"))
            .unwrap();
        connection
            .execute(
                "INSERT INTO assets (id, meshy_type, created_at) VALUES (?1, 'text-to-3d-preview', 1)",
                [asset_id],
            )
            .unwrap();
        connection
    }

    fn backup_files(dir: &Path) -> Vec<PathBuf> {
        let backups = dir.join("recovery").join("backups");
        if !backups.exists() {
            return Vec::new();
        }
        std::fs::read_dir(backups)
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .filter(|path| {
                path.file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.starts_with("backup-") && name.ends_with(".db"))
            })
            .collect()
    }

    fn live_version(state: &AppState) -> i64 {
        assert!(state.database.matches_current_schema().unwrap());
        Connection::open(state.data_dir.join("meshyforge.db"))
            .unwrap()
            .query_row("SELECT MAX(version) FROM schema_version", [], |row| {
                row.get(0)
            })
            .unwrap()
    }

    #[test]
    fn upgrade_from_v1_creates_restorable_backup_first() {
        let dir = temp_data_dir();
        let db_path = dir.join("meshyforge.db");
        drop(create_v1_database(&db_path, false, "asset-v1"));

        let state = new_test_state(dir.clone());

        let backups = backup_files(&dir);
        assert_eq!(backups.len(), 1);
        let backup = Connection::open(&backups[0]).unwrap();
        let version: i64 = backup
            .query_row("SELECT MAX(version) FROM schema_version", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(version, 1);
        let rows: i64 = backup
            .query_row(
                "SELECT COUNT(*) FROM assets WHERE id = 'asset-v1'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(rows, 1);
        drop(backup);

        assert_eq!(live_version(&state), latest_schema_version());

        let backup_id = backups[0].file_name().unwrap().to_str().unwrap();
        drop(state);
        RecoveryManager::new(&db_path, dir.join("recovery"))
            .restore_backup(backup_id)
            .unwrap();
    }

    #[test]
    fn upgrade_backup_captures_uncheckpointed_wal_rows() {
        let dir = temp_data_dir();
        let db_path = dir.join("meshyforge.db");
        let writer = create_v1_database(&db_path, true, "asset-in-wal");
        assert!(dir.join("meshyforge.db-wal").exists());

        let state = new_test_state(dir.clone());

        let backups = backup_files(&dir);
        assert_eq!(backups.len(), 1);
        let backup = Connection::open(&backups[0]).unwrap();
        let rows: i64 = backup
            .query_row(
                "SELECT COUNT(*) FROM assets WHERE id = 'asset-in-wal'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(rows, 1);
        drop(writer);
        drop(state);
    }

    #[test]
    fn no_backup_when_database_is_already_current() {
        let dir = temp_data_dir();
        drop(new_test_state(dir.clone()));
        assert!(backup_files(&dir).is_empty());

        drop(new_test_state(dir.clone()));
        assert!(backup_files(&dir).is_empty());
    }

    #[test]
    fn no_backup_on_fresh_install() {
        let dir = temp_data_dir();
        assert!(!dir.join("meshyforge.db").exists());
        let _state = new_test_state(dir.clone());
        assert!(backup_files(&dir).is_empty());
        assert!(!dir.join("recovery").exists());
    }

    #[test]
    fn backup_failure_does_not_block_startup() {
        let dir = temp_data_dir();
        let db_path = dir.join("meshyforge.db");
        drop(create_v1_database(&db_path, false, "asset-v1"));
        // A regular file where the recovery directory should be makes the
        // backup directory impossible to create.
        std::fs::write(dir.join("recovery"), b"not a directory").unwrap();

        let state = new_test_state(dir.clone());

        assert!(dir.join("recovery").is_file());
        assert_eq!(live_version(&state), latest_schema_version());
    }
}
