# ADR-0004: Task Provider Abstraction (Multi-Provider Support)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-08-26 |
| **Deciders** | Project owner (confirmed Option A — trait-based abstraction) |
| **Phase** | Phase 3 (Generation Workflows) — before expanding panel feature surfaces |
| **Related rules/features** | CSD CTR-07, IPC-01–10, STT-01–07; TDD §6.2, §7.1, §7.2 |
| **Supersedes** | None |
| **Execution plan** | [`docs/refactoring/provider-abstraction.md`](../refactoring/provider-abstraction.md) |

## Context

MeshyForge's backend is tightly coupled to the Meshy API at every layer:

- `AppState` holds `Mutex<Option<MeshyClient>>` — a concrete struct, not a
  trait object.
- `MeshyClient` hardcodes `https://api.meshy.ai/openapi`, Bearer auth, and
  `/v1/balance`.
- `MeshyError` is the sole error type — no generic `ProviderError`.
- 15 `create_*` Tauri commands embed Meshy endpoint paths (`/v2/text-to-3d`,
  `/v1/remesh`, etc.).
- `MeshyType` enum (30+ variants) mirrors Meshy's exact task taxonomy.
- `AiModel` enum names variants after Meshy's versions (`Meshy5`, `Meshy6`,
  `Meshy7`).
- Download URL validation allows only `assets.meshy.ai`.
- `camel_to_snake_keys()` converts frontend camelCase to Meshy's snake_case
  wire format.
- The frontend's `meshy-types.ts` mirrors this coupling with `MeshyType`,
  `AiModel`, `MeshyFrontendError`, and `MESHY_ENDPOINTS`.

The only trait in the backend is `Keychain` (abstracts OS keychain, not
providers).

**Needs-an-ADR test satisfied — criteria 1, 2, 3:**

- **Criterion 1 (crosses IPC boundary):** Affects `lib/tauri.ts`,
  `commands/*.rs`, `meshy-types.ts`. The trait abstraction is the new seam
  between the command layer and the HTTP client layer.
- **Criterion 2 (deviates from numbered rules):** The IPC contract assumed
  commands map 1:1 to Meshy endpoints. This ADR introduces an indirection
  layer where commands call `state.provider().create_task(TaskType::*, body)`
  instead of hardcoding endpoint paths.
- **Criterion 3 (touches security posture):** Download URL validation
  moves from a hardcoded `assets.meshy.ai` allowlist to a per-provider
  `allowed_download_hosts()` method. Auth scheme becomes per-provider.

**Constraints found:**

- `app_state.rs:13` — `AppState.client: Mutex<Option<MeshyClient>>` concrete
  type. All command `*_inner` functions call `state.meshy_client()`.
- `meshy/client.rs:11` — `DEFAULT_BASE_URL = "https://api.meshy.ai/openapi"`
  hardcoded.
- `commands/api.rs:73–90` — `camel_to_snake_keys` / `camel_to_snake` are
  Meshy-specific wire-format converters living in the command layer.
- `commands/api.rs:286` — `fetch_animation_library_inner` hardcodes
  `https://api.meshy.ai/web/public/animations/resources`.
- `commands/validation.rs:185–192` — `validate_download_url` hardcodes
  `assets.meshy.ai`.
- `meshy/models.rs:28–46` — `AiModel` enum variants literally named
  `Meshy5`/`Meshy6`/`Meshy7`.
- `meshy/models.rs:47–120` — `MeshyType` enum with 30+ Meshy-specific
  `#[serde(rename = "...")]` values.
- `lib/tauri.ts:12` — `MeshyFrontendError` interface name.
- `lib/meshy-types.ts:8–40` — `MeshyType` union type with Meshy-specific
  strings.
- `lib/meshy-types.ts:10` — `AiModel` union: `'meshy-5' | 'meshy-6' | ...`.
- `lib/constants.ts:3–18` — `MESHY_ENDPOINTS` map with Meshy endpoint paths.
- `lib/constants.ts:20` — `ANIMATION_LIBRARY_URL` hardcoded to Meshy.
- `Cargo.toml` — Rust edition 2021, rust-version 1.75. No `async-trait`
  dependency currently.
