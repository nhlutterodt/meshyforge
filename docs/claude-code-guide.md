# Claude Code in MeshyForge

This guide explains the checked-in Claude Code instruction layout and the
project evidence it is based on. It complements the specifications; it does not
create a second set of product or coding requirements.

## Instruction layout

| File | Purpose | Loading |
|---|---|---|
| [`../CLAUDE.md`](../CLAUDE.md) | Short project map, authority links, standing boundaries, and verification commands | Project-wide, every Claude Code session |
| [`.claude/rules/frontend.md`](../.claude/rules/frontend.md) | Frontend state, IPC use, and UI implementation reminders | For matching `src/` TypeScript files |
| [`.claude/rules/rust-backend.md`](../.claude/rules/rust-backend.md) | Rust command, provider, storage, validation, and test reminders | For Rust backend and migration files |
| [`.claude/rules/ipc-contract.md`](../.claude/rules/ipc-contract.md) | Cross-layer contract and registration checks | For IPC callers, types, hooks, commands, and registration |
| [`.claude/skills/`](../.claude/skills/) | Existing repeatable, task-specific workflows | Loaded on demand by skill description or direct invocation |

Keep always-loaded instructions short. Put area-specific rules in path-scoped
files and repeatable procedures in skills. Do not add settings or hooks merely
to restate instructions: use deterministic enforcement only where the project
has a concrete need and the behavior is understood.

## Architecture confirmed in the source

The guide describes the current code, not an aspirational diagram:

1. React components use application hooks; for example, `src/hooks/useAssets.ts`
   calls `invoke` from `src/lib/tauri.ts`.
2. `src/lib/tauri.ts` is the single frontend Tauri API boundary. It wraps
   `invoke`, event listening, and local asset URL conversion.
3. `src-tauri/src/lib.rs` constructs and manages `AppState`, installs the
   plugins, and registers commands with `tauri::generate_handler!`.
4. `src-tauri/src/commands/` contains IPC handlers. API commands use shared
   validation and delegate provider operations; asset commands constrain local
   file access.
5. `src-tauri/src/provider/` defines `TaskProvider`; `AppState` owns the
   provider, `Database`, and application data directory.
6. `src-tauri/src/storage/database.rs` tracks and applies registered numbered
   migrations. Secret operations live behind the Rust keychain layer.
7. Frontend state ownership follows the standards: TanStack Query for data,
   Zustand for UI state/preferences, and local component state for forms.

Useful code landmarks:

- [`src/lib/tauri.ts`](../src/lib/tauri.ts)
- [`src/hooks/useAssets.ts`](../src/hooks/useAssets.ts)
- [`src/stores/taskStore.ts`](../src/stores/taskStore.ts)
- [`src-tauri/src/lib.rs`](../src-tauri/src/lib.rs)
- [`src-tauri/src/app_state.rs`](../src-tauri/src/app_state.rs)
- [`src-tauri/src/provider/mod.rs`](../src-tauri/src/provider/mod.rs)
- [`src-tauri/src/storage/database.rs`](../src-tauri/src/storage/database.rs)
- [`src-tauri/src/commands/api.rs`](../src-tauri/src/commands/api.rs)
- [`src-tauri/src/commands/assets.rs`](../src-tauri/src/commands/assets.rs)

## Which project document governs

Use the narrowest applicable source document and its cited upstream authority:

| Question | Start here |
|---|---|
| Coding, tests, Rust/TypeScript conventions | [`coding_standards.md`](coding_standards.md) |
| Stack choices and architecture | [`technical_stack_documentation.md`](technical_stack_documentation.md), relevant ADRs |
| UI behavior, accessibility, component/state rules | [`UI_UX_Documentation.md`](UI_UX_Documentation.md) |
| Security controls and known residual risks | [`security_threat_model.md`](security_threat_model.md), then the cited canonical rule |
| Sequencing and phase acceptance | [`implementation_execution_plan.md`](implementation_execution_plan.md) |
| Rust/TypeScript type pairing | [`rust_type_definitions.md`](rust_type_definitions.md) |
| Provider abstraction | [`refactoring/provider-abstraction.md`](refactoring/provider-abstraction.md), [ADR index](adr/README.md) |
| Branch, PR, and release expectations | [`Github_Repository_Expectations.md`](Github_Repository_Expectations.md) |

If sources conflict, do not invent a resolution or silently broaden scope.
Inspect the relevant code and decision record, state the discrepancy and its
impact, and use the project's ADR workflow for a decision that constrains
future work. The threat model is a reference analysis; its residual-risk list
must not be mistaken for accepted new controls.

## Verification commands

The scripts and CI workflow were checked against `package.json` and
`.github/workflows/ci.yml`. From the repository root:

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

CI additionally runs the Tauri build smoke test on supported platform targets.
Choose focused checks for the changed surface, then report the exact command
and observed result. Do not describe an unrun check as passing.

## Design rationale and references

This layout follows current Claude Code guidance:

- Keep project memory concise, concrete, and focused on facts that apply across
  sessions; use path-scoped rules for file-specific guidance and skills for
  repeatable workflows.
- Separate exploration/planning from implementation when scope or architecture
  is uncertain.
- Give changes observable verification, and report the actual evidence rather
  than relying on visual confidence.
- Treat instruction files as guidance, not enforcement; do not imply that
  prose-only rules are hard security controls.

Anthropic documentation:

- [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- [Memory and `CLAUDE.md` files](https://code.claude.com/docs/en/memory)
- [Skills](https://code.claude.com/docs/en/skills)
- [Permissions](https://code.claude.com/docs/en/permissions)
- [Custom subagents](https://code.claude.com/docs/en/sub-agents)

Review these links when changing the instruction layout; product behavior and
configuration are version-sensitive.
