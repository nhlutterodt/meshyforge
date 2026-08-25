// MeshyForge — API Tauri Commands
//
// Source: TDD §7.2, CSD §7.2

use crate::app_state::AppState;
use crate::commands::validation::{
    model_filename, texture_filename, validate_creation_body, validate_download_url,
    validate_task_id, validate_task_reference,
};
use crate::meshy::MeshyError;
use tauri::Emitter;

/// Helper: JSON error string (CSD §7.2 pattern)
fn error_json(code: &str, message: &str) -> String {
    serde_json::to_string(&serde_json::json!({
        "code": code,
        "message": message,
    }))
    .unwrap_or_else(|_| format!("{{\"code\":\"{}\",\"message\":\"{}\"}}", code, message))
}

/// Helper: Map MeshyError to a JSON error string (CSD §7.2 pattern)
fn error_json_from_meshy_error(e: &MeshyError) -> String {
    let (code, message) = match e {
        MeshyError::ApiError { status, body } => {
            let code = format!("API_ERROR_{}", status.as_u16());
            let msg = serde_json::from_str::<serde_json::Value>(body)
                .ok()
                .and_then(|v| v.get("message").and_then(|m| m.as_str()).map(String::from))
                .unwrap_or_else(|| body.clone());
            (code, msg)
        }
        MeshyError::Network(_) => ("NETWORK_ERROR".to_string(), "Network error.".to_string()),
        MeshyError::MissingApiKey => ("MISSING_API_KEY".to_string(), "No API key.".to_string()),
        _ => ("INTERNAL_ERROR".to_string(), "Internal error.".to_string()),
    };
    error_json(&code, &message)
}

fn validate_creation(endpoint: &str, body: &serde_json::Value) -> Result<(), String> {
    validate_creation_body(endpoint, body).map_err(|message| error_json("INVALID_INPUT", message))
}

fn serialize_response<T: serde::Serialize>(response: T) -> Result<serde_json::Value, String> {
    serde_json::to_value(response).map_err(|error| {
        eprintln!("Failed to serialize Meshy response: {error}");
        error_json(
            "SERIALIZATION_ERROR",
            "Could not process the Meshy response.",
        )
    })
}

// ─── Task Creation Commands ────────────────────────────────────

