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
use crate::provider::types::{
    ArtifactRole, TaskArtifact, TaskCreateResponse, TaskErrorSummary, TaskSnapshot,
    TaskSnapshotStatus, TaskType,
};
use crate::provider::TaskProvider;
use async_trait::async_trait;
use serde_json::Value;
use std::collections::BTreeSet;
use std::path::Path;

/// Meshy API endpoint path for each TaskType.
/// This is the only place endpoint paths are hardcoded — `commands/api.rs`'s
/// `endpoint_to_task_type()` and `commands/validation.rs`'s endpoint allowlist
/// both derive from this map rather than keeping their own copies, so the
/// three can no longer drift apart the way they did before (see
/// docs/LESSONS_LEARNED.md).
/// All 31 TaskType variants are covered.
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
    (TaskType::TextToMotion, "/v1/text-to-motion"),
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

    async fn cancel_task(&self, task_type: &TaskType, task_id: &str) -> Result<(), ProviderError> {
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

    /// ADR-0015 TPC-01: normalize a raw Meshy task JSON into a typed
    /// `TaskSnapshot`. Pure — no async, no I/O (see `snapshot_wire` helpers).
    fn snapshot(
        &self,
        task_type: &TaskType,
        raw: &serde_json::Value,
    ) -> Result<TaskSnapshot, ProviderError> {
        let obj = raw
            .as_object()
            .ok_or_else(|| normalization_error("task response is not a JSON object"))?;

        let id = obj
            .get("id")
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty())
            .ok_or_else(|| normalization_error("task response has no id"))?
            .to_string();

        let status = obj
            .get("status")
            .and_then(|v| serde_json::from_value::<TaskSnapshotStatus>(v.clone()).ok())
            .ok_or_else(|| {
                normalization_error(&format!(
                    "unknown task status: {}",
                    obj.get("status")
                        .and_then(Value::as_str)
                        .unwrap_or("<missing>")
                ))
            })?;

        // Numeric fields default to 0 when missing/null/non-numeric, mirroring
        // the `?? 0` guards in useActiveTaskPolling (LESSONS #10: explicit
        // nulls must not crash the parser).
        let num = |key: &str| obj.get(key).and_then(Value::as_i64).unwrap_or(0);

        let error = obj
            .get("task_error")
            .and_then(Value::as_object)
            .and_then(|te| {
                let message = te
                    .get("message")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                // code: task_error.code if present, else task_error.type, else empty.
                let code = te
                    .get("code")
                    .and_then(Value::as_str)
                    .or_else(|| te.get("type").and_then(Value::as_str))
                    .unwrap_or("")
                    .to_string();
                // Meshy sends `task_error: { "message": "" }` on success; an
                // all-empty error object degrades to None.
                if message.is_empty() && code.is_empty() {
                    None
                } else {
                    Some(TaskErrorSummary { code, message })
                }
            });

        let (artifacts, mut consumed, mut dropped) = normalize_artifacts(obj)?;
        // Documented, deliberate consumption of non-artifact URL fields:
        // thumbnail_url maps to a snapshot field; texture_urls stays in
        // provider_payload until step 3 (see the policy block below the impl);
        // task_error.doc_url is a documentation link, not a result URL, and
        // is deliberately not carried into TaskErrorSummary.
        consumed.insert("thumbnail_url".to_string());
        consumed.insert("texture_urls".to_string());
        consumed.insert("task_error.doc_url".to_string());

        // TASK-0031 property: every URL-bearing field the normalizer did not
        // recognize is reported by dotted NAME (never the URL, IPC-06).
        sweep_unknown_url_fields(raw, "", &consumed, &mut dropped);

        Ok(TaskSnapshot {
            id,
            task_type: task_type_wire(task_type),
            status,
            progress: num("progress"),
            error,
            consumed_credits: num("consumed_credits"),
            created_at: num("created_at"),
            started_at: num("started_at"),
            finished_at: num("finished_at"),
            thumbnail_url: url_field(obj.get("thumbnail_url")),
            artifacts,
            provider_payload: raw.clone(),
            dropped_fields: dropped.into_iter().collect(),
        })
    }
}

// ─── ADR-0015 step 1: snapshot normalization helpers ───────────────────
//
// URL-discard policy (TPC-03, the TASK-0031 evidence gate):
//   * Every recognized URL becomes exactly one artifact (no duplicates).
//   * PRIMARY wins: the (primary, format) slot is claimed in source order
//     model_urls → result.rigged_character_* → result.animation_*; a later
//     candidate for an already-claimed slot is NOT mapped and its field name
//     is recorded in dropped_fields. Unlike `flattenResultUrls`, processed_*
//     variants never fill the primary slot — the slot-collision workaround
//     existed only because a `format → url` map cannot hold two fbx
//     artifacts; the role-tagged snapshot can, so armature/fpsVariant/
//     formatVariant artifacts are retained by role instead (ADR-0015
//     Context, "data-model limit").
//   * `thumbnail_urls` and `alpha_thumbnail_url` are preview extras with no
//     snapshot field: they are NOT artifacts and land in dropped_fields
//     (names only). `texture_urls` (PBR map objects: base_color, metallic,
//     normal, roughness, emission) are deliberately NOT given invented
//     artifact roles in step 1 — they remain readable in provider_payload
//     until step 3's save_completed_task artifact work (TPC-06 retirement),
//     so they are marked consumed and do NOT appear in dropped_fields.
//   * Unknown `model_urls` keys are dropped-field entries, not errors
//     (mirrors `model_filename`'s closed-vocabulary rejection returning None).

