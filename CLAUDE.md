# MeshyForge — Claude Code Guide

This is the project-wide entry point for Claude Code. Keep it concise and link
to the canonical project documents rather than copying their requirements.

## Project architecture

MeshyForge is a Tauri 2 desktop application with a React/TypeScript frontend
and a Rust backend.

- Frontend UI and forms live in `src/`. TanStack Query hooks access persisted
  or provider data; Zustand stores UI state and preferences.
- `src/lib/tauri.ts` is the frontend's only Tauri API boundary. It wraps IPC
  invocation, events, and local asset URLs.
- Rust modules live in `src-tauri/src/`. `src-tauri/src/lib.rs` creates shared
  `AppState` and registers the available Tauri commands.
- Rust commands validate inputs and coordinate the provider, SQLite storage,
  OS keychain, and local asset files. `TaskProvider` is the seam between
  commands and provider-specific HTTP behavior.
- SQLite schema changes are versioned migrations under `src-tauri/migrations/`.

Read [docs/claude-code-guide.md](docs/claude-code-guide.md) for the evidence
behind this map, document authority, and links to Anthropic's guidance.

## Project sources of truth

Follow the applicable project documents; do not restate or silently replace
their rules in this file.

- [Coding standards](docs/coding_standards.md) — implementation and testing
  conventions, including the React/Zustand/TanStack Query and IPC contracts.
- [Technical stack](docs/technical_stack_documentation.md) — technologies,
  platform decisions, and architecture.
- [UI/UX documentation](docs/UI_UX_Documentation.md) — component, state-access,
  accessibility, and performance requirements.
- [Security threat model](docs/security_threat_model.md) — security boundaries,
  mapped controls, and explicitly recorded residual risks.
- [Implementation execution plan](docs/implementation_execution_plan.md) —
  phase order and quality gates when the task is part of the planned build.
- [Repository expectations](docs/Github_Repository_Expectations.md) — branch,
  pull request, commit, and delivery requirements.
- [Rust type definitions](docs/rust_type_definitions.md) — Rust/TypeScript
  type-pair conventions.
- [Provider abstraction](docs/refactoring/provider-abstraction.md) — provider
  seam and refactoring decisions.
- [ADR index](docs/adr/README.md) — accepted architectural decisions.

When code and a document appear to disagree, inspect the implementation and
relevant decision history, report the concrete discrepancy, and do not silently
change either contract. Use the `adr-log` skill when a decision
needs an ADR.

## Non-negotiable boundaries

- Keep provider/API, filesystem, SQLite, and keychain access in Rust. Do not
  bypass the typed IPC wrapper from frontend code.
- Validate untrusted IPC inputs at the Rust command boundary before external or
  persistent side effects. Reuse existing validators and provider allowlists.
- Keep API keys in the OS keychain; do not return them to frontend state,
  persist them elsewhere, or log them. Never log signed download URLs.
- Canonicalize and constrain file paths before using them; use parameterized
  SQL; keep Tauri capabilities and CSP narrowly scoped.
- Do not add a SQLite schema change without a numbered migration. Use the
  personal `db-migration` skill.

The path-specific rules in `.claude/rules/` provide the relevant implementation
details only when Claude works in those areas.

## Working and verification

1. Inspect the relevant source, callers, tests, and governing documents before
   editing. Check the working tree and preserve unrelated user changes.
2. For bugs or regressions, establish the failure and add a focused regression
   test before applying the root-cause fix.
3. Keep changes scoped. Do not introduce dependencies, architectural
   decisions, or broad permission changes without justification.
4. Run the narrowest checks that prove the change. Report exact commands and
   results; never claim a check passed if it was not run.
5. For UI changes, also verify the rendered behavior when practical. For
   architecture or security boundary changes, verify both sides of the
   boundary and their registration/wiring.

Common checks (run from the repository root):

```powershell
npm run lint
npm run type-check
npm run test
npm run test:guardrails
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

Use only the checks relevant to the change; CI runs frontend checks, frontend
tests, Rust checks, and platform build smoke tests. See
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) for the exact CI steps.

## Skills and autonomy

- Project facts for personal skills: `.claude/project-adapter.md`; gates: `.claude/gates.json`; scaffolds: `.claude/scaffolds.md`.
- Personal skills: remediate, security-audit, boundary-audit, ui-audit, db-migration, pr-check, phase-gate, doc-sync, adr-log, scaffold, wrap-session, resume-session.
- Repo skills: new-meshy-endpoint, meshy-webhook-handler, meshy-checks.
- Autonomy: decide, log (`decision-log.mjs`), report; hard stops (see adapter) park, nothing else waits for approval.
- Done = `gate.mjs --level N` PASS; cargo missing = NOT_VERIFIED.