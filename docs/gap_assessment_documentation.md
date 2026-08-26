# Documentation Gap Assessment — MeshyForge

## Document Metadata
| Field | Value |
|---|---|
| **Project** | MeshyForge — AI 3D Asset Studio |
| **Document Type** | Documentation Gap Assessment |
| **Version** | 1.0.0 |
| **Date** | 2025 |
| **Status** | Final |
| **Scope** | Gaps assessed as "Practical to generate? ✅ Yes" only |
| **Deferred Scope** | Partially-practical gaps (Gaps 2, 6, 10) — scheduled for a later run |
| **Dependencies** | TDD v1.0.0, TSS v1.0.0, UI/UX v1.0.0, CSD v1.0.0, FRD v1.0.0, GREB v1.0.0 |

---

## 1. Executive Summary

The existing six design documents are sufficient to build the MeshyForge MVP. They collectively cover architecture, data model, tooling, coding standards, UI/UX guardrails, feature requirements, and repository governance.

This assessment evaluates seven gaps that were classified as **practical to generate** in the source review. After applying a uniform criteria set — practicality, implementation value, duplication risk, and maintenance burden — **only one gap is recommended for generation: the Implementation Execution Plan (IEP)**. The remaining six practical gaps are not recommended because they would duplicate a canonical source of truth, restate information already derivable from patterns, or address post-MVP concerns.

The IEP is the single highest-value addition because it consolidates the build phases, file creation orders, and acceptance criteria into one sequential checklist. It adds no new specification content; it indexes and sequences what already exists.

### 1.1 Verdict at a Glance
| Gap | Description | Practical? | Implementation Value | Recommendation |
|---|---|---|---|---|
| 1 | Implementation Execution Plan (IEP) | ✅ Yes | HIGH | **GENERATE** |
| 3 | Complete Rust type definitions (`models.rs`) | ✅ Yes | MEDIUM | Do not generate |
| 4 | Complete Zustand store implementations | ✅ Yes | LOW–MEDIUM | Do not generate |
| 5 | Complete hook implementations | ✅ Yes | LOW | Do not generate |
| 7 | Test plan | ✅ Yes | LOW | Do not generate |
| 8 | Security threat model | ✅ Yes | LOW | Do not generate |
| 9 | User guide / end-user documentation | ✅ Yes | NONE (for MVP build) | Do not generate |

---

## 2. Scope and Exclusions

### 2.1 In Scope
This document assesses every gap from the source review for which "Practical to generate?" was answered **✅ Yes**. These are Gaps 1, 3, 4, 5, 7, 8, and 9. Each is evaluated against the criteria in §4 and given a definitive GENERATE / DO NOT GENERATE recommendation.

### 2.2 Out of Scope (Deferred to a Later Run)
The following gaps were marked "⚠️ Partially" or "⚠️ Not practical at documentation stage" in the source review and are **not** addressed here. They are reserved for a dedicated partials run:
- **Gap 2** — Ready-to-transcribe source files (partially specified; some pattern-level only).
- **Gap 6** — Complete component implementations (partially specified; writing them equals writing the application).
- **Gap 10** — API deprecation spec file (`api-spec.json`) — an implementation task, not a documentation task.

