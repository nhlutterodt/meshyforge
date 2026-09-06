# Grounding Memo: Concept 01 — Per-Task-Type Provider Registry

**Date:** 2026-09-05
**Scope:** Read-only research. No source, ADR, or governance file was modified.
**Question under investigation:** Does the "Provider Selection & Multi-Backend
Architecture" proposal (let users pick a different backend per task type,
e.g. Meshy for Text-to-3D but a different provider for Rigging) conflict with
the already-Accepted `docs/adr/0004-task-provider-abstraction.md`, and how
deep does the conflict go?

---

## Current state

### AppState holds exactly one provider slot

- `src-tauri/src/app_state.rs:21` — `pub provider: Mutex<Option<Arc<dyn TaskProvider>>>`.
  Single field, not a map/registry. Doc comment at lines 16-20 explicitly
  frames this as "the provider" (singular) constructed once at startup from
  the keychain key.
- `src-tauri/src/app_state.rs:64-67` — `provider()` locks the mutex only long
  enough to clone the `Arc`, then returns. This matches ADR-0004's
  Consequences claim ("the mutex is only held during the `Option` check and
  `Arc::clone`, not during network calls") — **verified against the actual
  code, not just the ADR's prose.**
- `src-tauri/src/app_state.rs:70-77` and `79-87` — `set_api_key` /
  `clear_api_key` both replace the *entire* `provider` slot. There is no way
  to set a provider for one task type without clobbering the provider used
  by every other task type.

### The lock-not-held-during-network-calls claim, traced end to end

- `src-tauri/src/commands/api.rs:473-475` (`stream_task_inner`, the SSE path)
  calls `state.provider()` once, receives an owned `Arc`, and the mutex guard
  from `app_state.rs:65` is already dropped by the time
  `provider.stream_task(...)` runs at `src-tauri/src/commands/api.rs:480-494`.
  The same pattern repeats at `commands/api.rs:71,95,115,137-139` for
  `create_task_inner`, `poll_task_inner`, `delete_task_inner`, and
  `download_asset_inner`. **Confirmed: the lock is never held during any
  network or streaming call**, only during the `Arc::clone`. This is the one
  ADR-0004 claim this research explicitly re-verified rather than trusting.

### The `TaskProvider` trait and its one implementation

- `src-tauri/src/provider/mod.rs:29-83` — the `TaskProvider` trait: 9 methods
  (`create_task`, `get_task`, `cancel_task`, `get_balance`, `download_file`,
  `stream_task`, `fetch_animation_library`, `allowed_download_hosts`,
  `endpoint_for`). All operate on `&self` — none take a task-type-to-provider
  lookup as an argument; the trait's whole design assumes the receiver *is*
  the provider for whatever `TaskType` is passed in.
- `src-tauri/src/provider/meshy.rs:107-197` — the only
  `impl TaskProvider for MeshyClient` in the tree (confirmed via
  `grep "impl TaskProvider for"` across `src-tauri/src`, one match). Its
  `ENDPOINT_MAP` (`meshy.rs:24-56`) covers all 30 `TaskType` variants mapping
  to Meshy paths — i.e. today, one provider instance is expected to answer
  for every task type that exists.

### Credential storage is single-slot, not namespaced per provider or task type

- `src-tauri/src/security/keychain.rs:12` — `const SERVICE_NAME: &str = "meshyforge"`,
  paired with a single `ACCOUNT_NAME` (used at lines 36, 42, 51). One
  fixed keychain entry for the whole app; nothing keys credentials by
  provider ID or `TaskType`.
- `src-tauri/src/commands/keychain.rs:65-76` (`set_api_key_with_keychain_inner`)
  stores exactly one key and calls `state.set_api_key(...)`, which (per
  `app_state.rs:70-77`) replaces the single provider slot.

### No settings/UI surface exists for choosing a provider, let alone per task type

- `src/stores/settingsStore.ts:8-32` — `SettingsState` is a flat set of
  generation defaults (`defaultAiModel`, `defaultTextureResolution`, etc.)
  with no field resembling a provider selection, and no
  `Record<TaskType, ProviderId>`-shaped structure.
- `src/components/settings/ApiKeyManager.tsx:14-138` — the entire API-key UI
  is a single labeled field, hardcoded title "Meshy API Key" (line 79),
  calling `set_api_key` / `get_api_key` / `validate_api_key` /
  `delete_api_key` (lines 21, 37, 54, 66) with no provider or task-type
  parameter anywhere in the component.

---

## Exact ADR-0004 clauses this proposal would reopen

From `docs/adr/0004-task-provider-abstraction.md`:

1. **The single-active-provider design itself** (Decision, Option A,
   lines 115-120):
   > "`AppState` holds `Mutex<Option<Arc<dyn TaskProvider>>>`. The mutex
   > guards the `Option` (key set / not set); the `Arc` allows concurrent
   > provider access without holding the lock during network calls."

   This describes *one* provider slot for the whole app. A per-task-type
   registry needs `AppState` to hold something like
   `Mutex<HashMap<TaskType, Arc<dyn TaskProvider>>>` (or an equivalent
   per-task-type resolution structure) — a different shape than what was
   decided, not a superset of it.

2. **The explicit scope boundary on `TaskType` granularity** (Decision,
   point 2, lines 186-194):
   > "Generic `TaskType` taxonomy — replaces `MeshyType` with a
   > provider-agnostic enum at the **same granularity**. ... No sub-enums,
   > no mode structs — the taxonomy is a direct rename, not a redesign.
   > Changing the granularity would require touching the SQLite schema,
   > frontend types, hook configs, and the FRD feature catalog, none of
   > which are in scope for this refactor."

   A per-task-type provider registry doesn't strictly require changing
   `TaskType`'s granularity, but it does require a *new* structure keyed by
   `TaskType` (a provider map) that didn't exist in the accepted design, and
   plausibly touches the same downstream surfaces (settings, hook configs)
   this clause named as out of scope.

3. **The Consequences section's "adding a provider" story** (lines 224-225):
   > "Adding a second provider = `impl TaskProvider for NewClient` + a
   > factory in `AppState::new()`. No changes to commands, hooks, or
   > components."

   This is the ADR's stated benefit of Option A — but it describes swapping
   the *one active* provider, not running two providers concurrently, one
   per task type. A per-task-type registry contradicts "no changes to
   commands, hooks, or components": the command layer (`commands/api.rs`)
   would need to know *which* provider to fetch for a given `TaskType`
   instead of calling `state.provider()` and getting the only one that
   exists, and something (a settings UI, at minimum) has to let the user
   express that per-task-type choice — a component change.

4. **Rejection rationale for Option B** (lines 153-155), by analogy:
   > "Every operation method must be updated when a provider is added
   > (match arm explosion). ... The enum becomes a maintenance bottleneck
   > with 3+ providers."

   This was written about enum dispatch, not a registry, but the underlying
   concern — dispatch complexity growing with provider count — is directly
   relevant to evaluating a *registry* option now, since a registry raises
   the same question (how does the command layer resolve "the" provider)
   that Option A resolved by fixing the count at one.

---

## Downstream call-site inventory (what currently assumes a single active provider)

All confirmed via `grep -rn "state\.provider\(\)|state\.provider\b" src-tauri/src`:

| File:line | Assumption |
|---|---|
| `src-tauri/src/commands/api.rs:71` (`create_task_inner`) | One `state.provider()` call resolves the provider for whatever `TaskType` is passed; no per-type lookup. |
| `src-tauri/src/commands/api.rs:95` (`poll_task_inner`) | Same. |
| `src-tauri/src/commands/api.rs:115` (`delete_task_inner`) | Same. |
| `src-tauri/src/commands/api.rs:137-139` (`download_asset_inner`) | Same; also calls `provider.allowed_download_hosts()` implicitly through `validate_download_url`, assuming one host allowlist for the whole session. |
| `src-tauri/src/commands/api.rs:473-475` (`stream_task_inner`, SSE path) | Same; this is the long-lived streaming path — if two task types active concurrently used different providers, this call site would need a task-type-aware resolution step that doesn't exist today. |
| `src-tauri/src/app_state.rs:64-67` (`provider()` accessor) | Returns `Option<Arc<dyn TaskProvider>>` with no `TaskType` parameter — the accessor itself has no notion of "provider for X". |
| `src-tauri/src/app_state.rs:70-77` / `79-87` (`set_api_key` / `clear_api_key`) | Both operate on "the" provider slot; setting a key for one purpose necessarily clears/replaces it for every task type. |
| `src-tauri/src/commands/keychain.rs:65-76` / `88-` (credential inner fns) | One keychain entry (`security/keychain.rs:12` `SERVICE_NAME`), so today there's no way to hold, e.g., a Meshy key and a second provider's key simultaneously. |
| `src/components/settings/ApiKeyManager.tsx` (entire file) | Single hardcoded "Meshy API Key" field/flow; no concept of selecting a provider, let alone one per task type. |
| `src/stores/settingsStore.ts:8-32` | Flat settings shape; no field for per-task-type provider selection exists to persist such a choice even if the backend supported it. |

**Test surface that references the provider slot** (all assume single-slot
semantics — `is_some()`/`is_none()` on one `Option`, not a per-key lookup):
`src-tauri/src/app_state.rs:113-181` (6 tests), `src-tauri/src/commands/keychain.rs:184,188,214,218,272,279-280,312,319-320` (9 assertions across several tests).

---

## Precedent search record

Exact terms searched and files checked (all read-only greps):

1. **`multi-provider|provider registry|per-task provider|Tripo|backend-agnostic|swap provider|multi provider|multiple provider`** (case-insensitive) across `docs/**/*.md` (all 18 root docs, `docs/adr/`, `docs/refactoring/`, `docs/governance/`, `docs/doc-sync/`, `docs/audits/`).
   **Result:** matches only in `docs/adr/README.md` and
   `docs/adr/0004-task-provider-abstraction.md` themselves (the ADR's own
   precedent-search record, quoting the same terms it searched). **Zero
   results** in any other doc — TDD, CSD, UI/UX, FRD, GREB, TSS, threat
   model, LESSONS_LEARNED, CHANGELOG, user_guide, gap_assessment,
   hook_implementations, rust_type_definitions,
   zustand_store_implementations, test_plan, SECURITY, CONTRIBUTING.
2. **`registry|per-task|local model|open-source model`** (case-insensitive)
   across `docs/**/*.md`. Matches found in
   `docs/technical_design_document.md:1832`, `docs/feature_requirements_documentation.md:598`,
   `docs/coding_standards.md`, `docs/UI_UX_Documentation.md`,
   `docs/LESSONS_LEARNED.md`, `docs/CHANGELOG.md`,
   `docs/doc-sync/2026-09-05-viewport-registry-sync-plan.md`,
   `docs/adr/0006-viewport-control-registry.md`, `docs/adr/README.md` — but
   on inspection every hit is either "per-task **directories**" (asset file
   storage, unrelated to providers) or "**registry**" referring to
   ADR-0006's *viewport control* registry (a 3D-preview-camera concept,
   unrelated to task providers). **No hit anywhere concerns a provider
   registry or per-task-type backend selection.**
