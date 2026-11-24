// MeshyForge — Rust type definitions (models.rs)
//
// CANONICITY: TDD §6.2's TypeScript type definitions remain the single source of
// truth for the MeshyForge data model. This file is a derived artifact. If the
// two ever diverge, TDD §6.2 wins, and this file must be regenerated from it.
//
// Source: rust_type_definitions.md v1.0.0

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ─── Enums ─────────────────────────────────────────────────────

/// Lifecycle status of a Meshy API task, as returned by the Meshy REST API.
///
/// Mirrors TDD §6.2 `TaskStatus`. Serializes to/from Meshy's own
/// SCREAMING_SNAKE_CASE wire values — this enum is the one exception to the
/// project's `camelCase` JSON convention because it must match Meshy's API
/// verbatim, not MeshyForge's own IPC contract.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TaskStatus {
    Pending,
    InProgress,
    Succeeded,
    Failed,
    Canceled,
}

/// Meshy AI model generation selector, used across text-to-3D, image-to-3D,
/// and retexture requests.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AiModel {
    #[serde(rename = "meshy-5")]
    Meshy5,
    #[serde(rename = "meshy-6")]
    Meshy6,
    #[serde(rename = "meshy-7")]
    Meshy7,
    #[serde(rename = "latest")]
    Latest,
}

/// Discriminates every kind of task the Meshy API (and MeshyForge's Creative
/// Lab wrapper endpoints) can produce.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MeshyType {
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

/// 3D file export/target format, used in `targetFormats` fields across
/// nearly every generation and post-processing request.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Glb,
    Fbx,
    Obj,
    Stl,
    Usdz,
    #[serde(rename = "3mf")]
    ThreeMf,
}

// ─── Shared inline-union enums ─────────────────────────────────

/// Fixed-value discriminant for the two-phase Text-to-3D workflow.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TextTo3DMode {
    Preview,
    Refine,
}

/// Topology/geometry style requested for a generated or remeshed model.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ModelType {
    Standard,
    Lowpoly,
    SmartTopology,
}

/// Mesh topology style for retopology/remesh operations.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Topology {
    Quad,
    Triangle,
}

/// Target rig pose for a generated model, or unspecified.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PoseMode {
    #[serde(rename = "a-pose")]
    APose,
    #[serde(rename = "t-pose")]
    TPose,
    /// Corresponds to the TypeScript literal `''` (empty string): no pose
    /// mode requested.
    #[serde(rename = "")]
    Unspecified,
}

/// Text-to-Motion generation mode. `Prime` produces a high-quality FBX
/// (10 credits); `Swift` produces a lighter BVH (3 credits). Serializes to
/// Meshy's lowercase wire values (`prime`/`swift`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TextToMotionMode {
    Prime,
    Swift,
}

/// Where a model's origin point is placed after auto-sizing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OriginAt {
    Bottom,
    Center,
}

/// PBR texture resolution.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TextureResolution {
    #[serde(rename = "2k")]
    TwoK,
    #[serde(rename = "4k")]
    FourK,
    #[serde(rename = "8k")]
    EightK,
}

/// Generative image model selector for the 2D image endpoints.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ImageAiModel {
    #[serde(rename = "nano-banana")]
    NanoBanana,
    #[serde(rename = "nano-banana-2")]
    NanoBanana2,
    #[serde(rename = "nano-banana-pro")]
    NanoBananaPro,
    #[serde(rename = "gpt-image-2")]
    GptImage2,
}

/// Output image aspect ratio for the 2D image endpoints.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AspectRatio {
    #[serde(rename = "1:1")]
    OneToOne,
    #[serde(rename = "16:9")]
    SixteenToNine,
    #[serde(rename = "9:16")]
    NineToSixteen,
    #[serde(rename = "4:3")]
    FourToThree,
    #[serde(rename = "3:4")]
    ThreeToFour,
    #[serde(rename = "3:2")]
    ThreeToTwo,
    #[serde(rename = "2:3")]
    TwoToThree,
}

/// Post-processing operation applied to a completed animation task.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PostProcessOperationType {
    #[serde(rename = "change_fps")]
    ChangeFps,
    #[serde(rename = "fbx2usdz")]
    Fbx2Usdz,
    #[serde(rename = "extract_armature")]
    ExtractArmature,
}

// ─── Asset and Supporting Structs ──────────────────────────────

/// PBR texture map URLs for a single material channel set.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextureUrl {
    pub base_color: Option<String>,
    pub metallic: Option<String>,
    pub normal: Option<String>,
    pub roughness: Option<String>,
    pub emission: Option<String>,
}

/// A locally-stored MeshyForge asset record.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    pub id: String,
    pub meshy_type: MeshyType,
    pub parent_task_id: Option<String>,
    pub prompt: Option<String>,
    pub image_url: Option<String>,
    pub ai_model: Option<AiModel>,
    pub status: TaskStatus,
    pub progress: i64,
    pub consumed_credits: i64,
    pub thumbnail_path: Option<String>,
    /// Format name → absolute file path, e.g. `{"glb": "/path/...", "fbx": "/path/..."}`.
    pub file_paths: HashMap<String, String>,
    pub texture_paths: Vec<TextureUrl>,
    pub notes: String,
    pub tags: Vec<String>,
    /// Unix epoch milliseconds.
    pub created_at: i64,
    /// Unix epoch milliseconds.
    pub started_at: i64,
    /// Unix epoch milliseconds.
    pub finished_at: i64,
    /// Unix epoch milliseconds.
    pub downloaded_at: i64,
    pub error_message: Option<String>,
    pub has_textures: bool,
    pub has_rig: bool,
    pub has_animation: bool,
    pub favorite: bool,
    /// Unix epoch milliseconds.
    pub last_viewed_at: i64,
}

