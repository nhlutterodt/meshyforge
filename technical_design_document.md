# Technical Design Document: MeshyForge — AI 3D Asset Studio

## Document Metadata
| Field | Value |
|---|---|
| **Project Name** | MeshyForge |
| **Version** | 1.0.0 (MVP) |
| **Date** | 2025 |
| **Hosting** | GitHub (personal repository) |
| **License** | MIT |
| **Status** | Design Phase |

---

## 1. Executive Summary

MeshyForge is a cross-platform desktop application that provides a complete workflow for generating, post-processing, organizing, and exporting AI-created 3D assets via the Meshy AI API. It serves as a personal 3D asset management studio — replacing the need to repeatedly use the Meshy web UI or write throwaway scripts.

The application wraps every Meshy REST endpoint behind a visual interface: text-to-3D, image-to-3D, multi-image-to-3D, remesh, retexture, convert, resize, UV unwrap, rigging, animation, text-to-image, image-to-image, 3D printing endpoints, and the Creative Lab suite. It handles the asynchronous task lifecycle (create → poll/stream → download → store) transparently and provides a local asset library with preview rendering, metadata, tagging, and batch export.

---

## 2. Goals & Non-Goals

### 2.1 Goals (MVP Scope)
- Full coverage of Meshy API endpoints with visual controls
- Asynchronous task management with polling and SSE streaming
- Local asset storage with file-system persistence
- 3D model preview (GLB/FBX/OBJ inline viewer)
- Thumbnail grid gallery with filtering and search
- Asset tagging, notes, and metadata editing
- Batch export with format selection (GLB, FBX, OBJ, STL, USDZ, 3MF)
- API key management (stored in OS keychain, never committed)
- Credit balance monitoring
- Offline access to previously downloaded assets
- Changelog/version tracking for the Meshy API (so the app can warn on deprecations)

### 2.2 Non-Goals (Deferred to Post-MVP)
- Multi-user collaboration or cloud sync
- In-app 3D editing (sculpting, vertex manipulation)
- Custom animation authoring (only preset application via API)
- Plugin marketplace or extensibility framework
- Direct slicer integration (Bambu/Orca/Cura bridging — available in web UI)
- Mobile/web companion app
- Automated pipeline scheduling / cron jobs

---

## 3. Technology Stack

