---
name: new-meshy-endpoint
version: 2.0
description: Wire a NEW Meshy task type through Rust model, Tauri command, TS type, create-hook. Read by scaffold (entry meshy-endpoint). NOT for one field change, extra hooks, or migrations.
---
# New Meshy Endpoint (thin; project-unique)
Read via `scaffold meshy-endpoint`; follows autonomy-policy.md. Params: slug, version (v1|v2), variant (flat|nested|two-step), field list from `Meshy_Documentation/1X-<slug>.md` (read it fully; never invent fields). Endpoint table: TDD section 10.

## Rules
- Chain: `rust-ts-type-pair` (request struct, plus result struct for nested) then command, then `query-hook` (create mutation only).
- `TaskCreateResponse` is generic; reuse. `TaskError` generic; reuse.
- **nested** (rigging, animation): `TaskObject` has no `result`; define a dedicated result struct (processed_* fields optional). Before `download_asset`, map the result into a `model_urls`-shaped record; log the choice of bonus outputs.
- **two-step** (text-to-3d): preview and refine share one endpoint; refine needs a SUCCEEDED preview id.
- Command `create_<slug_snake>` in `commands/api.rs`: thin dispatcher, typed `body`, `Result<T,String>` with JSON `{code,message,details?}`, `state.meshy_client()` only, no unwrap/expect, validate BEFORE the call (so bad input never spends credits: prompt <=600, polycount 100-300000, resize needs exactly one sizing field), HTTP call stays in `meshy/client.rs`, register in `generate_handler![]`. Never log key or signed URLs.
- Reuse `usePollTask(taskId, endpoint)` / `useStreamTask`; never a per-endpoint poll hook. Reuse `taskStore`; wire `addTask/updateTask` from the Feature component, never in the hook.
- Create hook invalidates `['credit-balance']`, `retry: 0`.
- Default no migration: `assets` is generic; confirm the `MeshyType` variant exists. Else use the migration scaffold.

## Gate
`gate.mjs --level 2` (includes rust-test, clippy, guardrails) then personal `boundary-audit`. Next: `scaffold feature-panel` for the UI.

Parked: none (auth key handling is existing code; any change to key storage or headers is a hard stop). v2.0: trimmed from 9 KB; type rules moved to the type-pair adapter entry.
