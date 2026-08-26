use reqwest::Url;
use serde_json::Value;
use uuid::Uuid;

const MAX_PROMPT_CHARS: usize = 600;
const TASK_ENDPOINTS: &[&str] = &[
    "/v2/text-to-3d",
    "/v1/image-to-3d",
    "/v1/multi-image-to-3d",
    "/v1/remesh",
    "/v1/retexture",
    "/v1/convert",
    "/v1/resize",
    "/v1/uv-unwrap",
    "/v1/rigging",
    "/v1/animation",
    "/v2/text-to-image",
    "/v2/image-to-image",
    "/v1/print/multi-color",
    "/v1/print/analyze",
    "/v1/print/repair",
];

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
        "/v1/animation" => {
            if nonempty_string(body, &["rigTaskId", "rig_task_id"])
                && field(body, &["actionId", "action_id"])
                    .and_then(Value::as_i64)
                    .is_some_and(|value| value > 0)
            {
                Ok(())
            } else {
                Err("Animation requires a rig task ID and positive action ID.")
            }
        }
        "/v2/text-to-image" => {
            if nonempty_string(body, &["prompt"]) {
                Ok(())
            } else {
                Err("Text-to-image requires a prompt.")
            }
        }
        "/v2/image-to-image" => {
            let reference_count = field(body, &["referenceImageUrls", "reference_image_urls"])
                .and_then(Value::as_array)
                .map_or(0, Vec::len);
            if nonempty_string(body, &["prompt"]) && reference_count > 0 {
                Ok(())
            } else {
                Err("Image-to-image requires a prompt and at least one reference image.")
            }
        }
        _ => Err("Unsupported Meshy endpoint."),
    }
}

pub fn validate_task_reference(endpoint: &str, task_id: &str) -> Result<(), &'static str> {
    if !TASK_ENDPOINTS.contains(&endpoint) {
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
        _ => None,
    }
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
        assert!(
            validate_download_url("https://assets.meshy.ai/tasks/model.glb?token=redacted", &hosts).is_ok()
        );
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
            "/v1/animation",
            &serde_json::json!({"rigTaskId": TASK_ID, "actionId": 5})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/v1/animation",
            &serde_json::json!({"rigTaskId": TASK_ID, "actionId": 0})
        )
        .is_err());
        assert!(
            validate_creation_body("/v1/animation", &serde_json::json!({"actionId": 5})).is_err()
        );
    }

    #[test]
    fn text_to_image_requires_prompt() {
        assert!(
            validate_creation_body("/v2/text-to-image", &serde_json::json!({"prompt": "cat"}))
                .is_ok()
        );
        assert!(validate_creation_body("/v2/text-to-image", &serde_json::json!({})).is_err());
    }

    #[test]
    fn image_to_image_requires_prompt_and_reference_images() {
        assert!(validate_creation_body(
            "/v2/image-to-image",
            &serde_json::json!({"prompt": "recolor", "referenceImageUrls": ["url1"]})
        )
        .is_ok());
        assert!(validate_creation_body(
            "/v2/image-to-image",
            &serde_json::json!({"prompt": "recolor"})
        )
        .is_err());
        assert!(validate_creation_body(
            "/v2/image-to-image",
            &serde_json::json!({"referenceImageUrls": ["url1"]})
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
}
