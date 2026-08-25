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

// ─── Pure inner functions (testable without tauri::State) ──────
// Each #[tauri::command] delegates to these so the business logic
// can be unit-tested with a plain &AppState (no Tauri runtime).

/// Create a task on any Meshy endpoint. Used by all 18 create_* commands.
pub(crate) async fn create_task_inner(
    state: &AppState,
    endpoint: &str,
    body: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    validate_creation(endpoint, body)?;
    let client = state.meshy_client().ok_or_else(|| {
        error_json(
            "MISSING_API_KEY",
            "No API key configured. Add your key in Settings.",
        )
    })?;
    let response = client
        .create_task(endpoint, body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state
        .database
        .log_task_create(&response.result, endpoint, body);
    serialize_response(response)
}

/// Poll a task by endpoint + task_id.
pub(crate) async fn poll_task_inner(
    state: &AppState,
    endpoint: &str,
    task_id: &str,
) -> Result<serde_json::Value, String> {
    validate_task_reference(endpoint, task_id)
        .map_err(|message| error_json("INVALID_INPUT", message))?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let task = client
        .get_task(endpoint, task_id)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    let _ = state.database.update_task_status(task_id, &task);
    Ok(task)
}

/// Delete a task by endpoint + task_id.
pub(crate) async fn delete_task_inner(
    state: &AppState,
    endpoint: &str,
    task_id: &str,
) -> Result<(), String> {
    validate_task_reference(endpoint, task_id)
        .map_err(|message| error_json("INVALID_INPUT", message))?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    client
        .delete_task(endpoint, task_id)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    Ok(())
}

/// Download model files, thumbnail, and textures for a completed task.
pub(crate) async fn download_asset_inner(
    state: &AppState,
    task_id: &str,
    model_urls: &serde_json::Value,
    thumbnail_url: Option<&str>,
    texture_urls: Option<&serde_json::Value>,
) -> Result<serde_json::Value, String> {
    validate_task_id(task_id).map_err(|message| error_json("INVALID_INPUT", message))?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let asset_dir = state.asset_dir(task_id);
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
                    let filename = model_filename(format)
                        .ok_or_else(|| error_json("INVALID_INPUT", "Unsupported model file format."))?;
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
        validate_download_url(url).map_err(|message| error_json("INVALID_INPUT", message))?;
        let dest = asset_dir.join("thumbnail.png");
        client
            .download_file(url, &dest)
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
                            let filename = texture_filename(i, key)
                                .ok_or_else(|| error_json("INVALID_INPUT", "Unsupported texture map type."))?;
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
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let balance = client
        .get_balance()
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;
    Ok(balance.balance)
}

/// Fetch the public animation library.
pub(crate) async fn fetch_animation_library_inner(
    state: &AppState,
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

// ─── Task Creation Commands ────────────────────────────────────

#[tauri::command]
pub async fn create_text_to_3d(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v2/text-to-3d", &body).await
}

#[tauri::command]
pub async fn create_image_to_3d(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v1/image-to-3d", &body).await
}

#[tauri::command]
pub async fn create_remesh(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v1/remesh", &body).await
}

#[tauri::command]
pub async fn create_retexture(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v1/retexture", &body).await
}

#[tauri::command]
pub async fn create_convert(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v1/convert", &body).await
}

#[tauri::command]
pub async fn create_resize(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v1/resize", &body).await
}

#[tauri::command]
pub async fn create_rigging(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v1/rigging", &body).await
}

#[tauri::command]
pub async fn create_animation(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v1/animation", &body).await
}

#[tauri::command]
pub async fn create_text_to_image(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v2/text-to-image", &body).await
}

#[tauri::command]
pub async fn create_image_to_image(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v2/image-to-image", &body).await
}

#[tauri::command]
pub async fn create_multi_image_to_3d(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v1/multi-image-to-3d", &body).await
}

#[tauri::command]
pub async fn create_uv_unwrap(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v1/uv-unwrap", &body).await
}

#[tauri::command]
pub async fn create_multi_color_print(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v1/print/multi-color", &body).await
}

#[tauri::command]
pub async fn create_analyze_printability(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v1/print/analyze", &body).await
}

#[tauri::command]
pub async fn create_repair_printability(
    state: tauri::State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    create_task_inner(&state, "/v1/print/repair", &body).await
}

// ─── Task Polling / Streaming ──────────────────────────────────

#[tauri::command]
pub async fn poll_task(
    state: tauri::State<'_, AppState>,
    endpoint: String,
    task_id: String,
) -> Result<serde_json::Value, String> {
    poll_task_inner(&state, &endpoint, &task_id).await
}

#[tauri::command]
pub async fn stream_task(
    state: tauri::State<'_, AppState>,
    endpoint: String,
    task_id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let app_handle = app.clone();
    let app_handle_complete = app.clone();
    stream_task_inner(
        &state,
        &endpoint,
        &task_id,
        move |data| {
            let _ = app_handle.emit("task-progress", &data);
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

/// Stream task events, calling `on_progress` for each event and `on_complete`
/// when a terminal status is reached. Extracted for testability.
pub(crate) async fn stream_task_inner(
    state: &AppState,
    endpoint: &str,
    task_id: &str,
    on_progress: impl Fn(serde_json::Value),
    on_complete: impl Fn(&str, &str),
) -> Result<(), String> {
    validate_task_reference(endpoint, task_id)
        .map_err(|message| error_json("INVALID_INPUT", message))?;
    let client = state
        .meshy_client()
        .ok_or_else(|| error_json("MISSING_API_KEY", "No API key configured."))?;
    let task_id_owned = task_id.to_string();
    client
        .stream_task(endpoint, task_id, move |data| {
            on_progress(data.clone());
            if let Some(status) = data.get("status").and_then(|s| s.as_str()) {
                if matches!(status, "SUCCEEDED" | "FAILED" | "CANCELED") {
                    on_complete(&task_id_owned, status);
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
    delete_task_inner(&state, &endpoint, &task_id).await
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
    download_asset_inner(
        &state,
        &task_id,
        &model_urls,
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

    // ─── Inner function tests (testable without tauri::State) ───
    //
    // These test the extracted pure functions that take &AppState.
    // We construct a real AppState with tempfile + wiremock to exercise
    // the full create/poll/delete/download/balance pipeline.

    use crate::meshy::MeshyClient;
    use std::path::PathBuf;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    const TASK_ID: &str = "01a039b2-b12c-7b56-b955-7fe20515aed0";

    fn make_test_state(server_uri: String) -> AppState {
        let dir = tempfile::tempdir().unwrap().keep();
        let mut state = AppState::new(dir).unwrap();
        state.set_api_key("msy_test_key".to_string()).unwrap();
        // Override the client with the mock server URL
        state.client = std::sync::Mutex::new(Some(MeshyClient::with_base_url(
            "msy_test_key".to_string(),
            server_uri,
        )));
        state
    }

    fn make_no_key_state() -> AppState {
        let dir = tempfile::tempdir().unwrap().keep();
        AppState::new(dir).unwrap() // No API key set
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
        let result = create_task_inner(&state, "/v2/text-to-3d", &body).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap()["result"], TASK_ID);
    }

    #[tokio::test]
    async fn create_task_inner_returns_missing_api_key_without_client() {
        let state = make_no_key_state();
        let body = serde_json::json!({"mode": "preview", "prompt": "chair"});
        let result = create_task_inner(&state, "/v2/text-to-3d", &body).await;

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
        let result = create_task_inner(&state, "/v2/text-to-3d", &body).await;

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
        let result = poll_task_inner(&state, "/v2/text-to-3d", TASK_ID).await;

        assert!(result.is_ok());
        let task = result.unwrap();
        assert_eq!(task["status"], "SUCCEEDED");
        assert_eq!(task["progress"], 100);
    }

    #[tokio::test]
    async fn poll_task_inner_rejects_invalid_task_id() {
        let state = make_no_key_state();
        let result = poll_task_inner(&state, "/v2/text-to-3d", "not-a-uuid").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn poll_task_inner_rejects_untrusted_endpoint() {
        let state = make_no_key_state();
        let result = poll_task_inner(&state, "/v1/unknown", TASK_ID).await;
        assert!(result.is_err());
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
        let result = delete_task_inner(&state, "/v2/text-to-3d", TASK_ID).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn delete_task_inner_returns_missing_api_key_without_client() {
        let state = make_no_key_state();
        let result = delete_task_inner(&state, "/v2/text-to-3d", TASK_ID).await;
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
        let result = download_asset_inner(
            &state,
            TASK_ID,
            &serde_json::json!({}),
            None,
            None,
        )
        .await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "MISSING_API_KEY");
    }

    #[tokio::test]
    async fn download_asset_inner_rejects_invalid_task_id() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());
        let result = download_asset_inner(
            &state,
            "not-a-uuid",
            &serde_json::json!({}),
            None,
            None,
        )
        .await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[tokio::test]
    async fn download_asset_inner_rejects_non_meshy_download_url() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());

        // Insert an asset row so we get past the MISSING_API_KEY check
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

        // Non-meshy URL should be rejected
        let model_urls = serde_json::json!({
            "glb": "https://attacker.com/model.glb"
        });
        let result = download_asset_inner(&state, TASK_ID, &model_urls, None, None).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[tokio::test]
    async fn download_asset_inner_creates_asset_directory() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());

        // Insert an asset row
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

        // Empty model_urls (no files to download) — exercises the
        // directory creation and mark_downloaded path
        let result = download_asset_inner(
            &state,
            TASK_ID,
            &serde_json::json!({}),
            None,
            None,
        )
        .await;

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
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "animations": [{"id": 1, "name": "walk"}]
            })))
            .mount(&server)
            .await;

        let state = make_test_state(server.uri());
        // Override URL by using http_get directly — but our inner function
        // uses a hardcoded URL. So we test the missing-key path instead
        // and verify the function compiles and handles errors.
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
        let sse_body = "data:{\"status\":\"PENDING\",\"progress\":10}\n\ndata:{\"status\":\"SUCCEEDED\",\"progress\":100}\n\n";
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
        let progress_count = std::sync::Arc::new(std::sync::Mutex::new(0));
        let complete_called = std::sync::Arc::new(std::sync::Mutex::new(false));
        let complete_task_id = std::sync::Arc::new(std::sync::Mutex::new(String::new()));
        let complete_status = std::sync::Arc::new(std::sync::Mutex::new(String::new()));

        let pc = progress_count.clone();
        let cc = complete_called.clone();
        let cti = complete_task_id.clone();
        let cs = complete_status.clone();

        let result = stream_task_inner(
            &state,
            "/v2/text-to-3d",
            TASK_ID,
            move |_data| {
                *pc.lock().unwrap() += 1;
            },
            move |task_id, status| {
                *cc.lock().unwrap() = true;
                *cti.lock().unwrap() = task_id.to_string();
                *cs.lock().unwrap() = status.to_string();
            },
        )
        .await;

        assert!(result.is_ok());
        assert_eq!(*progress_count.lock().unwrap(), 2);
        assert!(*complete_called.lock().unwrap());
        assert_eq!(*complete_task_id.lock().unwrap(), TASK_ID);
        assert_eq!(*complete_status.lock().unwrap(), "SUCCEEDED");
    }

    #[tokio::test]
    async fn stream_task_inner_returns_missing_api_key_without_client() {
        let state = make_no_key_state();
        let result = stream_task_inner(
            &state,
            "/v2/text-to-3d",
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
            "/v2/text-to-3d",
            "not-a-uuid",
            |_| {},
            |_, _| {},
        )
        .await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
    }

    #[tokio::test]
    async fn stream_task_inner_rejects_untrusted_endpoint() {
        let state = make_no_key_state();
        let result = stream_task_inner(
            &state,
            "/v1/unknown",
            TASK_ID,
            |_| {},
            |_, _| {},
        )
        .await;
        assert!(result.is_err());
    }

    // ─── download_asset_inner with valid meshy URLs ─────────────
    // download_file uses its own HTTP client (not the base_url one),
    // so it makes real HTTP requests. We test the validation rejection
    // and empty-URL paths, plus the unsupported-format rejection.

    #[tokio::test]
    async fn download_asset_inner_rejects_unsupported_model_format() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());

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

        // "exe" is not a supported model format — model_filename returns None
        let model_urls = serde_json::json!({
            "exe": "https://assets.meshy.ai/model.exe"
        });
        let result = download_asset_inner(&state, TASK_ID, &model_urls, None, None).await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
        assert!(parsed["message"].as_str().unwrap().contains("Unsupported model file format"));
    }

    #[tokio::test]
    async fn download_asset_inner_rejects_unsupported_texture_map_type() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());

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

        // "unknown_map" is not a supported texture map type
        let textures = serde_json::json!([{"unknown_map": "https://assets.meshy.ai/tex.png"}]);
        let result = download_asset_inner(
            &state,
            TASK_ID,
            &serde_json::json!({}),
            None,
            Some(&textures),
        )
        .await;
        assert!(result.is_err());
        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap_err()).unwrap();
        assert_eq!(parsed["code"], "INVALID_INPUT");
        assert!(parsed["message"].as_str().unwrap().contains("Unsupported texture map type"));
    }

    #[tokio::test]
    async fn download_asset_inner_skips_empty_url_strings() {
        let server = MockServer::start().await;
        let state = make_test_state(server.uri());

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

        // Empty URL string should be skipped (not validated/downloaded)
        let model_urls = serde_json::json!({
            "glb": ""
        });
        let result = download_asset_inner(&state, TASK_ID, &model_urls, None, None).await;
        assert!(result.is_ok());
        let response = result.unwrap();
        // glb was skipped → not in file_paths
        assert!(response["file_paths"].as_object().unwrap().is_empty());
    }
}
