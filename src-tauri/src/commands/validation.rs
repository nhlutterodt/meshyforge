use crate::provider::types::ArtifactRole;
use reqwest::Url;
use serde_json::Value;
use uuid::Uuid;

const MAX_PROMPT_CHARS: usize = 600;

/// Upper bound on a caller-supplied asset page size (DAT-01). The catalog's
/// `gallery_page_size` is 50; this cap allows a caller to request one larger
/// page (the non-gallery consumers do, to see every asset without paging)
/// while still refusing an unbounded value that would re-create the
/// fetch-the-whole-table behavior pagination exists to remove.
pub const MAX_ASSET_PAGE_SIZE: i64 = 500;

/// Default page size when the caller omits `limit` (TDD §16.1
/// `gallery_page_size`).
pub const DEFAULT_ASSET_PAGE_SIZE: i64 = 50;

/// Validate a requested page window before it reaches SQL.
///
/// Both fields are optional so a caller can opt out of paging by omitting
/// them. Both are rejected rather than silently coerced when out of range:
/// a limit below 1, above `MAX_ASSET_PAGE_SIZE`, or a negative offset is a
/// caller bug, and an IPC boundary that quietly rewrites an invalid request
/// hides that bug from whoever wrote it (IPC-04, VAL-01 fail-closed).
pub fn validate_page_window(limit: Option<i64>, offset: Option<i64>) -> Result<(), &'static str> {
    if let Some(limit) = limit {
        if limit < 1 {
            return Err("Page limit must be at least 1.");
        }
        if limit > MAX_ASSET_PAGE_SIZE {
            return Err("Page limit exceeds the maximum allowed page size.");
        }
    }
    if let Some(offset) = offset {
        if offset < 0 {
            return Err("Page offset must not be negative.");
        }
    }
    Ok(())
}

/// Endpoint allowlist for `validate_task_reference`. Derived from
/// `provider::meshy::ENDPOINT_MAP` — the single canonical endpoint list —
/// rather than keeping its own hardcoded copy. This is the ADR-0004
/// consequence ("validation.rs endpoint allowlist moves from a hardcoded
/// TASK_ENDPOINTS const array to a provider-supplied endpoint_for(TaskType)
/// method") that was decided but never implemented; the resulting drift
/// between three independent copies of this list is documented in
/// docs/LESSONS_LEARNED.md.
fn task_endpoints() -> Vec<&'static str> {
    let mut endpoints: Vec<&'static str> = crate::provider::meshy::ENDPOINT_MAP
        .iter()
        .map(|(_, path)| *path)
        .collect();
    endpoints.sort_unstable();
    endpoints.dedup();
    endpoints
}

fn field<'a>(body: &'a Value, names: &[&str]) -> Option<&'a Value> {
    names.iter().find_map(|name| body.get(name))
}

fn nonempty_string(body: &Value, names: &[&str]) -> bool {
    field(body, names)
        .and_then(Value::as_str)
        .is_some_and(|value| !value.trim().is_empty())
}

fn has_source(body: &Value) -> bool {
    nonempty_string(body, &["inputTaskId", "input_task_id"])
        || nonempty_string(body, &["modelUrl", "model_url"])
}

fn validate_prompt_fields(body: &Value) -> Result<(), &'static str> {
    for names in [
        &["prompt"][..],
        &["texturePrompt", "texture_prompt"][..],
        &["textStylePrompt", "text_style_prompt"][..],
    ] {
        if let Some(value) = field(body, names) {
            let text = value.as_str().ok_or("Prompt fields must be strings.")?;
            if text.chars().count() > MAX_PROMPT_CHARS {
                return Err("Prompts must not exceed 600 characters.");
            }
        }
    }
    Ok(())
}

fn validate_task_id_fields(body: &Value) -> Result<(), &'static str> {
    for names in [
        &["inputTaskId", "input_task_id"][..],
        &["previewTaskId", "preview_task_id"][..],
        &["rigTaskId", "rig_task_id"][..],
    ] {
        if let Some(value) = field(body, names) {
            validate_task_id(value.as_str().ok_or("Task IDs must be strings.")?)?;
        }
    }
    Ok(())
}

fn validate_numeric_fields(body: &Value) -> Result<(), &'static str> {
    if let Some(value) = field(body, &["targetPolycount", "target_polycount"]) {
        let count = value
            .as_i64()
            .ok_or("Target polycount must be an integer.")?;
        if !(100..=300_000).contains(&count) {
            return Err("Target polycount must be between 100 and 300,000.");
        }
    }

    if let Some(value) = field(body, &["heightMeters", "height_meters"]) {
        let height = value.as_f64().ok_or("Height must be a number.")?;
        if !height.is_finite() || height <= 0.0 {
            return Err("Height must be positive.");
        }
    }

    Ok(())
}

