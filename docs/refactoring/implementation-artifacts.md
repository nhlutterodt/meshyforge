# Implementation Artifacts: Task Provider Abstraction

> **These are reference artifacts, not final code.** They define the contract
> that each phase must implement. The actual files are created during
> implementation. This document exists so the adversarial, validation, and
> testing agents can review the design before code is written.

---

## R1: Provider Trait + Types

### `src-tauri/src/provider/mod.rs`

```rust
// MeshyForge — Provider Abstraction Layer
//
// The TaskProvider trait is the seam between the Tauri command layer and
// the HTTP client layer. Every provider (Meshy, future providers) implements
// this trait. The command layer never references a concrete provider type.

pub mod error;
pub mod meshy;
pub mod types;

pub use error::ProviderError;
pub use types::{CreativeLabType, TaskType, TaskCreateResponse};

use async_trait::async_trait;
use provider_error::ProviderError as PE;
use std::path::Path;
use std::sync::Arc;

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

    /// Get the user's credit/credit balance.
    async fn get_balance(&self) -> Result<i64, ProviderError>;

    /// Download a file from a URL to a local path.
    async fn download_file(
        &self,
        url: &str,
        dest: &Path,
    ) -> Result<u64, ProviderError>;

    /// Stream task progress via SSE, calling `on_event` for each data chunk.
    /// Returns when the task reaches a terminal status.
    /// The CALLER is responsible for detecting terminal status from
    /// `on_event` data and firing any completion callbacks — the trait
    /// only delivers events, it does not interpret them.
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
    /// e.g. TaskType::TextTo3D → "/v2/text-to-3d" for Meshy.
    fn endpoint_for(&self, task_type: &TaskType) -> &str;
}
```

### `src-tauri/src/provider/types.rs`

```rust
// MeshyForge — Provider-Agnostic Task Type Taxonomy
//
// This enum replaces the provider-specific MeshyType. It has the exact same
// variants and the exact same serde wire values. The granularity is preserved
// 1:1 — no sub-enums, no mode structs. Changing the granularity is out of
// scope for the provider-abstraction refactor (see ADR-0004).

use serde::{Deserialize, Serialize};

/// Response from creating a task. Generic across providers —
/// every provider returns a task ID string.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskCreateResponse {
    pub result: String,
}

/// Discriminates every kind of task the application can produce.
/// Maps 1:1 to the former MeshyType — same variants, same wire format.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TaskType {
    #[serde(rename = "text-to-3d-preview")]
    TextTo3dPreview,
    #[serde(rename = "text-to-3d-refine")]
    TextTo3dRefine,
    #[serde(rename = "image-to-3d")]
    ImageTo3d,
    #[serde(rename = "multi-image-to-3d")]
    MultiImageTo3d,
    #[serde(rename = "retexture")]
    Retexture,
    #[serde(rename = "remesh")]
    Remesh,
    #[serde(rename = "convert")]
    Convert,
    #[serde(rename = "resize")]
    Resize,
    #[serde(rename = "uv-unwrap")]
    UvUnwrap,
    #[serde(rename = "rig")]
    Rig,
    #[serde(rename = "animate")]
    Animate,
    #[serde(rename = "text-to-image")]
    TextToImage,
    #[serde(rename = "image-to-image")]
    ImageToImage,
    #[serde(rename = "print-multi-color")]
    PrintMultiColor,
    #[serde(rename = "print-analyze")]
    PrintAnalyze,
    #[serde(rename = "print-repair")]
    PrintRepair,
    // ── Creative Lab (14 variants, same as MeshyType) ──
    #[serde(rename = "creative-lab-keychain-prototype")]
    CreativeLabKeychainPrototype,
    #[serde(rename = "creative-lab-keychain-build")]
    CreativeLabKeychainBuild,
    #[serde(rename = "creative-lab-fridge-magnet-prototype")]
    CreativeLabFridgeMagnetPrototype,
    #[serde(rename = "creative-lab-fridge-magnet-build")]
    CreativeLabFridgeMagnetBuild,
    #[serde(rename = "creative-lab-figure-prototype")]
    CreativeLabFigurePrototype,
    #[serde(rename = "creative-lab-figure-build")]
    CreativeLabFigureBuild,
    #[serde(rename = "creative-lab-vinyl-figure-prototype")]
    CreativeLabVinylFigurePrototype,
    #[serde(rename = "creative-lab-vinyl-figure-build")]
    CreativeLabVinylFigureBuild,
    #[serde(rename = "creative-lab-brick-figure-prototype")]
    CreativeLabBrickFigurePrototype,
    #[serde(rename = "creative-lab-brick-figure-build")]
    CreativeLabBrickFigureBuild,
    #[serde(rename = "creative-lab-lamp-prototype")]
    CreativeLabLampPrototype,
    #[serde(rename = "creative-lab-lamp-build")]
    CreativeLabLampBuild,
    #[serde(rename = "creative-lab-keycap-prototype")]
    CreativeLabKeycapPrototype,
    #[serde(rename = "creative-lab-keycap-build")]
    CreativeLabKeycapBuild,
}
```

