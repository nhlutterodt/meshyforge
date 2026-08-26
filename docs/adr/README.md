# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for MeshyForge.
Each ADR records a significant decision that constrains future code, along
with the context, options considered, and consequences that led to it.

## Index

| ID | Title | Status | Date | Area | Docs Affected | Related Rules |
|---|---|---|---|---|---|---|
| [ADR-0001](0001-ci-branch-trigger-reconciliation.md) | CI Branch-Trigger and Branching-Model Reconciliation | Accepted | 2026-08-25 | Governance / CI | `Github_Repository_Expectations.md` §11.4, §11.1; `technical_stack_documentation.md` §16.2; `feature_requirements_documentation.md`; `.github/workflows/ci.yml` | BRN-07, CI-01, MRG-03 |
| [ADR-0002](0002-signed-download-origin-policy.md) | Signed Download Origin Policy | Accepted | 2026-08-26 | Security | `coding_standards.md` §12; `technical_design_document.md` §11; `security_threat_model.md` §5, §10 | SEC-06, SEC-09 (proposed) |
| [ADR-0003](0003-preview-lighting-environment-preset.md) | 3D Preview Lighting — Environment Preset vs. Deterministic Local Lights | Accepted | 2026-08-26 | Architecture / UI | `technical_stack_documentation.md` §7.3, §7.4; `UI_UX_Documentation.md` §10.3, §10.1; `runtime-guardrails.test.ts` | VP-09 (proposed), VP-10 (proposed), VP-11 (proposed), VP-12 (proposed) |

## Conventions

- **Numbering:** Sequential, zero-padded to 4 digits (`0001`, `0002`, …).
- **Filename:** `NNNN-kebab-case-title.md`.
- **Status:** `Proposed` → `Accepted` → `Superseded by NNNN` or `Deprecated`.
- **Process:** ADRs are created by the `adr-log` skill. Downstream planning-doc
  edits are applied by the `doc-sync` skill after the ADR is accepted — `adr-log`
  never edits a planning doc directly.
- **Index regeneration:** This README is regenerated from the ADR files whenever
  a new ADR is added. Both `adr-log` and `doc-sync` (under its `--apply`
  allowlist) may regenerate this index.