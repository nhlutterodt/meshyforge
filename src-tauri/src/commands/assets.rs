// MeshyForge — Asset Tauri Commands
//
// Source: TDD §7.3, IEP §1.8

use crate::app_state::AppState;
use crate::meshy::models::{AssetRecord, AssetRow};
use std::path::{Path, PathBuf};

const INVALID_PATH_MESSAGE: &str = "The selected path is invalid or unavailable.";
const DATABASE_ERROR_MESSAGE: &str = "Database error. Try restarting the app.";

fn database_error(error: &rusqlite::Error) -> String {
    log::error!("Database operation failed: {error}");
    error_json("DB_ERROR", DATABASE_ERROR_MESSAGE)
}

fn canonicalize_existing_path(path: &str) -> Result<PathBuf, String> {
    Path::new(path)
        .canonicalize()
        .map_err(|_| error_json("INVALID_PATH", INVALID_PATH_MESSAGE))
}

fn canonical_asset_path(data_dir: &Path, path: &str) -> Result<PathBuf, String> {
    let canonical_path = canonicalize_existing_path(path)?;
    let asset_root = data_dir
        .join("assets")
        .canonicalize()
        .map_err(|_| error_json("INVALID_PATH", INVALID_PATH_MESSAGE))?;

    if !canonical_path.starts_with(asset_root) {
        return Err(error_json(
            "INVALID_PATH",
            "Only downloaded MeshyForge assets can be revealed.",
        ));
    }

    Ok(canonical_path)
}

fn validated_image_mime(path: &Path, bytes: &[u8]) -> Result<&'static str, String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .ok_or_else(|| error_json("INVALID_IMAGE", "Select a PNG, JPEG, or WebP image."))?;

    let detected_mime = if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some("image/png")
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("image/jpeg")
    } else if bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        Some("image/webp")
    } else {
        None
    };

    match (extension.as_str(), detected_mime) {
        ("png", Some("image/png")) => Ok("image/png"),
        ("jpg" | "jpeg", Some("image/jpeg")) => Ok("image/jpeg"),
        ("webp", Some("image/webp")) => Ok("image/webp"),
        _ => Err(error_json(
            "INVALID_IMAGE",
            "The file contents do not match a supported image type.",
        )),
    }
}

/// Retrieve all assets from the database, ordered by creation date (newest first).
#[tauri::command]
pub async fn get_all_assets(state: tauri::State<'_, AppState>) -> Result<Vec<AssetRow>, String> {
    get_all_assets_inner(&state)
}

/// Search assets by text query and optional tag filter.
#[tauri::command]
pub async fn search_assets(
    state: tauri::State<'_, AppState>,
    query: String,
    tag: Option<String>,
) -> Result<Vec<AssetRow>, String> {
    search_assets_inner(&state, &query, tag.as_deref())
}

/// Update the tags on an asset.
#[tauri::command]
pub async fn update_tags(
    state: tauri::State<'_, AppState>,
    asset_id: String,
    tags: Vec<String>,
) -> Result<(), String> {
    update_tags_inner(&state, &asset_id, &tags)
}

/// Toggle the favorite flag on an asset.
#[tauri::command]
pub async fn toggle_favorite(
    state: tauri::State<'_, AppState>,
    asset_id: String,
) -> Result<(), String> {
    toggle_favorite_inner(&state, &asset_id)
}

/// Update the notes on an asset.
#[tauri::command]
pub async fn update_notes(
    state: tauri::State<'_, AppState>,
    asset_id: String,
    notes: String,
) -> Result<(), String> {
    update_notes_inner(&state, &asset_id, &notes)
}

/// Delete an asset record (and its tag links). Does not delete files on disk.
#[tauri::command]
pub async fn delete_asset(
    state: tauri::State<'_, AppState>,
    asset_id: String,
) -> Result<(), String> {
    delete_asset_inner(&state, &asset_id)
}

/// Get the count of downloaded assets (for storage usage display).
#[tauri::command]
pub async fn get_storage_usage(state: tauri::State<'_, AppState>) -> Result<i64, String> {
    get_storage_usage_inner(&state)
}

