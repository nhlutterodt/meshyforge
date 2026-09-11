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
/// This is the only place endpoint paths are hardcoded — `commands/api.rs`'s
/// `endpoint_to_task_type()` and `commands/validation.rs`'s endpoint allowlist
/// both derive from this map rather than keeping their own copies, so the
/// three can no longer drift apart the way they did before (see
/// docs/LESSONS_LEARNED.md).
/// All 30 TaskType variants are covered.
pub(crate) const ENDPOINT_MAP: &[(TaskType, &str)] = &[
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
    (TaskType::Animate, "/v1/animations"),
    (TaskType::TextToImage, "/v1/text-to-image"),
    (TaskType::ImageToImage, "/v1/image-to-image"),
    (TaskType::PrintMultiColor, "/v1/print/multi-color"),
    (TaskType::PrintAnalyze, "/v1/print/analyze"),
    (TaskType::PrintRepair, "/v1/print/repair"),
    // ── Creative Lab (14 variants, each its own real endpoint) ──
    // TASK-0017: these previously all pointed at "/v2/text-to-3d" — a
    // placeholder that made every Creative Lab product silently fire a
    // generic Text-to-3D call. Corrected to the real per-product endpoints
    // per docs/feature_requirements_documentation.md FR-CLAB-01..07 (the
    // command-mapping table lists these exact paths, e.g.
    // "POST /creative-lab/keychain/v1/{prototype,build}").
    (
        TaskType::CreativeLabKeychainPrototype,
        "/creative-lab/keychain/v1/prototype",
    ),
    (
        TaskType::CreativeLabKeychainBuild,
        "/creative-lab/keychain/v1/build",
    ),
    (
        TaskType::CreativeLabFridgeMagnetPrototype,
        "/creative-lab/fridge-magnet/v1/prototype",
    ),
    (
        TaskType::CreativeLabFridgeMagnetBuild,
        "/creative-lab/fridge-magnet/v1/build",
    ),
    (
        TaskType::CreativeLabFigurePrototype,
        "/creative-lab/figure/v1/prototype",
    ),
    (
        TaskType::CreativeLabFigureBuild,
        "/creative-lab/figure/v1/build",
    ),
    (
        TaskType::CreativeLabVinylFigurePrototype,
        "/creative-lab/vinyl-figure/v1/prototype",
    ),
    (
        TaskType::CreativeLabVinylFigureBuild,
        "/creative-lab/vinyl-figure/v1/build",
    ),
    (
        TaskType::CreativeLabBrickFigurePrototype,
        "/creative-lab/brick-figure/v1/prototype",
    ),
    (
        TaskType::CreativeLabBrickFigureBuild,
        "/creative-lab/brick-figure/v1/build",
    ),
    (
        TaskType::CreativeLabLampPrototype,
        "/creative-lab/lamp/v1/prototype",
    ),
    (
        TaskType::CreativeLabLampBuild,
        "/creative-lab/lamp/v1/build",
    ),
    (
        TaskType::CreativeLabKeycapPrototype,
        "/creative-lab/keycap/v1/prototype",
    ),
    (
        TaskType::CreativeLabKeycapBuild,
        "/creative-lab/keycap/v1/build",
    ),
];

const DOWNLOAD_HOSTS: &[&str] = &["assets.meshy.ai"];

/// Hosts permitted for animation preview images only. Deliberately separate
/// from `DOWNLOAD_HOSTS` per ADR-0011 SEC-10 — a preview origin must never
/// widen the model/texture download allowlist that ADR-0002 pins.
const PREVIEW_HOSTS: &[&str] = &["cdn.meshy.ai"];

const ANIMATION_LIBRARY_PATH: &str = "/v1/animations/library";