pub fn validate_creation_body(endpoint: &str, body: &Value) -> Result<(), &'static str> {
    if !body.is_object() {
        return Err("Request body must be an object.");
    }
    validate_prompt_fields(body)?;
    validate_task_id_fields(body)?;
    validate_numeric_fields(body)?;

    match endpoint {
        "/v2/text-to-3d" => match field(body, &["mode"]).and_then(Value::as_str) {
            Some("preview") if nonempty_string(body, &["prompt"]) => Ok(()),
            Some("refine") if nonempty_string(body, &["previewTaskId", "preview_task_id"]) => {
                Ok(())
            }
            _ => Err("Text-to-3D requires a prompt for preview or a preview task ID for refine."),
        },
        "/v1/image-to-3d" => {
            if nonempty_string(body, &["imageUrl", "image_url"])
                || nonempty_string(body, &["inputTaskId", "input_task_id"])
            {
                Ok(())
            } else {
                Err("Image-to-3D requires an image or input task ID.")
            }
        }
        "/v1/multi-image-to-3d" => {
            let image_count = field(body, &["imageUrls", "image_urls"])
                .and_then(Value::as_array)
                .map_or(0, Vec::len);
            if (1..=4).contains(&image_count)
                || nonempty_string(body, &["inputTaskId", "input_task_id"])
            {
                Ok(())
            } else {
                Err("Multi-image-to-3D requires one to four images or an input task ID.")
            }
        }
        "/v1/remesh"
        | "/v1/retexture"
        | "/v1/convert"
        | "/v1/resize"
        | "/v1/uv-unwrap"
        | "/v1/rigging"
        | "/v1/print/multi-color"
        | "/v1/print/analyze"
        | "/v1/print/repair" => {
            if has_source(body) {
                Ok(())
            } else {
                Err("This operation requires an input task ID or model URL.")
            }
        }
        "/v1/animations" => {
            let has_rig = nonempty_string(body, &["rigTaskId", "rig_task_id"]);
            if !has_rig {
                return Err("Animation requires a rig task ID.");
            }
            let single_action = field(body, &["actionId", "action_id"])
                .and_then(Value::as_i64)
                .is_some_and(|value| value > 0);
            let retarget = matches!(
                field(body, &["motionTaskId", "motion_task_id"]).and_then(Value::as_str),
                Some(id) if !id.trim().is_empty() && validate_task_id(id).is_ok()
            );
            let merged_actions = field(body, &["actionIds", "action_ids"])
                .and_then(Value::as_array)
                .is_some_and(|ids| {
                    (1..=10).contains(&ids.len()) && {
                        // Uniqueness enforced at the boundary: duplicates
                        // would request the same clip twice and waste
                        // credits (the merge semantics say one clip per
                        // action, names = library names).
                        let mut seen = std::collections::HashSet::new();
                        ids.iter()
                            .all(|id| id.as_i64().is_some_and(|n| n > 0 && seen.insert(n)))
                    }
                });
            // Meshy requires exactly one of action_id / action_ids /
            // motion_task_id alongside rig_task_id.
            let variant_count =
                usize::from(single_action) + usize::from(retarget) + usize::from(merged_actions);
            if variant_count == 1 {
                Ok(())
            } else {
                Err(
                    "Animation requires exactly one of action ID, 1-10 action IDs, \
                     or a motion task ID.",
                )
            }
        }
        "/v1/text-to-motion" => {
            let prompt = field(body, &["prompt"]).and_then(Value::as_str);
            let prompt_ok = prompt.is_some_and(|p| {
                let trimmed = p.trim();
                !trimmed.is_empty() && trimmed.chars().count() <= 400
            });
            let mode_ok = matches!(
                field(body, &["mode"]).and_then(Value::as_str),
                Some("prime" | "swift")
            );
            let duration_ok = field(body, &["duration"])
                .and_then(Value::as_f64)
                .is_some_and(|d| {
                    d.is_finite() && (2.0..=10.0).contains(&d) && (d * 2.0).fract().abs() < 1e-9
                });
            if prompt_ok && mode_ok && duration_ok {
                Ok(())
            } else {
                Err("Text-to-motion requires a prompt (<= 400 chars), a mode \
                     (prime or swift), and a duration of 2-10 seconds in 0.5 steps.")
            }
        }
        "/v1/text-to-image" => {
            if nonempty_string(body, &["prompt"]) {
                Ok(())
            } else {
                Err("Text-to-image requires a prompt.")
            }
        }
        "/v1/image-to-image" => {
            let reference_count = field(body, &["referenceImageUrls", "reference_image_urls"])
                .and_then(Value::as_array)
                .map_or(0, Vec::len);
            if nonempty_string(body, &["prompt"]) && reference_count > 0 {
                Ok(())
            } else {
                Err("Image-to-image requires a prompt and at least one reference image.")
            }
        }
        // ── Creative Lab (TASK-0017) ──
        // Prototype stage: an image, except Lamp which additionally accepts
        // a text prompt instead (FR-CLAB-06-F1: exactly one of the two).
        "/creative-lab/keychain/v1/prototype"
        | "/creative-lab/fridge-magnet/v1/prototype"
        | "/creative-lab/figure/v1/prototype"
        | "/creative-lab/vinyl-figure/v1/prototype"
        | "/creative-lab/brick-figure/v1/prototype"
        | "/creative-lab/keycap/v1/prototype" => {
            if nonempty_string(body, &["imageUrl", "image_url"]) {
                Ok(())
            } else {
                Err("Creative Lab prototype requires an image.")
            }
        }
        "/creative-lab/lamp/v1/prototype" => {
            let has_text = nonempty_string(body, &["text"]);
            let has_image = nonempty_string(body, &["imageUrl", "image_url"]);
            if has_text ^ has_image {
                Ok(())
            } else {
                Err("Creative Lab lamp prototype requires exactly one of text or an image.")
            }
        }
        // Build stage: the prototype's task ID, plus (Keycap only) a
        // candidate ID selected from the prototype's results (FR-CLAB-07-F2).
        "/creative-lab/keychain/v1/build"
        | "/creative-lab/fridge-magnet/v1/build"
        | "/creative-lab/figure/v1/build"
        | "/creative-lab/vinyl-figure/v1/build"
        | "/creative-lab/brick-figure/v1/build"
        | "/creative-lab/lamp/v1/build" => {
            if nonempty_string(body, &["inputTaskId", "input_task_id"]) {
                Ok(())
            } else {
                Err("Creative Lab build requires the prototype's task ID.")
            }
        }
        "/creative-lab/keycap/v1/build" => {
            if nonempty_string(body, &["inputTaskId", "input_task_id"])
                && nonempty_string(body, &["candidateId", "candidate_id"])
            {
                Ok(())
            } else {
                Err("Creative Lab keycap build requires the prototype's task ID and a candidate ID.")
            }
        }
        _ => Err("Unsupported Meshy endpoint."),
    }
}