### 3.1 Core Stack
| Layer | Technology | Rationale |
|---|---|---|
| **Desktop Runtime** | Tauri 2.x | Smaller bundle than Electron (~10MB vs ~150MB), native webview, Rust backend for security-critical operations, first-class TypeScript support |
| **Frontend Framework** | React 19 + TypeScript | Ecosystem maturity, component reuse, strong typing for API contract safety |
| **Build Tool** | Vite 6 | Fast HMR, Tauri integration, tree-shaking |
| **UI Library** | shadcn/ui + Tailwind CSS 4 | Copy-paste components, no runtime CSS-in-JS overhead, consistent design system |
| **State Management** | Zustand + TanStack Query | Zustand for local UI state; TanStack Query for async task/polling state with automatic refetch, cache invalidation, and SSE integration |
| **3D Viewer** | `@react-three/fiber` + `@react-three/drei` + `three.js` | Renders GLB/GLTF natively in-browser/webview; OrbitControls, Environment, ContactShadows from drei |
| **Local Database** | SQLite (via `better-sqlite3` in Tauri's Rust backend) | Persistent asset metadata, tags, task history; fast queries; no external server |
| **File Storage** | OS-native app data directory | `~/Library/Application Support/MeshyForge/assets/` (macOS), `%APPDATA%/MeshyForge/assets/` (Windows), `~/.local/share/MeshyForge/assets/` (Linux) |
| **Secret Storage** | OS Keychain via Tauri `keytar` / `tauri-plugin-stronghold` | API key never written to disk in plaintext |
| **HTTP Client** | `@tanstack/react-query` + native `fetch` in Rust backend | Rust-side fetch avoids CORS entirely (desktop app, not browser); Tauri commands expose HTTP to frontend |
| **Icons** | Lucide React | Consistent, lightweight, tree-shakeable |
| **Notifications** | Tauri notification plugin | Native OS notifications for task completion |
| **Testing** | Vitest + Testing Library + Playwright (e2e) | Unit/component/e2e coverage |
| **Code Quality** | ESLint + Prettier + Biome | Linting and formatting |

### 3.2 Why Tauri over Electron
- **Bundle size**: ~10–15 MB vs ~150 MB
- **Memory**: Uses OS webview (WebKit/WebView2) instead of bundling Chromium
- **Security**: Rust backend handles API key storage and HTTP requests; the webview frontend never has direct network access to the API, reducing exposure
- **Tauri 2.x**: Stable, improved plugin ecosystem, mobile-ready if ever needed

### 3.3 Why Not a Pure CLI or Script
- Visual asset browsing and preview requires a GUI
- Task monitoring (polling, progress bars, SSE streams) benefits from real-time UI
- 3D preview rendering is inherently visual
- Repeatable workflows (preset configurations, saved prompts) are easier with persistent UI state

---

## 4. System Architecture

### 4.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     MeshyForge Desktop App                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   Tauri Webview (Frontend)               │ │
│  │                                                         │ │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │ │
│  │  │ Generate │  │  Asset   │  │  Task    │  │ Settings│ │ │
│  │  │  Panel   │  │  Gallery │  │  Monitor │  │  Panel  │ │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │ │
│  │       │              │              │              │      │ │
│  │  ┌────┴──────────────┴──────────────┴──────────────┴───┐ │ │
│  │  │           Zustand Store + TanStack Query Cache      │ │ │
│  │  └────────────────────┬────────────────────────────────┘ │ │
│  │                       │ Tauri IPC (invoke)                │ │
│  └───────────────────────┼─────────────────────────────────┘ │
│                          │                                    │
│  ┌───────────────────────┼─────────────────────────────────┐ │
│  │                Tauri Rust Backend (Core)                 │ │
│  │                                                         │ │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────┐   │ │
│  │  │  HTTP      │  │  SQLite    │  │  Keychain        │   │ │
│  │  │  Client    │  │  Database  │  │  (API Key Store) │   │ │ │
│  │  │  (reqwest) │  │  (rusqlite)│  │  (keytar)       │   │ │ │
│  │  └─────┬──────┘  └─────┬──────┘  └──────────────────┘   │ │
│  │        │                │                                  │ │
│  │  ┌─────┴────────────────┴──────────────────────────────┐ │ │
│  │  │              File System Manager                     │ │ │
│  │  │  (asset downloads, thumbnails, exports)             │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS (no CORS — desktop native)
                         ▼
              ┌─────────────────────┐
              │   Meshy AI API      │
              │   api.meshy.ai      │
              └─────────────────────┘
```

### 4.2 Process Flow: Task Lifecycle

```
User Action → Tauri Command (Rust) → HTTP POST to Meshy API
                                         │
                                         ▼
                                    Task ID returned
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                         Polling Mode          SSE Streaming
                         (every 5s)            (persistent conn)
                              │                     │
                              └──────────┬──────────┘
                                         ▼
                                   Task SUCCEEDED
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                         Download Model        Download Thumbnails
                         (GLB/FBX/OBJ/...)     (PNG previews)
                              │                     │
                              └──────────┬──────────┘
                                         ▼
                              Store to local filesystem
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                         SQLite metadata        UI gallery update
                         (path, tags,           (thumbnail card
                          prompt, credits)        appears)
```

### 4.3 Data Flow: Asset Storage

```
Meshy API Response
    │
    ├── model_urls.glb → download → /assets/{task_id}/model.glb
    ├── model_urls.fbx → download → /assets/{task_id}/model.fbx
    ├── model_urls.obj → download → /assets/{task_id}/model.obj
    ├── thumbnail_url   → download → /assets/{task_id}/thumbnail.png
    ├── texture_urls[0].base_color → /assets/{task_id}/textures/base_color.png
    ├── texture_urls[0].metallic   → /assets/{task_id}/textures/metallic.png
    ├── texture_urls[0].normal     → /assets/{task_id}/textures/normal.png
    └── texture_urls[0].roughness → /assets/{task_id}/textures/roughness.png

SQLite record:
    id: "018a210d-..."
    type: "text-to-3d-refine"
    prompt: "a monster mask"
    status: "SUCCEEDED"
    file_paths: { glb: "...", fbx: "...", ... }
    thumbnail_path: "..."
    texture_paths: { base_color: "...", metallic: "...", ... }
    created_at: 1692771650657
    finished_at: 1692771669037
    consumed_credits: 20
    tags: ["monster", "halloween"]
    notes: ""
    ai_model: "meshy-6"
```

---

## 5. Project Structure

```
meshyforge/
├── src-tauri/                          # Rust backend (Tauri)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── src/
│   │   ├── main.rs                     # Tauri entry point
│   │   ├── lib.rs                      # Module declarations
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── api.rs                   # Meshy API HTTP commands
│   │   │   ├── assets.rs                # File system asset commands
│   │   │   ├── database.rs             # SQLite query commands
│   │   │   ├── keychain.rs             # API key storage commands
│   │   │   ├── export.rs               # Batch export commands
│   │   │   └── notifications.rs        # OS notification commands
│   │   ├── meshy/
│   │   │   ├── mod.rs
│   │   │   ├── client.rs               # reqwest HTTP client wrapper
│   │   │   ├── endpoints.rs            # Endpoint URL definitions
│   │   │   ├── models.rs               # Request/response structs (serde)
│   │   │   ├── task.rs                  # Task polling & SSE logic
│   │   │   └── download.rs             # File download + save logic
│   │   ├── storage/
│   │   │   ├── mod.rs
│   │   │   ├── database.rs             # SQLite schema + migrations + queries
│   │   │   ├── schema.rs               # Table definitions
│   │   │   └── filesystem.rs           # Asset directory management
│   │   ├── security/
│   │   │   ├── mod.rs
│   │   │   └── keychain.rs             # OS keychain integration
│   │   └── config.rs                   # App configuration
│   └── icons/                          # App icons
│
├── src/                                # React frontend
│   ├── main.tsx                        # React entry
│   ├── App.tsx                         # Root layout + routing
│   ├── app/
│   │   ├── routes.tsx                   # Route definitions
│   │   └── layout.tsx                  # Main shell layout
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── generate/
│   │   │   ├── TextTo3DPanel.tsx       # Text-to-3D form + controls
│   │   │   ├── ImageTo3DPanel.tsx      # Image upload + controls
│   │   │   ├── MultiImagePanel.tsx     # Multi-view image upload
│   │   │   ├── PostProcessPanel.tsx   # Remesh, Retexture, Convert, Resize
│   │   │   ├── RiggingPanel.tsx        # Auto-rig form
│   │   │   ├── AnimationPanel.tsx      # Animation preset picker
│   │   │   ├── ImageGenPanel.tsx       # Text-to-Image, Image-to-Image
│   │   │   ├── PrintPanel.tsx          # Multi-color, analyze, repair
│   │   │   └── CreativeLabPanel.tsx    # Keychain, Figure, Lamp, etc.
│   │   ├── gallery/
│   │   │   ├── AssetGrid.tsx            # Thumbnail grid view
│   │   │   ├── AssetCard.tsx           # Individual asset card
│   │   │   ├── AssetDetail.tsx         # Detail panel (metadata, notes)
│   │   │   ├── AssetPreview3D.tsx      # 3D model viewer (R3F)
│   │   │   ├── TagFilter.tsx           # Tag-based filtering
│   │   │   └── SearchBar.tsx            # Full-text search
│   │   ├── tasks/
│   │   │   ├── TaskMonitor.tsx         # Active task list with progress
│   │   │   ├── TaskCard.tsx            # Individual task card
│   │   │   ├── TaskProgressBar.tsx     # Animated progress bar
│   │   │   └── TaskHistory.tsx         # Completed task log
│   │   ├── settings/
│   │   │   ├── ApiKeyManager.tsx       # API key input + validation
│   │   │   ├── CreditBalance.tsx       # Credit display + refresh
│   │   │   ├── PreferencesPanel.tsx   # Download paths, defaults
│   │   │   └── AboutPanel.tsx          # Version, API status
│   │   ├── export/
│   │   │   ├── ExportDialog.tsx        # Format selection + batch export
│   │   │   └── ExportProgress.tsx      # Export progress tracking
│   │   └── common/
│   │       ├── Sidebar.tsx             # Navigation sidebar
│   │       ├── TopBar.tsx               # Top bar with credits, settings
│   │       ├── StatusBar.tsx           # Bottom status (active tasks, storage)
│   │       ├── ImageDropzone.tsx       # Drag-and-drop image upload
│   │       ├── PromptEditor.tsx        # Rich text prompt input
│   │       └── ModelSelector.tsx       # Meshy model version picker
│   ├── hooks/
│   │   ├── useMeshyApi.ts              # TanStack Query hooks for API calls
│   │   ├── useTaskPolling.ts           # Polling logic for task status
│   │   ├── useTaskStream.ts            # SSE streaming hook
│   │   ├── useAssetStore.ts            # Zustand store for assets
│   │   ├── useCreditBalance.ts         # Credit balance query
│   │   ├── useSettings.ts              # App settings store
│   │   └── useNotifications.ts         # OS notification trigger
│   ├── lib/
│   │   ├── tauri.ts                    # Tauri invoke wrappers (typed)
│   │   ├── meshy-types.ts              # TypeScript types matching Rust models
│   │   ├── constants.ts                # API endpoints, defaults, limits
│   │   ├── utils.ts                     # General utilities
│   │   └── format.ts                    # Date, file size, credit formatters
│   ├── stores/
│   │   ├── appStore.ts                  # Global UI state (Zustand)
│   │   ├── taskStore.ts                 # Active task tracking (Zustand)
│   │   └── settingsStore.ts             # User preferences (Zustand + persist)
│   └── styles/
│       └── globals.css                 # Tailwind + global styles
│
├── docs/
│   ├── TDD.md                          # This document
│   ├── API_REFERENCE.md                # Meshy API endpoint summary
│   ├── CHANGELOG.md                    # App changelog
│   └── CONTRIBUTING.md                 # Development setup guide
│
├── .github/
│   └── workflows/
│       ├── ci.yml                      # Lint + type-check + test
│       └── release.yml                 # Build + tag releases
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── biome.json
├── .gitignore
├── LICENSE
└── README.md
```

---

## 6. Data Model

### 6.1 SQLite Schema

```sql
-- Asset records: one row per completed Meshy task
CREATE TABLE assets (
    id              TEXT PRIMARY KEY,           -- Meshy task ID (UUID)
    meshy_type      TEXT NOT NULL,              -- "text-to-3d-preview" | "image-to-3d" | "retexture" | etc.
    parent_task_id  TEXT,                        -- Links refine → preview, retexture → source, etc.
    prompt          TEXT,                        -- Original prompt (if text-based)
    image_url       TEXT,                        -- Original image URL (if image-based)
    ai_model        TEXT,                        -- "meshy-6" | "meshy-7" | "latest" | etc.
    status          TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | IN_PROGRESS | SUCCEEDED | FAILED | CANCELED
    progress        INTEGER NOT NULL DEFAULT 0,  -- 0-100
    consumed_credits INTEGER DEFAULT 0,
    thumbnail_path  TEXT,                        -- Local path to thumbnail PNG
    file_paths      TEXT NOT NULL DEFAULT '{}',  -- JSON: { "glb": "...", "fbx": "...", ... }
    texture_paths   TEXT NOT NULL DEFAULT '[]',  -- JSON: [{ "base_color": "...", "metallic": "...", ... }]
    notes           TEXT DEFAULT '',
    tags            TEXT DEFAULT '[]',           -- JSON array of strings
    created_at      INTEGER NOT NULL,           -- Unix ms (from Meshy)
    started_at      INTEGER DEFAULT 0,
    finished_at     INTEGER DEFAULT 0,
    downloaded_at   INTEGER DEFAULT 0,           -- When files were saved locally
    error_message   TEXT,
    -- Denormalized for quick filtering
    has_textures    INTEGER DEFAULT 0,           -- Boolean
    has_rig         INTEGER DEFAULT 0,
    has_animation   INTEGER DEFAULT 0,
    -- User metadata
    favorite        INTEGER DEFAULT 0,
    last_viewed_at  INTEGER DEFAULT 0
);

-- Task log: every API call (successful or not), for audit/debugging
CREATE TABLE task_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    meshy_task_id   TEXT,                        -- Foreign key to assets.id (nullable if failed before ID)
    endpoint        TEXT NOT NULL,               -- e.g. "POST /openapi/v2/text-to-3d"
    request_body    TEXT,                        -- JSON of the request payload
    response_status INTEGER,                     -- HTTP status code
    response_body   TEXT,                        -- JSON of the response (truncated if large)
    error           TEXT,
    timestamp       INTEGER NOT NULL,
    credits_before  INTEGER,
    credits_after   INTEGER
);

