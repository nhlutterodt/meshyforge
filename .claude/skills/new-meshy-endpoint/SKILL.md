---
name: new-meshy-endpoint
description: >-
  Scaffolds a complete new Meshy task-type integration end-to-end — the Rust
  request struct in meshy/models.rs, the #[tauri::command] wrapping the
  reqwest call in commands/api.rs, the matching TS interface in
  meshy-types.ts, the TanStack Query create-mutation hook, and (rarely) an
  SQLite migration — parameterized by endpoint slug, API version, and
  response-shape variant. Covers all 9 Meshy task-type endpoints (text-to-3d,
  image-to-3d, multi-image-to-3d, remesh, convert, resize, retexture,
  rigging, animation) through one parameterized flow; do not write a
  separate skill per endpoint. Use when wiring up a NEW Meshy task type from
  scratch. Do NOT use for a single struct/field change on an endpoint that
  already exists (use new-rust-ts-type-pair), for adding another hook to an
  already-typed endpoint (use new-query-hook), or for the SQLite migration
  mechanics themselves (use new-sqlite-migration — this skill only decides
  whether one is needed).
---

# New Meshy Endpoint

Scaffolds one Meshy task-type integration through every layer it touches. Parameters: **slug** (kebab-case, e.g. `retexture`), **version** (`v1` or `v2`), **response variant** (`flat` | `nested` | `two-step`), **request field list** (from the matching `Meshy_Documentation/*.md` file).

## 1. The 9 endpoints, verified against Meshy_Documentation and technical_design_document.md §10

| Slug | Method + path (relative to `BASE_URL = https://api.meshy.ai/openapi`, TDD §7.1) | Rust request struct (rust_type_definitions.md §4) | Variant | Source doc |
|---|---|---|---|---|
| `text-to-3d` | `POST /v2/text-to-3d` (preview and refine share one endpoint) | `TextTo3DPreviewRequest` / `TextTo3DRefineRequest` | **two-step** | `10-text-to-3d.md` |
| `image-to-3d` | `POST /v1/image-to-3d` | `ImageTo3DRequest` | flat | `11-image-to-3d.md` |
| `multi-image-to-3d` | `POST /v1/multi-image-to-3d` | `MultiImageTo3DRequest` | flat | `12-multi-image-to-3d.md` |
| `remesh` | `POST /v1/remesh` | `RemeshRequest` | flat | `13-remesh.md` |
| `convert` | `POST /v1/convert` | `ConvertRequest` | flat | `14-convert.md` |
| `resize` | `POST /v1/resize` | `ResizeRequest` | flat | `15-resize.md` |
| `retexture` | `POST /v1/retexture` | `RetextureRequest` | flat | `16-retexture.md` |
| `rigging` | `POST /v1/rigging` | `RiggingRequest` | **nested** | `17-rigging.md` |
| `animation` | `POST /v1/animations` | `AnimationRequest` | **nested** | `18-animation.md` |

Every other GET/DELETE/list/stream operation (`poll_task`, `delete_task`, `stream_task`) is **already generic** across all 9 slugs (TDD §7.2, hook_implementations.md §3–4) — see §6. This skill only scaffolds the `POST create_*` path per slug; never generate a second `poll_*`/`stream_*` hook per endpoint.

Before writing anything, read the matching `Meshy_Documentation/1X-*.md` file in full for the exact parameter list, defaults, and Failure Modes — do not invent fields.

## 2. Rust request struct — `src-tauri/src/meshy/models.rs`

Follow the `new-rust-ts-type-pair` skill's rules for field-by-field conventions (Option/skip_serializing_if split, shared enums, numeric-literal comments, camelCase). Two structural points specific to endpoint scaffolding:

- **`TaskCreateResponse` (`{ result: String }`) is already generic** (rust_type_definitions.md §5.1) — reused as-is by every endpoint. Do not generate a new response struct for the create call.
- **For `nested` variant endpoints**, the generic `TaskObject` struct (rust_type_definitions.md §5.2) has **no `result` field** — it only models `model_urls`/`thumbnail_url`/etc. (the flat shape). Rigging and animation responses put everything under a top-level `result` object instead (`17-rigging.md`, `18-animation.md`). This is a real gap in the current type model, not a simplification you can skip: define a dedicated result struct per nested endpoint —
  ```rust
  #[derive(Debug, Clone, Serialize, Deserialize)]
  #[serde(rename_all = "camelCase")]
  pub struct RiggingResult {
      pub rigged_character_fbx_url: String,
      pub rigged_character_glb_url: String,
      pub basic_animations: BasicAnimations, // walking_glb_url, walking_fbx_url, walking_armature_glb_url, running_* — see 17-rigging.md
  }
  ```
  and the equivalent `AnimationResult` (`animation_glb_url`, `animation_fbx_url`, `processed_usdz_url`, `processed_armature_fbx_url`, `processed_animation_fps_fbx_url` — all optional except the two `animation_*` fields, since the `processed_*` ones only appear when the matching `post_process.operation_type` was requested, per `18-animation.md`).

