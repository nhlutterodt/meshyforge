// MeshyForge — API Tauri Commands
//
// Source: TDD §7.2, CSD §7.2, ADR-0004

use crate::app_state::AppState;
use crate::commands::validation::{
    artifact_filename, artifact_storage_key, sanitize_cache_key, texture_filename,
    validate_creation_body, validate_download_url, validate_preview_url, validate_task_id,
    validate_task_reference,
};
use crate::provider::error::ProviderError;
use crate::provider::types::{AnimationLibraryEntry, TaskArtifact, TaskSnapshotStatus, TaskType};
use std::sync::Arc;
use tauri::Emitter;

/// Helper: JSON error string (CSD §7.2 pattern)
fn error_json(code: &str, message: &str) -> String {
    serde_json::to_string(&serde_json::json!({
        "code": code,
        "message": message,
    }))
    .unwrap_or_else(|_| format!("{{\"code\":\"{}\",\"message\":\"{}\"}}", code, message))
}

/// Helper: Map ProviderError to a JSON error string (CSD §7.2 pattern)
fn error_json_from_provider_error(e: &ProviderError) -> String {
    let (code, message) = match e {
        ProviderError::ApiError { status, body } => {
            let code = format!("API_ERROR_{}", status.as_u16());
            let msg = serde_json::from_str::<serde_json::Value>(body)
                .ok()
                .and_then(|v| v.get("message").and_then(|m| m.as_str()).map(String::from))
                .unwrap_or_else(|| body.clone());
            (code, msg)
        }
        ProviderError::Network(_) => ("NETWORK_ERROR".to_string(), "Network error.".to_string()),
        ProviderError::MissingApiKey => ("MISSING_API_KEY".to_string(), "No API key.".to_string()),
        _ => ("INTERNAL_ERROR".to_string(), "Internal error.".to_string()),
    };
    error_json(&code, &message)
}

fn validate_creation(endpoint: &str, body: &serde_json::Value) -> Result<(), String> {
    validate_creation_body(endpoint, body).map_err(|message| error_json("INVALID_INPUT", message))
}

/// ADR-0015 TPC-01/TPC-02: a normalization failure is a provider-shaped
/// error. The message never includes the raw payload, which carries signed
/// URLs (IPC-06).
fn snapshot_error() -> String {
    error_json(
        "SNAPSHOT_ERROR",
        "Could not normalize the provider task response.",
    )
}

/// Parse a `TaskType` from its serde wire value (ADR-0015 TPC-05).
/// Fail-closed: an unknown value returns `INVALID_INPUT` before any
/// provider/network call (IPC-04, VAL-01). This replaces
/// `endpoint_to_task_type` and its silent `TextTo3dPreview` fallback.
fn parse_task_type_wire(wire: &str) -> Result<TaskType, String> {
    let quoted = serde_json::to_string(wire)
        .map_err(|_| error_json("INVALID_INPUT", "Invalid task type."))?;
    serde_json::from_str::<TaskType>(&quoted)
        .map_err(|_| error_json("INVALID_INPUT", "Unknown task type."))
}

/// Wire value of a normalized status (ADR-0015 TPC-02 closed set).
fn snapshot_status_wire(status: TaskSnapshotStatus) -> &'static str {
    match status {
        TaskSnapshotStatus::Pending => "PENDING",
        TaskSnapshotStatus::InProgress => "IN_PROGRESS",
        TaskSnapshotStatus::Succeeded => "SUCCEEDED",
        TaskSnapshotStatus::Failed => "FAILED",
        TaskSnapshotStatus::Canceled => "CANCELED",
    }
}

fn serialize_response<T: serde::Serialize>(response: T) -> Result<serde_json::Value, String> {
    serde_json::to_value(response).map_err(|error| {
        eprintln!("Failed to serialize provider response: {error}");
        error_json(
            "SERIALIZATION_ERROR",
            "Could not process the provider response.",
        )
    })
}

// Note: camel_to_snake_keys and camel_to_snake have been moved to
// src/provider/meshy.rs (the Meshy provider implementation). The command
// layer no longer performs wire-format conversion — each provider handles
// its own wire format internally. (ADR-0004)

// ─── Pure inner functions (testable without tauri::State) ──────
// Each #[tauri::command] delegates to these so the business logic
// can be unit-tested with a plain &AppState (no Tauri runtime).

/// Create a task of the given type. Used by all create_* commands.
/// The provider handles endpoint mapping and wire-format conversion internally.
pub(crate) async fn create_task_inner(
    state: &AppState,
    task_type: &TaskType,
    body: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    let provider = state.provider().ok_or_else(|| {
        error_json(
            "MISSING_API_KEY",
            "No API key configured. Add your key in Settings.",
        )
    })?;
    let endpoint = provider.endpoint_for(task_type);
    validate_creation(endpoint, body)?;
    let response = provider
        .create_task(task_type, body.clone())
        .await
        .map_err(|e| error_json_from_provider_error(&e))?;
    let task_type_name = serde_json::to_value(task_type)
        .ok()
        .and_then(|value| value.as_str().map(str::to_owned))
        .unwrap_or_else(|| "unknown".to_string());
    let _ = state
        .database
        .ensure_task_stub(&response.result, &task_type_name);
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, body);
    serialize_response(response)
}

/// Poll a task by task type + task_id.
///
/// ADR-0015 step 2 (TPC-02): returns the normalized `TaskSnapshot` JSON, not
/// the raw provider response. Storage persistence receives the same snapshot
/// value — `Database::update_task_status` reads the camelCase aliases
/// (`startedAt`/`finishedAt`/`consumedCredits`), which the snapshot always
/// serializes.
pub(crate) async fn poll_task_inner(
    state: &AppState,
    task_type: &TaskType,
    task_id: &str,
) -> Result<serde_json::Value, String> {
    let provider = state
        .provider()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let endpoint = provider.endpoint_for(task_type);
    validate_task_reference(endpoint, task_id)
        .map_err(|message| error_json("INVALID_INPUT", message))?;
    let raw = provider
        .get_task(task_type, task_id)
        .await
        .map_err(|e| error_json_from_provider_error(&e))?;
    let snapshot = provider
        .snapshot(task_type, &raw)
        .map_err(|_| snapshot_error())?;
    let value = serialize_response(snapshot)?;
    let _ = state.database.update_task_status(task_id, &value);
    Ok(value)
}

/// Delete a task by task type + task_id.
pub(crate) async fn delete_task_inner(
    state: &AppState,
    task_type: &TaskType,
    task_id: &str,
) -> Result<(), String> {
    let provider = state
        .provider()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let endpoint = provider.endpoint_for(task_type);
    validate_task_reference(endpoint, task_id)
        .map_err(|message| error_json("INVALID_INPUT", message))?;
    provider
        .cancel_task(task_type, task_id)
        .await
        .map_err(|e| error_json_from_provider_error(&e))?;
    Ok(())
}

/// Download model files, thumbnail, and textures for a completed task.
///
/// ADR-0015 step 3: takes the typed role-tagged artifacts (TPC-03) instead of
/// the legacy `format → url` map. **Every artifact is downloaded** — an
/// artifact whose `(role, format)` pair or label is not in the closed TPC-04
/// filename mapping is an `INVALID_INPUT` rejection, never a silent skip
/// (TASK-0031 evidence gate). `file_paths` is keyed by `artifact_storage_key`
/// so primary keys are unchanged for existing rows and readers (TPC-04).
pub(crate) async fn download_asset_inner(
    state: &AppState,
    task_id: &str,
    artifacts: &[TaskArtifact],
    thumbnail_url: Option<&str>,
    texture_urls: Option<&serde_json::Value>,
) -> Result<serde_json::Value, String> {
    validate_task_id(task_id).map_err(|message| error_json("INVALID_INPUT", message))?;
    let provider = state
        .provider()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let allowed_hosts = provider.allowed_download_hosts();

    // Validate before any side effect (IPC-04, VAL-01): every artifact URL
    // against the provider allowlist, and every (role, format, label) against
    // the closed TPC-04 mapping. Computing the mapping here also pre-computes
    // the storage key and filename used below — an unmappable artifact fails
    // the whole download instead of being dropped (TASK-0031).
    let mut planned: Vec<(String, String, String)> = Vec::with_capacity(artifacts.len());
    let mut seen_keys = std::collections::BTreeSet::new();
    for artifact in artifacts {
        validate_download_url(&artifact.url, allowed_hosts)
            .map_err(|message| error_json("INVALID_INPUT", message))?;
        let key = artifact_storage_key(artifact.role, &artifact.format, artifact.label.as_deref())
            .map_err(|message| error_json("INVALID_INPUT", message))?;
        let filename =
            artifact_filename(artifact.role, &artifact.format, artifact.label.as_deref())
                .map_err(|message| error_json("INVALID_INPUT", message))?;
        if !seen_keys.insert(key.clone()) {
            return Err(error_json(
                "INVALID_INPUT",
                "Two artifacts map to the same storage key.",
            ));
        }
        planned.push((key, filename, artifact.url.clone()));
    }
    if let Some(url) = thumbnail_url {
        validate_download_url(url, allowed_hosts)
            .map_err(|message| error_json("INVALID_INPUT", message))?;
    }

    let asset_dir = state.asset_dir(task_id);
    std::fs::create_dir_all(&asset_dir)
        .map_err(|_| error_json("FS_ERROR", "Could not create the asset directory."))?;

    let mut file_paths: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();

    // Download every artifact (no format map, no skips).
    for (key, filename, url) in &planned {
        let dest = asset_dir.join(filename);
        provider
            .download_file(url, &dest)
            .await
            .map_err(|e| error_json_from_provider_error(&e))?;
        file_paths.insert(
            key.clone(),
            serde_json::Value::String(dest.to_string_lossy().into_owned()),
        );
    }

    // Download thumbnail
    let thumbnail_path = if let Some(url) = thumbnail_url {
        let dest = asset_dir.join("thumbnail.png");
        provider
            .download_file(url, &dest)
            .await
            .map_err(|e| error_json_from_provider_error(&e))?;
        Some(dest.to_string_lossy().into_owned())
    } else {
        None
    };

    // Download textures
    let texture_paths = if let Some(textures) = texture_urls {
        let tex_dir = asset_dir.join("textures");
        std::fs::create_dir_all(&tex_dir)
            .map_err(|_| error_json("FS_ERROR", "Could not create the texture directory."))?;
        let mut paths = Vec::new();
        if let Some(arr) = textures.as_array() {
            for (i, tex_obj) in arr.iter().enumerate() {
                let mut tex_paths = serde_json::Map::new();
                if let Some(obj) = tex_obj.as_object() {
                    for (key, url_val) in obj {
                        if let Some(url) = url_val.as_str() {
                            validate_download_url(url, allowed_hosts)
                                .map_err(|message| error_json("INVALID_INPUT", message))?;
                            let filename = texture_filename(i, key).ok_or_else(|| {
                                error_json("INVALID_INPUT", "Unsupported texture map type.")
                            })?;
                            let dest = tex_dir.join(&filename);
                            provider
                                .download_file(url, &dest)
                                .await
                                .map_err(|e| error_json_from_provider_error(&e))?;
                            tex_paths.insert(
                                key.clone(),
                                serde_json::Value::String(dest.to_string_lossy().into_owned()),
                            );
                        }
                    }
                }
                paths.push(serde_json::Value::Object(tex_paths));
            }
        }
        Some(serde_json::Value::Array(paths))
    } else {
        None
    };

    let file_paths_value = serde_json::Value::Object(file_paths);
    state
        .database
        .mark_downloaded(
            task_id,
            &file_paths_value,
            thumbnail_path.as_deref(),
            texture_paths.as_ref(),
        )
        .map_err(|error| {
            eprintln!("Failed to record downloaded asset {task_id}: {error}");
            error_json("DATABASE_ERROR", "Could not update the asset library.")
        })?;

    Ok(serde_json::json!({
        "file_paths": file_paths_value,
        "thumbnail_path": thumbnail_path,
        "texture_paths": texture_paths,
    }))
}

