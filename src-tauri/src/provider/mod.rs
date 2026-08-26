// MeshyForge — Provider Abstraction Layer
//
// The TaskProvider trait is the seam between the Tauri command layer and
// the HTTP client layer. Every provider (Meshy, future providers) implements
// this trait. The command layer never references a concrete provider type.
//
// Source: ADR-0004, docs/refactoring/provider-abstraction.md

pub mod error;
pub mod types;

pub mod meshy;

pub use error::ProviderError;
pub use types::{TaskCreateResponse, TaskType};

use async_trait::async_trait;
use std::path::Path;

/// The provider abstraction. Every 3D generation backend implements this.
///
/// The command layer calls these methods with a generic `TaskType` and a
/// `serde_json::Value` body. The provider is responsible for:
/// - Mapping `TaskType` to its own endpoint path
/// - Converting the body to its own wire format (e.g. camelCase → snake_case)
/// - Authenticating with its own scheme (e.g. Bearer token)
/// - Validating download URLs against its own CDN host allowlist
#[async_trait]
pub trait TaskProvider: Send + Sync {
    /// Create a task of the given type with the given request body.
    /// Returns the provider's task ID.
    async fn create_task(
        &self,
        task_type: &TaskType,
        body: serde_json::Value,
    ) -> Result<TaskCreateResponse, ProviderError>;

    /// Poll a task by ID. Returns the full task object as raw JSON
    /// (provider-specific shape, passed through to the frontend).
    async fn get_task(
        &self,
        task_type: &TaskType,
        task_id: &str,
    ) -> Result<serde_json::Value, ProviderError>;

    /// Cancel/delete a task by ID.
    async fn cancel_task(
        &self,
        task_type: &TaskType,
        task_id: &str,
    ) -> Result<(), ProviderError>;

    /// Get the user's credit balance.
    async fn get_balance(&self) -> Result<i64, ProviderError>;

    /// Download a file from a URL to a local path.
    async fn download_file(&self, url: &str, dest: &Path) -> Result<u64, ProviderError>;

    /// Stream task progress via SSE, calling `on_event` for each data chunk.
    /// Returns when the task reaches a terminal status.
    ///
    /// The CALLER is responsible for detecting terminal status from
    /// `on_event` data and firing any completion callbacks — the trait
    /// only delivers events, it does not interpret them. This keeps the
    /// provider generic and lets the command layer wire Tauri events.
    async fn stream_task(
        &self,
        task_type: &TaskType,
        task_id: &str,
        on_event: Box<dyn Fn(serde_json::Value) + Send>,
    ) -> Result<(), ProviderError>;

    /// Fetch the animation library (provider-specific endpoint).
    async fn fetch_animation_library(&self) -> Result<serde_json::Value, ProviderError>;

    /// Return the list of download host names this provider allows.
    /// Used by the download URL validator.
    fn allowed_download_hosts(&self) -> &[&str];

    /// Map a TaskType to this provider's endpoint path.
    /// Returns an empty string if the task type is unsupported.
    fn endpoint_for(&self, task_type: &TaskType) -> &str;
}