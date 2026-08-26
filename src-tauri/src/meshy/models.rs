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

/// Request body for applying a preset animation to a rigged model.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationRequest {
    pub rig_task_id: String,
    pub action_id: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_process: Option<AnimationPostProcess>,
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
#[derive(Debug, Clone)]
pub struct AssetRecord {
    pub id: String,
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
    pub file_paths: String,
    pub texture_paths: String,
    pub notes: String,
    pub tags: String,
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

impl AssetRow {
    /// Construct an `AssetRow` from a rusqlite `Row`.
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            task_type: row.get("meshy_type")?,
            status: row.get("status")?,
            progress: row.get("progress")?,
            consumed_credits: row.get("consumed_credits")?,
            parent_task_id: row.get("parent_task_id")?,
            prompt: row.get("prompt")?,
            image_url: row.get("image_url")?,
            ai_model: row.get("ai_model")?,
            thumbnail_path: row.get("thumbnail_path")?,
            file_paths: row.get("file_paths")?,
            texture_paths: row.get("texture_paths")?,
            notes: row.get("notes")?,
            tags: row.get("tags")?,
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
    fn test_texture_url_with_null_fields() {
        let json = r#"{"baseColor": null, "metallic": null, "normal": null, "roughness": null, "emission": null}"#;
        let tex: TextureUrl = serde_json::from_str(json).unwrap();
        assert!(tex.base_color.is_none());
    }
}