-- Tags: normalized tag table for fast filtering
CREATE TABLE tags (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT UNIQUE NOT NULL,
    color           TEXT DEFAULT '#6b7280',      -- Hex color for UI badge
    created_at      INTEGER NOT NULL
);

-- Asset-Tag junction
CREATE TABLE asset_tags (
    asset_id        TEXT NOT NULL,
    tag_id          INTEGER NOT NULL,
    PRIMARY KEY (asset_id, tag_id),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- App settings: key-value store for preferences
CREATE TABLE settings (
    key             TEXT PRIMARY KEY,
    value            TEXT NOT NULL,
    updated_at      INTEGER NOT NULL
);

-- Schema version tracking
CREATE TABLE schema_version (
    version         INTEGER PRIMARY KEY,
    applied_at      INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_type ON assets(meshy_type);
CREATE INDEX idx_assets_created ON assets(created_at DESC);
CREATE INDEX idx_assets_favorite ON assets(favorite);
CREATE INDEX idx_task_log_task ON task_log(meshy_task_id);
CREATE INDEX idx_task_log_time ON task_log(timestamp DESC);
```

### 6.2 TypeScript Type Definitions (Frontend)

```typescript
// src/lib/meshy-types.ts

// ─── Enums ─────────────────────────────────────────────────────
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
export type AiModel = 'meshy-5' | 'meshy-6' | 'meshy-7' | 'latest';
export type MeshyType =
  | 'text-to-3d-preview' | 'text-to-3d-refine'
  | 'image-to-3d' | 'multi-image-to-3d'
  | 'retexture' | 'remesh' | 'convert' | 'resize' | 'uv-unwrap'
  | 'rig' | 'animate'
  | 'text-to-image' | 'image-to-image'
  | 'print-multi-color' | 'print-analyze' | 'print-repair'
  | 'creative-lab-keychain-prototype' | 'creative-lab-keychain-build'
  | 'creative-lab-fridge-magnet-prototype' | 'creative-lab-fridge-magnet-build'
  | 'creative-lab-figure-prototype' | 'creative-lab-figure-build'
  | 'creative-lab-vinyl-figure-prototype' | 'creative-lab-vinyl-figure-build'
  | 'creative-lab-brick-figure-prototype' | 'creative-lab-brick-figure-build'
  | 'creative-lab-lamp-prototype' | 'creative-lab-lamp-build'
  | 'creative-lab-keycap-prototype' | 'creative-lab-keycap-build';

export type ExportFormat = 'glb' | 'fbx' | 'obj' | 'stl' | 'usdz' | '3mf';

// ─── Asset (local database record) ────────────────────────────
export interface Asset {
  id: string;
  meshyType: MeshyType;
  parentTaskId: string | null;
  prompt: string | null;
  imageUrl: string | null;
  aiModel: AiModel | null;
  status: TaskStatus;
  progress: number;
  consumedCredits: number;
  thumbnailPath: string | null;
  filePaths: Record<string, string>;     // { glb: "/path/...", fbx: "/path/...", ... }
  texturePaths: TextureUrl[];            // [{ base_color: "...", metallic: "...", ... }]
  notes: string;
  tags: string[];
  createdAt: number;                     // Unix ms
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
  aiModel?: AiModel;
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
  aiModel?: AiModel;
  moderation?: boolean;
  removeLighting?: boolean;
  targetFormats?: ExportFormat[];
  autoSize?: boolean;
  originAt?: 'bottom' | 'center';
}

export interface ImageTo3DRequest {
  imageUrl: string;              // or inputTaskId
  inputTaskId?: string;
  modelType?: 'standard' | 'smart-topology' | 'lowpoly';
  aiModel?: AiModel;
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
  imageUrls: string[];
  inputTaskId?: string;
  aiModel?: AiModel;
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
  aiModel?: AiModel;
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
  result: string;   // task ID
}

export interface TaskObject {
  id: string;
  type: MeshyType;
  status: TaskStatus;
  progress: number;
  createdAt: number;
  startedAt: number;
  finishedAt: number;
  precedingTasks: number;
  taskError: { message: string; type?: string; code?: string; docUrl?: string } | null;
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
```

---

## 7. Rust Backend Design

### 7.1 Meshy API Client (`meshy/client.rs`)

```rust
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::State;

const BASE_URL: &str = "https://api.meshy.ai/openapi";

pub struct MeshyClient {
    http: Client,
    api_key: String,
}

impl MeshyClient {
    pub fn new(api_key: String) -> Self {
        let http = Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .expect("Failed to build HTTP client");
        Self { http, api_key }
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", BASE_URL, path)
    }

    fn headers(&self) -> reqwest::header::HeaderMap {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            "Authorization",
            format!("Bearer {}", self.api_key)
                .parse()
                .expect("Invalid API key header"),
        );
        headers.insert("Content-Type", "application/json".parse().unwrap());
        headers
    }

    // ─── Task Creation ──────────────────────────────────────
    pub async fn create_task(
        &self,
        endpoint: &str,
        body: &serde_json::Value,
    ) -> Result<TaskCreateResponse, MeshyError> {
        let response = self
            .http
            .post(self.url(endpoint))
            .headers(self.headers())
            .json(body)
            .send()
            .await?;
        // Handle 401, 402, 429, etc.
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(MeshyError::ApiError { status, body: text });
        }
        Ok(response.json().await?)
    }

    // ─── Task Retrieval ────────────────────────────────────
    pub async fn get_task(
        &self,
        endpoint: &str,
        task_id: &str,
    ) -> Result<serde_json::Value, MeshyError> {
        let url = format!("{}/{}", self.url(endpoint), task_id);
        let response = self.http.get(&url).headers(self.headers()).send().await?;
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(MeshyError::ApiError { status, body: text });
        }
        Ok(response.json().await?)
    }

    // ─── Task Deletion ────────────────────────────────────
    pub async fn delete_task(
        &self,
        endpoint: &str,
        task_id: &str,
    ) -> Result<(), MeshyError> {
        let url = format!("{}/{}", self.url(endpoint), task_id);
        let response = self.http.delete(&url).headers(self.headers()).send().await?;
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(MeshyError::ApiError { status, body: text });
        }
        Ok(())
    }

    // ─── File Download ─────────────────────────────────────
    pub async fn download_file(
        &self,
        url: &str,
        dest_path: &std::path::Path,
    ) -> Result<u64, MeshyError> {
        // Signed URLs don't need auth headers
        let response = self.http.get(url).send().await?;
        if !response.status().is_success() {
            return Err(MeshyError::DownloadFailed(response.status()));
        }
        let bytes = response.bytes().await?;
        std::fs::write(dest_path, &bytes)?;
        Ok(bytes.len() as u64)
    }

    // ─── SSE Stream ────────────────────────────────────────
    pub async fn stream_task(
        &self,
        endpoint: &str,
        task_id: &str,
        on_event: impl Fn(serde_json::Value),
    ) -> Result<(), MeshyError> {
        let url = format!("{}/{}/stream", self.url(endpoint), task_id);
        let response = self
            .http
            .get(&url)
            .headers(self.headers())
            .header("Accept", "text/event-stream")
            .send()
            .await?;
        // Parse SSE stream line by line
        use futures_util::StreamExt;
        let mut stream = response.bytes_stream();
        let mut buffer = String::new();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));
            while let Some(pos) = buffer.find('\n') {
                let line = buffer[..pos].to_string();
                buffer = buffer[pos + 1..].to_string();
                if line.starts_with("data:") {
                    let json_str = line[5..].trim();
                    if let Ok(data) = serde_json::from_str::<serde_json::Value>(json_str) {
                        on_event(data.clone());
                        if let Some(status) = data.get("status").and_then(|s| s.as_str()) {
                            if ["SUCCEEDED", "FAILED", "CANCELED"].contains(&status) {
                                return Ok(());
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }

    // ─── Balance Check ─────────────────────────────────────
    pub async fn get_balance(&self) -> Result<BalanceResponse, MeshyError> {
        let response = self
            .http
            .get(self.url("/v1/balance"))
            .headers(self.headers())
            .send()
            .await?;
        Ok(response.json().await?)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum MeshyError {
    #[error("API error {status}: {body}")]
    ApiError { status: reqwest::StatusCode, body: String },
    #[error("Download failed: {0}")]
    DownloadFailed(reqwest::StatusCode),
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    #[error("Filesystem error: {0}")]
    Filesystem(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Missing API key")]
    MissingApiKey,
}
```

### 7.2 Tauri Commands (`commands/api.rs`)

```rust
use tauri::State;
use crate::meshy::client::MeshyClient;
use crate::security::keychain;

// ─── API Key Management ──────────────────────────────────────
#[tauri::command]
async fn set_api_key(key: String) -> Result<(), String> {
    keychain::store_key(&key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_api_key() -> Result<Option<String>, String> {
    keychain::get_key().map_err(|e| e.to_string())
}

#[tauri::command]
async fn validate_api_key(key: String) -> Result<bool, String> {
    let client = MeshyClient::new(key);
    match client.get_balance().await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

// ─── Task Creation ───────────────────────────────────────────
#[tauri::command]
async fn create_text_to_3d(
    state: State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let client = state.meshy_client().ok_or("No API key set")?;
    let endpoint = "/v2/text-to-3d";
    let response: TaskCreateResponse = client
        .create_task(endpoint, &body)
        .await
        .map_err(|e| e.to_string())?;
    // Log to task_log table
    state.database.log_task_create(&response.result, endpoint, &body)?;
    Ok(serde_json::to_value(response).map_err(|e| e.to_string())?)
}

#[tauri::command]
async fn create_image_to_3d(
    state: State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let client = state.meshy_client().ok_or("No API key set")?;
    let endpoint = "/v1/image-to-3d";
    let response = client.create_task(endpoint, &body).await.map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(response).map_err(|e| e.to_string())?)
}

#[tauri::command]
async fn create_remesh(
    state: State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let client = state.meshy_client().ok_or("No API key set")?;
    let response = client.create_task("/v1/remesh", &body).await.map_err(|e| e.to_string())?;
    Ok(serde_json::to_value(response).map_err(|e| e.to_string())?)
}

// ... similar commands for every endpoint ...

// ─── Task Polling ─────────────────────────────────────────────
#[tauri::command]
async fn poll_task(
    state: State<'_, AppState>,
    endpoint: String,
    task_id: String,
) -> Result<serde_json::Value, String> {
    let client = state.meshy_client().ok_or("No API key set")?;
    let task = client.get_task(&endpoint, &task_id).await.map_err(|e| e.to_string())?;
    // Update SQLite record
    state.database.update_task_status(&task_id, &task)?;
    Ok(task)
}

// ─── Task Streaming (SSE) ─────────────────────────────────────
#[tauri::command]
async fn stream_task(
    state: State<'_, AppState>,
    endpoint: String,
    task_id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let client = state.meshy_client().ok_or("No API key set")?;
    client
        .stream_task(&endpoint, &task_id, |data| {
            // Emit event to frontend
            let _ = app.emit("task-progress", &data);
        })
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Asset Download ───────────────────────────────────────────
#[tauri::command]
async fn download_asset(
    state: State<'_, AppState>,
    task_id: String,
    model_urls: serde_json::Value,   // { "glb": "https://...", "fbx": "https://...", ... }
    thumbnail_url: Option<String>,
    texture_urls: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let client = state.meshy_client().ok_or("No API key set")?;
    let asset_dir = state.asset_dir(&task_id);
    std::fs::create_dir_all(&asset_dir).map_err(|e| e.to_string())?;

    let mut file_paths: serde_json::Map<String, serde_json::Value> = serde_json::Map::new();

    // Download model files
    if let Some(urls) = model_urls.as_object() {
        for (format, url) in urls {
            if let Some(url_str) = url.as_str() {
                if !url_str.is_empty() {
                    let filename = format!("model.{}", format);
                    let dest = asset_dir.join(&filename);
                    client.download_file(url_str, &dest).await.map_err(|e| e.to_string())?;
                    file_paths.insert(
                        format.clone(),
                        serde_json::Value::String(dest.to_string_lossy().into_owned()),
                    );
                }
            }
        }
    }

    // Download thumbnail
    let thumbnail_path = if let Some(url) = thumbnail_url {
        let dest = asset_dir.join("thumbnail.png");
        client.download_file(&url, &dest).await.map_err(|e| e.to_string())?;
        Some(dest.to_string_lossy().into_owned())
    } else {
        None
    };

    // Download textures
    let texture_paths = if let Some(textures) = texture_urls {
        let tex_dir = asset_dir.join("textures");
        std::fs::create_dir_all(&tex_dir).map_err(|e| e.to_string())?;
        let mut paths = Vec::new();
        if let Some(arr) = textures.as_array() {
            for (i, tex_obj) in arr.iter().enumerate() {
                let mut tex_paths = serde_json::Map::new();
                if let Some(obj) = tex_obj.as_object() {
                    for (key, url_val) in obj {
                        if let Some(url) = url_val.as_str() {
                            let filename = format!("texture_{}_{}.png", i, key);
                            let dest = tex_dir.join(&filename);
                            client.download_file(url, &dest).await.map_err(|e| e.to_string())?;
                            tex_paths.insert(
                                key.clone(),
                                serde_json::Value::String(dest.to_string_lossy().into_owned()),
                            );
                        }
                    }
                }
                paths.push(serde_json::Value::Object(tex_paths));
            }
        }
        Some(serde_json::Value::Array(paths))
    } else {
        None
    };

    // Update database
    state.database.mark_downloaded(
        &task_id,
        &serde_json::Value::Object(file_paths),
        thumbnail_path.as_deref(),
        texture_paths.as_ref(),
    )?;

    Ok(serde_json::json!({
        "file_paths": file_paths,
        "thumbnail_path": thumbnail_path,
        "texture_paths": texture_paths,
    }))
}

// ─── Balance ──────────────────────────────────────────────────
#[tauri::command]
async fn get_credit_balance(state: State<'_, AppState>) -> Result<i64, String> {
    let client = state.meshy_client().ok_or("No API key set")?;
    let balance = client.get_balance().await.map_err(|e| e.to_string())?;
    Ok(balance.balance)
}

// ─── Animation Library ───────────────────────────────────────
#[tauri::command]
async fn fetch_animation_library(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let client = state.meshy_client().ok_or("No API key set")?;
    let url = "https://api.meshy.ai/web/public/animations/resources";
    let response = client.http.get(url).send().await.map_err(|e| e.to_string())?;
    Ok(response.json().await.map_err(|e| e.to_string())?)
}
```

### 7.3 Database Layer (`storage/database.rs`)

```rust
use rusqlite::{Connection, params};
use std::sync::Mutex;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn open(path: &std::path::Path) -> Result<Self, rusqlite::Error> {
        let conn = Connection::open(path)?;
        conn.execute_batch(include_str!("../schema.sql"))?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn insert_asset(&self, asset: &AssetRecord) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO assets
             (id, meshy_type, parent_task_id, prompt, image_url, ai_model,
              status, progress, consumed_credits, thumbnail_path,
              file_paths, texture_paths, notes, tags,
              created_at, started_at, finished_at, downloaded_at,
              error_message, has_textures, has_rig, has_animation,
              favorite, last_viewed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12,
                     ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24)",
            params![
                asset.id,
                asset.meshy_type,
                asset.parent_task_id,
                asset.prompt,
                asset.image_url,
                asset.ai_model,
                asset.status,
                asset.progress,
                asset.consumed_credits,
                asset.thumbnail_path,
                asset.file_paths_json,
                asset.texture_paths_json,
                asset.notes,
                asset.tags_json,
                asset.created_at,
                asset.started_at,
                asset.finished_at,
                asset.downloaded_at,
                asset.error_message,
                asset.has_textures,
                asset.has_rig,
                asset.has_animation,
                asset.favorite,
                asset.last_viewed_at,
            ],
        )?;
        Ok(())
    }

    pub fn update_task_status(&self, task_id: &str, task_json: &serde_json::Value) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let status = task_json.get("status").and_then(|s| s.as_str()).unwrap_or("");
        let progress = task_json.get("progress").and_then(|p| p.as_i64()).unwrap_or(0);
        let started_at = task_json.get("started_at").and_then(|s| s.as_i64()).unwrap_or(0);
        let finished_at = task_json.get("finished_at").and_then(|s| s.as_i64()).unwrap_or(0);
        let consumed_credits = task_json.get("consumed_credits").and_then(|c| c.as_i64()).unwrap_or(0);

        conn.execute(
            "UPDATE assets SET status = ?2, progress = ?3, started_at = ?4,
                    finished_at = ?5, consumed_credits = ?6
             WHERE id = ?1",
            params![task_id, status, progress, started_at, finished_at, consumed_credits],
        )?;
        Ok(())
    }

    pub fn mark_downloaded(
        &self,
        task_id: &str,
        file_paths: &serde_json::Value,
        thumbnail_path: Option<&str>,
        texture_paths: Option<&serde_json::Value>,
    ) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "UPDATE assets SET file_paths = ?2, thumbnail_path = ?3,
                    texture_paths = ?4, downloaded_at = ?5
             WHERE id = ?1",
            params![
                task_id,
                file_paths.to_string(),
                thumbnail_path,
                texture_paths.map(|v| v.to_string()),
                now,
            ],
        )?;
        Ok(())
    }

    pub fn get_all_assets(&self) -> Result<Vec<AssetRow>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT * FROM assets ORDER BY created_at DESC"
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(AssetRow::from_row(row))
        })?;
        rows.collect()
    }

    pub fn search_assets(&self, query: &str, tag: Option<&str>) -> Result<Vec<AssetRow>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let pattern = format!("%{}%", query);
        if let Some(tag_name) = tag {
            let mut stmt = conn.prepare(
                "SELECT a.* FROM assets a
                 JOIN asset_tags at ON at.asset_id = a.id
                 JOIN tags t ON t.id = at.tag_id
                 WHERE (a.prompt LIKE ?1 OR a.notes LIKE ?1)
                 AND t.name = ?2
                 ORDER BY a.created_at DESC"
            )?;
            let rows = stmt.query_map(params![pattern, tag_name], |row| Ok(AssetRow::from_row(row)))?;
            rows.collect()
        } else {
            let mut stmt = conn.prepare(
                "SELECT * FROM assets
                 WHERE prompt LIKE ?1 OR notes LIKE ?1
                 ORDER BY created_at DESC"
            )?;
            let rows = stmt.query_map(params![pattern], |row| Ok(AssetRow::from_row(row)))?;
            rows.collect()
        }
    }

    pub fn update_tags(&self, asset_id: &str, tags: &[String]) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        // Clear existing tags
        conn.execute("DELETE FROM asset_tags WHERE asset_id = ?1", params![asset_id])?;
        // Insert new tags
        for tag_name in tags {
            // Insert tag if not exists
            conn.execute(
                "INSERT OR IGNORE INTO tags (name, created_at) VALUES (?1, ?2)",
                params![tag_name, chrono::Utc::now().timestamp_millis()],
            )?;
            // Link asset to tag
            conn.execute(
                "INSERT INTO asset_tags (asset_id, tag_id)
                 SELECT ?1, id FROM tags WHERE name = ?2",
                params![asset_id, tag_name],
            )?;
        }
        // Update tags JSON on asset record for quick access
        let tags_json = serde_json::to_string(tags).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "UPDATE assets SET tags = ?2 WHERE id = ?1",
            params![asset_id, tags_json],
        )?;
        Ok(())
    }

    pub fn toggle_favorite(&self, asset_id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE assets SET favorite = NOT favorite WHERE id = ?1",
            params![asset_id],
        )?;
        Ok(())
    }

    pub fn update_notes(&self, asset_id: &str, notes: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute("UPDATE assets SET notes = ?2 WHERE id = ?1", params![asset_id, notes])?;
        Ok(())
    }

    pub fn log_task_create(&self, task_id: &str, endpoint: &str, body: &serde_json::Value) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO task_log (meshy_task_id, endpoint, request_body, timestamp)
             VALUES (?1, ?2, ?3, ?4)",
            params![task_id, endpoint, body.to_string(), chrono::Utc::now().timestamp_millis()],
        )?;
        Ok(())
    }

    pub fn delete_asset(&self, asset_id: &str) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM assets WHERE id = ?1", params![asset_id])?;
        conn.execute("DELETE FROM asset_tags WHERE asset_id = ?1", params![asset_id])?;
        Ok(())
    }
}
```

---

## 8. Frontend Architecture

### 8.1 Application State (Zustand Stores)

```typescript
// src/stores/appStore.ts
import { create } from 'zustand';

