# Feature Requirements Document — MeshyForge

## Document Metadata
| Field | Value |
|---|---|
| **Project** | MeshyForge — AI 3D Asset Studio |
| **Document Type** | Feature Requirements Document (FRD) |
| **Version** | 1.0.0 |
| **Date** | 2025 |
| **Status** | Approved for Implementation |
| **Scope** | MVP (v1.0.0) |
| **Dependencies** | TDD v1.0.0, TSS v1.0.0, UI/UX v1.0.0, CSD v1.0.0 |

---

## Table of Contents
1. [Document Scope and Conventions](#1-document-scope-and-conventions)
2. [Product Vision and MVP Definition](#2-product-vision-and-mvp-definition)
3. [User Profile](#3-user-profile)
4. [Feature Catalog](#4-feature-catalog)
5. [Feature Specifications](#5-feature-specifications)
6. [Feature Dependency Graph](#6-feature-dependency-graph)
7. [Feature Traceability Matrix](#7-feature-traceability-matrix)
8. [Out of Scope](#8-out-of-scope)
9. [MVP Completion Criteria](#9-mvp-completion-criteria)

---

## 1. Document Scope and Conventions

### 1.1 Purpose

This document defines every feature that must be present in the MeshyForge v1.0.0 release. Each feature has a unique ID, a user story, acceptance criteria, functional requirements, non-functional requirements, and explicit dependencies on upstream design documents. No feature in this document may contradict the TDD, TSS, UI/UX, or CSD.

### 1.2 Feature ID Convention

Every feature is assigned an ID using the format `FR-{domain}-{number}`:

| Domain Code | Domain |
|---|---|
| `INF` | Infrastructure and foundation |
| `KEY` | API key and authentication |
| `GEN` | 3D generation workflows |
| `POST` | Post-processing workflows |
| `IMG` | 2D image generation |
| `PRINT` | 3D printing workflows |
| `CLAB` | Creative Lab workflows |
| `TASK` | Task monitoring and management |
| `GAL` | Asset gallery and library |
| `PREV` | 3D preview and visualization |
| `TAG` | Tagging and metadata |
| `EXP` | Export and file management |
| `SET` | Settings and preferences |
| `NOTIF` | Notifications and feedback |

### 1.3 Priority Classification

Every feature is assigned a priority using the MoSCoW method:

| Priority | Meaning | MVP Inclusion |
|---|---|---|
| **Must Have** | Essential for MVP. The app is non-functional without this feature. | ✅ Included |
| **Should Have** | Important but not essential. The app works without it, but the experience is degraded. | ✅ Included if time permits; otherwise deferred to v1.1 |
| **Could Have** | Desirable but not necessary. Adds polish. | ⚠️ Deferred to v1.1 unless explicitly included |
| **Won't Have** | Explicitly out of scope for MVP. | ❌ Excluded |

All features in this document are **Must Have** unless explicitly marked otherwise. The MVP is defined as the set of all Must Have features.

### 1.4 Acceptance Criteria Format

Each feature's acceptance criteria are written as Given/When/Then statements:

```
GIVEN [precondition]
WHEN [user action]
THEN [observable outcome]
```

### 1.5 Requirement Types

| Type | Prefix | Description |
|---|---|---|
| **Functional Requirement** | `FR-` | What the system must do |
| **Non-Functional Requirement** | `NFR-` | How the system must behave (performance, security, a11y) |
| **Data Requirement** | `DR-` | What data must be stored or retrieved |
| **Integration Requirement** | `IR-` | What external API or system must be called |

### 1.6 Source Alignment

Every feature references the upstream document sections that define its implementation:

| Abbreviation | Document |
|---|---|
| TDD | Technical Design Document v1.0.0 |
| TSS | Tech Stack Specification v1.0.0 |
| UI/UX | UI/UX Guardrails and Build Document v1.0.0 |
| CSD | Coding Standards Document v1.0.0 |

---

## 2. Product Vision and MVP Definition

### 2.1 Product Vision

MeshyForge is a cross-platform desktop application that provides a complete, self-contained workflow for generating, post-processing, organizing, and exporting AI-created 3D assets via the Meshy AI API. It replaces the need to repeatedly use the Meshy web UI or write throwaway scripts by wrapping every Meshy REST endpoint behind a visual interface with local asset persistence, 3D preview, and metadata management.

### 2.2 MVP Definition

The MVP is the set of features that delivers a complete, usable workflow:

```
Configure API Key → Generate 3D Model → Monitor Task → Download Asset →
Browse Gallery → Preview 3D → Tag & Annotate → Post-Process → Export
```

Every Meshy API endpoint must be accessible from the UI. Every generated asset must be downloadable, stored locally, browsable, previewable, and exportable. The app must work offline for all local operations (browsing, previewing, exporting). Only generation requires network connectivity.

### 2.3 MVP Success Criteria

The MVP is complete when a user can:

1. Launch the app on macOS, Windows, or Linux
2. Enter their Meshy API key and see their credit balance
3. Generate a 3D model from a text prompt (preview → refine)
4. Generate a 3D model from an image
5. Watch task progress in real-time
6. Automatically download completed assets to local storage
7. Browse all assets in a thumbnail gallery
8. Click an asset to see a 3D preview
9. Add tags and notes to an asset
10. Run post-processing (remesh, retexture, rig, animate) on an existing asset
11. Export an asset in any supported format (GLB, FBX, OBJ, STL, USDZ, 3MF)
12. Search and filter the gallery by text and tags
13. Access all previously downloaded assets while offline
14. Receive OS notifications when tasks complete

---

## 3. User Profile

### 3.1 Primary User

| Attribute | Value |
|---|---|
| **Role** | Solo developer / 3D artist / maker |
| **Technical level** | Intermediate to advanced |
| **Platform** | macOS, Windows, or Linux desktop |
| **Meshy account** | Has a Meshy account with API access (Pro plan or higher) |
| **Use case** | Generates 3D assets for games, 3D printing, or design prototyping |
| **Frequency** | Multiple sessions per week |
| **Pain point** | Repeatedly using the Meshy web UI or writing throwaway Python scripts for each generation |
| **Goal** | A persistent, local asset library with visual workflow for all Meshy capabilities |

### 3.2 User Workflow

```
Session Start
    │
    ├── (First time) Enter API key → validate → see credit balance
    │
    ├── Generate
    │   ├── Text to 3D (prompt → preview → refine → download)
    │   ├── Image to 3D (upload image → generate → download)
    │   ├── Multi-Image to 3D (upload 1-4 images → generate → download)
    │   ├── Image Generation (text-to-image, image-to-image)
    │   └── Creative Lab (keychain, figure, lamp, etc.)
    │
    ├── Monitor
    │   ├── Watch active tasks (progress bars, status badges)
    │   ├── Receive OS notification on completion
    │   └── Auto-download on success
    │
    ├── Browse
    │   ├── Open gallery → see all assets as thumbnail cards
    │   ├── Search by prompt text
    │   ├── Filter by tag
    │   └── Click asset → see 3D preview + metadata
    │
    ├── Post-Process
    │   ├── Select existing asset → remesh (change polycount)
    │   ├── Select existing asset → retexture (new style)
    │   ├── Select existing asset → rig (add skeleton)
    │   ├── Select rigged asset → animate (apply preset)
    │   ├── Select existing asset → convert (change format)
    │   ├── Select existing asset → resize (change dimensions)
    │   ├── Select existing asset → UV unwrap
    │   └── Select existing asset → 3D print (multi-color, analyze, repair)
    │
    ├── Organize
    │   ├── Add/remove tags on assets
    │   ├── Write notes on assets
    │   ├── Mark assets as favorite
    │   └── Delete assets (removes from gallery + local files)
    │
    ├── Export
    │   ├── Select asset → choose format → save to disk
    │   └── Select multiple assets → batch export
    │
    └── Session End
```

---

## 4. Feature Catalog

### 4.1 Feature Summary

| ID | Feature | Domain | Priority | Phase |
|---|---|---|---|---|
| FR-INF-01 | Project scaffold and build system | Infrastructure | Must | 0 |
| FR-INF-02 | Tauri IPC contract layer | Infrastructure | Must | 0 |
| FR-INF-03 | SQLite database and migrations | Infrastructure | Must | 1 |
| FR-INF-04 | Meshy API HTTP client (Rust) | Infrastructure | Must | 1 |
| FR-INF-05 | File system asset storage | Infrastructure | Must | 1 |
| FR-INF-06 | OS keychain integration | Infrastructure | Must | 1 |
| FR-INF-07 | Tauri command registration | Infrastructure | Must | 1 |
| FR-INF-08 | CI/CD pipeline | Infrastructure | Must | 0 |
| FR-KEY-01 | API key entry and validation | Authentication | Must | 2 |
| FR-KEY-02 | API key persistence | Authentication | Must | 2 |
| FR-KEY-03 | Credit balance display | Authentication | Must | 2 |
| FR-KEY-04 | Credit balance auto-refresh | Authentication | Must | 2 |
| FR-SET-01 | Application shell layout | Settings | Must | 2 |
| FR-SET-02 | Sidebar navigation | Settings | Must | 2 |
| FR-SET-03 | User preferences panel | Settings | Must | 2 |
| FR-SET-04 | About and API status panel | Settings | Must | 2 |
| FR-SET-05 | Prompt preset save and load | Settings | Should | 5 |
| FR-GEN-01 | Text to 3D preview generation | Generation | Must | 3 |
| FR-GEN-02 | Text to 3D refine (texturing) | Generation | Must | 3 |
| FR-GEN-03 | Image to 3D generation | Generation | Must | 3 |
| FR-GEN-04 | Multi-Image to 3D generation | Generation | Must | 3 |
| FR-GEN-05 | Image upload via drag-and-drop | Generation | Must | 3 |
| FR-GEN-06 | Image upload via file dialog | Generation | Must | 3 |
| FR-GEN-07 | Generation form controls | Generation | Must | 3 |
| FR-POST-01 | Remesh | Post-processing | Must | 3 |
| FR-POST-02 | Retexture | Post-processing | Must | 3 |
| FR-POST-03 | Convert format | Post-processing | Must | 3 |
| FR-POST-04 | Resize model | Post-processing | Must | 3 |
| FR-POST-05 | UV Unwrap | Post-processing | Must | 3 |
| FR-POST-06 | Auto-rigging | Post-processing | Must | 3 |
| FR-POST-07 | Animation preset application | Post-processing | Must | 3 |
| FR-IMG-01 | Text to Image generation | Image generation | Must | 3 |
| FR-IMG-02 | Image to Image transformation | Image generation | Must | 3 |
| FR-PRINT-01 | Multi-color 3D print conversion | 3D printing | Must | 3 |
| FR-PRINT-02 | Analyze printability | 3D printing | Must | 3 |
| FR-PRINT-03 | Repair printability | 3D printing | Must | 3 |
| FR-CLAB-01 | Creative Lab: Keychain | Creative Lab | Must | 3 |
| FR-CLAB-02 | Creative Lab: Fridge Magnet | Creative Lab | Must | 3 |
| FR-CLAB-03 | Creative Lab: Figure | Creative Lab | Must | 3 |
| FR-CLAB-04 | Creative Lab: Vinyl Figure | Creative Lab | Must | 3 |
| FR-CLAB-05 | Creative Lab: Brick Figure | Creative Lab | Must | 3 |
| FR-CLAB-06 | Creative Lab: Lamp | Creative Lab | Must | 3 |
| FR-CLAB-07 | Creative Lab: Keycap | Creative Lab | Must | 3 |
| FR-TASK-01 | Task creation and tracking | Task management | Must | 3 |
| FR-TASK-02 | Task polling (status updates) | Task management | Must | 3 |
| FR-TASK-03 | Task SSE streaming (opt-in) | Task management | Should | 3 |
| FR-TASK-04 | Task cancellation | Task management | Must | 3 |
| FR-TASK-05 | Task retry on failure | Task management | Must | 3 |
| FR-TASK-06 | Task history log | Task management | Must | 3 |
| FR-TASK-07 | Auto-download on task success | Task management | Must | 3 |
| FR-NOTIF-01 | OS notification on task completion | Notifications | Must | 3 |
| FR-NOTIF-02 | Toast notifications for user actions | Notifications | Must | 2 |
| FR-NOTIF-03 | Error toast notifications | Notifications | Must | 3 |
| FR-GAL-01 | Asset thumbnail grid | Gallery | Must | 4 |
| FR-GAL-02 | Asset card display | Gallery | Must | 4 |
| FR-GAL-03 | Full-text search | Gallery | Must | 4 |
| FR-GAL-04 | Tag-based filtering | Gallery | Must | 4 |
| FR-GAL-05 | Sort by date | Gallery | Must | 4 |
| FR-GAL-06 | Gallery virtualization (100+ assets) | Gallery | Must | 4 |
| FR-GAL-07 | Empty states | Gallery | Must | 4 |
| FR-GAL-08 | Asset deletion | Gallery | Must | 4 |
| FR-GAL-09 | Favorite toggle | Gallery | Must | 4 |
| FR-GAL-10 | Asset detail panel | Gallery | Must | 4 |
| FR-PREV-01 | 3D model preview (GLB) | Preview | Must | 4 |
| FR-PREV-02 | 3D camera controls (orbit, zoom) | Preview | Must | 4 |
| FR-PREV-03 | 3D preview fallback (thumbnail) | Preview | Must | 4 |
| FR-PREV-04 | 3D preview memory cleanup | Preview | Must | 4 |
| FR-TAG-01 | Add and remove tags | Tagging | Must | 4 |
| FR-TAG-02 | Notes editor | Tagging | Must | 4 |
| FR-TAG-03 | Metadata display | Tagging | Must | 4 |
| FR-TAG-04 | Task chain visualization | Tagging | Should | 4 |
| FR-EXP-01 | Single asset export | Export | Must | 4 |
| FR-EXP-02 | Batch export | Export | Must | 4 |
| FR-EXP-03 | Export format selection | Export | Must | 4 |
| FR-EXP-04 | Reveal asset in OS file manager | Export | Must | 4 |
| FR-EXP-05 | Storage usage display | Export | Should | 4 |

### 4.2 Feature Count by Priority

| Priority | Count |
|---|---|
| Must Have | 72 |
| Should Have | 4 |
| **Total** | **76** |

> **Corrected 2026 — see §5 and §4.1.** This table previously read 60/5/65. Both the §4.1 catalog (76 rows) and the §5 specifications (76 `####` entries, FR-INF-01 through FR-EXP-05) have always agreed with each other; this summary table alone had drifted out of sync and was never updated after later features were added. Recounted directly from §4.1: 72 Must Have, 4 Should Have (FR-SET-05, FR-TASK-03, FR-TAG-04, FR-EXP-05).

### 4.3 Feature Count by Phase

| Phase | Count |
|---|---|
| Phase 0: Scaffold | 3 |
| Phase 1: Backend | 5 |
| Phase 2: UI Shell | 9 |
| Phase 3: Generation | 35 |
| Phase 4: Asset Library | 23 |
| Phase 5: Polish | 1 |
| **Total** | **76** |

> **Corrected 2026** — previously read 3/5/7/30/17/3/65. Recounted directly from the Phase column of §4.1.

---

## 5. Feature Specifications

### 5.1 Infrastructure Features (Phase 0–1)

---

#### FR-INF-01: Project Scaffold and Build System

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 0 |
| **Dependencies** | None |

**Description:**
A runnable Tauri 2.x + Vite 6 + React 19 application with all dependencies installed, CI configured, and the app window launching on all three platforms.

**User Story:**
As a developer, I want to clone the repository, run one command, and see the application window launch, so that I can begin implementing features.

**Acceptance Criteria:**

```
GIVEN the repository is cloned and prerequisites are installed
WHEN the developer runs `npm install` and `npm run tauri dev`
THEN the MeshyForge application window opens displaying the app shell

GIVEN the developer runs `npm run lint`
THEN Biome reports zero errors

GIVEN the developer runs `npx tsc --noEmit`
THEN TypeScript reports zero errors

GIVEN the developer runs `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`
THEN Clippy reports zero warnings

GIVEN a push to the repository
WHEN CI runs on ubuntu-latest, windows-latest, and macos-latest
THEN all checks pass on all three platforms
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-INF-01-F1 | `package.json` contains all dependencies listed in TSS §17.1 |
| FR-INF-01-F2 | `Cargo.toml` contains all dependencies listed in TSS §17.2 |
| FR-INF-01-F3 | `tauri.conf.json` is configured per TSS §2.3 with asset protocol, CSP, and capabilities |
| FR-INF-01-F4 | `vite.config.ts` is configured per TSS §4.3 with manual chunks and path aliases |
| FR-INF-01-F5 | `tsconfig.json` is configured per TSS §3.3 with strict mode and all mandatory flags |
| FR-INF-01-F6 | `biome.json` is configured per TSS §15.3 with all lint rules |
| FR-INF-01-F7 | `globals.css` contains `@theme` tokens per TSS §5.4 and reduced-motion media query per UI/UX §5.6 |
| FR-INF-01-F8 | `.gitignore` is configured per CSD §14.4 |
| FR-INF-01-F9 | `.github/workflows/ci.yml` is configured per TSS §16.2 |
| FR-INF-01-F10 | `README.md` contains setup instructions per CSD DOC-07 |

**Non-Functional Requirements:**

| ID | Requirement |
|---|---|
| NFR-INF-01-1 | App window launches in ≤ 3 seconds on all platforms |
| NFR-INF-01-2 | Initial JS bundle ≤ 300 KB gzipped (UI/UX BDL-01) |
| NFR-INF-01-3 | All CI checks complete in ≤ 10 minutes per platform |

**Source Alignment:**

| Document | Section |
|---|---|
| TSS | §2 (Tauri), §3 (React/TS), §4 (Vite), §5 (Tailwind), §15 (Biome), §16 (CI), §17 (Dependencies) |
| UI/UX | §12.2 (Phase 0 deliverables and quality gate) |
| CSD | §3 (organization), §14 (git), §18 (enforcement) |

---

#### FR-INF-02: Tauri IPC Contract Layer

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 0 |
| **Dependencies** | FR-INF-01 |

**Description:**
The `src/lib/tauri.ts` file serves as the sole import point for `@tauri-apps/api/core`. It provides a typed `invoke<T>()` wrapper, an `onEvent<T>()` event listener wrapper, an `assetUrl()` file source converter, and a `MeshyFrontendError` typed error parser.

**User Story:**
As a developer, I want a single typed interface to all Tauri IPC calls, so that I never accidentally bypass the decoupling contract or mishandle errors.

**Acceptance Criteria:**

```
GIVEN the codebase is searched for imports from `@tauri-apps/api/core`
WHEN the search is performed outside of `src/lib/tauri.ts`
THEN zero results are found

GIVEN a Tauri command returns an error string
WHEN the error is caught by `invoke<T>()`
THEN a `MeshyFrontendError` object is thrown with `code`, `message`, and optional `details`

GIVEN a local file path needs to be displayed in the webview
WHEN `assetUrl(path)` is called
THEN a valid `asset://` protocol URL is returned
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-INF-02-F1 | `src/lib/tauri.ts` exports `invoke<T>()`, `onEvent<T>()`, `assetUrl()`, and `MeshyFrontendError` type |
| FR-INF-02-F2 | `invoke<T>()` wraps `tauriInvoke` and catches errors via `parseError()` |
| FR-INF-02-F3 | `parseError()` attempts JSON parse of the error string; falls back to `{ code: 'UNKNOWN', message: error }` |
| FR-INF-02-F4 | `assetUrl()` calls `convertFileSrc()` from `@tauri-apps/api/core` |
| FR-INF-02-F5 | No other file in the codebase imports from `@tauri-apps/api/core` (CSD CTR-07) |

**Source Alignment:**

| Document | Section |
|---|---|
| UI/UX | §7.2 (CTR-07, CTR-08), §7.3 (lib/tauri.ts implementation) |
| CSD | §7 (IPC coding standards, IPC-10) |

---

#### FR-INF-03: SQLite Database and Migrations

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 1 |
| **Dependencies** | FR-INF-01 |

**Description:**
A SQLite database with WAL mode, all tables from TDD §6.1, a migration system, and all CRUD operations for assets, tags, task log, and settings.

**User Story:**
As a developer, I want a persistent local database that stores all asset metadata, tags, and task history, so that the app can function offline and retain data across restarts.

**Acceptance Criteria:**

```
GIVEN the app is launched for the first time
WHEN the database is opened
THEN a `meshyforge.db` file is created at the platform-specific app data directory
AND all tables from TDD §6.1 are created
AND the `schema_version` table records migration 1 as applied

GIVEN the app is relaunched
WHEN the database is opened
THEN no migrations are re-applied
AND all previously stored data is intact

GIVEN an asset record is inserted
WHEN `get_all_assets()` is called
THEN the record is returned with all fields populated

GIVEN a search query "monster" is executed
WHEN `search_assets("monster", None)` is called
THEN all assets with "monster" in their prompt or notes are returned
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-INF-03-F1 | Database file is created at platform path per TSS §10.3 |
| FR-INF-03-F2 | WAL mode, `synchronous=NORMAL`, `foreign_keys=ON`, `cache_size=-64000`, `temp_store=MEMORY` pragmas are set (TSS §10.4) |
| FR-INF-03-F3 | Migration system with `schema_version` table per TDD §6.1 |
| FR-INF-03-F4 | `001_initial.sql` creates all 6 tables with indexes per TDD §6.1 |
| FR-INF-03-F5 | `insert_asset()` inserts or replaces an asset record |
| FR-INF-03-F6 | `update_task_status()` updates status, progress, timestamps, credits |
| FR-INF-03-F7 | `mark_downloaded()` updates file_paths, thumbnail_path, texture_paths, downloaded_at |
| FR-INF-03-F8 | `get_all_assets()` returns all assets ordered by `created_at DESC` |
| FR-INF-03-F9 | `search_assets(query, tag)` filters by prompt/notes LIKE and optional tag JOIN |
| FR-INF-03-F10 | `update_tags()` clears and re-inserts asset_tags, updates tags JSON on asset |
| FR-INF-03-F11 | `toggle_favorite()` flips the favorite boolean |
| FR-INF-03-F12 | `update_notes()` updates the notes field |
| FR-INF-03-F13 | `delete_asset()` removes the asset and its asset_tags entries |
| FR-INF-03-F14 | `log_task_create()` inserts into task_log |
| FR-INF-03-F15 | All queries use parameterized statements (CSD VAL-06) |

**Non-Functional Requirements:**

| ID | Requirement |
|---|---|
| NFR-INF-03-1 | Database queries return in ≤ 5ms for ≤ 10,000 records |
| NFR-INF-03-2 | Database file does not exceed 50MB for ≤ 10,000 assets |
| NFR-INF-03-3 | Connection is guarded by `Mutex<Connection>` (CSD RST-15) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §6.1 (SQLite schema), §7.3 (Database layer) |
| TSS | §10 (rusqlite, WAL mode, bundled feature) |
| CSD | §6.5 (database query pattern), §6.1 (RST-15) |

---

#### FR-INF-04: Meshy API HTTP Client (Rust)

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 1 |
| **Dependencies** | FR-INF-01 |

**Description:**
A Rust HTTP client (`MeshyClient`) using `reqwest` that handles all communication with the Meshy API: task creation, task retrieval, task deletion, file download, SSE streaming, and balance checking.

**User Story:**
As a developer, I want a single Rust module that handles all Meshy API communication, so that the frontend never needs to make HTTP requests directly.

**Acceptance Criteria:**

```
GIVEN a valid API key is set
WHEN `create_task("/v2/text-to-3d", body)` is called
THEN a `TaskCreateResponse` with the task ID is returned

GIVEN a task ID is known
WHEN `get_task("/v2/text-to-3d", task_id)` is called
THEN the full task object JSON is returned

GIVEN a signed download URL from a task response
WHEN `download_file(url, dest_path)` is called
THEN the file is saved to disk and the byte count is returned

GIVEN a task is in progress
WHEN `stream_task(endpoint, task_id, on_event)` is called
THEN SSE events are parsed and the `on_event` callback is invoked for each data event
AND the function returns when a terminal status is received

GIVEN a valid API key
WHEN `get_balance()` is called
THEN a `BalanceResponse` with the credit balance is returned

GIVEN the API returns HTTP 402
WHEN `create_task()` is called
THEN a `MeshyError::ApiError { status: 402, body: "..." }` is returned
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-INF-04-F1 | `MeshyClient::new(api_key)` constructs the client with `reqwest::Client` (120s timeout, rustls TLS, connection pooling) |
| FR-INF-04-F2 | `create_task(endpoint, body)` sends POST with `Authorization: Bearer {key}` header |
| FR-INF-04-F3 | `get_task(endpoint, task_id)` sends GET to `{endpoint}/{task_id}` |
| FR-INF-04-F4 | `delete_task(endpoint, task_id)` sends DELETE to `{endpoint}/{task_id}` |
| FR-INF-04-F5 | `download_file(url, dest_path)` streams response to disk in chunks (CSD BPR-04) |
| FR-INF-04-F6 | `stream_task(endpoint, task_id, on_event)` opens SSE connection, parses `data:` lines, invokes callback, returns on terminal status |
| FR-INF-04-F7 | `get_balance()` sends GET to `/v1/balance` |
| FR-INF-04-F8 | All methods return `Result<T, MeshyError>` |
| FR-INF-04-F9 | `MeshyError` enum has variants: `ApiError`, `DownloadFailed`, `Network`, `Filesystem`, `Json`, `Database`, `MissingApiKey`, `InvalidInput` (CSD RST-12) |
| FR-INF-04-F10 | HTTP errors (4xx, 5xx) are mapped to `MeshyError::ApiError { status, body }` |

**Non-Functional Requirements:**

| ID | Requirement |
|---|---|
| NFR-INF-04-1 | HTTP client uses rustls (no OpenSSL dependency) (TSS §9.2) |
| NFR-INF-04-2 | Connection pool max idle per host: 5 (CSD BPR-03) |
| NFR-INF-04-3 | Download timeout: 120s; connection timeout: 10s |
| NFR-INF-04-4 | SSE stream parsing is incremental (no full response buffering) (CSD BPR-05) |
| NFR-INF-04-5 | No `unwrap()` or `expect()` in client code (CSD RST-01) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §7.1 (MeshyClient), §7.2 (Tauri commands) |
| TSS | §9 (reqwest), §8 (Rust) |
| CSD | §6.2 (error handling), §6.4 (async pattern), §13.2 (BPR-04, BPR-05) |

---

#### FR-INF-05: File System Asset Storage

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 1 |
| **Dependencies** | FR-INF-03, FR-INF-04 |

**Description:**
A file system manager that creates per-task directories, downloads model files, thumbnails, and textures, and cleans up orphaned directories on startup.

**User Story:**
As a user, I want all generated 3D assets stored locally on my disk, so that I can access them offline and export them to other tools.

**Acceptance Criteria:**

```
GIVEN a task has succeeded with model_urls, thumbnail_url, and texture_urls
WHEN `download_asset` is called
THEN a directory `{app_data}/assets/{task_id}/` is created
AND model files are saved as `model.{format}` in that directory
AND the thumbnail is saved as `thumbnail.png`
AND textures are saved in a `textures/` subdirectory
AND the SQLite record is updated with local file paths

GIVEN an asset is deleted from the database
WHEN the app is restarted
THEN the asset's directory is deleted from disk
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-INF-05-F1 | Asset directory: `{app_data}/assets/{task_id}/` |
| FR-INF-05-F2 | Model files saved as `model.{glb|fbx|obj|stl|usdz|3mf}` |
| FR-INF-05-F3 | Thumbnail saved as `thumbnail.png` |
| FR-INF-05-F4 | Textures saved in `textures/` subdirectory as `texture_{index}_{map_type}.png` |
| FR-INF-05-F5 | `download_asset` Tauri command accepts task_id, model_urls, thumbnail_url, texture_urls and returns local file paths |
| FR-INF-05-F6 | Orphaned directories (not in SQLite) are deleted on app startup |
| FR-INF-05-F7 | Max 3 concurrent downloads (semaphore) (CSD BPR-07) |

**Non-Functional Requirements:**

| ID | Requirement |
|---|---|
| NFR-INF-05-1 | Downloads stream to disk, not memory (CSD BPR-04, MEM-05) |
| NFR-INF-05-2 | App data directory follows platform conventions (TSS §10.3) |
| NFR-INF-05-3 | File paths are canonicalized (CSD VAL-04) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §4.3 (data flow), §7.2 (download_asset command) |
| TSS | §10.3 (database path), §12 (Tauri plugins) |
| CSD | §13.2 (BPR-04, BPR-07), §12.2 (VAL-04) |

---

#### FR-INF-06: OS Keychain Integration

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 1 |
| **Dependencies** | FR-INF-01 |

**Description:**
Integration with the OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service) via the `keyring` crate to store and retrieve the Meshy API key. Linux fallback to file with 0600 permissions if no secret service is available.

**User Story:**
As a user, I want my API key stored securely in my operating system's keychain, so that it persists across app restarts without being written to disk in plaintext.

**Acceptance Criteria:**

```
GIVEN the user enters an API key
WHEN `set_api_key` is called
THEN the key is stored in the OS keychain under service "com.meshyforge.app"

GIVEN the app is launched
WHEN `get_api_key` is called
THEN the stored key is retrieved from the keychain (or None if not set)

GIVEN the API key is stored
WHEN the database and log files are inspected
THEN the API key does not appear in any file

GIVEN Linux with no secret service daemon
WHEN `set_api_key` is called
THEN the key is stored in a file with 0600 permissions (fallback)
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-INF-06-F1 | `store_key(key)` stores in OS keychain via `keyring::Entry` (TSS §11.3) |
| FR-INF-06-F2 | `get_key()` returns `Option<String>` from keychain |
| FR-INF-06-F3 | `delete_key()` removes the key from keychain |
| FR-INF-06-F4 | Linux fallback: file at `{app_data}/.api_key` with `0600` permissions (TSS §11.5) |
| FR-INF-06-F5 | API key is never written to SQLite, config files, or log output (CSD SEC-01, SEC-04) |

**Non-Functional Requirements:**

| ID | Requirement |
|---|---|
| NFR-INF-06-1 | Key retrieval completes in ≤ 100ms |
| NFR-INF-06-2 | Key is never transmitted to the frontend in plaintext (CSD SEC-02, CTR-03) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §11 (security), §7.2 (keychain commands) |
| TSS | §11 (keyring crate, platform support, Linux fallback) |
| CSD | §12.1 (SEC-01–SEC-05) |

---

#### FR-INF-07: Tauri Command Registration

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 1 |
| **Dependencies** | FR-INF-03, FR-INF-04, FR-INF-05, FR-INF-06 |

**Description:**
All Tauri commands registered in `main.rs` via `tauri::generate_handler![...]`, with the `AppState` struct managing the `MeshyClient` and `Database` instances.

**User Story:**
As a developer, I want all backend commands registered in one place, so that the frontend can call any command via `invoke()`.

**Acceptance Criteria:**

```
GIVEN the app is running
WHEN the frontend calls `invoke('get_credit_balance')`
THEN the command is found and returns the balance

GIVEN the app is running
WHEN the frontend calls `invoke('create_text_to_3d', { body })`
THEN the command is found, validates input, calls the Meshy API, and returns the task ID
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-INF-07-F1 | `AppState` struct holds `Database` and lazily-constructed `MeshyClient` |
| FR-INF-07-F2 | `MeshyClient` is constructed from the keychain API key on first use |
| FR-INF-07-F3 | All commands from TDD §10 (endpoint coverage matrix) are registered |
| FR-INF-07-F4 | Commands validate inputs before calling the API (CSD IPC-04, VAL-01) |
| FR-INF-07-F5 | Commands return `Result<T, String>` with JSON-encoded errors (CSD IPC-01) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §7.2 (Tauri commands), §10 (endpoint coverage) |
| TSS | §2 (Tauri config), §12 (plugins) |
| CSD | §7 (IPC standards), §14.4 (command registration order) |
| UI/UX | §7.4 (hook→command mapping) |

---

#### FR-INF-08: CI/CD Pipeline

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 0 |
| **Dependencies** | FR-INF-01 |

**Description:**
GitHub Actions workflows for CI (lint, type-check, test, build smoke test on 3 platforms) and release (build installers on tag push).

**User Story:**
As a developer, I want CI to run on every push and PR, so that broken code never reaches `main`.

**Acceptance Criteria:**

```
GIVEN a push to any branch
WHEN CI runs
THEN Biome lint, TypeScript type-check, Vitest, Clippy, rustfmt, cargo test, and Tauri build all run

GIVEN all CI checks pass
WHEN a tag `v1.0.0` is pushed
THEN release workflow builds installers for macOS (arm64 + x86_64), Windows (x64), and Linux (x64)
AND a GitHub Release is created with the installers attached
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-INF-08-F1 | `ci.yml` runs on push and PR with jobs: frontend-checks, frontend-tests, rust-checks, build-smoke |
| FR-INF-08-F2 | `release.yml` runs on tag `v*` with matrix build for 4 targets |
| FR-INF-08-F3 | `audit.yml` runs weekly with `npm audit` and `cargo audit` |
| FR-INF-08-F4 | CI uses `Swatinem/rust-cache@v2` for Rust build caching |
| FR-INF-08-F5 | Release uses `softprops/action-gh-release@v2` for GitHub Release creation |

**Source Alignment:**

| Document | Section |
|---|---|
| TSS | §16 (CI/CD tooling, full workflow YAML) |
| UI/UX | §13.1 (automated quality gates) |
| CSD | §14 (git standards), §18 (enforcement) |

---

### 5.2 Authentication Features (Phase 2)

---

#### FR-KEY-01: API Key Entry and Validation

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 2 |
| **Dependencies** | FR-INF-06, FR-INF-07, FR-INF-02 |

**Description:**
A settings panel where the user enters their Meshy API key, validates it by checking the credit balance, and sees success or failure feedback.

**User Story:**
As a user, I want to enter my Meshy API key and verify it works, so that I can start generating 3D assets.

**Acceptance Criteria:**

```
GIVEN the app is launched for the first time
WHEN the user navigates to Settings
THEN an API key input field is displayed with a "Validate" button

GIVEN the user enters an API key
WHEN the user clicks "Validate"
THEN a request is sent to the Meshy API to check the credit balance
AND if successful, a success toast displays the current credit balance
AND the key is stored in the OS keychain

GIVEN the user enters an invalid API key
WHEN the user clicks "Validate"
THEN an error toast displays "API key invalid or expired"
AND the key is not stored

GIVEN a valid API key is stored
WHEN the user returns to Settings
THEN the input field shows a masked placeholder (e.g., "msy_••••••••")
AND a "Delete Key" button is available
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-KEY-01-F1 | API key input field with `type="password"` and label "Meshy API Key" |
| FR-KEY-01-F2 | "Validate" button calls `validate_api_key` Tauri command |
| FR-KEY-01-F3 | On validation success, `set_api_key` is called to store the key in keychain |
| FR-KEY-01-F4 | On validation success, credit balance is displayed |
| FR-KEY-01-F5 | On validation failure, error toast with code `API_ERROR_401` is shown |
| FR-KEY-01-F6 | If a key is already stored, the input shows a masked placeholder and a "Delete Key" button |
| FR-KEY-01-F7 | "Delete Key" calls `delete_key` and clears the stored key |
| FR-KEY-01-F8 | Input field has `aria-label="Meshy API key"` (UI/UX SEM-02) |
| FR-KEY-01-F9 | Validate button is disabled while validation is in progress (shows spinner) |

**Non-Functional Requirements:**

| ID | Requirement |
|---|---|
| NFR-KEY-01-1 | Validation request completes in ≤ 5 seconds |
| NFR-KEY-01-2 | API key is never displayed in plaintext after entry (CSD SEC-02) |
| NFR-KEY-01-3 | Input field has visible focus ring (UI/UX KBD-03) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §7.2 (set_api_key, validate_api_key, get_api_key commands) |
| UI/UX | §9.1 (loading states), §9.3 (error states) |
| CSD | §10.3 (error handling pattern, error code catalog) |

---

#### FR-KEY-02: API Key Persistence

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 2 |
| **Dependencies** | FR-KEY-01 |

**Description:**
The API key persists across app restarts by being stored in the OS keychain. On app launch, the key is read from the keychain and the `MeshyClient` is initialized.

**User Story:**
As a user, I want to enter my API key once and have it remembered, so that I don't need to re-enter it every time I launch the app.

**Acceptance Criteria:**

```
GIVEN a valid API key has been stored
WHEN the app is closed and reopened
THEN the MeshyClient is initialized with the stored key
AND the credit balance is displayed in the TopBar
AND no API key prompt is shown

GIVEN no API key is stored
WHEN the app is launched
THEN the gallery and generate panels show an empty state with "No API key configured"
AND a button links to Settings
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-KEY-02-F1 | On app startup, `get_api_key` is called; if present, `MeshyClient` is constructed |
| FR-KEY-02-F2 | Zustand `appStore` tracks `hasApiKey: boolean` (not the key itself) |
| FR-KEY-02-F3 | If no key is present, generation panels show empty state per UI/UX §9.2 |
| FR-KEY-02-F4 | If no key is present, the TopBar shows "No API Key" instead of credit balance |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §7.2 (AppState, MeshyClient lazy init), §11 (security) |
| TSS | §11 (keyring), §6.3 (Zustand stores) |
| CSD | §8.1 (STT-02: hasApiKey boolean, not raw key), §12.1 (SEC-02) |

---

#### FR-KEY-03: Credit Balance Display

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 2 |
| **Dependencies** | FR-KEY-02 |

**Description:**
The user's current Meshy credit balance is displayed in the TopBar, updated on task creation and on a 60-second interval.

**User Story:**
As a user, I want to see my current credit balance at all times, so that I know how many generations I can perform.

**Acceptance Criteria:**

```
GIVEN a valid API key is set
WHEN the app loads
THEN the TopBar displays the current credit balance as a number

GIVEN the credit balance is displayed
WHEN a task is created (consuming credits)
THEN the balance is refreshed within 5 seconds

GIVEN the app is in focus
WHEN 60 seconds pass
THEN the balance is automatically refreshed

GIVEN the app loses and regains focus
WHEN the window is focused again
THEN the balance is refreshed
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-KEY-03-F1 | `useCreditBalance` hook queries `get_credit_balance` Tauri command |
| FR-KEY-03-F2 | Query refetches every 60 seconds (UI/UX DAT-04) |
| FR-KEY-03-F3 | Query refetches on window focus (TanStack Query `refetchOnWindowFocus`) |
| FR-KEY-03-F4 | Query is invalidated after every task creation mutation |
| FR-KEY-03-F5 | Balance is displayed as formatted integer: `formatCredits(balance)` |
| FR-KEY-03-F6 | Balance display has `aria-live="polite"` (UI/UX SEM-12) |
| FR-KEY-03-F7 | If balance is 0, display shows "0 credits" in `text-warning` color |
| FR-KEY-03-F8 | If balance query fails, display shows "—" with tooltip "Unable to fetch balance" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §7.2 (get_credit_balance command) |
| TSS | §6.5 (TanStack Query configuration) |
| UI/UX | §6.2 (DAT-04), §5.3 (SEM-12) |
| CSD | §8.3 (TanStack Query hook pattern) |

---

#### FR-KEY-04: Credit Balance Auto-Refresh

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 2 |
| **Dependencies** | FR-KEY-03 |

**Description:**
The credit balance automatically refreshes after task creation, on window focus, and on a 60-second timer. This is a sub-feature of FR-KEY-03, explicitly defining the refresh triggers.

**Acceptance Criteria:**

```
GIVEN a task creation mutation succeeds
WHEN the mutation's onSuccess callback fires
THEN the ['credit-balance'] query is invalidated
AND the balance updates within 5 seconds

GIVEN the app window loses focus
WHEN the user returns to the app
THEN the balance refetches immediately
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-KEY-04-F1 | Every task creation mutation calls `qc.invalidateQueries({ queryKey: ['credit-balance'] })` in `onSuccess` |
| FR-KEY-04-F2 | TanStack Query `refetchOnWindowFocus: true` is set globally |
| FR-KEY-04-F3 | TanStack Query `refetchInterval: 60000` is set on the balance query |

**Source Alignment:**

| Document | Section |
|---|---|
| CSD | §8.3 (mutation hook pattern with cache invalidation) |
| UI/UX | §6.2 (DAT-04) |

---

### 5.3 Application Shell Features (Phase 2)

---

#### FR-SET-01: Application Shell Layout

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 2 |
| **Dependencies** | FR-INF-01, FR-INF-02 |

**Description:**
The root application layout with TopBar, Sidebar, main content area, and StatusBar as defined in UI/UX §3.1.

**User Story:**
As a user, I want a clean, organized interface with navigation, a content area, and a status bar, so that I can navigate between features and see app status at a glance.

**Acceptance Criteria:**

```
GIVEN the app is launched
WHEN the window renders
THEN the TopBar (h-14) is visible at the top with credit balance and settings gear
AND the Sidebar (w-56) is visible on the left with navigation items
AND the main content area fills the remaining space
AND the StatusBar (h-8) is visible at the bottom

GIVEN the window is resized to 1024px wide
WHEN the layout adjusts
THEN the sidebar collapses to w-14 (icon-only)
AND the main content area remains functional
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-SET-01-F1 | Root layout: `h-screen w-screen overflow-hidden flex flex-col` (UI/UX LAY-01) |
| FR-SET-01-F2 | TopBar: `h-14 shrink-0` (UI/UX LAY-02) |
| FR-SET-01-F3 | Sidebar: `shrink-0`, `w-56` expanded, `w-14` collapsed (UI/UX LAY-04) |
| FR-SET-01-F4 | Main content: `flex-1 min-h-0 overflow-hidden` (UI/UX LAY-02, LAY-03) |
| FR-SET-01-F5 | StatusBar: `h-8 shrink-0` (UI/UX LAY-02) |
| FR-SET-01-F6 | Sidebar auto-collapses below 1280px window width (UI/UX RES-01) |
| FR-SET-01-F7 | All scrollable areas use shadcn/ui `ScrollArea` (UI/UX LAY-06) |
| FR-SET-01-F8 | Z-index scale per UI/UX §3.3 is enforced |

**Source Alignment:**

| Document | Section |
|---|---|
| UI/UX | §3 (layout architecture), §11 (responsive rules) |
| TSS | §5 (Tailwind, shadcn/ui) |
| CSD | §9 (styling standards) |

---

#### FR-SET-02: Sidebar Navigation

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 2 |
| **Dependencies** | FR-SET-01 |

**Description:**
A sidebar with four navigation items (Generate, Gallery, Tasks, Settings) that switch the main content area. Sidebar can be collapsed to icon-only.

**User Story:**
As a user, I want to navigate between Generate, Gallery, Tasks, and Settings from a sidebar, so that I can switch between workflows.

**Acceptance Criteria:**

```
GIVEN the sidebar is expanded
WHEN the user clicks "Gallery"
THEN the main content area shows the Gallery view
AND the "Gallery" nav item is highlighted with accent color

GIVEN the sidebar is expanded
WHEN the user clicks the collapse toggle
THEN the sidebar shrinks to w-14 showing only icons

GIVEN the sidebar is collapsed
WHEN the user hovers over an icon
THEN a tooltip shows the full label

GIVEN the sidebar is visible
WHEN the user presses Tab
THEN focus moves to the first navigation item
AND each item is focusable and has a visible focus ring
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-SET-02-F1 | Four nav items: Generate (Sparkles icon), Gallery (Images icon), Tasks (Zap icon), Settings (Settings icon) |
| FR-SET-02-F2 | Active item is highlighted with `bg-accent/10 text-accent` |
| FR-SET-02-F3 | Clicking a nav item calls `useAppStore.getState().setActiveView(view)` |
| FR-SET-02-F4 | Collapse toggle button at the bottom of the sidebar |
| FR-SET-02-F5 | Collapsed sidebar shows icons only with tooltips on hover |
| FR-SET-02-F6 | Sidebar has `role="navigation"` and `aria-label="Main navigation"` (UI/UX SEM-05) |
| FR-SET-02-F7 | Each nav item is a `<button>` with `aria-label` matching the label text |
| FR-SET-02-F8 | Active state is conveyed via both color and icon (UI/UX CLR-04) |

**Source Alignment:**

| Document | Section |
|---|---|
| UI/UX | §3 (layout), §8.1 (button patterns), §5.2 (KBD-01, KBD-03) |
| TSS | §13 (Lucide icons) |
| CSD | §5.1 (RCT-01–RCT-03), §8.1 (STT-01: Zustand for navigation) |

---

#### FR-SET-03: User Preferences Panel

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 2 |
| **Dependencies** | FR-SET-01 |

**Description:**
A settings panel where the user configures default generation parameters, polling interval, SSE streaming toggle, auto-download, and notifications.

**User Story:**
As a user, I want to configure default settings for my generations, so that I don't need to set the same parameters every time.

**Acceptance Criteria:**

```
GIVEN the user is on the Settings page
WHEN they view the Preferences panel
THEN they see controls for: default AI model, default texture resolution, default remesh toggle, default polycount, default target formats, default PBR toggle, default remove lighting toggle, default pose mode, poll interval, SSE streaming toggle, auto-download toggle, notification toggle

GIVEN the user changes a preference
WHEN the change is saved
THEN the value is persisted to localStorage via Zustand persist middleware
AND the new value is used as the default in generation forms

GIVEN the user clicks "Reset to Defaults"
WHEN the action completes
THEN all preferences return to their default values from TDD §16.1
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-SET-03-F1 | All 16 settings from TDD §16.1 are editable |
| FR-SET-03-F2 | Settings are stored in Zustand `settingsStore` with `persist` middleware |
| FR-SET-03-F3 | "Reset to Defaults" button calls `useSettingsStore.getState().resetToDefaults()` |
| FR-SET-03-F4 | Poll interval slider has min 1000ms, max 60000ms, step 1000ms |
| FR-SET-03-F5 | Every control has a `<Label>` (UI/UX FRM-01) |
| FR-SET-03-F6 | Every control has a tooltip explaining its effect (UI/UX Tooltip component) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §16.1 (settings table with 16 keys and defaults) |
| TSS | §6.3 (Zustand store with persist) |
| CSD | §8.2 (Zustand store pattern with typed actions) |
| UI/UX | §8.2 (form patterns) |

---

#### FR-SET-04: About and API Status Panel

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 2 |
| **Dependencies** | FR-SET-01 |

**Description:**
An "About" panel showing the app version, Meshy API status link, and a link to the Meshy documentation.

**User Story:**
As a user, I want to see the app version and a link to the Meshy status page, so that I can check if issues are caused by the API being down.

**Acceptance Criteria:**

```
GIVEN the user is on the Settings page
WHEN they view the About panel
THEN they see: app name, version (1.0.0), Meshy API status link (status.meshy.ai), Meshy docs link (docs.meshy.ai), and a "Refresh API Spec" button
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-SET-04-F1 | Display app name "MeshyForge" and version from `tauri.conf.json` |
| FR-SET-04-F2 | Link to `https://status.meshy.ai` opens in default browser via Tauri shell plugin |
| FR-SET-04-F3 | Link to `https://docs.meshy.ai` opens in default browser |
| FR-SET-04-F4 | "Refresh API Spec" button fetches latest `llms.txt` and compares to bundled spec (TDD §17) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §17 (API deprecation tracking) |
| TSS | §12.4 (shell plugin for opening URLs) |

---

### 5.4 Generation Features (Phase 3)

---

#### FR-GEN-01: Text to 3D Preview Generation

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-KEY-02, FR-TASK-01 |

**Description:**
A form panel where the user enters a text prompt, configures generation parameters, and creates a Text to 3D preview task (mesh only, no texture).

**User Story:**
As a user, I want to describe a 3D object in text and generate a mesh from it, so that I can create 3D assets without a reference image.

**Acceptance Criteria:**

```
GIVEN the user is on the Generate > Text to 3D tab
WHEN they enter a prompt (e.g., "a monster mask") and click "Generate"
THEN a POST request is sent to /v2/text-to-3d with mode: "preview"
AND a task is created and appears in the Task Monitor
AND the credit balance updates

GIVEN the prompt field is empty
WHEN the user views the Generate button
THEN the button is disabled
AND a tooltip says "Enter a prompt to generate"

GIVEN the user enters a prompt longer than 600 characters
WHEN the user views the prompt field
THEN an inline error shows "Prompt must be 600 characters or fewer"

GIVEN the generation form
WHEN the user views the available controls
THEN they see: prompt textarea, AI model selector (meshy-5/6/7/latest), model type (standard/smart-topology/lowpoly), remesh toggle, topology (quad/triangle), polycount slider, decimation mode, pose mode, moderation toggle, target format checkboxes, auto-size toggle, alpha thumbnail toggle
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GEN-01-F1 | Prompt textarea with max 600 characters, auto-resize up to 200px (UI/UX FRM-10) |
| FR-GEN-01-F2 | AI model selector: meshy-5, meshy-6, meshy-7, latest (default from settings) |
| FR-GEN-01-F3 | Model type selector: standard, smart-topology, lowpoly (deprecated) |
| FR-GEN-01-F4 | Remesh toggle (default from settings), shows topology + polycount + decimation mode when enabled |
| FR-GEN-01-F5 | Pose mode selector: none, a-pose, t-pose |
| FR-GEN-01-F6 | Moderation toggle (default: false) |
| FR-GEN-01-F7 | Target format checkboxes: GLB, FBX, OBJ, STL, USDZ, 3MF (default from settings) |
| FR-GEN-01-F8 | Auto-size toggle with origin_at selector (bottom/center) |
| FR-GEN-01-F9 | Alpha thumbnail toggle |
| FR-GEN-01-F10 | "Generate" button calls `useCreateTextTo3D().mutate(body)` |
| FR-GEN-01-F11 | Button shows spinner and "Generating..." text during mutation |
| FR-GEN-01-F12 | On success, task is added to Task Monitor and a toast shows "Task created — {credits} credits deducted" |
| FR-GEN-01-F13 | On error, appropriate toast is shown per CSD §10.3 error handling pattern |
| FR-GEN-01-F14 | All form controls have labels (UI/UX FRM-01) and are keyboard-accessible (UI/UX KBD-01) |
| FR-GEN-01-F15 | Format checkboxes are wrapped in `<fieldset>` with `<legend>` (UI/UX FRM-07) |

**Non-Functional Requirements:**

| ID | Requirement |
|---|---|
| NFR-GEN-01-1 | Form submission is disabled during mutation (prevents double-submit) |
| NFR-GEN-01-2 | Credit cost estimate is displayed next to the Generate button: "Cost: ~20 credits" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v2/text-to-3d), §6.2 (TextTo3DPreviewRequest type) |
| UI/UX | §8.2 (form patterns), §9.4 (success states) |
| CSD | §5.1 (component standards), §8.3 (mutation hook pattern), §10.3 (error handling) |

---

#### FR-GEN-02: Text to 3D Refine (Texturing)

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-GEN-01, FR-TASK-01 |

**Description:**
After a preview task succeeds, the user can create a refine task that applies texture to the mesh. The refine form accepts the preview task ID and texturing options.

**User Story:**
As a user, I want to add textures to my generated mesh, so that the 3D model has color and material properties.

**Acceptance Criteria:**

```
GIVEN a preview task has succeeded
WHEN the user clicks "Refine" on the task card or asset detail
THEN a refine form is displayed with: preview task ID (pre-filled), enable PBR toggle, texture resolution selector (2k/4k/8k), texture prompt (optional), texture image URL (optional), AI model selector, remove lighting toggle, target formats, auto-size, alpha thumbnail

GIVEN the refine form is displayed
WHEN the user clicks "Generate Texture"
THEN a POST request is sent to /v2/text-to-3d with mode: "refine" and the preview_task_id
AND a new task is created and appears in the Task Monitor

GIVEN the preview task has not succeeded
WHEN the user attempts to refine
THEN the refine button is disabled with tooltip "Wait for preview to complete first"
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GEN-02-F1 | Refine form accepts `preview_task_id` from the succeeded preview task |
| FR-GEN-02-F2 | Enable PBR toggle (default from settings) |
| FR-GEN-02-F3 | Texture resolution selector: 2k, 4k, 8k (default from settings) |
| FR-GEN-02-F4 | Texture prompt textarea (optional, max 600 chars) |
| FR-GEN-02-F5 | Texture image URL input (optional) |
| FR-GEN-02-F6 | AI model selector (default from settings) |
| FR-GEN-02-F7 | Remove lighting toggle (default from settings) |
| FR-GEN-02-F8 | Target format checkboxes (default from settings) |
| FR-GEN-02-F9 | Auto-size toggle with origin_at selector |
| FR-GEN-02-F10 | Alpha thumbnail toggle |
| FR-GEN-02-F11 | Refine button is disabled if preview task status is not SUCCEEDED |
| FR-GEN-02-F12 | Credit cost estimate: "Cost: ~10 credits (2k/4k) or ~15 credits (8k)" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v2/text-to-3d with mode: "refine"), §6.2 (TextTo3DRefineRequest) |
| UI/UX | §8.2 (form patterns) |

---

#### FR-GEN-03: Image to 3D Generation

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-KEY-02, FR-GEN-05, FR-GEN-06, FR-TASK-01 |

**Description:**
A form panel where the user uploads an image, configures generation parameters, and creates an Image to 3D task.

**User Story:**
As a user, I want to upload a photo or concept art and generate a 3D model from it, so that I can create 3D assets that match a visual reference.

**Acceptance Criteria:**

```
GIVEN the user is on the Generate > Image to 3D tab
WHEN they drag an image onto the dropzone or click "Upload" and select a file
THEN the image is loaded and displayed as a preview

GIVEN an image is loaded
WHEN the user clicks "Generate"
THEN the image is converted to a data URI and sent to /v1/image-to-3d
AND a task is created and appears in the Task Monitor

GIVEN the image is loaded
WHEN the user views the available controls
THEN they see: model type (standard/smart-topology/lowpoly), AI model selector, ultra mode toggle (meshy-7 only), should texture toggle, enable PBR toggle, texture resolution, texture prompt, texture image URL, remesh toggle, topology, polycount, pose mode, image enhancement toggle, remove lighting toggle, moderation toggle, target formats, auto-size, alpha thumbnail, multi-view thumbnails toggle
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GEN-03-F1 | Image dropzone accepts .jpg, .jpeg, .png, .webp (UI/UX DND-02) |
| FR-GEN-03-F2 | "Upload" button opens OS file dialog (FR-GEN-06) |
| FR-GEN-03-F3 | Image is converted to data URI via `read_file_as_data_uri` Tauri command |
| FR-GEN-03-F4 | All generation parameters from TDD §6.2 ImageTo3DRequest are available |
| FR-GEN-03-F5 | Ultra mode toggle is only visible when AI model is meshy-7 or latest |
| FR-GEN-03-F6 | Smart topology model type shows meshy-t1/meshy-t2 selector and polycount range 100–15,000 |
| FR-GEN-03-F7 | Credit cost estimate: "Cost: ~20-35 credits depending on options" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v1/image-to-3d), §6.2 (ImageTo3DRequest) |
| UI/UX | §8.5 (drag and drop), §8.2 (form patterns) |

---

#### FR-GEN-04: Multi-Image to 3D Generation

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-GEN-03 |

**Description:**
A form panel where the user uploads 1–4 images of the same object from different angles, and generates a more complete 3D model.

**User Story:**
As a user, I want to upload multiple photos of an object from different angles, so that the generated 3D model has accurate back and side details.

**Acceptance Criteria:**

```
GIVEN the user is on the Generate > Multi-Image tab
WHEN they upload 1-4 images
THEN each image is displayed as a thumbnail in a grid
AND a "Generate" button is enabled

GIVEN 4 images are uploaded
WHEN the user attempts to add a 5th
THEN the upload is rejected with a toast "Maximum 4 images allowed"

GIVEN 1-4 images are uploaded
WHEN the user clicks "Generate"
THEN a POST request is sent to /v1/multi-image-to-3d with the image URLs
AND a task is created and appears in the Task Monitor
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GEN-04-F1 | Upload accepts 1–4 images via drag-and-drop or file dialog |
| FR-GEN-04-F2 | Each image is displayed as a thumbnail with a "Remove" button |
| FR-GEN-04-F3 | Maximum 4 images enforced; 5th upload shows toast |
| FR-GEN-04-F4 | First image is labeled "Primary (front view)" |
| FR-GEN-04-F5 | All parameters from TDD §6.2 MultiImageTo3DRequest are available |
| FR-GEN-04-F6 | Credit cost estimate displayed |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v1/multi-image-to-3d), §6.2 (MultiImageTo3DRequest) |

---

#### FR-GEN-05: Image Upload via Drag-and-Drop

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-INF-02 |

**Description:**
A drag-and-drop zone in image-based generation panels that accepts image files and converts them to data URIs.

**Acceptance Criteria:**

```
GIVEN the user drags an image file over the dropzone
WHEN the file is hovering
THEN the dropzone shows a highlighted border (border-accent bg-accent/10)

GIVEN the user drops an image file
WHEN the file is processed
THEN the image is converted to a data URI and displayed as a preview

GIVEN the user drags a non-image file
WHEN the file is hovering
THEN the cursor shows "not-allowed"
AND a toast says "Only image files are supported"

GIVEN the dropzone is focused via keyboard
WHEN the user presses Enter
THEN the OS file dialog opens
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GEN-05-F1 | Dropzone accepts .jpg, .jpeg, .png, .webp (UI/UX DND-02) |
| FR-GEN-05-F2 | Visual highlight on dragover: `border-accent bg-accent/10` (UI/UX DND-01) |
| FR-GEN-05-F3 | Non-image files show "not-allowed" cursor and toast (UI/UX DND-02) |
| FR-GEN-05-F4 | Dropzone has `role="button"` and `tabIndex={0}` for keyboard access (UI/UX FRM-09) |
| FR-GEN-05-F5 | Enter key on focused dropzone opens file dialog (UI/UX FRM-09) |
| FR-GEN-05-F6 | "Upload" button is always present as keyboard-accessible alternative (UI/UX DND-03) |

**Source Alignment:**

| Document | Section |
|---|---|
| UI/UX | §8.5 (DND-01–DND-04) |
| CSD | §5.1 (RCT-09: components use hooks, not direct invoke) |

---

#### FR-GEN-06: Image Upload via File Dialog

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-INF-02 |

**Description:**
An "Upload" button that opens the OS-native file dialog for selecting image files.

**Acceptance Criteria:**

```
GIVEN the user clicks "Upload"
WHEN the OS file dialog opens
THEN only image files (.jpg, .jpeg, .png, .webp) are filterable

GIVEN the user selects an image file
WHEN the file is confirmed
THEN the image is converted to a data URI and displayed as a preview
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GEN-06-F1 | Uses Tauri dialog plugin `open()` with image file filter (TSS §12.2) |
| FR-GEN-06-F2 | Selected file path is passed to `read_file_as_data_uri` Tauri command |
| FR-GEN-06-F3 | Button has `aria-label="Upload image"` (UI/UX SEM-03) |

**Source Alignment:**

| Document | Section |
|---|---|
| TSS | §12.2 (dialog plugin) |
| UI/UX | §8.5 (DND-03: upload button always present) |

---

#### FR-GEN-07: Generation Form Controls

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-SET-03 |

**Description:**
Shared form control components used across all generation panels: model selector, polycount slider, format checkboxes, pose selector, PBR toggle, etc. These controls default to the user's saved preferences.

**User Story:**
As a user, I want consistent form controls across all generation panels, so that I learn the interface once and can use it everywhere.

**Acceptance Criteria:**

```
GIVEN the user has set default AI model to "meshy-7" in preferences
WHEN they open any generation panel
THEN the AI model selector defaults to "meshy-7"

GIVEN the user has set default target formats to ["glb", "fbx"] in preferences
WHEN they open any generation panel
THEN the GLB and FBX checkboxes are pre-checked

GIVEN a polycount slider is displayed
WHEN the user drags the slider
THEN the current value is displayed as text next to the slider
AND the slider has aria-valuenow, aria-valuemin, aria-valuemax (UI/UX FRM-06)
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GEN-07-F1 | `ModelSelector` component: dropdown with meshy-5, meshy-6, meshy-7, latest |
| FR-GEN-07-F2 | `PromptEditor` component: auto-resizing textarea with character counter |
| FR-GEN-07-F3 | Polycount slider: range 100–300,000, displays current value |
| FR-GEN-07-F4 | Format checkbox group: GLB, FBX, OBJ, STL, USDZ, 3MF in a `<fieldset>` (UI/UX FRM-07) |
| FR-GEN-07-F5 | All controls default to values from `useSettingsStore` |
| FR-GEN-07-F6 | Every control has a `<Label>` (UI/UX FRM-01) |
| FR-GEN-07-F7 | Every control has a tooltip with help text (UI/UX Tooltip component) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §16.1 (default settings) |
| UI/UX | §8.2 (form patterns FRM-01–FRM-10) |
| CSD | §5.1 (component standards) |

---

### 5.5 Post-Processing Features (Phase 3)

---

#### FR-POST-01: Remesh

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-GAL-10 |

**Description:**
A post-processing panel where the user selects an existing asset and creates a remesh task to change topology, polycount, or format.

**Acceptance Criteria:**

```
GIVEN the user is on the Post-Process tab
WHEN they select an asset from the gallery or enter a task ID
THEN the remesh form is enabled with: target formats, topology (quad/triangle), target polycount, decimation mode, alpha thumbnail

GIVEN the remesh form is filled
WHEN the user clicks "Remesh"
THEN a POST request is sent to /v1/remesh
AND a task is created and appears in the Task Monitor
AND the new task's parent_task_id links to the source asset
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-POST-01-F1 | Asset selector: dropdown of all assets or manual task ID input |
| FR-POST-01-F2 | Target formats: GLB, FBX, OBJ, USDZ, BLEND, STL, 3MF |
| FR-POST-01-F3 | Topology: quad or triangle (default: triangle) |
| FR-POST-01-F4 | Target polycount: 100–300,000 (default: 30,000) |
| FR-POST-01-F5 | Decimation mode: 1 (ultra), 2 (high), 3 (medium), 4 (low) |
| FR-POST-01-F6 | Alpha thumbnail toggle |
| FR-POST-01-F7 | Credit cost estimate: "Cost: 5 credits" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v1/remesh), §6.2 (RemeshRequest) |

---

#### FR-POST-02: Retexture

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-GAL-10 |

**Description:**
A post-processing panel where the user applies a new texture to an existing model using a text prompt, an image, or multi-view images.

**Acceptance Criteria:**

```
GIVEN the user selects an asset and opens the Retexture form
WHEN they enter a text style prompt (e.g., "weathered bronze with green patina")
THEN the prompt is accepted

GIVEN the user provides an image style URL instead of text
WHEN they click "Retexture"
THEN the image is used as the style reference

GIVEN the retexture form
WHEN the user views the available controls
THEN they see: text style prompt, image style URL, multi-view image URLs (meshy-7 only), AI model selector, enable original UV toggle, enable PBR toggle, texture resolution, remove lighting toggle, target formats, alpha thumbnail
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-POST-02-F1 | Exactly one style input required: text_style_prompt, image_style_url, or multiview_image_urls |
| FR-POST-02-F2 | Multi-view image URLs only available when ai_model is meshy-7 or latest |
| FR-POST-02-F3 | Enable original UV toggle (default: false) |
| FR-POST-02-F4 | Enable PBR toggle (default from settings) |
| FR-POST-02-F5 | Texture resolution: 2k, 4k, 8k |
| FR-POST-02-F6 | Remove lighting toggle (default from settings) |
| FR-POST-02-F7 | Target format checkboxes |
| FR-POST-02-F8 | Alpha thumbnail toggle |
| FR-POST-02-F9 | Credit cost estimate: "Cost: 10 credits (2k/4k) or 15 credits (8k)" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v1/retexture), §6.2 (RetextureRequest) |

---

#### FR-POST-03: Convert Format

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-GAL-10 |

**Description:**
A post-processing panel where the user converts an existing model to different file formats.

**Acceptance Criteria:**

```
GIVEN the user selects an asset and opens the Convert form
WHEN they select target formats (e.g., FBX and STL)
THEN the convert button is enabled

GIVEN the user clicks "Convert"
THEN a POST request is sent to /v1/convert
AND a task is created
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-POST-03-F1 | Input: existing task ID or model URL |
| FR-POST-03-F2 | Target formats: GLB, FBX, OBJ, USDZ, BLEND, STL, 3MF (at least one required) |
| FR-POST-03-F3 | Credit cost estimate: "Cost: 1 credit" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v1/convert), §6.2 (ConvertRequest) |

---

#### FR-POST-04: Resize Model

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-GAL-10 |

**Description:**
A post-processing panel where the user resizes a 3D model to specific physical dimensions.

**Acceptance Criteria:**

```
GIVEN the user selects an asset and opens the Resize form
WHEN they enter a resize height (e.g., 1.8 meters)
THEN the resize button is enabled

GIVEN the user selects auto-size mode
WHEN they click "Resize"
THEN the API uses AI vision to estimate real-world height
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-POST-04-F1 | Input: existing task ID or model URL |
| FR-POST-04-F2 | Exactly one resize mode required: resize_height, resize_longest_side, or auto_size |
| FR-POST-04-F3 | Origin at selector: bottom or center (default: bottom) |
| FR-POST-04-F4 | Credit cost estimate: "Cost: 1 credit" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v1/resize), §6.2 (ResizeRequest) |

---

#### FR-POST-05: UV Unwrap

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-GAL-10 |

**Description:**
A post-processing panel where the user generates a clean UV layout for an existing model.

**Acceptance Criteria:**

```
GIVEN the user selects an asset and opens the UV Unwrap form
WHEN they click "Unwrap UV"
THEN a POST request is sent to /v1/uv-unwrap
AND a task is created
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-POST-05-F1 | Input: existing task ID (with GLB output) or model URL (.glb only) |
| FR-POST-05-F2 | Warning displayed: "UV Unwrap supportsmeshes up to 40,000 faces. Run Remesh first if larger." |
| FR-POST-05-F3 | Input: existing task ID (with GLB output) or model URL (.glb only) |
| FR-POST-05-F4 | Credit cost estimate: "Cost: 5 credits" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v1/uv-unwrap), §6.2 (no specific type — uses input_task_id or model_url) |

---

#### FR-POST-06: Auto-Rigging

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-GAL-10 |

**Description:**
A post-processing panel where the user adds a skeleton to a humanoid 3D model, preparing it for animation.

**Acceptance Criteria:**

```
GIVEN the user selects a humanoid asset and opens the Rigging form
WHEN they enter a height in meters (default: 1.7) and click "Rig"
THEN a POST request is sent to /v1/rigging
AND a task is created

GIVEN the selected asset has more than 300,000 faces
WHEN the user views the Rig button
THEN it is disabled with tooltip "Model exceeds 300,000 face limit. Run Remesh first."

GIVEN the rigging task succeeds
WHEN the user views the task result
THEN it contains: rigged character GLB URL, rigged character FBX URL, basic walking animation GLB/FBX URLs, basic running animation GLB/FBX URLs
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-POST-06-F1 | Input: existing task ID or model URL (.glb format) |
| FR-POST-06-F2 | Height meters input (default: 1.7, must be positive) |
| FR-POST-06-F3 | Optional texture image URL input |
| FR-POST-06-F4 | Warning displayed for non-humanoid models: "Auto-rigging works best with standard humanoid characters" |
| FR-POST-06-F5 | 300,000 face limit warning if input exceeds |
| FR-POST-06-F6 | Credit cost estimate: "Cost: 5 credits" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v1/rigging), §6.2 (RiggingRequest) |

---

#### FR-POST-07: Animation Preset Application

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-POST-06, FR-INF-04 |

**Description:**
A post-processing panel where the user browses the animation library, selects a preset, and applies it to a previously rigged character.

**Acceptance Criteria:**

```
GIVEN the user has a succeeded rigging task
WHEN they open the Animation panel
THEN they see a searchable list of animation presets (500+)

GIVEN the animation library is loaded
WHEN the user searches for "walk"
THEN the list filters to show walking-related animations

GIVEN the user selects an animation (e.g., action_id: 92)
WHEN they click "Apply Animation"
THEN a POST request is sent to /v1/animations with the rig_task_id and action_id
AND a task is created

GIVEN the animation form is displayed
WHEN the user views the post-processing options
THEN they see: change FPS (24/25/30/60), FBX to USDZ conversion, extract armature
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-POST-07-F1 | Animation library is fetched from `https://api.meshy.ai/web/public/animations/resources` |
| FR-POST-07-F2 | Library is cached with `staleTime: Infinity` (UI/UX DAT-06) |
| FR-POST-07-F3 | Searchable list with action_id, name, and category |
| FR-POST-07-F4 | Rig task ID input (required) — can be auto-filled from a succeeded rigging task |
| FR-POST-07-F5 | Action ID input (required) — selected from the library |
| FR-POST-07-F6 | Optional post-process: change_fps (24/25/30/60), fbx2usdz, extract_armature |
| FR-POST-07-F7 | Credit cost estimate: "Cost: 3 credits" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v1/animations), §6.2 (AnimationRequest) |
| UI/UX | §6.2 (DAT-06: animation library cached indefinitely) |

---

### 5.6 Image Generation Features (Phase 3)

---

#### FR-IMG-01: Text to Image Generation

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-KEY-02, FR-TASK-01 |

**Description:**
A form panel where the user generates 2D images from text prompts using Meshy's image generation models.

**Acceptance Criteria:**

```
GIVEN the user is on the Generate > Image Gen tab
WHEN they enter a prompt, select an AI model (nano-banana, nano-banana-2, nano-banana-pro, gpt-image-2), and click "Generate"
THEN a POST request is sent to /v1/text-to-image
AND a task is created

GIVEN the user enables multi-view generation
WHEN the task succeeds
THEN 3 image URLs are returned (different viewing angles)

GIVEN the user selects aspect ratio
WHEN the selected model is gpt-image-2
THEN only 1:1, 3:2, 2:3 are available
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-IMG-01-F1 | AI model selector: nano-banana (3 credits), nano-banana-2 (6 credits), nano-banana-pro (9 credits), gpt-image-2 (9 credits) |
| FR-IMG-01-F2 | Prompt textarea (required) |
| FR-IMG-01-F3 | Generate multi-view toggle (default: false) |
| FR-IMG-01-F4 | Pose mode selector: a-pose, t-pose (optional) |
| FR-IMG-01-F5 | Aspect ratio selector: 1:1, 16:9, 9:16, 4:3, 3:4 (nano-banana models); 1:1, 3:2, 2:3 (gpt-image-2) |
| FR-IMG-01-F6 | Aspect ratio disabled when multi-view is enabled |
| FR-IMG-01-F7 | Credit cost estimate displayed based on selected model |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v1/text-to-image), §6.2 (TextToImageRequest) |

---

#### FR-IMG-02: Image to Image Transformation

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-IMG-01, FR-GEN-05, FR-GEN-06 |

**Description:**
A form panel where the user transforms an existing image using a text prompt and a reference image.

**Acceptance Criteria:**

```
GIVEN the user is on the Generate > Image Gen tab
WHEN they switch to the Image to Image sub-tab
THEN they see: AI model selector, prompt textarea, reference image upload (1-5 images), generate multi-view toggle, aspect ratio selector

GIVEN the user uploads 1-5 reference images and enters a prompt
WHEN they click "Generate"
THEN a POST request is sent to /v1/image-to-image
AND a task is created
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-IMG-02-F1 | AI model selector: nano-banana (3 credits), nano-banana-2 (6 credits), nano-banana-pro (9 credits), gpt-image-2 (12 credits) |
| FR-IMG-02-F2 | Prompt textarea (required) |
| FR-IMG-02-F3 | Reference image upload: 1–5 images, .jpg/.jpeg/.png, via drag-and-drop or file dialog |
| FR-IMG-02-F4 | Generate multi-view toggle (default: false) |
| FR-IMG-02-F5 | Aspect ratio selector (same constraints as FR-IMG-01) |
| FR-IMG-02-F6 | Credit cost estimate displayed based on selected model |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v1/image-to-image), §6.2 (ImageToImageRequest) |

---

### 5.7 3D Printing Features (Phase 3)

---

#### FR-PRINT-01: Multi-Color 3D Print Conversion

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-GAL-10 |

**Description:**
A 3D printing panel where the user converts a textured 3D model into a multi-color 3MF file for color 3D printing.

**Acceptance Criteria:**

```
GIVEN the user selects a textured asset and opens the Multi-Color Print form
WHEN they set max_colors (1-16, default: 4) and click "Convert"
THEN a POST request is sent to /v1/print/multi-color
AND a task is created

GIVEN the task succeeds
WHEN the user views the result
THEN a 3MF file URL is returned
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-PRINT-01-F1 | Input: existing task ID or model URL (.glb or .fbx) |
| FR-PRINT-01-F2 | Max colors slider: 1–16 (default: 4) |
| FR-PRINT-01-F3 | Credit cost estimate: "Cost: 10 credits" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v1/print/multi-color) |

---

#### FR-PRINT-02: Analyze Printability

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-GAL-10 |

**Description:**
A 3D printing panel where the user analyzes a 3D model for FDM printability — watertightness, volume, holes, non-manifold edges, degenerate faces.

**Acceptance Criteria:**

```
GIVEN the user selects an asset and opens the Analyze Printability form
WHEN they click "Analyze"
THEN a POST request is sent to /v1/print/analyze
AND a task is created

GIVEN the analysis task succeeds
WHEN the user views the result
THEN a printability report is displayed with: overall status (healthy/warning/error), issue count, watertight boolean, volume, non-manifold edge count, degenerate face count, hole count
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-PRINT-02-F1 | Input: existing task ID or model URL (.glb, .gltf, .obj, .fbx, .stl) |
| FR-PRINT-02-F2 | Result displays: status badge (healthy=success, warning=warning, error=danger), issue count, metrics table |
| FR-PRINT-02-F3 | Credit cost: "Free — no credits consumed" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v1/print/analyze) |

---

#### FR-PRINT-03: Repair Printability

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-PRINT-02 |

**Description:**
A 3D printing panel where the user repairs a 3D model for FDM printability — fixes non-manifold edges, degenerate faces, and holes.

**Acceptance Criteria:**

```
GIVEN the user has analyzed a model and it has issues
WHEN they click "Repair"
THEN a POST request is sent to /v1/print/repair
AND a task is created

GIVEN the repair task succeeds
WHEN the user views the result
THEN a repaired model URL is returned in the same format as the input
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-PRINT-03-F1 | Input: existing task ID or model URL (.glb, .gltf, .obj, .fbx, .stl) |
| FR-PRINT-03-F2 | Output format matches input format |
| FR-PRINT-03-F3 | Warning: "Existing textures are removed during repair. Use Retexture to add them back." |
| FR-PRINT-03-F4 | Credit cost estimate: "Cost: 10 credits" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /v1/print/repair) |

---

### 5.8 Creative Lab Features (Phase 3)

All Creative Lab features follow the same two-stage workflow: **prototype** (generate a concept image) → **build** (convert concept to 3D model). Each feature has the same UI pattern with product-specific options.

---

#### FR-CLAB-01: Creative Lab — Keychain

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-KEY-02, FR-TASK-01, FR-GEN-05, FR-GEN-06 |

**Description:**
A Creative Lab panel where the user turns a photo into a 3D-printable keychain medallion in two stages: prototype (colorized concept image) → build (depth-relief 3D mesh).

**Acceptance Criteria:**

```
GIVEN the user is on the Generate > Creative Lab tab
WHEN they select "Keychain" and upload a photo
THEN the prototype form is displayed

GIVEN the user clicks "Generate Prototype"
WHEN the prototype task succeeds
THEN a colorized concept image is displayed
AND a "Build Keychain" button appears

GIVEN the user clicks "Build Keychain"
WHEN the build form is displayed
THEN they see: badge shape (circle, rounded-rect, hexagon, shield, star), size_mm, relief_height_mm, relief_offset_mm, base_thickness_mm, has_closed_back toggle, relief_curve (linear, gamma, s-curve), curve_param, invert_depth toggle, smoothing, relief_scale, depth_threshold, remove_background toggle, export_resolution, output format (glb, obj, zip)

GIVEN the build task succeeds
WHEN the user views the result
THEN a model URL is returned in the selected format
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-CLAB-01-F1 | Prototype: image_url input (required), name (optional) |
| FR-CLAB-01-F2 | Build: input_task_id from succeeded prototype, options object with 14 configurable fields |
| FR-CLAB-01-F3 | Output format selector: glb (default), obj (zip bundle), zip (all artifacts) |
| FR-CLAB-01-F4 | Prototype credit cost: "Cost: 6 credits" |
| FR-CLAB-01-F5 | Build credit cost: "Cost: 30 credits" |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /openapi/creative-lab/keychain/v1/prototype, POST /openapi/creative-lab/keychain/v1/build) |

