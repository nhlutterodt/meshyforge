# Rust Type Definitions — MeshyForge

## Document Metadata
| Field | Value |
|---|---|
| **Project** | MeshyForge — AI 3D Asset Studio |
| **Document Type** | Rust Type Definitions Reference |
| **Version** | 1.0.0 |
| **Date** | 2026 |
| **Status** | Reference (produced per project decision, overriding Documentation Gap Assessment v1.0.0 Gap 3) |
| **Dependencies** | TDD v1.0.0 §6.2 (canonical TypeScript source), CSD v1.0.0 §6.3 (pattern) |

---

## 1. Purpose

The Documentation Gap Assessment (§6.2, "Gap 3 — Complete Rust Type Definitions") evaluated whether to produce a complete Rust mirror of the ~20 TypeScript types in [`technical_design_document.md`](./technical_design_document.md) §6.2 and recommended **against** it, on the grounds that the serde pattern in [`coding_standards.md`](./coding_standards.md) §6.3 is already clear and that a parallel type set risks drifting from the canonical source. That recommendation stands as sound engineering advice. The project owner has explicitly chosen to override it and requested this document anyway, as a standalone build-time reference.

**This document is the target content of `src-tauri/src/meshy/models.rs`.** It translates every TypeScript type defined in TDD §6.2 into a corresponding Rust `struct` or `enum`, following the serde conventions established in CSD §6.3 ("Struct Design Pattern") and the general Rust rules in CSD §6.1 (RST-01 through RST-15).

**Canonicity.** TDD §6.2's TypeScript type definitions remain the single source of truth for the MeshyForge data model. This document is a derived artifact. **If the two ever diverge, TDD §6.2 wins**, and this file must be regenerated from it — do not hand-edit this document and TDD §6.2 independently. A comment to that effect should be placed at the top of `models.rs` when this content is transcribed into source.

**Scope note.** This document covers only the request/response and domain types from TDD §6.2. It does not cover the `MeshyError` error enum (CSD §6.2) or the SQLite row types (TDD §6.1), which are separate, already-specified concerns.

### 1.1 Required imports

Every code block below assumes the following imports are present at the top of `models.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
```

---

## 2. Enums

This section covers the four top-level enums defined explicitly in TDD §6.2 (`TaskStatus`, `AiModel`, `MeshyType`, `ExportFormat`), plus the smaller inline string-literal unions used as field types throughout the request structs (e.g. `topology?: 'quad' | 'triangle'`). TDD §6.2 does not name these inline unions, so this document promotes each repeated one to a named, reusable enum — this is the one place a literal 1:1 transcription is impossible, since TypeScript inline unions have no Rust equivalent inside a struct field. See §6, "Design Notes & Judgment Calls," for the full reasoning.

### 2.1 `TaskStatus`

```rust
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
```

### 2.2 `AiModel`

```rust
/// Meshy AI model generation selector, used across text-to-3D, image-to-3D,
/// and retexture requests.
///
/// Mirrors TDD §6.2 `AiModel`. Variants are explicitly renamed rather than
/// relying on a `rename_all` case conversion, because `meshy-5`/`meshy-6`/
/// `meshy-7` mix a fixed prefix with a digit in a way that case-conversion
/// helpers do not reliably reproduce.
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
```

### 2.3 `MeshyType`

```rust
/// Discriminates every kind of task the Meshy API (and MeshyForge's Creative
/// Lab wrapper endpoints) can produce.
///
/// Mirrors TDD §6.2 `MeshyType`. All 30 variants are explicitly renamed
/// rather than using `rename_all = "kebab-case"`: several source strings mix
/// digits with word boundaries (`text-to-3d-preview`) in ways that
/// case-conversion helpers do not reliably reproduce, so explicit renames
/// are used uniformly across every variant for auditability.
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
```

### 2.4 `ExportFormat`

```rust
/// 3D file export/target format, used in `targetFormats` fields across
/// nearly every generation and post-processing request.
///
/// Mirrors TDD §6.2 `ExportFormat`. Five of six variants case-convert
/// cleanly via `rename_all = "lowercase"`; `3mf` is overridden explicitly
/// because Rust identifiers cannot begin with a digit.
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
```

