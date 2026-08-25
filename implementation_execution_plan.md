# Implementation Execution Plan — MeshyForge

## Document Metadata
| Field | Value |
|---|---|
| **Project** | MeshyForge — AI 3D Asset Studio |
| **Document Type** | Implementation Execution Plan (IEP) |
| **Version** | 1.0.0 |
| **Date** | 2026 |
| **Status** | Approved for Implementation |
| **Dependencies** | TDD v1.0.0, TSS v1.0.0, UI/UX v1.0.0, CSD v1.0.0, FRD v1.0.0, GREB v1.0.0 |
| **Origin** | Produced per Documentation Gap Assessment v1.0.0 §8 (Gap 1 — the only gap recommended for generation) |

---

## Table of Contents
1. [Purpose and Scope](#1-purpose-and-scope)
2. [How to Use This Document](#2-how-to-use-this-document)
3. [Inputs](#3-inputs)
4. [Phase 0 — Project Scaffold](#4-phase-0--project-scaffold)
5. [Phase 1 — Backend Foundation](#5-phase-1--backend-foundation)
6. [Phase 2 — Core UI Shell](#6-phase-2--core-ui-shell)
7. [Phase 3 — Generation Workflows](#7-phase-3--generation-workflows)
8. [Phase 4 — Asset Library](#8-phase-4--asset-library)
9. [Phase 5 — Polish and Release](#9-phase-5--polish-and-release)
10. [Execution Rules](#10-execution-rules)
11. [Appendix: Source Cross-Reference](#11-appendix-source-cross-reference)

---

## 1. Purpose and Scope

This document is the master instruction set for building MeshyForge v1.0.0. The six upstream design documents (TDD, TSS, UI/UX, CSD, FRD, GREB) collectively specify everything needed to build the MVP, but that specification is distributed across six documents and must be reassembled in the correct order at build time. This document performs that reassembly once, authoritatively, as a sequential checklist.

**This document adds no new specification.** Every step below indexes and sequences content that already exists in an upstream document; it never restates a code block, config file, schema, or acceptance criterion verbatim. Where full content is needed, follow the **Source** column to the exact upstream section.

This document was produced per the Documentation Gap Assessment v1.0.0 (`gap_assessment_documentation.md`), §6.1, which found the IEP to be the only gap with HIGH implementation value and LOW duplication risk among the seven gaps assessed as practical to generate.

---

## 2. How to Use This Document

The build is divided into 6 phases (Phase 0–5). **No phase may begin until the previous phase's quality gate has passed** (UI/UX §12.1). Within a phase, steps are numbered `{phase}.{step}` and each has four fields:

| Field | Content |
|---|---|
| **Action** | The concrete operation: create a file, run a command, install a dependency, or verify an outcome. |
| **Source** | The exact upstream document section containing the full specification or content for this step. |
| **Verification** | The observable pass condition, drawn from the phase quality gate or the relevant FRD acceptance criterion. |
| **Dependencies** | The step numbers that must be complete before this step, or "None" for phase-openers. |

A step's dependencies must all be satisfied before that step is started. A phase's quality gate must fully pass before the next phase's steps begin (GREB MLS-03 mirrors this at the milestone level).

---

## 3. Inputs

This plan was assembled from the following upstream sections:

- UI/UX §12 — 6 build phases with deliverables, dependencies, and quality gates.
- UI/UX §14.2 — Phase 0 file creation order (17 files).
- UI/UX §14.3 — Phase 2–4 component creation order (52 files).
- UI/UX §14.4 — Rust command registration order.
- FRD §6 — Feature dependency graph and critical path (12 features).
- FRD §7 — Feature traceability matrix (feature → endpoint, feature → phase, feature → CSD standard).
- FRD §5 — Acceptance criteria per feature (the per-step verification basis).
- CSD §14 — Git and version control standards (the PR/commit context for each phase).
- GREB §9 — Milestone mapping (phase → milestone).
- TSS §17 — Dependency manifests (`package.json`, `Cargo.toml`) and config file locations.

---

## 4. Phase 0 — Project Scaffold

**Goal:** Runnable Tauri + Vite + React shell with green CI.
**Milestone:** GREB §9.1 `Phase 0: Scaffold` · **Features:** FR-INF-01, FR-INF-02, FR-INF-08 (FRD §4.1)

| Step | Action | Source | Verification | Dependencies |
|---|---|---|---|---|
| 0.1 | Create `package.json` with all dependencies | TSS §17.1 | `npm install` succeeds with zero peer-dep warnings | None |
| 0.2 | Create `tsconfig.json` | TSS §3.3 | `npx tsc --noEmit` passes on an empty `src/` | 0.1 |
| 0.3 | Create `vite.config.ts` | TSS §4.3 | `npm run dev` serves on port 1420 | 0.1 |
| 0.4 | Create `biome.json` | TSS §15.3 | `npx biome check src/` passes | 0.1 |
| 0.5 | Create `eslint.config.js` | TSS §15.4 | ESLint runs with zero errors | 0.1 |
| 0.6 | Create `src/styles/globals.css` with `@theme` tokens | TSS §5.4 + §5.6 | Tokens resolve in a smoke-test component | 0.1 |
| 0.7 | Create `src/main.tsx` with `QueryClient` setup | TSS §6.6 | App bootstraps without runtime errors | 0.2, 0.6 |
| 0.8 | Create `src/App.tsx` placeholder rendering "MeshyForge" | UI/UX §12.2 | Text renders in the dev window | 0.7 |
| 0.9 | Create `src-tauri/Cargo.toml` | TSS §17.2 | `cargo build` succeeds | None |
| 0.10 | Create `src-tauri/tauri.conf.json` | TSS §2.3 | Config validates against Tauri schema | 0.9 |
| 0.11 | Create `src-tauri/capabilities/default.json` | TSS §2.4 | Capabilities load without permission errors | 0.10 |
| 0.12 | Create `src-tauri/src/main.rs` (Tauri builder, no commands) | UI/UX §12.2 | `npm run tauri dev` launches the app window | 0.9, 0.10, 0.11 |
| 0.13 | Create `src-tauri/src/lib.rs` (module declarations) | UI/UX §14.2 | Crate compiles | 0.12 |
| 0.14 | Create `src-tauri/build.rs` | UI/UX §14.2 | `cargo build` succeeds | 0.9 |
| 0.15 | Create `.github/workflows/ci.yml` | TSS §16.2 | CI runs green on all three platforms | 0.1, 0.9 |
| 0.16 | Create `.gitignore` | CSD §14.4 | No `node_modules`, `dist`, `target`, `*.db`, or `.env` committed | None |
| 0.17 | Create `README.md` with setup instructions | GREB §14.2 | Setup steps reproduce a clean dev environment | 0.1, 0.9 |

**Quality Gate** (UI/UX §12.2): `npm run tauri dev` launches; `npm run lint`, `npx tsc --noEmit`, `cargo clippy`, `cargo test` all pass; CI green on all platforms.

---

## 5. Phase 1 — Backend Foundation

**Goal:** All Rust backend modules functional and tested in isolation.
**Milestone:** GREB §9.1 `Phase 1: Backend` · **Features:** FR-INF-03–07 (FRD §4.1)

| Step | Action | Source | Verification | Dependencies |
|---|---|---|---|---|
| 1.1 | Create `src-tauri/src/meshy/client.rs` (`MeshyClient`) | TDD §7.1, CSD §6.2 | Unit tests pass with `wiremock` for 200/401/402/429/500 | Phase 0 gate |
| 1.2 | Create `src-tauri/src/meshy/models.rs` (Rust structs) | TDD §6.2 (canonical types), CSD §6.3 (pattern) | All structs deserialize sample API responses | 1.1 |
| 1.3 | Create `src-tauri/migrations/001_initial.sql` | UI/UX §12.3, TDD §6.1 | Migration applies cleanly to a temp DB | Phase 0 gate |
| 1.4 | Create `src-tauri/src/storage/database.rs` | TDD §7.3, CSD §6.5 | All CRUD unit tests pass with `tempfile` | 1.3 |
| 1.5 | Create `src-tauri/src/security/keychain.rs` | TDD §7.2, TSS §11 | Store/get/delete succeeds; Linux fallback compiles | Phase 0 gate |
| 1.6 | Create `src-tauri/src/commands/keychain.rs` | TDD §7.2, CSD §7.2 | `set_api_key`/`get_api_key`/`validate_api_key` callable via `invoke()` | 1.5 |
| 1.7 | Create `src-tauri/src/commands/api.rs` | TDD §7.2, CSD §7.2 | `get_credit_balance`, `download_asset` callable via `invoke()` | 1.1 |
| 1.8 | Create `src-tauri/src/commands/assets.rs` | TDD §7.2, CSD §7.2 | `reveal_in_file_manager`, `read_file_as_data_uri` callable | 1.4 |
| 1.9 | Wire `AppState` and register Phase 1 commands in `main.rs` | UI/UX §14.4 | All Phase 1 commands appear in `generate_handler!` | 1.6, 1.7, 1.8 |

**Quality Gate** (UI/UX §12.3): `cargo test` and `cargo clippy` pass; commands callable from frontend; SQLite DB created at correct platform path; keychain store/get works; credit balance returns a number with a valid key.

---

## 6. Phase 2 — Core UI Shell

**Goal:** Navigation, layout, settings, and API key management functional.
**Milestone:** GREB §9.1 `Phase 2: UI Shell` · **Features:** FR-KEY-01–04, FR-SET-01–04, FR-NOTIF-02 (FRD §4.1)

| Step | Action | Source | Verification | Dependencies |
|---|---|---|---|---|
| 2.1 | Create `src/lib/tauri.ts` (contract layer) | UI/UX §7.3 | Typed `invoke`, error parser, event listener compile | Phase 1 gate |
| 2.2 | Create `src/lib/meshy-types.ts` (all TS types) | TDD §6.2 | `tsc --noEmit` passes | 2.1 |
| 2.3 | Create `src/lib/constants.ts` | UI/UX §14.3 | Endpoint map and defaults compile | 2.2 |
| 2.4 | Create `src/lib/utils.ts` (`cn()`, formatters) | TSS §5.6 | `cn()` merges classes correctly | 2.1 |
| 2.5 | Create `src/stores/appStore.ts` | TSS §6.3, TDD §8.1 | Store exposes 4 state fields + 4 actions | 2.1 |
| 2.6 | Create `src/stores/taskStore.ts` | TSS §6.3, TDD §8.1 | Map add/update/remove/clear operations work | 2.1 |
| 2.7 | Create `src/stores/settingsStore.ts` (with `persist`) | CSD §8.2 | Settings persist across reloads | 2.1 |
| 2.8 | Install shadcn/ui components per UI/UX §4.5 | UI/UX §4.5, §14.5 | `npx shadcn@latest add` succeeds for all 16 | 0.1 |
| 2.9 | Create `src/components/common/Sidebar.tsx` | UI/UX §4, CSD §5 | Keyboard nav + ARIA labels pass | 2.5, 2.8 |
| 2.10 | Create `src/components/common/TopBar.tsx` | UI/UX §4, CSD §5 | Credit balance slot renders | 2.8 |
| 2.11 | Create `src/components/common/StatusBar.tsx` | UI/UX §4, CSD §5 | Active task count + storage display render | 2.6 |
| 2.12 | Create `src/components/settings/ApiKeyManager.tsx` | FRD FR-KEY-01/02, CSD §5 | Key entry/validate/store/delete works | 2.1, 2.8 |
| 2.13 | Create `src/components/settings/CreditBalance.tsx` | FRD FR-KEY-03/04, CSD §5 | Balance displays and refreshes on focus | 2.12 |
| 2.14 | Create `src/components/settings/PreferencesPanel.tsx` | FRD FR-SET-03, CSD §5 | Preferences persist via `settingsStore` | 2.7 |
| 2.15 | Create `src/components/settings/AboutPanel.tsx` | FRD FR-SET-04, CSD §5 | Version + API status link render | 2.8 |
| 2.16 | Create `src/app/layout.tsx` | UI/UX §3, FRD FR-SET-01 | TopBar + Sidebar + StatusBar + content area render | 2.9–2.11 |
| 2.17 | Create `src/app/routes.tsx` | UI/UX §12.4, FRD FR-SET-02 | Four views switch via `appStore.activeView` | 2.16 |
| 2.18 | Mount Sonner toast system at root | UI/UX §12.4, FRD FR-NOTIF-02 | Toast renders on a test trigger | 2.16 |

**Quality Gate** (UI/UX §12.4): four views render; API key entry/validate/store works; credit balance refreshes; sidebar collapses; StatusBar shows correct state; a11y audit passes; lint + tsc + component tests pass.

---

## 7. Phase 3 — Generation Workflows

**Goal:** All Meshy API generation endpoints accessible from the UI.
**Milestone:** GREB §9.1 `Phase 3: Generation` · **Features:** FR-GEN-01–07, FR-POST-01–07, FR-IMG-01–02, FR-PRINT-01–03, FR-CLAB-01–07, FR-TASK-01–07, FR-NOTIF-01, FR-NOTIF-03 (FRD §4.1)

| Step | Action | Source | Verification | Dependencies |
|---|---|---|---|---|
| 3.1 | Create `src/hooks/useMeshyApi.ts` (all mutation hooks) | CSD §8.3, UI/UX §7.4 | Each mutation calls the correct command | Phase 2 gate |
| 3.2 | Create `src/hooks/useTaskPolling.ts` | CSD §8.3 | Polling stops on terminal status | 3.1 |
| 3.3 | Create `src/hooks/useTaskStream.ts` | CSD §8.3, TDD §7.1 | SSE events update task state | 3.1 |
| 3.4 | Create `src/hooks/useDownloadAsset.ts` | CSD §8.4 (data-flow pattern); `hook_implementations.md` §2 (full implementation) | Download mutation writes file to disk | 3.1 |
| 3.5 | Create `src/hooks/useCreditBalance.ts` | CSD §8.3 | Balance query refetches on focus | 3.1 |
| 3.6 | Create `src/hooks/useAnimationLibrary.ts` | CSD §8.3, UI/UX §7.4 | Library query returns actions | 3.1 |
| 3.7 | Create `src/hooks/useNotifications.ts` | FRD FR-NOTIF-01, UI/UX §12.5 | OS notification fires on terminal status | 3.2 |
| 3.8 | Create `src/components/common/PromptEditor.tsx` | UI/UX §8, CSD §5 | Prompt input is keyboard-accessible | Phase 2 gate |
| 3.9 | Create `src/components/common/ImageDropzone.tsx` | FRD FR-GEN-05, CSD §5 | Drag-and-drop + file dialog work | 2.1 |
| 3.10 | Create `src/components/common/ModelSelector.tsx` | UI/UX §4, CSD §5 | Model dropdown selects valid values | 2.8 |
| 3.11 | Create `src/components/generate/TextTo3DPanel.tsx` | FRD FR-GEN-01/02, CSD §5 | Preview → refine full flow works | 3.1, 3.8, 3.10 |
| 3.12 | Create `src/components/generate/ImageTo3DPanel.tsx` | FRD FR-GEN-03, CSD §5 | Upload → create → poll → download works | 3.1, 3.9, 3.10 |
| 3.13 | Create `src/components/generate/MultiImagePanel.tsx` | FRD FR-GEN-04, CSD §5 | 1–4 image upload works | 3.12 |
| 3.14 | Create `src/components/generate/PostProcessPanel.tsx` | FRD FR-POST-01–05, CSD §5 | Remesh/retexture/convert/resize/UV forms submit | 3.1 |
| 3.15 | Create `src/components/generate/RiggingPanel.tsx` | FRD FR-POST-06, CSD §5 | Height input + generate works | 3.1 |
| 3.16 | Create `src/components/generate/AnimationPanel.tsx` | FRD FR-POST-07, CSD §5 | Library browse + action select + generate works | 3.6, 3.15 |
| 3.17 | Create `src/components/generate/ImageGenPanel.tsx` | FRD FR-IMG-01/02, CSD §5 | Text-to-image + image-to-image submit | 3.1, 3.9 |
| 3.18 | Create `src/components/generate/PrintPanel.tsx` | FRD FR-PRINT-01–03, CSD §5 | Multi-color/analyze/repair submit | 3.1 |
| 3.19 | Create `src/components/generate/CreativeLabPanel.tsx` | FRD FR-CLAB-01–07, CSD §5 | All 7 two-stage (prototype → build) flows submit | 3.1, 3.9 |
| 3.20 | Create `src/components/tasks/TaskMonitor.tsx` | FRD FR-TASK-06, CSD §5 | Active + recent tasks list renders | 3.2 |
| 3.21 | Create `src/components/tasks/TaskCard.tsx` | UI/UX §4, CSD §5 | Progress + status + action buttons render | 3.20 |
| 3.22 | Create `src/components/tasks/TaskProgressBar.tsx` | UI/UX §9, CSD §5 | Animated progress + percentage render | 3.21 |
| 3.23 | Create `src/components/tasks/TaskHistory.tsx` | FRD FR-TASK-06, CSD §5 | Collapsed past-task list renders | 3.20 |
| 3.24 | Add `create_*`, `poll_task`, `stream_task`, `delete_task` Rust commands | TDD §7.2, FRD §7.1 | Each command callable and returns typed response | Phase 1 gate |
| 3.25 | Register Phase 3 commands in `main.rs` | UI/UX §14.4 | All Phase 3 commands in `generate_handler!` | 3.24 |

**Quality Gate** (UI/UX §12.5): text-to-3D and image-to-3D full flows work; ≥3 endpoint types tested end-to-end; task monitor shows real-time progress; OS notification fires; error states (402/401/network) display; credit balance updates; all forms keyboard-accessible; component tests for `TextTo3DPanel` and `ImageTo3DPanel` pass; lint + tsc pass.

---

## 8. Phase 4 — Asset Library

**Goal:** Gallery, asset detail, 3D preview, tagging, search, and export functional.
**Milestone:** GREB §9.1 `Phase 4: Asset Library` · **Features:** FR-GAL-01–10, FR-PREV-01–04, FR-TAG-01–04, FR-EXP-01–05 (FRD §4.1)

| Step | Action | Source | Verification | Dependencies |
|---|---|---|---|---|
| 4.1 | Create `src/hooks/useAssets.ts` | CSD §8.3, UI/UX §7.4 | Paginated asset query returns rows | Phase 3 gate |
| 4.2 | Create `src/hooks/useUpdateTags.ts` | CSD §8.3 | Tag mutation persists | 4.1 |
| 4.3 | Create `src/hooks/useToggleFavorite.ts` | CSD §8.3 | Favorite mutation persists | 4.1 |
| 4.4 | Create `src/hooks/useUpdateNotes.ts` | CSD §8.3 | Notes mutation persists | 4.1 |
| 4.5 | Create `src/hooks/useDeleteAsset.ts` | CSD §8.3 | Delete removes record + files | 4.1 |
| 4.6 | Create `src/components/gallery/AssetGrid.tsx` | FRD FR-GAL-01/06, CSD §5 | Grid virtualizes above 100 items | 4.1 |
| 4.7 | Create `src/components/gallery/AssetCard.tsx` | FRD FR-GAL-02, CSD §5 | Thumbnail + title + tags + favorite + status render | 4.6 |
| 4.8 | Create `src/components/gallery/TagFilter.tsx` | FRD FR-GAL-04, CSD §5 | Tag dropdown filters grid | 4.6 |
| 4.9 | Create `src/components/gallery/SearchBar.tsx` | FRD FR-GAL-03, CSD §5 | Debounced full-text search filters grid | 4.6 |
| 4.10 | Create `src/components/gallery/AssetDetail.tsx` | FRD FR-GAL-10, CSD §5 | Metadata + notes + tags + actions render | 4.7 |
| 4.11 | Create `src/components/gallery/AssetPreview3D.tsx` (lazy) | FRD FR-PREV-01–04, TSS §7.4 | GLB loads via asset protocol; cleanup on unmount | 4.10 |
| 4.12 | Create `src/components/export/ExportDialog.tsx` | FRD FR-EXP-01/03, CSD §5 | Format select + destination + batch/single submit | 4.10 |
| 4.13 | Create `src/components/export/ExportProgress.tsx` | FRD FR-EXP-02, CSD §5 | Batch progress tracks correctly | 4.12 |
| 4.14 | Add `get_all_assets`, `search_assets`, `update_tags`, `toggle_favorite`, `update_notes`, `delete_asset`, `get_storage_usage` Rust commands | TDD §7.3, FRD §7.1 | Each command callable and returns expected shape | Phase 1 gate |
| 4.15 | Register Phase 4 commands in `main.rs` | UI/UX §14.4 | All Phase 4 commands in `generate_handler!` | 4.14 |

**Quality Gate** (UI/UX §12.6): gallery displays downloaded assets; card click opens detail with 3D preview; GLB renders with orbit controls; search + tag filter work; tags/notes/favorite persist; export writes to chosen path; delete removes record + files; virtualization works at 200+ mock assets; 3D preview unmounts cleanly; all interactions keyboard-accessible; component tests for `AssetCard`, `AssetGrid`, `AssetDetail` pass; lint + tsc pass.

---

## 9. Phase 5 — Polish and Release

**Goal:** Production-ready, cross-platform builds, documentation.
**Milestone:** GREB §9.1 `Phase 5: Polish` · **Features:** FR-SET-05 (FRD §4.1)

| Step | Action | Source | Verification | Dependencies |
|---|---|---|---|---|
| 5.1 | Implement prompt presets (save/load via `settings` table) | FRD FR-SET-05, UI/UX §12.7 | Preset save/load populates form fields | Phase 4 gate |
| 5.2 | Implement all empty states (UI/UX §9.2) and error states (UI/UX §9.3) | UI/UX §9.2, §9.3 | Each empty/error state renders correctly | Phase 4 gate |
| 5.3 | Add 429/5xx network retry logic | CSD §10, UI/UX §12.7 | Retry recovers from transient errors | 5.2 |
| 5.4 | Implement keyboard shortcuts (`Cmd/Ctrl+K`, `Escape`, `Delete`) | UI/UX §12.7 | Each shortcut fires its action | Phase 4 gate |
| 5.5 | Verify code-splitting (three-vendor chunk lazy-loads) | TSS §4.3, CSD §13 | Bundle analyzer confirms lazy chunks | Phase 4 gate |
| 5.6 | Bundle size audit (≤ 300 KB gzipped initial) | UI/UX §13.2 | Initial load meets threshold | 5.5 |
| 5.7 | Memory leak audit (open/close 3D preview ×20) | UI/UX §13.2 | No sustained memory growth | 4.11 |
| 5.8 | Accessibility audit (keyboard, screen reader, contrast, reduced motion) | UI/UX §5, §13.2 | All WCAG 2.1 AA checks pass | Phase 4 gate |
| 5.9 | Cross-platform testing (macOS arm64/x86_64, Windows x64, Linux x64) | TSS §20, UI/UX §12.7 | Full workflow passes on all 4 targets | 5.8 |
| 5.10 | Create `.github/workflows/release.yml` | TSS §16.3 | Release workflow produces dmg/msi/deb/AppImage on tag | 5.9 |
| 5.11 | Create `.github/workflows/audit.yml` | TSS §16.4 | Weekly npm + cargo audit runs | 0.1, 0.9 |
| 5.12 | Create `docs/CONTRIBUTING.md` | GREB §14 | Setup + conventions documented | Phase 4 gate |
| 5.13 | Create `docs/CHANGELOG.md` (v1.0.0) | GREB §10 | Release notes present | 5.10 |
| 5.14 | Update `README.md` with download links | GREB §14.2 | Download links present and valid | 5.10 |

**Quality Gate** (UI/UX §12.7): full E2E passes on all platforms; Playwright e2e covers first launch, API key setup, generate, gallery view, export; bundle ≤ 300 KB gzipped; no memory leaks; all a11y tests pass; lint + tsc + clippy + cargo test pass; release workflow produces valid installers; README correct.

---

## 10. Execution Rules

1. **No content duplication.** Every step points to its source section. This document never reproduces a code block, config file, or acceptance criterion verbatim — the Source column is the authority.
2. **One source of truth per fact.** A file's content lives in exactly one upstream section; this document cites that section only.
3. **Verification is observable.** Every step's verification is a check that can be run or observed, drawn from the phase quality gate or the relevant FRD acceptance criterion.
4. **Dependencies are explicit.** No step may run before its listed dependencies are complete.
5. **Phase gates are hard gates.** No phase begins until the previous phase's quality gate passes (UI/UX §12.1, GREB MLS-03).
6. **Milestone tracking.** Each phase corresponds to exactly one GitHub milestone (GREB §9.1, MLS-01). Issues for each feature listed under a phase should be opened and assigned to that milestone before work on the phase begins (GREB ISU-01, ISU-02).
7. **PR scope.** No PR may span more than 3 build phases (GREB PR-12); most steps in this plan correspond to a single file or a tightly related group of files and should be scoped to one PR each, per CSD file-size and PR-size limits (CSD ORG-10, GREB §7.3).

---

## 11. Appendix: Source Cross-Reference

| Phase | Milestone (GREB §9.1) | Features (FRD §4.1) | Primary Sources |
|---|---|---|---|
| 0 — Scaffold | `Phase 0: Scaffold` | FR-INF-01, FR-INF-02, FR-INF-08 | TSS §2–5, §15–17; UI/UX §12.2; CSD §14.4 |
| 1 — Backend | `Phase 1: Backend` | FR-INF-03–07 | TDD §6.1, §7; TSS §9–11; CSD §6, §12 |
| 2 — UI Shell | `Phase 2: UI Shell` | FR-KEY-01–04, FR-SET-01–04, FR-NOTIF-02 | UI/UX §3, §7, §14.3, §14.5; CSD §5, §8 |
| 3 — Generation | `Phase 3: Generation` | FR-GEN-01–07, FR-POST-01–07, FR-IMG-01–02, FR-PRINT-01–03, FR-CLAB-01–07, FR-TASK-01–07, FR-NOTIF-01/03 | TDD §7.2, §10; UI/UX §8, §12.5; CSD §5, §8.3 |
| 4 — Asset Library | `Phase 4: Asset Library` | FR-GAL-01–10, FR-PREV-01–04, FR-TAG-01–04, FR-EXP-01–05 | TDD §7.3; UI/UX §10, §12.6; CSD §5 |
| 5 — Polish | `Phase 5: Polish` | FR-SET-05 | UI/UX §5, §9, §13, §12.7; TSS §16, §20; GREB §10, §14 |

This document supersedes the miniature step sequence in `gap_assessment_documentation.md` §8 as the canonical, actionable IEP. The gap assessment document's own recommendation (§9.2) is now fulfilled; per its Documentation Production Roadmap, all seven design documents (TDD, TSS, UI/UX, CSD, FRD, GREB, IEP) are now complete and sufficient to build the MeshyForge MVP.

---

*End of Implementation Execution Plan — MeshyForge v1.0.0*