// ─── API Request Structs ───────────────────────────────────────

/// Request body for the "preview" phase of the two-phase Text-to-3D workflow.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextTo3DPreviewRequest {
    pub mode: TextTo3DMode,
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_type: Option<ModelType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ai_model: Option<AiModel>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub should_remesh: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub topology: Option<Topology>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_polycount: Option<i64>,
    /// Valid values: `1`, `2`, `3`, `4`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decimation_mode: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pose_mode: Option<PoseMode>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub moderation: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_formats: Option<Vec<ExportFormat>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alpha_thumbnail: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_size: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub origin_at: Option<OriginAt>,
}

/// Request body for the "refine" phase of the two-phase Text-to-3D workflow.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextTo3DRefineRequest {
    pub mode: TextTo3DMode,
    pub preview_task_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enable_pbr: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture_resolution: Option<TextureResolution>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture_prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture_image_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ai_model: Option<AiModel>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub moderation: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remove_lighting: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_formats: Option<Vec<ExportFormat>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_size: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub origin_at: Option<OriginAt>,
}

/// Request body for single-image-to-3D generation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageTo3DRequest {
    pub image_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_task_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_type: Option<ModelType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ai_model: Option<AiModel>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ultra_mode: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub should_texture: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enable_pbr: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture_resolution: Option<TextureResolution>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture_prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture_image_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub should_remesh: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub topology: Option<Topology>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_polycount: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pose_mode: Option<PoseMode>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_enhancement: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remove_lighting: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub moderation: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_formats: Option<Vec<ExportFormat>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_size: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub origin_at: Option<OriginAt>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alpha_thumbnail: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multi_view_thumbnails: Option<bool>,
}

/// Request body for multi-image-to-3D generation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MultiImageTo3DRequest {
    pub image_urls: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_task_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ai_model: Option<AiModel>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub should_texture: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enable_pbr: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture_resolution: Option<TextureResolution>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture_prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture_image_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub should_remesh: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub topology: Option<Topology>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_polycount: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pose_mode: Option<PoseMode>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_enhancement: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remove_lighting: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub moderation: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_formats: Option<Vec<ExportFormat>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_size: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub origin_at: Option<OriginAt>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alpha_thumbnail: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multi_view_thumbnails: Option<bool>,
}

/// Request body for remeshing an existing model.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemeshRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_task_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_formats: Option<Vec<ExportFormat>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub topology: Option<Topology>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_polycount: Option<i64>,
    /// Valid values: `1`, `2`, `3`, `4`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decimation_mode: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alpha_thumbnail: Option<bool>,
}

/// Request body for applying a new texture/material to an existing model.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetextureRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_task_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text_style_prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_style_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multiview_image_urls: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ai_model: Option<AiModel>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enable_original_uv: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enable_pbr: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture_resolution: Option<TextureResolution>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remove_lighting: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_formats: Option<Vec<ExportFormat>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alpha_thumbnail: Option<bool>,
}

/// Request body for converting an existing model to additional export formats.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_task_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_url: Option<String>,
    pub target_formats: Vec<ExportFormat>,
}

/// Request body for rescaling/repositioning an existing model.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResizeRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_task_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resize_height: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resize_longest_side: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_size: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub origin_at: Option<OriginAt>,
}

/// Request body for auto-rigging an existing model.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RiggingRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_task_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height_meters: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture_image_url: Option<String>,
}

/// Request body for applying animation to a rigged model.
///
/// Meshy accepts **exactly one** of three animation sources alongside the
/// required `rig_task_id`:
/// - `action_id` (int) — one preset from the Animation Library;
/// - `action_ids` (1–10 unique ints) — several presets merged into one file,
///   one clip per action (names = library names; see LESSONS_LEARNED #13 for
///   the clip-vocabulary rename pointer);
/// - `motion_task_id` (string) — a SUCCEEDED Text-to-Motion clip retargeted
///   onto the rig (biped rigs only; snapshot within the 3-day retention).
///
/// This is a documentation/derived artifact; the live create path passes the
/// request through as raw JSON (see `commands/api.rs::create_animation`) and
/// enforces the "exactly one" invariant in `commands/validation.rs`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationRequest {
    pub rig_task_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub action_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub action_ids: Option<Vec<i64>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub motion_task_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_process: Option<AnimationPostProcess>,
}

/// Request body for Text-to-Motion generation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextToMotionRequest {
    /// Natural-language motion description (<= 400 chars).
    pub prompt: String,
    /// `prime` (FBX, 10 credits) or `swift` (BVH, 3 credits).
    pub mode: TextToMotionMode,
    /// Clip length in seconds, 2-10 in 0.5 steps.
    pub duration: f64,
}

/// Optional post-processing step applied after animation generation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationPostProcess {
    pub operation_type: PostProcessOperationType,
    /// Valid values: `24`, `25`, `30`, `60`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fps: Option<u8>,
}

/// Request body for text-to-image generation (2D reference images).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextToImageRequest {
    pub ai_model: ImageAiModel,
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub generate_multi_view: Option<bool>,
    /// Only the `APose`/`TPose` variants of `PoseMode` are valid here.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pose_mode: Option<PoseMode>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<AspectRatio>,
}

