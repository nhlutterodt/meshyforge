# ADR-0015: Normalized Task Snapshot at the Provider Response Boundary

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-30 |
| **Decider** | Project owner (accepted 2026-10-30; drafted by agent, decision-log D-001) |
| **Area** | contract |
| **Phase** | Post-1.1.0 hardening; precedes TASK-0031 and TASK-0013 |
| **Related rules** | CTR-07, IPC-01, IPC-04, IPC-06, VAL-01; SEC-09; FR-POST-06, FR-POST-07, FR-PRINT-02; TASK-0031, TASK-0024 (Package D), TASK-0013; TPC-01–06 (proposed) |
| **Docs affected** | `docs/adr/0004-task-provider-abstraction.md` (amendment note); `docs/coding_standards.md` §7.1 (IPC table); `docs/technical_design_document.md` §6.2, §7.1, §7.2; `docs/hook_implementations.md` (polling/stream hooks); `docs/rust_type_definitions.md`; `docs/refactoring/implementation-artifacts.md` (trait listing); `docs/governance/task-manifest-addendum-2026-09-11.yaml` (retire the "NOT proposed" entry); `docs/LESSONS_LEARNED.md` #10, #13 (cross-reference) |
| **Supersedes** | None (amends ADR-0004 Decision items 2 and 7 and its trait signature for `get_task` / `stream_task`) |

## Context

**Trigger (need test):** this crosses the IPC contract boundary (`poll_task`,
`stream_task`, `save_completed_task`, `download_asset`). It binds the Rust
provider, the command layer, three frontend hooks and one component. It
amends an accepted ADR (ADR-0004). It reverses a recorded "not proposed"
entry, so it is likely to be re-litigated and must name the new information.

**The leak.** ADR-0004 abstracted the request side of the provider seam. The
response side was never abstracted. `TaskProvider::get_task` returns
`serde_json::Value`, documented in `src-tauri/src/provider/mod.rs` as the
"provider-specific shape, passed through to the frontend". `stream_task`
emits the same raw shape as `task-progress` events. Meshy wire knowledge is
therefore re-implemented by every reader:

| Reader | Location | What it re-implements |
|---|---|---|
| Active polling | `src/hooks/useActiveTaskPolling.ts` `MeshyTaskResponse`, `flattenResultUrls`, `mapPollResultToSaveArgs` | snake_case field names, the nested `result` layout, the URL-to-format mapping, the numeric defaults that keep `save_completed_task` deserializing |
| Generic polling | `src/hooks/useTaskPolling.ts` | the same raw shape (header comment: "poll_task returns raw Meshy API JSON") |
| Printability report | `src/components/generate/PrintabilityReportCard.tsx` | a **guessed** schema (`printability_status`, `issue_count`, …), flagged unconfirmed in TASK-0023 |
| Stream hook | `src/hooks/useTaskStream.ts` | types the raw snake_case SSE payload as camelCase `TaskObject`, the LESSONS #10 defect class. Currently unmounted |
| Rust status persistence | `src-tauri/src/storage/database.rs` `update_task_status` | snake_case and camelCase reads (the TASK-0024 repair) |

**The second leak: dispatch by endpoint string.** `poll_task` and
`stream_task` take an `endpoint: String` from the frontend.
`endpoint_to_task_type` (`src-tauri/src/commands/api.rs:344`) maps it back to
a `TaskType` and **silently falls back to `TaskType::TextTo3dPreview`** when
nothing matches. The frontend keeps its own copy of every endpoint path in
`src/hooks/useMeshyApi.ts`, the duplicated-constant class of LESSONS #10.
Every polled task already carries its serde `taskType` in `taskStore`
(`useActiveTaskPolling.ts` keys on `task.taskType`), so the endpoint string
is redundant.

**Constraints found:**

- `docs/adr/0004-task-provider-abstraction.md` §Decision 4: wire-format
  conversion belongs inside the provider impl, not the command layer. Its
  intent already covers responses. Only the `get_task` signature contradicts
  it.