/// The animation library is a documented endpoint under the standard `/openapi`
/// base URL (ADR-0011 SEC-11). Derived from the client's configured base URL so
/// tests can point it at a mock server via `with_base_url`.
fn animation_library_url(base_url: &str) -> String {
    format!("{base_url}{ANIMATION_LIBRARY_PATH}")
}

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
        let url = animation_library_url(self.base_url());
        let response = MeshyClient::http_get(self, &url)
            .await
            .map_err(ProviderError::from)?;
        // The documented `/v1/animations/library` endpoint returns a bare array.
        // The previously-used internal endpoint returned `{"animations": [...]}`.
        // Accept both so a provider-side shape change cannot black-screen the
        // picker again — see docs/LESSONS_LEARNED.md for the original crash.
        // Anything else degrades to an empty array rather than erroring.
        Ok(match response {
            serde_json::Value::Array(_) => response,
            serde_json::Value::Object(ref map) => map
                .get("animations")
                .filter(|value| value.is_array())
                .cloned()
                .unwrap_or_else(|| serde_json::Value::Array(Vec::new())),
            _ => serde_json::Value::Array(Vec::new()),
        })
    }

    fn allowed_download_hosts(&self) -> &[&str] {
        DOWNLOAD_HOSTS
    }

    fn allowed_preview_hosts(&self) -> &[&str] {
        PREVIEW_HOSTS
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
        assert_eq!(client.endpoint_for(&TaskType::Animate), "/v1/animations");
        assert_eq!(client.endpoint_for(&TaskType::TextToImage), "/v1/text-to-image");
        assert_eq!(client.endpoint_for(&TaskType::ImageToImage), "/v1/image-to-image");
        assert_eq!(
            client.endpoint_for(&TaskType::PrintMultiColor),
            "/v1/print/multi-color"
        );
        assert_eq!(client.endpoint_for(&TaskType::PrintAnalyze), "/v1/print/analyze");
        assert_eq!(client.endpoint_for(&TaskType::PrintRepair), "/v1/print/repair");
    }

    #[test]
    fn endpoint_for_creative_lab_maps_to_distinct_real_endpoints() {
        // TASK-0017 regression: these 14 variants previously all collapsed
        // onto "/v2/text-to-3d" (a decorative placeholder — see
        // docs/governance/grounding/2026-09-05-concept-07-product-template-engine.md).
        // Each must now resolve to its own real Creative Lab endpoint so
        // `validate_creation_body` can apply per-product rules and the
        // actual Meshy Creative Lab API is the one invoked.
        let client = make_client("http://localhost".to_string());

        let expected = [
            (
                TaskType::CreativeLabKeychainPrototype,
                "/creative-lab/keychain/v1/prototype",
            ),
            (
                TaskType::CreativeLabKeychainBuild,
                "/creative-lab/keychain/v1/build",
            ),
            (
                TaskType::CreativeLabFridgeMagnetPrototype,
                "/creative-lab/fridge-magnet/v1/prototype",
            ),
            (
                TaskType::CreativeLabFridgeMagnetBuild,
                "/creative-lab/fridge-magnet/v1/build",
            ),
            (
                TaskType::CreativeLabFigurePrototype,
                "/creative-lab/figure/v1/prototype",
            ),
            (
                TaskType::CreativeLabFigureBuild,
                "/creative-lab/figure/v1/build",
            ),
            (
                TaskType::CreativeLabVinylFigurePrototype,
                "/creative-lab/vinyl-figure/v1/prototype",
            ),
            (
                TaskType::CreativeLabVinylFigureBuild,
                "/creative-lab/vinyl-figure/v1/build",
            ),
            (
                TaskType::CreativeLabBrickFigurePrototype,
                "/creative-lab/brick-figure/v1/prototype",
            ),
            (
                TaskType::CreativeLabBrickFigureBuild,
                "/creative-lab/brick-figure/v1/build",
            ),
            (
                TaskType::CreativeLabLampPrototype,
                "/creative-lab/lamp/v1/prototype",
            ),
            (
                TaskType::CreativeLabLampBuild,
                "/creative-lab/lamp/v1/build",
            ),
            (
                TaskType::CreativeLabKeycapPrototype,
                "/creative-lab/keycap/v1/prototype",
            ),
            (
                TaskType::CreativeLabKeycapBuild,
                "/creative-lab/keycap/v1/build",
            ),
        ];
        for (task_type, endpoint) in expected {
            assert_eq!(
                client.endpoint_for(&task_type),
                endpoint,
                "Creative Lab type {task_type:?} must map to {endpoint}"
            );
        }

        // The 14 Creative Lab endpoints must be distinct from each other and
        // from "/v2/text-to-3d" (no more silent collision with Text-to-3D).
        let creative_lab_endpoints: Vec<&str> = expected.iter().map(|(_, path)| *path).collect();
        let mut deduped = creative_lab_endpoints.clone();
        deduped.sort_unstable();
        deduped.dedup();
        assert_eq!(
            creative_lab_endpoints.len(),
            deduped.len(),
            "Creative Lab endpoints must all be distinct"
        );
        assert!(!creative_lab_endpoints.contains(&"/v2/text-to-3d"));
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

    // ─── Endpoint path regressions ─────────────────────────
    // These pin the actual HTTP path hit for the three task types whose
    // paths previously drifted from Meshy's real API (see LESSONS_LEARNED.md):
    // Animate was singular ("/v1/animation") instead of plural, and
    // TextToImage/ImageToImage were on "/v2" instead of "/v1".

    #[tokio::test]
    async fn animate_task_hits_plural_animations_path() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/v1/animations"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({"result": TASK_ID})),
            )
            .mount(&server)
            .await;

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;
        let body = serde_json::json!({"rigTaskId": TASK_ID, "actionId": 92});

        let result = provider.create_task(&TaskType::Animate, body).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn text_to_image_task_hits_v1_path() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/v1/text-to-image"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({"result": TASK_ID})),
            )
            .mount(&server)
            .await;

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;
        let body = serde_json::json!({"aiModel": "nano-banana", "prompt": "a red teapot"});

        let result = provider.create_task(&TaskType::TextToImage, body).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn image_to_image_task_hits_v1_path() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/v1/image-to-image"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({"result": TASK_ID})),
            )
            .mount(&server)
            .await;

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;
        let body = serde_json::json!({
            "aiModel": "nano-banana",
            "prompt": "make it blue",
            "referenceImageUrls": ["data:image/png;base64,abc"]
        });

        let result = provider.create_task(&TaskType::ImageToImage, body).await;
        assert!(result.is_ok());
    }

    // ─── fetch_animation_library ───────────────────────────
    // The real endpoint returns `{"animations": [...]}`, not a bare array.
    // This is the test that would have caught the black-screen crash: the
    // frontend does `(library ?? []).map(...)`, which throws on an object.

    #[test]
    fn animation_library_url_derives_from_base_url() {
        assert_eq!(
            animation_library_url("https://api.meshy.ai/openapi"),
            "https://api.meshy.ai/openapi/v1/animations/library"
        );
        // Appends onto the raw base URL (e.g. a test server with no /openapi
        // suffix) rather than panicking.
        assert_eq!(
            animation_library_url("http://127.0.0.1:9999"),
            "http://127.0.0.1:9999/v1/animations/library"
        );
    }

    #[test]
    fn preview_hosts_are_separate_from_download_hosts() {
        let client = make_client("http://localhost".to_string());
        assert_eq!(client.allowed_preview_hosts(), &["cdn.meshy.ai"]);
        // ADR-0011 SEC-10: the preview origin must never leak into the
        // model/texture download allowlist pinned by ADR-0002.
        assert!(!client.allowed_download_hosts().contains(&"cdn.meshy.ai"));
    }

    #[tokio::test]
    async fn fetch_animation_library_unwraps_animations_key() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v1/animations/library"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "animations": [{"id": 1, "name": "walk", "category": "locomotion"}]
            })))
            .mount(&server)
            .await;

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;

        let result = provider.fetch_animation_library().await;
        assert!(result.is_ok());
        let value = result.unwrap();
        assert!(value.is_array(), "expected a bare array, got {value:?}");
        assert_eq!(value[0]["name"], "walk");
    }

    #[tokio::test]
    async fn fetch_animation_library_passes_through_bare_array() {
        // The documented /v1/animations/library endpoint returns a bare array.
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

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;

        let value = provider.fetch_animation_library().await.unwrap();
        assert!(value.is_array());
        assert_eq!(value[0]["action_id"], 92);
    }

    #[tokio::test]
    async fn fetch_animation_library_falls_back_to_empty_array_when_key_missing() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/v1/animations/library"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({})))
            .mount(&server)
            .await;

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;

        let result = provider.fetch_animation_library().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), serde_json::json!([]));
    }
}