---

#### FR-CLAB-02: Creative Lab — Fridge Magnet

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-CLAB-01 |

**Description:**
Same two-stage workflow as keychain, with fridge-magnet-specific defaults (rounded-rect shape, 60mm size, 3.3mm relief height, 2mm base thickness).

**Acceptance Criteria:**

```
GIVEN the user selects "Fridge Magnet" in Creative Lab
WHEN they upload a photo and generate prototype then build
THEN a 3D fridge magnet model is returned
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-CLAB-02-F1 | Same prototype flow as FR-CLAB-01 |
| FR-CLAB-02-F2 | Build options: same 14 fields as keychain with fridge-magnet defaults (badge_shape: rounded-rect, size_mm: 60, relief_height_mm: 3.3, base_thickness_mm: 2.0) |
| FR-CLAB-02-F3 | Prototype credit cost: 6 credits; Build credit cost: 30 credits |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /openapi/creative-lab/fridge-magnet/v1/prototype, /build) |

---

#### FR-CLAB-03: Creative Lab — Figure

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-CLAB-01 |

**Description:**
Two-stage workflow: prototype (chibi-style concept image) → build (textured 3D figure via image-to-3D pipeline).

**Acceptance Criteria:**

```
GIVEN the user selects "Figure" in Creative Lab
WHEN they upload a photo and generate prototype then build
THEN a textured 3D chibi figure is returned with GLB, OBJ, and MTL outputs
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-CLAB-03-F1 | Prototype: image_url input, generates chibi-style concept image |
| FR-CLAB-03-F2 | Build: input_task_id from prototype, no additional options (uses image-to-3D pipeline) |
| FR-CLAB-03-F3 | Output: GLB, OBJ + MTL, thumbnail, base color texture |
| FR-CLAB-03-F4 | Prototype credit cost: 6 credits; Build credit cost: 30 credits |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /openapi/creative-lab/figure/v1/prototype, /build) |