interface AppState {
  // ── Navigation ──────────────────────
  activeView: 'generate' | 'gallery' | 'tasks' | 'settings';
  setActiveView: (view: AppState['activeView']) => void;

  // ── Generate sub-panel ───────────────
  activeGenerateTab:
    | 'text-to-3d' | 'image-to-3d' | 'multi-image'
    | 'post-process' | 'rigging' | 'animation'
    | 'image-gen' | 'print' | 'creative-lab';
  setActiveGenerateTab: (tab: AppState['activeGenerateTab']) => void;

  // ── Selected asset (for detail view) ─
  selectedAssetId: string | null;
  setSelectedAsset: (id: string | null) => void;

  // ── Sidebar collapsed ────────────────
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'generate',
  setActiveView: (view) => set({ activeView: view }),
  activeGenerateTab: 'text-to-3d',
  setActiveGenerateTab: (tab) => set({ activeGenerateTab: tab }),
  selectedAssetId: null,
  setSelectedAsset: (id) => set({ selectedAssetId: id }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
```

```typescript
// src/stores/taskStore.ts
import { create } from 'zustand';

interface ActiveTask {
  taskId: string;
  endpoint: string;
  meshyType: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  progress: number;
  label: string;             // Human-readable: "Text to 3D: a monster mask"
  startedAt: number;
  error: string | null;
}

interface TaskState {
  activeTasks: Map<string, ActiveTask>;
  addTask: (task: ActiveTask) => void;
  updateTask: (taskId: string, updates: Partial<ActiveTask>) => void;
  removeTask: (taskId: string) => void;
  clearCompleted: () => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  activeTasks: new Map(),
  addTask: (task) => set((s) => {
    const tasks = new Map(s.activeTasks);
    tasks.set(task.taskId, task);
    return { activeTasks: tasks };
  }),
  updateTask: (taskId, updates) => set((s) => {
    const tasks = new Map(s.activeTasks);
    const existing = tasks.get(taskId);
    if (existing) {
      tasks.set(taskId, { ...existing, ...updates });
    }
    return { activeTasks: tasks };
  }),
  removeTask: (taskId) => set((s) => {
    const tasks = new Map(s.activeTasks);
    tasks.delete(taskId);
    return { activeTasks: tasks };
  }),
  clearCompleted: () => set((s) => {
    const tasks = new Map(s.activeTasks);
    for (const [id, task] of tasks) {
      if (['SUCCEEDED', 'FAILED', 'CANCELED'].includes(task.status)) {
        tasks.delete(id);
      }
    }
    return { activeTasks: tasks };
  }),
}));
```

### 8.2 TanStack Query Hooks

```typescript
// src/hooks/useMeshyApi.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';