/// Get the user's credit balance.
pub(crate) async fn get_credit_balance_inner(state: &AppState) -> Result<i64, String> {
    let provider = state
        .provider()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let balance = provider
        .get_balance()
        .await
        .map_err(|e| error_json_from_provider_error(&e))?;
    Ok(balance)
}

/// Fetch the public animation library.
pub(crate) async fn fetch_animation_library_inner(
    state: &AppState,
) -> Result<serde_json::Value, String> {
    let provider = state
        .provider()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = provider
        .fetch_animation_library()
        .await
        .map_err(|e| error_json_from_provider_error(&e))?;

    // Normalise to the camelCase IPC contract. Malformed entries are dropped
    // rather than failing the whole catalogue — one bad row must not empty the
    // picker.
    let entries: Vec<AnimationLibraryEntry> = response
        .as_array()
        .map(Vec::as_slice)
        .unwrap_or_default()
        .iter()
        .filter_map(|value| serde_json::from_value::<AnimationLibraryEntry>(value.clone()).ok())
        .map(|mut entry| {
            if entry.key.trim().is_empty() {
                entry.key = format!("action_{}", entry.id);
            }
            entry
        })
        .collect();

    serde_json::to_value(entries)
        .map_err(|_| error_json("INTERNAL_ERROR", "Could not read the animation library."))
}

/// Cache an animation preview image locally and return its path (ADR-0011).
///
/// Local-first by design: the cached file is the primary render source and the
/// remote CDN is only a fallback for the webview when no local copy exists.
/// Idempotent — an already-cached preview is returned without a refetch.
pub(crate) async fn cache_animation_preview_inner(
    state: &AppState,
    key: &str,
    preview_url: &str,
) -> Result<String, String> {
    let safe_key = sanitize_cache_key(key).map_err(|m| error_json("INVALID_INPUT", m))?;
    let provider = state
        .provider()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    validate_preview_url(preview_url, provider.allowed_preview_hosts())
        .map_err(|m| error_json("INVALID_INPUT", m))?;

    let dir = state.preview_cache_dir();
    std::fs::create_dir_all(&dir)
        .map_err(|_| error_json("FS_ERROR", "Could not create the preview cache directory."))?;
    let dest = dir.join(format!("{safe_key}.gif"));

    if dest.is_file() {
        return Ok(dest.to_string_lossy().into_owned());
    }

    provider
        .download_file(preview_url, &dest)
        .await
        .map_err(|e| error_json_from_provider_error(&e))?;

    Ok(dest.to_string_lossy().into_owned())
}

// ─── Task Creation Commands ────────────────────────────────────

// ADR-0015 step 2 (TPC-05): `endpoint_to_task_type` and its silent
// `TextTo3dPreview` fallback are deleted. `poll_task`, `stream_task` and
// `delete_task` now receive the TaskType serde wire value from the frontend
// and parse it fail-closed via `parse_task_type_wire`.
// `provider::meshy::ENDPOINT_MAP` remains the only endpoint table; the
// command layer derives the endpoint from the TaskType via
// `TaskProvider::endpoint_for`.

#[tauri::command]
pub async fn create_text_to_3d(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    // Determine preview vs refine from the body's mode field
    let task_type = match body.get("mode").and_then(|m| m.as_str()) {
        Some("refine") => TaskType::TextTo3dRefine,
        _ => TaskType::TextTo3dPreview,
    };
    create_task_inner(&state, &task_type, &body).await
}

#[tauri::command]
pub async fn create_image_to_3d(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::ImageTo3d, &body).await
}

#[tauri::command]
pub async fn create_remesh(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::Remesh, &body).await
}

#[tauri::command]
pub async fn create_retexture(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::Retexture, &body).await
}

#[tauri::command]
pub async fn create_convert(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::Convert, &body).await
}

#[tauri::command]
pub async fn create_resize(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::Resize, &body).await
}

#[tauri::command]
pub async fn create_rigging(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::Rig, &body).await
}

#[tauri::command]
pub async fn create_animation(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::Animate, &body).await
}

#[tauri::command]
pub async fn create_text_to_motion(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::TextToMotion, &body).await
}

#[tauri::command]
pub async fn create_text_to_image(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::TextToImage, &body).await
}

#[tauri::command]
pub async fn create_image_to_image(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::ImageToImage, &body).await
}

#[tauri::command]
pub async fn create_multi_image_to_3d(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::MultiImageTo3d, &body).await
}

#[tauri::command]
pub async fn create_uv_unwrap(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::UvUnwrap, &body).await
}

#[tauri::command]
pub async fn create_multi_color_print(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::PrintMultiColor, &body).await
}

#[tauri::command]
pub async fn create_analyze_printability(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::PrintAnalyze, &body).await
}

#[tauri::command]
pub async fn create_repair_printability(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, &TaskType::PrintRepair, &body).await
}

/// Map a Creative Lab wire-format `type` string (the frontend's
/// `CreativeLabPrototypeRequest`/`CreativeLabBuildRequest.type` field, one of
/// the 14 values `TaskType`'s serde renames to) to its `TaskType` variant.
///
/// TASK-0017: Creative Lab is the one feature where a single panel spans 14
/// `TaskType` variants (7 products x 2 stages), so — unlike every other
/// create_* command, which hardcodes one `TaskType` — this command
/// discriminates on a body field, matching the existing `create_text_to_3d`
/// precedent (which already reads `body.mode` to choose between
/// `TextTo3dPreview`/`TextTo3dRefine`).
fn creative_lab_task_type(type_str: &str) -> Option<TaskType> {
    match type_str {
        "creative-lab-keychain-prototype" => Some(TaskType::CreativeLabKeychainPrototype),
        "creative-lab-keychain-build" => Some(TaskType::CreativeLabKeychainBuild),
        "creative-lab-fridge-magnet-prototype" => Some(TaskType::CreativeLabFridgeMagnetPrototype),
        "creative-lab-fridge-magnet-build" => Some(TaskType::CreativeLabFridgeMagnetBuild),
        "creative-lab-figure-prototype" => Some(TaskType::CreativeLabFigurePrototype),
        "creative-lab-figure-build" => Some(TaskType::CreativeLabFigureBuild),
        "creative-lab-vinyl-figure-prototype" => Some(TaskType::CreativeLabVinylFigurePrototype),
        "creative-lab-vinyl-figure-build" => Some(TaskType::CreativeLabVinylFigureBuild),
        "creative-lab-brick-figure-prototype" => Some(TaskType::CreativeLabBrickFigurePrototype),
        "creative-lab-brick-figure-build" => Some(TaskType::CreativeLabBrickFigureBuild),
        "creative-lab-lamp-prototype" => Some(TaskType::CreativeLabLampPrototype),
        "creative-lab-lamp-build" => Some(TaskType::CreativeLabLampBuild),
        "creative-lab-keycap-prototype" => Some(TaskType::CreativeLabKeycapPrototype),
        "creative-lab-keycap-build" => Some(TaskType::CreativeLabKeycapBuild),
        _ => None,
    }
}

/// Create a Creative Lab task (any of the 7 product types, prototype or
/// build stage). See `creative_lab_task_type` for why this one command
/// covers all 14 `TaskType` variants instead of 14 near-identical commands.
#[tauri::command]
pub async fn create_creative_lab(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let type_str = body
        .get("type")
        .and_then(|value| value.as_str())
        .ok_or_else(|| error_json("INVALID_INPUT", "Missing 'type' field."))?;
    let task_type = creative_lab_task_type(type_str)
        .ok_or_else(|| error_json("INVALID_INPUT", "Unknown Creative Lab product type."))?;
    create_task_inner(&state, &task_type, &body).await
}

// ─── Task Polling / Streaming ──────────────────────────────────

#[tauri::command]
pub async fn poll_task(
    state: tauri::State<'_, AppState>,
    task_type: String,
    task_id: String,
) -> Result<serde_json::Value, String> {
    poll_task_dispatch(&state, &task_type, &task_id).await
}

/// Fail-closed TaskType dispatch for `poll_task` (ADR-0015 TPC-05). Extracted
/// from the command so the rejection path is unit-testable with a plain
/// `&AppState` (the *_inner functions take an already-parsed `TaskType`).
pub(crate) async fn poll_task_dispatch(
    state: &AppState,
    task_type: &str,
    task_id: &str,
) -> Result<serde_json::Value, String> {
    let task_type = parse_task_type_wire(task_type)?;
    poll_task_inner(state, &task_type, task_id).await
}

#[tauri::command]
pub async fn stream_task(
    state: tauri::State<'_, AppState>,
    task_type: String,
    task_id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let app_handle = app.clone();
    let app_handle_complete = app.clone();
    stream_task_dispatch(
        &state,
        &task_type,
        &task_id,
        move |snapshot| {
            // TPC-02: `task-progress` carries the normalized TaskSnapshot
            // JSON (stream_task_inner applies the normalizer per chunk).
            let _ = app_handle.emit("task-progress", &snapshot);
        },
        move |task_id, status| {
            let _ = app_handle_complete.emit(
                "task-complete",
                &serde_json::json!({
                    "taskId": task_id,
                    "status": status,
                }),
            );
        },
    )
    .await
}