- `docs/adr/0011-animation-library-source-and-preview-image-origin.md` and
  `src-tauri/src/provider/types.rs` `AnimationLibraryEntry`: **in-repo
  precedent.** A provider response is normalized to a stable camelCase IPC
  struct with serde aliases, with a single provider, specifically "so the
  frontend never receives provider-shaped keys".
- `docs/coding_standards.md` §7.1 IPC-01 (`Result<T, String>`, `T:
  Serialize`), IPC-04 and VAL-01 (validate before spending credits), IPC-06
  (never log response bodies that contain signed URLs).
- `src-tauri/src/commands/validation.rs` `model_filename`: download keys map
  through a **closed** allowlist to fixed filenames (path-traversal guard).
  `pre_remeshed_glb → pre_remeshed_model.glb` is already a role-qualified key,
  which is precedent for role-tagged keys.
- `docs/governance/task-manifest-addendum-2026-09-11.yaml` TASK-0031 evidence
  gate: "a test asserts no result URL present in a task response is silently
  dropped".

**New information since the 2026-09-11 "NOT proposed" entry.** The addendum
recorded that normalizing `get_task` "pays off only when a second provider
exists". Three things after that date contradict it:

1. **The motion lane (347420c, 16ea987; 2026-09-17).** It added five nested
   `result` URL fields that map onto one `fbx` key. The adversarial fix had to
   choose *which artifact to discard* ("PRIMARY wins; processed variants fill
   only gaps"). A `format → url` map cannot hold two artifacts of the same
   format, so TASK-0031's evidence gate cannot be met by the current shape.
   That is a data-model limit, not a missing branch.
2. **TASK-0024 Package D.** The audit-response columns stay dead because "the
   current provider response contract does not expose truthful HTTP
   status/body/credit data" (task-manifest, 2026-09-05 Package D note). The
   blocker is this seam.
3. **ADR-0011 already applied normalization with one provider** for exactly
   this defect class. The one-provider argument was therefore already set
   aside once, in a narrower place.

The payoff is correctness and data retention now, not multi-provider support
later.

**Precedent search:** `locate.mjs` over `docs/` and `docs/adr/` for "raw
JSON", "passthrough", "endpoint_to_task_type", "flattenResultUrls",
"TaskSnapshot", "normaliz". Hits:
`docs/refactoring/implementation-artifacts.md:51` (the raw-JSON trait doc);
`docs/LESSONS_LEARNED.md:253` (#10, endpoint triplication) and `:435` (#13,
`flattenResultUrls` fixtures); `docs/governance/task-manifest-addendum-2026-09-11.yaml:145`
(the "NOT proposed" entry addressed above). No prior ADR decides the
response shape.

## Options Considered

| Option | Pros | Cons | Conflicts with |
|---|---|---|---|
| **A. Big-bang typed `get_task`:** the trait returns `TaskSnapshot`, `poll_task` returns only the snapshot, and every frontend reader migrates in one change | Cleanest end state; deletes `MeshyTaskResponse` immediately | Every reader changes at once (PrintabilityReportCard has no confirmed schema to migrate to); weak reversibility | None, but its blast radius is the highest |
| **B. Additive snapshot with a transitional raw field:** the provider gains a pure `snapshot(task_type, &raw)` normalizer; `poll_task` and `task-progress` return `TaskSnapshot`, which carries `providerPayload` (the raw JSON) until the last reader migrates; Rust builds the artifact list; dispatch moves to `taskType` | Readers migrate one at a time; the normalizer is a pure function testable against the live-verified LESSONS #13 fixtures; it fixes TASK-0031 by construction; it unblocks TASK-0024 Package D | A transitional field to retire; two response vocabularies coexist during migration | None |
| **C. Frontend-only role keys:** replace `flattenResultUrls` with role-tagged keys in TypeScript (TASK-0031 as currently scoped) | Smallest diff; no IPC change | Adds more Meshy wire knowledge to TypeScript; leaves the dead audit columns, the guessed printability schema and the endpoint fallback in place; contradicts ADR-0004 §Decision 4's intent | ADR-0004 §Decision 4 (intent) |
| **D. Defer** (status quo per the 2026-09-11 addendum) | No work | TASK-0031's evidence gate stays unmeetable, and armature/preset artifacts keep being discarded, which costs credits per asset to recover (manifest note) | TASK-0031 evidence gate |

Scores (0–3), in the order north-star fit ×2, reversibility ×2, blast radius,
testability, build cost, run cost:

| Option | Scores | Weighted |
|---|---|---|
| A | 3, 1, 0, 2, 1, 2 | 13 |
| **B** | 3, 2, 2, 3, 2, 3 | **20** |
| C | 1, 3, 3, 2, 3, 1 | 17 |
| D | out | — |

- C's north-star score is 1 because it adds wire knowledge to TypeScript.
  Its run cost is 1 because every new Meshy output repeats the LESSONS #10
  failure mode in a second language.
- C is weakened, not vetoed: it conflicts only with ADR-0004's intent, not its
  text.
- D is out because it cannot meet the TASK-0031 evidence gate.

B leads by 3, so it is decided outright. Adversarial check ("what makes this
wrong?"): if Meshy's response shapes are too irregular to normalize, the
normalizer accumulates special cases. The mitigation is TPC-03's `droppedFields`
list, which makes an unhandled shape visible in tests instead of silent.

## Decision

**Normalize task responses inside the provider into a typed, role-tagged
`TaskSnapshot`, and dispatch `poll_task` and `stream_task` by `TaskType`
instead of by endpoint string, with unknown types rejected (Option B).**

Deciding constraint: the TASK-0031 evidence gate ("no result URL silently
dropped") cannot be satisfied by a `format → url` map, and ADR-0004
§Decision 4 places wire-format knowledge inside the provider.

Contract, as proposed rules:

- **TPC-01 (proposed):** `TaskProvider` gains `fn snapshot(&self, task_type:
  &TaskType, raw: &serde_json::Value) -> Result<TaskSnapshot, ProviderError>`.
  It is a pure function with no I/O. `get_task` keeps its raw return, because
  the normalizer is applied by the command layer. A provider that cannot
  normalize returns `ProviderError` rather than a partial snapshot.
- **TPC-02 (proposed):** `TaskSnapshot` is camelCase on IPC:
  - `id`, `taskType`, `status`, `progress`
  - `error: Option<{ code, message }>`
  - `consumedCredits`, `createdAt`, `startedAt`, `finishedAt`, `thumbnailUrl`
  - `artifacts: Vec<TaskArtifact>`
  - `providerPayload: serde_json::Value` (transitional; see TPC-06)

  `status` is the closed `PENDING | IN_PROGRESS | SUCCEEDED | FAILED |
  CANCELED` set, and an unknown provider status is a normalization error.
- **TPC-03 (proposed):** `TaskArtifact { role, format, label, url }`. `role`
  is a closed enum (`primary`, `armature`, `fpsVariant`, `formatVariant`,
  `presetClip`, `motion`, `preRemeshed`). `label` is an optional sanitized
  slug (for example `walking`), validated with the existing
  `sanitize_cache_key` rules. Every URL in the raw response that the
  normalizer recognizes becomes exactly one artifact. A URL-bearing field it
  does not recognize is reported in a `droppedFields` debug list (names only,
  never URLs, per IPC-06) and has a test.
- **TPC-04 (proposed):** storage keys stay backward compatible. A `primary`
  artifact keeps the bare format key (`glb`, `fbx`, …), so existing
  `file_paths` rows and `model_filename` mappings are unchanged. Every other
  artifact uses `<role>[-<label>].<format>` (for example `armature.fbx`,
  `presetClip-walking.glb`). Filenames come from a closed Rust mapping on
  `(role, format)` plus the sanitized label, never from provider strings.
  This extends the `pre_remeshed_glb` precedent.
- **TPC-05 (proposed):** `poll_task`, `stream_task` and `delete_task` accept
  `taskType` (the existing serde wire value, for example
  `text-to-3d-preview`) instead of `endpoint`. An unknown value returns
  `INVALID_INPUT` before any network call (IPC-04, VAL-01).
  `endpoint_to_task_type` and its `TextTo3dPreview` fallback are deleted. The
  frontend `endpoint` fields in `useMeshyApi.ts` are removed, which leaves
  `provider::meshy::ENDPOINT_MAP` as the only endpoint table.
- **TPC-06 (proposed):** `providerPayload` is transitional. No new code may
  read it. It is removed once `PrintabilityReportCard` reads a typed report,
  either a `printReport` field on `TaskSnapshot` populated from a confirmed
  live response, or an explicit decision to keep it opaque. Removing it does
  not require a new ADR.

Out of scope: a portable or normalized *clip* model (still "not proposed",
per the addendum), multi-provider registry design (TASK-0013), and moving the
succeeded → save → download orchestration out of the frontend (a candidate
follow-up, not decided here).

## Consequences

**Positive.**
- Meshy wire knowledge lives in one tested place, `provider/meshy.rs`,
  covered by the live-verified fixtures from LESSONS #13.
- TASK-0031 becomes "map the rig and animate fields to roles", and its
  evidence gate becomes a normalizer test.
- TASK-0024 Package D gets truthful credit and status data.
- The `TextTo3dPreview` silent fallback is gone.
- `MeshyTaskResponse`, `flattenResultUrls` and the snake_case warning comments
  are deleted from TypeScript.
- A future second provider implements `snapshot` and inherits every UI
  consumer.

**Negative.**
- This is an IPC contract change. `poll_task`'s return type changes, so every
  consumer of `poll_task` and `task-progress` must migrate in the same
  release; `providerPayload` softens this only for field reads.
- Two vocabularies coexist until TPC-06 is retired.
- The `TaskType` serde names become part of the poll IPC surface, which they
  already are for `save_completed_task`.
- The artifact roles are a new closed taxonomy to maintain when Meshy adds
  outputs.

**Follow-ups.**
- **Code (one PR per step, in order):**
  1. Rust `TaskSnapshot` and the Meshy normalizer, with fixture tests and the
     dropped-field test (no IPC change yet).
  2. `poll_task` and `stream_task` return the snapshot and take `taskType`;
     migrate `useActiveTaskPolling`, `useTaskPolling` and `useTaskStream`.
  3. `download_asset` and `save_completed_task` take artifacts; implement
     the TPC-04 key and filename mapping; close TASK-0031.
  4. Retire `providerPayload` (TPC-06).
- **Tests:**
  - a normalizer fixture per task family (text/image-to-3d, rig, animate,
    retarget/merge, text-to-motion, print);
  - "unknown status is an error";
  - "unknown `taskType` is rejected before network";
  - "no URL silently dropped";
  - "a primary artifact keeps its legacy key";
  - "a label containing a path separator is rejected".
- **Docs (doc-sync payload):** the "Docs affected" row above. ADR-0004 gets
  an amendment note on Decision 2, Decision 7 and the trait listing. The
  addendum's "NOT proposed" entry for `get_task` normalization is retired
  with a pointer to this ADR.
- **Tech debt registered:** `providerPayload` (TPC-06); the
  frontend-orchestrated save/download pipeline (candidate follow-up).

**Undo.**
- Before step 2 lands: revert the step-1 PR. It is additive Rust only.
- After step 2: revert steps 2–3 together. Assets saved with role-tagged keys
  remain readable, because primary keys are unchanged (TPC-04) and the extra
  keys are simply ignored by older code.
- No schema migration is involved at any step.

## References

- ADR-0004 (amended), ADR-0011 (normalization precedent), ADR-0012 (motion
  lane), ADR-0008 (audit columns).
- `docs/LESSONS_LEARNED.md` #10 (endpoint triplication, snake/camel defect
  class) and #13 (motion-lane wire facts and fixtures).
- `docs/governance/task-manifest-addendum-2026-09-11.yaml` TASK-0031 and
  "Explicitly NOT proposed".
- `docs/governance/task-manifest.yaml` TASK-0023 (printability schema
  caveat) and TASK-0024 Package D.
- Commits 347420c, 16ea987 (motion lane and primary-wins fix).