### 2.5 Shared inline-union enums

The following enums do not correspond to a named TypeScript type in TDD §6.2 — each mirrors a repeated *inline* string-literal union (e.g. `topology?: 'quad' | 'triangle'`) that appears identically across several request interfaces. Promoting each to one named enum avoids defining the same union five separate times and keeps every call site type-safe. See §6 for the full list of TS union sites each enum replaces.

```rust
/// Fixed-value discriminant for the two-phase Text-to-3D workflow.
///
/// Mirrors the `mode` literal field on TDD §6.2 `TextTo3DPreviewRequest`
/// (`'preview'`) and `TextTo3DRefineRequest` (`'refine'`). Each request
/// struct pins this to exactly one variant.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TextTo3DMode {
    Preview,
    Refine,
}

/// Topology/geometry style requested for a generated or remeshed model.
///
/// Mirrors the `modelType?: 'standard' | 'lowpoly' | 'smart-topology'`
/// inline union used by `TextTo3DPreviewRequest`, `ImageTo3DRequest`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ModelType {
    Standard,
    Lowpoly,
    SmartTopology,
}

/// Mesh topology style for retopology/remesh operations.
///
/// Mirrors the `topology?: 'quad' | 'triangle'` inline union used by
/// `TextTo3DPreviewRequest`, `ImageTo3DRequest`, `MultiImageTo3DRequest`,
/// and `RemeshRequest`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Topology {
    Quad,
    Triangle,
}

/// Target rig pose for a generated model, or unspecified.
///
/// Mirrors the `poseMode?: 'a-pose' | 't-pose' | ''` inline union used by
/// `TextTo3DPreviewRequest`, `ImageTo3DRequest`, and
/// `MultiImageTo3DRequest`. `TextToImageRequest` reuses this same enum but
/// only ever populates the `APose`/`TPose` variants (its TS union omits the
/// empty-string case) — see §6 for this judgment call.
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
///
/// Mirrors the `originAt?: 'bottom' | 'center'` inline union used by
/// `TextTo3DPreviewRequest`, `TextTo3DRefineRequest`, `ImageTo3DRequest`,
/// `MultiImageTo3DRequest`, and `ResizeRequest`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OriginAt {
    Bottom,
    Center,
}

/// PBR texture resolution.
///
/// Mirrors the `textureResolution?: '2k' | '4k' | '8k'` inline union used
/// by `TextTo3DRefineRequest`, `ImageTo3DRequest`, `MultiImageTo3DRequest`,
/// and `RetextureRequest`. Variants are explicitly renamed because Rust
/// identifiers cannot begin with a digit.
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
///
/// Mirrors the `aiModel` inline union on `TextToImageRequest` and
/// `ImageToImageRequest` (`'nano-banana' | 'nano-banana-2' |
/// 'nano-banana-pro' | 'gpt-image-2'`). Deliberately distinct from
/// `AiModel` (§2.2), which is the 3D-generation model selector — the two
/// TS unions share no values and are never interchangeable.
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
///
/// Mirrors the `aspectRatio?` inline union used by `TextToImageRequest`
/// and `ImageToImageRequest`. All variants are explicitly renamed because
/// the wire values contain `:` and cannot be produced by any `rename_all`
/// case conversion.
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
///
/// Mirrors the `postProcess.operationType` inline union on
/// `AnimationRequest` (`'change_fps' | 'fbx2usdz' | 'extract_armature'`).
/// Explicitly renamed rather than using `rename_all = "snake_case"` because
/// `fbx2usdz` mixes a digit into the identifier in a way case-conversion
/// helpers do not reliably reproduce; explicit renames are used uniformly
/// across all three variants for auditability.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PostProcessOperationType {
    #[serde(rename = "change_fps")]
    ChangeFps,
    #[serde(rename = "fbx2usdz")]
    Fbx2Usdz,
    #[serde(rename = "extract_armature")]
    ExtractArmature,
}
```

---

## 3. Asset and Supporting Structs

### 3.1 `Asset`

```rust
/// A locally-stored MeshyForge asset record — the persisted, denormalized
/// view of a Meshy task plus MeshyForge-local metadata (tags, notes,
/// favorite flag, downloaded file paths).
///
/// Mirrors TDD §6.2 `Asset`. Every field is required in the TypeScript
/// source (none use `?:`); fields typed `T | null` there are `Option<T>`
/// here **without** `#[serde(skip_serializing_if)]`, since the field is
/// always present on the wire and merely may hold a JSON `null` — see §6.
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
```

### 3.2 `TextureUrl`

```rust
/// PBR texture map URLs for a single material channel set.
///
/// Mirrors TDD §6.2 `TextureUrl`. All five fields are required-but-nullable
/// in the TypeScript source, so each is `Option<String>` without
/// `#[serde(skip_serializing_if)]` — see §6.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextureUrl {
    pub base_color: Option<String>,
    pub metallic: Option<String>,
    pub normal: Option<String>,
    pub roughness: Option<String>,
    pub emission: Option<String>,
}
```

---

## 4. API Request Structs

### 4.1 `TextTo3DPreviewRequest`

```rust
/// Request body for the "preview" phase of the two-phase Text-to-3D
/// workflow. Mirrors TDD §6.2 `TextTo3DPreviewRequest`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextTo3DPreviewRequest {
    /// Always `TextTo3DMode::Preview` for this request type.
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
    /// Valid values: `1`, `2`, `3`, `4`. Kept as `u8` rather than a numeric
    /// enum — see §6.
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
```

### 4.2 `TextTo3DRefineRequest`

```rust
/// Request body for the "refine" phase of the two-phase Text-to-3D
/// workflow, applied to a completed preview task. Mirrors TDD §6.2
/// `TextTo3DRefineRequest`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextTo3DRefineRequest {
    /// Always `TextTo3DMode::Refine` for this request type.
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
```

### 4.3 `ImageTo3DRequest`

```rust
/// Request body for single-image-to-3D generation. Mirrors TDD §6.2
/// `ImageTo3DRequest`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageTo3DRequest {
    /// Source image URL. TDD §6.2 notes this is used interchangeably with
    /// `inputTaskId` (only one is normally supplied), but the TypeScript
    /// interface still declares `imageUrl` as required, so it is
    /// non-optional here too — see §6.
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
```

### 4.4 `MultiImageTo3DRequest`

```rust
/// Request body for multi-image-to-3D generation. Mirrors TDD §6.2
/// `MultiImageTo3DRequest`. Note there is no `modelType` field here — that
/// is not an omission; TDD §6.2's interface genuinely lacks it (unlike
/// `ImageTo3DRequest`, which has one).
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
```

### 4.5 `RemeshRequest`

```rust
/// Request body for remeshing an existing model. Mirrors TDD §6.2
/// `RemeshRequest`.
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
```

### 4.6 `RetextureRequest`

```rust
/// Request body for applying a new texture/material to an existing model.
/// Mirrors TDD §6.2 `RetextureRequest`.
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
```

### 4.7 `ConvertRequest`

```rust
/// Request body for converting an existing model to additional export
/// formats. Mirrors TDD §6.2 `ConvertRequest`. `targetFormats` is the only
/// required field on this request type in the TypeScript source.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_task_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_url: Option<String>,
    pub target_formats: Vec<ExportFormat>,
}
```

### 4.8 `ResizeRequest`

```rust
/// Request body for rescaling/repositioning an existing model. Mirrors TDD
/// §6.2 `ResizeRequest`. `resizeHeight` and `resizeLongestSide` are `f64`
/// rather than `i64` because they represent physical measurements that may
/// be fractional — see §6.
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
```

### 4.9 `RiggingRequest`

```rust
/// Request body for auto-rigging an existing model. Mirrors TDD §6.2
/// `RiggingRequest`. `heightMeters` is `f64` for the same reason as
/// `ResizeRequest`'s measurement fields — see §6.
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
```

### 4.10 `AnimationRequest`

```rust
/// Request body for applying a preset animation to a rigged model. Mirrors
/// TDD §6.2 `AnimationRequest`. The inline `postProcess` object type is
/// promoted to a named nested struct, `AnimationPostProcess`, since Rust
/// has no anonymous inline struct field syntax.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationRequest {
    pub rig_task_id: String,
    pub action_id: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_process: Option<AnimationPostProcess>,
}

