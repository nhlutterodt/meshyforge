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

/// A single entry in a provider's animation catalogue, normalised to a stable
/// camelCase IPC contract (ADR-0011). Serde aliases accept the provider's
/// snake_case wire fields (`action_id`, `sub_category`, `preview_url`) so the
/// frontend never receives provider-shaped keys — the class of defect recorded
/// in docs/LESSONS_LEARNED.md, where raw snake_case JSON reached TypeScript
/// typed as camelCase and every field read back `undefined`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationLibraryEntry {
    #[serde(alias = "action_id")]
    pub id: i64,
    /// Stable slug. `action_id` is documented as non-contiguous, and retired
    /// actions vanish from the catalogue, so `key` is the durable identity.
    #[serde(default)]
    pub key: String,
    pub name: String,
    #[serde(default)]
    pub category: String,
    #[serde(
        default,
        alias = "sub_category",
        skip_serializing_if = "Option::is_none"
    )]
    pub sub_category: Option<String>,
    #[serde(
        default,
        alias = "preview_url",
        skip_serializing_if = "Option::is_none"
    )]
    pub preview_url: Option<String>,
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
    #[serde(rename = "text-to-motion")]
    TextToMotion,
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

// ─── ADR-0015: normalized task snapshot (TPC-02, TPC-03) ──────────────

/// Closed lifecycle status of a normalized provider task (ADR-0015 TPC-02).
///
/// The wire values are the closed set `PENDING | IN_PROGRESS | SUCCEEDED |
/// FAILED | CANCELED`. An unknown provider status string is a **normalization
/// error**, never a silent default — the snake/camel defect class recorded in
/// docs/LESSONS_LEARNED.md #10 is closed by rejecting, not by guessing.
/// This is the provider-agnostic counterpart of `meshy::models::TaskStatus`;
/// the provider layer must not depend on the Meshy-specific module.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TaskSnapshotStatus {
    Pending,
    InProgress,
    Succeeded,
    Failed,
    Canceled,
}

/// Closed artifact taxonomy (ADR-0015 TPC-03). Every URL the normalizer
/// recognizes becomes exactly one `TaskArtifact` with one of these roles.
/// The serde renames are the IPC wire values (camelCase, per TPC-02).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ArtifactRole {
    /// The canonical file for its format. Keeps the bare legacy storage key
    /// (`glb`, `fbx`, …) in step 3 (TPC-04 backward compatibility).
    #[serde(rename = "primary")]
    Primary,
    /// Skeleton/armature-only output (`processed_armature_fbx_url`,
    /// rig `*_armature_glb_url`).
    #[serde(rename = "armature")]
    Armature,
    /// Frame-rate post-processed variant (`processed_animation_fps_fbx_url`).
    #[serde(rename = "fpsVariant")]
    FpsVariant,
    /// Same content in another container (`processed_usdz_url`).
    #[serde(rename = "formatVariant")]
    FormatVariant,
    /// A named preset clip from the animation library (rig `basic_animations`
    /// walking/running outputs). Carries a sanitized `label`.
    #[serde(rename = "presetClip")]
    PresetClip,
    /// Text-to-Motion output (`motion_url`; format from `motion_format`).
    #[serde(rename = "motion")]
    Motion,
    /// Pre-remesh backup mesh (`model_urls.pre_remeshed_glb`). Extends the
    /// role-qualified-key precedent that `model_filename` already encodes
    /// (`pre_remeshed_glb → pre_remeshed_model.glb`).
    #[serde(rename = "preRemeshed")]
    PreRemeshed,
}

/// Compact error summary for a FAILED/CANCELED task (ADR-0015 TPC-02).
/// `code` is the provider's `task_error.code`, falling back to `task_error.type`,
/// falling back to the empty string — never a URL, never a signed payload.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskErrorSummary {
    pub code: String,
    pub message: String,
}

/// One downloadable output of a task (ADR-0015 TPC-03).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskArtifact {
    pub role: ArtifactRole,
    /// Lower-case container key (`glb`, `fbx`, `usdz`, `bvh`, …) — the
    /// vocabulary `commands::validation::model_filename` accepts, minus the
    /// role-qualified `pre_remeshed_glb` key which normalizes to
    /// `role = preRemeshed, format = "glb"`.
    pub format: String,
    /// Optional sanitized slug (for example `walking`), validated with the
    /// `sanitize_cache_key` rules (TPC-03/TPC-04). Path separators cannot
    /// survive the allowlist.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    pub url: String,
}