- 175 existing Rust tests + 17 frontend tests must pass after refactor.

**Precedent search record:**

- Searched `docs/**` for: `provider`, `trait`, `abstract`, `swap`,
  `decouple`, `multi-provider`, `backend.*agnostic`, `vendor`. Zero results
  in TDD, CSD, UI/UX, FRD, GREB, TSS, or threat model.
- Searched `docs/adr/**` — ADR-0001 (CI branch triggers), ADR-0002 (download
  origin policy), ADR-0003 (preview lighting). None address provider
  abstraction.
- Searched `src-tauri/src/**` for: `trait`, `dyn`, `impl.*for`. Found only
  `security/keychain.rs` `Keychain` trait. No provider-level abstraction
  exists or was planned.

## Options Considered

### Option A: Full provider trait with `Box<dyn TaskProvider>` in AppState

Introduce a `TaskProvider` trait that abstracts all provider operations:

```rust
#[async_trait]
trait TaskProvider: Send + Sync {
    async fn create_task(&self, task_type: &TaskType, body: serde_json::Value)
        -> Result<TaskCreateResponse, ProviderError>;
    async fn get_task(&self, task_type: &TaskType, task_id: &str)
        -> Result<serde_json::Value, ProviderError>;
    async fn cancel_task(&self, task_type: &TaskType, task_id: &str)
        -> Result<(), ProviderError>;
    async fn get_balance(&self) -> Result<i64, ProviderError>;
    async fn download_file(&self, url: &str, dest: &Path)
        -> Result<u64, ProviderError>;
    async fn stream_task(&self, task_type: &TaskType, task_id: &str,
        on_event: Box<dyn Fn(serde_json::Value) + Send>)
        -> Result<(), ProviderError>;
    async fn fetch_animation_library(&self)
        -> Result<serde_json::Value, ProviderError>;
    fn allowed_download_hosts(&self) -> &[&str];
    fn endpoint_for(&self, task_type: &TaskType) -> &str;
}
```

`AppState` holds `Mutex<Option<Arc<dyn TaskProvider>>>`. The mutex guards
the `Option` (key set / not set); the `Arc` allows concurrent provider access
without holding the lock during network calls. `provider()` locks briefly
to clone the `Arc`, then unlocks before any async work. This matches the
current pattern where `meshy_client()` locks, clones, and immediately
unlocks. Commands call through `state.provider()`. `MeshyClient`
implements `TaskProvider`. A generic `TaskType` enum replaces `MeshyType`.
A generic `ProviderError` replaces `MeshyError`. Wire-format conversion
(`camel_to_snake_keys`) moves into the `MeshyProvider` impl, not the command
layer.

**Pros:** Clean seam — adding a second provider is
`impl TaskProvider for TripoClient`. All future feature work automatically
works for any provider. Download URL validation is per-provider. Each phase
of the refactor can be independently compiled and tested.

**Cons:** `Box<dyn>` + `async-trait` overhead (minor for a desktop app).
Requires new dependency `async-trait` (Rust 1.75 native `async fn in trait`
has object-safety limitations for `Box<dyn TaskProvider>`). Larger refactor
touching ~15 files. No user-visible improvement — this is pure architecture.

### Option B: Enum-dispatch without a trait

Replace `MeshyClient` with an enum:

```rust
enum Provider {
    Meshy(MeshyClient),
    // Future: Tripo(TripoClient),
}
```

`AppState` holds `Mutex<Option<Provider>>`. Every operation matches on the
enum. No trait, no `dyn`.

**Pros:** No `async-trait` overhead. Explicit. Easy to understand. No new
dependency.

**Cons:** Every operation method must be updated when a provider is added
(match arm explosion). No polymorphism — adding provider N means editing
every method. The enum becomes a maintenance bottleneck with 3+ providers.
Still requires the same `TaskType` taxonomy and `ProviderError` rename.

### Option C: Defer — keep Meshy coupling, expand features now

Close the Multi-Image panel gaps against the current architecture. No trait,
no generic types. Accept that the coupling deepens.

**Pros:** Fastest path to user-visible improvement. No refactor risk.

**Cons:** Every feature gap closed makes the eventual refactor harder. The
coupling compounds — new parameters get hardcoded into Meshy-specific types.
A future provider swap becomes a full rewrite.

