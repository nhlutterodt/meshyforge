// MeshyForge — Provider-Agnostic Task Type Taxonomy
//
// This enum replaces the provider-specific MeshyType. It has the exact same
// variants and the exact same serde wire values. The granularity is preserved
// 1:1 — no sub-enums, no mode structs. Changing the granularity is out of
// scope for the provider-abstraction refactor (see ADR-0004).
//
// Source: ADR-0004, docs/refactoring/implementation-artifacts.md

use serde::{Deserialize, Serialize};

/// Response from creating a task. Generic across providers —
/// every provider returns a task ID string.
///
/// Moved here from `meshy/models.rs` so the provider trait does not depend
/// on the Meshy-specific module. (Adversarial issue #1, R1 review.)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskCreateResponse {
    /// The newly created task's ID.
    pub result: String,
}

/// Discriminates every kind of task the application can produce.
/// Maps 1:1 to the former MeshyType — same variants, same wire format.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TaskType {
    #[serde(rename = "text-to-3d-preview")]
    TextTo3dPreview,
    #[serde(rename = "text-to-3d-refine")]
    TextTo3dRefine,
    #[serde(rename = "image-to-3d")]
    ImageTo3d,
    #[serde(rename = "multi-image-to-3d")]
    MultiImageTo3d,
    #[serde(rename = "retexture")]
    Retexture,
    #[serde(rename = "remesh")]
    Remesh,
    #[serde(rename = "convert")]
    Convert,
    #[serde(rename = "resize")]
    Resize,
    #[serde(rename = "uv-unwrap")]
    UvUnwrap,
    #[serde(rename = "rig")]
    Rig,
    #[serde(rename = "animate")]
    Animate,
    #[serde(rename = "text-to-image")]
    TextToImage,
    #[serde(rename = "image-to-image")]
    ImageToImage,
    #[serde(rename = "print-multi-color")]
    PrintMultiColor,
    #[serde(rename = "print-analyze")]
    PrintAnalyze,
    #[serde(rename = "print-repair")]
    PrintRepair,
    // ── Creative Lab (14 variants, same granularity as MeshyType) ──
    #[serde(rename = "creative-lab-keychain-prototype")]
    CreativeLabKeychainPrototype,
    #[serde(rename = "creative-lab-keychain-build")]
    CreativeLabKeychainBuild,
    #[serde(rename = "creative-lab-fridge-magnet-prototype")]
    CreativeLabFridgeMagnetPrototype,
    #[serde(rename = "creative-lab-fridge-magnet-build")]
    CreativeLabFridgeMagnetBuild,
    #[serde(rename = "creative-lab-figure-prototype")]
    CreativeLabFigurePrototype,
    #[serde(rename = "creative-lab-figure-build")]
    CreativeLabFigureBuild,
    #[serde(rename = "creative-lab-vinyl-figure-prototype")]
    CreativeLabVinylFigurePrototype,
    #[serde(rename = "creative-lab-vinyl-figure-build")]
    CreativeLabVinylFigureBuild,
    #[serde(rename = "creative-lab-brick-figure-prototype")]
    CreativeLabBrickFigurePrototype,
    #[serde(rename = "creative-lab-brick-figure-build")]
    CreativeLabBrickFigureBuild,
    #[serde(rename = "creative-lab-lamp-prototype")]
    CreativeLabLampPrototype,
    #[serde(rename = "creative-lab-lamp-build")]
    CreativeLabLampBuild,
    #[serde(rename = "creative-lab-keycap-prototype")]
    CreativeLabKeycapPrototype,
    #[serde(rename = "creative-lab-keycap-build")]
    CreativeLabKeycapBuild,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn task_type_has_same_variant_count_as_meshy_type() {
        // The MeshyType enum has 30 variants. TaskType must match 1:1.
        // We verify by checking serde round-trip of all known wire values.
        let wire_values = [
            ("text-to-3d-preview", TaskType::TextTo3dPreview),
            ("text-to-3d-refine", TaskType::TextTo3dRefine),
            ("image-to-3d", TaskType::ImageTo3d),
            ("multi-image-to-3d", TaskType::MultiImageTo3d),
            ("retexture", TaskType::Retexture),
            ("remesh", TaskType::Remesh),
            ("convert", TaskType::Convert),
            ("resize", TaskType::Resize),
            ("uv-unwrap", TaskType::UvUnwrap),
            ("rig", TaskType::Rig),
            ("animate", TaskType::Animate),
            ("text-to-image", TaskType::TextToImage),
            ("image-to-image", TaskType::ImageToImage),
            ("print-multi-color", TaskType::PrintMultiColor),
            ("print-analyze", TaskType::PrintAnalyze),
            ("print-repair", TaskType::PrintRepair),
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
            ("creative-lab-keycap-build", TaskType::CreativeLabKeycapBuild),
        ];
        assert_eq!(wire_values.len(), 30, "TaskType must have 30 variants");

        for (wire, variant) in wire_values {
            let json = serde_json::to_string(&variant).unwrap();
            assert_eq!(json, format!("\"{wire}\""), "Wire value mismatch for {variant:?}");
            let back: TaskType = serde_json::from_str(&json).unwrap();
            assert_eq!(back, variant, "Round-trip failed for {wire}");
        }
    }

    #[test]
    fn task_create_response_serializes_camel_case() {
        let resp = TaskCreateResponse {
            result: "task-abc-123".to_string(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert_eq!(json, r#"{"result":"task-abc-123"}"#);
    }
}