---

#### FR-CLAB-04: Creative Lab — Vinyl Figure

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-CLAB-01 |

**Description:**
Two-stage workflow: prototype (big-head vinyl figure concept image) → build (textured 3D vinyl figure).

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-CLAB-04-F1 | Same flow as FR-CLAB-03 with vinyl-figure styling |
| FR-CLAB-04-F2 | Prototype credit cost: 6 credits; Build credit cost: 30 credits |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /openapi/creative-lab/vinyl-figure/v1/prototype, /build) |

---

#### FR-CLAB-05: Creative Lab — Brick Figure

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-CLAB-01 |

**Description:**
Two-stage workflow: prototype (brick-style minifigure concept image) → build (textured 3D brick figure).

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-CLAB-05-F1 | Same flow as FR-CLAB-03 with brick-figure styling |
| FR-CLAB-05-F2 | Prototype: 403 Forbidden returned if image is flagged for IP violation |
| FR-CLAB-05-F3 | Prototype credit cost: 6 credits; Build credit cost: 30 credits |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /openapi/creative-lab/brick-figure/v1/prototype, /build) |

---

#### FR-CLAB-06: Creative Lab — Lamp

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-CLAB-01 |

**Description:**
Two-stage workflow: prototype (matte-white lampshade concept image from text or photo) → build (hollow STL lampshade with optional fixture base disk).