/// Dotted-name sweep: any string under a `*_url` key, or any object/array
/// under a `*_urls`/`*_url` key, that the normalizer did not consume is
/// reported by field name. Meshy's wire is snake_case; camelCase keys are
/// not provider task-response vocabulary.
fn sweep_unknown_url_fields(
    value: &Value,
    prefix: &str,
    consumed: &BTreeSet<String>,
    dropped: &mut BTreeSet<String>,
) {
    match value {
        Value::Object(map) => {
            for (key, val) in map {
                let path = format!("{prefix}{key}");
                let is_url_key = key.ends_with("_url") || key.ends_with("_urls");
                match val {
                    Value::String(s)
                        if key.ends_with("_url")
                            && !s.trim().is_empty()
                            && !consumed.contains(&path) =>
                    {
                        dropped.insert(path);
                    }
                    other if (other.is_object() || other.is_array()) => {
                        if is_url_key && !consumed.contains(&path) {
                            // Report the container once; its leaves are not
                            // individually addressable by name (e.g.
                            // thumbnail_urls is keyed by pixel size).
                            dropped.insert(path);
                        } else {
                            sweep_unknown_url_fields(other, &format!("{path}."), consumed, dropped);
                        }
                    }
                    _ => {}
                }
            }
        }
        Value::Array(items) => {
            for item in items {
                sweep_unknown_url_fields(item, prefix, consumed, dropped);
            }
        }
        _ => {}
    }
}

fn url_field(value: Option<&Value>) -> Option<String> {
    value
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
}

fn normalization_error(message: &str) -> ProviderError {
    ProviderError::Json(serde_json::Error::io(std::io::Error::new(
        std::io::ErrorKind::InvalidData,
        message,
    )))
}

/// The task type's serde wire value (TPC-02 `taskType`). TaskType's serde is
/// infallible; the Debug fallback only guards against a future refactor.
fn task_type_wire(task_type: &TaskType) -> String {
    match serde_json::to_value(task_type) {
        Ok(Value::String(s)) => s,
        _ => format!("{task_type:?}"),
    }
}

/// Closed `model_urls` key vocabulary — the same allowlist
/// `commands::validation::model_filename` accepts (that module is private to
/// `commands`, so the rules are mirrored here deliberately; keep the two in
/// sync). `pre_remeshed_glb` is the role-qualified precedent (TPC-04).
fn model_url_slot(key: &str) -> Option<(ArtifactRole, &'static str)> {
    match key {
        "glb" => Some((ArtifactRole::Primary, "glb")),
        "fbx" => Some((ArtifactRole::Primary, "fbx")),
        "obj" => Some((ArtifactRole::Primary, "obj")),
        "mtl" => Some((ArtifactRole::Primary, "mtl")),
        "usdz" => Some((ArtifactRole::Primary, "usdz")),
        "stl" => Some((ArtifactRole::Primary, "stl")),
        "3mf" => Some((ArtifactRole::Primary, "3mf")),
        "blend" => Some((ArtifactRole::Primary, "blend")),
        // Text-to-Motion swift output (BVH motion capture file).
        "bvh" => Some((ArtifactRole::Primary, "bvh")),
        "pre_remeshed_glb" => Some((ArtifactRole::PreRemeshed, "glb")),
        _ => None,
    }
}

/// Nested `result` fields that map straight onto a role-tagged artifact
/// (animation lane, LESSONS #13 wire facts).
const NESTED_VARIANTS: &[(&str, ArtifactRole, &str)] = &[
    ("processed_usdz_url", ArtifactRole::FormatVariant, "usdz"),
    ("processed_armature_fbx_url", ArtifactRole::Armature, "fbx"),
    (
        "processed_animation_fps_fbx_url",
        ArtifactRole::FpsVariant,
        "fbx",
    ),
];

/// Nested `result` primary candidates in source order (PRIMARY wins on a
/// slot collision).
const NESTED_PRIMARY_CANDIDATES: &[(&str, &str)] = &[
    ("rigged_character_glb_url", "glb"),
    ("rigged_character_fbx_url", "fbx"),
    ("animation_glb_url", "glb"),
    ("animation_fbx_url", "fbx"),
];