pub fn validate_task_reference(endpoint: &str, task_id: &str) -> Result<(), &'static str> {
    if !task_endpoints().contains(&endpoint) {
        return Err("Unsupported Meshy endpoint.");
    }
    validate_task_id(task_id)
}

pub fn validate_task_id(task_id: &str) -> Result<(), &'static str> {
    Uuid::parse_str(task_id)
        .map(|_| ())
        .map_err(|_| "Task ID must be a valid UUID.")
}

pub fn validate_download_url(url: &str, allowed_hosts: &[&str]) -> Result<(), &'static str> {
    let parsed = Url::parse(url).map_err(|_| "Download URL is invalid.")?;
    if parsed.scheme() != "https" {
        return Err("Downloads must use HTTPS.");
    }
    let host = parsed.host_str().unwrap_or("");
    if !allowed_hosts.contains(&host) {
        return Err("Downloads are restricted to the provider's asset host.");
    }
    Ok(())
}

/// Validate an animation preview image URL (ADR-0011 SEC-10). Structurally the
/// same check as `validate_download_url`, but against a separate host list so a
/// preview origin can never be mistaken for a model/texture download origin.
pub fn validate_preview_url(url: &str, allowed_hosts: &[&str]) -> Result<(), &'static str> {
    let parsed = Url::parse(url).map_err(|_| "Preview URL is invalid.")?;
    if parsed.scheme() != "https" {
        return Err("Preview images must use HTTPS.");
    }
    let host = parsed.host_str().unwrap_or("");
    if !allowed_hosts.contains(&host) {
        return Err("Preview images are restricted to the provider's preview host.");
    }
    Ok(())
}

/// Reduce a provider-supplied animation `key` to a filesystem-safe stem
/// (ADR-0011 SEC-12). Allowlist-only: path separators, traversal sequences and
/// every other character are rejected by construction rather than stripped by
/// pattern, so no `..` or absolute path can survive.
pub fn sanitize_cache_key(key: &str) -> Result<String, &'static str> {
    if key.is_empty() || key.chars().count() > 128 {
        return Err("Preview key must be between 1 and 128 characters.");
    }
    if !key
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Err("Preview key may contain only letters, digits, hyphen and underscore.");
    }
    Ok(key.to_string())
}

pub fn model_filename(format: &str) -> Option<&'static str> {
    match format {
        "glb" => Some("model.glb"),
        "fbx" => Some("model.fbx"),
        "obj" => Some("model.obj"),
        "mtl" => Some("model.mtl"),
        "usdz" => Some("model.usdz"),
        "stl" => Some("model.stl"),
        "3mf" => Some("model.3mf"),
        "blend" => Some("model.blend"),
        "pre_remeshed_glb" => Some("pre_remeshed_model.glb"),
        // Text-to-Motion swift output (BVH motion capture file).
        "bvh" => Some("motion.bvh"),
        _ => None,
    }
}

// ─── ADR-0015 step 3: TPC-04 artifact key and filename mapping ─────

/// The serde wire name of an artifact role (the camelCase value the frontend
/// and the snapshot IPC use). Closed match — never a provider string.
fn artifact_role_wire(role: ArtifactRole) -> &'static str {
    match role {
        ArtifactRole::Primary => "primary",
        ArtifactRole::Armature => "armature",
        ArtifactRole::FpsVariant => "fpsVariant",
        ArtifactRole::FormatVariant => "formatVariant",
        ArtifactRole::PresetClip => "presetClip",
        ArtifactRole::Motion => "motion",
        ArtifactRole::PreRemeshed => "preRemeshed",
    }
}