## 3. Tauri command — `src-tauri/src/commands/api.rs`

Command name is `create_<slug_with_underscores>` (IPC-03: snake_case, e.g. `create_retexture`). Per ORG-09, this file holds only thin `#[tauri::command]` dispatchers — the HTTP call itself stays in `meshy/client.rs`.

```rust
#[tauri::command]
async fn create_<slug>(
    state: State<'_, AppState>,
    body: <RequestStruct>,               // typed struct, not serde_json::Value — see note below
) -> Result<TaskCreateResponse, String> {
    let client = state.meshy_client().ok_or_else(|| /* {"code":"MISSING_API_KEY", ...} per CTR-10 */)?;
    let response = client
        .create_task("/<version>/<slug-path>", &serde_json::to_value(&body).map_err(...)?)
        .await
        .map_err(|e| /* map MeshyError -> {code, message} per coding_standards.md §6.2 */)?;
    state.database.log_task_create(&response.result, "/<version>/<slug-path>", &body)?;
    Ok(response)
}
```

Required compliance (coding_standards.md §7.1 IPC rules and CTR contract rules, UI/UX §7.2):

- **IPC-01 / CTR-10**: return `Result<T, String>` where the error string is JSON `{"code": ..., "message": ..., "details"?: ...}` — never a bare string.
- **IPC-02**: `body` is a typed, `Deserialize`-deriving struct (the request struct from §2), not a raw `&str`.
- **IPC-04 / VAL-01 / CTR-09**: validate required fields (e.g. `refine` needs `preview_task_id` on a `SUCCEEDED` task; `resize` needs exactly one of `resize_height`/`resize_longest_side`/`auto_size`; prompts ≤600 chars per VAL-02; `target_polycount` 100–300,000 per VAL-03) **before** calling Meshy, so a bad request never consumes credits.
- **IPC-05**: get the client via `state.meshy_client()` / `State<'_, AppState>` — never construct a new `MeshyClient`.
- **IPC-06**: never log the API key, the request body if it embeds the key, or any signed response URL.
- **IPC-09**: register the new command in `main.rs`'s `tauri::generate_handler![...]`.
- **RST-01**: no `unwrap()`/`expect()` outside test code — use `?` or explicit `match`.
- Auth header assembly (`Authorization: Bearer <key>`) happens exactly once, inside `MeshyClient::headers()` in `meshy/client.rs` — **never** re-derive or pass the key through the command layer, and never build it in TypeScript.

> **Judgment call, flagged for confirmation**: TDD §7.2's example commands take `body: serde_json::Value` for brevity ("`// ... similar commands for every endpoint ...`" — the section is explicitly incomplete). rust_type_definitions.md defines a fully typed struct per endpoint. This skill uses the typed struct as the command parameter, since that is what IPC-02/RST-08/CTR-01 point toward and what makes the TS↔Rust type parity checkable. If the existing codebase has already committed to `serde_json::Value` bodies by the time you run this, match the existing pattern instead and note the inconsistency via the `adr-log` skill.

## 4. `task_error` — two distinct error layers, do not conflate them

1. **Request-level failure** (task never created — 400/401/402/429 from the `POST`): surfaces as the command's `Result::Err(String)`, JSON-shaped `{code, message, details?}` per CTR-10, built from `MeshyError` (coding_standards.md §6.2: `ApiError{status,body}` → `API_ERROR_<status>`, `Network` → `NETWORK_ERROR`, `MissingApiKey` → `MISSING_API_KEY`, fallback `UNKNOWN`).
2. **Task-level failure** (task created, later fails): the `task_error` field *inside* a successful poll/stream response, shaped `{type, code?, message, doc_url?}` per `03-errors.md` and modeled by rust_type_definitions.md's `TaskError` struct — `message` is required (`Option<String>`-free), `r#type`/`code`/`doc_url` are true-optional (`Option<T>` **with** `skip_serializing_if`). This struct is already generic — reuse it, don't redefine per endpoint.

Error `type` values (`invalid_input`, `timeout`, `service_unavailable`, `server_error`) drive retry eligibility per TDD §12.2 — don't retry `invalid_input`.

## 5. TS mirror type — `src/lib/meshy-types.ts`