/// Normalized provider task response (ADR-0015 TPC-02), camelCase on IPC —
/// the same normalization precedent as `AnimationLibraryEntry` (ADR-0011).
///
/// Produced by `TaskProvider::snapshot` (TPC-01). Built purely from the raw
/// provider JSON; the command layer applies it, the provider does the I/O.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskSnapshot {
    pub id: String,
    /// The serde wire value of the task type (`text-to-3d-preview`, `animate`,
    /// …), passed through from the dispatch `TaskType` (TPC-05 groundwork).
    pub task_type: String,
    pub status: TaskSnapshotStatus,
    pub progress: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<TaskErrorSummary>,
    pub consumed_credits: i64,
    /// Unix epoch milliseconds; 0 when the provider omitted the field
    /// (mirrors the `?? 0` defaults `useActiveTaskPolling` relies on).
    pub created_at: i64,
    pub started_at: i64,
    pub finished_at: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub thumbnail_url: Option<String>,
    pub artifacts: Vec<TaskArtifact>,
    /// The raw provider JSON, verbatim. **Transitional** (TPC-06): no new
    /// code may read it; removed once `PrintabilityReportCard` reads a typed
    /// report. Registered as tech debt TD-08.
    pub provider_payload: serde_json::Value,
    /// TPC-03 debug list: dotted names of URL-bearing fields the normalizer
    /// did not recognize. **Field names only, never URLs** (IPC-06).
    ///
    /// Choice: a public struct field with `#[serde(skip)]` rather than a
    /// debug method — it stays test-visible without any extra plumbing and
    /// provably never crosses IPC (see the serialization test).
    #[serde(skip)]
    pub dropped_fields: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn task_type_has_same_variant_count_as_meshy_type() {
        // The MeshyType enum has 31 variants. TaskType must match 1:1.
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
            ("text-to-motion", TaskType::TextToMotion),
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
            (
                "creative-lab-keycap-build",
                TaskType::CreativeLabKeycapBuild,
            ),
        ];
        assert_eq!(wire_values.len(), 31, "TaskType must have 31 variants");

        for (wire, variant) in wire_values {
            let json = serde_json::to_string(&variant).unwrap();
            assert_eq!(
                json,
                format!("\"{wire}\""),
                "Wire value mismatch for {variant:?}"
            );
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

    #[test]
    fn snapshot_status_uses_closed_screaming_snake_wire_values() {
        let cases = [
            (TaskSnapshotStatus::Pending, "PENDING"),
            (TaskSnapshotStatus::InProgress, "IN_PROGRESS"),
            (TaskSnapshotStatus::Succeeded, "SUCCEEDED"),
            (TaskSnapshotStatus::Failed, "FAILED"),
            (TaskSnapshotStatus::Canceled, "CANCELED"),
        ];
        for (status, wire) in cases {
            let json = serde_json::to_string(&status).unwrap();
            assert_eq!(json, format!("\"{wire}\""));
            let back: TaskSnapshotStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(back, status);
        }
        // Unknown provider status strings must not deserialize (TPC-02:
        // normalization error, not a default).
        assert!(serde_json::from_str::<TaskSnapshotStatus>("\"UNKNOWN\"").is_err());
    }

    #[test]
    fn artifact_role_wire_values_are_closed_camel_case() {
        let cases = [
            (ArtifactRole::Primary, "primary"),
            (ArtifactRole::Armature, "armature"),
            (ArtifactRole::FpsVariant, "fpsVariant"),
            (ArtifactRole::FormatVariant, "formatVariant"),
            (ArtifactRole::PresetClip, "presetClip"),
            (ArtifactRole::Motion, "motion"),
            (ArtifactRole::PreRemeshed, "preRemeshed"),
        ];
        for (role, wire) in cases {
            let json = serde_json::to_string(&role).unwrap();
            assert_eq!(json, format!("\"{wire}\""));
            let back: ArtifactRole = serde_json::from_str(&json).unwrap();
            assert_eq!(back, role);
        }
    }

    #[test]
    fn snapshot_serializes_camel_case_and_never_dropped_fields() {
        let snap = TaskSnapshot {
            id: "t-1".to_string(),
            task_type: "animate".to_string(),
            status: TaskSnapshotStatus::Succeeded,
            progress: 100,
            error: Some(TaskErrorSummary {
                code: String::new(),
                message: "boom".to_string(),
            }),
            consumed_credits: 3,
            created_at: 1,
            started_at: 2,
            finished_at: 3,
            thumbnail_url: None,
            artifacts: vec![TaskArtifact {
                role: ArtifactRole::PresetClip,
                format: "glb".to_string(),
                label: Some("walking".to_string()),
                url: "https://assets.meshy.ai/x/a.glb".to_string(),
            }],
            provider_payload: serde_json::json!({ "raw": true }),
            dropped_fields: vec!["result.mystery_url".to_string()],
        };
        let value = serde_json::to_value(&snap).unwrap();
        // TPC-02: camelCase on IPC.
        assert_eq!(value["taskType"], "animate");
        assert_eq!(value["consumedCredits"], 3);
        assert_eq!(value["createdAt"], 1);
        assert_eq!(value["thumbnailUrl"], serde_json::Value::Null); // skipped
        assert_eq!(value["artifacts"][0]["role"], "presetClip");
        assert_eq!(value["artifacts"][0]["label"], "walking");
        assert_eq!(value["providerPayload"]["raw"], true);
        // TPC-03: the droppedFields debug list never crosses IPC.
        assert!(value.get("droppedFields").is_none());
        assert!(value.get("dropped_fields").is_none());
        // The debug list must never contain URLs anyway (IPC-06) — the
        // normalizer only ever pushes dotted field names.
        assert_eq!(snap.dropped_fields, vec!["result.mystery_url"]);
    }
}