/// Filesystem stem for a non-primary role's download filename (snake_case,
/// matching the existing `pre_remeshed_model.glb` / `texture_N_key.png`
/// filename idiom). `Primary` never uses it — primary filenames keep
/// `model_filename`'s legacy outputs (TPC-04 backward compatibility).
fn artifact_role_stem(role: ArtifactRole) -> &'static str {
    match role {
        ArtifactRole::Primary => "model",
        ArtifactRole::Armature => "armature",
        ArtifactRole::FpsVariant => "fps_variant",
        ArtifactRole::FormatVariant => "format_variant",
        ArtifactRole::PresetClip => "preset_clip",
        ArtifactRole::Motion => "motion",
        ArtifactRole::PreRemeshed => "pre_remeshed",
    }
}

/// Closed `(role, format)` allowlist (TPC-04). Mirrors exactly the pairs
/// `provider::meshy`'s normalizer can emit; an unsupported pair is an
/// `INVALID_INPUT` rejection at the command boundary, never a silent skip
/// (TASK-0031 evidence gate).
fn artifact_format_supported(role: ArtifactRole, format: &str) -> bool {
    match role {
        // Same closed vocabulary as the legacy `model_urls` keys, minus the
        // role-qualified `pre_remeshed_glb` key (the normalizer emits that as
        // `role = preRemeshed, format = "glb"`, never as a primary).
        ArtifactRole::Primary => {
            matches!(
                format,
                "glb" | "fbx" | "obj" | "mtl" | "usdz" | "stl" | "3mf" | "blend" | "bvh"
            )
        }
        ArtifactRole::Armature => matches!(format, "fbx" | "glb"),
        ArtifactRole::FpsVariant => format == "fbx",
        ArtifactRole::FormatVariant => format == "usdz",
        ArtifactRole::PresetClip => matches!(format, "glb" | "fbx"),
        ArtifactRole::Motion => matches!(format, "fbx" | "bvh"),
        ArtifactRole::PreRemeshed => format == "glb",
    }
}

/// TPC-04 storage key for one artifact: `primary` keeps the bare format key
/// (`glb`, `fbx`, …) so existing `file_paths` rows and readers
/// (`AssetPreview3D`'s `paths.glb`, `ExportDialog`'s `paths[format]`) are
/// unchanged; every other role uses `<role>[-<label>].<format>` with the
/// role's camelCase wire name (e.g. `armature.fbx`,
/// `presetClip-walking.glb`, `preRemeshed.glb`). Labels are validated with
/// the same allowlist as `sanitize_cache_key`, so a path separator cannot
/// survive into a key.
pub fn artifact_storage_key(
    role: ArtifactRole,
    format: &str,
    label: Option<&str>,
) -> Result<String, &'static str> {
    if !artifact_format_supported(role, format) {
        return Err("Unsupported artifact format for this artifact role.");
    }
    let label = label.map(sanitize_cache_key).transpose()?;
    Ok(match role {
        ArtifactRole::Primary => format.to_string(),
        role => {
            let suffix = label.map(|l| format!("-{l}")).unwrap_or_default();
            format!("{}{suffix}.{}", artifact_role_wire(role), format)
        }
    })
}

/// TPC-04 download filename for one artifact. `primary` keeps
/// `model_filename`'s existing outputs (`model.glb`, `motion.bvh`, …) for
/// backward compatibility with already-downloaded asset directories; every
/// other role gets `<sanitized-role>[-<label>].<ext>` from the closed
/// `(role, format)` mapping above — never a provider-supplied string.
pub fn artifact_filename(
    role: ArtifactRole,
    format: &str,
    label: Option<&str>,
) -> Result<String, &'static str> {
    if !artifact_format_supported(role, format) {
        return Err("Unsupported artifact format for this artifact role.");
    }
    let label = label.map(sanitize_cache_key).transpose()?;
    Ok(match role {
        ArtifactRole::Primary => model_filename(format)
            .expect("checked by artifact_format_supported")
            .to_string(),
        role => {
            let suffix = label.map(|l| format!("-{l}")).unwrap_or_default();
            format!("{}{suffix}.{}", artifact_role_stem(role), format)
        }
    })
}

pub fn texture_filename(index: usize, key: &str) -> Option<String> {
    let safe_key = match key {
        "base_color" | "baseColor" => "base_color",
        "metallic" => "metallic",
        "normal" => "normal",
        "roughness" => "roughness",
        "emission" => "emission",
        _ => return None,
    };
    Some(format!("texture_{index}_{safe_key}.png"))
}

#[cfg(test)]
mod tests {
    use super::*;

    const TASK_ID: &str = "01a039b2-b12c-7b56-b955-7fe20515aed0";

    #[test]
    fn rejects_oversized_prompts_and_invalid_numeric_ranges() {
        let oversized = "a".repeat(601);
        assert!(validate_creation_body(
            "/v2/text-to-3d",
            &serde_json::json!({"mode": "preview", "prompt": oversized})
        )
        .is_err());
        assert!(validate_creation_body(
            "/v2/text-to-3d",
            &serde_json::json!({"mode": "preview", "prompt": "chair", "targetPolycount": 99})
        )
        .is_err());
    }