/// Optional post-processing step applied after animation generation.
///
/// Mirrors the inline `postProcess?: { operationType: ...; fps?: ... }`
/// object type on TDD §6.2 `AnimationRequest`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnimationPostProcess {
    pub operation_type: PostProcessOperationType,
    /// Valid values: `24`, `25`, `30`, `60`. Kept as `u8` rather than a
    /// numeric enum — see §6.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fps: Option<u8>,
}
```

### 4.11 `TextToImageRequest`

```rust
/// Request body for text-to-image generation (2D reference images).
/// Mirrors TDD §6.2 `TextToImageRequest`. `aiModel`, unusually for this
/// document's request types, is required rather than optional, matching
/// the TypeScript source exactly (no `?:`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextToImageRequest {
    pub ai_model: ImageAiModel,
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub generate_multi_view: Option<bool>,
    /// Only the `APose`/`TPose` variants of `PoseMode` are valid here — the
    /// TypeScript union for this field omits the empty-string case that
    /// `PoseMode` otherwise supports. See §6.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pose_mode: Option<PoseMode>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aspect_ratio: Option<AspectRatio>,
}
```

### 4.12 `ImageToImageRequest`

```rust
/// Request body for image-to-image generation (2D reference images).
/// Mirrors TDD §6.2 `ImageToImageRequest`.
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
```

---

## 5. API Response Structs

### 5.1 `TaskCreateResponse`

```rust
/// Response body returned when a new Meshy task is successfully created.
/// Mirrors TDD §6.2 `TaskCreateResponse`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskCreateResponse {
    /// The newly created task's ID.
    pub result: String,
}
```

### 5.2 `TaskObject`

```rust
/// Full task status/result object, as returned by Meshy's task-retrieval
/// and polling endpoints. Mirrors TDD §6.2 `TaskObject`.
///
/// The `type` field uses the raw identifier `r#type` because `type` is a
/// Rust keyword; `#[serde(rename_all = "camelCase")]` on the container
/// still maps it to the wire name `"type"` with no further attribute
/// needed, since camelCase of `type` is `type`.
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

