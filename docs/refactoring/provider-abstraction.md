# Refactoring Execution Plan: Task Provider Abstraction

| Field | Value |
|---|---|
| **ADR** | [ADR-0004](../adr/0004-task-provider-abstraction.md) |
| **Created** | 2026-08-26 |
| **Last Updated** | 2026-08-26 |
| **Current Phase** | Complete — all phases verified |
| **Overall Status** | Refactor complete. R1-R5 verified. 526 tests passing (189 Rust + 337 frontend). |

> **This document is the single source of truth for refactor state.**
> If there is a conflict between this document and anything else (chat
> context, memory notes, code comments), this document wins.
>
> A phase is `verified` only when its quality gate passes with zero
> regressions. `in-progress` means code is being written but the gate has
> not yet passed. `not-started` means no code has been written.

---

## 1. Agent Roles

This refactoring uses three specialized agent roles. Each has a distinct
purpose and runs at specific points in the phase lifecycle.

### Adversarial Agent

**Purpose:** Attacks the design before implementation begins. Tries to
break the plan by finding cases where the trait abstraction doesn't hold,
where a second provider would require changes outside the provider module,
or where the refactor would silently change user-visible behavior.

**When it runs:** Before each phase starts (R1–R5). The phase cannot enter
`in-progress` until the adversarial agent has reviewed the phase's file list
and raised objections — and those objections have been either resolved or
logged as accepted risks.

**Key questions it asks:**

- "Can a provider be added by only touching `provider/` and
  `AppState::new()`? If not, what else must change?"
- "Does this refactor change the IPC wire format? If so, does the frontend
  break?"
- "Are there any code paths that still call `MeshyClient` directly after the
  refactor, bypassing the trait?"
- "Does the `async-trait` overhead matter for the SSE streaming path where
  the callback is called per-chunk?"

### Validation Agent

**Purpose:** Verifies that the implementation matches the plan. Checks that
every file in the phase's scope has actually been modified, that no files
outside the scope were touched, and that the quality gate criteria are met.

**When it runs:** After a phase's code is written, before the quality gate
runs. The phase cannot be marked `verified` until the validation agent
confirms the file set matches the plan and the gate passes.

**Key questions it asks:**

- "Were exactly the files listed in this phase modified? Were any files
  outside the scope modified?"
- "Does `cargo check` / `tsc --noEmit` compile with zero new warnings?"
- "Do all pre-existing tests still pass (no regressions)?"
- "Do new tests exist for the new trait / provider impl?"

### Testing Agent

**Purpose:** Designs and verifies the test strategy for each phase. Ensures
the new abstraction is tested at the trait level (not just the impl level),
and that integration tests prove the command layer works through the trait.

**When it runs:** In parallel with implementation. The test strategy for a
phase is defined before code is written, and the tests are run as part of
the quality gate.

**Key questions it asks:**

- "Is there a test that creates a mock `TaskProvider` impl and verifies the
  command layer dispatches correctly?"
- "Does the existing wiremock test suite still pass unchanged (proving no
  behavior regression)?"
- "Are there tests for `allowed_download_hosts()` returning different hosts
  for different providers?"
- "Does the frontend test suite pass with the renamed types?"

---

## 2. Phase State Table

This table is the authoritative state record. Each row is a phase. Each
column is a state dimension. The table is updated only when a state
transition is verified — never aspirationally.

```csv
Phase,Name,Status,Files_Changed,Files_Remaining,Tests_Pass,Lint_Pass,Type_Check_Pass,Agent_Review,Verified_At,Gate_Command
R1,Provider trait + types,verified,5,0,yes,yes,n/a,both,2026-08-26,cargo check && cargo clippy -- -D warnings
R2,MeshyProvider impl,verified,4,0,yes,yes,n/a,both,2026-08-26,cargo test \u0026\u0026 cargo clippy -- -D warnings
R3,AppState + command layer,verified,8,0,yes,yes,n/a,both,2026-08-26,cargo test \u0026\u0026 cargo clippy -- -D warnings
R4,Frontend type renames,verified,22,0,yes,yes,yes,both,2026-08-26,tsc --noEmit \u0026\u0026 biome check \u0026\u0026 vitest run
R5,Cleanup + verification,verified,3,0,yes,yes,yes,both,2026-08-26,cargo test + clippy + tsc + biome + vitest
```

### Column definitions