// ─── Text to 3D ──────────────────────────────────────────────
export function useCreateTextTo3D() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: TextTo3DPreviewRequest | TextTo3DRefineRequest) => {
      const response = await invoke<TaskCreateResponse>('create_text_to_3d', { body });
      return response;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },
  });
}

// ─── Image to 3D ──────────────────────────────────────────────
export function useCreateImageTo3D() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ImageTo3DRequest) => {
      return await invoke<TaskCreateResponse>('create_image_to_3d', { body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },
  });
}

// ─── Task Polling ─────────────────────────────────────────────
export function usePollTask(taskId: string | null, endpoint: string) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      return await invoke<TaskObject>('poll_task', { endpoint, taskId });
    },
    enabled: !!taskId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELED') {
        return false;  // Stop polling
      }
      return 5000;  // Poll every 5 seconds
    },
    refetchIntervalInBackground: true,
  });
}

// ─── SSE Stream (alternative to polling) ─────────────────────
export function useStreamTask(taskId: string | null, endpoint: string) {
  const updateTask = useTaskStore((s) => s.updateTask);
  useEffect(() => {
    if (!taskId) return;
    const unlisten = listen('task-progress', (event) => {
      const data = event.payload as TaskObject;
      updateTask(taskId, {
        status: data.status,
        progress: data.progress,
        error: data.taskError?.message ?? null,
      });
    });
    // Start streaming
    invoke('stream_task', { endpoint, taskId });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [taskId, endpoint, updateTask]);
}

// ─── Asset Download ───────────────────────────────────────────
export function useDownloadAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      taskId: string;
      modelUrls: Record<string, string>;
      thumbnailUrl?: string;
      textureUrls?: TextureUrl[];
    }) => {
      return await invoke('download_asset', params);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

// ─── Credit Balance ──────────────────────────────────────────
export function useCreditBalance() {
  return useQuery({
    queryKey: ['credit-balance'],
    queryFn: async () => await invoke<number>('get_credit_balance'),
    refetchInterval: 60000,  // Refresh every minute
    refetchOnWindowFocus: true,
  });
}

// ─── Asset Library ────────────────────────────────────────────
export function useAssets(searchQuery?: string, tagFilter?: string) {
  return useQuery({
    queryKey: ['assets', searchQuery, tagFilter],
    queryFn: async () => {
      if (searchQuery || tagFilter) {
        return await invoke<Asset[]>('search_assets', {
          query: searchQuery ?? '',
          tag: tagFilter ?? null,
        });
      }
      return await invoke<Asset[]>('get_all_assets');
    },
  });
}

// ─── API Key ──────────────────────────────────────────────────
export function useApiKey() {
  return useQuery({
    queryKey: ['api-key'],
    queryFn: async () => await invoke<string | null>('get_api_key'),
  });
}

export function useSetApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => await invoke('set_api_key', { key }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-key'] });
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },
  });
}
```

### 8.3 Tauri Invoke Wrappers

```typescript
// src/lib/tauri.ts
import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

