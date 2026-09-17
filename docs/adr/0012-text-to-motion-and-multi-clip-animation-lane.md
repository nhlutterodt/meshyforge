# ADR-0012: Text-to-Motion + Multi-Clip Animation Lane (Retarget & Merge)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-17 |
| **Deciders** | Repository owner (task-delivered 2026-09-17; evidence task IDs cited below) |
| **Phase** | Phase 5 (Character Pipeline) |
| **Related rules/features** | FR-POST-07, ADR-0002 (SEC-09 download allowlist), ADR-0004 (provider abstraction), ADR-0011 (animation library) |
| **Supersedes** | None. Extends ADR-0004's `TaskType` taxonomy and ADR-0002's download allowlist. |

## Context

MeshyForge's Animate panel supported only a single preset `action_id`. The
Meshy **Text-to-Motion** endpoint — and the two multi-source animation variants it
unlocks (`motion_task_id` retarget and merged `action_ids`) — were absent: no
`/v1/text-to-motion` endpoint mapping, no `motion_task_id`/`action_ids` request
shape, no null-tolerant handling of the nested `result` payload. The in-repo
`Meshy_Documentation/` folder stops at `18-animation.md`, which predates
Text-to-Motion entirely.

The capability was proven end-to-end **live on 2026-09-17** in a sibling project
(evidence task IDs below). This ADR records the decision to port those
live-verified wire facts into MeshyForge's provider/command/frontend layers
**without re-spending credits** — the wire shapes are already proven, so the
acceptance bar is the repo's own guardrail suite plus its full validation
sequence, not a fresh generation.

### Live-verified wire facts (2026-09-17 — cite, do not re-spend)

| Operation | Request | Result (SUCCEEDED) | Cost | Evidence |
|---|---|---|---|---|
| Text-to-Motion | `POST /openapi/v1/text-to-motion` `{prompt ≤400, mode "prime"\|"swift", duration 2–10 (0.5 steps)}` → `202 {result: task_id}` | `GET /v1/text-to-motion/:id` → `result = {motion_url, motion_format, duration_ms, mode}` — **URLs nest under `result`** | prime 10 cr (FBX), swift 3 cr (BVH) | `01a0afee-6d9a-7031-b6c2-5107c6adf3f5` (2.5s), `01a0aff5-18f9-76dd-b995-ad5992a581b7` (3.0s) |
| Retarget | `POST /v1/animations {rig_task_id, motion_task_id}` | merged GLB; `result` nests `animation_glb_url`/`animation_fbx_url` (NOT top-level) | 3 cr | `01a0afee-c46b-71c2-a76d-c49012f9e07b`, `01a0aff5-83db-77a2-9479-2ed3737a0083` |
| Merge | `POST /v1/animations {rig_task_id, action_ids: [1..10 ints]}` | ONE file, one clip per action | 3 cr/action, max 30 | `01a0afba-771a-7351-81ef-61064ceacda7` (6 actions, 18 cr) |

Two cross-cutting facts govern the design:

1. **`result`-nested URLs.** Both `/v1/text-to-motion` and `/v1/animations` put
   their download URLs under a `result` object, not top-level. A flattened-shape
   assumption (reading `motion_url` or `animation_glb_url` off the task root)
   returns nothing — the same class already recorded in LESSONS_LEARNED #10.
2. **Opaque, explicit-`null` JSON.** Optional fields may be explicitly `null`;
   a text-to-motion task has no thumbnail at all. Task responses must be treated
   as opaque JSON and located by traversing, never by trusting a flattened docs
   example.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A: Add a separate `TextToMotion` command + panel but keep a bespoke endpoint list** | Minimal surface | Reintroduces the multi-copy endpoint drift LESSONS_LEARNED #10 eliminated; a second endpoint list will diverge | ADR-0004, LESSONS_LEARNED #10 |
| **B: Extend the canonical `ENDPOINT_MAP` + `TaskType` with `TextToMotion`, and model the animation three-way union in the existing command/validation layers** | One source of truth; the reverse map and allowlist derive automatically; reuses the existing create/poll/persist pipeline | Requires widening `AnimationRequest` and the `/v1/animations` validator | Nothing |
| **C: Treat text-to-motion as a Creative-Lab-style multi-type command** | Reuses the multi-type dispatch precedent | Text-to-motion is a single type, not a family; the Creative-Lab pattern exists only because 14 variants share one panel | None — over-generalisation |

## Decision

Adopt **Option B**.

1. Add `TaskType::TextToMotion` (wire `"text-to-motion"`) and
   `MeshyType::TextToMotion`, and add `(TaskType::TextToMotion, "/v1/text-to-motion")`
   to the single canonical `provider::meshy::ENDPOINT_MAP`. The reverse lookup
   (`endpoint_to_task_type`) and the validation allowlist (`task_endpoints`) both
   derive from that map, so they gain the endpoint with zero duplication.