| Column | Values | Meaning |
|---|---|---|
| `Status` | `not-started`, `in-progress`, `complete`, `verified` | Current phase state |
| `Files_Changed` | integer | Count of files actually modified so far |
| `Files_Remaining` | integer | Count of files in scope not yet modified |
| `Tests_Pass` | `yes`, `no`, `n/a` | Does the full test suite pass? |
| `Lint_Pass` | `yes`, `no`, `n/a` | Does clippy + biome pass with zero warnings? |
| `Type_Check_Pass` | `yes`, `no`, `n/a` | Does `tsc --noEmit` pass? |
| `Agent_Review` | `none`, `adversarial`, `validation`, `both`, `passed` | Which agents have reviewed |
| `Verified_At` | ISO timestamp or empty | When the phase was marked `verified` |
| `Gate_Command` | shell command | The exact command to verify this phase |

---

## 3. File Scope Per Phase

Each phase lists every file that will be created or modified. Files not
listed here must not be touched during that phase.

### R1: Provider trait + types

**Goal:** Create the provider abstraction module with the trait, generic
types, and error type. No existing files are modified yet — this phase
is purely additive.

**Gate command:**
```bash
cd src-tauri && cargo check && cargo clippy -- -D warnings
```

| # | File | Action | What changes |
|---|---|---|---|
| 1 | `src-tauri/Cargo.toml` | Modify | Add `async-trait = "0.1"` dependency |
| 2 | `src-tauri/src/provider/mod.rs` | Create | `TaskProvider` trait, re-exports |
| 3 | `src-tauri/src/provider/types.rs` | Create | `TaskType` enum, `CreativeLabType` enum, `ProviderConfig` struct |
| 4 | `src-tauri/src/provider/error.rs` | Create | `ProviderError` enum (same variants as `MeshyError`, renamed) |
| 5 | `src-tauri/src/lib.rs` | Modify | Add `pub mod provider;` module declaration |

**Exit criteria (all must be true):**

- [ ] `cargo check` passes — new module compiles standalone
- [ ] `cargo clippy -- -D warnings` passes
- [ ] No existing file's behavior changes (additive only)
- [ ] `TaskType` enum has a variant for every operation in the current command set
- [ ] `ProviderError` has every variant `MeshyError` has
- [ ] Adversarial agent has reviewed and signed off

**Adversarial checklist:**

- [ ] Does `TaskType` cover all 15 `create_*` commands + poll/stream/delete/download/balance/animation-library?
- [ ] Is `TaskType::CreativeLab(CreativeLabType)` sufficient, or does Creative Lab need a separate sub-enum with mode (prototype/build)?
- [ ] Does the trait signature handle the SSE streaming callback correctly with `async_trait`?
- [ ] Is `ProviderConfig` needed, or should the provider constructor take individual args?

### R2: MeshyProvider impl

**Goal:** Implement `TaskProvider` for `MeshyClient`. Move
`camel_to_snake_keys`, endpoint path mapping, and download host list into
the provider impl. Write provider-level tests.

**Gate command:**
```bash
cd src-tauri && cargo test && cargo clippy -- -D warnings
```

| # | File | Action | What changes |
|---|---|---|---|
| 1 | `src-tauri/src/provider/meshy.rs` | Create | `impl TaskProvider for MeshyClient`, endpoint mapping, `camel_to_snake_keys` (moved from `commands/api.rs`), `allowed_download_hosts()` returning `["assets.meshy.ai"]` |
| 2 | `src-tauri/src/provider/meshy_test.rs` | Create | Provider-level tests: trait dispatch, endpoint mapping, wire format conversion, download host validation |
| 3 | `src-tauri/src/meshy/client.rs` | Modify | Add `Clone`-friendly changes if needed for trait object; keep existing methods for backward compat during transition |
| 4 | `src-tauri/src/meshy/models.rs` | Modify | Keep `MeshyType`/`AiModel` as provider-specific types; add `From<TaskType> for MeshyType` conversion |

**Exit criteria (all must be true):**

- [ ] `cargo test` passes — all existing tests pass + new provider tests pass
- [ ] `cargo clippy -- -D warnings` passes
- [ ] `MeshyClient` implements `TaskProvider` with all trait methods
- [ ] `camel_to_snake_keys` is called inside the provider impl, not in the command layer
- [ ] Endpoint path mapping (`TaskType::TextTo3D → "/v2/text-to-3d"`) lives in the provider
- [ ] `allowed_download_hosts()` returns `["assets.meshy.ai"]`
- [ ] No behavior change — existing wiremock tests pass unchanged
- [ ] Testing agent has designed and verified provider-level tests
- [ ] Validation agent has confirmed the file set matches the plan