/// Fail-closed TaskType dispatch for `stream_task` (ADR-0015 TPC-05).
pub(crate) async fn stream_task_dispatch(
    state: &AppState,
    task_type: &str,
    task_id: &str,
    on_progress: impl Fn(serde_json::Value) + Send + 'static,
    on_complete: impl Fn(&str, &str) + Send + 'static,
) -> Result<(), String> {
    // Dispatch happens before the provider is consulted, so an unknown
    // taskType never reaches the network (IPC-04, VAL-01).
    let task_type = parse_task_type_wire(task_type)?;
    stream_task_inner(state, &task_type, task_id, on_progress, on_complete).await
}

/// Stream task events, calling `on_progress` with **normalized TaskSnapshot
/// JSON** (ADR-0015 TPC-02) for each event and `on_complete` when a terminal
/// status is reached. Extracted for testability.
///
/// The normalizer is applied per SSE chunk here, in the command layer (TPC-01:
/// the provider does the I/O, the command layer applies the pure `snapshot`).
/// A chunk that cannot be normalized is logged and skipped — never fatal, and
/// never emitted raw (IPC-06: raw chunks carry signed URLs).
///
/// Terminal detection reads `snapshot.status` in this single place.
/// `meshy::client::stream_task` keeps its own loop-exit check; that is
/// transport-level (it decides when the SSE read loop ends), not contract.
pub(crate) async fn stream_task_inner(
    state: &AppState,
    task_type: &TaskType,
    task_id: &str,
    on_progress: impl Fn(serde_json::Value) + Send + 'static,
    on_complete: impl Fn(&str, &str) + Send + 'static,
) -> Result<(), String> {
    // Validate task ID format first (doesn't need the provider)
    validate_task_id(task_id).map_err(|message| error_json("INVALID_INPUT", message))?;
    let provider = state
        .provider()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let endpoint = provider.endpoint_for(task_type);
    validate_task_reference(endpoint, task_id)
        .map_err(|message| error_json("INVALID_INPUT", message))?;
    let task_id_owned = task_id.to_string();
    let snapshot_provider = Arc::clone(&provider);
    let snapshot_task_type = *task_type;
    provider
        .stream_task(
            task_type,
            task_id,
            Box::new(move |raw| {
                let snapshot = match snapshot_provider.snapshot(&snapshot_task_type, &raw) {
                    Ok(snapshot) => snapshot,
                    Err(_) => {
                        // Names-only log: the raw chunk is never emitted or
                        // logged (IPC-06).
                        eprintln!("Skipping unnormalizable task-progress chunk.");
                        return;
                    }
                };
                let status = snapshot_status_wire(snapshot.status);
                match serialize_response(&snapshot) {
                    Ok(value) => on_progress(value),
                    Err(error) => eprintln!("Failed to serialize task snapshot: {error}"),
                }
                if matches!(
                    snapshot.status,
                    TaskSnapshotStatus::Succeeded
                        | TaskSnapshotStatus::Failed
                        | TaskSnapshotStatus::Canceled
                ) {
                    on_complete(&task_id_owned, status);
                }
            }),
        )
        .await
        .map_err(|e| error_json_from_provider_error(&e))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_task(
    state: tauri::State<'_, AppState>,
    task_type: String,
    task_id: String,
) -> Result<(), String> {
    delete_task_dispatch(&state, &task_type, &task_id).await
}

/// Fail-closed TaskType dispatch for `delete_task` (ADR-0015 TPC-05).
pub(crate) async fn delete_task_dispatch(
    state: &AppState,
    task_type: &str,
    task_id: &str,
) -> Result<(), String> {
    let task_type = parse_task_type_wire(task_type)?;
    delete_task_inner(state, &task_type, task_id).await
}

// ─── Asset Download ────────────────────────────────────────────

/// ADR-0015 step 3: `download_asset` takes the typed artifacts (TPC-03) plus
/// the transitional `thumbnail_url`/`texture_urls` (retire with
/// providerPayload in step 4). See `download_asset_inner` for the
/// download-all semantics (TASK-0031).
#[tauri::command]
pub async fn download_asset(
    state: tauri::State<'_, AppState>,
    task_id: String,
    artifacts: Vec<TaskArtifact>,
    thumbnail_url: Option<String>,
    texture_urls: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    download_asset_inner(
        &state,
        &task_id,
        &artifacts,
        thumbnail_url.as_deref(),
        texture_urls.as_ref(),
    )
    .await
}

// ─── Balance ──────────────────────────────────────────────────

#[tauri::command]
pub async fn get_credit_balance(state: tauri::State<'_, AppState>) -> Result<i64, String> {
    get_credit_balance_inner(&state).await
}

// ─── Animation Library ────────────────────────────────────────

#[tauri::command]
pub async fn fetch_animation_library(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    fetch_animation_library_inner(&state).await
}

#[tauri::command]
pub async fn cache_animation_preview(
    state: tauri::State<'_, AppState>,
    key: String,
    preview_url: String,
) -> Result<String, String> {
    cache_animation_preview_inner(&state, &key, &preview_url).await
}

#[cfg(test)]
mod tests {
    use super::*;

    // ─── error_json ──────────────────────────────────────────────

    #[test]
    fn error_json_produces_valid_json_with_code_and_message() {
        let result = error_json("MY_CODE", "something went wrong");
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "MY_CODE");
        assert_eq!(parsed["message"], "something went wrong");
    }

    // ─── error_json_from_provider_error ─────────────────────

    #[test]
    fn error_json_from_api_error_extracts_status_and_message() {
        let error = ProviderError::ApiError {
            status: reqwest::StatusCode::UNAUTHORIZED,
            body: r#"{"message":"Invalid API key"}"#.to_string(),
        };
        let result = error_json_from_provider_error(&error);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "API_ERROR_401");
        assert_eq!(parsed["message"], "Invalid API key");
    }

    #[test]
    fn error_json_from_api_error_falls_back_to_raw_body_when_no_message_field() {
        let error = ProviderError::ApiError {
            status: reqwest::StatusCode::INTERNAL_SERVER_ERROR,
            body: "raw error text".to_string(),
        };
        let result = error_json_from_provider_error(&error);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "API_ERROR_500");
        assert_eq!(parsed["message"], "raw error text");
    }

    #[test]
    fn error_json_from_network_error() {
        // Construct a network error by making a request to an invalid URL
        let runtime = tokio::runtime::Runtime::new().unwrap();
        let error = runtime
            .block_on(async {
                reqwest::get("http://0.0.0.0:0/nope")
                    .await
                    .map(|_| ())
                    .err()
            })
            .expect("should get a network error");
        let result = error_json_from_provider_error(&ProviderError::Network(error));
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "NETWORK_ERROR");
        assert_eq!(parsed["message"], "Network error.");
    }

    #[test]
    fn error_json_from_missing_api_key_error() {
        let error = ProviderError::MissingApiKey;
        let result = error_json_from_provider_error(&error);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "MISSING_API_KEY");
        assert_eq!(parsed["message"], "No API key.");
    }

    #[test]
    fn error_json_from_other_error_maps_to_internal() {
        let error = ProviderError::InvalidApiKey;
        let result = error_json_from_provider_error(&error);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "INTERNAL_ERROR");
        assert_eq!(parsed["message"], "Internal error.");
    }

    // ─── validate_creation ───────────────────────────────────────

    use crate::provider::meshy::{camel_to_snake, camel_to_snake_keys};

    #[test]
    fn camel_to_snake_converts_simple_camel_case() {
        assert_eq!(camel_to_snake("imageUrl"), "image_url");
        assert_eq!(camel_to_snake("aiModel"), "ai_model");
        assert_eq!(camel_to_snake("shouldTexture"), "should_texture");
        assert_eq!(camel_to_snake("inputTaskId"), "input_task_id");
        assert_eq!(camel_to_snake("targetPolycount"), "target_polycount");
    }

    #[test]
    fn camel_to_snake_preserves_already_snake_case() {
        assert_eq!(camel_to_snake("image_url"), "image_url");
        assert_eq!(camel_to_snake("prompt"), "prompt");
        assert_eq!(camel_to_snake("mode"), "mode");
    }

    #[test]
    fn camel_to_snake_keys_converts_nested_objects_and_arrays() {
        let input = serde_json::json!({
            "imageUrl": "data:image/jpeg;base64,abc",
            "aiModel": "meshy-7",
            "shouldTexture": true,
            "modelUrls": { "glb": "https://example.com/model.glb" },
            "textureUrls": [{ "baseColor": "https://example.com/tex.png" }]
        });
        let output = camel_to_snake_keys(&input);
        assert!(output.get("image_url").is_some());
        assert!(output.get("ai_model").is_some());
        assert!(output.get("should_texture").is_some());
        assert_eq!(output["image_url"], "data:image/jpeg;base64,abc");
        assert!(output["model_urls"].get("glb").is_some());
        assert!(output["texture_urls"][0].get("base_color").is_some());
        // Original camelCase keys must NOT be present
        assert!(output.get("imageUrl").is_none());
        assert!(output.get("aiModel").is_none());
    }

    #[test]
    fn camel_to_snake_keys_passes_through_scalars_and_arrays() {
        assert_eq!(camel_to_snake_keys(&serde_json::json!(42)), 42);
        assert_eq!(camel_to_snake_keys(&serde_json::json!("hello")), "hello");
        assert_eq!(
            camel_to_snake_keys(&serde_json::json!([1, 2, 3])),
            serde_json::json!([1, 2, 3])
        );
    }

    #[test]
    fn validate_creation_rejects_non_object_body() {
        let result = validate_creation("/v2/text-to-3d", &serde_json::json!("not an object"));
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[test]
    fn validate_creation_accepts_valid_text_to_3d() {
        let result = validate_creation(
            "/v2/text-to-3d",
            &serde_json::json!({"mode": "preview", "prompt": "a chair"}),
        );
        assert!(result.is_ok());
    }

    #[test]
    fn validate_creation_rejects_oversized_prompt() {
        let oversized = "a".repeat(601);
        let result = validate_creation(
            "/v2/text-to-3d",
            &serde_json::json!({"mode": "preview", "prompt": oversized}),
        );
        assert!(result.is_err());
    }

    #[test]
    fn validate_creation_rejects_unsupported_endpoint() {
        let result = validate_creation("/v1/unknown", &serde_json::json!({"prompt": "test"}));
        assert!(result.is_err());
    }

    // ─── serialize_response ──────────────────────────────────────

    #[test]
    fn serialize_response_succeeds_for_serializable_value() {
        let result = serialize_response(serde_json::json!({"result": "task-123"}));
        assert!(result.is_ok());
        assert_eq!(result.unwrap()["result"], "task-123");
    }

    #[test]
    fn serialize_response_fails_for_non_serializable() {
        // A type that implements Serialize but always fails
        struct AlwaysFails;
        impl serde::Serialize for AlwaysFails {
            fn serialize<S: serde::Serializer>(&self, _serializer: S) -> Result<S::Ok, S::Error> {
                Err(serde::ser::Error::custom("intentional failure"))
            }
        }
        let result = serialize_response(AlwaysFails);
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "SERIALIZATION_ERROR");
    }

    // ─── Inner function tests (testable without tauri::State) ───
    //
    // These test the extracted pure functions that take &AppState.
    // We construct a real AppState with tempfile + wiremock to exercise
    // the full create/poll/delete/download/balance pipeline.

    use crate::meshy::MeshyClient;
    use crate::provider::TaskProvider;
    use std::sync::Arc;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    const TASK_ID: &str = "01a039b2-b12c-7b56-b955-7fe20515aed0";

    fn make_test_state(server_uri: String) -> AppState {
        let dir = tempfile::tempdir().unwrap().keep();
        let state =
            AppState::new_with_keychain(dir, &crate::security::InMemoryKeychain::new()).unwrap();
        // Override the provider with a MeshyClient pointing at the mock server
        let client = MeshyClient::with_base_url("msy_test_key".to_string(), server_uri);
        *state.provider.lock().unwrap() = Some(Arc::new(client) as Arc<dyn TaskProvider>);
        state
    }

    fn make_no_key_state() -> AppState {
        let dir = tempfile::tempdir().unwrap().keep();
        // InMemoryKeychain starts empty, so this never observes a real key
        // that may be stored in the OS keychain on the machine running tests.
        AppState::new_with_keychain(dir, &crate::security::InMemoryKeychain::new()).unwrap()
    }

    fn artifact(
        role: crate::provider::types::ArtifactRole,
        format: &str,
        label: Option<&str>,
        url: &str,
    ) -> TaskArtifact {
        TaskArtifact {
            role,
            format: format.to_string(),
            label: label.map(str::to_string),
            url: url.to_string(),
        }
    }

    /// A downloaded asset row: `download_asset_inner` requires an existing
    /// asset (its `mark_downloaded` UPDATE targets the row saved by
    /// `save_completed_task`).
    fn insert_asset_row(state: &AppState) {
        let record = crate::meshy::models::AssetRecord {
            id: TASK_ID.to_string(),
            meshy_type: "text-to-3d".to_string(),
            parent_task_id: None,
            prompt: Some("test".to_string()),
            image_url: None,
            ai_model: None,
            status: "SUCCEEDED".to_string(),
            progress: 100,
            consumed_credits: 10,
            thumbnail_path: None,
            file_paths_json: "{}".to_string(),
            texture_paths_json: "[]".to_string(),
            notes: String::new(),
            tags_json: "[]".to_string(),
            created_at: 1000,
            started_at: 1010,
            finished_at: 1100,
            downloaded_at: 0,
            error_message: None,
            has_textures: false,
            has_rig: false,
            has_animation: false,
            favorite: false,
            last_viewed_at: 0,
        };
        state.database.insert_asset(&record).unwrap();
    }

    #[tokio::test]
    async fn create_task_inner_succeeds_with_valid_body() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/v2/text-to-3d"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "result": TASK_ID
            })))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        let body = serde_json::json!({"mode": "preview", "prompt": "a chair"});
        let result = create_task_inner(&state, &TaskType::TextTo3dPreview, &body).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap()["result"], TASK_ID);
    }

    #[tokio::test]
    async fn create_task_inner_converts_camel_case_to_snake_case_for_api() {
        use wiremock::matchers::body_json;

        let server = MockServer::start().await;
        // The mock should match snake_case keys — proving the conversion happened
        Mock::given(method("POST"))
            .and(path("/v1/image-to-3d"))
            .and(body_json(serde_json::json!({
                "image_url": "data:image/jpeg;base64,abc",
                "ai_model": "meshy-7",
                "should_texture": true
            })))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "result": TASK_ID
            })))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        // Frontend sends camelCase
        let body = serde_json::json!({
            "imageUrl": "data:image/jpeg;base64,abc",
            "aiModel": "meshy-7",
            "shouldTexture": true
        });
        let result = create_task_inner(&state, &TaskType::ImageTo3d, &body).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap()["result"], TASK_ID);
    }

    #[tokio::test]
    async fn create_task_inner_returns_missing_api_key_without_client() {
        let state = make_no_key_state();
        let body = serde_json::json!({"mode": "preview", "prompt": "chair"});
        let result = create_task_inner(&state, &TaskType::TextTo3dPreview, &body).await;

        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "MISSING_API_KEY");
    }

    #[tokio::test]
    async fn create_task_inner_rejects_invalid_body() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());
        // Missing required prompt field
        let body = serde_json::json!({"mode": "preview"});
        let result = create_task_inner(&state, &TaskType::TextTo3dPreview, &body).await;

        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    // ─── Creative Lab (TASK-0017) ──────────────────────────────────

    #[test]
    fn creative_lab_task_type_maps_all_14_wire_values() {
        let expected = [
            (
                "creative-lab-keychain-prototype",
                TaskType::CreativeLabKeychainPrototype,
            ),
            (
                "creative-lab-keychain-build",
                TaskType::CreativeLabKeychainBuild,
            ),
            (
                "creative-lab-fridge-magnet-prototype",
                TaskType::CreativeLabFridgeMagnetPrototype,
            ),
            (
                "creative-lab-fridge-magnet-build",
                TaskType::CreativeLabFridgeMagnetBuild,
            ),
            (
                "creative-lab-figure-prototype",
                TaskType::CreativeLabFigurePrototype,
            ),
            (
                "creative-lab-figure-build",
                TaskType::CreativeLabFigureBuild,
            ),
            (
                "creative-lab-vinyl-figure-prototype",
                TaskType::CreativeLabVinylFigurePrototype,
            ),
            (
                "creative-lab-vinyl-figure-build",
                TaskType::CreativeLabVinylFigureBuild,
            ),
            (
                "creative-lab-brick-figure-prototype",
                TaskType::CreativeLabBrickFigurePrototype,
            ),
            (
                "creative-lab-brick-figure-build",
                TaskType::CreativeLabBrickFigureBuild,
            ),
            (
                "creative-lab-lamp-prototype",
                TaskType::CreativeLabLampPrototype,
            ),
            ("creative-lab-lamp-build", TaskType::CreativeLabLampBuild),
            (
                "creative-lab-keycap-prototype",
                TaskType::CreativeLabKeycapPrototype,
            ),
            (
                "creative-lab-keycap-build",
                TaskType::CreativeLabKeycapBuild,
            ),
        ];
        for (wire, variant) in expected {
            assert_eq!(creative_lab_task_type(wire), Some(variant));
        }
        assert_eq!(creative_lab_task_type("not-a-real-type"), None);
        assert_eq!(creative_lab_task_type("text-to-3d-preview"), None);
    }

    #[tokio::test]
    async fn create_task_inner_creates_keychain_prototype_at_its_real_endpoint() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/creative-lab/keychain/v1/prototype"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "result": TASK_ID
            })))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        let body = serde_json::json!({
            "type": "creative-lab-keychain-prototype",
            "imageUrl": "data:image/jpeg;base64,abc"
        });
        let result =
            create_task_inner(&state, &TaskType::CreativeLabKeychainPrototype, &body).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap()["result"], TASK_ID);
    }

    #[tokio::test]
    async fn create_task_inner_rejects_keychain_prototype_without_image() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());
        let body = serde_json::json!({"type": "creative-lab-keychain-prototype"});
        let result =
            create_task_inner(&state, &TaskType::CreativeLabKeychainPrototype, &body).await;

        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[tokio::test]
    async fn create_task_inner_creates_keycap_build_with_input_task_id_and_candidate_id() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/creative-lab/keycap/v1/build"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "result": TASK_ID
            })))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        let body = serde_json::json!({
            "type": "creative-lab-keycap-build",
            "inputTaskId": TASK_ID,
            "candidateId": "candidate-1"
        });
        let result = create_task_inner(&state, &TaskType::CreativeLabKeycapBuild, &body).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn create_task_inner_rejects_keycap_build_missing_candidate_id() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());
        let body = serde_json::json!({
            "type": "creative-lab-keycap-build",
            "inputTaskId": TASK_ID
        });
        let result = create_task_inner(&state, &TaskType::CreativeLabKeycapBuild, &body).await;

        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[tokio::test]
    async fn poll_task_inner_returns_task_data() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path(format!("/v2/text-to-3d/{TASK_ID}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": TASK_ID,
                "status": "SUCCEEDED",
                "progress": 100
            })))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        let result = poll_task_inner(&state, &TaskType::TextTo3dPreview, TASK_ID).await;

        assert!(result.is_ok());
        // ADR-0015 TPC-02: the command returns the normalized TaskSnapshot,
        // camelCase, with the raw JSON only under the transitional
        // providerPayload.
        let task = result.unwrap();
        assert_eq!(task["id"], TASK_ID);
        assert_eq!(task["taskType"], "text-to-3d-preview");
        assert_eq!(task["status"], "SUCCEEDED");
        assert_eq!(task["progress"], 100);
        assert_eq!(task["providerPayload"]["status"], "SUCCEEDED");
        assert!(task.get("model_urls").is_none());
    }

    #[tokio::test]
    async fn poll_task_inner_persists_status_progress_and_credits() {
        // Regression for ADR-0015 step 2: update_task_status used to receive
        // the raw snake_case provider JSON. It now receives the camelCase
        // snapshot, so status/progress/credits/timestamps must still land in
        // SQLite (the TASK-0024 repair reads both vocabularies).
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path(format!("/v2/text-to-3d/{TASK_ID}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": TASK_ID,
                "status": "IN_PROGRESS",
                "progress": 55,
                "consumed_credits": 3,
                "created_at": 1700000000000i64,
                "started_at": 1700000005000i64,
                "finished_at": 0
            })))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        state
            .database
            .ensure_task_stub(TASK_ID, "text-to-3d-preview")
            .unwrap();

        let result = poll_task_inner(&state, &TaskType::TextTo3dPreview, TASK_ID).await;
        assert!(result.is_ok());

        let assets = state.database.get_all_assets().unwrap();
        let row = assets
            .iter()
            .find(|a| a.id == TASK_ID)
            .expect("task stub row exists");
        assert_eq!(row.status, "IN_PROGRESS");
        assert_eq!(row.progress, 55);
        assert_eq!(row.consumed_credits, 3);
        assert_eq!(row.started_at, 1700000005000);
        assert_eq!(row.finished_at, 0);
    }

    #[tokio::test]
    async fn poll_task_inner_maps_normalization_failure_to_snapshot_error() {
        // An unknown provider status is a normalization error (TPC-02). The
        // raw payload must not leak into the IPC error (IPC-06: signed URLs).
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path(format!("/v2/text-to-3d/{TASK_ID}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": TASK_ID,
                "status": "WORKING",
                "thumbnail_url": "https://assets.meshy.ai/secret/signed.png"
            })))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        let result = poll_task_inner(&state, &TaskType::TextTo3dPreview, TASK_ID).await;

        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "SNAPSHOT_ERROR");
        assert!(
            !result_string_contains_secret(&parsed["message"]),
            "snapshot error must not leak the raw payload"
        );
    }

    fn result_string_contains_secret(value: &serde_json::Value) -> bool {
        value.as_str().is_some_and(|s| s.contains("signed.png"))
    }

    #[tokio::test]
    async fn poll_task_inner_rejects_invalid_task_id() {
        let state = make_no_key_state();
        let result = poll_task_inner(&state, &TaskType::TextTo3dPreview, "not-a-uuid").await;
        assert!(result.is_err());
    }

    // ─── TPC-05: unknown taskType rejected before any network call ───
    //
    // The previous `poll_task_inner_rejects_untrusted_endpoint` test is gone
    // with `endpoint_to_task_type`: every dispatchable TaskType maps to an
    // ENDPOINT_MAP path, so the endpoint-allowlist rejection it exercised
    // (via the silent TextTo3dPreview fallback) no longer exists. The
    // fail-closed dispatch is covered by `parse_task_type_wire` and the
    // three *_dispatch tests below.

    #[test]
    fn parse_task_type_wire_accepts_every_serde_rename() {
        let wire_values = [
            "text-to-3d-preview",
            "text-to-3d-refine",
            "image-to-3d",
            "multi-image-to-3d",
            "retexture",
            "remesh",
            "convert",
            "resize",
            "uv-unwrap",
            "rig",
            "animate",
            "text-to-motion",
            "text-to-image",
            "image-to-image",
            "print-multi-color",
            "print-analyze",
            "print-repair",
            "creative-lab-keychain-prototype",
            "creative-lab-keychain-build",
            "creative-lab-fridge-magnet-prototype",
            "creative-lab-fridge-magnet-build",
            "creative-lab-figure-prototype",
            "creative-lab-figure-build",
            "creative-lab-vinyl-figure-prototype",
            "creative-lab-vinyl-figure-build",
            "creative-lab-brick-figure-prototype",
            "creative-lab-brick-figure-build",
            "creative-lab-lamp-prototype",
            "creative-lab-lamp-build",
            "creative-lab-keycap-prototype",
            "creative-lab-keycap-build",
        ];
        assert_eq!(wire_values.len(), 31);
        for wire in wire_values {
            assert!(
                parse_task_type_wire(wire).is_ok(),
                "wire value {wire} must parse"
            );
        }
    }

    #[test]
    fn parse_task_type_wire_rejects_unknown_and_endpoint_shaped_values() {
        for bad in [
            "not-a-task-type",
            "",
            "/v2/text-to-3d",
            "text_to_3d_preview",
            "TextTo3dPreview",
        ] {
            let result = parse_task_type_wire(bad);
            assert!(result.is_err(), "{bad:?} must be rejected");
            let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
            assert_eq!(parsed["code"], "INVALID_INPUT");
        }
    }

    #[tokio::test]
    async fn poll_task_dispatch_rejects_unknown_task_type_before_network() {
        let server = MockServer::start().await;
        // No route mock is mounted: any provider call would be recorded.
        let state = make_test_state(server.uri());

        let result = poll_task_dispatch(&state, "definitely-not-a-type", TASK_ID).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
        assert!(
            server.received_requests().await.unwrap().is_empty(),
            "no provider call may happen for an unknown taskType"
        );
    }

    #[tokio::test]
    async fn delete_task_dispatch_rejects_unknown_task_type_before_network() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());

        let result = delete_task_dispatch(&state, "definitely-not-a-type", TASK_ID).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
        assert!(server.received_requests().await.unwrap().is_empty());
    }

    #[tokio::test]
    async fn stream_task_dispatch_rejects_unknown_task_type_before_network() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());

        let result =
            stream_task_dispatch(&state, "definitely-not-a-type", TASK_ID, |_| {}, |_, _| {}).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
        assert!(server.received_requests().await.unwrap().is_empty());
    }

    #[tokio::test]
    async fn delete_task_inner_succeeds() {
        let server = MockServer::start().await;
        Mock::given(method("DELETE"))
            .and(path(format!("/v2/text-to-3d/{TASK_ID}")))
            .respond_with(ResponseTemplate::new(200))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        let result = delete_task_inner(&state, &TaskType::TextTo3dPreview, TASK_ID).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn delete_task_inner_returns_missing_api_key_without_client() {
        let state = make_no_key_state();
        let result = delete_task_inner(&state, &TaskType::TextTo3dPreview, TASK_ID).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "MISSING_API_KEY");
    }

    #[tokio::test]
    async fn get_credit_balance_inner_returns_balance() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v1/balance"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "balance": 750
            })))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        let result = get_credit_balance_inner(&state).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 750);
    }

    #[tokio::test]
    async fn get_credit_balance_inner_returns_missing_api_key() {
        let state = make_no_key_state();
        let result = get_credit_balance_inner(&state).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "MISSING_API_KEY");
    }

    #[tokio::test]
    async fn download_asset_inner_returns_missing_api_key_without_client() {
        let state = make_no_key_state();
        let result = download_asset_inner(&state, TASK_ID, &[], None, None).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "MISSING_API_KEY");
    }

    #[tokio::test]
    async fn download_asset_inner_rejects_invalid_task_id() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());
        let result = download_asset_inner(&state, "not-a-uuid", &[], None, None).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[tokio::test]
    async fn download_asset_inner_rejects_non_meshy_download_url() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());
        insert_asset_row(&state);

        // Non-meshy URL should be rejected
        let artifacts = vec![artifact(
            crate::provider::types::ArtifactRole::Primary,
            "glb",
            None,
            "https://attacker.com/model.glb",
        )];
        let result = download_asset_inner(&state, TASK_ID, &artifacts, None, None).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[tokio::test]
    async fn download_asset_inner_rejects_untrusted_thumbnail_url() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());
        let result = download_asset_inner(
            &state,
            TASK_ID,
            &[],
            Some("https://attacker.invalid/thumbnail.png"),
            None,
        )
        .await;

        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[tokio::test]
    async fn download_asset_inner_rejects_untrusted_texture_url() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());
        let texture_urls = serde_json::json!([{
            "base_color": "https://attacker.invalid/base-color.png"
        }]);
        let result = download_asset_inner(&state, TASK_ID, &[], None, Some(&texture_urls)).await;

        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[tokio::test]
    async fn download_asset_inner_creates_asset_directory() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());
        insert_asset_row(&state);

        // Empty artifacts (no files to download) — exercises the
        // directory creation and mark_downloaded path
        let result = download_asset_inner(&state, TASK_ID, &[], None, None).await;

        assert!(result.is_ok(), "download failed: {:?}", result.err());
        let response = result.unwrap();
        // No model files → empty file_paths object
        assert!(response["file_paths"].as_object().unwrap().is_empty());
        assert!(response["thumbnail_path"].is_null());

        // Verify the asset directory was created
        let asset_dir = state.asset_dir(TASK_ID);
        assert!(asset_dir.exists());
    }

    #[tokio::test]
    async fn fetch_animation_library_inner_returns_data() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v1/animations/library"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([
                {"action_id": 92, "key": "Double_Combo_Attack", "name": "Double Combo Attack",
                 "category": "Fighting", "sub_category": "AttackingwithWeapon",
                 "preview_url": "https://cdn.meshy.ai/x.gif"}
            ])))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        let result = fetch_animation_library_inner(&state).await;

        assert!(result.is_ok());
        let value = result.unwrap();
        assert!(value.is_array(), "expected a bare array, got {value:?}");
        // Normalised to the camelCase IPC contract — the frontend must never
        // receive provider-shaped snake_case keys.
        assert_eq!(value[0]["id"], 92);
        assert_eq!(value[0]["key"], "Double_Combo_Attack");
        assert_eq!(value[0]["subCategory"], "AttackingwithWeapon");
        assert_eq!(value[0]["previewUrl"], "https://cdn.meshy.ai/x.gif");
        assert!(value[0].get("action_id").is_none());
        assert!(value[0].get("sub_category").is_none());
    }

    #[tokio::test]
    async fn fetch_animation_library_inner_synthesizes_key_when_absent() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v1/animations/library"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "animations": [{"id": 1, "name": "walk", "category": "WalkAndRun"}]
            })))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        let value = fetch_animation_library_inner(&state).await.unwrap();

        // A catalogue entry without a slug still gets a stable cache identity.
        assert_eq!(value[0]["key"], "action_1");
    }

    #[tokio::test]
    async fn cache_animation_preview_inner_rejects_non_preview_host() {
        let state = make_test_state("http://localhost".to_string());
        // assets.meshy.ai is the DOWNLOAD host, not the preview host — ADR-0011
        // SEC-10 keeps the two allowlists separate in both directions.
        let result =
            cache_animation_preview_inner(&state, "Walk", "https://assets.meshy.ai/evil.gif").await;

        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[tokio::test]
    async fn cache_animation_preview_inner_rejects_traversal_key() {
        let state = make_test_state("http://localhost".to_string());
        let result =
            cache_animation_preview_inner(&state, "../../escape", "https://cdn.meshy.ai/x.gif")
                .await;

        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[tokio::test]
    async fn fetch_animation_library_inner_requires_api_key() {
        let no_key_state = make_no_key_state();
        let result = fetch_animation_library_inner(&no_key_state).await;

        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "MISSING_API_KEY");
    }

    // ─── stream_task_inner tests ────────────────────────────────

    #[tokio::test]
    async fn stream_task_inner_streams_events_and_calls_on_complete() {
        let server = MockServer::start().await;
        // ADR-0015 TPC-02: chunks now flow through provider.snapshot() before
        // on_progress, so SSE fixtures must be normalizable task objects
        // (a valid `id` and a closed-set `status`).
        let sse_body = "data:{\"id\":\"01a039b2-b12c-7b56-b955-7fe20515aed0\",\"status\":\"PENDING\",\"progress\":10}\n\ndata:{\"id\":\"01a039b2-b12c-7b56-b955-7fe20515aed0\",\"status\":\"SUCCEEDED\",\"progress\":100}\n\n";
        Mock::given(method("GET"))
            .and(path(format!("/v2/text-to-3d/{TASK_ID}/stream")))
            .respond_with(
                ResponseTemplate::new(200)
                    .insert_header("content-type", "text/event-stream")
                    .set_body_string(sse_body),
            )
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        let progress_events = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
        let complete_called = std::sync::Arc::new(std::sync::Mutex::new(false));
        let complete_task_id = std::sync::Arc::new(std::sync::Mutex::new(String::new()));
        let complete_status = std::sync::Arc::new(std::sync::Mutex::new(String::new()));

        let pe = progress_events.clone();
        let cc = complete_called.clone();
        let cti = complete_task_id.clone();
        let cs = complete_status.clone();

        let result = stream_task_inner(
            &state,
            &TaskType::TextTo3dPreview,
            TASK_ID,
            move |data| {
                pe.lock().unwrap().push(data);
            },
            move |task_id, status| {
                *cc.lock().unwrap() = true;
                *cti.lock().unwrap() = task_id.to_string();
                *cs.lock().unwrap() = status.to_string();
            },
        )
        .await;

        assert!(result.is_ok());
        let events = progress_events.lock().unwrap();
        assert_eq!(events.len(), 2);
        // TPC-02: each emitted event is snapshot JSON (camelCase, closed
        // status set), not the raw chunk.
        assert_eq!(events[0]["taskType"], "text-to-3d-preview");
        assert_eq!(events[0]["status"], "PENDING");
        assert_eq!(events[0]["progress"], 10);
        assert_eq!(events[1]["status"], "SUCCEEDED");
        assert!(events[1].get("providerPayload").is_some());
        drop(events);
        assert!(*complete_called.lock().unwrap());
        assert_eq!(*complete_task_id.lock().unwrap(), TASK_ID);
        assert_eq!(*complete_status.lock().unwrap(), "SUCCEEDED");
    }

    #[tokio::test]
    async fn stream_task_inner_skips_unnormalizable_chunks_without_failing() {
        // A chunk with an unknown status is a normalization error (TPC-02):
        // it must be skipped (never emitted raw — IPC-06), and the stream
        // must continue to the next normalizable chunk rather than aborting.
        let server = MockServer::start().await;
        let sse_body = "data:{\"id\":\"01a039b2-b12c-7b56-b955-7fe20515aed0\",\"status\":\"WORKING\"}\n\ndata:{\"id\":\"01a039b2-b12c-7b56-b955-7fe20515aed0\",\"status\":\"FAILED\",\"progress\":40}\n\n";
        Mock::given(method("GET"))
            .and(path(format!("/v2/text-to-3d/{TASK_ID}/stream")))
            .respond_with(
                ResponseTemplate::new(200)
                    .insert_header("content-type", "text/event-stream")
                    .set_body_string(sse_body),
            )
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        let progress_events = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
        let complete_status = std::sync::Arc::new(std::sync::Mutex::new(String::new()));

        let pe = progress_events.clone();
        let cs = complete_status.clone();

        let result = stream_task_inner(
            &state,
            &TaskType::TextTo3dPreview,
            TASK_ID,
            move |data| {
                pe.lock().unwrap().push(data);
            },
            move |_task_id, status| {
                *cs.lock().unwrap() = status.to_string();
            },
        )
        .await;

        assert!(result.is_ok());
        let events = progress_events.lock().unwrap();
        // Only the FAILED chunk was emitted; the WORKING chunk was skipped.
        assert_eq!(events.len(), 1);
        assert_eq!(events[0]["status"], "FAILED");
        drop(events);
        assert_eq!(*complete_status.lock().unwrap(), "FAILED");
    }

    #[tokio::test]
    async fn stream_task_inner_returns_missing_api_key_without_client() {
        let state = make_no_key_state();
        let result = stream_task_inner(
            &state,
            &TaskType::TextTo3dPreview,
            TASK_ID,
            |_| {},
            |_, _| {},
        )
        .await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "MISSING_API_KEY");
    }

    #[tokio::test]
    async fn stream_task_inner_rejects_invalid_task_id() {
        let state = make_no_key_state();
        let result = stream_task_inner(
            &state,
            &TaskType::TextTo3dPreview,
            "not-a-uuid",
            |_| {},
            |_, _| {},
        )
        .await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    // ─── download_asset_inner with valid artifact URLs ────────────
    //
    // MeshyClient::download_file uses its own HTTP client (not the base_url
    // one) and `validate_download_url` pins https + assets.meshy.ai, so the
    // real client cannot be pointed at a wiremock server. These tests inject
    // a `TaskProvider` double that keeps the same download allowlist but
    // rewrites the URL origin onto the wiremock server — the download then
    // exercises the real reqwest path against mocked bytes.

    use std::sync::Mutex as StdMutex;

    struct DownloadTestProvider {
        mock_base: String,
        downloads: StdMutex<Vec<String>>,
    }

    impl DownloadTestProvider {
        fn new(mock_base: String) -> Self {
            Self {
                mock_base,
                downloads: StdMutex::new(Vec::new()),
            }
        }
    }

    #[async_trait::async_trait]
    impl TaskProvider for DownloadTestProvider {
        async fn create_task(
            &self,
            _task_type: &TaskType,
            _body: serde_json::Value,
        ) -> Result<crate::provider::types::TaskCreateResponse, ProviderError> {
            Err(ProviderError::MissingApiKey)
        }
        async fn get_task(
            &self,
            _task_type: &TaskType,
            _task_id: &str,
        ) -> Result<serde_json::Value, ProviderError> {
            Err(ProviderError::MissingApiKey)
        }
        async fn cancel_task(
            &self,
            _task_type: &TaskType,
            _task_id: &str,
        ) -> Result<(), ProviderError> {
            Err(ProviderError::MissingApiKey)
        }
        async fn get_balance(&self) -> Result<i64, ProviderError> {
            Err(ProviderError::MissingApiKey)
        }
        async fn download_file(
            &self,
            url: &str,
            dest: &std::path::Path,
        ) -> Result<u64, ProviderError> {
            self.downloads.lock().unwrap().push(url.to_string());
            // Rewrite the validated https://assets.meshy.ai origin onto the
            // wiremock server, preserving the path.
            // The URL already passed validate_download_url (https + host),
            // so parsing cannot fail here.
            let parsed = reqwest::Url::parse(url).expect("validated URL parses");
            let fetch_url = format!("{}{}", self.mock_base, parsed.path());
            let response = reqwest::Client::new()
                .get(&fetch_url)
                .send()
                .await
                .map_err(ProviderError::Network)?;
            if !response.status().is_success() {
                return Err(ProviderError::DownloadFailed(response.status()));
            }
            let bytes = response.bytes().await.map_err(ProviderError::Network)?;
            std::fs::write(dest, &bytes).map_err(ProviderError::Filesystem)?;
            Ok(bytes.len() as u64)
        }
        async fn stream_task(
            &self,
            _task_type: &TaskType,
            _task_id: &str,
            _on_event: Box<dyn Fn(serde_json::Value) + Send>,
        ) -> Result<(), ProviderError> {
            Err(ProviderError::MissingApiKey)
        }
        async fn fetch_animation_library(&self) -> Result<serde_json::Value, ProviderError> {
            Err(ProviderError::MissingApiKey)
        }
        fn allowed_download_hosts(&self) -> &[&str] {
            // Same allowlist as the real provider, so URL validation is
            // exercised unchanged.
            &["assets.meshy.ai"]
        }
        fn allowed_preview_hosts(&self) -> &[&str] {
            &["cdn.meshy.ai"]
        }
        fn endpoint_for(&self, _task_type: &TaskType) -> &str {
            ""
        }
        fn snapshot(
            &self,
            _task_type: &TaskType,
            _raw: &serde_json::Value,
        ) -> Result<crate::provider::types::TaskSnapshot, ProviderError> {
            Err(ProviderError::MissingApiKey)
        }
    }

    fn make_download_test_state(server_uri: String) -> (AppState, Arc<DownloadTestProvider>) {
        let dir = tempfile::tempdir().unwrap().keep();
        let state =
            AppState::new_with_keychain(dir, &crate::security::InMemoryKeychain::new()).unwrap();
        let provider = Arc::new(DownloadTestProvider::new(server_uri));
        *state.provider.lock().unwrap() = Some(provider.clone() as Arc<dyn TaskProvider>);
        (state, provider)
    }

    /// ADR-0015 step 3 / TASK-0031 evidence gate (Rust side): a fixture
    /// snapshot carrying primary + armature + fpsVariant + presetClip
    /// artifacts downloads ALL of them — no artifact is silently skipped —
    /// and file_paths is keyed by the TPC-04 mapping.
    #[tokio::test]
    async fn task_0031_download_asset_inner_downloads_every_artifact() {
        use crate::provider::types::ArtifactRole;
        let server = MockServer::start().await;
        for mock_path in [
            "/model.glb",
            "/model.fbx",
            "/armature.fbx",
            "/fps.fbx",
            "/walking.glb",
            "/running.fbx",
            "/variant.usdz",
            "/pre.glb",
        ] {
            Mock::given(method("GET"))
                .and(path(mock_path))
                .respond_with(
                    ResponseTemplate::new(200).set_body_bytes(format!("bytes{mock_path}")),
                )
                .mount(&server)
                .await;
        }
        let (state, provider) = make_download_test_state(server.uri());
        insert_asset_row(&state);

        let artifacts = vec![
            artifact(
                ArtifactRole::Primary,
                "glb",
                None,
                "https://assets.meshy.ai/model.glb",
            ),
            artifact(
                ArtifactRole::Primary,
                "fbx",
                None,
                "https://assets.meshy.ai/model.fbx",
            ),
            artifact(
                ArtifactRole::Armature,
                "fbx",
                None,
                "https://assets.meshy.ai/armature.fbx",
            ),
            artifact(
                ArtifactRole::FpsVariant,
                "fbx",
                None,
                "https://assets.meshy.ai/fps.fbx",
            ),
            artifact(
                ArtifactRole::PresetClip,
                "glb",
                Some("walking"),
                "https://assets.meshy.ai/walking.glb",
            ),
            artifact(
                ArtifactRole::PresetClip,
                "fbx",
                Some("running"),
                "https://assets.meshy.ai/running.fbx",
            ),
            artifact(
                ArtifactRole::FormatVariant,
                "usdz",
                None,
                "https://assets.meshy.ai/variant.usdz",
            ),
            artifact(
                ArtifactRole::PreRemeshed,
                "glb",
                None,
                "https://assets.meshy.ai/pre.glb",
            ),
        ];
        let result = download_asset_inner(&state, TASK_ID, &artifacts, None, None).await;
        assert!(result.is_ok(), "download failed: {:?}", result.err());

        // Every artifact hit the network exactly once.
        let downloads = provider.downloads.lock().unwrap();
        assert_eq!(downloads.len(), artifacts.len());

        let response = result.unwrap();
        let file_paths = response["file_paths"].as_object().unwrap();
        // TASK-0031: one entry per artifact — nothing dropped.
        assert_eq!(file_paths.len(), artifacts.len());
        // TPC-04 keys: primary keeps bare format keys; roles are role-tagged.
        for (key, filename) in [
            ("glb", "model.glb"),
            ("fbx", "model.fbx"),
            ("armature.fbx", "armature.fbx"),
            ("fpsVariant.fbx", "fps_variant.fbx"),
            ("presetClip-walking.glb", "preset_clip-walking.glb"),
            ("presetClip-running.fbx", "preset_clip-running.fbx"),
            ("formatVariant.usdz", "format_variant.usdz"),
            ("preRemeshed.glb", "pre_remeshed.glb"),
        ] {
            let stored = file_paths[key]
                .as_str()
                .unwrap_or_else(|| panic!("missing file_paths key {key}"));
            assert!(
                stored.ends_with(filename),
                "key {key} stored {stored}, expected to end with {filename}"
            );
            // The file actually landed on disk.
            assert!(std::path::Path::new(stored).exists(), "missing {stored}");
        }

        // mark_downloaded persisted the same role-keyed map.
        let assets = state.database.get_all_assets().unwrap();
        let db_paths: serde_json::Value = serde_json::from_str(&assets[0].file_paths).unwrap();
        assert_eq!(
            db_paths["presetClip-walking.glb"],
            file_paths["presetClip-walking.glb"]
        );
    }

    #[tokio::test]
    async fn download_asset_inner_rejects_unknown_format_without_partial_download() {
        use crate::provider::types::ArtifactRole;
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/model.glb"))
            .respond_with(ResponseTemplate::new(200).set_body_bytes("ok"))
            .mount(&server)
            .await;
        let (state, provider) = make_download_test_state(server.uri());
        insert_asset_row(&state);

        // A valid artifact followed by an unmappable (role, format) pair:
        // validation is fail-closed BEFORE any download (TASK-0031: an
        // unsupported mapping is an error, not a skip).
        let artifacts = vec![
            artifact(
                ArtifactRole::Primary,
                "glb",
                None,
                "https://assets.meshy.ai/model.glb",
            ),
            artifact(
                ArtifactRole::Primary,
                "exe",
                None,
                "https://assets.meshy.ai/model.exe",
            ),
        ];
        let result = download_asset_inner(&state, TASK_ID, &artifacts, None, None).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
        assert!(provider.downloads.lock().unwrap().is_empty());
        assert!(!state.asset_dir(TASK_ID).join("model.glb").exists());
    }

    #[tokio::test]
    async fn download_asset_inner_rejects_path_separators_in_labels() {
        use crate::provider::types::ArtifactRole;
        let server = MockServer::start().await;
        let (state, _provider) = make_download_test_state(server.uri());
        insert_asset_row(&state);

        let artifacts = vec![artifact(
            ArtifactRole::PresetClip,
            "glb",
            Some("../escape"),
            "https://assets.meshy.ai/walking.glb",
        )];
        let result = download_asset_inner(&state, TASK_ID, &artifacts, None, None).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[tokio::test]
    async fn download_asset_inner_rejects_duplicate_storage_keys() {
        use crate::provider::types::ArtifactRole;
        let server = MockServer::start().await;
        let (state, _provider) = make_download_test_state(server.uri());
        insert_asset_row(&state);

        // Two artifacts mapping to the same key would silently overwrite one
        // another's file — rejected (TASK-0031: no artifact may be lost).
        let artifacts = vec![
            artifact(
                ArtifactRole::PresetClip,
                "glb",
                Some("walking"),
                "https://assets.meshy.ai/a.glb",
            ),
            artifact(
                ArtifactRole::PresetClip,
                "glb",
                Some("walking"),
                "https://assets.meshy.ai/b.glb",
            ),
        ];
        let result = download_asset_inner(&state, TASK_ID, &artifacts, None, None).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[tokio::test]
    async fn download_asset_inner_rejects_empty_artifact_url() {
        use crate::provider::types::ArtifactRole;
        let server = MockServer::start().await;
        let (state, _provider) = make_download_test_state(server.uri());
        insert_asset_row(&state);

        // The legacy format map silently skipped empty URL strings — an
        // artifact with an empty URL is now a validation failure, not a skip.
        let artifacts = vec![artifact(ArtifactRole::Primary, "glb", None, "")];
        let result = download_asset_inner(&state, TASK_ID, &artifacts, None, None).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[tokio::test]
    async fn download_asset_inner_rejects_unsupported_texture_map_type() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());
        insert_asset_row(&state);

        // "unknown_map" is not a supported texture map type
        let textures = serde_json::json!([{"unknown_map": "https://assets.meshy.ai/tex.png"}]);
        let result = download_asset_inner(&state, TASK_ID, &[], None, Some(&textures)).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
        assert!(parsed["message"]
            .as_str()
            .unwrap()
            .contains("Unsupported texture map type"));
    }

    // ─── camelCase-to-snake_case regression tests ─────────────────
    //
    // These tests protect against the bug where the frontend sends
    // camelCase keys (matching the TypeScript interfaces) but the
    // Meshy API expects snake_case. The conversion happens in
    // create_task_inner via camel_to_snake_keys(). Each test sends
    // camelCase and asserts the mock server receives snake_case.

    use wiremock::matchers::body_json;

    // Helper: assert an endpoint receives snake_case keys when the
    // frontend sends the equivalent camelCase keys.
    async fn assert_endpoint_receives_snake_case(
        task_type: TaskType,
        command_path: &str,
        camel_body: serde_json::Value,
        snake_body: serde_json::Value,
    ) {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path(command_path))
            .and(body_json(snake_body))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "result": TASK_ID
            })))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        let result = create_task_inner(&state, &task_type, &camel_body).await;
        assert!(
            result.is_ok(),
            "create_task_inner failed for task type {task_type:?}"
        );
        assert_eq!(result.unwrap()["result"], TASK_ID);
    }

    #[tokio::test]
    async fn text_to_3d_preview_sends_snake_case_keys() {
        assert_endpoint_receives_snake_case(
            TaskType::TextTo3dPreview,
            "/v2/text-to-3d",
            serde_json::json!({
                "mode": "preview",
                "prompt": "a dragon",
                "aiModel": "meshy-7",
                "shouldRemesh": true,
                "targetPolycount": 50000,
                "topology": "quad"
            }),
            serde_json::json!({
                "mode": "preview",
                "prompt": "a dragon",
                "ai_model": "meshy-7",
                "should_remesh": true,
                "target_polycount": 50000,
                "topology": "quad"
            }),
        )
        .await;
    }

    #[tokio::test]
    async fn text_to_3d_refine_sends_snake_case_keys() {
        assert_endpoint_receives_snake_case(
            TaskType::TextTo3dRefine,
            "/v2/text-to-3d",
            serde_json::json!({
                "mode": "refine",
                "previewTaskId": TASK_ID,
                "texturePrompt": "red scales",
                "enablePbr": true,
                "textureResolution": "4k"
            }),
            serde_json::json!({
                "mode": "refine",
                "preview_task_id": TASK_ID,
                "texture_prompt": "red scales",
                "enable_pbr": true,
                "texture_resolution": "4k"
            }),
        )
        .await;
    }

    #[tokio::test]
    async fn image_to_3d_sends_snake_case_keys_with_data_uri() {
        assert_endpoint_receives_snake_case(
            TaskType::ImageTo3d,
            "/v1/image-to-3d",
            serde_json::json!({
                "imageUrl": "data:image/jpeg;base64,/9j/4AAQ",
                "aiModel": "meshy-7",
                "shouldTexture": true,
                "enablePbr": false,
                "textureResolution": "2k",
                "imageEnhancement": true,
                "removeLighting": false
            }),
            serde_json::json!({
                "image_url": "data:image/jpeg;base64,/9j/4AAQ",
                "ai_model": "meshy-7",
                "should_texture": true,
                "enable_pbr": false,
                "texture_resolution": "2k",
                "image_enhancement": true,
                "remove_lighting": false
            }),
        )
        .await;
    }

    #[tokio::test]
    async fn image_to_3d_sends_snake_case_keys_with_input_task_id() {
        assert_endpoint_receives_snake_case(
            TaskType::ImageTo3d,
            "/v1/image-to-3d",
            serde_json::json!({
                "inputTaskId": TASK_ID,
                "aiModel": "latest"
            }),
            serde_json::json!({
                "input_task_id": TASK_ID,
                "ai_model": "latest"
            }),
        )
        .await;
    }

    #[tokio::test]
    async fn multi_image_to_3d_sends_snake_case_keys_with_array() {
        assert_endpoint_receives_snake_case(
            TaskType::MultiImageTo3d,
            "/v1/multi-image-to-3d",
            serde_json::json!({
                "imageUrls": [
                    "data:image/png;base64,abc",
                    "data:image/png;base64,def"
                ],
                "aiModel": "meshy-7",
                "shouldTexture": true,
                "multiViewThumbnails": true
            }),
            serde_json::json!({
                "image_urls": [
                    "data:image/png;base64,abc",
                    "data:image/png;base64,def"
                ],
                "ai_model": "meshy-7",
                "should_texture": true,
                "multi_view_thumbnails": true
            }),
        )
        .await;
    }

    #[tokio::test]
    async fn remesh_sends_snake_case_keys() {
        assert_endpoint_receives_snake_case(
            TaskType::Remesh,
            "/v1/remesh",
            serde_json::json!({
                "inputTaskId": TASK_ID,
                "targetPolycount": 10000,
                "topology": "quad"
            }),
            serde_json::json!({
                "input_task_id": TASK_ID,
                "target_polycount": 10000,
                "topology": "quad"
            }),
        )
        .await;
    }

    #[tokio::test]
    async fn convert_sends_snake_case_keys_with_array_field() {
        assert_endpoint_receives_snake_case(
            TaskType::Convert,
            "/v1/convert",
            serde_json::json!({
                "inputTaskId": TASK_ID,
                "targetFormats": ["glb", "fbx", "usdz"]
            }),
            serde_json::json!({
                "input_task_id": TASK_ID,
                "target_formats": ["glb", "fbx", "usdz"]
            }),
        )
        .await;
    }

    #[tokio::test]
    async fn resize_sends_snake_case_keys() {
        assert_endpoint_receives_snake_case(
            TaskType::Resize,
            "/v1/resize",
            serde_json::json!({
                "inputTaskId": TASK_ID,
                "targetPolycount": 5000
            }),
            serde_json::json!({
                "input_task_id": TASK_ID,
                "target_polycount": 5000
            }),
        )
        .await;
    }

    #[tokio::test]
    async fn retexture_sends_snake_case_keys() {
        assert_endpoint_receives_snake_case(
            TaskType::Retexture,
            "/v1/retexture",
            serde_json::json!({
                "inputTaskId": TASK_ID,
                "texturePrompt": "leather surface",
                "enablePbr": true,
                "textureResolution": "8k"
            }),
            serde_json::json!({
                "input_task_id": TASK_ID,
                "texture_prompt": "leather surface",
                "enable_pbr": true,
                "texture_resolution": "8k"
            }),
        )
        .await;
    }

    #[tokio::test]
    async fn rigging_sends_snake_case_keys_with_optional_fields() {
        assert_endpoint_receives_snake_case(
            TaskType::Rig,
            "/v1/rigging",
            serde_json::json!({
                "inputTaskId": TASK_ID,
                "heightMeters": 1.75
            }),
            serde_json::json!({
                "input_task_id": TASK_ID,
                "height_meters": 1.75
            }),
        )
        .await;
    }

    #[tokio::test]
    async fn animation_sends_snake_case_keys() {
        assert_endpoint_receives_snake_case(
            TaskType::Animate,
            "/v1/animations",
            serde_json::json!({
                "rigTaskId": TASK_ID,
                "actionId": 5
            }),
            serde_json::json!({
                "rig_task_id": TASK_ID,
                "action_id": 5
            }),
        )
        .await;
    }

    #[tokio::test]
    async fn text_to_motion_sends_snake_case_keys() {
        assert_endpoint_receives_snake_case(
            TaskType::TextToMotion,
            "/v1/text-to-motion",
            serde_json::json!({"prompt": "a slow kata", "mode": "prime", "duration": 2.5}),
            serde_json::json!({"prompt": "a slow kata", "mode": "prime", "duration": 2.5}),
        )
        .await;
    }

    #[tokio::test]
    async fn animation_retarget_sends_snake_case_keys() {
        assert_endpoint_receives_snake_case(
            TaskType::Animate,
            "/v1/animations",
            serde_json::json!({"rigTaskId": TASK_ID, "motionTaskId": TASK_ID}),
            serde_json::json!({"rig_task_id": TASK_ID, "motion_task_id": TASK_ID}),
        )
        .await;
    }

    #[tokio::test]
    async fn animation_merge_sends_snake_case_keys() {
        assert_endpoint_receives_snake_case(
            TaskType::Animate,
            "/v1/animations",
            serde_json::json!({"rigTaskId": TASK_ID, "actionIds": [92, 93]}),
            serde_json::json!({"rig_task_id": TASK_ID, "action_ids": [92, 93]}),
        )
        .await;
    }

    #[tokio::test]
    async fn text_to_image_sends_snake_case_keys() {
        assert_endpoint_receives_snake_case(
            TaskType::TextToImage,
            "/v1/text-to-image",
            serde_json::json!({
                "aiModel": "nano-banana",
                "prompt": "a sunset over mountains",
                "negativePrompt": "blurry",
                "seed": 42
            }),
            serde_json::json!({
                "ai_model": "nano-banana",
                "prompt": "a sunset over mountains",
                "negative_prompt": "blurry",
                "seed": 42
            }),
        )
        .await;
    }

    #[tokio::test]
    async fn image_to_image_sends_snake_case_keys_with_reference_array() {
        assert_endpoint_receives_snake_case(
            TaskType::ImageToImage,
            "/v1/image-to-image",
            serde_json::json!({
                "aiModel": "nano-banana",
                "prompt": "a futuristic city",
                "referenceImageUrls": [
                    "data:image/png;base64,abc"
                ]
            }),
            serde_json::json!({
                "ai_model": "nano-banana",
                "prompt": "a futuristic city",
                "reference_image_urls": [
                    "data:image/png;base64,abc"
                ]
            }),
        )
        .await;
    }

    // ─── Edge-case conversion tests ──────────────────────────────

    #[test]
    fn camel_to_snake_handles_single_char_keys() {
        assert_eq!(camel_to_snake("a"), "a");
        assert_eq!(camel_to_snake("A"), "a");
    }

    #[test]
    fn camel_to_snake_handles_consecutive_uppercase() {
        // Consecutive uppercase: "URLParser" → "u_r_l_parser"
        // This is acceptable — the API fields don't use consecutive uppercase
        assert_eq!(camel_to_snake("URLParser"), "u_r_l_parser");
    }

    #[test]
    fn camel_to_snake_handles_trailing_uppercase() {
        assert_eq!(camel_to_snake("modelUrls"), "model_urls");
        assert_eq!(camel_to_snake("apiU"), "api_u");
    }

    #[test]
    fn camel_to_snake_keys_handles_empty_object() {
        let input = serde_json::json!({});
        let output = camel_to_snake_keys(&input);
        assert!(output.as_object().unwrap().is_empty());
    }

    #[test]
    fn camel_to_snake_keys_handles_null_values() {
        let input = serde_json::json!({"imageUrl": null, "aiModel": null});
        let output = camel_to_snake_keys(&input);
        assert_eq!(output["image_url"], serde_json::Value::Null);
        assert_eq!(output["ai_model"], serde_json::Value::Null);
    }

    #[test]
    fn camel_to_snake_keys_handles_deeply_nested_objects() {
        let input = serde_json::json!({
            "outerKey": {
                "middleKey": {
                    "innerKey": "value",
                    "anotherInner": 42
                }
            }
        });
        let output = camel_to_snake_keys(&input);
        assert!(output.get("outer_key").is_some());
        assert!(output["outer_key"].get("middle_key").is_some());
        assert_eq!(output["outer_key"]["middle_key"]["inner_key"], "value");
        assert_eq!(output["outer_key"]["middle_key"]["another_inner"], 42);
    }

    #[test]
    fn camel_to_snake_keys_handles_array_of_objects_with_camel_keys() {
        let input = serde_json::json!({
            "textureUrls": [
                {"baseColor": "url1", "normalMap": "url2"},
                {"baseColor": "url3", "normalMap": "url4"}
            ]
        });
        let output = camel_to_snake_keys(&input);
        assert!(output.get("texture_urls").is_some());
        assert_eq!(output["texture_urls"][0]["base_color"], "url1");
        assert_eq!(output["texture_urls"][0]["normal_map"], "url2");
        assert_eq!(output["texture_urls"][1]["base_color"], "url3");
        assert_eq!(output["texture_urls"][1]["normal_map"], "url4");
    }

    #[test]
    fn camel_to_snake_keys_preserves_numeric_and_boolean_values() {
        let input = serde_json::json!({
            "shouldTexture": true,
            "targetPolycount": 50000,
            "heightMeters": 1.75,
            "seed": null
        });
        let output = camel_to_snake_keys(&input);
        assert_eq!(output["should_texture"], true);
        assert_eq!(output["target_polycount"], 50000);
        assert_eq!(output["height_meters"], 1.75);
        assert_eq!(output["seed"], serde_json::Value::Null);
    }

    #[test]
    fn camel_to_snake_keys_does_not_mutate_original() {
        let input = serde_json::json!({
            "imageUrl": "data:image/jpeg;base64,abc",
            "aiModel": "meshy-7"
        });
        let _output = camel_to_snake_keys(&input);
        // Original must be unchanged
        assert!(input.get("imageUrl").is_some());
        assert!(input.get("image_url").is_none());
    }

    #[test]
    fn camel_to_snake_keys_handles_mixed_camel_and_snake_keys() {
        // If a body already has some snake_case keys (e.g. "mode", "prompt")
        // alongside camelCase keys, the snake_case ones should pass through
        let input = serde_json::json!({
            "mode": "preview",
            "prompt": "a chair",
            "aiModel": "meshy-7",
            "shouldRemesh": true
        });
        let output = camel_to_snake_keys(&input);
        assert_eq!(output["mode"], "preview");
        assert_eq!(output["prompt"], "a chair");
        assert_eq!(output["ai_model"], "meshy-7");
        assert_eq!(output["should_remesh"], true);
    }

    // ─── Round-trip: original body logged, snake_case sent ───────

    #[tokio::test]
    async fn create_task_inner_logs_original_camel_case_body_to_sqlite() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/v1/image-to-3d"))
            .and(body_json(serde_json::json!({
                "image_url": "data:image/jpeg;base64,abc",
                "ai_model": "meshy-7"
            })))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "result": TASK_ID
            })))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        let camel_body = serde_json::json!({
            "imageUrl": "data:image/jpeg;base64,abc",
            "aiModel": "meshy-7"
        });
        let result = create_task_inner(&state, &TaskType::ImageTo3d, &camel_body).await;
        assert!(result.is_ok());

        // The SQLite task_log should have the ORIGINAL camelCase body,
        // not the converted snake_case body — preserving the IPC contract.
        let logged_body = state.database.get_logged_request_body(TASK_ID).unwrap();
        assert!(logged_body.is_some(), "task_log should have an entry");
        let parsed: serde_json::Value = serde_json::from_str(&logged_body.unwrap()).unwrap();
        assert!(
            parsed.get("imageUrl").is_some(),
            "SQLite should log the original camelCase body"
        );
        assert!(
            parsed.get("image_url").is_none(),
            "SQLite should NOT have the converted snake_case body"
        );
    }

    // ─── Regression: conversion must not break already-snake_case bodies ──

    #[tokio::test]
    async fn create_task_inner_preserves_snake_case_body_unchanged() {
        // If a caller already sends snake_case (e.g. a future Rust-to-Rust
        // call), the converter should be idempotent.
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/v2/text-to-3d"))
            .and(body_json(serde_json::json!({
                "mode": "preview",
                "prompt": "a chair"
            })))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "result": TASK_ID
            })))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        let snake_body = serde_json::json!({"mode": "preview", "prompt": "a chair"});
        let result = create_task_inner(&state, &TaskType::TextTo3dPreview, &snake_body).await;
        assert!(result.is_ok());
    }
}