3. Grepped `src-tauri/src/**` for `impl TaskProvider for` — exactly one
   match (`provider/meshy.rs`), confirming no second provider implementation
   or registry-like dispatch exists in code today, consistent with the docs
   search finding no precedent.
4. Checked `docs/refactoring/provider-abstraction.md` (the ADR-0004
   execution plan, its designated single source of truth for refactor
   state) — status table (line 8-9) says "Refactor complete — all phases
   verified... 526 tests passing (189 Rust + 337 frontend)" as of that
   document's last update, with no mention of a registry or per-task
   provider concept anywhere in its phase/file-scope tables.

**Conclusion of precedent search:** no planning doc, ADR, or execution-plan
document anywhere in the repository discusses a per-task-type provider
registry, multi-backend concurrent operation, or naming a second concrete
provider (e.g. Tripo) as a target. ADR-0004 is the only place "multi-provider"
language appears, and it explicitly chose the single-active-provider shape.

---

## Preliminary needs-an-ADR classification

Per `.claude/skills/adr-log/SKILL.md` Step 2, an ADR is required if **any
one** of six criteria is true. This proposal trips at least four:

- **Criterion 1** — "Crosses the Rust<->TS/IPC boundary, or binds >=2
  modules or a directory-level convention." A per-task-type registry
  necessarily touches `commands/api.rs` (provider resolution per call),
  `app_state.rs` (state shape), `lib/tauri.ts`/`meshy-types.ts` (a provider
  identifier would need to cross IPC alongside `TaskType`), and the
  settings store/UI (a new selection surface) — more than two modules, and
  a new IPC-boundary concept (which provider a given task-type call should
  use) that doesn't exist today.