// Type-safe invoke wrapper
export function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return tauriInvoke<T>(command, args);
}

// Event listener wrapper
export function onEvent<T>(event: string, handler: (payload: T) => void): Promise<UnlistenFn> {
  return listen<T>(event, (e) => handler(e.payload));
}

// ─── File dialog wrappers ────────────────────────────────────
export async function openImageDialog(): Promise<string | null> {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    multiple: false,
  });
  return typeof selected === 'string' ? selected : null;
}

export async function openMultiImageDialog(): Promise<string[]> {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    multiple: true,
  });
  if (Array.isArray(selected)) return selected;
  return selected ? [selected] : [];
}

// ─── File path to data URI ───────────────────────────────────
export async function fileToDataUri(path: string): Promise<string> {
  return await invoke<string>('read_file_as_data_uri', { path });
}

// ─── Reveal file in OS file manager ───────────────────────────
export async function revealInFinder(path: string): Promise<void> {
  await invoke('reveal_in_file_manager', { path });
}
```

### 8.4 3D Preview Component

```typescript
// src/components/gallery/AssetPreview3D.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import { Suspense } from 'react';

function Model({ path }: { path: string }) {
  // For local files, we load via Tauri's asset protocol
  const { scene } = useGLTF(path);
  return <primitive object={scene} />;
}

export function AssetPreview3D({ glbPath }: { glbPath: string }) {
  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-900">
      <Canvas
        camera={{ position: [3, 2, 5], fov: 45 }}
        shadows
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <Suspense fallback={null}>
          <Model path={glbPath} />
          <Environment preset="studio" />
          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.5}
            scale={10}
            blur={2}
            far={4}
          />
        </Suspense>
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={15}
        />
      </Canvas>
    </div>
  );
}
```

---

## 9. UI/UX Design

### 9.1 Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  MeshyForge                              Credits: 820  ⚙️ Settings  │ ← TopBar
├────────┬─────────────────────────────────────────────────────────┤
│        │                                                         │
│ 🔄 Gen │  ┌─ Tabs ──────────────────────────────────────────────┐ │
│ 🖼 Gal │  │ [Text→3D] [Image→3D] [Multi-Img] [Post-Proc] [Rig] ...│ │
│ ⚡ Tsk │  └──────────────────────────────────────────────────────┘ │
│        │                                                         │
│        │  ┌─ Form Panel ──────────┐  ┌─ Preview / Result ────────┐ │
│        │  │                       │  │                          │ │
│        │  │  Prompt:              │  │   ┌────────────────────┐ │ │
│        │  │  ┌───────────────────┐│  │   │                    │ │ │
│        │  │  │ a monster mask...  ││  │   │   3D Preview       │ │ │
│        │  │  └───────────────────┘│  │   │   (or placeholder)  │ │ │
│        │  │                       │  │   │                    │ │ │
│        │  │  AI Model: [Meshy 7 ▼]│  │   └────────────────────┘ │ │
│        │  │  Remesh: ☑            │  │                          │ │
│        │  │  Polycount: [30000]   │  │   Status: Awaiting gen   │ │
│        │  │  Pose: [None ▼]       │  │   Credits: 20            │ │
│        │  │  PBR: ☑               │  │                          │ │
│        │  │  Formats: ☑GLB ☑FBX   │  │   [Generate]  [Save Preset]│ │
│        │  │                       │  │                          │ │
│        │  └───────────────────────┘  └──────────────────────────┘ │ │
│        │                                                         │
├────────┴─────────────────────────────────────────────────────────┤
│  Active: 2 tasks (45% | 0%)    Storage: 1.2 GB    API: Connected  │ ← StatusBar
└──────────────────────────────────────────────────────────────────┘
```

### 9.2 Gallery View

```
┌──────────────────────────────────────────────────────────────────┐
│  Search: [monster           ]  Tags: [All ▼]  Sort: [Newest ▼]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ [thumb]  │  │ [thumb]  │  │ [thumb]  │  │ [thumb]  │         │
│  │          │  │          │  │          │  │          │         │
│  │ Monster  │  │ Robot    │  │ Sword    │  │ Dragon   │         │
│  │ mask     │  │ warrior  │  │          │  │          │         │
│  │ #monster │  │ #game    │  │ #weapon  │  │ #fantasy │         │
│  │ 20 cr    │  │ 20 cr    │  │ 10 cr    │  │ 30 cr    │         │
│  │ ★        │  │          │  │          │  │ ★        │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ [thumb]  │  │ [thumb]  │  │ [thumb]  │  │ [thumb]  │         │
│  │          │  │          │  │          │  │          │         │
│  │ Fox       │  │ Castle   │  │ Keychain │  │ Lamp     │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 9.3 Asset Detail Panel

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back                                      [Reveal in Finder]  │
├───────────────────────────────────┬──────────────────────────────┤
│                                   │  Metadata                     │
│  ┌─────────────────────────────┐  │  ─────────────────           │
│  │                             │  │  ID: 018a210d-...            │
│  │     3D Preview (R3F)        │  │  Type: text-to-3d-refine     │
│  │     (Orbit to rotate)       │  │  Model: Meshy 7              │
│  │                             │  │  Prompt: "a monster mask"    │
│  │                             │  │  Credits: 20                 │
│  └─────────────────────────────┘  │  Created: 2025-01-15 14:30   │
│                                   │  Status: SUCCEEDED           │
│  [GLB] [FBX] [OBJ] [STL] [USDZ]  │                               │
│                                   │  Tags                         │
│  Textures:                        │  ┌─────────┐ ┌────────┐      │
│  [Base Color] [Normal] [Metallic]│  │ #monster│ #halloween│      │
│  [Roughness] [Emission]          │  └─────────┘ └────────┘      │
│                                   │  [+ Add tag]                 │
│                                   │                               │
│                                   │  Notes                        │
│                                   │  ┌───────────────────────┐   │
│                                   │  │ Good for Halloween... │   │
│                                   │  └───────────────────────┘   │
│                                   │                               │
│                                   │  Actions                      │
│                                   │  [Remesh] [Retexture] [Rig]  │
│                                   │  [Animate] [Convert] [Resize]│
│                                   │  [Export] [Delete]           │
│                                   │                               │
│                                   │  Task Chain                   │
│                                   │  preview → refine (this)      │
└───────────────────────────────────┴──────────────────────────────┘
```

### 9.4 Task Monitor

```
┌──────────────────────────────────────────────────────────────────┐
│  Active Tasks                                          [Clear Done]│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔄 Text to 3D: "a monster mask" (refine)                         │
│     ████████████████░░░░░░░░  68%  IN_PROGRESS                   │
│     Started 2m ago · Endpoint: /v2/text-to-3d                    │
│                                                                  │
│  🔄 Image to 3D: robot.jpg                                       │
│     ██████░░░░░░░░░░░░░░░░░░  25%  IN_PROGRESS                   │
│     Started 45s ago                                              │
│                                                                  │
│  ✅ Remesh: 018a210d-... (SUCCEEDED)                             │
│     ████████████████████████ 100%  20 credits                    │
│     [Download] [View in Gallery]                                  │
│                                                                  │
│  ❌ Retexture: failed — "image_too_complex"                      │
│     See error docs →                                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 9.5 Design System Tokens

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#0a0a0b` | App background |
| `--bg-secondary` | `#18181b` | Panels, cards |
| `--bg-tertiary` | `#27272a` | Inputs, hover states |
| `--border` | `#3f3f46` | Borders, dividers |
| `--text-primary` | `#fafafa` | Primary text |
| `--text-secondary` | `#a1a1aa` | Secondary text |
| `--text-muted` | `#71717a` | Muted, disabled |
| `--accent` | `#6366f1` (indigo-500) | Primary action, selected state |
| `--accent-hover` | `#4f46e5` | Hover state |
| `--success` | `#22c55e` | SUCCEEDED status |
| `--warning` | `#f59e0b` | IN_PROGRESS, PENDING |
| `--danger` | `#ef4444` | FAILED, CANCELED, errors |
| `--radius-sm` | `6px` | Buttons, inputs |
| `--radius-md` | `8px` | Cards, panels |
| `--radius-lg` | `12px` | Modals, dialogs |
| `--font-mono` | `JetBrains Mono` | Code, API responses |
| `--font-sans` | `Inter` | UI text |

