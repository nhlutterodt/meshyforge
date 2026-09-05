# Changelog

## [Unreleased] — Governance

### Added

- **Agentic delivery governance** (ADR-0005): `docs/governance/task-manifest.yaml`, a durable task ledger any agent/machine can read cold and resume work from, projected into a queryable (gitignored, rebuildable) SQLite cache via `scripts/governance/sync_task_ledger.mjs`. `docs/governance/model-routing.md` defines capability tiers (T0 mechanical → T3 irreversible/high-blast-radius) so work routes to the cheapest tier proven sufficient, with an evidence-gated promotion/demotion rule. `.claude/skills/meshyforge-agent-orchestrator` turns a batch of findings/backlog items into risk-classified, tier-routed, ledger-tracked, dispatched work — handing off to `adr-log`, `doc-sync`, and `phase-gate-check` rather than duplicating them
- New devDependency: `js-yaml` (parses the task manifest in `sync_task_ledger.mjs`; devDependency only, outside `tsconfig.json`'s type-check scope)

### Fixed

- `.gitignore` no longer blanket-ignores `.claude/`, which had silently kept every governance skill (`adr-log`, `doc-sync`, `phase-gate-check`, and 11 others) untracked in git since they were introduced — a fresh clone had none of this tooling. Now only `.claude/state/` (generated, ephemeral) and `.claude/*.local.*` are ignored
- `package.json` version corrected from `1.0.0` to `1.0.2`, matching this changelog's actual latest entry — the field had not been bumped alongside the two prior releases
- Animation-library command coverage now exercises the configured provider and asserts the bare-array IPC result; the missing-API-key behavior has an independent negative-path test
- Signed-download regression coverage now rejects deceptive hosts at the URL validator and untrusted origins in all three download branches: model, thumbnail, and texture
- Rust test-only warnings were removed so `cargo clippy --tests -- -D warnings` completes without suppressions

## [1.0.2] — 2026-08-26

### Fixed

- The Animate tab no longer crashes to a black screen: the real Meshy animation-library endpoint returns `{"animations": [...]}`, not a bare array, but the backend passed the wrapper object straight through. `AnimationPanel`'s `(library ?? []).map(...)` threw on the object, and with no top-level error boundary anywhere in the app, the crash unmounted the whole React tree. `MeshyProvider::fetch_animation_library` now unwraps the `animations` key (falling back to an empty array if it's ever missing), and `useAnimationLibrary` adds a defensive `Array.isArray` guard as a second line of defense
- "Generate Image" (Text to Image / Image to Image) no longer 404s: the endpoints were hardcoded to `/v2/text-to-image` and `/v2/image-to-image`, but Meshy's real API is `/openapi/v1/text-to-image` and `/openapi/v1/image-to-image` — there is no v2. The Animate creation call had the same class of bug: `/v1/animation` instead of the real `/v1/animations`. `docs/feature_requirements_documentation.md` had the correct paths all along — the implementation had drifted from its own spec
- Root cause of the drift: the endpoint-path list was hardcoded independently in three places (`provider/meshy.rs`, `commands/api.rs`'s reverse lookup, and `commands/validation.rs`'s security allowlist), so a path could be fixed in one and missed in the others. `provider::meshy::ENDPOINT_MAP` is now the single canonical list; the other two derive from it. This also completes an ADR-0004 consequence (`validation.rs`'s allowlist becoming provider-supplied) that was decided but never implemented

### Added

- **Asset picker UX**: Rigging, Post-Process, Animation, and Print panels now offer a visual, thumbnail-driven picker (`AssetTaskPicker`, built on the existing `useAssets` data and the previously-unused `ui/command.tsx` combobox) for selecting an input task ID, instead of requiring users to hand-type a raw UUID. Each panel filters to eligible assets (a completed 3D model for Rigging/Post-Process/Print; a completed rigging task for Animation's rig-task-id field). A manual entry field remains available alongside the picker
- **Crash containment**: a shared `ErrorBoundary` component (generalized from the 3D-preview-only boundary that used to live in `AssetPreview3D.tsx`) now wraps every Generate tab panel, so a render-time crash in one panel shows an inline message instead of blacking out the whole app

## [1.0.1] — 2026-08-26

### Documentation Sync — ADR-0001, ADR-0002, ADR-0003

- **coding_standards.md** → v1.0.1: Corrected SEC-02 API-key presence contract (`Result<bool, String>` not `Option<String>`); added SEC-09 download-origin allowlist rule per ADR-0002; clarified GIT-08 secret-scan filename-only output
- **technical_design_document.md** → v1.0.1 (MVP): Updated `get_api_key` signature to `Result<bool, String>`; added `validate_download_url` calls to `download_asset` listing per ADR-0002; updated signed-download-URLs row with SEC-09 reference; replaced input-validation row with explicit-validator wording
- **security_threat_model.md** → v1.0.1: Added SEC-09 to Tampering mitigation (SSRF prevention via host allowlist); noted `assets.meshy.ai` TLS covered by reqwest defaults in Residual Risk #1
- **technical_stack_documentation.md** → v1.0.1: Replaced Drei barrel import with direct `@react-three/drei/core/*.js` module imports; removed Environment maps from bundle tree and helper list; updated lighting to match implementation (ambient 1.2, directional [5,8,5] at 2.5, no Environment preset) per ADR-0003; updated ci.yml example to `push: [main]` + all PRs per ADR-0001; noted `next-themes` as vestigial dependency
- **UI_UX_Documentation.md** → v1.0.1: Added VP-09 (Drei core-path imports), VP-10 (lazy module-load rejection), VP-11 (CSP connect-src scoping), VP-12 (deterministic local lights, no Environment preset) per ADR-0003; updated §10.3 lighting table to match implementation; updated 3D Viewport guardrail count 8→12 and total 126→130; removed Environment from deliverables list
- **test_plan.md** → v1.0.1: Corrected TC-INF-06-01 keychain service name from `com.meshyforge.app` to `meshyforge` to match implementation
- **Github_Repository_Expectations.md** → v1.0.1: Narrowed CI-01 from "every push to any branch" to "every push to `main` and every pull request" per ADR-0001; updated §11.1 ci.yml trigger description
- **feature_requirements_documentation.md** → v1.0.1: Updated acceptance criteria from "GIVEN a push to any branch" to "GIVEN a push to `main` or a pull request" per ADR-0001

### Code

- `.github/workflows/ci.yml`: Removed `develop` from push trigger; removed `branches` filter from `pull_request` per ADR-0001
- `src/lib/runtime-guardrails.test.ts`: Added VP-12 assertion (no Environment import, no external CDN in connect-src)

### Fixed

- Completed tasks (e.g. Multi-Image to 3D) now save to the Gallery: `save_completed_task`'s Rust parameter and the `AssetRow` struct's read-side field were renamed to `task_type` to match the frontend's `taskType` key, restoring the IPC argument-name match Tauri requires
- The API key's "Validate" button no longer fails on a correct key that carries incidental leading/trailing whitespace from copy-paste; the key is trimmed before being sent to `validate_api_key`/`set_api_key`
- The API key now actually persists in the OS credential store: `keyring` had no platform backend feature enabled, so it silently used an in-memory mock with no state shared between calls — every `get_api_key` looked empty regardless of a prior `set_api_key`. Enabled `windows-native`, `apple-native`, and `async-secret-service` (pure-Rust D-Bus, no `libdbus` system dependency) so Windows Credential Manager, macOS Keychain, and Linux Secret Service are used for real
- API key validation no longer fails with an indistinguishable "invalid" on a machine where an HTTPS-scanning antivirus or corporate TLS-inspecting proxy is trusted by the OS but not by `reqwest`'s bundled CA list: switched from `rustls-tls` to `rustls-tls-native-roots`, which sources trusted roots from the OS certificate store (matching what `curl`/the browser already trust) instead of only a bundled Mozilla list
- `validate_api_key` now logs the real failure reason (HTTP status/body, or the full network/TLS error chain) server-side instead of discarding it — a genuine key failing for any non-auth reason previously looked identical to a wrong key

### Authentication Regression Coverage

- `security::keychain::tests::real_keychain_uses_a_real_os_backend_not_the_mock` (Rust, always runs — no `--ignored` needed): fails fast if `keyring` ever resolves to the mock backend again, without touching a real OS credential store
- `commands::assets::tests::save_completed_task_command_args_match_frontend_payload_shape` and `meshy::client::tests::get_balance_reaches_real_api_without_a_tls_trust_error` (`#[ignore]`d — real network/keychain): assert a request to the real Meshy API reaches an HTTP response instead of failing at the TLS layer
- `src/lib/runtime-guardrails.test.ts`: three new assertions parsing `Cargo.toml` and `ApiKeyManager.tsx` directly — `keyring` keeps its platform features, `reqwest` keeps `rustls-tls-native-roots`, and the API key is trimmed before every `invoke` call that sends it
- `src/hooks/useActiveTaskPolling.test.tsx` and `src/components/settings/ApiKeyManager.test.tsx`: pinned exact IPC key sets and whitespace-trimming behavior with dedicated regression tests

### Architecture Decision Records

- ADR-0001: CI Branch-Trigger and Branching-Model Reconciliation (Option C — hybrid `main` push + all PRs)
- ADR-0002: Signed Download Origin Policy (Option A — exact host allowlist `assets.meshy.ai`, new SEC-09)
- ADR-0003: 3D Preview Lighting (Option B — deterministic local lights, new VP-12)

## [1.0.0] — 2026-08-25

### Added

- **Phase 0 — Project Scaffold**: Tauri 2 + Vite 6 + React 19 + TypeScript 5.7 shell with green CI
- **Phase 1 — Backend Foundation**: Rust backend with MeshyClient (HTTP, SSE streaming, file download), SQLite database (6 tables, 7 indexes), OS keychain integration, 28 Tauri commands
- **Phase 2 — Core UI Shell**: Navigation sidebar, top bar with credit balance, status bar, settings panel (API key, preferences, about), Sonner toast system
- **Phase 3 — Generation Workflows**: 15 mutation hooks, 9 generate panels (text-to-3D, image-to-3D, multi-image, post-processing, rigging, animation, image generation, print tools, creative lab), task monitor with real-time progress
- **Phase 4 — Asset Library**: Gallery grid with search and tag filter, asset detail with 3D preview (lazy-loaded R3F), tag management, notes, favorites, export dialog
- **Phase 5 — Polish and Release**: Empty/error states, keyboard shortcuts, prompt presets, release and audit CI workflows, contributing guide
- Runtime regression guardrails for Drei imports, Tauri asset CSP, preview failure containment, and antivirus-safe Vite configuration
- Security regression tests for command validation, asset-path confinement, upload signatures, download origins, filename allowlists, and API-key input
- A filename-only CI guardrail that rejects realistic Meshy API keys in tracked files

### Security

- Restricted task polling, streaming, and deletion to supported Meshy endpoints and UUID task IDs
- Restricted signed asset downloads to HTTPS on `assets.meshy.ai` and fixed model/texture filenames
- Validated credit-consuming request bodies in Rust before client acquisition or network access
- Confined reveal operations to canonical paths under the managed asset directory
- Validated PNG, JPEG, and WebP uploads by extension and file signature
- Sanitized database, filesystem, keychain, header, and internal errors at the IPC boundary
- Replaced production mutex, authorization-header, and startup panics with fallible error handling
- Removed plaintext environment-key setup instructions and restored `Cargo.lock` tracking for reproducible builds

### Fixed

- Task creation now registers active tasks before polling so notifications and Task Monitor remain synchronized
- Meshy snake_case polling responses now map explicitly to frontend and SQLite fields
- Successful tasks now persist, download locally, and invalidate Gallery data without requiring a restart
- Remote thumbnails bypass Tauri file conversion while local assets use the scoped asset protocol
- Gallery previews now load the downloaded GLB instead of a placeholder and contain loader or lazy-module failures inside the preview panel
- Drei preview helpers use direct module imports, avoiding the broken unused `Stats` dependency when root prebundling is disabled

### Technical Details

- 43 Rust unit tests (39 passing; 4 OS-keychain tests intentionally ignored in standard CI)
- 23 frontend regression tests across task polling, IPC mapping, runtime guardrails, and 3D preview behavior
- TypeScript passes `tsc --noEmit`; Biome completes with two known polling-hook dependency warnings
- `cargo clippy` passes with zero warnings
- Three-vendor chunk (Three.js + R3F) code-split for lazy loading
- Dark-only theme with `prefers-reduced-motion` support
- WCAG 2.1 AA accessibility compliance
- Cross-platform CI (macOS, Windows, Linux)