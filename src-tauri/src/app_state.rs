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
use crate::storage::Database;
use std::path::PathBuf;
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
}