#[tauri::command]
pub async fn create_text_to_3d(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v2/text-to-3d";
    validate_creation(endpoint, &body)?;
    let client = state.meshy_client().ok_or_else(|| {
        error_json(
            "MISSING_API_KEY",
            "No API key configured. Add your key in Settings.",
        )
    })?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

#[tauri::command]
pub async fn create_image_to_3d(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v1/image-to-3d";
    validate_creation(endpoint, &body)?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

#[tauri::command]
pub async fn create_remesh(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v1/remesh";
    validate_creation(endpoint, &body)?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

#[tauri::command]
pub async fn create_retexture(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v1/retexture";
    validate_creation(endpoint, &body)?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

#[tauri::command]
pub async fn create_convert(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v1/convert";
    validate_creation(endpoint, &body)?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

#[tauri::command]
pub async fn create_resize(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v1/resize";
    validate_creation(endpoint, &body)?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

#[tauri::command]
pub async fn create_rigging(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v1/rigging";
    validate_creation(endpoint, &body)?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

#[tauri::command]
pub async fn create_animation(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v1/animation";
    validate_creation(endpoint, &body)?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

#[tauri::command]
pub async fn create_text_to_image(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v2/text-to-image";
    validate_creation(endpoint, &body)?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

#[tauri::command]
pub async fn create_image_to_image(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v2/image-to-image";
    validate_creation(endpoint, &body)?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

#[tauri::command]
pub async fn create_multi_image_to_3d(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v1/multi-image-to-3d";
    validate_creation(endpoint, &body)?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

#[tauri::command]
pub async fn create_uv_unwrap(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v1/uv-unwrap";
    validate_creation(endpoint, &body)?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

#[tauri::command]
pub async fn create_multi_color_print(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v1/print/multi-color";
    validate_creation(endpoint, &body)?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

#[tauri::command]
pub async fn create_analyze_printability(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v1/print/analyze";
    validate_creation(endpoint, &body)?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

#[tauri::command]
pub async fn create_repair_printability(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let endpoint = "/v1/print/repair";
    validate_creation(endpoint, &body)?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let response = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, &body);
    serialize_response(response)
}

// ─── Task Polling / Streaming ──────────────────────────────────

#[tauri::command]
pub async fn poll_task(
    state: tauri::State<'_, AppState>,
    endpoint: String,
    task_id: String,
) -> Result<serde_json::Value, String> {
    validate_task_reference(&endpoint, &task_id)
        .map_err(|message| error_json("INVALID_INPUT", message))?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let task = client
        .get_task(&endpoint, &task_id)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state.database.update_task_status(&task_id, &task);
    Ok(task)
}

#[tauri::command]
pub async fn stream_task(
    state: tauri::State<'_, AppState>,
    endpoint: String,
    task_id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    validate_task_reference(&endpoint, &task_id)
        .map_err(|message| error_json("INVALID_INPUT", message))?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let app_handle = app.clone();
    let task_id_clone = task_id.clone();
    client
        .stream_task(&endpoint, &task_id, move |data| {
            let _ = app_handle.emit("task-progress", &data);
            if let Some(status) = data.get("status").and_then(|s| s.as_str()) {
                if matches!(status, "SUCCEEDED" | "FAILED" | "CANCELED") {
                    let _ = app_handle.emit(
                        "task-complete",
                        &serde_json::json!({
                            "taskId": task_id_clone,
                            "status": status,
                        }),
                    );
                }
            }
        })
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_task(
    state: tauri::State<'_, AppState>,
    endpoint: String,
    task_id: String,
) -> Result<(), String> {
    validate_task_reference(&endpoint, &task_id)
        .map_err(|message| error_json("INVALID_INPUT", message))?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    client
        .delete_task(&endpoint, &task_id)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    Ok(())
}

// ─── Asset Download ────────────────────────────────────────────

#[tauri::command]
pub async fn download_asset(
    state: tauri::State<'_, AppState>,
    task_id: String,
    model_urls: serde_json::Value,
    thumbnail_url: Option<String>,
    texture_urls: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    validate_task_id(&task_id).map_err(|message| error_json("INVALID_INPUT", message))?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let asset_dir = state.asset_dir(&task_id);
    std::fs::create_dir_all(&asset_dir)
        .map_err(|_| error_json("FS_ERROR", "Could not create the asset directory."))?;

    let mut file_paths: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();

    // Download model files
    if let Some(urls) = model_urls.as_object() {
        for (format, url) in urls {
            if let Some(url_str) = url.as_str() {
                if !url_str.is_empty() {
                    validate_download_url(url_str)
                        .map_err(|message| error_json("INVALID_INPUT", message))?;
                    let filename = model_filename(format).ok_or_else(|| {
                        error_json("INVALID_INPUT", "Unsupported model file format.")
                    })?;
                    let dest = asset_dir.join(filename);
                    client
                        .download_file(url_str, &dest)
                        .await
                        .map_err(|e| error_json_from_meshy_error(&e))?;
                    file_paths.insert(
                        format.clone(),
                        serde_json::Value::String(dest.to_string_lossy().into_owned()),
                    );
                }
            }
        }
    }

    // Download thumbnail
    let thumbnail_path = if let Some(url) = thumbnail_url {
        validate_download_url(&url).map_err(|message| error_json("INVALID_INPUT", message))?;
        let dest = asset_dir.join("thumbnail.png");
        client
            .download_file(&url, &dest)
            .await
            .map_err(|e| error_json_from_meshy_error(&e))?;
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
                            validate_download_url(url)
                                .map_err(|message| error_json("INVALID_INPUT", message))?;
                            let filename = texture_filename(i, key).ok_or_else(|| {
                                error_json("INVALID_INPUT", "Unsupported texture map type.")
                            })?;
                            let dest = tex_dir.join(&filename);
                            client
                                .download_file(url, &dest)
                                .await
                                .map_err(|e| error_json_from_meshy_error(&e))?;
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
            &task_id,
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

// ─── Balance ──────────────────────────────────────────────────

#[tauri::command]
pub async fn get_credit_balance(state: tauri::State<'_, AppState>) -> Result<i64, String> {
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let balance = client
        .get_balance()
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    Ok(balance.balance)
}

// ─── Animation Library ────────────────────────────────────────

#[tauri::command]
pub async fn fetch_animation_library(
    state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let url = "https://api.meshy.ai/web/public/animations/resources";
    let response = client
        .http_get(url)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    Ok(response)
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

    // ─── error_json_from_meshy_error ─────────────────────────────

    #[test]
    fn error_json_from_api_error_extracts_status_and_message() {
        let error = MeshyError::ApiError {
            status: reqwest::StatusCode::UNAUTHORIZED,
            body: r#"{"message":"Invalid API key"}"#.to_string(),
        };
        let result = error_json_from_meshy_error(&error);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "API_ERROR_401");
        assert_eq!(parsed["message"], "Invalid API key");
    }

    #[test]
    fn error_json_from_api_error_falls_back_to_raw_body_when_no_message_field() {
        let error = MeshyError::ApiError {
            status: reqwest::StatusCode::INTERNAL_SERVER_ERROR,
            body: "raw error text".to_string(),
        };
        let result = error_json_from_meshy_error(&error);
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
        let result = error_json_from_meshy_error(&MeshyError::Network(error));
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "NETWORK_ERROR");
        assert_eq!(parsed["message"], "Network error.");
    }

    #[test]
    fn error_json_from_missing_api_key_error() {
        let error = MeshyError::MissingApiKey;
        let result = error_json_from_meshy_error(&error);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "MISSING_API_KEY");
        assert_eq!(parsed["message"], "No API key.");
    }

    #[test]
    fn error_json_from_other_error_maps_to_internal() {
        let error = MeshyError::InvalidApiKey;
        let result = error_json_from_meshy_error(&error);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["code"], "INTERNAL_ERROR");
        assert_eq!(parsed["message"], "Internal error.");
    }

    // ─── validate_creation ───────────────────────────────────────

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
        let result = validate_creation(
            "/v1/unknown",
            &serde_json::json!({"prompt": "test"}),
        );
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
            fn serialize<S: serde::Serializer>(
                &self,
                _serializer: S,
            ) -> Result<S::Ok, S::Error> {
                Err(serde::ser::Error::custom("intentional failure"))
            }
        }
        let result = serialize_response(AlwaysFails);
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "SERIALIZATION_ERROR");
    }
}
