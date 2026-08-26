// MeshyForge — Meshy Provider Implementation
//
// This is the one file that knows about Meshy's specific API: endpoint paths,
// snake_case wire format, Bearer auth, and CDN host. Everything else in the
// backend talks to the TaskProvider trait, not to this file.
//
// Source: ADR-0004, docs/refactoring/implementation-artifacts.md

use crate::meshy::client::MeshyClient;
use crate::meshy::models::BalanceResponse;
use crate::provider::error::ProviderError;
use crate::provider::types::{TaskCreateResponse, TaskType};
use crate::provider::TaskProvider;
use async_trait::async_trait;
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

const ANIMATION_LIBRARY_URL: &str = "https://api.meshy.ai/web/public/animations/resources";

/// Recursively convert all JSON object keys from camelCase to snake_case.
/// The frontend sends camelCase keys (matching the TypeScript interfaces);
/// the Meshy API expects snake_case. This runs inside the provider impl
/// so the command layer doesn't need to know about wire-format conversion.
///
/// Moved from commands/api.rs per ADR-0004.
pub(crate) fn camel_to_snake_keys(value: &serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let mut out = serde_json::Map::new();
            for (key, val) in map {
                let snake = camel_to_snake(key);
                out.insert(snake, camel_to_snake_keys(val));
            }
            serde_json::Value::Object(out)
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(arr.iter().map(camel_to_snake_keys).collect())
        }
        other => other.clone(),
    }
}

/// Convert a single camelCase identifier to snake_case.
/// e.g. "imageUrl" -> "image_url", "aiModel" -> "ai_model".
pub(crate) fn camel_to_snake(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 4);
    for (i, ch) in s.chars().enumerate() {
        if ch.is_uppercase() && i > 0 {
            out.push('_');
        }
        out.push(ch.to_ascii_lowercase());
    }
    out
}

#[async_trait]
impl TaskProvider for MeshyClient {
    async fn create_task(
        &self,
        task_type: &TaskType,
        body: serde_json::Value,
    ) -> Result<TaskCreateResponse, ProviderError> {
        let endpoint = self.endpoint_for(task_type);
        let api_body = camel_to_snake_keys(&body);
        // Delegate to the existing MeshyClient method
        let response = MeshyClient::create_task(self, endpoint, &api_body).await?;
        // Map TaskCreateResponse from meshy::models to provider::types
        Ok(TaskCreateResponse {
            result: response.result,
        })
    }

    async fn get_task(
        &self,
        task_type: &TaskType,
        task_id: &str,
    ) -> Result<serde_json::Value, ProviderError> {
        let endpoint = self.endpoint_for(task_type);
        MeshyClient::get_task(self, endpoint, task_id)
            .await
            .map_err(ProviderError::from)
    }

    async fn cancel_task(
        &self,
        task_type: &TaskType,
        task_id: &str,
    ) -> Result<(), ProviderError> {
        let endpoint = self.endpoint_for(task_type);
        MeshyClient::delete_task(self, endpoint, task_id)
            .await
            .map_err(ProviderError::from)
    }

    async fn get_balance(&self) -> Result<i64, ProviderError> {
        let balance: BalanceResponse = MeshyClient::get_balance(self).await?;
        Ok(balance.balance)
    }

    async fn download_file(&self, url: &str, dest: &Path) -> Result<u64, ProviderError> {
        MeshyClient::download_file(self, url, dest)
            .await
            .map_err(ProviderError::from)
    }

    async fn stream_task(
        &self,
        task_type: &TaskType,
        task_id: &str,
        on_event: Box<dyn Fn(serde_json::Value) + Send>,
    ) -> Result<(), ProviderError> {
        let endpoint = self.endpoint_for(task_type);
        // The existing MeshyClient::stream_task takes `impl Fn`, which works
        // with `Box<dyn Fn>` since `Box<dyn Fn>` implements `Fn`.
        MeshyClient::stream_task(self, endpoint, task_id, on_event)
            .await
            .map_err(ProviderError::from)
    }