**Acceptance Criteria:**

```
GIVEN the user selects "Lamp" in Creative Lab
WHEN they enter a text prompt OR upload a photo (not both)
THEN the prototype form accepts the input

GIVEN the user selects image input
WHEN they choose image_subject
THEN they can select "character" or "landscape"

GIVEN the prototype succeeds
WHEN the user opens the build form
THEN they see: diameter_mm, thickness_mm, cut_amount_percent, light_source_preset (bambu_mh001_60mm or none), fixture_offset_x_mm, fixture_offset_z_mm, rotate_x_deg, rotate_y_deg, rotate_z_deg, include_result_json toggle, output format (stl or zip)
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-CLAB-06-F1 | Prototype: exactly one of `text` or `image_url` required (mutually exclusive) |
| FR-CLAB-06-F2 | Image subject selector: character (default) or landscape |
| FR-CLAB-06-F3 | Build: 10 configurable geometry options + output format selector |
| FR-CLAB-06-F4 | Output: STL lampshade + optional STL base disk, or ZIP bundle |
| FR-CLAB-06-F5 | Prototype credit cost: 6 credits; Build credit cost: 30 credits |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /openapi/creative-lab/lamp/v1/prototype, /build) |

---

#### FR-CLAB-07: Creative Lab — Keycap

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-CLAB-01 |

**Description:**
Two-stage workflow: prototype (finished-keycap design render) → build (textured 3D keycap at real-world millimeter scale). Requires paid subscription plan.

**Acceptance Criteria:**

```
GIVEN the user selects "Keycap" in Creative Lab
WHEN they upload a photo and click "Generate Prototype"
THEN a finished-keycap design render is displayed
AND a candidate_id is returned