Add the interface with identical field names to the Rust struct, snake_case → camelCase (CTR-01). No `enum` (TYP-08) — string unions only. `interface`, not `type`, for the request object shape (TYP-04). See `new-rust-ts-type-pair` for the field-by-field optional/nullable rule.

## 6. Query hooks — reuse the generic ones, add only the mutation

- **Create**: new file `src/hooks/useCreate<PascalSlug>.ts`, following the `new-query-hook` skill's mutation template — `mutationFn` calls `invoke<TaskCreateResponse>('create_<slug>', { body })`, `onSuccess` invalidates `['credit-balance']` (skip this only if the endpoint is genuinely free, per `useCreateAnalyzePrintability`'s pattern — none of the 9 core endpoints are), `retry: 0`.
- **Poll**: do **not** write a new polling hook. `usePollTask(taskId, endpoint)` (hook_implementations.md §3) is already parameterized by `endpoint` string — call it with `"/​<version>/<slug-path>"`. Same for `useStreamTask(taskId, endpoint, enabled)`.
- **Task tracking**: do **not** create a new Zustand store or slice for in-flight task state. `taskStore.ts` already exists (zustand_store_implementations.md §3) and is generic across every `meshyType`. Per HOK-10/STT-06, the mutation hook itself must never call `useTaskStore`'s `set()`/actions — wire `addTask`/`updateTask`/`removeTask` from the **Feature component** that calls the new hook (e.g. the relevant `Generate*Panel.tsx`), in its own `onSuccess`/poll-effect callback, exactly as hook_implementations.md §1.2 (HOK-08 note) describes: *"multi-step operations are orchestrated by the Feature component, not by a single hook."*

## 7. `download_asset` — flat vs. nested

`download_asset` (TDD §7.2) is already generic and reads a `model_urls`-shaped map. **Flat**-variant endpoints work with it unmodified. **Nested**-variant endpoints (rigging, animation) do not have `model_urls` at all — before calling `download_asset`, the caller must map the typed result struct into a `model_urls`-shaped record, e.g. for rigging: `{ glb: result.riggedCharacterGlbUrl, fbx: result.riggedCharacterFbxUrl }`. Decide explicitly whether `basic_animations`/`processed_*` bonus outputs are worth downloading too — this is a genuine product decision the source docs don't make, log it via `adr-log` if you pick a nonobvious answer.

## 8. SQLite — usually nothing to do here

The `assets` table (technical_design_document.md §6.1) is already generic: one row per task, discriminated by `meshy_type`, with `file_paths`/`texture_paths` as JSON-blob columns. **All 9 canonical slugs above already have a `MeshyType` variant** (rust_type_definitions.md §2.3: `text-to-3d-preview`, `text-to-3d-refine`, `image-to-3d`, `multi-image-to-3d`, `retexture`, `remesh`, `convert`, `resize`, `rig`, `animate`). So:

- **Default: no new migration.** Add/confirm the `MeshyType` variant, and let the row ride on the existing `assets`/`task_log` tables.
- **Only write a migration** if the endpoint needs a column the generic JSON blobs genuinely can't represent — and if so, invoke the **`new-sqlite-migration`** skill rather than re-deriving migration mechanics here (it also corrects a real path contradiction between technical_stack_documentation.md §10.5 and technical_design_document.md §5: migration `.sql` files actually live at `src-tauri/src/migrations/`, not `src-tauri/migrations/`).

## 9. Verify

After scaffolding, `meshyforge-ipc-boundary-audit` checks the IPC/CTR/STT rules above mechanically, and `meshyforge-security-review` checks input validation and error sanitization. `feature-panel-scaffold` is the natural next step for the UI panel that calls the new hook.

## Corrections surfaced while researching this skill (flagging per request)

1. **The "Zustand slice for in-flight task state" per endpoint, as originally scoped, contradicts the architecture.** Only 3 Zustand stores exist by design; `taskStore.ts` already generically tracks in-flight tasks for every `meshyType`, and per HOK-10/STT-06 no hook may call its `set()`/actions directly anyway. §6 above reflects the corrected design: reuse `taskStore`, wire it from the calling component.
2. **The "status-polling query" hook is also already generic** (`usePollTask`/`useStreamTask`, parameterized by `endpoint`) — scaffolding a new one per endpoint would duplicate hook_implementations.md §3–4 rather than follow it.
3. **The SQLite migration step is the exception, not the rule**, for all 9 of these endpoints specifically — the generic `assets` table plus an existing `MeshyType` variant already covers them; see §8.
4. **`download_asset` needs a mapping step for the `nested` variant** (rigging/animation) that isn't needed for `flat` — this is in addition to the two-step text-to-3d exception you already knew about, not instead of it.
