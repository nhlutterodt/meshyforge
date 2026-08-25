// MeshyForge — Application State
//
// AppState is shared across all Tauri commands via State<'_, AppState>.
// It holds the MeshyClient (constructed at startup from the keychain key),
// the Database, and the app data directory path.

use crate::meshy::MeshyClient;
use crate::storage::Database;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct AppState {
    pub client: Mutex<Option<MeshyClient>>,
    pub database: Database,
    pub data_dir: PathBuf,
}

#[derive(Debug, thiserror::Error)]
pub enum AppStateError {
    #[error("Application state unavailable")]
    ClientLock,
}

impl AppState {
    /// Create a new AppState with the given data directory.
    pub fn new(data_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let db_path = data_dir.join("meshyforge.db");
        let database = Database::open(&db_path)?;

        // Try to load the API key from keychain at startup
        let client = crate::security::get_key()?.map(MeshyClient::new);

        Ok(Self {
            client: Mutex::new(client),
            database,
            data_dir,
        })
    }

    /// Get a reference to the MeshyClient, if an API key has been set.
    pub fn meshy_client(&self) -> Option<MeshyClient> {
        let guard = self.client.lock().ok()?;
        guard.as_ref().map(|c| c.clone())
    }

    /// Set a new API key, creating a new client.
    pub fn set_api_key(&self, key: String) -> Result<(), AppStateError> {
        let mut guard = self.client.lock().map_err(|_| AppStateError::ClientLock)?;
        *guard = Some(MeshyClient::new(key));
        Ok(())
    }

    /// Clear the API key and client.
    pub fn clear_api_key(&self) -> Result<(), AppStateError> {
        let mut guard = self.client.lock().map_err(|_| AppStateError::ClientLock)?;
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

    fn temp_data_dir() -> PathBuf {
        tempfile::tempdir().unwrap().keep()
    }

    #[test]
    fn new_creates_database_and_no_client_without_key() {
        let dir = temp_data_dir();
        let state = AppState::new(dir.clone()).unwrap();

        // Database should be openable (file exists)
        assert!(dir.join("meshyforge.db").exists());

        // No API key in keychain during tests → client should be None
        assert!(state.meshy_client().is_none());
    }

    #[test]
    fn set_api_key_makes_client_available() {
        let dir = temp_data_dir();
        let state = AppState::new(dir).unwrap();

        assert!(state.meshy_client().is_none());
        state.set_api_key("msy_test_key".to_string()).unwrap();
        assert!(state.meshy_client().is_some());
    }

    #[test]
    fn clear_api_key_removes_client() {
        let dir = temp_data_dir();
        let state = AppState::new(dir).unwrap();

        state.set_api_key("msy_test_key".to_string()).unwrap();
        assert!(state.meshy_client().is_some());

        state.clear_api_key().unwrap();
        assert!(state.meshy_client().is_none());
    }

    #[test]
    fn meshy_client_returns_new_instance_each_call() {
        let dir = temp_data_dir();
        let state = AppState::new(dir).unwrap();
        state.set_api_key("msy_test_key".to_string()).unwrap();

        let c1 = state.meshy_client();
        let c2 = state.meshy_client();
        assert!(c1.is_some());
        assert!(c2.is_some());
        // Different instances (cloned via api_key)
        assert_ne!(
            c1.as_ref().unwrap() as *const _,
            c2.as_ref().unwrap() as *const _
        );
    }

    #[test]
    fn asset_dir_joins_data_dir_assets_and_task_id() {
        let dir = temp_data_dir();
        let state = AppState::new(dir.clone()).unwrap();

        let asset_dir = state.asset_dir("task-123");
        assert_eq!(asset_dir, dir.join("assets").join("task-123"));
    }

    #[test]
    fn set_api_key_overrides_previous_key() {
        let dir = temp_data_dir();
        let state = AppState::new(dir).unwrap();

        state.set_api_key("key_one".to_string()).unwrap();
        state.set_api_key("key_two".to_string()).unwrap();

        let client = state.meshy_client();
        assert!(client.is_some());
        assert_eq!(client.unwrap().api_key(), "key_two");
    }
}