### 2.3 Non-Goals
- This document does not duplicate the full content of the six source documents. It references them by section.
- This document does not prescribe new features, standards, or guardrails. It only assesses whether to produce additional documents.
- This document does not evaluate the quality of existing documentation (that is covered by the source review's coverage assessment).

---

## 3. Generation Order Rationale

This document is structured in the order that maximizes consistency and accuracy for complete documentation production:

1. **Metadata** — fixes identity, version, and dependencies so every later section cites a stable baseline.
2. **Executive Summary** — states the verdict up front so the reader anchors on the outcome before reading details.
3. **Scope and Exclusions** — declares coverage and deferrals to prevent scope drift.
4. **Assessment Methodology** — defines the criteria so each gap is evaluated identically.
5. **Existing Documentation Baseline** — a compact reference inventory that the gap assessments cite without duplicating.
6. **Gap Assessment Details** — ordered by implementation value descending (HIGH → NONE). This places the single GENERATE decision first and lets each subsequent DO NOT GENERATE build on established reasoning.
7. **Consolidated Recommendation Summary** — a single table that reconciles all decisions.
8. **IEP Generation Execution Plan** — the actionable output: ordered steps to produce the one recommended document.
9. **Documentation Production Roadmap** — final status and next steps.
10. **Appendix: Cross-Reference Map** — traceability back to source sections for accuracy verification.

---

## 4. Assessment Methodology

Each gap is evaluated against four criteria. A recommendation of GENERATE requires practicality **and** high implementation value **and** no high-severity duplication or maintenance burden.

| Criterion | Question | Weight |
|---|---|---|
| **Practicality** | Can the document be produced mechanically or by consolidation from existing sources without inventing new specification? | Required (this run only includes ✅ Yes gaps) |
| **Implementation Value** | Does the document materially improve the ability to build the MVP, beyond what cross-referencing already provides? | Primary decision driver |
| **Duplication Risk** | Would generating the document create a second source of truth that could drift from the canonical source? | Veto — high risk disqualifies generation |
| **Maintenance Burden** | Would the document require ongoing updates that the existing documents do not? | Secondary decision driver |

### 4.1 Recommendation Rules
- **GENERATE** — Practical, HIGH implementation value, no high duplication risk.
- **DO NOT GENERATE** — Any of: implementation value is LOW or NONE; the content is a mechanical restatement of a canonical source; generation creates a parallel source of truth; or the deliverable is post-MVP.

---

## 5. Existing Documentation Baseline

The following inventory is referenced throughout this assessment. It is intentionally compact; full coverage details live in the source review.

| # | Document | Version | Role | Source of Truth For |
|---|---|---|---|---|
| 1 | Technical Design Document (TDD) | v1.0.0 | What to build (architecture, data model) | System architecture, SQLite schema, TypeScript types, Rust client/DB/command designs, endpoint coverage, security |
| 2 | Tech Stack Specification (TSS) | v1.0.0 | What tools to use (versions, configs, deps) | Exact dependency versions, 18 ready-to-transcribe config files, cross-platform matrix |
| 3 | UI/UX Guardrails and Build Document | v1.0.0 | How the UI must behave | Design tokens, component taxonomy, 126 guardrails, 6 build phases, quality gates, file creation order |
| 4 | Coding Standards Document (CSD) | v1.0.0 | How the code must be written | 198 coding standards, Rust/TypeScript patterns, error handling, testing patterns |
| 5 | Feature Requirements Document (FRD) | v1.0.0 | What features are required | 76 features with acceptance criteria, dependency graph, traceability matrix, MVP completion criteria (corrected 2026 — FRD's own §4.2/§4.3 summary tables previously understated this as 65; see FRD §4.2 correction note) |
| 6 | GitHub Repository Expectations (GREB) | v1.0.0 | How the repository must be governed | Branch model, commit/PR/issue standards, CI/CD, release process, dependency management |

External reference: the Meshy API is fully captured via `llms-full.txt` (100% of the API surface).

---

## 6. Gap Assessment Details

Gaps are presented in descending order of implementation value. This ordering places the single GENERATE decision first and lets each subsequent DO NOT GENERATE decision build on reasoning already established.

### 6.1 Gap 1 — Implementation Execution Plan (IEP)

| Field | Assessment |
|---|---|
| **Description** | A granular, sequential, step-by-step execution guide that consolidates the build phases, file creation orders, and acceptance criteria into a single actionable checklist. The UI/UX build phases define WHAT to build and in what order; the CSD defines file creation order; the FRD defines acceptance criteria. The IEP combines these into "Step 1: Create file X with content Y. Step 2: Run command Z. Step 3: Verify output W." |
| **Practical to generate?** | ✅ Yes — High value, moderate effort |
| **Implementation Value** | **HIGH** — A sequential checklist is more reliable to follow than cross-referencing six documents. The IEP is the "master instruction set" that references the other documents for detail. |
| **Duplication Risk** | **LOW** — The IEP does not restate specifications; it indexes them. Each step points to the exact source section containing the full content. No second source of truth is created. |
| **Maintenance Burden** | **LOW** — The IEP changes only when build phases or file creation order change, which are themselves stable in the source documents. |
| **What it would contain** | Per phase: ordered list of files to create, exact commands to run, verification steps, and cross-references to the document sections containing the full specifications. |
| **Recommendation** | **GENERATE** — This is the single most valuable missing document for implementation. |

**Rationale.** The existing documents already contain every piece of information needed, but that information is distributed across six documents and must be reassembled in the correct order at build time. The IEP performs that reassembly once, authoritatively, and emits a line-by-line checklist. It adds no new specification; it only sequences and points. This is the only gap where the implementation value is HIGH and the duplication risk is LOW.

---

### 6.2 Gap 3 — Complete Rust Type Definitions (`models.rs`)

| Field | Assessment |
|---|---|
| **Description** | CSD §6.3 shows the serde struct pattern with `rename_all = "camelCase"` and representative examples (`TaskObject`, `AssetRow`). The complete set of Rust structs mirroring every TypeScript type in TDD §6.2 is not written out. An implementer would derive ~20 structs from the TypeScript types. |
| **Practical to generate?** | ✅ Yes — Mechanical translation from TypeScript to Rust |
| **Implementation Value** | **MEDIUM** — Reduces translation work, but the pattern is clear and the TypeScript types are the source of truth. |
| **Duplication Risk** | **HIGH** — Generating a parallel set of Rust types creates a second source of truth that could drift from TDD §6.2 whenever a type changes. |
| **Maintenance Burden** | **MEDIUM** — Every TypeScript type change would require a mirrored Rust edit in this document. |
| **Recommendation** | **DO NOT GENERATE** — The pattern in CSD §6.3 is clear, and the TypeScript types in TDD §6.2 are canonical. The translation is straightforward at build time. |

**Rationale.** The value is real but bounded: the pattern is already demonstrated, and the canonical types already exist. The risk is unbounded: a parallel type set is a standing invitation for drift. The correct locus for the complete Rust structs is the source file `src-tauri/src/meshy/models.rs` at build time, not a design document.

---

### 6.3 Gap 4 — Complete Zustand Store Implementations

| Field | Assessment |
|---|---|
| **Description** | CSD §8.2 contains the complete `settingsStore` implementation. `appStore` and `taskStore` are partially specified in TDD §8.1 (full interface and action signatures) but the complete implementation — including `persist` middleware for settings and Map management for tasks — is not written out for all three stores. |
| **Practical to generate?** | ✅ Yes — The patterns are clear; the remaining work is mechanical |
| **Implementation Value** | **LOW–MEDIUM** — `settingsStore` is a complete reference. `appStore` is simple (4 state fields, 4 actions). `taskStore` uses a Map with add/update/remove/clear operations. These are derivable from the patterns. |
| **Duplication Risk** | **MEDIUM** — Full store code in a design document duplicates the reference implementation pattern and the interface signatures already in TDD §8.1. |
| **Maintenance Burden** | **LOW–MEDIUM** — Store behavior changes would require mirrored edits. |
| **Recommendation** | **DO NOT GENERATE** — The `settingsStore` in CSD §8.2 is a complete reference. The other two stores are simpler and follow the same pattern. |

**Rationale.** The reference implementation already teaches the pattern. Writing out the two simpler stores in a document would not teach anything new and would create a second location to maintain. The stores belong in `src/stores/` at build time.

---

### 6.4 Gap 5 — Complete Hook Implementations

| Field | Assessment |
|---|---|
| **Description** | CSD §8.3 has complete implementations for `useCreateTextTo3D` (mutation) and `usePollTask` (polling). `useDownloadAsset` is described only as a step in CSD §8.4's prose data-flow diagram — no standalone code block exists for it anywhere in CSD (corrected 2026; previously this row claimed a third fully-coded reference pattern). UI/UX §7.4 has a complete hook→command mapping table listing all 30 hooks. Only 2 hooks are fully implemented as code; the remaining 28, including `useDownloadAsset`, follow the same 2 patterns (a mutation hook that additionally handles a file-path response, in `useDownloadAsset`'s case). |
| **Practical to generate?** | ✅ Yes — All 27 remaining hooks follow one of the 3 patterns |
| **Implementation Value** | **LOW** — The 3 reference implementations plus the mapping table are sufficient. The remaining hooks are generated by substituting command names and types. |
| **Duplication Risk** | **MEDIUM** — Full hook code in a document duplicates the 3 reference patterns and the mapping table. |
| **Maintenance Burden** | **LOW** — Hooks change when commands change; the mapping table already tracks that. |
| **Recommendation** | **DO NOT GENERATE** — The 3 reference patterns plus the mapping table are sufficient. |

**Rationale.** This is the clearest case of "the pattern is the documentation." Three complete exemplars plus an exhaustive mapping table already specify every hook. Producing 27 more exemplars in a document adds volume, not information.

---

### 6.5 Gap 7 — Test Plan

| Field | Assessment |
|---|---|
| **Description** | CSD §11 defines testing standards, naming conventions, coverage targets, and patterns for both Rust and React. UI/UX §13 defines quality gates. FRD acceptance criteria define what must be tested. No dedicated document lists every test case by name, organized by build phase. |
| **Practical to generate?** | ✅ Yes — Can be derived from FRD acceptance criteria |
| **Implementation Value** | **LOW** — The FRD acceptance criteria are already written as Given/When/Then statements, which map directly to test cases. Tests are derivable from acceptance criteria. |
| **Duplication Risk** | **HIGH** — A separate test plan would restate the FRD acceptance criteria in test-case form. |
| **Maintenance Burden** | **MEDIUM** — Every acceptance criterion change would require a mirrored test-plan edit. |
| **Recommendation** | **DO NOT GENERATE** — The FRD acceptance criteria plus CSD testing patterns are sufficient. A separate test plan would duplicate the FRD. |

**Rationale.** The FRD is already a test plan in acceptance-criteria form. Reformatting Given/When/Then statements into a test-case list is a presentation change, not new information, and it creates a second document that must track every FRD edit.

---

### 6.6 Gap 8 — Security Threat Model

| Field | Assessment |
|---|---|
| **Description** | A formal threat model (e.g., STRIDE analysis) identifying threats, vulnerabilities, and mitigations for each component. |
| **Practical to generate?** | ✅ Yes — But likely overkill |
| **Implementation Value** | **LOW** — Security is already covered in TDD §11, CSD §12, and GREB §12 with specific rules (SEC-01–08, VAL-01–06, SAN-01–04). |
| **Duplication Risk** | **MEDIUM** — A STRIDE analysis would restate the existing security rules in threat-model vocabulary. |
| **Maintenance Burden** | **LOW** — Security posture is stable for the MVP. |
| **Recommendation** | **DO NOT GENERATE** — Overkill for a personal-use desktop app. The existing security standards are comprehensive. |

**Rationale.** The existing security coverage is already specific and enforceable (numbered rules with CI enforcement). A formal threat model would translate those rules into a different vocabulary without adding actionable controls. For a single-user desktop tool, the marginal value does not justify the parallel document.

---

### 6.7 Gap 9 — User Guide / End-User Documentation

| Field | Assessment |
|---|---|
| **Description** | A user-facing guide explaining how to use MeshyForge: setup, generating models, browsing the gallery, exporting, etc. |
| **Practical to generate?** | ✅ Yes |
| **Implementation Value** | **NONE for building the MVP** — User documentation is a post-MVP deliverable. The README and in-app empty states serve as user guidance for the MVP. |
| **Duplication Risk** | **LOW** — User-facing prose is distinct from design documents. |
| **Maintenance Burden** | **HIGH** — User guides must track every UI change and are typically written against the finished product, not the spec. |
| **Recommendation** | **DO NOT GENERATE** — Post-MVP. The README (GREB §14.2) and in-app empty states (UI/UX §9.2) are sufficient for MVP. |

**Rationale.** A user guide written against the specification, before the UI exists, will almost certainly be rewritten against the finished product. The MVP's user guidance is already covered by the README and in-app empty states. This is a v1.1 deliverable.

---

## 7. Consolidated Recommendation Summary

| Gap | Description | Practical? | Implementation Value | Duplication Risk | Recommendation | Primary Reason |
|---|---|---|---|---|---|---|
| 1 | Implementation Execution Plan (IEP) | ✅ Yes | HIGH | LOW | **GENERATE** | Only gap with HIGH value and LOW duplication; consolidates without restating |
| 3 | Complete Rust type definitions | ✅ Yes | MEDIUM | HIGH | Do not generate | Pattern is clear; TS types are canonical; parallel set risks drift |
| 4 | Complete Zustand store implementations | ✅ Yes | LOW–MEDIUM | MEDIUM | Do not generate | `settingsStore` is a complete reference; others are simpler |
| 5 | Complete hook implementations | ✅ Yes | LOW | MEDIUM | Do not generate | 3 reference patterns + mapping table are sufficient |
| 7 | Test plan | ✅ Yes | LOW | HIGH | Do not generate | FRD acceptance criteria are already test cases |
| 8 | Security threat model | ✅ Yes | LOW | MEDIUM | Do not generate | Existing security rules are comprehensive; overkill for personal app |
| 9 | User guide | ✅ Yes | NONE (MVP) | LOW | Do not generate | Post-MVP; written against finished product, not spec |

**Net result:** 1 of 7 practical gaps is recommended for generation. The IEP becomes the 7th design document.

---

## 8. IEP Generation Execution Plan

This section is the actionable output of the assessment: the ordered steps to produce the one recommended document (the Implementation Execution Plan). It is itself a miniature IEP for the IEP.

### 8.1 Inputs
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

### 8.2 Structure of the IEP
The IEP is organized as one numbered step sequence per phase. Each step has four fields:

| Field | Content |
|---|---|
| **Action** | The concrete operation: create a file, run a command, install a dependency, or verify an outcome. |
| **Source** | The exact upstream document section containing the full specification or content. |
| **Verification** | The observable pass condition, drawn from the phase quality gate or the relevant FRD acceptance criterion. |
| **Dependencies** | The step numbers that must be complete before this step, or "None" for phase-openers. |

### 8.3 Step Sequence

#### Phase 0 — Project Scaffold
Goal: runnable Tauri + Vite + React shell with green CI.

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

**Phase 0 Quality Gate** (UI/UX §12.2): `npm run tauri dev` launches; `npm run lint`, `npx tsc --noEmit`, `cargo clippy`, `cargo test` all pass; CI green on all platforms.

#### Phase 1 — Backend Foundation
Goal: all Rust backend modules functional and tested in isolation.

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

**Phase 1 Quality Gate** (UI/UX §12.3): `cargo test` and `cargo clippy` pass; commands callable from frontend; SQLite DB created at correct platform path; keychain store/get works; credit balance returns a number with a valid key.

#### Phase 2 — Core UI Shell
Goal: navigation, layout, settings, and API key management functional.

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

**Phase 2 Quality Gate** (UI/UX §12.4): four views render; API key entry/validate/store works; credit balance refreshes; sidebar collapses; StatusBar shows correct state; a11y audit passes; lint + tsc + component tests pass.

#### Phase 3 — Generation Workflows
Goal: all Meshy API generation endpoints accessible from the UI.

| Step | Action | Source | Verification | Dependencies |
|---|---|---|---|---|
| 3.1 | Create `src/hooks/useMeshyApi.ts` (all mutation hooks) | CSD §8.3, UI/UX §7.4 | Each mutation calls the correct command | Phase 2 gate |
| 3.2 | Create `src/hooks/useTaskPolling.ts` | CSD §8.3 | Polling stops on terminal status | 3.1 |
| 3.3 | Create `src/hooks/useTaskStream.ts` | CSD §8.3, TDD §7.1 | SSE events update task state | 3.1 |
| 3.4 | Create `src/hooks/useDownloadAsset.ts` | CSD §8.3 | Download mutation writes file to disk | 3.1 |
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

**Phase 3 Quality Gate** (UI/UX §12.5): text-to-3D and image-to-3D full flows work; ≥3 endpoint types tested end-to-end; task monitor shows real-time progress; OS notification fires; error states (402/401/network) display; credit balance updates; all forms keyboard-accessible; component tests for `TextTo3DPanel` and `ImageTo3DPanel` pass; lint + tsc pass.

#### Phase 4 — Asset Library
Goal: gallery, asset detail, 3D preview, tagging, search, and export functional.

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

**Phase 4 Quality Gate** (UI/UX §12.6): gallery displays downloaded assets; card click opens detail with 3D preview; GLB renders with orbit controls; search + tag filter work; tags/notes/favorite persist; export writes to chosen path; delete removes record + files; virtualization works at 200+ mock assets; 3D preview unmounts cleanly; all interactions keyboard-accessible; component tests for `AssetCard`, `AssetGrid`, `AssetDetail` pass; lint + tsc pass.

#### Phase 5 — Polish and Release
Goal: production-ready, cross-platform builds, documentation.

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

**Phase 5 Quality Gate** (UI/UX §12.7): full E2E passes on all platforms; Playwright e2e covers first launch, API key setup, generate, gallery view, export; bundle ≤ 300 KB gzipped; no memory leaks; all a11y tests pass; lint + tsc + clippy + cargo test pass; release workflow produces valid installers; README correct.

### 8.4 IEP Generation Rules
1. **No content duplication.** Every step points to its source section. The IEP never reproduces a code block, config file, or acceptance criterion verbatim.
2. **One source of truth per fact.** A file's content lives in exactly one source section; the IEP cites that section only.
3. **Verification is observable.** Every step's verification is a check that can be run or observed, drawn from the phase quality gate or the relevant FRD acceptance criterion.
4. **Dependencies are explicit.** No step may run before its listed dependencies are complete.
5. **Phase gates are hard gates.** No phase begins until the previous phase's quality gate passes (UI/UX §12.1).

---

## 9. Documentation Production Roadmap

### 9.1 Final Documentation Status
| Document | Status | Role |
|---|---|---|
| TDD v1.0.0 | ✅ Complete | What to build (architecture, data model) |
| TSS v1.0.0 | ✅ Complete | What tools to use (versions, configs, deps) |
| UI/UX v1.0.0 | ✅ Complete | How the UI must behave (tokens, a11y, build phases) |
| CSD v1.0.0 | ✅ Complete | How the code must be written (198 standards) |
| FRD v1.0.0 | ✅ Complete | What features are required (76 features, acceptance criteria) |
| GREB v1.0.0 | ✅ Complete | How the repository must be governed (69 rules) |
| IEP v1.0.0 | ⏳ Recommended | How to execute the build (sequential step-by-step guide) |
| **This document** | ✅ Complete | Which gaps to close and how (assessment + IEP generation plan) |

### 9.2 Next Steps
1. **Generate the IEP** as the 7th design document, following §8. The IEP is the only recommended generation target from this run.
2. **Defer partials** (Gaps 2, 6, 10) to a dedicated partials run. Those gaps require a different evaluation mode because their practicality is conditional.
3. **Do not generate** Gaps 3, 4, 5, 7, 8, 9 as standalone documents. Their content belongs in source files at build time, is already covered by canonical sources, or is a post-MVP deliverable.
4. **Begin implementation** once the IEP is generated. The six existing documents plus the IEP are sufficient to build the MVP.

---

## 10. Appendix: Cross-Reference Map

This map ties each gap assessment back to the exact source sections that justify the recommendation. Use it to verify any decision without re-reading the full source documents.

| Gap | Decision | Primary Source Sections | Justification Locus |
|---|---|---|---|
| 1 (IEP) | GENERATE | UI/UX §12, §14.2–14.4; FRD §5–7; CSD §14; GREB §9; TSS §17 | §6.1 — HIGH value, LOW duplication |
| 3 (Rust types) | DO NOT GENERATE | CSD §6.3 (pattern); TDD §6.2 (canonical TS types) | §6.2 — pattern clear; parallel set risks drift |
| 4 (Zustand stores) | DO NOT GENERATE | CSD §8.2 (reference impl); TDD §8.1 (interfaces) | §6.3 — reference sufficient; others simpler |
| 5 (Hooks) | DO NOT GENERATE | CSD §8.3 (2 coded patterns; corrected 2026 — previously stated as 3); UI/UX §7.4 (mapping table) | §6.4 — patterns + table sufficient |
| 7 (Test plan) | DO NOT GENERATE | FRD §5 (acceptance criteria); CSD §11 (testing); UI/UX §13 (gates) | §6.5 — FRD already test cases |
| 8 (Threat model) | DO NOT GENERATE | TDD §11; CSD §12; GREB §12 (SEC/VAL/SAN rules) | §6.6 — existing rules comprehensive |
| 9 (User guide) | DO NOT GENERATE | GREB §14.2 (README); UI/UX §9.2 (empty states) | §6.7 — post-MVP; written against finished product |

---

*End of Documentation Gap Assessment — MeshyForge v1.0.0*