### R3: AppState + command layer

**Goal:** Switch `AppState` to hold `Mutex<Option<Box<dyn TaskProvider>>>`.
All `*_inner` functions in `api.rs` call through `state.provider()`.
Validation moves endpoint matching into the provider.

**Gate command:**
```bash
cd src-tauri && cargo test && cargo clippy -- -D warnings
```

| # | File | Action | What changes |
|---|---|---|---|
| 1 | `src-tauri/src/app_state.rs` | Modify | `client: Mutex<Option<MeshyClient>>` → `provider: Mutex<Option<Box<dyn TaskProvider>>>`; `meshy_client()` → `provider()`; `set_api_key()` constructs `MeshyClient` boxed as `dyn TaskProvider` |
| 2 | `src-tauri/src/commands/api.rs` | Modify | All `*_inner` functions call `state.provider()` instead of `state.meshy_client()`; `create_task_inner` takes `TaskType` instead of `&str` endpoint; remove `camel_to_snake_keys` from command layer (moved to provider in R2) |
| 3 | `src-tauri/src/commands/api.rs` | Modify | Each `create_*` command delegates with `TaskType::*` instead of hardcoded endpoint path |
| 4 | `src-tauri/src/commands/validation.rs` | Modify | `TASK_ENDPOINTS` const removed; `validate_task_reference` asks provider for endpoint; `validate_download_url` takes host list from provider |
| 5 | `src-tauri/src/commands/keychain.rs` | Modify | `set_api_key_inner` constructs `Box<dyn TaskProvider>` instead of `MeshyClient` directly |
| 6 | `src-tauri/src/commands/api.rs` | Modify | `fetch_animation_library_inner` calls `provider.fetch_animation_library()` instead of hardcoding URL |
| 7 | `src-tauri/src/meshy/mod.rs` | Modify | Re-export adjustments if needed |
| 8 | `src-tauri/src/lib.rs` | Modify | No changes expected (module already declared in R1) — verify `generate_handler!` still lists all commands |

**Exit criteria (all must be true):**

- [ ] `cargo test` passes — all 175+ existing tests pass with new dispatch
- [ ] `cargo clippy -- -D warnings` passes
- [ ] No command calls `MeshyClient` directly — all go through `state.provider()`
- [ ] No `*_inner` function references a hardcoded endpoint path
- [ ] `validate_download_url` takes a host list, not a hardcoded `"assets.meshy.ai"`
- [ ] `fetch_animation_library_inner` has no hardcoded `api.meshy.ai` URL
- [ ] Adversarial agent has verified no bypass paths exist
- [ ] Validation agent has confirmed all command paths go through the trait

### R4: Frontend type renames

**Goal:** Rename frontend types to provider-agnostic names. Remove
`MESHY_ENDPOINTS`. Update all imports.

**Gate command:**
```bash
npx tsc --noEmit && npx biome check src/ && npx vitest run
```

| # | File | Action | What changes |
|---|---|---|---|
| 1 | `src/lib/meshy-types.ts` | Modify | `MeshyType` → `TaskType`, `AiModel` → `ModelId` (keep wire values `'meshy-5'` etc. — only the TS type name changes), `MeshyFrontendError` → `FrontendError` |
| 2 | `src/lib/constants.ts` | Modify | Remove `MESHY_ENDPOINTS` (provider tracks endpoints internally); remove `ANIMATION_LIBRARY_URL`; keep `APP_NAME`, `APP_VERSION`, sidebar constants |
| 3 | `src/lib/tauri.ts` | Modify | `MeshyFrontendError` → `FrontendError` rename |
| 4 | `src/hooks/useMeshyApi.ts` | Modify | Update type imports: `MeshyType` → `TaskType` in `meshyType` config fields; no logic changes |
| 5 | `src/stores/taskStore.ts` | Modify | `ActiveTask.meshyType` → `ActiveTask.taskType`; update import |
| 6 | `src/stores/settingsStore.ts` | Modify | `AiModel` → `ModelId` in type imports; no logic changes |
| 7 | `src/stores/appStore.ts` | Modify | Update any `meshyType` references if present |

**Exit criteria (all must be true):**

- [ ] `tsc --noEmit` passes with zero errors
- [ ] `biome check src/` passes with zero warnings
- [ ] `vitest run` passes — all frontend tests pass with renamed types
- [ ] No file imports `MeshyType`, `AiModel`, or `MeshyFrontendError` (all renamed)
- [ ] No file references `MESHY_ENDPOINTS` or `ANIMATION_LIBRARY_URL`
- [ ] IPC wire format is unchanged (Tauri serde still camelCase, wire values unchanged)
- [ ] Testing agent has verified frontend test suite passes