/// Structured error detail attached to a failed task.
///
/// Mirrors the inline `taskError: { message: string; type?: string; code?:
/// string; docUrl?: string } | null` object type on TDD §6.2 `TaskObject`.
/// Promoted to a named struct, `TaskError`, for the same reason as
/// `AnimationPostProcess` (§4.10).
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
```

### 5.3 `BalanceResponse`

```rust
/// Response body for the account credit-balance endpoint. Mirrors TDD
/// §6.2 `BalanceResponse`. Typed as `i64` for consistency with
/// `consumedCredits` elsewhere in this document (CSD §6.3's own
/// `TaskObject` example uses `i64` for credits) — see §6.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BalanceResponse {
    pub balance: i64,
}
```

---

## 6. Design Notes & Judgment Calls

TDD §6.2 is written in TypeScript, which has no direct equivalent for several Rust-specific concerns. The following choices were made consistently across this document; none change the wire shape of any request or response, they only affect the Rust-side ergonomics.

| # | Situation | TypeScript source | Judgment call |
|---|---|---|---|
| 1 | Required-but-nullable fields (`T \| null`, no `?:`) | `Asset.prompt: string \| null`, all five `TextureUrl` fields, `TaskObject.taskError` | Modeled as `Option<T>` **without** `#[serde(skip_serializing_if)]`. This is deliberately different from optional fields (`?:`), which get `Option<T>` **with** the skip attribute. The distinction preserves the TS semantics: a required-nullable field always appears in the JSON (possibly as `null`), while an optional field may be absent entirely. |
| 2 | Repeated inline string-literal unions | `topology?: 'quad' \| 'triangle'` (4 call sites), `originAt?: 'bottom' \| 'center'` (5 call sites), etc. | Promoted to seven named, shared enums (§2.5: `TextTo3DMode`, `ModelType`, `Topology`, `PoseMode`, `OriginAt`, `TextureResolution`, `ImageAiModel`, `AspectRatio`, `PostProcessOperationType` — nine total) rather than redefining the union at each struct field. TDD §6.2 doesn't name these because TypeScript allows anonymous inline unions; Rust struct fields require a named type. |
| 3 | `PoseMode` used with a narrower union at one call site | `TextTo3DPreviewRequest.poseMode?: 'a-pose' \| 't-pose' \| ''` vs. `TextToImageRequest.poseMode?: 'a-pose' \| 't-pose'` (no empty-string case) | Reused the single three-variant `PoseMode` enum for both, since the image-endpoint union is a strict subset. Documented via a doc comment on `TextToImageRequest.pose_mode` rather than introducing a second near-duplicate enum. |
| 4 | Numeric literal unions | `decimationMode?: 1 \| 2 \| 3 \| 4`, `fps?: 24 \| 25 \| 30 \| 60` | Modeled as plain `Option<u8>` with a doc comment listing the valid values, rather than a numeric-discriminant enum (which serde supports awkwardly and which would need custom `Serialize`/`Deserialize` impls to round-trip as bare integers rather than as objects). This is the "String with a comment" escape hatch from the task brief, applied to `u8` instead since these are numeric, not string, literals. |
| 5 | `type` as a field/struct name | `TaskObject.type: MeshyType`, `taskError.type?: string` | Rendered as the raw identifier `r#type`, since `type` is a reserved word in Rust. No `#[serde(rename)]` is needed because `rename_all = "camelCase"` maps the identifier `type` to the wire name `"type"` unchanged. |
| 6 | Anonymous inline object types | `AnimationRequest.postProcess?: { operationType: ...; fps?: ... }`, `TaskObject.taskError: { message: ...; type?: ...; code?: ...; docUrl?: ... } \| null` | Promoted to named nested structs (`AnimationPostProcess`, `TaskError`) since Rust has no anonymous struct field syntax equivalent to TypeScript's inline object types. |
| 7 | `Record<string, string>` | `Asset.filePaths`, `TaskObject.modelUrls`, `TaskObject.thumbnailUrls` | Modeled as `HashMap<String, String>` (or `Option<HashMap<String, String>>` where the field is optional), the direct Rust equivalent of a TS string-keyed record. |
| 8 | Numeric fields with fractional physical meaning | `ResizeRequest.resizeHeight`, `ResizeRequest.resizeLongestSide`, `RiggingRequest.heightMeters` | Modeled as `f64` rather than `i64`. TypeScript's `number` type doesn't distinguish integers from floats, but these three specifically represent physical measurements (model height, side length, rig height in meters) where fractional values are plausible; every other `number` field in TDD §6.2 (progress, timestamps, credits, polycount) is a count or timestamp and was kept as `i64`, matching CSD §6.3's own `TaskObject` example. |
| 9 | `TaskStatus` and `Asset.consumedCredits`/`TaskObject.consumedCredits` casing | `TaskStatus` values are already `SCREAMING_SNAKE_CASE` on the wire (Meshy's own API convention, not MeshyForge's) | `TaskStatus` is the one enum in this document using `rename_all = "SCREAMING_SNAKE_CASE"` instead of a MeshyForge-camelCase-style convention, because it must match Meshy's wire format exactly, not MeshyForge's own IPC contract naming. All *field names*, by contrast, use `rename_all = "camelCase"` per CSD §6.3, consistent with the rest of the document. |
| 10 | `Asset`/`TaskObject`/`TextureUrl` `Copy`-ineligible vs. plain-value enums | All nine shared enums (§2), plus `TaskStatus`, `AiModel`, `MeshyType`, `ExportFormat` | Given `Copy`, `PartialEq`, `Eq` in addition to the required `Debug, Clone, Serialize, Deserialize`, since they are small, fieldless, string-backed enums with no reason to restrict them to move-only semantics — this is idiomatic Rust for this shape of type and does not violate any CSD §6.1 rule (RST-07/RST-08 require at least `Debug`/`Serialize`/`Deserialize`, not a ceiling on additional derives). |

No field was invented or dropped relative to TDD §6.2; every struct's member list was cross-checked line-by-line against the TypeScript source at [`technical_design_document.md`](./technical_design_document.md) lines 416–661.

---

*End of Rust Type Definitions — MeshyForge v1.0.0*