    #[test]
    fn validates_required_creation_sources() {
        assert!(validate_creation_body(
            "/v2/text-to-3d",
            &serde_json::json!({"mode": "preview", "prompt": "chair"})
        )
        .is_ok());
        assert!(validate_creation_body("/v1/remesh", &serde_json::json!({})).is_err());
        assert!(
            validate_creation_body("/v1/remesh", &serde_json::json!({"inputTaskId": TASK_ID}))
                .is_ok()
        );
    }

    #[test]
    fn rejects_untrusted_endpoints_and_non_uuid_task_ids() {
        assert!(validate_task_reference("/v2/text-to-3d", TASK_ID).is_ok());
        assert!(validate_task_reference("https://attacker.invalid", TASK_ID).is_err());
        assert!(validate_task_reference("/v2/text-to-3d", "../private").is_err());
    }

    #[test]
    fn restricts_download_hosts_and_filename_components() {
        let hosts = ["assets.meshy.ai"];
        assert!(validate_download_url(
            "https://assets.meshy.ai/tasks/model.glb?token=redacted",
            &hosts
        )
        .is_ok());
        assert!(validate_download_url("http://assets.meshy.ai/model.glb", &hosts).is_err());
        assert!(validate_download_url("https://attacker.invalid/model.glb", &hosts).is_err());
        assert_eq!(model_filename("glb"), Some("model.glb"));
        assert_eq!(model_filename("../../escape"), None);
        assert_eq!(
            texture_filename(0, "normal").as_deref(),
            Some("texture_0_normal.png")
        );
        assert_eq!(texture_filename(0, "../../escape"), None);
    }

    #[test]
    fn rejects_deceptive_download_hosts() {
        let hosts = ["assets.meshy.ai"];

        for url in [
            "https://assets.meshy.ai.attacker.invalid/model.glb",
            "https://assets-meshy.ai/model.glb",
            "https://assets.meshy.ai@attacker.invalid/model.glb",
            "https://meshy.ai/model.glb",
        ] {
            assert!(
                validate_download_url(url, &hosts).is_err(),
                "accepted {url}"
            );
        }
    }

    // ─── Additional coverage for validate_creation_body endpoints ──

    #[test]
    fn text_to_3d_refine_mode_requires_preview_task_id() {
        assert!(validate_creation_body(
            "/v2/text-to-3d",
            &serde_json::json!({"mode": "refine", "previewTaskId": TASK_ID})
        )
        .is_ok());
        assert!(
            validate_creation_body("/v2/text-to-3d", &serde_json::json!({"mode": "refine"}))
                .is_err()
        );
        assert!(
            validate_creation_body("/v2/text-to-3d", &serde_json::json!({"mode": "invalid"}))
                .is_err()
        );
    }

    #[test]
    fn image_to_3d_accepts_image_url_or_input_task_id() {
        assert!(validate_creation_body(
            "/v1/image-to-3d",
            &serde_json::json!({"imageUrl": "https://example.com/img.png"})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/v1/image-to-3d",
            &serde_json::json!({"inputTaskId": TASK_ID})
        )
        .is_ok());
        assert!(validate_creation_body("/v1/image-to-3d", &serde_json::json!({})).is_err());
    }

    #[test]
    fn multi_image_validates_one_to_four_images_or_input_task_id() {
        assert!(validate_creation_body(
            "/v1/multi-image-to-3d",
            &serde_json::json!({"imageUrls": ["url1"]})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/v1/multi-image-to-3d",
            &serde_json::json!({"imageUrls": ["u1", "u2", "u3", "u4"]})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/v1/multi-image-to-3d",
            &serde_json::json!({"imageUrls": []})
        )
        .is_err());
        assert!(validate_creation_body(
            "/v1/multi-image-to-3d",
            &serde_json::json!({"imageUrls": ["u1", "u2", "u3", "u4", "u5"]})
        )
        .is_err());
    }

    #[test]
    fn animation_requires_rig_task_id_and_positive_action_id() {
        assert!(validate_creation_body(
            "/v1/animations",
            &serde_json::json!({"rigTaskId": TASK_ID, "actionId": 5})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/v1/animations",
            &serde_json::json!({"rigTaskId": TASK_ID, "actionId": 0})
        )
        .is_err());
        assert!(
            validate_creation_body("/v1/animations", &serde_json::json!({"actionId": 5})).is_err()
        );
    }

    #[test]
    fn text_to_image_requires_prompt() {
        assert!(
            validate_creation_body("/v1/text-to-image", &serde_json::json!({"prompt": "cat"}))
                .is_ok()
        );
        assert!(validate_creation_body("/v1/text-to-image", &serde_json::json!({})).is_err());
    }

    #[test]
    fn image_to_image_requires_prompt_and_reference_images() {
        assert!(validate_creation_body(
            "/v1/image-to-image",
            &serde_json::json!({"prompt": "recolor", "referenceImageUrls": ["url1"]})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/v1/image-to-image",
            &serde_json::json!({"prompt": "recolor"})
        )
        .is_err());
        assert!(validate_creation_body(
            "/v1/image-to-image",
            &serde_json::json!({"referenceImageUrls": ["url1"]})
        )
        .is_err());
    }