/// Request body for image-to-image generation (2D reference images).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageToImageRequest {
    pub ai_model: ImageAiModel,
    pub prompt: String,
    pub reference_image_urls: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub generate_multi_view: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<AspectRatio>,
}

// ─── API Response Structs ──────────────────────────────────────

/// Response body returned when a new Meshy task is successfully created.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskCreateResponse {
    /// The newly created task's ID.
    pub result: String,
}

/// Result payload nested under `result` for a completed animation / retarget /
/// merge task. **These URLs nest under `result`, NOT top-level**
/// (live-verified 2026-09-17) — a flattened-shape assumption returns nothing.
/// Every field is `Option` so explicit `null` and missing both deserialize
/// (see docs/LESSONS_LEARNED.md #10, #13).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationResult {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub animation_glb_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub animation_fbx_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub processed_usdz_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub processed_armature_fbx_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub processed_animation_fps_fbx_url: Option<String>,
}

/// Result payload nested under `result` for a completed Text-to-Motion task
/// (live-verified 2026-09-17). Null-tolerant for the same reason as
/// `AnimationResult`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextToMotionResult {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub motion_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub motion_format: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mode: Option<String>,
}

/// Structured error detail attached to a failed task.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskError {
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r#type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub doc_url: Option<String>,
}

/// Full task status/result object, as returned by Meshy's task-retrieval and
/// polling endpoints.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskObject {
    pub id: String,
    pub r#type: MeshyType,
    pub status: TaskStatus,
    pub progress: i64,
    /// Unix epoch milliseconds.
    pub created_at: i64,
    /// Unix epoch milliseconds.
    pub started_at: i64,
    /// Unix epoch milliseconds.
    pub finished_at: i64,
    pub preceding_tasks: i64,
    pub task_error: Option<TaskError>,
    pub consumed_credits: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_urls: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_urls: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alpha_thumbnail_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture_prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture_image_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub texture_urls: Option<Vec<TextureUrl>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_urls: Option<Vec<String>>,
    /// Task-family-specific result payload (animation / retarget / merge /
    /// text-to-motion URLs). Present only on SUCCEEDED and opaque across
    /// families — raw JSON so every family shares one null-tolerant field
    /// instead of forcing a motion task to deserialize as an animation task.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
}

/// Response body for the account credit-balance endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BalanceResponse {
    pub balance: i64,
}

// ─── SQLite Row Types ──────────────────────────────────────────

/// Input struct for inserting a new asset record into SQLite.
///
/// `meshy_type` holds the same value as `AssetRow::task_type` (both map to
/// the `assets.meshy_type` SQL column) — the names differ because this is
/// the write-side struct and `AssetRow` is the read-side struct. Do not
/// assume they share a Rust field name when adding new code that touches
/// both; that exact assumption caused a prior IPC regression.
/// Tri-state value for one rights predicate (ADR-0018).
///
/// `Unknown` is a **recorded assertion** that the owner does not know. It is
/// deliberately distinct from `None` on the field, which means *pre-baseline /
/// never recorded* (`ND-8`). Collapsing the two would turn "nobody ever asked"
/// into "the owner said they do not know".
///
/// An unrecognised stored string maps to `Unknown` rather than panicking: for a
/// legal record, degrading to "not established" is the fail-safe direction.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RightsPredicate {
    Yes,
    No,
    Unknown,
}

impl RightsPredicate {
    pub fn as_stored(self) -> &'static str {
        match self {
            Self::Yes => "yes",
            Self::No => "no",
            Self::Unknown => "unknown",
        }
    }

    pub fn from_stored(value: &str) -> Self {
        match value {
            "yes" => Self::Yes,
            "no" => Self::No,
            _ => Self::Unknown,
        }
    }
}

/// Plan tier at generation — a different value space from `RightsPredicate`
/// (free / paid / unknown, not yes / no / unknown), so it gets its own type
/// rather than being squeezed into a boolean-ish one.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlanTier {
    Free,
    Paid,
    Unknown,
}

impl PlanTier {
    pub fn as_stored(self) -> &'static str {
        match self {
            Self::Free => "free",
            Self::Paid => "paid",
            Self::Unknown => "unknown",
        }
    }

    pub fn from_stored(value: &str) -> Self {
        match value {
            "free" => Self::Free,
            "paid" => Self::Paid,
            _ => Self::Unknown,
        }
    }
}

/// Frozen rights vocabulary (concept-11 §13.1).
pub const RIGHTS_PAID_OWNED: &str = "LicenseRef-Meshy-Paid-Owned";
pub const RIGHTS_CC_BY: &str = "CC-BY-4.0";
pub const RIGHTS_NOASSERTION: &str = "NOASSERTION";

/// Version of the sidecar document written by `LM-02` (`ADR-0019`).
///
/// A reader MUST refuse an unknown version rather than guess at the shape:
/// a sidecar that silently misreads is worse than one that is absent, because
/// it asserts provenance the code cannot actually vouch for.
pub const EXPORT_SCHEMA_VERSION: u32 = 1;

/// The rights record as it travels with an exported asset (`LM-02`, `ADR-0019`).
///
/// This is a **projection of `RightsRecord`**, not a second vocabulary: the
/// identifier and reason are the same derived values the read model exposes, so
/// the file and the contract cannot drift (`D-2`).
///
/// Field order matters — `schema_version` is first, so a reader can decide
/// whether it understands the document before parsing the rest of it.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportRecord {
    pub schema_version: u32,
    pub rights: RightsRecord,
    /// Credit text required when the identifier is `CC-BY-4.0` (`LM-03`).
    /// `None` for every other identifier — attribution is a condition of CC BY,
    /// not a universal courtesy.
    pub credit: Option<String>,
    /// `SHA-256` of the stored prompt, lowercase hex. `None` when the asset has
    /// no prompt. A digest, never the brief (Q1 / `ADR-0021`) — and a digest is
    /// **not** confidentiality; a guessable prompt can be confirmed by hashing.
    pub prompt_sha256: Option<String>,
    pub parent_task_id: Option<String>,
    /// Unix milliseconds, copied from the asset row (its generation time).
    pub generated_at: Option<i64>,
}