/// Rig lane: `result.basic_animations` preset clips (17-rigging.md).
/// (suffix, role, format) per live-verified clip name.
const PRESET_CLIP_FIELDS: &[(&str, ArtifactRole, &str)] = &[
    ("_glb_url", ArtifactRole::PresetClip, "glb"),
    ("_fbx_url", ArtifactRole::PresetClip, "fbx"),
    ("_armature_glb_url", ArtifactRole::Armature, "glb"),
];
const PRESET_CLIP_NAMES: &[&str] = &["walking", "running"];

/// Replicates `commands::validation::sanitize_cache_key` (private module).
/// Allowlist-only: path separators, traversal sequences and every other
/// character are rejected by construction (TPC-03/TPC-04 label rule).
fn sanitize_artifact_label(label: &str) -> Result<String, ProviderError> {
    if label.is_empty() || label.chars().count() > 128 {
        return Err(normalization_error(
            "Artifact label must be between 1 and 128 characters.",
        ));
    }
    if !label
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Err(normalization_error(
            "Artifact label may contain only letters, digits, hyphen and underscore.",
        ));
    }
    Ok(label.to_string())
}

/// (artifacts, consumed dotted paths, dropped dotted names) — the working set
/// of `normalize_artifacts` / the URL sweep (kept out of the public API).
type ArtifactPass = (Vec<TaskArtifact>, BTreeSet<String>, BTreeSet<String>);