## Decision

**Option A: Full provider trait with `Box<dyn TaskProvider>` in AppState.**

The project owner has chosen this path. The trait abstraction is the right
architectural seam: it makes provider swappability a first-class concern
without the maintenance cost of enum dispatch (Option B) or the technical
debt of deferral (Option C).

Key design decisions within Option A:

1. **`async-trait` crate** — use `async_trait` for the `TaskProvider` trait.
   Rust 1.75's native `async fn in trait` has object-safety limitations that
   would prevent `dyn TaskProvider`. The `async-trait` crate is
   compatible with the project's Rust version (1.75+) and adds negligible
   overhead for a desktop app. License: MIT OR Apache-2.0 (passes DEP-06).

2. **Generic `TaskType` taxonomy** — replaces `MeshyType` with a
   provider-agnostic enum at the **same granularity**. All 30+ variants
   in the current `MeshyType` (including the 14 Creative Lab variants) are
   preserved 1:1 as `TaskType` variants. No sub-enums, no mode structs — the
   taxonomy is a direct rename, not a redesign. Changing the granularity
   would require touching the SQLite schema, frontend types, hook configs,
   and the FRD feature catalog, none of which are in scope for this refactor.
   The provider maps each `TaskType` variant to its own endpoint path
   internally via `endpoint_for()`.

3. **Generic `ProviderError`** — replaces `MeshyError`. Same variants,
   different name. `MeshyError` is mapped at the provider implementation
   boundary.

4. **Wire-format conversion moves into provider** — `camel_to_snake_keys`
   stays in the `MeshyProvider` impl, not in the command layer. Each provider
   handles its own wire format.

5. **Download URL validation per-provider** — `allowed_download_hosts()`
   returns `&["assets.meshy.ai"]` for Meshy. The validation function takes a
   host list rather than hardcoding it.

6. **Frontend type renames are cosmetic** — `MeshyType` → `TaskType`,
   `AiModel` → `ModelId`, `MeshyFrontendError` → `FrontendError`. The IPC
   wire format doesn't change (Tauri serde still camelCase). These renames
   signal the abstraction but don't break the IPC contract.

7. **Command names stay as-is** — `create_text_to_3d`,
   `create_image_to_3d`, etc. are semantic operation names, not Meshy
   endpoint paths. The command delegates to
   `state.provider().create_task(TaskType::TextTo3D, body)` instead of
   hardcoding `/v2/text-to-3d`.

8. **New dependency: `async-trait`** — added to `Cargo.toml`. License:
   MIT OR Apache-2.0 (passes DEP-06 license allowlist).

## Consequences

- Adding a second provider = `impl TaskProvider for NewClient` + a factory
  in `AppState::new()`. No changes to commands, hooks, or components.
- `AppState.provider` is `Mutex<Option<Arc<dyn TaskProvider>>>` — the mutex
  is only held during the `Option` check and `Arc::clone`, not during network
  calls. This prevents the SSE streaming path from blocking other commands.
- `MeshyType`/`AiModel` renames ripple through `meshy-types.ts`,
  `useMeshyApi.ts`, `taskStore.ts`, `settingsStore.ts`, and `constants.ts`
  on the frontend. The Rust `MeshyType` and `AiModel` enums move to
  `meshy/models.rs` as provider-specific, with the generic `TaskType` in a
  new `provider/mod.rs`.
- The `camel_to_snake_keys` conversion and endpoint path mapping become
  `MeshyProvider` implementation details, not command-layer concerns.
- The existing 175 Rust tests and 17 frontend tests need updating for type
  renames and the new trait dispatch, but the test logic itself doesn't
  change.
- `validation.rs` endpoint allowlist moves from a hardcoded `TASK_ENDPOINTS`
  const array to a provider-supplied `endpoint_for(TaskType)` method. The
  command layer validates task references by asking the provider for the
  endpoint, not by checking a static list.

## Execution

The implementation is tracked in a living execution plan at
[`docs/refactoring/provider-abstraction.md`](../refactoring/provider-abstraction.md).
That document is the single source of truth for refactor state — it is
updated as each phase completes, and it records what was actually done vs.
what was planned.