- **Criterion 2** — "Extends, narrows, or deviates from a numbered rule."
  This directly narrows/reopens ADR-0004 Decision point 2's explicit
  out-of-scope declaration on `TaskType` granularity and design (quoted
  above), and Option A's chosen `AppState` shape.
- **Criterion 3** — "Touches the SQLite schema, the IPC contract,
  keychain/security posture, or a documented residual risk." Multiple
  concurrent credential sets means the single-entry keychain design
  (`security/keychain.rs:12`, `SERVICE_NAME`/`ACCOUNT_NAME`) would need to
  become namespaced per provider — a keychain/security-posture change, and
  `security_threat_model.md` §10's keychain-namespacing residual risk (per
  `adr-log`'s own citation of that risk list) is arguably exactly what this
  would need to resolve or reopen.
- **Criterion 6** — "Expensive to reverse, or will likely be re-litigated
  later." ADR-0004 was itself the outcome of choosing between three
  competing shapes (trait/dyn, enum dispatch, defer) specifically to avoid
  future rework; reopening the AppState shape again 10 days after
  "Accepted" status and after the execution plan reports "Refactor
  complete... all phases verified" is precisely the kind of decision this
  criterion flags as needing deliberate re-litigation, not an incidental
  extension.

Criteria 4 (dependency change) and 5 (resolves a doc contradiction) are not
clearly triggered by the proposal itself, though a registry implementation
might incidentally add a dependency (e.g. for a local/open-source model
runtime) — that would be a separate, additional Criterion 4 trigger at
implementation time, not evaluated here since no such dependency was named
in the proposal as given.