/// Build the role-tagged artifact list from a raw Meshy task object.
/// Returns (artifacts, consumed dotted paths, dropped dotted names).
fn normalize_artifacts(
    obj: &serde_json::Map<String, Value>,
) -> Result<ArtifactPass, ProviderError> {
    let mut artifacts: Vec<TaskArtifact> = Vec::new();
    let mut consumed: BTreeSet<String> = BTreeSet::new();
    let mut dropped: BTreeSet<String> = BTreeSet::new();
    // Formats whose Primary slot is claimed, in source order.
    let mut claimed_primary: BTreeSet<&'static str> = BTreeSet::new();

    // ── top-level model_urls (text/image-to-3d family) ──
    if let Some(map) = obj.get("model_urls").and_then(Value::as_object) {
        consumed.insert("model_urls".to_string());
        for (key, value) in map {
            let path = format!("model_urls.{key}");
            consumed.insert(path.clone());
            let slot = model_url_slot(key);
            let url = url_field(Some(value));
            match (slot, url) {
                (Some((ArtifactRole::Primary, fmt)), Some(url)) => {
                    if claimed_primary.insert(fmt) {
                        artifacts.push(TaskArtifact {
                            role: ArtifactRole::Primary,
                            format: fmt.to_string(),
                            label: None,
                            url,
                        });
                    } else {
                        dropped.insert(path);
                    }
                }
                (Some((role, fmt)), Some(url)) => artifacts.push(TaskArtifact {
                    role,
                    format: fmt.to_string(),
                    label: None,
                    url,
                }),
                // Unrecognized key or empty/non-string value: name-only drop,
                // not an error (closed-vocabulary precedent of model_filename).
                _ => {
                    dropped.insert(path);
                }
            }
        }
    }

    // ── nested result (rig / animate / text-to-motion lanes) ──
    if let Some(res) = obj.get("result").and_then(Value::as_object) {
        consumed.insert("result".to_string());
        for &(key, fmt) in NESTED_PRIMARY_CANDIDATES {
            let path = format!("result.{key}");
            if let Some(url) = url_field(res.get(key)) {
                consumed.insert(path.clone());
                if claimed_primary.insert(fmt) {
                    artifacts.push(TaskArtifact {
                        role: ArtifactRole::Primary,
                        format: fmt.to_string(),
                        label: None,
                        url,
                    });
                } else {
                    // PRIMARY wins over later candidates for the same format.
                    dropped.insert(path);
                }
            }
        }
        for &(key, role, fmt) in NESTED_VARIANTS {
            let path = format!("result.{key}");
            if let Some(url) = url_field(res.get(key)) {
                consumed.insert(path);
                artifacts.push(TaskArtifact {
                    role,
                    format: fmt.to_string(),
                    label: None,
                    url,
                });
            }
        }
        // text-to-motion: prime → fbx, swift → bvh; motion_format is the
        // authoritative key, and a missing motion_format defaults to fbx
        // (the documented gap preserved from flattenResultUrls).
        if let Some(url) = url_field(res.get("motion_url")) {
            let fmt = if res.get("motion_format").and_then(Value::as_str) == Some("bvh") {
                "bvh"
            } else {
                "fbx"
            };
            consumed.insert("result.motion_url".to_string());
            consumed.insert("result.motion_format".to_string());
            artifacts.push(TaskArtifact {
                role: ArtifactRole::Motion,
                format: fmt.to_string(),
                label: None,
                url,
            });
        }
        // rig lane: basic_animations preset clips, label = clip name.
        if let Some(ba) = res.get("basic_animations").and_then(Value::as_object) {
            consumed.insert("result.basic_animations".to_string());
            for name in PRESET_CLIP_NAMES {
                let label = sanitize_artifact_label(name)?;
                for &(suffix, role, fmt) in PRESET_CLIP_FIELDS {
                    let key = format!("{name}{suffix}");
                    let path = format!("result.basic_animations.{key}");
                    if let Some(url) = url_field(ba.get(&key)) {
                        consumed.insert(path);
                        artifacts.push(TaskArtifact {
                            role,
                            format: fmt.to_string(),
                            label: Some(label.clone()),
                            url,
                        });
                    }
                }
            }
        }
    }

    Ok((artifacts, consumed, dropped))
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

        assert_eq!(
            client.endpoint_for(&TaskType::TextTo3dPreview),
            "/v2/text-to-3d"
        );
        assert_eq!(
            client.endpoint_for(&TaskType::TextTo3dRefine),
            "/v2/text-to-3d"
        );
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
        assert_eq!(
            client.endpoint_for(&TaskType::TextToMotion),
            "/v1/text-to-motion"
        );
        assert_eq!(
            client.endpoint_for(&TaskType::TextToImage),
            "/v1/text-to-image"
        );
        assert_eq!(
            client.endpoint_for(&TaskType::ImageToImage),
            "/v1/image-to-image"
        );
        assert_eq!(
            client.endpoint_for(&TaskType::PrintMultiColor),
            "/v1/print/multi-color"
        );
        assert_eq!(
            client.endpoint_for(&TaskType::PrintAnalyze),
            "/v1/print/analyze"
        );
        assert_eq!(
            client.endpoint_for(&TaskType::PrintRepair),
            "/v1/print/repair"
        );
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
                ResponseTemplate::new(200).set_body_json(serde_json::json!({"result": TASK_ID})),
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
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": TASK_ID,
                "status": "SUCCEEDED",
                "progress": 100
            })))
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

        let result = provider
            .cancel_task(&TaskType::TextTo3dPreview, TASK_ID)
            .await;
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
    // ─── Text-to-motion + animation variants (ADR-0012) ──────

    #[tokio::test]
    async fn text_to_motion_create_hits_v1_path_with_snake_case_body() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/v1/text-to-motion"))
            .and(body_json(serde_json::json!({
                "prompt": "a slow kata",
                "mode": "prime",
                "duration": 2.5
            })))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({"result": TASK_ID})),
            )
            .mount(&server)
            .await;

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;
        let body = serde_json::json!({"prompt": "a slow kata", "mode": "prime", "duration": 2.5});

        let result = provider.create_task(&TaskType::TextToMotion, body).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap().result, TASK_ID);
    }

    #[tokio::test]
    async fn text_to_motion_retrieve_hits_v1_path_with_nested_result() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path(format!("/v1/text-to-motion/{TASK_ID}")))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "id": TASK_ID,
                "status": "SUCCEEDED",
                "progress": 100,
                "result": {
                    "motion_url": "https://assets.meshy.ai/x/motion.fbx",
                    "motion_format": "fbx",
                    "duration_ms": 2500,
                    "mode": "prime"
                }
            })))
            .mount(&server)
            .await;

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;
        let result = provider.get_task(&TaskType::TextToMotion, TASK_ID).await;
        assert!(result.is_ok());
        let task = result.unwrap();
        assert_eq!(
            task["result"]["motion_url"],
            "https://assets.meshy.ai/x/motion.fbx"
        );
        assert_eq!(task["result"]["motion_format"], "fbx");
        assert_eq!(task["result"]["duration_ms"], 2500);
    }

    #[tokio::test]
    async fn animation_retarget_hits_animations_path_with_motion_task_id() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/v1/animations"))
            .and(body_json(serde_json::json!({
                "rig_task_id": TASK_ID,
                "motion_task_id": TASK_ID
            })))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({"result": TASK_ID})),
            )
            .mount(&server)
            .await;

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;
        let body = serde_json::json!({"rigTaskId": TASK_ID, "motionTaskId": TASK_ID});
        let result = provider.create_task(&TaskType::Animate, body).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn animation_merge_hits_animations_path_with_action_ids() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/v1/animations"))
            .and(body_json(serde_json::json!({
                "rig_task_id": TASK_ID,
                "action_ids": [92, 93, 94]
            })))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(serde_json::json!({"result": TASK_ID})),
            )
            .mount(&server)
            .await;

        let client = make_client(server.uri());
        let provider: &dyn TaskProvider = &client;
        let body = serde_json::json!({"rigTaskId": TASK_ID, "actionIds": [92, 93, 94]});
        let result = provider.create_task(&TaskType::Animate, body).await;
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

    // ─── ADR-0015 step 1: snapshot normalization ─────────────────────
    //
    // Fixtures mirror the live-verified wire shapes (docs/LESSONS_LEARNED.md
    // #13) and the frontend expectations encoded in useActiveTaskPolling's
    // flattenResultUrls tests — but with role-tagged artifacts, which the
    // format→url map could not express.

    fn snap(provider: &dyn TaskProvider, tt: TaskType, raw: serde_json::Value) -> TaskSnapshot {
        provider.snapshot(&tt, &raw).unwrap()
    }

    fn artifact<'a>(
        snap: &'a TaskSnapshot,
        role: ArtifactRole,
        format: &str,
        label: Option<&str>,
    ) -> &'a TaskArtifact {
        snap.artifacts
            .iter()
            .find(|a| a.role == role && a.format == format && a.label.as_deref() == label)
            .unwrap_or_else(|| {
                panic!(
                    "no artifact role={role:?} format={format} label={label:?} in {:?}",
                    snap.artifacts
                )
            })
    }

    #[test]
    fn snapshot_maps_model_urls_family() {
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let raw = serde_json::json!({
            "id": "t-3d",
            "type": "text-to-3d",
            "status": "SUCCEEDED",
            "progress": 100,
            "consumed_credits": 25,
            "created_at": 1000,
            "started_at": 1010,
            "finished_at": 1100,
            "thumbnail_url": "https://assets.meshy.ai/t3d/thumb.png",
            "model_urls": {
                "glb": "https://assets.meshy.ai/t3d/model.glb",
                "obj": "https://assets.meshy.ai/t3d/model.obj",
                "pre_remeshed_glb": "https://assets.meshy.ai/t3d/pre.glb"
            },
            "task_error": { "message": "" }
        });
        let snap_res = snap(provider, TaskType::TextTo3dPreview, raw.clone());
        assert_eq!(snap_res.id, "t-3d");
        // TPC-02: taskType is the serde wire value passed in.
        assert_eq!(snap_res.task_type, "text-to-3d-preview");
        assert_eq!(snap_res.status, TaskSnapshotStatus::Succeeded);
        assert_eq!(snap_res.progress, 100);
        assert_eq!(snap_res.consumed_credits, 25);
        assert_eq!(
            (
                snap_res.created_at,
                snap_res.started_at,
                snap_res.finished_at
            ),
            (1000, 1010, 1100)
        );
        assert_eq!(
            snap_res.thumbnail_url.as_deref(),
            Some("https://assets.meshy.ai/t3d/thumb.png")
        );
        // An all-empty task_error degrades to None, not Some(empty).
        assert!(snap_res.error.is_none());
        assert_eq!(
            artifact(&snap_res, ArtifactRole::Primary, "glb", None).url,
            "https://assets.meshy.ai/t3d/model.glb"
        );
        assert_eq!(
            artifact(&snap_res, ArtifactRole::Primary, "obj", None).url,
            "https://assets.meshy.ai/t3d/model.obj"
        );
        // pre_remeshed_glb precedent → role-tagged preRemeshed artifact.
        assert_eq!(
            artifact(&snap_res, ArtifactRole::PreRemeshed, "glb", None).url,
            "https://assets.meshy.ai/t3d/pre.glb"
        );
        assert_eq!(snap_res.artifacts.len(), 3);
        assert!(snap_res.dropped_fields.is_empty());
        // TPC-06: provider_payload preserved verbatim.
        assert_eq!(snap_res.provider_payload, raw);
    }

    #[test]
    fn snapshot_maps_rig_lane_with_preset_clips() {
        // Fixture shape from Meshy_Documentation/17-rigging.md (live-verified).
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let raw = serde_json::json!({
            "id": "018b314a-a1b5-716d-c222-2f1776f7f579",
            "type": "rig",
            "status": "SUCCEEDED",
            "created_at": 1747032400453i64,
            "progress": 100,
            "started_at": 1747032401314i64,
            "finished_at": 1747032418417i64,
            "expires_at": 1747291618417i64,
            "task_error": { "message": "" },
            "consumed_credits": 5,
            "result": {
                "rigged_character_fbx_url": "https://assets.meshy.ai/r/Character.fbx",
                "rigged_character_glb_url": "https://assets.meshy.ai/r/Character.glb",
                "basic_animations": {
                    "walking_glb_url": "https://assets.meshy.ai/r/Walking.glb",
                    "walking_fbx_url": "https://assets.meshy.ai/r/Walking.fbx",
                    "walking_armature_glb_url": "https://assets.meshy.ai/r/Walking_armature.glb",
                    "running_glb_url": "https://assets.meshy.ai/r/Running.glb",
                    "running_fbx_url": "https://assets.meshy.ai/r/Running.fbx",
                    "running_armature_glb_url": "https://assets.meshy.ai/r/Running_armature.glb"
                }
            },
            "preceding_tasks": 0
        });
        let s = snap(provider, TaskType::Rig, raw);
        assert_eq!(s.task_type, "rig");
        assert_eq!(
            artifact(&s, ArtifactRole::Primary, "glb", None).url,
            "https://assets.meshy.ai/r/Character.glb"
        );
        assert_eq!(
            artifact(&s, ArtifactRole::Primary, "fbx", None).url,
            "https://assets.meshy.ai/r/Character.fbx"
        );
        assert_eq!(
            artifact(&s, ArtifactRole::PresetClip, "glb", Some("walking")).url,
            "https://assets.meshy.ai/r/Walking.glb"
        );
        assert_eq!(
            artifact(&s, ArtifactRole::PresetClip, "fbx", Some("running")).url,
            "https://assets.meshy.ai/r/Running.fbx"
        );
        assert_eq!(
            artifact(&s, ArtifactRole::Armature, "glb", Some("walking")).url,
            "https://assets.meshy.ai/r/Walking_armature.glb"
        );
        assert_eq!(
            artifact(&s, ArtifactRole::Armature, "glb", Some("running")).url,
            "https://assets.meshy.ai/r/Running_armature.glb"
        );
        // 2 primary + 4 preset clips + 2 armatures = 8, none discarded.
        assert_eq!(s.artifacts.len(), 8);
        assert!(s.dropped_fields.is_empty());
    }

    #[test]
    fn snapshot_maps_animate_nested_result() {
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let raw = serde_json::json!({
            "id": "t-anim",
            "status": "SUCCEEDED",
            "progress": 100,
            "consumed_credits": 3,
            "created_at": 1000,
            "started_at": 1010,
            "finished_at": 1100,
            "result": {
                "animation_glb_url": "https://assets.meshy.ai/x/a.glb",
                "animation_fbx_url": "https://assets.meshy.ai/x/a.fbx",
                "processed_usdz_url": "https://assets.meshy.ai/x/a.usdz"
            }
        });
        let s = snap(provider, TaskType::Animate, raw);
        assert_eq!(s.task_type, "animate");
        assert_eq!(
            artifact(&s, ArtifactRole::Primary, "glb", None).url,
            "https://assets.meshy.ai/x/a.glb"
        );
        assert_eq!(
            artifact(&s, ArtifactRole::Primary, "fbx", None).url,
            "https://assets.meshy.ai/x/a.fbx"
        );
        assert_eq!(
            artifact(&s, ArtifactRole::FormatVariant, "usdz", None).url,
            "https://assets.meshy.ai/x/a.usdz"
        );
        assert!(s.dropped_fields.is_empty());
    }

    #[test]
    fn snapshot_primary_wins_and_variants_survive() {
        // TASK-0031 "no URL discarded": the flattenResultUrls guard dropped
        // processed fbx variants when the primary fbx existed. With roles,
        // primary keeps its URL and every variant is retained separately.
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let raw = serde_json::json!({
            "id": "t-anim2",
            "status": "SUCCEEDED",
            "progress": 100,
            "consumed_credits": 3,
            "created_at": 1000,
            "started_at": 1010,
            "finished_at": 1100,
            "result": {
                "animation_glb_url": "https://assets.meshy.ai/x/a.glb",
                "animation_fbx_url": "https://assets.meshy.ai/x/a.fbx",
                "processed_armature_fbx_url": "https://assets.meshy.ai/x/arm.fbx",
                "processed_animation_fps_fbx_url": "https://assets.meshy.ai/x/fps.fbx"
            }
        });
        let s = snap(provider, TaskType::Animate, raw);
        assert_eq!(
            artifact(&s, ArtifactRole::Primary, "fbx", None).url,
            "https://assets.meshy.ai/x/a.fbx",
            "PRIMARY must win over processed variants for the same format"
        );
        assert_eq!(
            artifact(&s, ArtifactRole::Armature, "fbx", None).url,
            "https://assets.meshy.ai/x/arm.fbx"
        );
        assert_eq!(
            artifact(&s, ArtifactRole::FpsVariant, "fbx", None).url,
            "https://assets.meshy.ai/x/fps.fbx"
        );
        assert_eq!(s.artifacts.len(), 4);
        assert!(s.dropped_fields.is_empty());
    }

    #[test]
    fn snapshot_primary_slot_collision_reports_drop_not_error() {
        // A second source for the same primary format (model_urls.glb plus
        // result.animation_glb_url) cannot both be primary: the later field
        // is reported by NAME (never URL, IPC-06), never silently discarded.
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let raw = serde_json::json!({
            "id": "t-clash",
            "status": "SUCCEEDED",
            "progress": 100,
            "consumed_credits": 1,
            "created_at": 1000,
            "started_at": 1010,
            "finished_at": 1100,
            "model_urls": { "glb": "https://assets.meshy.ai/x/first.glb" },
            "result": { "animation_glb_url": "https://assets.meshy.ai/x/second.glb" }
        });
        let s = snap(provider, TaskType::Animate, raw);
        assert_eq!(
            artifact(&s, ArtifactRole::Primary, "glb", None).url,
            "https://assets.meshy.ai/x/first.glb"
        );
        assert_eq!(s.dropped_fields, vec!["result.animation_glb_url"]);
    }

    #[test]
    fn snapshot_maps_text_to_motion_prime_to_fbx() {
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let raw = serde_json::json!({
            "id": "01a0afee-6d9a-7031-b6c2-5107c6adf3f5",
            "status": "SUCCEEDED",
            "progress": 100,
            "consumed_credits": 10,
            "created_at": 1000,
            "started_at": 1010,
            "finished_at": 1100,
            "result": {
                "motion_url": "https://assets.meshy.ai/x/motion.fbx",
                "motion_format": "fbx",
                "duration_ms": 2500,
                "mode": "prime"
            }
        });
        let s = snap(provider, TaskType::TextToMotion, raw);
        assert_eq!(s.task_type, "text-to-motion");
        assert_eq!(
            artifact(&s, ArtifactRole::Motion, "fbx", None).url,
            "https://assets.meshy.ai/x/motion.fbx"
        );
        assert!(s.dropped_fields.is_empty());
    }

    #[test]
    fn snapshot_maps_text_to_motion_swift_to_bvh() {
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let raw = serde_json::json!({
            "id": "01a0aff5-18f9-76dd-b995-ad5992a581b7",
            "status": "SUCCEEDED",
            "progress": 100,
            "consumed_credits": 3,
            "created_at": 1000,
            "started_at": 1010,
            "finished_at": 1100,
            "result": {
                "motion_url": "https://assets.meshy.ai/x/motion.bvh",
                "motion_format": "bvh",
                "duration_ms": 2500,
                "mode": "swift"
            }
        });
        let s = snap(provider, TaskType::TextToMotion, raw);
        assert_eq!(
            artifact(&s, ArtifactRole::Motion, "bvh", None).url,
            "https://assets.meshy.ai/x/motion.bvh"
        );
        assert!(s.dropped_fields.is_empty());
    }

    #[test]
    fn snapshot_motion_without_format_defaults_to_fbx() {
        // Documented gap preserved from flattenResultUrls: missing
        // motion_format falls back to fbx, not an error.
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let raw = serde_json::json!({
            "id": "t-motion-nofmt",
            "status": "SUCCEEDED",
            "progress": 100,
            "consumed_credits": 3,
            "created_at": 1000,
            "started_at": 1010,
            "finished_at": 1100,
            "result": {
                "motion_url": "https://assets.meshy.ai/x/motion.bvh",
                "duration_ms": 2500,
                "mode": "swift"
            }
        });
        let s = snap(provider, TaskType::TextToMotion, raw);
        assert_eq!(
            artifact(&s, ArtifactRole::Motion, "fbx", None).url,
            "https://assets.meshy.ai/x/motion.bvh"
        );
    }

    #[test]
    fn snapshot_unknown_status_is_normalization_error() {
        // TPC-02: unknown provider status strings are errors, not defaults.
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let raw = serde_json::json!({
            "id": "t-x",
            "status": "WORKING_ON_IT",
            "progress": 50,
            "consumed_credits": 0,
            "created_at": 0,
            "started_at": 0,
            "finished_at": 0
        });
        let err = provider.snapshot(&TaskType::Animate, &raw).unwrap_err();
        assert!(
            err.to_string().contains("unknown task status"),
            "unexpected error: {err}"
        );
    }

    #[test]
    fn snapshot_missing_id_is_error() {
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let err = provider
            .snapshot(
                &TaskType::Animate,
                &serde_json::json!({ "status": "PENDING" }),
            )
            .unwrap_err();
        assert!(err.to_string().contains("no id"), "unexpected error: {err}");
        let err = provider
            .snapshot(&TaskType::Animate, &serde_json::json!("not-an-object"))
            .unwrap_err();
        assert!(
            err.to_string().contains("not a JSON object"),
            "unexpected error: {err}"
        );
    }

    #[test]
    fn snapshot_no_result_url_silently_dropped() {
        // TASK-0031 evidence gate: every URL-bearing field is either mapped
        // or reported by NAME. Never by URL (IPC-06).
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let secret = "https://assets.meshy.ai/x/mystery.glb?Signature=REDACTED";
        let raw = serde_json::json!({
            "id": "t-unknown",
            "status": "SUCCEEDED",
            "progress": 100,
            "consumed_credits": 0,
            "created_at": 1000,
            "started_at": 1010,
            "finished_at": 1100,
            "model_urls": { "glb": "https://assets.meshy.ai/x/m.glb", "tga": secret },
            "result": {
                "animation_glb_url": "https://assets.meshy.ai/x/a.glb",
                "bonus_clip_url": secret
            },
            "alpha_thumbnail_url": "https://assets.meshy.ai/x/alpha.png",
            "thumbnail_urls": { "256": "https://assets.meshy.ai/x/t256.png" }
        });
        let s = snap(provider, TaskType::Animate, raw);
        assert!(s
            .dropped_fields
            .contains(&"result.bonus_clip_url".to_string()));
        assert!(s.dropped_fields.contains(&"model_urls.tga".to_string()));
        assert!(s
            .dropped_fields
            .contains(&"alpha_thumbnail_url".to_string()));
        assert!(s.dropped_fields.contains(&"thumbnail_urls".to_string()));
        // Names only — no URL may leak into the debug list (IPC-06).
        for name in &s.dropped_fields {
            assert!(
                !name.contains("REDACTED"),
                "URL leaked into dropped_fields: {name}"
            );
            assert!(
                !name.contains("http"),
                "URL leaked into dropped_fields: {name}"
            );
        }
        // dropped_fields never crosses IPC either (#[serde(skip)]).
        let value = serde_json::to_value(&s).unwrap();
        assert!(value.get("droppedFields").is_none());
        // The recognized URLs are still artifacts.
        assert_eq!(
            artifact(&s, ArtifactRole::Primary, "glb", None).url,
            "https://assets.meshy.ai/x/m.glb"
        );
    }

    #[test]
    fn snapshot_texture_urls_stay_in_provider_payload() {
        // Step-1 policy: PBR texture maps are not given invented artifact
        // roles; they remain readable in providerPayload until step 3.
        // Deliberately NOT reported as dropped fields.
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let raw = serde_json::json!({
            "id": "t-texture",
            "status": "SUCCEEDED",
            "progress": 100,
            "consumed_credits": 0,
            "created_at": 1000,
            "started_at": 1010,
            "finished_at": 1100,
            "texture_urls": [{ "base_color": "https://assets.meshy.ai/x/base.png", "metallic": null }]
        });
        let s = snap(provider, TaskType::Retexture, raw);
        assert!(s.dropped_fields.is_empty());
        assert_eq!(
            s.provider_payload["texture_urls"][0]["base_color"],
            "https://assets.meshy.ai/x/base.png"
        );
    }

    #[test]
    fn snapshot_null_tolerant_pending_task() {
        // LESSONS #13 root cause 2: explicit nulls (result, thumbnail,
        // numeric gaps) must not crash the parser.
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let raw = serde_json::json!({
            "id": "t-pending",
            "status": "IN_PROGRESS",
            "progress": null,
            "result": null,
            "thumbnail_url": null,
            "consumed_credits": null,
            "created_at": 1000
        });
        let s = snap(provider, TaskType::TextToMotion, raw);
        assert_eq!(s.status, TaskSnapshotStatus::InProgress);
        assert_eq!(s.progress, 0);
        assert_eq!(s.consumed_credits, 0);
        assert_eq!(s.started_at, 0);
        assert_eq!(s.finished_at, 0);
        assert!(s.thumbnail_url.is_none());
        assert!(s.artifacts.is_empty());
        assert!(s.dropped_fields.is_empty());
    }

    #[test]
    fn snapshot_maps_task_error_code_type_and_message() {
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let raw = serde_json::json!({
            "id": "t-fail",
            "status": "FAILED",
            "progress": 0,
            "consumed_credits": 0,
            "created_at": 1000,
            "started_at": 1010,
            "finished_at": 1100,
            "task_error": { "message": "no faces", "type": "InvalidRequest", "code": "E42" }
        });
        let s = snap(provider, TaskType::Remesh, raw);
        assert_eq!(s.status, TaskSnapshotStatus::Failed);
        let err = s.error.clone().unwrap();
        assert_eq!(err.code, "E42");
        assert_eq!(err.message, "no faces");

        // code falls back to task_error.type when absent.
        let raw2 = serde_json::json!({
            "id": "t-fail2",
            "status": "CANCELED",
            "progress": 0,
            "consumed_credits": 0,
            "created_at": 0,
            "started_at": 0,
            "finished_at": 0,
            "task_error": { "message": "user cancel", "type": "Canceled" }
        });
        let s2 = snap(provider, TaskType::Remesh, raw2);
        assert_eq!(s2.status, TaskSnapshotStatus::Canceled);
        assert_eq!(s2.error.clone().unwrap().code, "Canceled");
    }

    #[test]
    fn snapshot_label_sanitization_rejects_path_separators() {
        // TPC-03/TPC-04: labels use the sanitize_cache_key rules — an
        // allowlist, so separators, traversal and spaces cannot survive.
        assert!(sanitize_artifact_label("walking").is_ok());
        assert!(sanitize_artifact_label("Left_Jab_from_Guard").is_ok());
        assert!(sanitize_artifact_label("run-2").is_ok());
        assert!(sanitize_artifact_label("").is_err());
        assert!(sanitize_artifact_label("a/b").is_err());
        assert!(sanitize_artifact_label("a\\b").is_err());
        assert!(sanitize_artifact_label("a.b").is_err());
        assert!(sanitize_artifact_label("../evil").is_err());
        assert!(sanitize_artifact_label(&"a".repeat(129)).is_err());
    }

    #[test]
    fn snapshot_provider_payload_is_verbatim() {
        let client = make_client("http://localhost".to_string());
        let provider: &dyn TaskProvider = &client;
        let raw = serde_json::json!({
            "id": "t-payload",
            "status": "PENDING",
            "progress": 5,
            "consumed_credits": 0,
            "created_at": 1,
            "started_at": 2,
            "finished_at": 3,
            "prompt": "a red chair",
            "weird_nested": { "keep": [1, 2, 3] }
        });
        let s = snap(provider, TaskType::TextTo3dRefine, raw.clone());
        assert_eq!(s.provider_payload, raw);
        assert_eq!(s.task_type, "text-to-3d-refine");
    }
}