    // ─── Creative Lab endpoint validation (TASK-0017) ──────────────

    #[test]
    fn creative_lab_prototype_requires_image_url() {
        assert!(validate_creation_body(
            "/creative-lab/keychain/v1/prototype",
            &serde_json::json!({"imageUrl": "data:image/png;base64,abc"})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/creative-lab/keychain/v1/prototype",
            &serde_json::json!({})
        )
        .is_err());
        assert!(validate_creation_body(
            "/creative-lab/keycap/v1/prototype",
            &serde_json::json!({"imageUrl": "data:image/png;base64,abc"})
        )
        .is_ok());
    }

    #[test]
    fn creative_lab_lamp_prototype_requires_exactly_one_of_text_or_image() {
        assert!(validate_creation_body(
            "/creative-lab/lamp/v1/prototype",
            &serde_json::json!({"text": "a moon lamp"})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/creative-lab/lamp/v1/prototype",
            &serde_json::json!({"imageUrl": "data:image/png;base64,abc"})
        )
        .is_ok());
        assert!(
            validate_creation_body("/creative-lab/lamp/v1/prototype", &serde_json::json!({}))
                .is_err(),
            "neither text nor image must be rejected"
        );
        assert!(
            validate_creation_body(
                "/creative-lab/lamp/v1/prototype",
                &serde_json::json!({
                    "text": "a moon lamp",
                    "imageUrl": "data:image/png;base64,abc"
                })
            )
            .is_err(),
            "both text and image must be rejected (mutually exclusive)"
        );
    }

    #[test]
    fn creative_lab_build_requires_input_task_id() {
        assert!(validate_creation_body(
            "/creative-lab/keychain/v1/build",
            &serde_json::json!({"inputTaskId": TASK_ID})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/creative-lab/fridge-magnet/v1/build",
            &serde_json::json!({})
        )
        .is_err());
        assert!(
            validate_creation_body("/creative-lab/lamp/v1/build", &serde_json::json!({})).is_err()
        );
    }

    #[test]
    fn creative_lab_keycap_build_requires_input_task_id_and_candidate_id() {
        assert!(validate_creation_body(
            "/creative-lab/keycap/v1/build",
            &serde_json::json!({"inputTaskId": TASK_ID, "candidateId": "candidate-1"})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/creative-lab/keycap/v1/build",
            &serde_json::json!({"inputTaskId": TASK_ID})
        )
        .is_err());
        assert!(validate_creation_body(
            "/creative-lab/keycap/v1/build",
            &serde_json::json!({"candidateId": "candidate-1"})
        )
        .is_err());
    }

    #[test]
    fn source_operations_accept_model_url() {
        assert!(validate_creation_body(
            "/v1/convert",
            &serde_json::json!({"modelUrl": "https://example.com/model.glb"})
        )
        .is_ok());
        assert!(validate_creation_body("/v1/resize", &serde_json::json!({})).is_err());
    }

    #[test]
    fn invalid_task_id_in_body_fields_rejected() {
        assert!(validate_creation_body(
            "/v1/remesh",
            &serde_json::json!({"inputTaskId": "not-a-uuid"})
        )
        .is_err());
        assert!(
            validate_creation_body("/v1/remesh", &serde_json::json!({"inputTaskId": 12345}))
                .is_err()
        );
    }

    #[test]
    fn height_meters_must_be_positive_finite() {
        assert!(validate_creation_body(
            "/v1/rigging",
            &serde_json::json!({"inputTaskId": TASK_ID, "heightMeters": 1.5})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/v1/rigging",
            &serde_json::json!({"inputTaskId": TASK_ID, "heightMeters": 0.0})
        )
        .is_err());
        assert!(validate_creation_body(
            "/v1/rigging",
            &serde_json::json!({"inputTaskId": TASK_ID, "heightMeters": -1.0})
        )
        .is_err());
        assert!(validate_creation_body(
            "/v1/rigging",
            &serde_json::json!({"inputTaskId": TASK_ID, "heightMeters": "tall"})
        )
        .is_err());
    }

    #[test]
    fn target_polycount_range_enforced() {
        assert!(validate_creation_body(
            "/v2/text-to-3d",
            &serde_json::json!({"mode": "preview", "prompt": "x", "targetPolycount": 100})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/v2/text-to-3d",
            &serde_json::json!({"mode": "preview", "prompt": "x", "targetPolycount": 300000})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/v2/text-to-3d",
            &serde_json::json!({"mode": "preview", "prompt": "x", "targetPolycount": 300001})
        )
        .is_err());
        assert!(validate_creation_body(
            "/v2/text-to-3d",
            &serde_json::json!({"mode": "preview", "prompt": "x", "targetPolycount": "lots"})
        )
        .is_err());
    }

    #[test]
    fn validate_download_url_rejects_http_and_non_meshy_hosts() {
        let hosts = ["assets.meshy.ai"];
        assert!(validate_download_url("https://assets.meshy.ai/model.glb", &hosts).is_ok());
        assert!(validate_download_url("http://assets.meshy.ai/model.glb", &hosts).is_err());
        assert!(validate_download_url("https://attacker.com/model.glb", &hosts).is_err());
        assert!(validate_download_url("not-a-url", &hosts).is_err());
    }

