// src/lib/meshy-types.ts
// Source: TDD §6.2 (canonical TypeScript type definitions)

// ─── Enums ─────────────────────────────────────────────────────
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';

export type ModelId = 'meshy-5' | 'meshy-6' | 'meshy-7' | 'latest';

export type TaskType =
  | 'text-to-3d-preview'
  | 'text-to-3d-refine'
  | 'image-to-3d'
  | 'multi-image-to-3d'
  | 'retexture'
  | 'remesh'
  | 'convert'
  | 'resize'
  | 'uv-unwrap'
  | 'rig'
  | 'animate'
  | 'text-to-image'
  | 'image-to-image'
  | 'print-multi-color'
  | 'print-analyze'
  | 'print-repair'
  | 'creative-lab-keychain-prototype'
  | 'creative-lab-keychain-build'
  | 'creative-lab-fridge-magnet-prototype'
  | 'creative-lab-fridge-magnet-build'
  | 'creative-lab-figure-prototype'
  | 'creative-lab-figure-build'
  | 'creative-lab-vinyl-figure-prototype'
  | 'creative-lab-vinyl-figure-build'
  | 'creative-lab-brick-figure-prototype'
  | 'creative-lab-brick-figure-build'
  | 'creative-lab-lamp-prototype'
  | 'creative-lab-lamp-build'
  | 'creative-lab-keycap-prototype'
  | 'creative-lab-keycap-build';

export type ExportFormat = 'glb' | 'fbx' | 'obj' | 'stl' | 'usdz' | '3mf';

// ─── Asset (local database record) ────────────────────────────
export interface Asset {
  id: string;
  taskType: TaskType;
  parentTaskId: string | null;
  prompt: string | null;
  imageUrl: string | null;
  aiModel: ModelId | null;
  status: TaskStatus;
  progress: number;
  consumedCredits: number;
  thumbnailPath: string | null;
  filePaths: Record<string, string>;
  texturePaths: TextureUrl[];
  notes: string;
  tags: string[];
  createdAt: number;
  startedAt: number;
  finishedAt: number;
  downloadedAt: number;
  errorMessage: string | null;
  hasTextures: boolean;
  hasRig: boolean;
  hasAnimation: boolean;
  favorite: boolean;
  lastViewedAt: number;
}

// ─── Texture URLs ─────────────────────────────────────────────
export interface TextureUrl {
  baseColor: string | null;
  metallic: string | null;
  normal: string | null;
  roughness: string | null;
  emission: string | null;
}

// ─── API Request Types ────────────────────────────────────────
export interface TextTo3DPreviewRequest {
  mode: 'preview';
  prompt: string;
  modelType?: 'standard' | 'lowpoly' | 'smart-topology';
  aiModel?: ModelId;
  shouldRemesh?: boolean;
  topology?: 'quad' | 'triangle';
  targetPolycount?: number;
  decimationMode?: 1 | 2 | 3 | 4;
  poseMode?: 'a-pose' | 't-pose' | '';
  moderation?: boolean;
  targetFormats?: ExportFormat[];
  alphaThumbnail?: boolean;
  autoSize?: boolean;
  originAt?: 'bottom' | 'center';
}

export interface TextTo3DRefineRequest {
  mode: 'refine';
  previewTaskId: string;
  enablePbr?: boolean;
  textureResolution?: '2k' | '4k' | '8k';
  texturePrompt?: string;
  textureImageUrl?: string;
  aiModel?: ModelId;
  moderation?: boolean;
  removeLighting?: boolean;
  targetFormats?: ExportFormat[];
  autoSize?: boolean;
  originAt?: 'bottom' | 'center';
}

export interface ImageTo3DRequest {
  imageUrl: string;
  inputTaskId?: string;
  modelType?: 'standard' | 'smart-topology' | 'lowpoly';
  aiModel?: ModelId;
  ultraMode?: boolean;
  shouldTexture?: boolean;
  enablePbr?: boolean;
  textureResolution?: '2k' | '4k' | '8k';
  texturePrompt?: string;
  textureImageUrl?: string;
  shouldRemesh?: boolean;
  topology?: 'quad' | 'triangle';
  targetPolycount?: number;
  poseMode?: 'a-pose' | 't-pose' | '';
  imageEnhancement?: boolean;
  removeLighting?: boolean;
  moderation?: boolean;
  targetFormats?: ExportFormat[];
  autoSize?: boolean;
  originAt?: 'bottom' | 'center';
  alphaThumbnail?: boolean;
  multiViewThumbnails?: boolean;
}