### `src-tauri/src/provider/error.rs`

```rust
// MeshyForge — Generic Provider Error
//
// Replaces MeshyError. Same variants, provider-agnostic name.
// MeshyError is mapped to ProviderError at the provider implementation
// boundary (in provider/meshy.rs).

use thiserror::Error;

#[derive(Debug, Error)]
pub enum ProviderError {
    #[error("API error {status}: {body}")]
    ApiError {
        status: reqwest::StatusCode,
        body: String,
    },
    #[error("Download failed: {0}")]
    DownloadFailed(reqwest::StatusCode),
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    #[error("Filesystem error: {0}")]
    Filesystem(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Missing API key")]
    MissingApiKey,
    #[error("Invalid API key")]
    InvalidApiKey,
}
```

---

## R2: MeshyProvider Impl

### `src-tauri/src/provider/meshy.rs`

```rust
// MeshyForge — Meshy Provider Implementation
//
// This is the one file that knows about Meshy's specific API: endpoint paths,
// snake_case wire format, Bearer auth, and CDN host. Everything else in the
// backend talks to the trait, not to this file.

use super::error::ProviderError;
use super::types::TaskType;
use super::TaskProvider;
use crate::meshy::client::MeshyClient;
use crate::meshy::models::BalanceResponse;
use crate::provider::types::TaskCreateResponse;
use async_trait::async_trait;
use futures_util::StreamExt;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use std::path::Path;

/// Meshy API endpoint path for each TaskType.
/// This is the only place endpoint paths are hardcoded.
/// All 30 TaskType variants are covered.
const ENDPOINT_MAP: &[(TaskType, &str)] = &[
    (TaskType::TextTo3dPreview, "/v2/text-to-3d"),
    (TaskType::TextTo3dRefine, "/v2/text-to-3d"),
    (TaskType::ImageTo3d, "/v1/image-to-3d"),
    (TaskType::MultiImageTo3d, "/v1/multi-image-to-3d"),
    (TaskType::Remesh, "/v1/remesh"),
    (TaskType::Retexture, "/v1/retexture"),
    (TaskType::Convert, "/v1/convert"),
    (TaskType::Resize, "/v1/resize"),
    (TaskType::UvUnwrap, "/v1/uv-unwrap"),
    (TaskType::Rig, "/v1/rigging"),
    (TaskType::Animate, "/v1/animation"),
    (TaskType::TextToImage, "/v2/text-to-image"),
    (TaskType::ImageToImage, "/v2/image-to-image"),
    (TaskType::PrintMultiColor, "/v1/print/multi-color"),
    (TaskType::PrintAnalyze, "/v1/print/analyze"),
    (TaskType::PrintRepair, "/v1/print/repair"),
    // ── Creative Lab (all 14 variants → /v2/text-to-3d) ──
    (TaskType::CreativeLabKeychainPrototype, "/v2/text-to-3d"),
    (TaskType::CreativeLabKeychainBuild, "/v2/text-to-3d"),
    (TaskType::CreativeLabFridgeMagnetPrototype, "/v2/text-to-3d"),
    (TaskType::CreativeLabFridgeMagnetBuild, "/v2/text-to-3d"),
    (TaskType::CreativeLabFigurePrototype, "/v2/text-to-3d"),
    (TaskType::CreativeLabFigureBuild, "/v2/text-to-3d"),
    (TaskType::CreativeLabVinylFigurePrototype, "/v2/text-to-3d"),
    (TaskType::CreativeLabVinylFigureBuild, "/v2/text-to-3d"),
    (TaskType::CreativeLabBrickFigurePrototype, "/v2/text-to-3d"),
    (TaskType::CreativeLabBrickFigureBuild, "/v2/text-to-3d"),
    (TaskType::CreativeLabLampPrototype, "/v2/text-to-3d"),
    (TaskType::CreativeLabLampBuild, "/v2/text-to-3d"),
    (TaskType::CreativeLabKeycapPrototype, "/v2/text-to-3d"),
    (TaskType::CreativeLabKeycapBuild, "/v2/text-to-3d"),
];

const DOWNLOAD_HOSTS: &[&str] = &["assets.meshy.ai"];

#[async_trait]
impl TaskProvider for MeshyClient {
    async fn create_task(
        &self,
        _task_type: &TaskType,
        body: serde_json::Value,
    ) -> Result<TaskCreateResponse, ProviderError> {
        let endpoint = self.endpoint_for(task_type);
        let api_body = camel_to_snake_keys(&body);  // Moved from command layer
        // ... existing create_task logic, returning ProviderError instead of MeshyError
    }

    async fn get_task(
        &self,
        task_type: &TaskType,
        task_id: &str,
    ) -> Result<serde_json::Value, ProviderError> {
        let endpoint = self.endpoint_for(task_type);
        // ... existing get_task logic
    }

    // ... all other trait methods, delegating to existing MeshyClient methods
    // but returning ProviderError instead of MeshyError

    fn allowed_download_hosts(&self) -> &[&str] {
        DOWNLOAD_HOSTS
    }

    fn endpoint_for(&self, task_type: &TaskType) -> &str {
        ENDPOINT_MAP
            .iter()
            .find(|(t, _)| t == task_type)
            .map(|(_, path)| *path)
            .unwrap_or("")
    }
}
```