GIVEN the prototype succeeds
WHEN the user clicks "Build Keycap"
THEN the build form requires: input_task_id and candidate_id (from prototype)
AND displays options: base_model (cherry-mx-1x1-r1), head_size_mm (10-40), vertical_offset_mm (-5 to 5)

GIVEN the build succeeds
WHEN the user views the result
THEN GLB and OBJ ZIP bundle URLs are returned at real-world millimeter scale (Y-up, +Z front)
AND process images (head_design, composite, base_canvas) are available
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-CLAB-07-F1 | Prototype: image_url input, returns image_urls and candidate_ids arrays |
| FR-CLAB-07-F2 | Build: input_task_id + candidate_id (both required), 3 geometry options |
| FR-CLAB-07-F3 | 402 Payment Required if user is on free plan |
| FR-CLAB-07-F4 | Output: GLB + OBJ ZIP at millimeter scale, process images |
| FR-CLAB-07-F5 | Prototype credit cost: 12 credits; Build credit cost: 50 credits |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §10 (POST /openapi/creative-lab/keycap/v1/prototype, /build) |

---

### 5.9 Task Management Features (Phase 3)

---

#### FR-TASK-01: Task Creation and Tracking

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-INF-04, FR-INF-07 |

**Description:**
When a generation or post-processing form is submitted, a task is created on the Meshy API and tracked in the Task Monitor with real-time progress updates.

**User Story:**
As a user, I want to see my active tasks with their progress, so that I know when my 3D models are ready.

**Acceptance Criteria:**

```
GIVEN the user submits a generation form
WHEN the API returns a task ID
THEN a new task card appears in the Task Monitor with status PENDING and 0% progress

GIVEN a task is in the Task Monitor
WHEN the task is polled and status changes to IN_PROGRESS
THEN the progress bar updates and the status badge changes to "In Progress" (warning color)

GIVEN a task is being polled
WHEN the task reaches SUCCEEDED, FAILED, or CANCELED
THEN polling stops for that task
AND the status badge updates to the terminal state color
AND if auto-download is enabled, the asset is downloaded automatically
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-TASK-01-F1 | Every task creation mutation adds the task to Zustand `taskStore` |
| FR-TASK-01-F2 | Task card displays: label (human-readable), status badge, progress bar, endpoint, elapsed time |
| FR-TASK-01-F3 | Task label is constructed from the generation type and prompt/image name |
| FR-TASK-01-F4 | Task card has `aria-live="polite"` on the status text (UI/UX SEM-07) |
| FR-TASK-01-F5 | Progress bar uses shadcn/ui `Progress` component with `aria-valuenow` (UI/UX SEM-08) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §4.2 (task lifecycle), §7.2 (poll_task command) |
| UI/UX | §9.4 (Task Monitor UI), §6.2 (DAT-02: polling stops on terminal) |
| CSD | §8.2 (Zustand taskStore pattern), §8.3 (TanStack Query polling pattern) |

---

#### FR-TASK-02: Task Polling (Status Updates)

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-TASK-01 |

**Description:**
Active tasks are polled at the user-configured interval (default: 5 seconds) until they reach a terminal status. Polling runs in the background even when the window is not focused.

**Acceptance Criteria:**

```
GIVEN a task is in PENDING or IN_PROGRESS status
WHEN the poll interval elapses (default: 5 seconds)
THEN a GET request is sent to the task endpoint
AND the task card updates with the latest progress and status

GIVEN a task reaches SUCCEEDED, FAILED, or CANCELED
WHEN the next poll interval would fire
THEN polling stops (refetchInterval returns false)

GIVEN the app window is not focused
WHEN a task is still in progress
THEN polling continues (refetchIntervalInBackground: true)
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-TASK-02-F1 | `usePollTask(taskId, endpoint)` hook uses TanStack Query with `refetchInterval` |
| FR-TASK-02-F2 | `refetchInterval` is a function that returns `false` for terminal statuses, `pollIntervalMs` otherwise |
| FR-TASK-02-F3 | `refetchIntervalInBackground: true` is set |
| FR-TASK-02-F4 | Poll interval is read from `useSettingsStore((s) => s.pollIntervalMs)` |
| FR-TASK-02-F5 | Only non-terminal tasks are polled (terminal tasks are read from SQLite, not polled) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §4.2 (process flow), §7.2 (poll_task command) |
| UI/UX | §6.2 (DAT-02, DAT-03) |
| CSD | §8.3 (conditional polling pattern) |

---

#### FR-TASK-03: Task SSE Streaming (Opt-In)

| Field | Value |
|---|---|
| **Priority** | Should Have |
| **Phase** | 3 |
| **Dependencies** | FR-TASK-02 |

**Description:**
An alternative to polling: the Rust backend opens an SSE connection to the Meshy API and emits progress events to the frontend via Tauri's event system. This is opt-in via user preference.

**Acceptance Criteria:**

```
GIVEN the user has enabled SSE streaming in preferences (use_sse_streaming: true)
WHEN a task is created
THEN the Rust backend opens an SSE connection to {endpoint}/{taskId}/stream
AND progress events are emitted to the frontend via app.emit('task-progress', data)

GIVEN an SSE event with status SUCCEEDED is received
WHEN the event is processed
THEN the task card updates to SUCCEEDED
AND the SSE connection is closed
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-TASK-03-F1 | `stream_task` Tauri command opens SSE connection via `MeshyClient::stream_task()` |
| FR-TASK-03-F2 | Events are emitted via `app.emit('task-progress', data)` |
| FR-TASK-03-F3 | Frontend listens via `onEvent<TaskObject>('task-progress', handler)` |
| FR-TASK-03-F4 | SSE is opt-in: only used when `useSettingsStore((s) => s.useSseStreaming)` is true |
| FR-TASK-03-F5 | If SSE connection fails, falls back to polling automatically |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §7.1 (stream_task method), §7.2 (stream_task command) |
| UI/UX | §6.2 (DAT-08: SSE is opt-in), §7.3 (event emission pattern) |
| CSD | §7.3 (event emission pattern), §5.4 (SSE listener setup and cleanup) |

---

#### FR-TASK-04: Task Cancellation

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-TASK-01 |

**Description:**
The user can cancel a pending or in-progress task by clicking a "Cancel" button on the task card. This sends a DELETE request to the Meshy API.

**Acceptance Criteria:**

```
GIVEN a task is in PENDING or IN_PROGRESS status
WHEN the user clicks "Cancel" on the task card
THEN a confirmation dialog appears: "Cancel this task? Credits may not be refunded if the task is already in progress."

GIVEN the user confirms cancellation
WHEN the DELETE request is sent
THEN the task status changes to CANCELED
AND polling stops for that task
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-TASK-04-F1 | "Cancel" button on task card (only visible for PENDING and IN_PROGRESS tasks) |
| FR-TASK-04-F2 | Confirmation dialog with warning about credit refund |
| FR-TASK-04-F3 | Calls `delete_task` Tauri command with the endpoint and task ID |
| FR-TASK-04-F4 | Task status updates to CANCELED in the task store and SQLite |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §7.2 (delete_task command), §10 (DELETE endpoints) |
| UI/UX | §8.4 (task monitor interaction: cancel) |

---

#### FR-TASK-05: Task Retry on Failure

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-TASK-01 |

**Description:**
When a task fails, the user can retry it by clicking a "Retry" button. This re-submits the same request body to the same endpoint.

**Acceptance Criteria:**

```
GIVEN a task has FAILED status
WHEN the user clicks "Retry" on the task card
THEN the original request body is re-submitted to the same endpoint
AND a new task is created and appears in the Task Monitor

GIVEN a task failed due to 402 (insufficient credits)
WHEN the user views the retry button
THEN the button is disabled with tooltip "Insufficient credits — purchase more to retry"
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-TASK-05-F1 | "Retry" button on failed task cards |
| FR-TASK-05-F2 | Retry re-submits the original request body (stored in task_log table) |
| FR-TASK-05-F3 | Retry is disabled for 402 errors (insufficient credits) |
| FR-TASK-05-F4 | Retry creates a new task (new task ID); the failed task remains in history |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §6.1 (task_log table stores request_body for retry) |
| UI/UX | §8.4 (task monitor interaction: retry) |

---

#### FR-TASK-06: Task History Log

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-TASK-01 |

**Description:**
A collapsed section in the Task Monitor showing recently completed (SUCCEEDED, FAILED, CANCELED) tasks. This provides a quick history without cluttering the active task list.

**Acceptance Criteria:**

```
GIVEN the Task Monitor has completed tasks
WHEN the user views the panel
THEN completed tasks appear in a "History" section below the active tasks
AND each history item shows: label, final status, credits consumed, timestamp

GIVEN the user clicks "Clear Done"
WHEN the action completes
THEN all terminal tasks are removed from the Task Monitor (but remain in SQLite)
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-TASK-06-F1 | Completed tasks are moved from the active list to a history section |
| FR-TASK-06-F02 | History items are read from SQLite (not polled) |
| FR-TASK-06-F3 | "Clear Done" button removes terminal tasks from the Zustand `taskStore` (not from SQLite) |
| FR-TASK-06-F4 | History items show: label, status badge, credits, relative timestamp |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §6.1 (task_log table), §4.2 (task lifecycle) |
| UI/UX | §8.4 (task monitor interaction: clear completed) |

---

#### FR-TASK-07: Auto-Download on Task Success

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-TASK-02, FR-INF-05 |

**Description:**
When a task succeeds and auto-download is enabled in preferences, the app automatically downloads all model files, thumbnails, and textures to local storage without user intervention.

**Acceptance Criteria:**

```
GIVEN auto-download is enabled in preferences (default: true)
WHEN a task transitions to SUCCEEDED
THEN the download_asset Tauri command is called automatically with the task's model_urls, thumbnail_url, and texture_urls

GIVEN the download completes
WHEN the files are saved
THEN the SQLite record is updated with local file paths
AND the asset appears in the gallery
AND a toast displays "Asset downloaded to local storage"

GIVEN auto-download is disabled
WHEN a task succeeds
THEN a "Download" button appears on the task card
AND the user must click it to download the asset
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-TASK-07-F1 | `useSettingsStore((s) => s.autoDownloadOnSuccess)` controls auto-download behavior |
| FR-TASK-07-F2 | On task success, if auto-download is enabled, `useDownloadAsset().mutate()` is called |
| FR-TASK-07-F3 | Download mutation invalidates `['assets']` query so the gallery refreshes |
| FR-TASK-07-F4 | If auto-download is disabled, a "Download" button is shown on the succeeded task card |
| FR-TASK-07-F5 | Download errors show a toast with retry option |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §4.2 (process flow: download), §7.2 (download_asset command), §16.1 (auto_download_on_success setting) |
| UI/UX | §9.4 (success states), §6.2 (DAT-05: thumbnails from local filesystem) |
| CSD | §8.3 (download mutation with cache invalidation) |

---

### 5.10 Notification Features (Phase 2–3)

---

#### FR-NOTIF-01: OS Notification on Task Completion

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-TASK-02, FR-INF-07 |

**Description:**
When a task completes (succeeded or failed), an OS-native notification is displayed if the user has enabled notifications in preferences.

**Acceptance Criteria:**

```
GIVEN the user has enabled notifications in preferences (default: true)
WHEN a task transitions to SUCCEEDED
THEN an OS notification appears: "MeshyForge — Task Complete: {label} is ready to view."

