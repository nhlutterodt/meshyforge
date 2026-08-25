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
        guard
            .as_ref()
            .map(|c| MeshyClient::new(c.api_key().to_string()))
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
