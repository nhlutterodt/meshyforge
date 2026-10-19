# Project Adapter
## identity
MeshyForge. Tauri 2 + Rust (src-tauri/src/) + React/TS (src/) + SQLite. npm + cargo. base: main (inferred). Shell PowerShell. Cargo may be absent in cloud: report NOT_VERIFIED, never passed.
## authority
CLAUDE.md > docs/coding_standards.md, technical_stack_documentation.md, UI_UX_Documentation.md, security_threat_model.md (section 10 residual risks informational), implementation_execution_plan.md, Github_Repository_Expectations.md (GREB), rust_type_definitions.md, refactoring/provider-abstraction.md > docs/adr/README.md. technical_design_document.md 6.2 outranks Rust types. Code vs doc conflict: report, change neither. Audit: SEC-02 frontend persistence of key is the finding, not returning it; SEC-08 core:* exempt.
## commands
Mirrored in .claude/gates.json: lint, typecheck (npm run type-check), test, guardrails (test:guardrails), build, rust-test, rust-lint (clippy -D warnings), rust-fmt, rust-cov (inferred, cargo-llvm-cov).
## conventions
Branch {type}/{kebab}, commit `{type}({scope}): {imperative <=72}`, squash only, human merges (GREB). PR template .github/pull_request_template.md (may be absent). CI: .github/workflows/ci.yml.
## hard_stops
src-tauri/src/security/**, src-tauri/capabilities/**, src-tauri/tauri.conf.json (CSP), src-tauri/src/meshy/client.rs headers()/key handling, keychain code, src-tauri/src/webhook/** auth+exposure, **/.env*, signed URLs in logs, live-key provider calls. Security/dependency ADRs: decide+log.
## architecture
Only src/lib/tauri.ts imports @tauri-apps/api/core. Contract pair: tauri.ts or src-tauri/src/commands/*.rs <-> src/lib/meshy-types.ts. TaskProvider seam. Rule ids and scans: gates.json sweeps. ADRs: docs/adr.
## data
SQLite, local only, no live data (push_deploys: none). Migrations: src-tauri/migrations/NNN_snake.sql (3-digit, forward-only), registered in src-tauri/src/storage/database.rs via include_str!("../../migrations/..."). Exemplar 001_initial.sql. Do not write schema_version.
## docs
Roots docs/; ADR docs/adr (template via personal adr-log); audits docs/audits; handoffs .claude/handoffs (inferred). Ledger: docs/governance/task-manifest.yaml (sync: node scripts/governance/sync_task_ledger.mjs), routing docs/governance/model-routing.md. Doc edit => bump Version/Date + docs/CHANGELOG.md. Sync pairs in gates.json docs.pairs.
## scaffolds
Entries in .claude/scaffolds.md: endpoint, webhook, rust-ts-type-pair, query-hook, zustand-slice, feature-panel, migration. Thin skills: new-meshy-endpoint, meshy-webhook-handler, meshy-checks.
## thresholds
Levels L1 lint,typecheck,test,rust-test; L2 +guardrails,rust-lint,rust-fmt; L3 +build. Coverage floors (CSD 11.4): components 70, hooks 80, lib 90, stores 80; Rust meshy/ 80, storage/ 80, commands/ 60, security/ 50. Diff ok 300 / max 500. Debt cap 2 per PR. CI required: frontend-checks, frontend-tests, rust-checks, build-smoke.