### Key design point: `camel_to_snake_keys` moves here

The `camel_to_snake_keys` and `camel_to_snake` functions currently in
`commands/api.rs` move to `provider/meshy.rs`. They become private functions
of the Meshy provider impl. The command layer no longer does any wire-format
conversion — it passes the raw `serde_json::Value` body to the provider, and
the provider converts it.

This means a future provider that uses camelCase natively (or JSON:API, or
GraphQL) would do its own conversion in its own impl — the command layer
stays clean.

---

## R3: AppState + Command Layer

### `src-tauri/src/app_state.rs` (modified)

```rust
use crate::provider::TaskProvider;
use crate::storage::Database;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

pub struct AppState {
    // Option C: Mutex guards the Option (key set/not set),
    // Arc allows concurrent provider access without holding the lock
    // during network calls.
    pub provider: Mutex<Option<Arc<dyn TaskProvider>>>,
    pub database: Database,
    pub data_dir: PathBuf,
}

impl AppState {
    pub fn new(data_dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let db_path = data_dir.join("meshyforge.db");
        let database = Database::open(&db_path)?;

        let provider = crate::security::get_key()?
            .map(|key| {
                Arc::new(MeshyClient::new(key)) as Arc<dyn TaskProvider>
            });

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
        guard.as_ref().map(|p| Arc::clone(p))
    }

    /// Set a new API key, creating a new provider.
    pub fn set_api_key(&self, key: String) -> Result<(), AppStateError> {
        let mut guard = self.provider.lock().map_err(|_| AppStateError::ClientLock)?;
        *guard = Some(Arc::new(MeshyClient::new(key)) as Arc<dyn TaskProvider>);
        Ok(())
    }

    /// Clear the API key and provider.
    pub fn clear_api_key(&self) -> Result<(), AppStateError> {
        let mut guard = self.provider.lock().map_err(|_| AppStateError::ClientLock)?;
        *guard = None;
        Ok(())
    }

    pub fn asset_dir(&self, task_id: &str) -> PathBuf {
        self.data_dir.join("assets").join(task_id)
    }
}
```

### `src-tauri/src/commands/api.rs` (modified — key changes)

The `create_task_inner` function changes from taking `endpoint: &str` to
taking `task_type: &TaskType`:

```rust
// BEFORE (current):
pub(crate) async fn create_task_inner(
    state: &AppState,
    endpoint: &str,
    body: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    let api_body = camel_to_snake_keys(body);  // ← removed, moved to provider
    let client = state.meshy_client()...;
    let response = client.create_task(endpoint, &api_body).await...;
    // ...
}

// AFTER (refactored):
pub(crate) async fn create_task_inner(
    state: &AppState,
    task_type: &TaskType,
    body: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    let provider = state.provider().ok_or_else(|| {
        error_json("MISSING_API_KEY", "No API key configured.")
    })?;
    let response = provider.create_task(task_type, body.clone()).await
        .map_err(|e| error_json_from_provider_error(&e))?;
    let endpoint = provider.endpoint_for(task_type);
    let _ = state.database.log_task_create(&response.result, endpoint, body);
    serialize_response(response)
}
```

Each `create_*` command changes from:

```rust
// BEFORE:
create_task_inner(&state, "/v2/text-to-3d", &body).await

// AFTER:
create_task_inner(&state, &TaskType::TextTo3dPreview, &body).await
```

`poll_task_inner`, `delete_task_inner`, `stream_task_inner` all change from
taking `endpoint: &str` to taking `task_type: &TaskType`.

`download_asset_inner` changes `validate_download_url(url)` to
`validate_download_url(url, provider.allowed_download_hosts())`.

`fetch_animation_library_inner` changes from hardcoding a URL to calling
`provider.fetch_animation_library()`.

### `src-tauri/src/commands/validation.rs` (modified)

```rust
// BEFORE:
const TASK_ENDPOINTS: &[&str] = &["/v2/text-to-3d", "/v1/image-to-3d", ...];

pub fn validate_task_reference(endpoint: &str, task_id: &str) -> Result<(), &'static str> {
    if !TASK_ENDPOINTS.contains(&endpoint) {
        return Err("Unsupported Meshy endpoint.");
    }
    // ...
}

pub fn validate_download_url(url: &str) -> Result<(), &'static str> {
    if parsed.host_str() != Some("assets.meshy.ai") { ... }
}

// AFTER:
pub fn validate_task_id(task_id: &str) -> Result<(), &'static str> { ... } // unchanged

pub fn validate_download_url(url: &str, allowed_hosts: &[&str]) -> Result<(), &'static str> {
    let parsed = Url::parse(url).map_err(|_| "Download URL is invalid.")?;
    if parsed.scheme() != "https" {
        return Err("Downloads must use HTTPS.");
    }
    if !allowed_hosts.contains(&parsed.host_str().unwrap_or("")) {
        return Err("Downloads are restricted to the provider's asset host.");
    }
    Ok(())
}
```

The `TASK_ENDPOINTS` const array is removed. Endpoint validation moves into
the provider's `endpoint_for()` method — if it returns an empty string, the
task type is unsupported.

---

## R4: Frontend Type Renames

### `src/lib/meshy-types.ts` (modified — key renames)

```typescript
// BEFORE:
export type MeshyType = 'text-to-3d-preview' | ... 30+ variants;
export type AiModel = 'meshy-5' | 'meshy-6' | 'meshy-7' | 'latest';
export interface ActiveTask { ... meshyType: string; endpoint: string; ... }

// AFTER:
export type TaskType = 'text-to-3d-preview' | ... 30+ variants; // same union, new name
export type ModelId = 'meshy-5' | 'meshy-6' | 'meshy-7' | 'latest'; // same values, new name
export interface ActiveTask { ... taskType: string; ... } // meshyType → taskType, endpoint removed
```

The wire values don't change — `'meshy-5'` is still `'meshy-5'`. Only the
TypeScript type names change. Tauri serde still sends camelCase. The frontend
test mocks that hardcode `'latest'` or `'meshy-7'` still work because the
values are the same.

### `src/lib/tauri.ts` (modified)

```typescript
// BEFORE:
export interface MeshyFrontendError { ... }

// AFTER:
export interface FrontendError { ... } // same shape, new name
```

### `src/lib/constants.ts` (modified)

```typescript
// BEFORE:
export const MESHY_ENDPOINTS = { textTo3D: '/v2/text-to-3d', ... };
export const ANIMATION_LIBRARY_URL = 'https://api.meshy.ai/...';

// AFTER:
// MESHY_ENDPOINTS removed — provider tracks endpoints internally
// ANIMATION_LIBRARY_URL removed — provider handles this
// APP_NAME, APP_VERSION, sidebar constants remain
```

### `src/hooks/useMeshyApi.ts` (modified)