export interface MultiImageTo3DRequest {
  imageUrls?: string[];
  inputTaskId?: string;
  aiModel?: ModelId;
  shouldTexture?: boolean;
  enablePbr?: boolean;
  textureResolution?: '2k' | '4k' | '8k';
  texturePrompt?: string;
  textureImageUrl?: string;
  textureImageUrls?: string[];
  shouldRemesh?: boolean;
  topology?: 'quad' | 'triangle';
  targetPolycount?: number;
  decimationMode?: 1 | 2 | 3 | 4;
  savePreRemeshedModel?: boolean;
  poseMode?: 'a-pose' | 't-pose' | '';
  imageEnhancement?: boolean;
  removeLighting?: boolean;
  moderation?: boolean;
  targetFormats?: ExportFormat[];
  autoSize?: boolean;
  originAt?: 'bottom' | 'center';
  alphaThumbnail?: boolean;
  multiViewThumbnails?: boolean;
}

export interface RemeshRequest {
  inputTaskId?: string;
  modelUrl?: string;
  targetFormats?: ExportFormat[];
  topology?: 'quad' | 'triangle';
  targetPolycount?: number;
  decimationMode?: 1 | 2 | 3 | 4;
  alphaThumbnail?: boolean;
}

export interface RetextureRequest {
  inputTaskId?: string;
  modelUrl?: string;
  textStylePrompt?: string;
  imageStyleUrl?: string;
  multiviewImageUrls?: string[];
  aiModel?: ModelId;
  enableOriginalUv?: boolean;
  enablePbr?: boolean;
  textureResolution?: '2k' | '4k' | '8k';
  removeLighting?: boolean;
  targetFormats?: ExportFormat[];
  alphaThumbnail?: boolean;
}

export interface ConvertRequest {
  inputTaskId?: string;
  modelUrl?: string;
  targetFormats: ExportFormat[];
}

export interface ResizeRequest {
  inputTaskId?: string;
  modelUrl?: string;
  resizeHeight?: number;
  resizeLongestSide?: number;
  autoSize?: boolean;
  originAt?: 'bottom' | 'center';
}

export interface RiggingRequest {
  inputTaskId?: string;
  modelUrl?: string;
  heightMeters?: number;
  textureImageUrl?: string;
}

export interface AnimationRequest {
  rigTaskId: string;
  actionId: number;
  postProcess?: {
    operationType: 'change_fps' | 'fbx2usdz' | 'extract_armature';
    fps?: 24 | 25 | 30 | 60;
  };
}

export interface TextToImageRequest {
  aiModel: 'nano-banana' | 'nano-banana-2' | 'nano-banana-pro' | 'gpt-image-2';
  prompt: string;
  generateMultiView?: boolean;
  poseMode?: 'a-pose' | 't-pose';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';
}

export interface ImageToImageRequest {
  aiModel: 'nano-banana' | 'nano-banana-2' | 'nano-banana-pro' | 'gpt-image-2';
  prompt: string;
  referenceImageUrls: string[];
  generateMultiView?: boolean;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';
}

// ─── API Response Types ───────────────────────────────────────
export interface TaskCreateResponse {
  result: string;
}

export interface TaskError {
  message: string;
  type?: string;
  code?: string;
  docUrl?: string;
}

export interface TaskObject {
  id: string;
  type: TaskType;
  status: TaskStatus;
  progress: number;
  createdAt: number;
  startedAt: number;
  finishedAt: number;
  precedingTasks: number;
  taskError: TaskError | null;
  consumedCredits: number;
  modelUrls?: Record<string, string>;
  thumbnailUrl?: string;
  thumbnailUrls?: Record<string, string>;
  alphaThumbnailUrl?: string;
  prompt?: string;
  texturePrompt?: string;
  textureImageUrl?: string;
  textureUrls?: TextureUrl[];
  imageUrls?: string[];
}

export interface BalanceResponse {
  balance: number;
}

// ─── Active Task (for taskStore) ──────────────────────────────
export interface ActiveTask {
  taskId: string;
  endpoint: string;
  taskType: string;
  status: TaskStatus;
  progress: number;
  label: string;
  startedAt: number;
  error: string | null;
}

// ─── Asset Row (from SQLite via Tauri) ────────────────────────
export interface AssetRow {
  id: string;
  taskType: string;
  status: string;
  progress: number;
  consumedCredits: number;
  parentTaskId?: string;
  prompt?: string;
  imageUrl?: string;
  aiModel?: string;
  thumbnailPath?: string;
  filePaths: string;
  texturePaths: string;
  notes: string;
  tags: string;
  createdAt: number;
  startedAt: number;
  finishedAt: number;
  downloadedAt: number;
  errorMessage?: string;
  hasTextures: boolean;
  hasRig: boolean;
  hasAnimation: boolean;
  favorite: boolean;
  lastViewedAt: number;
}

// ─── Additional Request Types (from hook_implementations.md §1.3) ──
export interface UvUnwrapRequest {
  inputTaskId?: string;
  modelUrl?: string;
  targetFormats?: ExportFormat[];
}

export interface MultiColorPrintRequest {
  inputTaskId?: string;
  modelUrl?: string;
  maxColors?: number;
}

export interface AnalyzePrintabilityRequest {
  inputTaskId?: string;
  modelUrl?: string;
}