/// The `LM-03` CC BY 4.0 credit template.
///
/// CC BY 4.0 §3(a) makes attribution a **condition of the licence**, and the
/// required elements include a link to the licence and an indication of
/// modifications. The provider's suggested one-liner omits both, so this is a
/// superset of it rather than a paraphrase: adding elements cannot reduce
/// compliance.
pub fn cc_by_credit(parent_task_id: Option<&str>) -> String {
    let mut credit = String::from(
        "Model created with Meshy – CC BY 4.0 License\nhttps://creativecommons.org/licenses/by/4.0/",
    );
    if let Some(parent) = parent_task_id {
        credit.push_str(&format!("\nModified from {parent}"));
    }
    credit
}

/// Parse a sidecar document, refusing a version this build does not understand.
pub fn parse_export_record(json: &str) -> Result<ExportRecord, String> {
    let value: serde_json::Value = serde_json::from_str(json)
        .map_err(|_| "The export record is not valid JSON.".to_string())?;
    let version = value
        .get("schemaVersion")
        .and_then(serde_json::Value::as_u64)
        .ok_or_else(|| "The export record has no schemaVersion.".to_string())?;
    if version != u64::from(EXPORT_SCHEMA_VERSION) {
        return Err(format!(
            "Unsupported export record version {version}; this build writes {EXPORT_SCHEMA_VERSION}."
        ));
    }
    serde_json::from_value(value)
        .map_err(|_| "The export record does not match the expected shape.".to_string())
}

/// Everything the export path needs from the asset row, read once.
///
/// Deliberately narrow: the export path must not pull the whole read model, and
/// it must not see `file_paths` as anything other than the data it cross-checks
/// against (`SEC-B`). Nothing here is copied into the sidecar except the rights
/// projection, `parent_task_id` and `created_at`.
#[derive(Debug, Clone)]
pub struct ExportSource {
    /// Raw `assets.file_paths` JSON — used ONLY for the id/path cross-check.
    pub file_paths_json: String,
    pub prompt: Option<String>,
    pub rights: RightsRecord,
    pub parent_task_id: Option<String>,
    pub created_at: i64,
}

/// The per-asset rights record (ADR-0018 / `LM-01`).
///
/// One struct carries both the **stored predicates** and the **derived**
/// identifier/reason, so the export sidecar and the IPC read model are two
/// projections of one thing (`D-2`) rather than two schemas that can part ways.
///
/// `identifier` and `reason` are never written by the frontend and never read
/// from SQL — they are set by [`RightsRecord::refresh_derived`] after
/// construction and after any change to the predicates. That invariant is the
/// whole reason the identifier is derived rather than stored.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RightsRecord {
    pub plan_tier_at_generation: Option<String>,
    pub published_to_community: Option<String>,
    pub third_party_material_attested: Option<String>,
    pub disclosure_posture: Option<String>,
    pub recorded_at: Option<i64>,
    /// DERIVED in Rust — the frontend renders it and never recomputes it (`D-1`).
    pub identifier: String,
    /// DERIVED — which fact is missing when the identifier is `NOASSERTION`.
    /// `LM-01` requires `NOASSERTION` to read as "not established", and that is
    /// useless without saying *which* fact is missing.
    pub reason: Option<String>,
}

impl Default for RightsRecord {
    /// A brand-new asset records **nothing**: all predicates `None`, which the
    /// derivation reads as `NOASSERTION` / `tier-unrecorded`. It does not
    /// pre-fill `'unknown'`, because that would be the app asserting on the
    /// owner's behalf (ADR-0018 decision 1).
    fn default() -> Self {
        let mut record = Self {
            plan_tier_at_generation: None,
            published_to_community: None,
            third_party_material_attested: None,
            disclosure_posture: None,
            recorded_at: None,
            identifier: String::new(),
            reason: None,
        };
        record.refresh_derived();
        record
    }
}

impl RightsRecord {
    /// Recompute the derived fields from the stored predicates.
    pub fn refresh_derived(&mut self) {
        let (identifier, reason) = self.derive();
        self.identifier = identifier.to_string();
        self.reason = reason.map(str::to_string);
    }

    /// The five canonical rows (ADR-0018), in precedence order.
    ///
    /// Precedence is load-bearing: a paid asset that was published AND attested
    /// clean is `published-to-community`, not `LicenseRef-Meshy-Paid-Owned`. The
    /// twelve-combination test exists to catch a reordering of these branches.
    fn derive(&self) -> (&'static str, Option<&'static str>) {
        let tier = self
            .plan_tier_at_generation
            .as_deref()
            .map(PlanTier::from_stored)
            .unwrap_or(PlanTier::Unknown);

        match tier {
            // Free-plan output is licensed, so CC BY applies wherever it came
            // from — publishing does not change the identifier.
            PlanTier::Free => (RIGHTS_CC_BY, None),
            PlanTier::Paid => {
                let published = self
                    .published_to_community
                    .as_deref()
                    .map(RightsPredicate::from_stored)
                    .unwrap_or(RightsPredicate::Unknown);
                if published == RightsPredicate::Yes {
                    return (RIGHTS_NOASSERTION, Some("published-to-community"));
                }

                let attested = self
                    .third_party_material_attested
                    .as_deref()
                    .map(RightsPredicate::from_stored)
                    .unwrap_or(RightsPredicate::Unknown);
                if attested == RightsPredicate::Yes {
                    (RIGHTS_PAID_OWNED, None)
                } else {
                    (RIGHTS_NOASSERTION, Some("material-unattested"))
                }
            }
            PlanTier::Unknown => (RIGHTS_NOASSERTION, Some("tier-unrecorded")),
        }
    }
}