/// Reveal a file path in the OS file manager.
#[tauri::command]
pub async fn reveal_in_file_manager(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<(), String> {
    let canonical_path = canonical_asset_path(&state.data_dir, &path)?;
    #[allow(unused_variables)]
    let path_arg = canonical_path.to_string_lossy();

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", path_arg.as_ref()])
            .spawn()
            .map_err(|_| error_json("OS_ERROR", "Could not open the file manager."))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", path_arg.as_ref()])
            .spawn()
            .map_err(|_| error_json("OS_ERROR", "Could not open the file manager."))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(canonical_path.parent().unwrap_or(&canonical_path))
            .spawn()
            .map_err(|_| error_json("OS_ERROR", "Could not open the file manager."))?;
    }
    Ok(())
}

/// Read a file as a data URI (for displaying local images in the frontend).
#[tauri::command]
pub async fn read_file_as_data_uri(path: String) -> Result<String, String> {
    let canonical_path = canonicalize_existing_path(&path)?;
    let bytes = std::fs::read(&canonical_path)
        .map_err(|_| error_json("FS_ERROR", "The selected image could not be read."))?;
    let mime = validated_image_mime(&canonical_path, &bytes)?;
    use base64::Engine;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, encoded))
}

/// Helper: JSON error string (CSD §7.2 pattern)
fn error_json(code: &str, message: &str) -> String {
    serde_json::to_string(&serde_json::json!({
        "code": code,
        "message": message,
    }))
    .unwrap_or_else(|_| format!("{{\"code\":\"{}\",\"message\":\"{}\"}}", code, message))
}

// ─── Pure inner functions (testable without tauri::State) ──────

pub(crate) fn get_all_assets_inner(state: &AppState) -> Result<Vec<AssetRow>, String> {
    state
        .database
        .get_all_assets()
        .map_err(|error| database_error(&error))
}

pub(crate) fn search_assets_inner(
    state: &AppState,
    query: &str,
    tag: Option<&str>,
) -> Result<Vec<AssetRow>, String> {
    state
        .database
        .search_assets(query, tag)
        .map_err(|error| database_error(&error))
}

pub(crate) fn update_tags_inner(
    state: &AppState,
    asset_id: &str,
    tags: &[String],
) -> Result<(), String> {
    state
        .database
        .update_tags(asset_id, tags)
        .map_err(|error| database_error(&error))
}

pub(crate) fn toggle_favorite_inner(state: &AppState, asset_id: &str) -> Result<(), String> {
    state
        .database
        .toggle_favorite(asset_id)
        .map_err(|error| database_error(&error))
}

pub(crate) fn update_notes_inner(
    state: &AppState,
    asset_id: &str,
    notes: &str,
) -> Result<(), String> {
    state
        .database
        .update_notes(asset_id, notes)
        .map_err(|error| database_error(&error))
}

pub(crate) fn delete_asset_inner(state: &AppState, asset_id: &str) -> Result<(), String> {
    state
        .database
        .delete_asset(asset_id)
        .map_err(|error| database_error(&error))
}

pub(crate) fn get_storage_usage_inner(state: &AppState) -> Result<i64, String> {
    state
        .database
        .get_storage_usage()
        .map_err(|error| database_error(&error))
}

#[allow(clippy::too_many_arguments)]
pub(crate) fn save_completed_task_inner(
    state: &AppState,
    task_id: &str,
    task_type: &str,
    prompt: Option<&str>,
    ai_model: Option<&str>,
    status: &str,
    progress: i64,
    consumed_credits: i64,
    thumbnail_url: Option<&str>,
    model_urls: Option<&serde_json::Value>,
    texture_urls: Option<&serde_json::Value>,
    created_at: i64,
    started_at: i64,
    finished_at: i64,
) -> Result<(), String> {
    let has_textures = texture_urls
        .as_ref()
        .and_then(|v| v.as_array())
        .map(|arr| !arr.is_empty())
        .unwrap_or(false);

    let file_paths_json = model_urls
        .as_ref()
        .map(|v| v.to_string())
        .unwrap_or_else(|| "{}".to_string());

    let texture_paths_json = texture_urls
        .as_ref()
        .map(|v| v.to_string())
        .unwrap_or_else(|| "[]".to_string());

    let record = AssetRecord {
        id: task_id.to_string(),
        meshy_type: task_type.to_string(),
        parent_task_id: None,
        prompt: prompt.map(|s| s.to_string()),
        image_url: None,
        ai_model: ai_model.map(|s| s.to_string()),
        status: status.to_string(),
        progress,
        consumed_credits,
        thumbnail_path: thumbnail_url.map(|s| s.to_string()),
        file_paths_json,
        texture_paths_json,
        notes: String::new(),
        tags_json: "[]".to_string(),
        created_at,
        started_at,
        finished_at,
        downloaded_at: 0,
        error_message: None,
        has_textures,
        has_rig: false,
        has_animation: false,
        favorite: false,
        last_viewed_at: 0,
    };

    state
        .database
        .insert_asset(&record)
        .map_err(|error| database_error(&error))
}

