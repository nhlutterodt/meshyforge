# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for MeshyForge.
Each ADR records a significant decision that constrains future code, along
with the context, options considered, and consequences that led to it.

## Index

| ID | Title | Status | Date | Area | Docs Affected | Related Rules |
| --- | --- | --- | --- | --- | --- | --- |
| [ADR-0001](0001-ci-branch-trigger-reconciliation.md) | CI Branch-Trigger and Branching-Model Reconciliation | Accepted | 2026-08-25 | Governance / CI | `Github_Repository_Expectations.md` §11.4, §11.1; `technical_stack_documentation.md` §16.2; `feature_requirements_documentation.md`; `.github/workflows/ci.yml` | BRN-07, CI-01, MRG-03 |
| [ADR-0002](0002-signed-download-origin-policy.md) | Signed Download Origin Policy | Accepted | 2026-08-26 | Security | `coding_standards.md` §12; `technical_design_document.md` §11; `security_threat_model.md` §5, §10 | SEC-06, SEC-09 (proposed) |
| [ADR-0003](0003-preview-lighting-environment-preset.md) | 3D Preview Lighting — Environment Preset vs. Deterministic Local Lights | Accepted | 2026-08-26 | Architecture / UI | `technical_stack_documentation.md` §7.3, §7.4; `UI_UX_Documentation.md` §10.3, §10.1; `runtime-guardrails.test.ts` | VP-09 (proposed), VP-10 (proposed), VP-11 (proposed), VP-12 (proposed) |
| [ADR-0004](0004-task-provider-abstraction.md) | Task Provider Abstraction (Multi-Provider Support) | Accepted | 2026-08-26 | Architecture / IPC | `coding_standards.md` §7 (CTR-07, IPC-01–10), §8.1 (STT-01–07); `technical_design_document.md` §6.2, §7.1, §7.2 | CTR-07, IPC-01–10, STT-01–07 |
| [ADR-0005](0005-agentic-delivery-governance.md) | Agentic Delivery Governance — Task Ledger, Model Routing, Orchestration | Accepted | 2026-09-04 | Governance / Process | `docs/governance/README.md`, `docs/governance/model-routing.md`, `docs/governance/task-manifest.yaml`, `docs/CHANGELOG.md`, `.gitignore` | None (new process surface, no CSD/UI-UX/GREB rule IDs added) |
| [ADR-0006](0006-viewport-control-registry.md) | Viewport Control Registry — Local-First Client-Side Preview Controls | Accepted | 2026-09-05 | Architecture / UI | `UI_UX_Documentation.md` §10.1; `coding_standards.md` §19.1; `docs/governance/task-manifest.yaml` | VP-13 (proposed), VP-14 (proposed) |
| [ADR-0007](0007-export-asset-local-copy-with-on-demand-convert.md) | Export Asset — Local Copy, with On-Demand Remote Convert for Missing Formats | Accepted | 2026-09-05 | Architecture / IPC | `feature_requirements_documentation.md` FR-EXP-01/03; `coding_standards.md` VAL namespace; `docs/governance/task-manifest.yaml` | VAL-07 (proposed) |
| [ADR-0008](0008-persistence-integrity-audit-and-recovery.md) | Persistence Integrity, Audit, and Full Recovery Strategy | Accepted | 2026-09-05 | Contract / Security / Storage | `technical_design_document.md` §6.1, §7.3; `coding_standards.md` §11, §12, §19.1; `security_threat_model.md` §10; `docs/governance/task-manifest.yaml` | RST-DB-01–03 (proposed) |
| [ADR-0009](0009-restart-mode-database-recovery.md) | Restart-Mode Database Recovery | Accepted | 2026-09-05 | Architecture / Security / Process | `src-tauri/src/main.rs`; `src-tauri/src/app_state.rs`; `docs/security_threat_model.md` §6, §8, §10; `docs/coding_standards.md` §12 | RST-DB-04–05 (proposed) |
| [ADR-0010](0010-viewport-animation-playback-runtime.md) | Viewport animation playback via the viewport-control registry | Accepted | 2026-09-11 | Architecture / UI | `src/components/gallery/AssetPreview3D.tsx`; `src/hooks/useViewportControls.ts` | VP-13 (proposed), VP-14 (proposed) |
| [ADR-0011](0011-animation-library-source-and-preview-image-origin.md) | Animation library source endpoint and preview-image origin | Accepted | 2026-09-11 | Architecture / UI | `src-tauri/src/provider/meshy.rs`; `src-tauri/src/commands/validation.rs`; `src-tauri/tauri.conf.json` | SEC-10 (proposed), SEC-11 (proposed), SEC-12 (proposed) |
| [ADR-0012](0012-text-to-motion-and-multi-clip-animation-lane.md) | Text-to-Motion + Multi-Clip Animation Lane (Retarget & Merge) | Accepted | 2026-09-17 | Architecture / IPC | `src-tauri/src/provider/meshy.rs`; `src-tauri/src/commands/validation.rs`; `src/hooks/useActiveTaskPolling.ts`; `src/components/generate/AnimationPanel.tsx`; `docs/LESSONS_LEARNED.md` #13 | FR-POST-07, SEC-09, SEC-10 (proposed) |
| [ADR-0013](0013-version-number-semantics.md) | Version Number Semantics and Single Version Source | Accepted | 2026-10-11 | Governance / Release | `Github_Repository_Expectations.md` §10.1–10.2; `coding_standards.md` GIT-06; `docs/SECURITY.md`; `package.json`; `src-tauri/Cargo.toml`; `src-tauri/tauri.conf.json`; `src/lib/constants.ts` | REL-01–05, REL-02 (suspended), REL-06–08 (proposed), GIT-06 |
| [ADR-0014](0014-bundle-targets-and-platform-release-scope.md) | Bundle Targets and Platform Release Scope | Accepted | 2026-10-11 | Release / Packaging | `src-tauri/tauri.conf.json`; `Github_Repository_Expectations.md` §10.3; `security_threat_model.md` §10; `README.md` | REL-09 (proposed), REL-10 (proposed), REL-02, FRD §9 |
| [ADR-0015](0015-normalized-task-snapshot-at-the-provider-response-boundary.md) | Normalized Task Snapshot at the Provider Response Boundary | Accepted | 2026-10-30 | Contract / IPC | `docs/adr/0004-task-provider-abstraction.md`; `coding_standards.md` §7.1; `technical_design_document.md` §6.2, §7.1, §7.2; `hook_implementations.md`; `rust_type_definitions.md`; `docs/refactoring/implementation-artifacts.md`; `docs/governance/task-manifest-addendum-2026-09-11.yaml` | TPC-01–06 (proposed), CTR-07, IPC-01, IPC-04, IPC-06, VAL-01 |
| [ADR-0016](0016-mock-runtime-ipc-round-trip-harness.md) | MockRuntime IPC Round-Trip Harness at the Command Boundary | Accepted | 2026-11-08 | Contract / Architecture / Test | `coding_standards.md` §7.1; `test_plan.md`; `technical_stack_documentation.md` §9; `CONTRIBUTING.md`; `implementation_execution_plan.md` Phase 5 gate; `src-tauri/src/lib.rs`; `src-tauri/build.rs` | IPC-11 (proposed), IPC-01–10, TST-10, TC-INF-07-01 |
| [ADR-0017](0017-dep-06-as-spdx-expression-policy.md) | DEP-06 as an SPDX-Expression Policy | Accepted | 2026-11-23 | Dependency / Governance | `Github_Repository_Expectations.md` §13.1; `docs/legal-metadata-baseline.md` §4; new `deny.toml`; `.github/workflows/ci.yml` | DEP-06, DEP-11 (proposed), DEP-12 (proposed) |
| [ADR-0018](0018-per-asset-rights-record-predicates-derived-identifier.md) | Per-Asset Rights Record — Predicates Stored, Identifier and Reason Derived | Accepted | 2026-11-23 | Contract / Data | `docs/legal-metadata-baseline.md` §3, §5; `technical_design_document.md` §6.1; `rust_type_definitions.md`; `src-tauri/migrations/004_legal_metadata.sql` | LM-01, LM-05 |
| [ADR-0019](0019-export-rights-record-sidecar-baseline-glb-projection.md) | Export Carries a Rights Record — Sidecar Baseline, GLB as a Projection | Accepted | 2026-11-23 | Contract / Architecture | `feature_requirements_documentation.md` FR-EXP-01/03; `technical_design_document.md` §7; `rust_type_definitions.md`; `src/lib/tauri.ts`; `src-tauri/src/commands/assets.rs` | LM-02, LM-03, LM-04, VAL-07 (proposed) |
| [ADR-0020](0020-delete-asset-removes-record-and-managed-files.md) | Deleting an Asset Removes Its Record and Its Managed Files | Accepted | 2026-11-23 | Contract / Security | `docs/SECURITY.md` §Local Data; `src-tauri/src/commands/assets.rs`; `src-tauri/src/storage/database.rs`; `docs/legal-metadata-baseline.md` §6 | SEC-C (review tag), OW-3 (review tag) |
| [ADR-0021](0021-promote-sha2-and-hex-for-prompt-digest.md) | Promote `sha2` and `hex` to Direct Dependencies for the Prompt Digest | Accepted | 2026-11-23 | Dependency | `src-tauri/Cargo.toml`; `docs/legal-metadata-baseline.md` §5 | DEP-06, LM-02 |
| [ADR-0022](0022-capture-rights-predicates-update-asset-rights-command.md) | Capture the Rights Predicates — One `update_asset_rights` Command | Accepted | 2026-11-23 | Contract / IPC | `src/lib/tauri.ts`; `src-tauri/src/commands/assets.rs`; `src/hooks/useUpdateAssetRights.ts`; `src/components/gallery/AssetDetail.tsx`; `docs/legal-metadata-baseline.md` §3 | LM-01, LM-05, IPC-11 (proposed) |

## Conventions

- **Numbering:** Sequential, zero-padded to 4 digits (`0001`, `0002`, …).
- **Filename:** `NNNN-kebab-case-title.md`.
- **Status:** `Proposed` → `Accepted` → `Superseded by NNNN` or `Deprecated`.
- **Process:** ADRs are created by the `adr-log` skill. Downstream planning-doc
  edits are applied by the `doc-sync` skill after the ADR is accepted — `adr-log`
  never edits a planning doc directly.
- **Index regeneration:** This README is regenerated from the ADR files whenever
  a new ADR is added. Both `adr-log` and `doc-sync` (under its `--apply`
  allowlist) may regenerate this index file.

<!-- End of ADR index. -->