2. Model the animation request as a three-way union — `rig_task_id` plus
   **exactly one** of `action_id`, `action_ids` (1–10), or `motion_task_id`.
   `validate_creation_body` enforces the invariant; `AnimationRequest` (Rust and
   TypeScript) widens accordingly.
3. Add `validate_creation_body` for `/v1/text-to-motion`: non-empty prompt
   ≤ 400 chars, `mode` ∈ {prime, swift}, and a finite `duration` in `[2, 10]` on
   0.5-second steps.
4. Add a `create_text_to_motion` Tauri command (registered in `lib.rs`) that
   flows through the existing `create_task_inner` — so task registration,
   camelCase→snake_case conversion, SQLite stub/log, and Task Monitor all treat
   Text-to-Motion as first-class with **zero** new pipeline code (LESSONS_LEARNED
   #1 register-on-create).
5. Make persistence/download null-safe and `result`-nested aware: the frontend
   `mapPollResultToSaveArgs` flattens the nested `result` URL fields onto the
   canonical download keys (`glb`/`fbx`/`usdz`/`bvh`) so animation and motion
   tasks persist and auto-download exactly like text-to-3d tasks, and tasks with
   no thumbnail stay `null`-safe. `model_filename` accepts `bvh` (swift output).
6. Represent the nested result in the Rust `TaskObject` as
   `Option<serde_json::Value>` (opaque, null-tolerant) rather than forcing every
   task family to deserialize into a single typed result struct.

### Boundaries and failure modes

- **No live-credit spend** in the acceptance run. Wire shapes are already proven;
  the evidence IDs above are cited in code comments and tests, not re-run.
- **Retarget requires a biped rig** and must be applied within the 3-day
  source-task retention (field `expires_at`). The panel surfaces this as a note;
  it does not attempt to enforce retention client-side.
- **Clip vocabulary is out of scope here.** A merged `action_ids` GLB ships one
  clip per action named by the library (e.g. `Left_Jab_from_Guard`), which an
  engine's runtime/contract clip keys will not bind until renamed. The def-jam
  `tools/rename-clips.py` (safe GLB JSON-chunk rename + BIN-chunk copy) is the
  documented approach; MeshyForge deliberately **documents the pointer and does
  not build the rename step** in this lane (see LESSONS_LEARNED #13).
- **Multi-FBX post-process collision** (e.g. `processed_armature_fbx_url` +
  `processed_animation_fps_fbx_url` both present) resolves last-write-wins onto
  the single `fbx` download key; this is a known, accepted limitation for the
  rare multi-post-process case and does not affect the common single-source paths.

## Consequences

**Positive:**

- Text-to-Motion, retarget, and multi-clip merge become first-class
  create → register → poll → persist → download tasks with no bespoke pipeline.
- One canonical endpoint list (no drift); the `/v1/animations` "exactly one"
  invariant is enforced at the validation boundary before any credit is spent.
- Null-tolerant and `result`-nested handling removes the flattened-shape failure
  class for the whole motion lane.

**Negative:**

- `TaskType`/`MeshyType` variant count grows to 31, and `AnimationRequest`/the
  animation validator get more complex (union + bounds). Both are covered by
  the variant-count test and the new validation tests.
- The merged `action_ids` output is not immediately engine-bindable without the
  deferred clip-rename step — a known gap, explicitly out of scope.

**Follow-ups:**

- Docs to update (via `doc-sync`): `docs/LESSONS_LEARNED.md` (#13 motion lane),
  `docs/CHANGELOG.md`.
- Tech debt to register: clip-vocabulary rename (port `tools/rename-clips.py`) is
  deferred; revisit when a runtime/engine consumes merged GLB clips.
- Tests added: Rust wiremock (t2m create/retrieve; animation retarget/merge),
  Rust validation (t2m bounds; animation union), Rust null-tolerance models,
  frontend `flattenResultUrls`/`mapPollResultToSaveArgs` real-wire fixtures,
  frontend panel sub-mode tests, `useCreateTextToMotion` hook regression.

## References

- `docs/LESSONS_LEARNED.md` #1 (register-on-create), #2 (wire casing), #10
  (single endpoint map + opaque JSON), #13 (motion lane)
- `docs/adr/0004-task-provider-abstraction.md` (TaskType taxonomy, ENDPOINT_MAP)
- `docs/adr/0002-signed-download-origin-policy.md` (SEC-09 download allowlist)
- `docs/adr/0011-animation-library-source-and-preview-image-origin.md`
- Meshy API docs (`/openapi/v1/text-to-motion`, `/openapi/v1/animations`)
- `src-tauri/src/provider/meshy.rs`, `src-tauri/src/commands/validation.rs`,
  `src/hooks/useActiveTaskPolling.ts`, `src/components/generate/AnimationPanel.tsx`
