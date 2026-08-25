# Changelog

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