---

## 10. Endpoint Coverage Matrix

| Feature Panel | API Endpoint(s) | Tauri Command | Credits |
|---|---|---|---|
| Text to 3D (Preview) | `POST /v2/text-to-3d` | `create_text_to_3d` | 20 (meshy-6/7), 5 (others) |
| Text to 3D (Refine) | `POST /v2/text-to-3d` | `create_text_to_3d` | 10 (2k/4k), 15 (8k) |
| Image to 3D | `POST /v1/image-to-3d` | `create_image_to_3d` | 20–35 |
| Multi-Image to 3D | `POST /v1/multi-image-to-3d` | `create_multi_image_to_3d` | 20–35 |
| Remesh | `POST /v1/remesh` | `create_remesh` | 5 |
| Retexture | `POST /v1/retexture` | `create_retexture` | 10–15 |
| Convert | `POST /v1/convert` | `create_convert` | 1 |
| Resize | `POST /v1/resize` | `create_resize` | 1 |
| UV Unwrap | `POST /v1/uv-unwrap` | `create_uv_unwrap` | 5 |
| Rigging | `POST /v1/rigging` | `create_rigging` | 5 |
| Animation | `POST /v1/animations` | `create_animation` | 3 |
| Text to Image | `POST /v1/text-to-image` | `create_text_to_image` | 3–9 |
| Image to Image | `POST /v1/image-to-image` | `create_image_to_image` | 3–12 |
| Multi-Color Print | `POST /v1/print/multi-color` | `create_multi_color_print` | 10 |
| Analyze Printability | `POST /v1/print/analyze` | `create_analyze_printability` | Free |
| Repair Printability | `POST /v1/print/repair` | `create_repair_printability` | 10 |
| Creative Lab: Keychain | `POST /creative-lab/keychain/v1/*` | `create_creative_lab_keychain` | 6 + 30 |
| Creative Lab: Fridge Magnet | `POST /creative-lab/fridge-magnet/v1/*` | `create_creative_lab_fridge_magnet` | 6 + 30 |
| Creative Lab: Figure | `POST /creative-lab/figure/v1/*` | `create_creative_lab_figure` | 6 + 30 |
| Creative Lab: Vinyl Figure | `POST /creative-lab/vinyl-figure/v1/*` | `create_creative_lab_vinyl_figure` | 6 + 30 |
| Creative Lab: Brick Figure | `POST /creative-lab/brick-figure/v1/*` | `create_creative_lab_brick_figure` | 6 + 30 |
| Creative Lab: Lamp | `POST /creative-lab/lamp/v1/*` | `create_creative_lab_lamp` | 6 + 30 |
| Creative Lab: Keycap | `POST /creative-lab/keycap/v1/*` | `create_creative_lab_keycap` | 12 + 50 |
| Balance | `GET /v1/balance` | `get_credit_balance` | Free |
| Animation Library | `GET /web/public/animations/resources` | `fetch_animation_library` | Free |
| Task Retrieval | `GET /*/:id` | `poll_task` | Free |
| Task Streaming | `GET /*/:id/stream` | `stream_task` | Free |
| Task Deletion | `DELETE /*/:id` | `delete_task` | Free |
| Task List | `GET /*` | `list_tasks` | Free |
| Asset Download | (signed URLs) | `download_asset` | Free |

---

## 11. Security Considerations

| Concern | Mitigation |
|---|---|
| **API key storage** | Stored in OS keychain (macOS Keychain, Windows Credential Manager, Linux secret service) via Tauri's `keytar` integration. Never written to SQLite, never logged, never sent to frontend in plaintext. |
| **API key in transit** | The Rust backend reads the key from keychain at startup and constructs the `MeshyClient`. The frontend never sees the raw key — it only calls Tauri commands which internally use the client. |
| **CORS** | Not applicable — desktop apps make native HTTP requests through Rust's `reqwest`, which is not subject to browser CORS restrictions. |
| **Signed download URLs** | Meshy returns pre-signed URLs for model/texture downloads. These are fetched server-side (Rust) and saved to the local filesystem. No auth header needed for these. |
| **SQLite injection** | All queries use parameterized statements (`rusqlite` `params![]`). No string interpolation in SQL. |
| **Error messages** | API error bodies may contain sensitive info. Error responses are sanitized before emitting to the frontend (strip auth headers, truncate long bodies). |
| **File system access** | Assets are stored under the app's data directory. The app never writes outside this directory. Export dialogs use the OS file picker. |
| **Input validation** | All form inputs are validated client-side (TypeScript types) and server-side (Rust struct deserialization). Invalid requests are rejected before hitting the API. |

---

## 12. Error Handling Strategy

### 12.1 Error Hierarchy

```
MeshyError (Rust)
├── ApiError { status, body }        → HTTP 4xx/5xx from Meshy
├── Network(reqwest::Error)           → Connection issues, timeouts
├── DownloadFailed(StatusCode)         → Signed URL download failed
├── Filesystem(io::Error)             → Disk full, permissions, missing dir
├── Json(serde_json::Error)           → Malformed response
└── MissingApiKey                     → Key not set or invalid

Frontend Error Display
├── Toast (transient)                 → "Failed to create task: 402 Payment Required"
├── Inline error (form)               → Field-level validation
├── Task card error badge             → Persistent error on task monitor
├── Error boundary (React)            → Catches render crashes, shows fallback
└── Status bar indicator              → "API: Disconnected" / "API: Error"
```

### 12.2 Retry Strategy

| Error Type | Retry? | Strategy |
|---|---|---|
| 429 Too Many Requests | Yes | Exponential backoff: 5s → 10s → 20s → 40s (max 3 retries) |
| 500/502/503 Server Error | Yes | Fixed delay: 10s (max 2 retries) |
| Timeout (no response) | Yes | Retry after 15s (max 2 retries) |
| 400 Bad Request | No | Show error to user; don't retry |
| 401 Unauthorized | No | Prompt user to re-enter API key |
| 402 Payment Required | No | Show "insufficient credits" message |
| 404 Not Found | No | Show error; task may have been deleted |
| Network error (DNS, connection refused) | Yes | Retry after 5s (max 3 retries) |

---

## 13. Performance Considerations

| Area | Strategy |
|---|---|
| **Polling efficiency** | Default to polling (5s interval). SSE streaming is opt-in per task (persistent connection). Only active tasks poll; completed tasks stop. |
| **Thumbnail loading** | Thumbnails are stored locally after first download. Subsequent gallery loads read from disk, not the network. |
| **3D preview** | Only the selected asset loads a 3D viewer. Gallery cards use 2D thumbnail PNGs. |
| **SQLite queries** | Indexed by `status`, `meshy_type`, `created_at`, `favorite`. Gallery query is a single `SELECT * ORDER BY created_at DESC`. |
| **Memory** | Assets are loaded in paginated batches (50 at a time). TanStack Query cache holds the current page + 1. |
| **Bundle size** | Tauri webview loads only the current route. Code-splitting via React lazy() for heavy panels (3D viewer, Creative Lab). |
| **Download concurrency** | Max 3 concurrent downloads (semaphore in Rust). Prevents overwhelming the network. |
| **File storage** | Assets are stored in per-task directories. Orphaned directories (asset deleted from DB) are cleaned up on app startup. |

---

## 14. Build & Release

### 14.1 Development Setup

```bash
# Prerequisites
# - Rust 1.75+ (rustup)
# - Node.js 22+
# - Platform-specific webview (WebKit on macOS, WebView2 on Windows, webkitgtk on Linux)

# Clone
git clone https://github.com/<user>/meshyforge.git
cd meshyforge

# Install frontend deps
npm install

# Run dev mode (hot reload frontend + Rust)
npm run tauri dev

# Run tests
npm run test          # Vitest (frontend)
cargo test --manifest-path src-tauri/Cargo.toml  # Rust tests

# Lint
npm run lint          # ESLint + Biome
cargo clippy --manifest-path src-tauri/Cargo.toml
```

### 14.2 Build Commands

```bash
# Build for current platform
npm run tauri build

# Output:
# macOS:   src-tauri/target/release/bundle/dmg/MeshyForge_1.0.0_arm64.dmg
# Windows: src-tauri/target/release/bundle/msi/MeshyForge_1.0.0_x64.msi
# Linux:   src-tauri/target/release/bundle/deb/meshyforge_1.0.0_amd64.deb
```