GIVEN the user has enabled notifications
WHEN a task transitions to FAILED
THEN an OS notification appears: "MeshyForge — Task Failed: {label} failed. Check the task monitor for details."

GIVEN the user has disabled notifications
WHEN a task completes
THEN no OS notification appears (toast still appears)
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-NOTIF-01-F1 | `useSettingsStore((s) => s.notifyOnTaskComplete)` controls notification behavior |
| FR-NOTIF-01-F2 | Uses Tauri notification plugin (`tauri-plugin-notification`) |
| FR-NOTIF-01-F3 | Notification title: "MeshyForge — Task Complete" or "MeshyForge — Task Failed" |
| FR-NOTIF-01-F4 | Notification body includes the task label |
| FR-NOTIF-01-F5 | Focus is not stolen from the user's current position (UI/UX KBD-10) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §16.1 (notify_on_task_complete setting), §7.2 (notification command) |
| TSS | §12.3 (notification plugin) |
| UI/UX | §5.2 (KBD-10: no focus stealing), §9.4 (success states) |

---

#### FR-NOTIF-02: Toast Notifications for User Actions

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 2 |
| **Dependencies** | FR-SET-01 |

**Description:**
In-app toast notifications (via Sonner) for user actions: task created, asset downloaded, export complete, API key validated.

**Acceptance Criteria:**

```
GIVEN the user creates a task
WHEN the task is created successfully
THEN a success toast appears: "Task created — {credits} credits deducted" (auto-dismiss in 3 seconds)

GIVEN the user downloads an asset
WHEN the download completes
THEN a success toast appears: "Asset downloaded to local storage" (auto-dismiss in 3 seconds)

GIVEN the user exports an asset
WHEN the export completes
THEN a success toast appears: "Exported {format} to {path}" (auto-dismiss in 5 seconds)
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-NOTIF-02-F1 | Uses `sonner` toast library |
| FR-NOTIF-02-F2 | Toast container is mounted at root level with `z-[100]` (UI/UX §3.3) |
| FR-NOTIF-02-F3 | Success toasts auto-dismiss in 3–5 seconds |
| FR-NOTIF-02-F4 | Toasts have `aria-live="polite"` (UI/UX SEM-07) |

**Source Alignment:**

| Document | Section |
|---|---|
| UI/UX | §3.3 (z-index), §9.4 (success states), §5.3 (SEM-07) |
| TSS | §5.5 (shadcn/ui components: Sonner) |

---

#### FR-NOTIF-03: Error Toast Notifications

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 3 |
| **Dependencies** | FR-NOTIF-02 |

**Description:**
Error-specific toast notifications that display actionable messages based on the error code from CSD §10.2.

**Acceptance Criteria:**

```
GIVEN a task creation returns 402 Payment Required
WHEN the error is caught
THEN a toast appears: "Insufficient Credits" with description "Purchase more credits at meshy.ai" and a "Buy Credits" action button

GIVEN a task creation returns 401 Unauthorized
WHEN the error is caught
THEN a toast appears: "Invalid API Key" with an "Update Key" action button that navigates to Settings

GIVEN a network error occurs
WHEN the error is caught
THEN a toast appears: "Network Error" with a "Retry" action button

GIVEN the app receives a 429 rate limit
WHEN the error is caught
THEN a toast appears: "Rate Limited" with description "The app will retry automatically"
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-NOTIF-03-F1 | Error toast handler follows CSD §10.3 `handleMutationError` pattern |
| FR-NOTIF-03-F2 | Each error code from CSD §10.2 has a specific toast message and action |
| FR-NOTIF-03-F3 | 402 errors include a link to meshy.ai/settings/subscription |
| FR-NOTIF-03-F4 | 401 errors include a button that navigates to Settings |
| FR-NOTIF-03-F5 | Network errors include a retry button |
| FR-NOTIF-03-F6 | 429 errors auto-dismiss when retry succeeds |
| FR-NOTIF-03-F7 | Unknown errors show a generic toast with the error message |

**Source Alignment:**

| Document | Section |
|---|---|
| CSD | §10.2 (error code catalog), §10.3 (error handling pattern) |
| UI/UX | §9.3 (error states) |

---

### 5.11 Gallery Features (Phase 4)

---

#### FR-GAL-01: Asset Thumbnail Grid

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-TASK-07, FR-INF-03 |

**Description:**
A responsive grid of asset thumbnail cards, loaded from the local SQLite database. Each card shows the asset's thumbnail image, title, tags, credit cost, and favorite indicator.

**User Story:**
As a user, I want to see all my generated assets in a visual grid, so that I can browse and find the ones I need.

**Acceptance Criteria:**

```
GIVEN the user navigates to the Gallery
WHEN the gallery loads
THEN all downloaded assets are displayed as thumbnail cards in a responsive grid

GIVEN the gallery has assets
WHEN the grid renders
THEN each card shows: thumbnail image (from local filesystem), title (prompt or "Image to 3D"), tags, credits consumed, favorite star, status badge

GIVEN the gallery has more than 100 assets
WHEN the user scrolls
THEN only visible cards are rendered (virtualization)
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GAL-01-F1 | Grid uses CSS grid with `auto-fill` and `minmax(200px, 1fr)` (UI/UX RES-02) |
| FR-GAL-01-F2 | Cards are loaded from SQLite via `get_all_assets` Tauri command |
| FR-GAL-01-F3 | Thumbnails load from local filesystem via `asset://` protocol (UI/UX DAT-05) |
| FR-GAL-01-F4 | Virtualization via `@tanstack/react-virtual` when count > 100 (UI/UX RND-03) |
| FR-GAL-01-F5 | Grid has `role="grid"` (UI/UX SEM-09) |
| FR-GAL-01-F6 | Assets are ordered by `created_at DESC` (newest first) |

**Non-Functional Requirements:**

| ID | Requirement |
|---|---|
| NFR-GAL-01-1 | Gallery initial load completes in ≤ 500ms for ≤ 1,000 assets |
| NFR-GAL-01-2 | Scrolling is smooth (60fps) with virtualization |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §6.1 (assets table), §7.2 (get_all_assets command) |
| UI/UX | §9.2 (gallery UI), §6.1 (RND-03: virtualization), §11.3 (gallery card dimensions) |
| CSD | §8.3 (useAssets hook pattern) |

---

#### FR-GAL-02: Asset Card Display

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-01 |

**Description:**
Individual asset card component with thumbnail, title, tags, credits, favorite star, and status badge. Card has hover and click interactions.

**Acceptance Criteria:**

```
GIVEN an asset card is displayed
WHEN the user hovers over it
THEN the card border changes to accent color and a shadow appears

GIVEN the user clicks an asset card
WHEN the click is registered
THEN the asset detail panel opens (FR-GAL-10)

GIVEN the user right-clicks an asset card
WHEN the context menu opens
THEN options are displayed: Export, Tag, Delete, Reveal in Finder

GIVEN the user presses Enter on a focused card
WHEN the keypress is registered
THEN the asset detail panel opens (keyboard accessibility)
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GAL-02-F1 | Card dimensions per UI/UX §11.3 (minmax 200px, aspect-square thumbnail) |
| FR-GAL-02-F2 | Hover state: `border-accent shadow-md` (UI/UX §11.3) |
| FR-GAL-02-F3 | Click opens asset detail (calls `useAppStore.getState().setSelectedAsset(id)`) |
| FR-GAL-02-F4 | Right-click opens context menu (shadcn/ui DropdownMenu) |
| FR-GAL-02-F5 | Card is focusable via Tab and has `focus-visible:ring-2 ring-accent` (UI/UX KBD-03) |
| FR-GAL-02-F6 | Enter key on focused card opens detail (UI/UX KBD-06) |
| FR-GAL-02-F7 | Card uses stable key (Meshy task ID) (UI/UX RND-02) |

**Source Alignment:**

| Document | Section |
|---|---|
| UI/UX | §8.3 (gallery interaction), §11.3 (card dimensions), §6.1 (RND-02) |
| CSD | §5.1 (RCT-03: Props interface), §5.3 (stable list keys) |

---

#### FR-GAL-03: Full-Text Search

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-01 |

**Description:**
A search bar at the top of the gallery that filters assets by prompt text and notes. Search is debounced at 300ms.

**Acceptance Criteria:**

```
GIVEN the user types "monster" in the search bar
WHEN 300ms has passed since the last keystroke
THEN the gallery filters to show only assets with "monster" in their prompt or notes

GIVEN the search bar is empty
WHEN the gallery refreshes
THEN all assets are shown (no filter)

GIVEN the search returns no results
WHEN the gallery updates
THEN an empty state is shown: "No assets match your search."
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GAL-03-F1 | Search bar uses shadcn/ui `Input` with `placeholder="Search assets..."` |
| FR-GAL-03-F2 | Search is debounced at 300ms (UI/UX §8.3, CSD §5.4 debounce pattern) |
| FR-GAL-03-F3 | Calls `search_assets` Tauri command with the query string |
| FR-GAL-03-F4 | Empty query loads all assets (no filter) |
| FR-GAL-03-F5 | Search bar has `aria-label="Search assets"` (UI/UX SEM-02) |
| FR-GAL-03-F6 | No results shows empty state per UI/UX §9.2 |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §6.1 (search_assets query), §7.2 (search_assets command) |
| UI/UX | §8.3 (search interaction), §9.2 (empty states) |
| CSD | §5.4 (debounced search input pattern) |

---

#### FR-GAL-04: Tag-Based Filtering

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-01, FR-TAG-01 |

**Description:**
A tag filter dropdown that filters the gallery by a selected tag. Shows all tags with asset counts.

**Acceptance Criteria:**

```
GIVEN the user opens the tag filter dropdown
WHEN the tags are loaded
THEN all tags are listed with the number of assets for each

GIVEN the user selects a tag (e.g., "monster")
WHEN the gallery refreshes
THEN only assets with the "monster" tag are shown

GIVEN the user selects "All" from the dropdown
WHEN the gallery refreshes
THEN all assets are shown (no tag filter)
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GAL-04-F1 | Tag filter dropdown (shadcn/ui Select) with "All" option |
| FR-GAL-04-F2 | Each tag shows its name and asset count |
| FR-GAL-04-F3 | Selecting a tag calls `search_assets(query, tag)` Tauri command |
| FR-GAL-04-F4 | Tag filter and text search can be combined |
| FR-GAL-04-F5 | Dropdown has `aria-label="Filter by tag"` (UI/UX SEM-02) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §6.1 (search_assets with tag parameter, tags table) |
| UI/UX | §8.3 (tag filter interaction) |

---

#### FR-GAL-05: Sort by Date

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-01 |

**Description:**
A sort dropdown that toggles between newest-first and oldest-first.

**Acceptance Criteria:**

```
GIVEN the user opens the sort dropdown
WHEN they view the options
THEN they see: "Newest First" (default) and "Oldest First"

GIVEN the user selects "Oldest First"
WHEN the gallery refreshes
THEN assets are ordered by created_at ASC
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GAL-05-F1 | Sort dropdown (shadcn/ui Select) with two options |
| FR-GAL-05-F2 | Default: newest first (created_at DESC) |
| FR-GAL-05-F3 | Sort selection is passed to the `get_all_assets` or `search_assets` query |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §6.1 (ORDER BY created_at in queries) |
| UI/UX | §9.2 (gallery view with sort dropdown) |

---

#### FR-GAL-06: Gallery Virtualization (100+ Assets)

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-01 |

**Description:**
When the gallery has more than 100 assets, only visible cards are rendered using `@tanstack/react-virtual`. Below 100, all cards render normally.

**Acceptance Criteria:**

```
GIVEN the gallery has 50 assets
WHEN the grid renders
THEN all 50 cards are rendered (no virtualization)

GIVEN the gallery has 500 assets
WHEN the user scrolls
THEN only the visible cards (plus a small overscan) are rendered
AND scrolling is smooth at 60fps
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GAL-06-F1 | Virtualization threshold: 100 assets (UI/UX RND-03) |
| FR-GAL-06-F2 | Uses `@tanstack/react-virtual` for windowed rendering |
| FR-GAL-06-F3 | Overscan: 5 rows above and below the viewport |
| FR-GAL-06-F4 | Virtualized items maintain stable keys (Meshy task ID) |

**Non-Functional Requirements:**

| ID | Requirement |
|---|---|
| NFR-GAL-06-1 | Scrolling at 60fps with 1,000+ assets |

**Source Alignment:**

| Document | Section |
|---|---|
| UI/UX | §6.1 (RND-03) |
| CSD | §13.1 (PRF-06) |

---

#### FR-GAL-07: Empty States

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-01 |

**Description:**
Contextual empty states for the gallery when no assets are available, no API key is set, or search returns no results.

**Acceptance Criteria:**

```
GIVEN no API key is set
WHEN the user opens the Gallery
THEN an empty state shows: KeyRound icon, "No API key configured. Add your Meshy API key to start generating 3D assets." and a button "Add API Key" that navigates to Settings

GIVEN the gallery has no assets
WHEN the user opens the Gallery
THEN an empty state shows: Images icon, "No assets yet. Generate your first 3D model to get started." and a button "Go to Generate" that navigates to the Generate panel

GIVEN a search returns no results
WHEN the gallery updates
THEN an empty state shows: SearchX icon, "No assets match your search or filter." and a button "Clear filters"
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GAL-07-F1 | Three empty states per UI/UX §9.2: no API key, no assets, no search results |
| FR-GAL-07-F2 | Each empty state has: centered icon, text, and action button |
| FR-GAL-07-F3 | "Add API Key" button calls `useAppStore.getState().setActiveView('settings')` |
| FR-GAL-07-F4 | "Go to Generate" button calls `useAppStore.getState().setActiveView('generate')` |
| FR-GAL-07-F5 | "Clear filters" button clears the search query and tag filter |

**Source Alignment:**

| Document | Section |
|---|---|
| UI/UX | §9.2 (empty states) |

---

#### FR-GAL-08: Asset Deletion

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-02 |

**Description:**
The user can delete an asset from the gallery, which removes the SQLite record and deletes the local file directory.

**Acceptance Criteria:**

```
GIVEN the user right-clicks an asset card and selects "Delete"
WHEN the confirmation dialog appears
THEN it says: "Delete this asset? This will remove the asset from the gallery and delete all local files. This action cannot be undone."

GIVEN the user confirms deletion
WHEN the delete completes
THEN the asset is removed from the gallery
AND the asset's directory is deleted from disk
AND the ['assets'] query is invalidated to refresh the gallery
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GAL-08-F1 | Delete is accessible via context menu (right-click) and asset detail panel |
| FR-GAL-08-F2 | Confirmation dialog (shadcn/ui AlertDialog) with warning text |
| FR-GAL-08-F3 | Calls `delete_asset` Tauri command (removes SQLite record + deletes files) |
| FR-GAL-08-F4 | Invalidates `['assets']` query on success |
| FR-GAL-08-F5 | Delete button uses `variant="destructive"` (UI/UX §8.1) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §6.1 (delete_asset query), §7.2 (delete_asset command) |
| UI/UX | §8.3 (gallery interaction: context menu) |

---

#### FR-GAL-09: Favorite Toggle

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-02 |

**Description:**
The user can mark assets as favorites by clicking a star icon on the card. Favorites can be filtered.

**Acceptance Criteria:**

```
GIVEN an asset card is displayed
WHEN the user clicks the star icon
THEN the star fills (text-warning color) and the favorite flag is toggled in SQLite

GIVEN the user clicks the star on a favorited asset
WHEN the toggle completes
THEN the star empties (text-muted color) and the favorite flag is removed
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GAL-09-F1 | Star icon (Lucide `Star`) on each card, top-right corner |
| FR-GAL-09-F2 | Filled star: `text-warning fill-warning` |
| FR-GAL-09-F3 | Empty star: `text-muted` |
| FR-GAL-09-F4 | Click calls `toggle_favorite` Tauri command |
| FR-GAL-09-F5 | Star button has `aria-label="Toggle favorite"` (UI/UX SEM-03) |
| FR-GAL-09-F6 | Star button has `aria-pressed={isFavorite}` for screen reader state |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §6.1 (toggle_favorite query), §7.2 (toggle_favorite command) |
| UI/UX | §8.3 (gallery interaction: favorite toggle) |

---

#### FR-GAL-10: Asset Detail Panel

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-02, FR-PREV-01, FR-TAG-01, FR-TAG-02, FR-TAG-03, FR-EXP-01 |

**Description:**
A full detail panel that opens when the user clicks an asset card. Shows 3D preview, metadata, tags, notes, file links, and action buttons for post-processing and export.

**User Story:**
As a user, I want to see all details about an asset in one place, so that I can preview it, manage its metadata, and perform post-processing actions.

**Acceptance Criteria:**

```
GIVEN the user clicks an asset card
WHEN the detail panel opens
THEN it displays: 3D preview (left), metadata panel (right) with ID, type, AI model, prompt, credits, created date, status, tags, notes, action buttons, and task chain

GIVEN the detail panel is open
WHEN the user clicks "Back"
THEN the panel closes and the gallery is shown

GIVEN the detail panel is open
WHEN the user clicks "Reveal in Finder"
THEN the OS file manager opens at the asset's directory
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-GAL-10-F1 | Left panel: 3D preview (FR-PREV-01) with format tabs (GLB, FBX, OBJ, STL, USDZ) |
| FR-GAL-10-F2 | Right panel: metadata (ID, type, AI model, prompt, credits, dates, status) |
| FR-GAL-10-F3 | Tags section with add/remove (FR-TAG-01) |
| FR-GAL-10-F4 | Notes textarea (FR-TAG-02) |
| FR-GAL-10-F5 | Action buttons: Remesh, Retexture, Rig, Animate, Convert, Resize, Export, Delete |
| FR-GAL-10-F6 | "Reveal in Finder" button calls `reveal_in_file_manager` Tauri command |
| FR-GAL-10-F7 | "Back" button closes the panel and returns to gallery |
| FR-GAL-10-F8 | Post-processing buttons navigate to the relevant post-process panel with the asset pre-selected |
| FR-GAL-10-F9 | Texture thumbnails are displayed: base color, metallic, normal, roughness, emission |
| FR-GAL-10-F10 | Layout switches from side-by-side to stacked below 1280px width (UI/UX RES-03) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §4.3 (data flow), §9.3 (asset detail UI) |
| UI/UX | §9.3 (asset detail panel layout), §11.1 (responsive rules) |

---

### 5.12 3D Preview Features (Phase 4)

---

#### FR-PREV-01: 3D Model Preview (GLB)

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-10, FR-INF-05 |

**Description:**
An inline 3D model viewer using React Three Fiber that loads GLB files from local storage and renders them with orbit controls, studio lighting, and contact shadows.

**User Story:**
As a user, I want to see a 3D preview of my generated model, so that I can evaluate its quality before exporting.

**Acceptance Criteria:**

```
GIVEN the user opens an asset detail panel
WHEN the 3D preview loads
THEN a GLB model is rendered in the Canvas with OrbitControls, studio lighting, and contact shadows