#[derive(Debug, Clone)]
pub struct AssetRecord {
    pub id: String,
    pub rights: RightsRecord,
    pub meshy_type: String,
    pub parent_task_id: Option<String>,
    pub prompt: Option<String>,
    pub image_url: Option<String>,
    pub ai_model: Option<String>,
    pub status: String,
    pub progress: i64,
    pub consumed_credits: i64,
    pub thumbnail_path: Option<String>,
    pub file_paths_json: String,
    pub texture_paths_json: String,
    pub notes: String,
    pub tags_json: String,
    pub created_at: i64,
    pub started_at: i64,
    pub finished_at: i64,
    pub downloaded_at: i64,
    pub error_message: Option<String>,
    pub has_textures: bool,
    pub has_rig: bool,
    pub has_animation: bool,
    pub favorite: bool,
    pub last_viewed_at: i64,
}

/// Output struct for reading an asset row from SQLite.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetRow {
    pub id: String,
    pub rights: RightsRecord,
    pub task_type: String,
    pub status: String,
    pub progress: i64,
    pub consumed_credits: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_task_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ai_model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_path: Option<String>,
    /// Role-keyed storage map (TPC-04): `primary` artifacts keep the bare
    /// format key (`glb`, `fbx`, …); other roles are keyed
    /// `<role>[-<label>].<format>` (e.g. `armature.fbx`,
    /// `presetClip-walking.glb`). Deserialized from the `assets.file_paths`
    /// JSON blob at read time (F2) — crosses IPC as a JSON object, never a
    /// string. Values are provider URLs before download, local paths after.
    pub file_paths: HashMap<String, String>,
    /// Texture-map entries, one object per material set. Entries keep their
    /// provider-shaped keys (`base_color`, `metallic`, … — or the
    /// camelCase form, depending on which writer produced them); they are
    /// deliberately NOT reshaped into [`TextureUrl`] (F2): the stored array
    /// is deserialized verbatim so no era's keys are silently dropped.
    pub texture_paths: Vec<serde_json::Value>,
    pub notes: String,
    /// Free-form user tags, deserialized from the `assets.tags` JSON-array
    /// blob at read time (F2) — crosses IPC as a JSON array, never a string.
    pub tags: Vec<String>,
    pub created_at: i64,
    pub started_at: i64,
    pub finished_at: i64,
    pub downloaded_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
    pub has_textures: bool,
    pub has_rig: bool,
    pub has_animation: bool,
    pub favorite: bool,
    pub last_viewed_at: i64,
}

/// F2 degrade policy for the asset JSON-blob columns (`file_paths`,
/// `texture_paths`, `tags`).
///
/// Every writer in this app serializes these columns with `serde_json`
/// (`insert_asset` receives `*_json` strings built by `save_completed_task`,
/// `mark_downloaded` calls `Value::to_string()`, `update_tags` serializes a
/// `Vec<&String>`), and the schema defaults are `'{}'` / `'[]'` — so a
/// well-formed database always yields an object/array here. A malformed or
/// NULL value can therefore only come from corruption or an external edit;
/// it degrades to the caller-supplied empty value and logs a warning rather
/// than erroring the whole row out of the asset list.
fn parse_json_blob_or_default<T: serde::de::DeserializeOwned>(
    raw: Option<String>,
    column: &str,
    asset_id: &str,
    default: T,
) -> T {
    let Some(text) = raw else {
        log::warn!("asset {asset_id}: NULL column `{column}` degraded to default");
        return default;
    };
    match serde_json::from_str::<T>(&text) {
        Ok(parsed) => parsed,
        Err(error) => {
            log::warn!("asset {asset_id}: malformed `{column}` JSON ({error}) degraded to default");
            default
        }
    }
}