/// Save a completed task as an asset in the database.
/// Called by the frontend when a task reaches SUCCEEDED status.
#[tauri::command]
#[allow(clippy::too_many_arguments, clippy::redundant_field_names)]
pub async fn save_completed_task(
    state: tauri::State<'_, AppState>,
    task_id: String,
    task_type: String,
    prompt: Option<String>,
    ai_model: Option<String>,
    status: String,
    progress: i64,
    consumed_credits: i64,
    thumbnail_url: Option<String>,
    model_urls: Option<serde_json::Value>,
    texture_urls: Option<serde_json::Value>,
    created_at: i64,
    started_at: i64,
    finished_at: i64,
) -> Result<(), String> {
    save_completed_task_inner(
        &state,
        &task_id,
        &task_type,
        prompt.as_deref(),
        ai_model.as_deref(),
        &status,
        progress,
        consumed_credits,
        thumbnail_url.as_deref(),
        model_urls.as_ref(),
        texture_urls.as_ref(),
        created_at,
        started_at,
        finished_at,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_json_format() {
        let result = error_json("DB_ERROR", "connection failed");
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "DB_ERROR");
        assert_eq!(parsed["message"], "connection failed");
    }

    #[test]
    fn validates_supported_image_signatures() {
        assert_eq!(
            validated_image_mime(Path::new("image.png"), b"\x89PNG\r\n\x1a\nrest"),
            Ok("image/png")
        );
        assert_eq!(
            validated_image_mime(Path::new("image.jpeg"), b"\xff\xd8\xffrest"),
            Ok("image/jpeg")
        );
        assert_eq!(
            validated_image_mime(Path::new("image.webp"), b"RIFF\x04\x00\x00\x00WEBPrest"),
            Ok("image/webp")
        );
    }

    #[test]
    fn rejects_mismatched_image_extension_and_signature() {
        assert!(validated_image_mime(Path::new("image.png"), b"\xff\xd8\xffrest").is_err());
        assert!(validated_image_mime(Path::new("image.gif"), b"GIF89a").is_err());
    }

    #[test]
    fn confines_revealed_files_to_asset_root() {
        let temp = tempfile::tempdir().unwrap();
        let asset_root = temp.path().join("assets");
        std::fs::create_dir(&asset_root).unwrap();
        let asset = asset_root.join("model.glb");
        let outside = temp.path().join("outside.txt");
        std::fs::write(&asset, b"model").unwrap();
        std::fs::write(&outside, b"private").unwrap();

        assert_eq!(
            canonical_asset_path(temp.path(), asset.to_str().unwrap()),
            Ok(asset.canonicalize().unwrap())
        );
        assert!(canonical_asset_path(temp.path(), outside.to_str().unwrap()).is_err());
    }

    #[test]
    fn database_error_formats_json_with_db_error_code() {
        let error = rusqlite::Error::InvalidQuery;
        let result = database_error(&error);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "DB_ERROR");
        assert_eq!(parsed["message"], DATABASE_ERROR_MESSAGE);
    }

    #[test]
    fn canonicalize_existing_path_returns_error_for_missing_file() {
        let result = canonicalize_existing_path("/nonexistent/path/file.glb");
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_PATH");
    }

    #[tokio::test]
    async fn read_file_as_data_uri_encodes_png_file() {
        let temp = tempfile::tempdir().unwrap();
        let png_path = temp.path().join("test.png");
        std::fs::write(&png_path, b"\x89PNG\r\n\x1a\npixel data").unwrap();

        let result = read_file_as_data_uri(png_path.to_str().unwrap().to_string()).await;
        assert!(result.is_ok());
        let data_uri = result.unwrap();
        assert!(data_uri.starts_with("data:image/png;base64,"));
    }

    #[tokio::test]
    async fn read_file_as_data_uri_rejects_unsupported_image_type() {
        let temp = tempfile::tempdir().unwrap();
        let gif_path = temp.path().join("test.gif");
        std::fs::write(&gif_path, b"GIF89a").unwrap();

        let result = read_file_as_data_uri(gif_path.to_str().unwrap().to_string()).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_IMAGE");
    }

    #[tokio::test]
    async fn read_file_as_data_uri_rejects_missing_file() {
        let result = read_file_as_data_uri("/nonexistent/image.png".to_string()).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        // canonicalize_existing_path fails first, returning INVALID_PATH
        assert_eq!(parsed["code"], "INVALID_PATH");
    }

    // ─── Inner function tests (using real AppState + temp DB) ──

    use crate::meshy::models::AssetRecord;

    fn make_state() -> AppState {
        let dir = tempfile::tempdir().unwrap().keep();
        AppState::new(dir).unwrap()
    }

    fn make_asset_record(id: &str) -> AssetRecord {
        AssetRecord {
            id: id.to_string(),
            meshy_type: "text-to-3d".to_string(),
            parent_task_id: None,
            prompt: Some("a dragon".to_string()),
            image_url: None,
            ai_model: None,
            status: "SUCCEEDED".to_string(),
            progress: 100,
            consumed_credits: 5,
            thumbnail_path: None,
            file_paths_json: "{}".to_string(),
            texture_paths_json: "[]".to_string(),
            notes: "".to_string(),
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
        }
    }

    #[test]
    fn save_completed_task_inner_inserts_asset() {
        let state = make_state();
        let result = save_completed_task_inner(
            &state,
            "task-abc",
            "text-to-3d",
            Some("a chair"),
            None,
            "SUCCEEDED",
            100,
            10,
            None,
            None,
            None,
            1000,
            1010,
            1100,
        );
        assert!(result.is_ok());

        let assets = get_all_assets_inner(&state).unwrap();
        assert_eq!(assets.len(), 1);
        assert_eq!(assets[0].id, "task-abc");
        assert_eq!(assets[0].prompt, Some("a chair".to_string()));
    }

    /// Regression test for a bug where the frontend's `useActiveTaskPolling`
    /// hook sent `{ taskId, taskType, ... }` (camelCase) to `invoke('save_completed_task', ...)`,
    /// but this command's second parameter was still named `meshy_type` —
    /// so Tauri's IPC layer (camelCase JS key -> snake_case Rust param)
    /// found no `meshyType` key, deserialization failed, and every
    /// completed task silently failed to save (caught by a bare
    /// `console.error`, no toast, gallery never invalidated).
    ///
    /// This mirrors the exact struct Tauri's `#[tauri::command]` macro
    /// generates to deserialize the invoke payload: field names must
    /// match `save_completed_task`'s Rust parameter list (minus `state`)
    /// under `rename_all = "camelCase"`. If a future rename desyncs the
    /// frontend's `SaveCompletedTaskArgs` keys from this command's
    /// parameter names, this test fails to deserialize.
    #[test]
    fn save_completed_task_command_args_match_frontend_payload_shape() {
        // Mirrors the struct Tauri's `#[tauri::command]` macro generates to
        // deserialize the invoke payload: field names/types must match
        // `save_completed_task`'s Rust parameter list (minus `state`) under
        // `rename_all = "camelCase"`.
        #[derive(serde::Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct SaveCompletedTaskArgsContract {
            task_id: String,
            task_type: String,
            prompt: Option<String>,
            ai_model: Option<String>,
            status: String,
            progress: i64,
            consumed_credits: i64,
            thumbnail_url: Option<String>,
            model_urls: Option<serde_json::Value>,
            texture_urls: Option<serde_json::Value>,
            created_at: i64,
            started_at: i64,
            finished_at: i64,
        }

        // Exactly what `mapPollResultToSaveArgs` in
        // src/hooks/useActiveTaskPolling.ts sends over `invoke(...)`.
        let frontend_payload = serde_json::json!({
            "taskId": "task-abc",
            "taskType": "multi-image-to-3d",
            "prompt": null,
            "aiModel": null,
            "status": "SUCCEEDED",
            "progress": 100,
            "consumedCredits": 30,
            "thumbnailUrl": "https://assets.meshy.ai/abc/preview.png",
            "modelUrls": {"glb": "https://assets.meshy.ai/abc/model.glb"},
            "textureUrls": null,
            "createdAt": 1000,
            "startedAt": 1010,
            "finishedAt": 1100,
        });

        let args: SaveCompletedTaskArgsContract = serde_json::from_value(frontend_payload)
            .expect(
                "save_completed_task's parameter names no longer match the camelCase keys \
                 the frontend sends (SaveCompletedTaskArgs in useActiveTaskPolling.ts)",
            );

        // Feed the deserialized args into the real command body so this test
        // also fails to *compile* if save_completed_task_inner's parameter
        // list or types drift from this contract struct.
        let state = make_state();
        let result = save_completed_task_inner(
            &state,
            &args.task_id,
            &args.task_type,
            args.prompt.as_deref(),
            args.ai_model.as_deref(),
            &args.status,
            args.progress,
            args.consumed_credits,
            args.thumbnail_url.as_deref(),
            args.model_urls.as_ref(),
            args.texture_urls.as_ref(),
            args.created_at,
            args.started_at,
            args.finished_at,
        );
        assert!(result.is_ok());

        let assets = get_all_assets_inner(&state).unwrap();
        assert_eq!(assets.len(), 1);
        assert_eq!(assets[0].id, "task-abc");
        assert_eq!(assets[0].task_type, "multi-image-to-3d");
    }

    #[test]
    fn save_completed_task_inner_with_textures_sets_has_textures() {
        let state = make_state();
        let textures = serde_json::json!([{"baseColor": "url"}]);
        save_completed_task_inner(
            &state,
            "task-tex",
            "text-to-3d",
            None,
            None,
            "SUCCEEDED",
            100,
            10,
            None,
            None,
            Some(&textures),
            1000,
            1010,
            1100,
        )
        .unwrap();

        let assets = get_all_assets_inner(&state).unwrap();
        assert!(assets[0].has_textures);
    }

    #[test]
    fn save_completed_task_inner_with_model_urls_stores_json() {
        let state = make_state();
        let model_urls = serde_json::json!({"glb": "https://assets.meshy.ai/m.glb"});
        save_completed_task_inner(
            &state,
            "task-models",
            "text-to-3d",
            None,
            None,
            "SUCCEEDED",
            100,
            10,
            None,
            Some(&model_urls),
            None,
            1000,
            1010,
            1100,
        )
        .unwrap();

        let assets = get_all_assets_inner(&state).unwrap();
        assert!(assets[0].file_paths.contains("m.glb"));
    }

    #[test]
    fn get_all_assets_inner_returns_empty_when_no_assets() {
        let state = make_state();
        let assets = get_all_assets_inner(&state).unwrap();
        assert!(assets.is_empty());
    }

    #[test]
    fn search_assets_inner_returns_matching_assets() {
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();
        state
            .database
            .insert_asset(&make_asset_record("task-2"))
            .unwrap();

        let results = search_assets_inner(&state, "dragon", None).unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn update_tags_inner_updates_tags() {
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();

        let tags = vec!["fantasy".to_string(), "creature".to_string()];
        update_tags_inner(&state, "task-1", &tags).unwrap();

        let assets = get_all_assets_inner(&state).unwrap();
        assert!(assets[0].tags.contains("fantasy"));
    }

    #[test]
    fn toggle_favorite_inner_flips_favorite() {
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();

        toggle_favorite_inner(&state, "task-1").unwrap();
        let assets = get_all_assets_inner(&state).unwrap();
        assert!(assets[0].favorite);

        toggle_favorite_inner(&state, "task-1").unwrap();
        let assets = get_all_assets_inner(&state).unwrap();
        assert!(!assets[0].favorite);
    }

    #[test]
    fn update_notes_inner_updates_notes() {
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();

        update_notes_inner(&state, "task-1", "my notes").unwrap();
        let assets = get_all_assets_inner(&state).unwrap();
        assert_eq!(assets[0].notes, "my notes");
    }

    #[test]
    fn delete_asset_inner_removes_asset() {
        let state = make_state();
        state
            .database
            .insert_asset(&make_asset_record("task-1"))
            .unwrap();
        assert_eq!(get_all_assets_inner(&state).unwrap().len(), 1);

        delete_asset_inner(&state, "task-1").unwrap();
        assert!(get_all_assets_inner(&state).unwrap().is_empty());
    }

    #[test]
    fn get_storage_usage_inner_returns_count() {
        let state = make_state();
        // No downloaded assets → 0
        assert_eq!(get_storage_usage_inner(&state).unwrap(), 0);

        // Insert a downloaded asset
        let mut record = make_asset_record("task-1");
        record.downloaded_at = 5000;
        state.database.insert_asset(&record).unwrap();

        assert_eq!(get_storage_usage_inner(&state).unwrap(), 1);
    }
}