### 14.3 GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  lint-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run test

  test-rust:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo test --manifest-path src-tauri/Cargo.toml
      - run: cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

### 14.4 Release Workflow

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-latest
            target: aarch64-apple-darwin
          - os: macos-latest
            target: x86_64-apple-darwin
          - os: windows-latest
            target: x86_64-pc-windows-msvc
          - os: ubuntu-22.04
            target: x86_64-unknown-linux-gnu
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run tauri build -- --target ${{ matrix.target }}
      - uses: softprops/action-gh-release@v2
        with:
          files: |
            src-tauri/target/*/release/bundle/dmg/*.dmg
            src-tauri/target/*/release/bundle/msi/*.msi
            src-tauri/target/*/release/bundle/deb/*.deb
            src-tauri/target/*/release/bundle/appimage/*.AppImage
```

---

## 15. Testing Strategy

| Layer | Tool | Coverage Target | Focus |
|---|---|---|---|
| **Rust unit tests** | `cargo test` | 80% | Meshy client, database operations, file management, error handling |
| **React component tests** | Vitest + Testing Library | 70% | Form validation, state transitions, render correctness |
| **Integration tests** | Vitest + Tauri test utils | Key flows | Create task → poll → download → appears in gallery |
| **E2E tests** | Playwright (via Tauri WebDriver) | Critical paths | First launch, API key setup, generate model, view in gallery, export |
| **Mock strategy** | MSW (Mock Service Worker) for Meshy API | All endpoints | Mock responses match real API shapes from `meshy-types.ts` |

### 15.1 Key Test Scenarios

```
1. First Launch
   └─ No API key → prompt to enter → validate → store in keychain → show balance

2. Text to 3D Full Flow
   └─ Enter prompt → generate preview → poll → download → appears in gallery →
      click → 3D preview loads → refine → download → new asset linked to parent

3. Image to 3D Full Flow
   └─ Drag image → generate → poll → download → gallery → export as FBX →
      file picker → save to chosen location

4. Post-Processing Chain
   └─ Select existing asset → remesh → poll → download → new asset linked →
      retexture → poll → download → new asset linked → rigging → poll → download

5. Error Recovery
   └─ Task fails → error displayed → retry button → succeeds on second attempt

6. Offline Mode
   └─ Disconnect network → gallery still loads from SQLite → 3D preview works →
      export works → only generation fails with network error

7. Credit Exhaustion
   └─ Create task → 402 Payment Required → toast "Insufficient credits" →
      balance shows 0 → generation buttons disabled
```

---

## 16. Configuration & Defaults

### 16.1 User Preferences (SQLite `settings` table)

| Key | Default | Description |
|---|---|---|
| `api_key_service` | `"meshy"` | Keychain service name |
| `default_ai_model` | `"latest"` | Default model for generation |
| `default_texture_resolution` | `"2k"` | Default texture resolution |
| `default_should_remesh` | `false` | Default remesh toggle |
| `default_target_polycount` | `30000` | Default polycount |
| `default_target_formats` | `["glb", "fbx"]` | Default export formats to request |
| `default_enable_pbr` | `true` | Default PBR toggle |
| `default_remove_lighting` | `true` | Default remove lighting toggle |
| `default_pose_mode` | `""` | Default pose (none) |
| `poll_interval_ms` | `5000` | Task polling interval |
| `use_sse_streaming` | `false` | Prefer SSE over polling |
| `max_concurrent_tasks` | `5` | Max active tasks in queue |
| `max_concurrent_downloads` | `3` | Max parallel file downloads |
| `gallery_page_size` | `50` | Assets per gallery page |
| `auto_download_on_success` | `true` | Auto-download files when task succeeds |
| `notify_on_task_complete` | `true` | OS notification when task finishes |
| `theme` | `"dark"` | UI theme (dark only for MVP) |

### 16.2 Saved Prompt Presets

```typescript
interface PromptPreset {
  id: string;            // UUID
  name: string;          // "Low-poly game character"
  prompt: string;       // "a low-poly warrior character, game-ready, clean edges"
  modelType: string;     // "standard" | "smart-topology" | "lowpoly"
  aiModel: AiModel;      // "meshy-7"
  shouldRemesh: boolean;
  targetPolycount: number;
  poseMode: string;
  enablePbr: boolean;
  textureResolution: string;
  targetFormats: ExportFormat[];
  createdAt: number;
}
// Stored in SQLite settings table as JSON under key "prompt_presets"
```

---

## 17. API Deprecation Tracking

The Meshy API has a documented changelog. The app will:

1. **Ship a frozen copy** of the API spec (from `llms-full.txt` at build time) in `src/lib/api-spec.json`
2. **Check for deprecation warnings** in API responses (e.g., `hd_texture` deprecated in favor of `texture_resolution`)
3. **Show a banner** in settings if the API version has changed: "Meshy API updated — new features available. Check changelog →"
4. **Manual update**: A "Refresh API spec" button in settings fetches the latest `llms.txt` and compares against the frozen copy

---

## 18. Future Roadmap (Post-MVP)

| Phase | Feature | Priority |
|---|---|---|
| 1.1 | Prompt preset library with import/export | High |
| 1.2 | Batch generation (multiple prompts/images in one queue) | High |
| 1.3 | Asset comparison view (side-by-side 3D previews) | Medium |
| 1.4 | Auto-tagging (AI suggests tags based on prompt keywords) | Medium |
| 1.5 | Export to specific DCC tools (one-click Blender/Unity/ZBrush open) | Medium |
| 2.0 | Pipeline builder (visual node graph: generate → remesh → texture → rig → animate) | High |
| 2.1 | MCP server integration (MeshyForge as local MCP server for AI coding assistants) | Medium |
| 2.2 | Asset versioning (fork an asset, retexture, keep both versions) | Medium |
| 2.3 | Cloud backup (optional — sync asset metadata to GitHub Gist) | Low |
| 3.0 | Plugin SDK (community extensions for new endpoints) | Low |

---

## 19. Appendix

### 19.1 Meshy API Rate Limits (Reference)

| Tier | Requests/Second | Queue Tasks | Priority |
|---|---|---|---|
| Pro | 20 | 10 | Default |
| Premium | 20 | 30 | Higher than Pro |
| Ultra | 20 | 100 | Highest |
| Studio | 20 | 20 | Higher than Pro |
| Enterprise | 100 | 50+ | Highest |

### 19.2 Asset Retention

- Non-Enterprise: Generated assets retained for **3 days** on Meshy servers
- Enterprise: Indefinite retention
- MeshyForge downloads immediately on task success, so local retention is permanent

### 19.3 File Size Considerations

| Asset Type | Typical Size | Notes |
|---|---|---|
| GLB (textured, 30K faces) | 5–15 MB | Most common export |
| FBX (textured) | 10–30 MB | Separate texture files |
| OBJ + MTL + textures | 10–40 MB | Multiple files |
| STL (geometry only) | 2–10 MB | No textures |
| 4K base color texture | 5–20 MB | PNG |
| 8K base color texture | 20–80 MB | PNG |

### 19.4 Key Dependencies (Cargo.toml)

```toml
[dependencies]
tauri = { version = "2", features = ["protocol-asset"] }
tauri-plugin-dialog = "2"
tauri-plugin-notification = "2"
tauri-plugin-shell = "2"
reqwest = { version = "0.12", features = ["json", "stream"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
keyring = "3"                    # OS keychain
tokio = { version = "1", features = ["full"] }
futures-util = "0.3"              # SSE stream parsing
thiserror = "2"                   # Error derive macro
chrono = "0.4"                    # Timestamps
uuid = { version = "1", features = ["v4"] }
```

### 19.5 Key Dependencies (package.json)

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-dialog": "^2",
    "@tauri-apps/plugin-notification": "^2",
    "@tauri-apps/plugin-shell": "^2",
    "@tanstack/react-query": "^5",
    "@react-three/fiber": "^9",
    "@react-three/drei": "^10",
    "three": "^0.170",
    "react": "^19",
    "react-dom": "^19",
    "zustand": "^5",
    "lucide-react": "^0.460",
    "clsx": "^2",
    "tailwind-merge": "^2"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "vite": "^6",
    "@vitejs/plugin-react": "^4",
    "typescript": "^5.7",
    "vitest": "^2",
    "@testing-library/react": "^16",
    "@playwright/test": "^1.49",
    "eslint": "^9",
    "@biomejs/biome": "^1.9",
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4"
  }
}
```