    #[test]
    fn texture_filename_accepts_camel_and_snake_case_keys() {
        assert_eq!(
            texture_filename(1, "baseColor").as_deref(),
            Some("texture_1_base_color.png")
        );
        assert_eq!(
            texture_filename(2, "metallic").as_deref(),
            Some("texture_2_metallic.png")
        );
        assert_eq!(
            texture_filename(3, "roughness").as_deref(),
            Some("texture_3_roughness.png")
        );
        assert_eq!(
            texture_filename(0, "emission").as_deref(),
            Some("texture_0_emission.png")
        );
    }

    // ─── Text-to-motion + animation variants (ADR-0012) ──────

    #[test]
    fn text_to_motion_requires_prompt_mode_and_duration() {
        let ok = serde_json::json!({"prompt": "a kata", "mode": "prime", "duration": 2.5});
        assert!(validate_creation_body("/v1/text-to-motion", &ok).is_ok());
        // missing duration
        assert!(validate_creation_body(
            "/v1/text-to-motion",
            &serde_json::json!({"prompt": "a kata", "mode": "prime"})
        )
        .is_err());
        // bad mode
        assert!(validate_creation_body(
            "/v1/text-to-motion",
            &serde_json::json!({"prompt": "a kata", "mode": "ultra", "duration": 2.5})
        )
        .is_err());
        // duration below range
        assert!(validate_creation_body(
            "/v1/text-to-motion",
            &serde_json::json!({"prompt": "a kata", "mode": "prime", "duration": 1.0})
        )
        .is_err());
        // duration above range
        assert!(validate_creation_body(
            "/v1/text-to-motion",
            &serde_json::json!({"prompt": "a kata", "mode": "prime", "duration": 11.0})
        )
        .is_err());
        // duration not on a 0.5 step
        assert!(
            validate_creation_body(
                "/v1/text-to-motion",
                &serde_json::json!({"prompt": "a kata", "mode": "prime", "duration": 2.7})
            )
            .is_err(),
            "duration must be in 0.5 steps"
        );
    }

    #[test]
    fn text_to_motion_rejects_oversized_prompt() {
        let oversized = "a".repeat(401);
        assert!(validate_creation_body(
            "/v1/text-to-motion",
            &serde_json::json!({"prompt": oversized, "mode": "prime", "duration": 2.0})
        )
        .is_err());
    }

    #[test]
    fn animation_accepts_action_id_action_ids_and_motion_task_id_variants() {
        let rig = TASK_ID;
        assert!(validate_creation_body(
            "/v1/animations",
            &serde_json::json!({"rigTaskId": rig, "actionId": 5})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/v1/animations",
            &serde_json::json!({"rigTaskId": rig, "actionIds": [1, 2, 3]})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/v1/animations",
            &serde_json::json!({"rigTaskId": rig, "motionTaskId": TASK_ID})
        )
        .is_ok());
    }

    #[test]
    fn animation_rejects_multiple_or_invalid_variants() {
        let rig = TASK_ID;
        // both actionId and motionTaskId (must be exactly one)
        assert!(validate_creation_body(
            "/v1/animations",
            &serde_json::json!({"rigTaskId": rig, "actionId": 5, "motionTaskId": TASK_ID})
        )
        .is_err());
        // actionIds empty
        assert!(validate_creation_body(
            "/v1/animations",
            &serde_json::json!({"rigTaskId": rig, "actionIds": []})
        )
        .is_err());
        // actionIds > 10
        let many: Vec<i64> = (1..=11).collect();
        assert!(validate_creation_body(
            "/v1/animations",
            &serde_json::json!({"rigTaskId": rig, "actionIds": many})
        )
        .is_err());
        // motionTaskId not a UUID
        assert!(validate_creation_body(
            "/v1/animations",
            &serde_json::json!({"rigTaskId": rig, "motionTaskId": "not-a-uuid"})
        )
        .is_err());
        // missing rig
        assert!(
            validate_creation_body("/v1/animations", &serde_json::json!({"actionId": 5})).is_err()
        );
    }

    #[test]
    fn model_filename_supports_bvh_motion() {
        assert_eq!(model_filename("bvh"), Some("motion.bvh"));
    }

    #[test]
    fn model_filename_covers_all_supported_formats() {
        for (fmt, expected) in [
            ("glb", "model.glb"),
            ("fbx", "model.fbx"),
            ("obj", "model.obj"),
            ("mtl", "model.mtl"),
            ("usdz", "model.usdz"),
            ("stl", "model.stl"),
            ("3mf", "model.3mf"),
            ("blend", "model.blend"),
            ("pre_remeshed_glb", "pre_remeshed_model.glb"),
        ] {
            assert_eq!(model_filename(fmt), Some(expected));
        }
    }

