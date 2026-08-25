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
    state
        .database
        .get_all_assets()
        .map_err(|error| database_error(&error))
}

/// Search assets by text query and optional tag filter.
#[tauri::command]
pub async fn search_assets(
    state: tauri::State<'_, AppState>,
    query: String,
    tag: Option<String>,
) -> Result<Vec<AssetRow>, String> {
    state
        .database
        .search_assets(&query, tag.as_deref())
        .map_err(|error| database_error(&error))
}

/// Update the tags on an asset.
#[tauri::command]
pub async fn update_tags(
    state: tauri::State<'_, AppState>,
    asset_id: String,
    tags: Vec<String>,
) -> Result<(), String> {
    state
        .database
        .update_tags(&asset_id, &tags)
        .map_err(|error| database_error(&error))
}

/// Toggle the favorite flag on an asset.
#[tauri::command]
pub async fn toggle_favorite(
    state: tauri::State<'_, AppState>,
    asset_id: String,
) -> Result<(), String> {
    state
        .database
        .toggle_favorite(&asset_id)
        .map_err(|error| database_error(&error))
}

/// Update the notes on an asset.
#[tauri::command]
pub async fn update_notes(
    state: tauri::State<'_, AppState>,
    asset_id: String,
    notes: String,
) -> Result<(), String> {
    state
        .database
        .update_notes(&asset_id, &notes)
        .map_err(|error| database_error(&error))
}

/// Delete an asset record (and its tag links). Does not delete files on disk.
#[tauri::command]
pub async fn delete_asset(
    state: tauri::State<'_, AppState>,
    asset_id: String,
) -> Result<(), String> {
    state
        .database
        .delete_asset(&asset_id)
        .map_err(|error| database_error(&error))
}

/// Get the count of downloaded assets (for storage usage display).
#[tauri::command]
pub async fn get_storage_usage(state: tauri::State<'_, AppState>) -> Result<i64, String> {
    state
        .database
        .get_storage_usage()
        .map_err(|error| database_error(&error))
}

/// Reveal a file path in the OS file manager.
#[tauri::command]
pub async fn reveal_in_file_manager(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<(), String> {
    let canonical_path = canonical_asset_path(&state.data_dir, &path)?;
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

/// Save a completed task as an asset in the database.
/// Called by the frontend when a task reaches SUCCEEDED status.
#[tauri::command]
#[allow(clippy::too_many_arguments, clippy::redundant_field_names)]
pub async fn save_completed_task(
    state: tauri::State<'_, AppState>,
    task_id: String,
    meshy_type: String,
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
        id: task_id,
        meshy_type: meshy_type,
        parent_task_id: None,
        prompt,
        image_url: None,
        ai_model,
        status,
        progress,
        consumed_credits,
        thumbnail_path: thumbnail_url,
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
}