GIVEN the 3D preview is loading
WHEN the GLB file is being parsed
THEN a wireframe box placeholder is shown

GIVEN the GLB file fails to load
WHEN the error is caught
THEN the thumbnail image is shown instead with text "Unable to load 3D preview. Showing thumbnail instead."
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-PREV-01-F1 | Uses `@react-three/fiber` Canvas with `@react-three/drei` components |
| FR-PREV-01-F2 | GLB loaded via `useGLTF(assetUrl(path))` where `assetUrl` converts to `asset://` protocol |
| FR-PREV-01-F3 | Scene is cloned before rendering: `scene.clone(true)` (UI/UX VP-06) |
| FR-PREV-01-F4 | `Bounds fit clip observe margin={1.2}` wraps `Center` for auto-framing (UI/UX CAM-05) |
| FR-PREV-01-F5 | Error boundary shows thumbnail fallback (UI/UX VP-04, CSD §10.4) |
| FR-PREV-01-F6 | Canvas has `aria-label="3D preview of: {prompt or type}"` (UI/UX 3D-A11Y-01) |
| FR-PREV-01-F7 | Canvas has `role="img"` (UI/UX 3D-A11Y-02) |
| FR-PREV-01-F8 | Text description below canvas: type, AI model, polycount (if available), texture status (UI/UX 3D-A11Y-03) |

**Non-Functional Requirements:**

| ID | Requirement |
|---|---|
| NFR-PREV-01-1 | Canvas uses `dpr={[1, 2]}` (UI/UX VP-03) |
| NFR-PREV-01-2 | Canvas uses `frameloop="demand"` when idle (UI/UX VP-02) |
| NFR-PREV-01-3 | `useGLTF.clear(path)` called on unmount (UI/UX VP-07) |
| NFR-PREV-01-4 | Canvas is wrapped in `React.memo` (UI/UX RND-01) |
| NFR-PREV-01-5 | Canvas is lazy-loaded via `React.lazy()` (UI/UX BDL-02) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §3.1 (R3F + drei), §7.2 (asset protocol) |
| TSS | §7 (Three.js ecosystem, R3F Canvas configuration) |
| UI/UX | §10 (3D viewport guardrails), §10.4 (3D accessibility) |
| CSD | §5.3 (React.memo pattern), §13.1 (PRF-01–PRF-04) |

---

#### FR-PREV-02: 3D Camera Controls (Orbit, Zoom)

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-PREV-01 |

**Description:**
OrbitControls for rotating, zooming, and panning the 3D model. Controls are mouse/touch only (not keyboard, per UI/UX 3D-A11Y-04).

**Acceptance Criteria:**

```
GIVEN the 3D preview is displayed
WHEN the user drags the mouse
THEN the model rotates (orbit)

GIVEN the 3D preview is displayed
WHEN the user scrolls the mouse wheel
THEN the camera zooms in/out

GIVEN the camera is at minimum distance (2)
WHEN the user tries to zoom closer
THEN zoom is clamped (no closer than distance 2)

GIVEN the camera is at maximum distance (15)
WHEN the user tries to zoom further
THEN zoom is clamped (no further than distance 15)
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-PREV-02-F1 | `OrbitControls` with `enableDamping`, `dampingFactor={0.05}` (UI/UX CAM-02) |
| FR-PREV-02-F2 | Min distance: 2, max distance: 15 (UI/UX CAM-03) |
| FR-PREV-02-F3 | `maxPolarAngle={Math.PI * 0.9}` prevents orbiting below ground (UI/UX CAM-04) |
| FR-PREV-02-F4 | No auto-rotate (UI/UX CAM-06) |
| FR-PREV-02-F5 | Canvas is not focusable (UI/UX 3D-A11Y-04) |

**Source Alignment:**

| Document | Section |
|---|---|
| UI/UX | §10.2 (camera and controls, CAM-01–CAM-06) |

---

#### FR-PREV-03: 3D Preview Fallback (Thumbnail)

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-PREV-01 |

**Description:**
If the WebGL context fails or the GLB file is corrupted, the 3D preview falls back to displaying the thumbnail image.

**Acceptance Criteria:**

```
GIVEN the WebGL context is unavailable
WHEN the Canvas error boundary catches the error
THEN the thumbnail image is displayed with text "Unable to load 3D preview. Showing thumbnail instead."

GIVEN the GLB file is corrupted
WHEN useGLTF fails to parse
THEN the error boundary catches it and shows the thumbnail
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-PREV-03-F1 | `CanvasErrorBoundary` wraps the R3F Canvas (CSD §10.4) |
| FR-PREV-03-F2 | Fallback renders the thumbnail image via `asset://` protocol |
| FR-PREV-03-F3 | Fallback text: "Unable to load 3D preview. Showing thumbnail instead." (UI/UX §9.3) |

**Source Alignment:**

| Document | Section |
|---|---|
| UI/UX | §10.1 (VP-04: fallback if WebGL unavailable) |
| CSD | §10.4 (React error boundary pattern) |

---

#### FR-PREV-04: 3D Preview Memory Cleanup

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-PREV-01 |

**Description:**
When the asset detail panel closes, the R3F Canvas unmounts, the WebGL context is disposed, and the GLB is cleared from Three.js's cache.

**Acceptance Criteria:**

```
GIVEN the user closes the asset detail panel
WHEN the Canvas unmounts
THEN the WebGL context is disposed (gl.dispose())
AND useGLTF.clear(path) is called
AND no WebGL context leak is detectable after 20 open/close cycles
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-PREV-04-F1 | `useGLTF.clear(path)` in cleanup effect (UI/UX VP-07) |
| FR-PREV-04-F2 | `gl.dispose()` in Canvas `onUnmounted` callback (UI/UX MEM-01) |
| FR-PREV-04-F3 | Canvas unmounts when the detail panel closes (UI/UX VP-01) |

**Non-Functional Requirements:**

| ID | Requirement |
|---|---|
| NFR-PREV-04-1 | No sustained memory growth after 20 open/close cycles (UI/UX §13.2) |

**Source Alignment:**

| Document | Section |
|---|---|
| UI/UX | §10.1 (VP-01, VP-07), §6.4 (MEM-01, MEM-02) |
| CSD | §13.1 (PRF-03) |

---

### 5.13 Tagging and Metadata Features (Phase 4)

---

#### FR-TAG-01: Add and Remove Tags

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-10 |

**Description:**
The user can add and remove tags on assets from the asset detail panel. Tags are stored in the SQLite tags and asset_tags tables.

**Acceptance Criteria:**

```
GIVEN the user is viewing an asset detail panel
WHEN they type a tag name and press Enter
THEN the tag is added to the asset and displayed as a badge

GIVEN the user clicks the "x" on a tag badge
WHEN the tag is removed
THEN the badge disappears and the tag is unlinked from the asset

GIVEN the user adds a tag that already exists on another asset
WHEN the tag is added
THEN the existing tag record is reused (no duplicate tag names)
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-TAG-01-F1 | Tag input field with Enter-to-add behavior |
| FR-TAG-01-F2 | Tags displayed as badges with remove ("x") button |
| FR-TAG-01-F3 | Calls `update_tags` Tauri command with the full tag list |
| FR-TAG-01-F4 | Tag names are case-insensitive unique in the tags table |
| FR-TAG-01-F5 | Tag badge has `aria-label="Tag: {name}. Press to remove."` (UI/UX SEM-03) |
| FR-TAG-01-F6 | New tag badges animate in with `animate-in fade-in slide-in-from-bottom-1 duration-200` (UI/UX §9.4) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §6.1 (tags table, asset_tags table, update_tags query) |
| UI/UX | §9.3 (asset detail: tags section), §9.4 (tag added animation) |

---

#### FR-TAG-02: Notes Editor

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-10 |

**Description:**
A textarea in the asset detail panel where the user can write notes about an asset. Notes are saved to the SQLite assets table.

**Acceptance Criteria:**

```
GIVEN the user is viewing an asset detail panel
WHEN they type in the notes textarea
THEN the text is saved to SQLite on blur (debounced 500ms)

GIVEN the user navigates away and back
WHEN the detail panel reopens
THEN the previously saved notes are displayed
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-TAG-02-F1 | Textarea with auto-resize up to 200px (UI/UX FRM-10) |
| FR-TAG-02-F2 | Save on blur (debounced 500ms) via `update_notes` Tauri command |
| FR-TAG-02-F3 | Textarea has `aria-label="Asset notes"` (UI/UX SEM-02) |
| FR-TAG-02-F4 | Placeholder: "Add notes about this asset..." |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §6.1 (update_notes query), §7.2 (update_notes command) |
| UI/UX | §9.3 (asset detail: notes section) |

---

#### FR-TAG-03: Metadata Display

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-10 |

**Description:**
Read-only metadata display in the asset detail panel showing all stored metadata about the asset.

**Acceptance Criteria:**

```
GIVEN the user opens an asset detail panel
WHEN they view the metadata section
THEN they see: ID (monospace, copyable), type, AI model, prompt (if text-based), image URL (if image-based), credits consumed, created date, finished date, status, has_textures, has_rig, has_animation
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-TAG-03-F1 | ID displayed in `font-mono` with a copy button (Lucide `Copy` icon) |
| FR-TAG-03-F2 | Dates formatted as relative time (e.g., "2 hours ago") via `formatRelativeTime()` |
| FR-TAG-03-F3 | Credits formatted with `formatCredits()` |
| FR-TAG-03-F4 | Boolean metadata (has_textures, has_rig, has_animation) shown as check/x icons |
| FR-TAG-03-F5 | Metadata labels use `text-secondary text-xs` |
| FR-TAG-03-F6 | Metadata values use `text-primary text-sm` |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §6.1 (assets table fields), §9.3 (asset detail: metadata section) |
| CSD | §9.1 (STY-07: font-mono for IDs), TSS §5.6 (formatRelativeTime) |

---

#### FR-TAG-04: Task Chain Visualization

| Field | Value |
|---|---|
| **Priority** | Should Have |
| **Phase** | 4 |
| **Dependencies** | FR-TAG-03 |

**Description:**
A visual representation of the task chain showing how an asset was derived from parent tasks (e.g., preview → refine → remesh → retexture).

**Acceptance Criteria:**

```
GIVEN an asset has a parent_task_id
WHEN the user views the metadata section
THEN a task chain is displayed: "preview → refine (this)" or "image-to-3d → remesh → retexture (this)"

GIVEN the user clicks a parent task in the chain
WHEN the navigation occurs
THEN the parent asset's detail panel opens
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-TAG-04-F1 | Reads `parent_task_id` from the asset record |
| FR-TAG-04-F2 | Recursively fetches parent assets to build the chain |
| FR-TAG-04-F3 | Chain displayed as breadcrumb-style links with `→` separators |
| FR-TAG-04-F4 | Current asset is highlighted (not clickable) |
| FR-TAG-04-F5 | Parent assets are clickable and open their detail panel |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §6.1 (parent_task_id field), §9.3 (asset detail: task chain) |

---

### 5.14 Export Features (Phase 4)

---

#### FR-EXP-01: Single Asset Export

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-10, FR-INF-05 |

**Description:**
The user can export a single asset in a chosen format to a chosen location on disk.

**User Story:**
As a user, I want to export a 3D model to a specific folder on my computer, so that I can use it in another application.

**Acceptance Criteria:**

```
GIVEN the user is viewing an asset detail panel
WHEN they click "Export"
THEN an export dialog opens with format selection (GLB, FBX, OBJ, STL, USDZ, 3MF) and a "Choose Location" button

GIVEN the user selects a format and location
WHEN they click "Export"
THEN the file is copied from local asset storage to the chosen location
AND a success toast appears: "Exported {format} to {path}"
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-EXP-01-F1 | Export dialog (shadcn/ui Dialog) with format radio buttons and file path picker |
| FR-EXP-01-F2 | "Choose Location" button opens OS file save dialog (Tauri dialog plugin) |
| FR-EXP-01-F3 | Export copies the file from the local asset directory to the chosen path |
| FR-EXP-01-F4 | If the selected format was not downloaded (not in file_paths), display "This format was not generated. Re-generate with this format selected." |
| FR-EXP-01-F5 | Success toast: "Exported {format} to {path}" (UI/UX §9.4) |
| FR-EXP-01-F6 | Export dialog has a DialogTitle (UI/UX SEM-10) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §4.3 (file storage), §7.2 (reveal_in_file_manager) |
| TSS | §12.2 (dialog plugin: save) |
| UI/UX | §9.4 (success states), §5.3 (SEM-10: dialog title) |

---

#### FR-EXP-02: Batch Export

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-EXP-01 |

**Description:**
The user can select multiple assets and export them all in a single format to a chosen directory.

**Acceptance Criteria:**

```
GIVEN the user selects multiple assets (Ctrl/Cmd+Click)
WHEN they right-click and select "Export"
THEN a batch export dialog opens with format selection and directory picker

GIVEN the user selects a format and directory
WHEN they click "Export All"
THEN each asset's file in the selected format is copied to the directory
AND a progress bar shows export progress
AND a success toast appears: "Exported {N} assets to {directory}"
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-EXP-02-F1 | Multi-select via Ctrl/Cmd+Click on asset cards (UI/UX §8.3) |
| FR-EXP-02-F2 | Batch export dialog with format selector and directory picker (Tauri dialog `open` with directory mode) |
| FR-EXP-02-F3 | Progress bar shows: "Exporting {N}/{total}..." |
| FR-EXP-02-F4 | Assets missing the selected format are skipped with a warning in the toast |
| FR-EXP-02-F5 | Success toast: "Exported {N} assets to {directory}" |

**Source Alignment:**

| Document | Section |
|---|---|
| UI/UX | §8.3 (gallery interaction: multi-select, batch export) |

---

#### FR-EXP-03: Export Format Selection

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-EXP-01 |

**Description:**
Format selection UI within the export dialog showing all supported formats with availability indicators.

**Acceptance Criteria:**

```
GIVEN the export dialog is open
WHEN the user views the format options
THEN each format is listed: GLB, FBX, OBJ, STL, USDZ, 3MF
AND formats that were downloaded for this asset are enabled
AND formats that were not downloaded are disabled with tooltip "Not generated for this asset"
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-EXP-03-F1 | Format options: GLB, FBX, OBJ, STL, USDZ, 3MF |
| FR-EXP-03-F2 | Availability determined by `file_paths` in the asset record |
| FR-EXP-03-F3 | Unavailable formats are disabled with tooltip (UI/UX FRM-05) |
| FR-EXP-03-F4 | Format selector uses radio buttons (single export) or checkboxes (batch export) |
| FR-EXP-03-F5 | Radio/checkbox group wrapped in `<fieldset>` with `<legend>` (UI/UX FRM-07) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §6.1 (file_paths field), §6.2 (ExportFormat type) |
| UI/UX | §8.2 (FRM-05, FRM-07) |

---

#### FR-EXP-04: Reveal Asset in OS File Manager

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Phase** | 4 |
| **Dependencies** | FR-GAL-10 |

**Description:**
A button in the asset detail panel that opens the OS file manager (Finder, Explorer, or default Linux file manager) at the asset's local directory.

**Acceptance Criteria:**

```
GIVEN the user is viewing an asset detail panel
WHEN they click "Reveal in Finder" (macOS) / "Reveal in Explorer" (Windows) / "Reveal in File Manager" (Linux)
THEN the OS file manager opens at the asset's directory
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-EXP-04-F1 | Button label is platform-specific: "Reveal in Finder" (macOS), "Reveal in Explorer" (Windows), "Reveal in File Manager" (Linux) |
| FR-EXP-04-F2 | Calls `reveal_in_file_manager` Tauri command with the asset's directory path |
| FR-EXP-04-F3 | Button has `aria-label` matching the label (UI/UX SEM-03) |
| FR-EXP-04-F4 | Uses Lucide `FolderOpen` icon |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §7.2 (reveal_in_file_manager command) |
| TSS | §12.4 (shell plugin) |
| UI/UX | §9.3 (asset detail: "Reveal in Finder" button) |

---

#### FR-EXP-05: Storage Usage Display

| Field | Value |
|---|---|
| **Priority** | Should Have |
| **Phase** | 4 |
| **Dependencies** | FR-INF-05 |

**Description:**
A display in the StatusBar showing the total disk space used by local asset storage.

**Acceptance Criteria:**

```
GIVEN the app is running
WHEN the user views the StatusBar
THEN the total asset storage size is displayed (e.g., "Storage: 1.2 GB")

GIVEN the user downloads or deletes assets
WHEN the storage changes
THEN the display updates within 5 seconds
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-EXP-05-F1 | `get_storage_usage` Tauri command calculates total size of the assets directory |
| FR-EXP-05-F2 | Display uses `formatFileSize()` from `src/lib/utils.ts` |
| FR-EXP-05-F3 | Updates after download and delete operations |
| FR-EXP-05-F4 | Displayed in StatusBar with Lucide `HardDrive` icon |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §9.1 (StatusBar layout), §7.2 (get_storage_usage command) |
| TSS | §5.6 (formatFileSize utility) |

---

### 5.15 Settings Feature (Phase 5)

---

#### FR-SET-05: Prompt Preset Save and Load

| Field | Value |
|---|---|
| **Priority** | Should Have |
| **Phase** | 5 |
| **Dependencies** | FR-SET-03, FR-GEN-07 |

**Description:**
The user can save the current state of a generation form as a named preset and load it later to quickly re-apply the same configuration.

**Acceptance Criteria:**

```
GIVEN the user has filled out a Text to 3D form
WHEN they click "Save Preset"
THEN a dialog prompts for a preset name
AND the current form state (prompt, AI model, remesh, polycount, pose, PBR, formats) is saved to SQLite

GIVEN the user opens a generation panel
WHEN they click "Load Preset"
THEN a dropdown of saved presets is displayed

GIVEN the user selects a preset
WHEN the preset is loaded
THEN all form fields are populated with the preset values
```