    #[test]
    fn animation_rejects_duplicate_action_ids() {
        let rig = TASK_ID;
        assert!(validate_creation_body(
            "/v1/animations",
            &serde_json::json!({"rigTaskId": rig, "actionIds": [5, 5]})
        )
        .is_err());
        assert!(validate_creation_body(
            "/v1/animations",
            &serde_json::json!({"rigTaskId": rig, "actionIds": [5, 6, 5]})
        )
        .is_err());
        // Distinct ids at the cap still pass.
        let ten: Vec<i64> = (1..=10).collect();
        assert!(validate_creation_body(
            "/v1/animations",
            &serde_json::json!({"rigTaskId": rig, "actionIds": ten})
        )
        .is_ok());
    }

    // ─── TPC-04 artifact key/filename mapping (ADR-0015 step 3) ───

    #[test]
    fn artifact_storage_key_keeps_primary_legacy_keys() {
        // TPC-04 backward compatibility: a primary artifact keeps the bare
        // format key so existing file_paths rows and readers keep working.
        for fmt in [
            "glb", "fbx", "obj", "mtl", "usdz", "stl", "3mf", "blend", "bvh",
        ] {
            assert_eq!(
                artifact_storage_key(ArtifactRole::Primary, fmt, None).unwrap(),
                fmt
            );
        }
        // pre_remeshed_glb's legacy bare key is NOT kept: the role-qualified
        // wire-name key replaces it (the old key was the precedent, the new
        // scheme is `preRemeshed.glb`).
        assert_eq!(
            artifact_storage_key(ArtifactRole::PreRemeshed, "glb", None).unwrap(),
            "preRemeshed.glb"
        );
    }

    #[test]
    fn artifact_storage_key_uses_role_and_label_format() {
        assert_eq!(
            artifact_storage_key(ArtifactRole::Armature, "fbx", None).unwrap(),
            "armature.fbx"
        );
        assert_eq!(
            artifact_storage_key(ArtifactRole::PresetClip, "glb", Some("walking")).unwrap(),
            "presetClip-walking.glb"
        );
        assert_eq!(
            artifact_storage_key(ArtifactRole::FpsVariant, "fbx", None).unwrap(),
            "fpsVariant.fbx"
        );
        assert_eq!(
            artifact_storage_key(ArtifactRole::FormatVariant, "usdz", None).unwrap(),
            "formatVariant.usdz"
        );
        assert_eq!(
            artifact_storage_key(ArtifactRole::Motion, "bvh", None).unwrap(),
            "motion.bvh"
        );
    }

    #[test]
    fn artifact_storage_key_rejects_path_separator_in_label() {
        // sanitize_cache_key's allowlist must reject traversal attempts in a
        // label (the ADR-0015 test-list requirement).
        for bad in ["../evil", "a/b", "a\\b", "with space", ""] {
            assert!(artifact_storage_key(ArtifactRole::PresetClip, "glb", Some(bad)).is_err());
        }
    }

    #[test]
    fn artifact_storage_key_rejects_unknown_role_format_pairs() {
        // Closed (role, format) mapping: an unsupported pair is an error, not
        // a silent skip (TASK-0031).
        assert!(artifact_storage_key(ArtifactRole::Primary, "exe", None).is_err());
        assert!(artifact_storage_key(ArtifactRole::PreRemeshed, "fbx", None).is_err());
        assert!(artifact_storage_key(ArtifactRole::Armature, "usdz", None).is_err());
        assert!(artifact_storage_key(ArtifactRole::Motion, "glb", None).is_err());
    }

    #[test]
    fn artifact_filename_keeps_primary_legacy_filenames() {
        // Existing asset dirs and AssetPreview3D's paths.glb depend on these.
        assert_eq!(
            artifact_filename(ArtifactRole::Primary, "glb", None).unwrap(),
            "model.glb"
        );
        assert_eq!(
            artifact_filename(ArtifactRole::Primary, "fbx", None).unwrap(),
            "model.fbx"
        );
        assert_eq!(
            artifact_filename(ArtifactRole::Primary, "bvh", None).unwrap(),
            "motion.bvh"
        );
    }

    #[test]
    fn artifact_filename_maps_non_primary_roles_to_closed_names() {
        assert_eq!(
            artifact_filename(ArtifactRole::PreRemeshed, "glb", None).unwrap(),
            "pre_remeshed.glb"
        );
        assert_eq!(
            artifact_filename(ArtifactRole::Armature, "fbx", None).unwrap(),
            "armature.fbx"
        );
        assert_eq!(
            artifact_filename(ArtifactRole::PresetClip, "glb", Some("walking")).unwrap(),
            "preset_clip-walking.glb"
        );
        assert_eq!(
            artifact_filename(ArtifactRole::FpsVariant, "fbx", None).unwrap(),
            "fps_variant.fbx"
        );
        assert_eq!(
            artifact_filename(ArtifactRole::FormatVariant, "usdz", None).unwrap(),
            "format_variant.usdz"
        );
        assert_eq!(
            artifact_filename(ArtifactRole::Motion, "fbx", None).unwrap(),
            "motion.fbx"
        );
    }

    #[test]
    fn artifact_filename_rejects_path_separator_label_and_unknown_format() {
        assert!(artifact_filename(ArtifactRole::PresetClip, "glb", Some("..\\escape")).is_err());
        assert!(artifact_filename(ArtifactRole::Primary, "exe", None).is_err());
    }
}