impl AssetRow {
    /// Construct an `AssetRow` from a rusqlite `Row`.
    ///
    /// `file_paths`, `texture_paths` and `tags` are stored as JSON blob
    /// strings but deserialized here so they cross the IPC boundary as
    /// structured values (architectural finding F2); malformed or NULL
    /// blobs degrade to empty per [`parse_json_blob_or_default`].
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        let id: String = row.get("id")?;
        let file_paths = parse_json_blob_or_default(
            row.get::<_, Option<String>>("file_paths")?,
            "file_paths",
            &id,
            HashMap::new(),
        );
        let texture_paths = parse_json_blob_or_default(
            row.get::<_, Option<String>>("texture_paths")?,
            "texture_paths",
            &id,
            Vec::new(),
        );
        let tags = parse_json_blob_or_default(
            row.get::<_, Option<String>>("tags")?,
            "tags",
            &id,
            Vec::new(),
        );
        // ADR-0018: the predicates are read raw; the identifier and reason are
        // DERIVED once, here, in Rust (`D-1`). An unrecognised stored value
        // degrades to `Unknown`, and NULL stays NULL (pre-baseline, `ND-8`).
        // Named column gets, so appending columns to the table cannot misalign
        // this read path.
        let mut rights = RightsRecord {
            plan_tier_at_generation: row.get("plan_tier_at_generation")?,
            published_to_community: row.get("published_to_community")?,
            third_party_material_attested: row.get("third_party_material_attested")?,
            disclosure_posture: row.get("disclosure_posture")?,
            recorded_at: row.get("rights_recorded_at")?,
            identifier: String::new(),
            reason: None,
        };
        rights.refresh_derived();
        Ok(Self {
            id,
            rights,
            task_type: row.get("meshy_type")?,
            status: row.get("status")?,
            progress: row.get("progress")?,
            consumed_credits: row.get("consumed_credits")?,
            parent_task_id: row.get("parent_task_id")?,
            prompt: row.get("prompt")?,
            image_url: row.get("image_url")?,
            ai_model: row.get("ai_model")?,
            thumbnail_path: row.get("thumbnail_path")?,
            file_paths,
            texture_paths,
            notes: row.get("notes")?,
            tags,
            created_at: row.get("created_at")?,
            started_at: row.get("started_at")?,
            finished_at: row.get("finished_at")?,
            downloaded_at: row.get("downloaded_at")?,
            error_message: row.get("error_message")?,
            has_textures: row.get("has_textures")?,
            has_rig: row.get("has_rig")?,
            has_animation: row.get("has_animation")?,
            favorite: row.get("favorite")?,
            last_viewed_at: row.get("last_viewed_at")?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_status_serializes_screaming_snake_case() {
        let json = serde_json::to_string(&TaskStatus::InProgress).unwrap();
        assert_eq!(json, r#""IN_PROGRESS""#);
    }

    #[test]
    fn test_ai_model_serializes_with_hyphen() {
        let json = serde_json::to_string(&AiModel::Meshy6).unwrap();
        assert_eq!(json, r#""meshy-6""#);
    }

    #[test]
    fn test_export_format_3mf_serializes_correctly() {
        let json = serde_json::to_string(&ExportFormat::ThreeMf).unwrap();
        assert_eq!(json, r#""3mf""#);
    }

    #[test]
    fn test_meshy_type_roundtrips() {
        let ty = MeshyType::TextTo3dPreview;
        let json = serde_json::to_string(&ty).unwrap();
        assert_eq!(json, r#""text-to-3d-preview""#);
        let deserialized: MeshyType = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, ty);
    }

    #[test]
    fn test_balance_response_deserializes() {
        let json = r#"{"balance": 500}"#;
        let resp: BalanceResponse = serde_json::from_str(json).unwrap();
        assert_eq!(resp.balance, 500);
    }

    #[test]
    fn test_task_create_response_deserializes() {
        let json = r#"{"result": "task-abc-123"}"#;
        let resp: TaskCreateResponse = serde_json::from_str(json).unwrap();
        assert_eq!(resp.result, "task-abc-123");
    }

    #[test]
    fn test_task_object_deserializes_from_meshy_api() {
        let json = serde_json::json!({
            "id": "task-123",
            "type": "text-to-3d-preview",
            "status": "SUCCEEDED",
            "progress": 100,
            "createdAt": 1700000000000i64,
            "startedAt": 1700000001000i64,
            "finishedAt": 1700000002000i64,
            "precedingTasks": 0,
            "taskError": null,
            "consumedCredits": 5
        });
        let task: TaskObject = serde_json::from_value(json).unwrap();
        assert_eq!(task.id, "task-123");
        assert_eq!(task.r#type, MeshyType::TextTo3dPreview);
        assert_eq!(task.status, TaskStatus::Succeeded);
        assert_eq!(task.progress, 100);
        assert!(task.task_error.is_none());
        assert_eq!(task.consumed_credits, 5);
    }

    #[test]
    fn test_task_object_result_is_null_tolerant() {
        // Explicit null result (e.g. while PENDING) must deserialize to None,
        // not crash (LESSONS_LEARNED #10).
        let json = serde_json::json!({
            "id": "task-1",
            "type": "text-to-motion",
            "status": "PENDING",
            "progress": 0,
            "createdAt": 1700000000000i64,
            "startedAt": 0i64,
            "finishedAt": 0i64,
            "precedingTasks": 0,
            "taskError": null,
            "consumedCredits": 0,
            "result": null
        });
        let task: TaskObject = serde_json::from_value(json).unwrap();
        assert_eq!(task.r#type, MeshyType::TextToMotion);
        assert!(task.result.is_none());
    }

    #[test]
    fn test_text_to_motion_result_deserializes_nested_urls() {
        let json = serde_json::json!({
            "motionUrl": "https://assets.meshy.ai/x/motion.fbx",
            "motionFormat": "fbx",
            "durationMs": 2500,
            "mode": "prime"
        });
        let result: TextToMotionResult = serde_json::from_value(json).unwrap();
        assert_eq!(
            result.motion_url.as_deref(),
            Some("https://assets.meshy.ai/x/motion.fbx")
        );
        assert_eq!(result.motion_format.as_deref(), Some("fbx"));
        assert_eq!(result.duration_ms, Some(2500));
    }

    #[test]
    fn test_animation_result_null_fields_deserialize() {
        let json = serde_json::json!({
            "animationGlbUrl": "https://assets.meshy.ai/x/a.glb",
            "animationFbxUrl": null,
            "processedUsdzUrl": null
        });
        let result: AnimationResult = serde_json::from_value(json).unwrap();
        assert_eq!(
            result.animation_glb_url.as_deref(),
            Some("https://assets.meshy.ai/x/a.glb")
        );
        assert!(result.animation_fbx_url.is_none());
        assert!(result.processed_usdz_url.is_none());
    }

    #[test]
    fn test_text_to_motion_request_serializes_wire_shape() {
        let req = TextToMotionRequest {
            prompt: "a kata".to_string(),
            mode: TextToMotionMode::Prime,
            duration: 2.5,
        };
        let json = serde_json::to_value(&req).unwrap();
        assert_eq!(json["prompt"], "a kata");
        assert_eq!(json["mode"], "prime");
        assert_eq!(json["duration"], 2.5);
    }

    #[test]
    fn test_texture_url_with_null_fields() {
        let json = r#"{"baseColor": null, "metallic": null, "normal": null, "roughness": null, "emission": null}"#;
        let tex: TextureUrl = serde_json::from_str(json).unwrap();
        assert!(tex.base_color.is_none());
    }

    // ─── AssetRow JSON-blob deserialization (finding F2) ─────────────
    //
    // file_paths / texture_paths / tags are stored as JSON blob strings but
    // must cross the IPC boundary as structured values. from_row parses them
    // and degrades malformed or NULL blobs to empty instead of erroring.

    /// Build a one-row `assets` table matching the columns `AssetRow::from_row`
    /// reads, with caller-controlled blob columns. Deliberately standalone
    /// (no migration files) so these tests pin the read contract itself.
    fn asset_row_table(
        file_paths: Option<&str>,
        texture_paths: Option<&str>,
        tags: Option<&str>,
    ) -> rusqlite::Connection {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE assets (
                id TEXT, meshy_type TEXT, status TEXT, progress INTEGER,
                consumed_credits INTEGER, parent_task_id TEXT, prompt TEXT,
                image_url TEXT, ai_model TEXT, thumbnail_path TEXT,
                file_paths TEXT, texture_paths TEXT, notes TEXT, tags TEXT,
                created_at INTEGER, started_at INTEGER, finished_at INTEGER,
                downloaded_at INTEGER, error_message TEXT, has_textures INTEGER,
                has_rig INTEGER, has_animation INTEGER, favorite INTEGER,
                last_viewed_at INTEGER,
                plan_tier_at_generation TEXT, published_to_community TEXT,
                third_party_material_attested TEXT, disclosure_posture TEXT,
                rights_recorded_at INTEGER
             );",
        )
        .unwrap();
        conn.execute(
            "INSERT INTO assets (
                id, meshy_type, status, progress, consumed_credits,
                file_paths, texture_paths, notes, tags,
                created_at, started_at, finished_at, downloaded_at,
                has_textures, has_rig, has_animation, favorite, last_viewed_at
             ) VALUES (
                'task-f2', 'rig', 'SUCCEEDED', 100, 5,
                ?1, ?2, '', ?3,
                1, 2, 3, 4, 1, 1, 1, 0, 0
             )",
            rusqlite::params![file_paths, texture_paths, tags],
        )
        .unwrap();
        conn
    }

    fn read_single_asset_row(conn: &rusqlite::Connection) -> AssetRow {
        let mut stmt = conn.prepare("SELECT * FROM assets").unwrap();
        let mut rows = stmt.query_map([], AssetRow::from_row).unwrap();
        rows.next().unwrap().unwrap()
    }

    #[test]
    fn asset_row_from_row_parses_json_blob_columns() {
        let conn = asset_row_table(
            Some(
                r#"{"glb":"C:\\assets\\task\\model.glb","armature.fbx":"C:\\assets\\task\\armature.fbx"}"#,
            ),
            Some(r#"[{"base_color":"C:\\assets\\task\\base.png","metallic":null}]"#),
            Some(r#"["fantasy","dragon"]"#),
        );
        let row = read_single_asset_row(&conn);
        // TPC-04 role keys (bare primary + role-tagged) survive as map keys.
        assert_eq!(row.file_paths.len(), 2);
        assert_eq!(row.file_paths["glb"], "C:\\assets\\task\\model.glb");
        assert_eq!(
            row.file_paths["armature.fbx"],
            "C:\\assets\\task\\armature.fbx"
        );
        // Texture entries keep their provider-shaped keys verbatim (no reshape).
        assert_eq!(row.texture_paths.len(), 1);
        assert_eq!(
            row.texture_paths[0]["base_color"],
            serde_json::json!("C:\\assets\\task\\base.png")
        );
        assert!(row.texture_paths[0]["metallic"].is_null());
        assert_eq!(row.tags, vec!["fantasy".to_string(), "dragon".to_string()]);
    }

    #[test]
    fn asset_row_from_row_degrades_malformed_blobs_to_empty() {
        let conn = asset_row_table(Some("not json"), Some("{oops"), Some("garbage"));
        let row = read_single_asset_row(&conn);
        assert!(row.file_paths.is_empty());
        assert!(row.texture_paths.is_empty());
        assert!(row.tags.is_empty());
        // The rest of the row still reads — a bad blob never errors the row.
        assert_eq!(row.id, "task-f2");
        assert_eq!(row.status, "SUCCEEDED");
    }

    #[test]
    fn asset_row_from_row_degrades_null_blobs_to_empty() {
        let conn = asset_row_table(Some("{}"), None, None);
        let row = read_single_asset_row(&conn);
        assert!(row.file_paths.is_empty());
        assert!(row.texture_paths.is_empty());
        assert!(row.tags.is_empty());
        assert_eq!(row.id, "task-f2");
    }

    #[test]
    fn asset_row_serializes_blobs_as_camel_case_json_values() {
        let conn = asset_row_table(
            Some(r#"{"glb":"/p/model.glb"}"#),
            Some(r#"[{"baseColor":"/p/base.png"}]"#),
            Some(r#"["x"]"#),
        );
        let row = read_single_asset_row(&conn);
        let value = serde_json::to_value(&row).unwrap();
        // IPC emits objects/arrays, not JSON strings (finding F2).
        assert!(value["filePaths"].is_object());
        assert_eq!(value["filePaths"]["glb"], "/p/model.glb");
        assert!(value["texturePaths"].is_array());
        assert_eq!(value["texturePaths"][0]["baseColor"], "/p/base.png");
        assert!(value["tags"].is_array());
        assert_eq!(value["tags"][0], "x");
        assert!(value.get("file_paths").is_none());
        assert!(value.get("texture_paths").is_none());
    }
}

/// ADR-0018 / `LM-01`: the rights derivation is the whole control, so it gets
/// its own test module rather than riding along in the blob-parsing tests.
#[cfg(test)]
mod rights_tests {
    use super::*;

    fn record(tier: Option<&str>, published: Option<&str>, attested: Option<&str>) -> RightsRecord {
        let mut rights = RightsRecord {
            plan_tier_at_generation: tier.map(str::to_string),
            published_to_community: published.map(str::to_string),
            third_party_material_attested: attested.map(str::to_string),
            disclosure_posture: None,
            recorded_at: Some(1),
            identifier: String::new(),
            reason: None,
        };
        rights.refresh_derived();
        rights
    }

    /// All 3 x 2 x 2 combinations, not just the five canonical rows.
    ///
    /// A five-row test cannot catch a REORDERING of the precedence branches:
    /// `paid + published + attested` must be `published-to-community`, not
    /// `LicenseRef-Meshy-Paid-Owned`, and only the combination table pins that.
    /// It also proves the `match` on `PlanTier` is total.
    #[test]
    fn rights_derivation_covers_all_twelve_combinations() {
        let cases = [
            // Free-plan output is CC BY wherever it came from; publishing and
            // attestation do not change the identifier.
            ("free", "no", "yes", RIGHTS_CC_BY, None),
            ("free", "no", "no", RIGHTS_CC_BY, None),
            ("free", "yes", "yes", RIGHTS_CC_BY, None),
            ("free", "yes", "no", RIGHTS_CC_BY, None),
            // Paid, not published.
            ("paid", "no", "yes", RIGHTS_PAID_OWNED, None),
            (
                "paid",
                "no",
                "no",
                RIGHTS_NOASSERTION,
                Some("material-unattested"),
            ),
            // Paid AND published: the published check must win even when the
            // asset was also attested clean.
            (
                "paid",
                "yes",
                "yes",
                RIGHTS_NOASSERTION,
                Some("published-to-community"),
            ),
            (
                "paid",
                "yes",
                "no",
                RIGHTS_NOASSERTION,
                Some("published-to-community"),
            ),
            // Tier unknown: nothing else can rescue the identifier.
            (
                "unknown",
                "no",
                "yes",
                RIGHTS_NOASSERTION,
                Some("tier-unrecorded"),
            ),
            (
                "unknown",
                "no",
                "no",
                RIGHTS_NOASSERTION,
                Some("tier-unrecorded"),
            ),
            (
                "unknown",
                "yes",
                "yes",
                RIGHTS_NOASSERTION,
                Some("tier-unrecorded"),
            ),
            (
                "unknown",
                "yes",
                "no",
                RIGHTS_NOASSERTION,
                Some("tier-unrecorded"),
            ),
        ];

        for (tier, published, attested, identifier, reason) in cases {
            let rights = record(Some(tier), Some(published), Some(attested));
            let label = format!("tier={tier} published={published} attested={attested}");
            assert_eq!(rights.identifier, identifier, "{label}");
            assert_eq!(rights.reason.as_deref(), reason, "{label}");
        }
    }

    /// `NULL` (pre-baseline, `ND-8`) and `'unknown'` (a recorded assertion that
    /// the owner does not know) both derive `NOASSERTION` but mean different
    /// things and must stay distinguishable in what is STORED.
    #[test]
    fn rights_null_and_recorded_unknown_stay_distinguishable() {
        let pre_baseline = RightsRecord::default();
        assert!(pre_baseline.plan_tier_at_generation.is_none());
        assert_eq!(pre_baseline.identifier, RIGHTS_NOASSERTION);
        assert_eq!(pre_baseline.reason.as_deref(), Some("tier-unrecorded"));

        let asserted = record(Some("unknown"), None, None);
        assert_eq!(asserted.plan_tier_at_generation.as_deref(), Some("unknown"));
        assert_eq!(asserted.identifier, RIGHTS_NOASSERTION);
    }

    /// An unrecognised stored value degrades to Unknown rather than panicking:
    /// fail-safe, because the identifier can only become less assertive.
    #[test]
    fn rights_unrecognised_values_degrade_to_unknown() {
        let rights = record(Some("enterprise"), Some("maybe"), Some("probably"));
        assert_eq!(rights.identifier, RIGHTS_NOASSERTION);
        assert_eq!(rights.reason.as_deref(), Some("tier-unrecorded"));
    }

    /// A brand-new asset records nothing and must not claim an identifier.
    #[test]
    fn rights_default_is_honest_and_serializes_camel_case() {
        let value = serde_json::to_value(RightsRecord::default()).unwrap();
        assert_eq!(value["identifier"], RIGHTS_NOASSERTION);
        assert_eq!(value["reason"], "tier-unrecorded");
        assert!(value["planTierAtGeneration"].is_null());
        assert!(value["recordedAt"].is_null());
    }
}