export interface RepairPrintabilityRequest {
  inputTaskId?: string;
  modelUrl?: string;
}

// ─── Print Analysis Result (FR-PRINT-02) ───────────────────────
// Normalized (camelCase) view of an analyze-printability task's completed
// result. The raw poll_task response is snake_case and undocumented (no
// /v1/print/analyze schema exists in Meshy_Documentation/) — see
// src/components/generate/PrintabilityReportCard.tsx for the raw shape and
// the parsing function that produces this type.
export interface PrintabilityReport {
  status: 'healthy' | 'warning' | 'error';
  issueCount: number;
  watertight: boolean;
  volume: number;
  nonManifoldEdgeCount: number;
  degenerateFaceCount: number;
  holeCount: number;
}

// ─── Download / Animation Library Types ───────────────────────
export interface DownloadAssetRequest {
  taskId: string;
  modelUrls: Record<string, string>;
  thumbnailUrl?: string;
  textureUrls?: TextureUrl[];
}

export interface DownloadAssetResponse {
  filePaths: Record<string, string>;
  thumbnailPath: string | null;
  texturePaths: unknown | null;
}

export interface AnimationLibraryItem {
  id: number;
  name: string;
  category: string;
  thumbnail?: string;
}

// ─── Creative Lab Types ────────────────────────────────────────
// Source: FRD FR-CLAB-01–07. Each of the 7 products has a two-stage
// prototype -> build flow backed by its own pair of real TaskType wire
// values (see the `creative-lab-*` members of `TaskType` above).
export type CreativeLabProductType =
  | 'keychain'
  | 'fridge-magnet'
  | 'figure'
  | 'vinyl-figure'
  | 'brick-figure'
  | 'lamp'
  | 'keycap';

export type CreativeLabOutputFormat = 'glb' | 'obj' | 'stl' | 'zip';
export type CreativeLabBadgeShape = 'circle' | 'rounded-rect' | 'hexagon' | 'shield' | 'star';
export type CreativeLabReliefCurve = 'linear' | 'gamma' | 's-curve';

/** FR-CLAB-01-F2 / FR-CLAB-02-F2 — the 14 badge-relief build options shared
 * by Keychain and Fridge Magnet (which differs only in its defaults). */
export interface CreativeLabBadgeOptions {
  badgeShape?: CreativeLabBadgeShape;
  sizeMm?: number;
  reliefHeightMm?: number;
  reliefOffsetMm?: number;
  baseThicknessMm?: number;
  hasClosedBack?: boolean;
  reliefCurve?: CreativeLabReliefCurve;
  curveParam?: number;
  invertDepth?: boolean;
  smoothing?: number;
  reliefScale?: number;
  depthThreshold?: number;
  removeBackground?: boolean;
  exportResolution?: number;
}

/** FR-CLAB-06-F3 — the 10 Lamp geometry build options. */
export interface CreativeLabLampOptions {
  diameterMm?: number;
  thicknessMm?: number;
  cutAmountPercent?: number;
  lightSourcePreset?: 'bambu_mh001_60mm' | 'none';
  fixtureOffsetXMm?: number;
  fixtureOffsetZMm?: number;
  rotateXDeg?: number;
  rotateYDeg?: number;
  rotateZDeg?: number;
  includeResultJson?: boolean;
}

/** FR-CLAB-07-F2 — the 3 Keycap geometry build options. */
export interface CreativeLabKeycapOptions {
  baseModel?: 'cherry-mx-1x1-r1';
  headSizeMm?: number;
  verticalOffsetMm?: number;
}

/** Prototype-stage request. `type` selects which real backend TaskType wire
 * value fires (FR-CLAB-01-F1/03-F1/06-F1/07-F1, etc.). Lamp is the only
 * product where `text` and `imageUrl` are mutually exclusive (FR-CLAB-06-F1);
 * every other product uses `imageUrl` only. `name` is Keychain/Fridge-Magnet
 * only (optional); `imageSubject` is Lamp-only. */
export interface CreativeLabPrototypeRequest {
  type: TaskType;
  imageUrl?: string;
  text?: string;
  name?: string;
  imageSubject?: 'character' | 'landscape';
}

/** Build-stage request, chained from a succeeded prototype's task ID.
 * `candidateId` is required for Keycap only (FR-CLAB-07-F2). `options`'
 * shape depends on the product `type`: `CreativeLabBadgeOptions` for
 * Keychain/Fridge Magnet, `CreativeLabLampOptions` for Lamp,
 * `CreativeLabKeycapOptions` for Keycap; Figure/Vinyl Figure/Brick Figure
 * take no build options at all (FR-CLAB-03-F2). */
export interface CreativeLabBuildRequest {
  type: TaskType;
  inputTaskId: string;
  candidateId?: string;
  options?: CreativeLabBadgeOptions | CreativeLabLampOptions | CreativeLabKeycapOptions;
  targetFormat?: CreativeLabOutputFormat;
}