    async fn fetch_animation_library(&self) -> Result<serde_json::Value, ProviderError> {
        MeshyClient::http_get(self, ANIMATION_LIBRARY_URL)
            .await
            .map_err(ProviderError::from)
    }

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::meshy::client::MeshyClient;
    use wiremock::matchers::{body_json, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    const TASK_ID: &str = "018a210d-8ba4-705c-b111-1f1776f7f578";

    fn make_client(server_uri: String) -> MeshyClient {
        MeshyClient::with_base_url("msy_test_key".to_string(), server_uri)
    }

    // ─── endpoint_for ─────────────────────────────────────

    #[test]
    fn endpoint_for_returns_correct_path_for_all_task_types() {
        let client = make_client("http://localhost".to_string());

        assert_eq!(client.endpoint_for(&TaskType::TextTo3dPreview), "/v2/text-to-3d");
        assert_eq!(client.endpoint_for(&TaskType::TextTo3dRefine), "/v2/text-to-3d");
        assert_eq!(client.endpoint_for(&TaskType::ImageTo3d), "/v1/image-to-3d");
        assert_eq!(
            client.endpoint_for(&TaskType::MultiImageTo3d),
            "/v1/multi-image-to-3d"
        );
        assert_eq!(client.endpoint_for(&TaskType::Remesh), "/v1/remesh");
        assert_eq!(client.endpoint_for(&TaskType::Retexture), "/v1/retexture");
        assert_eq!(client.endpoint_for(&TaskType::Convert), "/v1/convert");
        assert_eq!(client.endpoint_for(&TaskType::Resize), "/v1/resize");
        assert_eq!(client.endpoint_for(&TaskType::UvUnwrap), "/v1/uv-unwrap");
        assert_eq!(client.endpoint_for(&TaskType::Rig), "/v1/rigging");
        assert_eq!(client.endpoint_for(&TaskType::Animate), "/v1/animation");
        assert_eq!(client.endpoint_for(&TaskType::TextToImage), "/v2/text-to-image");
        assert_eq!(client.endpoint_for(&TaskType::ImageToImage), "/v2/image-to-image");
        assert_eq!(
            client.endpoint_for(&TaskType::PrintMultiColor),
            "/v1/print/multi-color"
        );
        assert_eq!(client.endpoint_for(&TaskType::PrintAnalyze), "/v1/print/analyze");
        assert_eq!(client.endpoint_for(&TaskType::PrintRepair), "/v1/print/repair");
    }

    #[test]
    fn endpoint_for_creative_lab_all_map_to_text_to_3d() {
        let client = make_client("http://localhost".to_string());

        let creative_lab_types = [
            TaskType::CreativeLabKeychainPrototype,
            TaskType::CreativeLabKeychainBuild,
            TaskType::CreativeLabFridgeMagnetPrototype,
            TaskType::CreativeLabFridgeMagnetBuild,
            TaskType::CreativeLabFigurePrototype,
            TaskType::CreativeLabFigureBuild,
            TaskType::CreativeLabVinylFigurePrototype,
            TaskType::CreativeLabVinylFigureBuild,
            TaskType::CreativeLabBrickFigurePrototype,
            TaskType::CreativeLabBrickFigureBuild,
            TaskType::CreativeLabLampPrototype,
            TaskType::CreativeLabLampBuild,
            TaskType::CreativeLabKeycapPrototype,
            TaskType::CreativeLabKeycapBuild,
        ];
        for task_type in creative_lab_types {
            assert_eq!(
                client.endpoint_for(&task_type),
                "/v2/text-to-3d",
                "Creative Lab type {task_type:?} must map to /v2/text-to-3d"
            );
        }
    }

    // ─── allowed_download_hosts ───────────────────────────

    #[test]
    fn allowed_download_hosts_returns_meshy_cdn() {
        let client = make_client("http://localhost".to_string());
        assert_eq!(client.allowed_download_hosts(), &["assets.meshy.ai"]);
    }

    // ─── create_task through trait dispatch ───────────────

    #[tokio::test]
    async fn create_task_through_trait_converts_camel_case_to_snake_case() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/v1/image-to-3d"))
            .and(body_json(serde_json::json!({
                "image_url": "data:image/jpeg;base64,abc",
                "ai_model": "meshy-7",
                "should_texture": true
            })))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(serde_json::json!({"result": TASK_ID})),
            )
            .mount(&server)
            .await;

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;

        let body = serde_json::json!({
            "imageUrl": "data:image/jpeg;base64,abc",
            "aiModel": "meshy-7",
            "shouldTexture": true
        });
        let result = provider.create_task(&TaskType::ImageTo3d, body).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap().result, TASK_ID);
    }

    #[tokio::test]
    async fn get_task_through_trait_returns_raw_json() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path(format!("/v1/image-to-3d/{TASK_ID}")))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({
                    "id": TASK_ID,
                    "status": "SUCCEEDED",
                    "progress": 100
                })),
            )
            .mount(&server)
            .await;

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;

        let result = provider.get_task(&TaskType::ImageTo3d, TASK_ID).await;
        assert!(result.is_ok());
        let task = result.unwrap();
        assert_eq!(task["status"], "SUCCEEDED");
    }

    #[tokio::test]
    async fn cancel_task_through_trait_sends_delete() {
        let server = MockServer::start().await;
        Mock::given(method("DELETE"))
            .and(path(format!("/v2/text-to-3d/{TASK_ID}")))
            .respond_with(ResponseTemplate::new(200))
            .mount(&server)
            .await;

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;

        let result = provider.cancel_task(&TaskType::TextTo3dPreview, TASK_ID).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn get_balance_through_trait_returns_i64() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v1/balance"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({"balance": 750})),
            )
            .mount(&server)
            .await;

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;

        let result = provider.get_balance().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 750);
    }

    #[tokio::test]
    async fn provider_error_maps_from_meshy_error() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v1/balance"))
            .respond_with(ResponseTemplate::new(401))
            .mount(&server)
            .await;

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;

        let result = provider.get_balance().await;
        assert!(result.is_err());
        match result.unwrap_err() {
            ProviderError::ApiError { status, .. } => {
                assert_eq!(status, reqwest::StatusCode::UNAUTHORIZED);
            }
            _ => panic!("Expected ApiError"),
        }
    }

    // ─── camel_to_snake_keys (moved from commands/api.rs) ──

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
}