**Functional Requirements:**

| ID | Requirement |
|---|---|
| FR-SET-05-F1 | "Save Preset" button on each generation panel |
| FR-SET-05-F2 | Preset name dialog (shadcn/ui Dialog with Input) |
| FR-SET-05-F3 | Presets stored in SQLite `settings` table as JSON under key `prompt_presets` |
| FR-SET-05-F4 | "Load Preset" dropdown shows all saved presets sorted by name |
| FR-SET-05-F5 | Loading a preset populates all form fields |
| FR-SET-05-F6 | Presets are form-type-specific (text-to-3D presets don't apply to image-to-3D) |

**Source Alignment:**

| Document | Section |
|---|---|
| TDD | §16.2 (PromptPreset interface), §16.1 (settings table) |
| UI/UX | §12.7 (Phase 5 deliverable: prompt presets) |

---

## 6. Feature Dependency Graph

### 6.1 Dependency Graph

```
Phase 0:
  FR-INF-01 (Scaffold)
    ├── FR-INF-02 (IPC Contract Layer)
    └── FR-INF-08 (CI/CD)

Phase 1:
  FR-INF-03 (SQLite) ← FR-INF-01
  FR-INF-04 (Meshy Client) ← FR-INF-01
  FR-INF-05 (File Storage) ← FR-INF-03, FR-INF-04
  FR-INF-06 (Keychain) ← FR-INF-01
  FR-INF-07 (Command Registration) ← FR-INF-03, FR-INF-04, FR-INF-05, FR-INF-06

Phase 2:
  FR-KEY-01 (API Key Entry) ← FR-INF-06, FR-INF-07, FR-INF-02
  FR-KEY-02 (API Key Persistence) ← FR-KEY-01
  FR-KEY-03 (Credit Balance) ← FR-KEY-02
  FR-KEY-04 (Credit Auto-Refresh) ← FR-KEY-03
  FR-SET-01 (Shell Layout) ← FR-INF-01, FR-INF-02
  FR-SET-02 (Sidebar Nav) ← FR-SET-01
  FR-SET-03 (Preferences) ← FR-SET-01
  FR-SET-04 (About Panel) ← FR-SET-01
  FR-NOTIF-02 (Toast Notifications) ← FR-SET-01

Phase 3:
  FR-GEN-01 (Text to 3D Preview) ← FR-KEY-02, FR-TASK-01
  FR-GEN-02 (Text to 3D Refine) ← FR-GEN-01, FR-TASK-01
  FR-GEN-05 (Drag-and-Drop Upload) ← FR-INF-02
  FR-GEN-06 (File Dialog Upload) ← FR-INF-02
  FR-GEN-07 (Form Controls) ← FR-SET-03
  FR-GEN-03 (Image to 3D) ← FR-KEY-02, FR-GEN-05, FR-GEN-06, FR-TASK-01
  FR-GEN-04 (Multi-Image to 3D) ← FR-GEN-03
  FR-POST-01 (Remesh) ← FR-GAL-10
  FR-POST-02 (Retexture) ← FR-GAL-10
  FR-POST-03 (Convert) ← FR-GAL-10
  FR-POST-04 (Resize) ← FR-GAL-10
  FR-POST-05 (UV Unwrap) ← FR-GAL-10
  FR-POST-06 (Rigging) ← FR-GAL-10
  FR-POST-07 (Animation) ← FR-POST-06, FR-INF-04
  FR-IMG-01 (Text to Image) ← FR-KEY-02, FR-TASK-01
  FR-IMG-02 (Image to Image) ← FR-IMG-01, FR-GEN-05, FR-GEN-06
  FR-PRINT-01 (Multi-Color Print) ← FR-GAL-10
  FR-PRINT-02 (Analyze Printability) ← FR-GAL-10
  FR-PRINT-03 (Repair Printability) ← FR-PRINT-02
  FR-CLAB-01 (Keychain) ← FR-KEY-02, FR-TASK-01, FR-GEN-05, FR-GEN-06
  FR-CLAB-02 (Fridge Magnet) ← FR-CLAB-01
  FR-CLAB-03 (Figure) ← FR-CLAB-01
  FR-CLAB-04 (Vinyl Figure) ← FR-CLAB-01
  FR-CLAB-05 (Brick Figure) ← FR-CLAB-01
  FR-CLAB-06 (Lamp) ← FR-CLAB-01
  FR-CLAB-07 (Keycap) ← FR-CLAB-01
  FR-TASK-01 (Task Creation) ← FR-INF-04, FR-INF-07
  FR-TASK-02 (Task Polling) ← FR-TASK-01
  FR-TASK-03 (SSE Streaming) ← FR-TASK-02
  FR-TASK-04 (Task Cancellation) ← FR-TASK-01
  FR-TASK-05 (Task Retry) ← FR-TASK-01
  FR-TASK-06 (Task History) ← FR-TASK-01
  FR-TASK-07 (Auto-Download) ← FR-TASK-02, FR-INF-05
  FR-NOTIF-01 (OS Notification) ← FR-TASK-02, FR-INF-07
  FR-NOTIF-03 (Error Toasts) ← FR-NOTIF-02

Phase 4:
  FR-GAL-01 (Thumbnail Grid) ← FR-TASK-07, FR-INF-03
  FR-GAL-02 (Asset Card) ← FR-GAL-01
  FR-GAL-03 (Full-Text Search) ← FR-GAL-01
  FR-GAL-04 (Tag Filter) ← FR-GAL-01, FR-TAG-01
  FR-GAL-05 (Sort by Date) ← FR-GAL-01
  FR-GAL-06 (Virtualization) ← FR-GAL-01
  FR-GAL-07 (Empty States) ← FR-GAL-01
  FR-GAL-08 (Asset Deletion) ← FR-GAL-02
  FR-GAL-09 (Favorite Toggle) ← FR-GAL-02
  FR-GAL-10 (Asset Detail) ← FR-GAL-02, FR-PREV-01, FR-TAG-01, FR-TAG-02, FR-TAG-03, FR-EXP-01
  FR-PREV-01 (3D Preview) ← FR-GAL-10, FR-INF-05
  FR-PREV-02 (Camera Controls) ← FR-PREV-01
  FR-PREV-03 (Preview Fallback) ← FR-PREV-01
  FR-PREV-04 (Memory Cleanup) ← FR-PREV-01
  FR-TAG-01 (Add/Remove Tags) ← FR-GAL-10
  FR-TAG-02 (Notes Editor) ← FR-GAL-10
  FR-TAG-03 (Metadata Display) ← FR-GAL-10
  FR-TAG-04 (Task Chain) ← FR-TAG-03
  FR-EXP-01 (Single Export) ← FR-GAL-10, FR-INF-05
  FR-EXP-02 (Batch Export) ← FR-EXP-01
  FR-EXP-03 (Format Selection) ← FR-EXP-01
  FR-EXP-04 (Reveal in Finder) ← FR-GAL-10
  FR-EXP-05 (Storage Display) ← FR-INF-05

Phase 5:
  FR-SET-05 (Prompt Presets) ← FR-SET-03, FR-GEN-07
```

### 6.2 Critical Path

The critical path is the longest chain of dependencies that must be completed sequentially:

```
FR-INF-01 → FR-INF-04 → FR-INF-07 → FR-KEY-01 → FR-KEY-02 →
FR-TASK-01 → FR-TASK-07 → FR-GAL-01 → FR-GAL-02 → FR-GAL-10 →
FR-PREV-01 → FR-EXP-01
```

This is 12 features long. No feature on this path can be skipped or deferred without breaking the MVP workflow.

---

## 7. Feature Traceability Matrix

### 7.1 Feature → TDD Endpoint Mapping

| Feature ID | Meshy API Endpoint(s) | Tauri Command(s) |
|---|---|---|
| FR-GEN-01 | POST /v2/text-to-3d (mode: preview) | create_text_to_3d |
| FR-GEN-02 | POST /v2/text-to-3d (mode: refine) | create_text_to_3d |
| FR-GEN-03 | POST /v1/image-to-3d | create_image_to_3d |
| FR-GEN-04 | POST /v1/multi-image-to-3d | create_multi_image_to_3d |
| FR-POST-01 | POST /v1/remesh | create_remesh |
| FR-POST-02 | POST /v1/retexture | create_retexture |
| FR-POST-03 | POST /v1/convert | create_convert |
| FR-POST-04 | POST /v1/resize | create_resize |
| FR-POST-05 | POST /v1/uv-unwrap | create_uv_unwrap |
| FR-POST-06 | POST /v1/rigging | create_rigging |
| FR-POST-07 | POST /v1/animations | create_animation |
| FR-IMG-01 | POST /v1/text-to-image | create_text_to_image |
| FR-IMG-02 | POST /v1/image-to-image | create_image_to_image |
| FR-PRINT-01 | POST /v1/print/multi-color | create_multi_color_print |
| FR-PRINT-02 | POST /v1/print/analyze | create_analyze_printability |
| FR-PRINT-03 | POST /v1/print/repair | create_repair_printability |
| FR-CLAB-01 | POST /creative-lab/keychain/v1/{prototype,build} | create_creative_lab_keychain |
| FR-CLAB-02 | POST /creative-lab/fridge-magnet/v1/{prototype,build} | create_creative_lab_fridge_magnet |
| FR-CLAB-03 | POST /creative-lab/figure/v1/{prototype,build} | create_creative_lab_figure |
| FR-CLAB-04 | POST /creative-lab/vinyl-figure/v1/{prototype,build} | create_creative_lab_vinyl_figure |
| FR-CLAB-05 | POST /creative-lab/brick-figure/v1/{prototype,build} | create_creative_lab_brick_figure |
| FR-CLAB-06 | POST /creative-lab/lamp/v1/{prototype,build} | create_creative_lab_lamp |
| FR-CLAB-07 | POST /creative-lab/keycap/v1/{prototype,build} | create_creative_lab_keycap |
| FR-TASK-01 | (varies by generation type) | (varies) |
| FR-TASK-02 | GET {endpoint}/{taskId} | poll_task |
| FR-TASK-03 | GET {endpoint}/{taskId}/stream | stream_task |
| FR-TASK-04 | DELETE {endpoint}/{taskId} | delete_task |
| FR-TASK-07 | (signed download URLs) | download_asset |
| FR-KEY-03 | GET /v1/balance | get_credit_balance |
| FR-POST-07 | GET /web/public/animations/resources | fetch_animation_library |

### 7.2 Feature → UI/UX Build Phase Mapping

| UI/UX Phase | Features |
|---|---|
| Phase 0: Scaffold | FR-INF-01, FR-INF-02, FR-INF-08 |
| Phase 1: Backend | FR-INF-03, FR-INF-04, FR-INF-05, FR-INF-06, FR-INF-07 |
| Phase 2: UI Shell | FR-KEY-01, FR-KEY-02, FR-KEY-03, FR-KEY-04, FR-SET-01, FR-SET-02, FR-SET-03, FR-SET-04, FR-NOTIF-02 |
| Phase 3: Generation | FR-GEN-01–07, FR-POST-01–07, FR-IMG-01–02, FR-PRINT-01–03, FR-CLAB-01–07, FR-TASK-01–07, FR-NOTIF-01, FR-NOTIF-03 |
| Phase 4: Asset Library | FR-GAL-01–10, FR-PREV-01–04, FR-TAG-01–04, FR-EXP-01–05 |
| Phase 5: Polish | FR-SET-05 |

### 7.3 Feature → CSD Standard Mapping

| CSD Standard Category | Applicable Features |
|---|---|
| CSD §4 (TypeScript) | All frontend features |
| CSD §5 (React) | All component features (FR-GEN-*, FR-GAL-*, FR-PREV-*, etc.) |
| CSD §6 (Rust) | All backend features (FR-INF-03–07) |
| CSD §7 (Tauri IPC) | FR-INF-02, FR-INF-07, all features that call Tauri commands |
| CSD §8 (State Management) | FR-KEY-02, FR-SET-03, FR-TASK-01, FR-GAL-01 |
| CSD §9 (Styling) | All UI features |
| CSD §10 (Error Handling) | FR-KEY-01, FR-GEN-01, FR-TASK-01, FR-NOTIF-03 |
| CSD §11 (Testing) | All features |
| CSD §12 (Security) | FR-INF-06, FR-KEY-01, FR-KEY-02 |
| CSD §13 (Performance) | FR-GAL-01, FR-GAL-06, FR-PREV-01, FR-PREV-04, FR-TASK-02 |

---

## 8. Out of Scope

The following are explicitly excluded from the MVP per TDD §2.2. They are documented here to prevent scope creep.

| Item | Rationale | Source |
|---|---|---|
| Multi-user collaboration or cloud sync | Personal-use desktop app; no server infrastructure | TDD §2.2 |
| In-app 3D editing (sculpting, vertex manipulation) | Out of scope; Meshy API does not support editing | TDD §2.2 |
| Custom animation authoring | Only preset application via API; no keyframe editing | TDD §2.2 |
| Plugin marketplace or extensibility framework | Not needed for personal use | TDD §2.2 |
| Direct slicer integration (Bambu/Orca/Cura bridging) | Available in Meshy web UI; deferred for MVP | TDD §2.2 |
| Mobile/web companion app | Desktop-only for MVP | TDD §2.2 |
| Automated pipeline scheduling / cron jobs | No background processing for MVP | TDD §2.2 |
| Light theme | Dark theme only for MVP (TD-01 in CSD §17.2) | TDD §9.5 |
| Auto-update mechanism | Manual download for MVP (TD-02 in CSD §17.2) | CSD §17.2 |
| Internationalization (i18n) | English only for MVP (TD-03 in CSD §17.2) | CSD §17.2 |
| Batch generation queue | One generation at a time for MVP (TD-06 in CSD §17.2) | CSD §17.2 |
| Asset versioning (forking) | No fork/branch of assets; each post-processing creates a new linked asset | TDD §2.2 |
| Cloud backup to GitHub Gist | Local-only storage for MVP | TDD §2.2 |
| Visual pipeline builder (node graph) | Post-MVP feature | TDD §18 |
| MCP server integration | Post-MVP feature | TDD §18 |

---

## 9. MVP Completion Criteria

### 9.1 Functional Completeness

The MVP is functionally complete when all 72 Must Have features are implemented and their acceptance criteria pass.

| Check | Criteria |
|---|---|
| All Must Have features implemented | 72/72 features pass acceptance criteria |
| All Should Have features implemented or deferred | 4/4 features either implemented or explicitly deferred with TD issue |
| No critical path feature missing | All 12 critical path features (§6.2) are implemented |

### 9.2 End-to-End Workflow Verification

The following end-to-end workflows must complete successfully on all three platforms (macOS, Windows, Linux):

| Workflow ID | Steps | Source |
|---|---|---|
| **E2E-01** | Launch app → enter API key → validate → see credit balance | UI/UX §15.1 |
| **E2E-02** | Text to 3D: enter prompt → generate preview → poll → download → appears in gallery → click → 3D preview loads → refine → download → new asset linked to parent | UI/UX §15.1 |
| **E2E-03** | Image to 3D: drag image → generate → poll → download → gallery → export as FBX → file saved to chosen path | UI/UX §15.1 |
| **E2E-04** | Post-processing: select existing asset → remesh → poll → download → new asset linked → retexture → poll → download → rigging → poll → download | UI/UX §15.1 |
| **E2E-05** | Error recovery: task fails → error displayed → retry → succeeds | UI/UX §15.1 |
| **E2E-06** | Offline mode: disconnect network → gallery loads from SQLite → 3D preview works → export works → only generation fails gracefully | UI/UX §15.1 |
| **E2E-07** | Credit exhaustion: create task → 402 → toast "Insufficient credits" → balance shows 0 → generation disabled | UI/UX §15.1 |
| **E2E-08** | Creative Lab: upload photo → prototype → build → download → appears in gallery | This document |
| **E2E-09** | Tag and search: add tags to asset → search by tag → filter works → remove tag → filter updates | This document |
| **E2E-10** | Batch export: select 3 assets → export all as GLB → progress bar → success toast | This document |

### 9.3 Quality Gate Verification

All quality gates from UI/UX §13 must pass:

| Gate | Criteria | Source |
|---|---|---|
| Automated: Lint | Biome: 0 errors | UI/UX §13.1 |
| Automated: Type check | tsc --noEmit: 0 errors | UI/UX §13.1 |
| Automated: Frontend tests | ≥ 70% lines, ≥ 70% functions | UI/UX §13.1 |
| Automated: Rust lint | Clippy: 0 warnings | UI/UX §13.1 |
| Automated: Rust tests | All pass | UI/UX §13.1 |
| Automated: Build | Tauri build succeeds on all 3 platforms | UI/UX §13.1 |
| Manual: Keyboard navigation | Every interactive element reachable via Tab | UI/UX §13.2 |
| Manual: Screen reader | All content announced, no unlabeled controls | UI/UX §13.2 |
| Manual: Contrast | All pairs ≥ 4.5:1 (normal) or ≥ 3:1 (large/UI) | UI/UX §13.2 |
| Manual: Reduced motion | All animations instant, spinners replaced | UI/UX §13.2 |
| Manual: Memory leak | No sustained growth after 20 open/close cycles | UI/UX §13.2 |
| Manual: Bundle size | Initial load ≤ 300 KB gzipped | UI/UX §13.2 |
| Manual: Offline mode | Local features work; only generation fails | UI/UX §13.2 |
| Manual: Error recovery | 402, 401, 429, network error all handled | UI/UX §13.2 |
| Manual: Cross-platform | Full workflow on macOS, Windows, Linux | UI/UX §13.2 |

### 9.4 Documentation Completeness

| Document | Status Required |
|---|---|
| TDD v1.0.0 | Final (no changes needed) |
| TSS v1.0.0 | Final (no changes needed) |
| UI/UX v1.0.0 | Final (no changes needed) |
| CSD v1.0.0 | Final (no changes needed) |
| FRD v1.0.0 (this document) | Final (no changes needed) |
| README.md | Updated with download links and usage instructions |
| docs/CONTRIBUTING.md | Complete with setup, conventions, PR process |
| docs/CHANGELOG.md | v1.0.0 release notes |

### 9.5 Release Readiness

| Check | Criteria |
|---|---|
| GitHub Release created | Tag v1.0.0 pushed, release workflow produces installers |
| Installers available | DMG (macOS arm64 + x86_64), MSI (Windows x64), DEB + AppImage (Linux x64) |
| README updated | Download links for all platforms |
| No open critical bugs | All Must Have feature acceptance criteria pass |
| Technical debt documented | All TD items from CSD §17.2 are in GitHub Issues with `tech-debt` label |

---