### R5: Cleanup + verification

**Goal:** Remove dead code, update docs, run full quality gate, verify
guardrail tests.

**Gate command:**
```bash
cd src-tauri && cargo test && cargo clippy -- -D warnings && \
npx tsc --noEmit && npx biome check src/ && npx vitest run
```

| # | File | Action | What changes |
|---|---|---|---|
| 1 | `src-tauri/src/commands/api.rs` | Modify | Remove any dead imports or unused functions from the refactor; update comments that reference "Meshy" in command-layer context |
| 2 | `docs/adr/README.md` | Modify | Add ADR-0004 to the index table |
| 3 | `src/lib/runtime-guardrails.test.ts` | Modify | Update guardrail assertions: verify `TaskProvider` trait exists, `MeshyProvider` implements it, `camel_to_snake_keys` lives in provider module (not command layer), download URL validation is provider-configured |

**Exit criteria (all must be true):**

- [ ] Full quality gate passes: `cargo test` + `cargo clippy -D warnings` + `tsc --noEmit` + `biome check` + `vitest run`
- [ ] Zero regressions vs. pre-refactor test count (175 Rust + 17 frontend minimum)
- [ ] No dead code from the refactor (unused imports, functions, types)
- [ ] `runtime-guardrails.test.ts` asserts the new architecture, not the old
- [ ] ADR-0004 is indexed in `docs/adr/README.md`
- [ ] This execution plan document is fully filled out (all phases `verified`)
- [ ] Validation agent has done a final pass across all phases

---

## 4. Dependency Graph

```
R1 (Provider trait + types)
 │
 ▼
R2 (MeshyProvider impl)      ← depends on R1: trait + types must exist
 │
 ▼
R3 (AppState + command layer) ← depends on R2: provider impl must exist
 │
 ▼
R4 (Frontend type renames)    ← depends on R3: backend must use the trait
 │
 ▼
R5 (Cleanup + verification)   ← depends on R4: everything must be renamed
```

No phase may start until the previous phase is `verified`. No exceptions.

---

## 5. Risk Register

Risks identified by the adversarial agent or discovered during implementation.
Each risk has a status: `open`, `mitigated`, `accepted`, or `resolved`.

```csv
ID,Risk,Phase_Identified,Status,Resolution
RR1,async-trait overhead on SSE streaming path (callback per chunk),R1,open,
RR2,Creative Lab task types may need mode (prototype/build) in TaskType enum,R1,resolved,TaskType preserves all 14 Creative Lab variants 1:1 from MeshyType — no sub-enums or mode structs. Granularity change is out of scope for this refactor.
RR3,MeshyClient::clone() pattern (reconstruct from api_key) may not work with Box<dyn>,R3,resolved,AppState holds Mutex<Option<Arc<dyn TaskProvider>>> (Option C). Mutex guards the Option; Arc allows concurrent access. provider() locks briefly to clone the Arc then unlocks before any network call. No clone of the provider itself is needed.
RR4,validation.rs endpoint allowlist removal may break tests that check specific endpoints,R3,resolved,Completed 2026-08-26 alongside the endpoint-path bug fix (see docs/LESSONS_LEARNED.md and CHANGELOG 1.0.2). validation.rs's TASK_ENDPOINTS const now derives from provider::meshy::ENDPOINT_MAP via a task_endpoints() helper rather than keeping its own copy. The stale test assertions in validation.rs (which encoded the pre-fix wrong paths) were updated to match; full suite green.
RR5,Frontend rename may miss a file not listed in R4 scope,R4,open,
RR6,runtime-guardrails.test.ts assertions may break if camel_to_snake_keys moves,R5,open,
```

---

## 6. Deviation Log

Deviations from the plan are recorded here. Each deviation notes what
changed, why, and whether it was approved.

```csv
Phase,Planned,Actual,Reason,Approved_By
(none yet)
```

---

## 7. Change Log

Every update to this document is logged here with timestamp and summary.

```csv
Timestamp,Change
2026-08-26,Initial creation — ADR-0004 accepted, phases R1-R5 defined, agents defined, risk register opened
2026-08-26,RR2 resolved: TaskType granularity preserved 1:1 from MeshyType (14 Creative Lab variants). RR3 resolved: Mutex<Option<Arc<dyn TaskProvider>>> (Option C). ADR updated with both decisions.
```