```typescript
// BEFORE:
interface CreateHookConfig { ... meshyType: string; ... }
// Each hook config: meshyType: 'text-to-3d-preview'

// AFTER:
interface CreateHookConfig { ... taskType: string; ... } // meshyType → taskType
// Each hook config: taskType: 'text-to-3d-preview' // same value
```

### `src/stores/taskStore.ts` (modified)

```typescript
// BEFORE:
import type { ActiveTask } from '../lib/meshy-types';
// ActiveTask.meshyType used in addTask/updateTask

// AFTER:
import type { ActiveTask } from '../lib/meshy-types';
// ActiveTask.taskType used in addTask/updateTask (renamed field)
```

### `src/stores/settingsStore.ts` (modified)

```typescript
// BEFORE:
import type { AiModel, ExportFormat } from '../lib/meshy-types';
interface SettingsState { defaultAiModel: AiModel; ... }

// AFTER:
import type { ModelId, ExportFormat } from '../lib/meshy-types';
interface SettingsState { defaultAiModel: ModelId; ... } // type renamed, field name unchanged
```

---

## R5: Cleanup + Verification

### `src/lib/runtime-guardrails.test.ts` (modified)

```typescript
// BEFORE: asserts camel_to_snake_keys is in commands/api.rs
//         asserts it's called in create_task_inner

// AFTER: asserts TaskProvider trait exists in provider/mod.rs
//        asserts MeshyClient implements TaskProvider (provider/meshy.rs)
//        asserts camel_to_snake_keys lives in provider/meshy.rs (not commands/api.rs)
//        asserts download URL validation takes a host list parameter
//        asserts no hardcoded endpoint paths in commands/api.rs
```

The guardrail test is the canary — it verifies the architectural invariant
that the command layer doesn't know about provider-specific details.

---

## Agent Checklists

### Adversarial Agent — Questions to answer before each phase

**R1:**
- [ ] Does `TaskType` have exactly the same variants as `MeshyType`? (count them)
- [ ] Does `ProviderError` have exactly the same variants as `MeshyError`?
- [ ] Does the trait signature compile with `async_trait`?
- [ ] Is the streaming callback `Box<dyn Fn(serde_json::Value) + Send>` correct for `async_trait`?

**R2:**
- [ ] Does `camel_to_snake_keys` produce identical output when called from the provider vs the command layer?
- [ ] Does `endpoint_for()` return the correct path for every `TaskType` variant?
- [ ] Does `allowed_download_hosts()` return `["assets.meshy.ai"]`?
- [ ] Are there any existing tests that would break because `camel_to_snake_keys` moved?

**R3:**
- [ ] Does any `*_inner` function still reference a hardcoded endpoint path?
- [ ] Does any function call `state.meshy_client()` instead of `state.provider()`?
- [ ] Does `validate_download_url` take a host list parameter?
- [ ] Does `fetch_animation_library_inner` call `provider.fetch_animation_library()`?
- [ ] Do all 175+ existing tests pass with the new dispatch?

**R4:**
- [ ] Does any file still import `MeshyType`, `AiModel`, or `MeshyFrontendError`?
- [ ] Does any file still reference `MESHY_ENDPOINTS` or `ANIMATION_LIBRARY_URL`?
- [ ] Is the IPC wire format unchanged? (Tauri serde still camelCase, same wire values)

**R5:**
- [ ] Are there unused imports or functions left from the refactor?
- [ ] Does `runtime-guardrails.test.ts` assert the new architecture?
- [ ] Does the full quality gate pass with zero regressions?

### Validation Agent — Checks after code is written

- [ ] Exactly the files listed in the phase scope were modified (check `git diff --name-only`)
- [ ] No files outside the phase scope were modified
- [ ] The phase's gate command passes
- [ ] The test count matches or exceeds the pre-refactor baseline

### Testing Agent — Test strategy per phase

**R1:** Trait compiles, types have correct serde attributes, no behavior tests needed (additive only).

**R2:** Provider-level tests: mock server, verify trait dispatch, verify wire format conversion, verify endpoint mapping, verify download host list. Existing wiremock tests must pass unchanged.

**R3:** All existing 175+ tests pass with new dispatch. New test: mock `TaskProvider` impl verifies command layer dispatches correctly. New test: `validate_download_url` with custom host list.

**R4:** All existing frontend tests pass with renamed types. No new tests needed (cosmetic rename).

**R5:** `runtime-guardrails.test.ts` updated and passing. Full suite green.