---

## Open questions

1. **Is "registry" meant as strictly-sequential (one provider actively
   in-flight at a time, switched between task types) or truly concurrent**
   (e.g. a Text-to-3D task on Meshy running while a Rigging task streams
   from a different provider simultaneously)? The current SSE path
   (`stream_task_inner`) has no concurrency guard beyond the `Arc` clone
   pattern, so true concurrency raises questions (e.g. per-provider rate
   limiting, download-host allowlist merging across providers) that neither
   the proposal text nor any doc addresses.
2. **What happens to `endpoint_for()` and `allowed_download_hosts()`**
   (both currently `&self` methods returning a single provider's answer,
   `provider/mod.rs:78-82`) when a `TaskType` could resolve to different
   providers depending on user settings — does download-URL validation
   (`commands/validation.rs`, referenced in ADR-0004 Decision point 5) need
   to become a union of allowlists, or does it need to know which provider
   handled a specific task to validate against just that provider's hosts?
   Not resolvable from docs/code alone.
3. **Test-count staleness**: ADR-0004's Context section (line 73) states
   "175 existing Rust tests + 17 frontend tests must pass after refactor."
   The refactor's own execution-plan doc
   (`docs/refactoring/provider-abstraction.md:9`) already supersedes this
   with "526 tests passing (189 Rust + 337 frontend)" at refactor
   completion. A fresh grep during this research counted 214
   `#[test]`/`#[tokio::test]` attributes in `src-tauri/src` and 373
   `it(`/`test(` call sites across 57 frontend `*.test.ts(x)` files —
   higher again than the execution-plan's completion snapshot, consistent
   with ongoing feature work since (e.g. the viewport-control-registry
   commit `afd36d7` noted in git log). **The ADR's own 175/17 figures are
   stale artifacts of the Context section written before the refactor
   ran**; anyone citing ADR-0004 for current test counts should use the
   execution plan or a fresh test run instead. This wasn't independently
   run as a test suite — only counted via grep of test-attribute/call
   patterns, so exact figures may include non-unique matches (e.g.
   `test.each`, nested `it()` in `describe` blocks) rather than a verified
   passing-test count.
4. **No proposal document was supplied to this research** beyond the
   one-paragraph description in the task prompt — this memo cannot cite
   file:line locations for the "Provider Selection & Multi-Backend
   Architecture" proposal itself since it does not appear to exist as a
   committed doc anywhere in `docs/` (confirmed absent from the precedent
   search above). If a fuller proposal document exists elsewhere, it was
   not found and was not in scope for this read-only pass.
