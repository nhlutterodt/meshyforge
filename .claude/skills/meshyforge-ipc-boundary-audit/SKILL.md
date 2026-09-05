---
name: meshyforge-ipc-boundary-audit
description: >-
  Audits the Tauri IPC contract (IPC-01-10, CTR-01-10) and the Zustand/
  TanStack Query state boundary (STT-01-07) for MeshyForge — checks that
  Tauri commands return Result<T, String>, use snake_case names, are
  registered in generate_handler!, validate input before API calls, and that
  only src/lib/tauri.ts imports @tauri-apps/api/core; checks that Zustand
  stores never hold server/API data and never import @tanstack/react-query or
  @tauri-apps/api. Use when reviewing src/lib/tauri.ts, src/stores/*, Rust
  files under src-tauri/src/commands/, or any PR touching the IPC contract
  or state management boundary. Use before merging changes to commands,
  stores, or hooks, or when asked to check IPC/state-boundary compliance.
---

# MeshyForge IPC Boundary Audit

Merged audit of two related boundaries that both guard against the same class
of bug — server/platform concerns leaking into the wrong layer:

1. **IPC contract** — the Rust↔TypeScript command interface (IPC-01–10 in
   `coding_standards.md` §7.1; CTR-01–10, canonically defined in
   `UI_UX_Documentation.md` §7 and restated in CSD §2.3's alignment matrix).
2. **State boundary** — where data is allowed to live on the frontend
   (STT-01–07, CSD §8.1, with the three canonical store implementations in
   `zustand_store_implementations.md`).

This is a read-only audit skill — it reports findings, it does not modify code.

## Before anything else: confirm there is code to review

MeshyForge is greenfield until Phase 0/1 of `implementation_execution_plan.md`
produce `src/lib/tauri.ts` (step 2.1) and the Rust command modules (Phase 1
steps 1.6–1.8, Phase 3 step 3.24). `src/stores/*.ts` land in Phase 2 (steps
2.5–2.7).

- If `src/lib/tauri.ts`, `src/stores/`, or `src-tauri/src/commands/` don't
  exist yet, say so plainly and stop for that half of the audit — e.g. "No
  Zustand stores exist yet (Phase 2 not started); state-boundary audit is not
  yet applicable." Do not fabricate contract violations against files that
  don't exist.
- If only one side exists (e.g. stores exist but no commands yet, or vice
  versa), audit the side that exists and report the other as not-yet-applicable.

## Part A — IPC contract rules

Source: CSD §7.1 (IPC-01–10) for the Rust-side mechanics, UI/UX §7 (CTR-01–10)
for the decoupling contract. Read both before citing — they overlap but are
not identical numbering.

| Rule | Check |
|---|---|
| IPC-01 / CTR-... | Every `#[tauri::command]` returns `Result<T, String>` where `T: Serialize` and the `String` is a JSON-encoded error (`{"code":...,"message":...}`), matching the pattern in CSD §6.2/§7.2. |
| IPC-02 | Command parameters are owned types (`String`, `i64`, `bool`, `serde_json::Value`, or `Deserialize` structs) — no raw `&str` parameters. |
| IPC-03 | Command names are snake_case (`create_text_to_3d`, not `createTextTo3D`). |
| IPC-04 / CTR-09 | Every command validates required inputs *before* calling the Meshy API — missing/invalid fields return an error without any HTTP call. |
| IPC-05 | Commands access `MeshyClient` via `State<'_, AppState>` — never construct a new client inline. |
| IPC-06 | Commands never log the API key, key-bearing request bodies, or signed-URL response bodies. |
| IPC-07 / CTR-06 | Long-running commands (SSE streaming, batch downloads) emit events via `app.emit()`; the frontend listens via `listen()`/`onEvent()` — never opens its own network connection. |
| IPC-08 | No command blocks the main thread — all commands are `async fn` using `tokio` for I/O. |
| IPC-09 | Every command is registered in `main.rs`'s `tauri::generate_handler![...]`. An unregistered command is a finding (it silently fails at runtime). Cross-check the command list in the source file against the `generate_handler!` macro call. |
| IPC-10 / CTR-07 | The frontend calls commands **only** through `src/lib/tauri.ts`'s `invoke<T>()` wrapper. Grep the entire `src/` tree for `@tauri-apps/api/core` imports outside `src/lib/tauri.ts` — any match is a CTR-07/IPC-10/RCT-10 violation. |
| CTR-01 | Every Tauri command has a matching TypeScript type in `src/lib/meshy-types.ts` with identical fields (snake_case Rust ↔ camelCase TS via serde `rename_all`). |
| CTR-02 | The frontend never constructs API URLs — only Rust's `meshy/client.rs` does. |
| CTR-03 | The frontend never sees the raw API key (overlaps SEC-02 — flag once, cross-reference the other skill if both apply). |
| CTR-04 | The frontend never handles raw HTTP status codes directly — errors flow through `MeshyError` → JSON string → `lib/tauri.ts`'s `parseError()` → typed `MeshyFrontendError`. |
| CTR-05 | Downloads are initiated by the frontend passing a signed URL to `download_asset`; the frontend never performs the HTTP download itself. |
| CTR-08 | Every `invoke()` call in `lib/tauri.ts` is wrapped in try/catch converting the error string to `MeshyFrontendError` — components/hooks never see raw error strings. |

## Part B — State boundary rules (STT-01–07, CSD §8.1)

| Rule | Check |
|---|---|
| STT-01 | Data from the Meshy API or SQLite lives in TanStack Query, never in Zustand. Look for API response shapes (task objects, asset records, credit balance) being `set()` into a Zustand store. |
| STT-02 | UI-only state (navigation, selection, sidebar collapse, active-task tracking) lives in Zustand, never modeled as a TanStack Query. |
| STT-03 | User preferences live in Zustand with `persist` middleware (`settingsStore` is the canonical reference — CSD §8.2 / `zustand_store_implementations.md` §4). |
| STT-04 | Form state (prompt text, sliders, checkboxes before submit) lives in React `useState`, never in Zustand or TanStack Query. |
| STT-05 / ORG-08 | Files under `src/stores/` import **nothing** from `@tanstack/react-query` or `@tauri-apps/api`, and no React imports. Grep every file in `src/stores/` for these import specifiers — any match is a violation. |
| STT-06 | TanStack Query hooks never call Zustand `set()` directly — they call the store's named action functions (or don't touch Zustand state mutation at all). |
| STT-07 | Components read from both layers freely, but mutate Zustand only via store actions and server state only via Query mutations — never reach into store internals. |

Reference implementation for what compliant stores look like:
`zustand_store_implementations.md` (`appStore.ts`, `taskStore.ts`,
`settingsStore.ts` — all three are pure state containers with zero React/
Query/Tauri imports, mutation only through named actions).

## Output format

Report Part A and Part B as separate sections. For each finding: rule ID,
file:line, the exact violating code, and the fix (point at the CSD/UI-UX
pattern or the zustand_store_implementations.md reference store). If a whole
part has no applicable code yet, say so in one line for that part rather than
omitting it silently — the caller should know both halves were considered.
