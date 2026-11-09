# ADR-0016: MockRuntime IPC Round-Trip Harness at the Command Boundary

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-08 |
| **Deciders** | Neils (confirmed Option A via the adr-log weight gate, 2026-11-08) |
| **Phase** | Phase 5 (Polish and Release) — test infrastructure |
| **Related rules/features** | IPC-01–10, TST-10, TC-INF-07-01, E2E-01–10 |
| **Supersedes** | None |

## Context

866 automated tests (492 frontend, 374 Rust) exist, and **none of them ever
crosses the real Tauri IPC boundary**. The frontend suite mocks `@lib/tauri`
(50 test files) — even `src/lib/tauri.test.ts` mocks `@tauri-apps/api/core`
itself; the Rust suite calls the `*_inner` functions directly, bypassing the
`#[tauri::command]` wrappers and the `generate_handler!` dispatch entirely.
`docs/audits/e2e-ui-qa-2026-11-08.md` §2 records this explicitly and proves it
bites: that manual run found user-facing defect QA-01 that all 866 tests missed.

Failure classes that live only at the seam:

1. **Argument-name casing** — Tauri v2 maps Rust `snake_case` command params to
   `camelCase` JS keys; a mismatch compiles clean, passes every existing test,
   and fails only at runtime.
2. **Registration/dispatch gaps** — a command registered but mis-wired, or the
   destructive `request_recovery_restore` leaking into the main registry.
3. **Error-envelope transport** — the `{code, message}` JSON-string contract is
   tested by having Rust *build* the string and TS *parse* a hand-written
   string; the two have never met. The recovery-envelope bug in
   `docs/CHANGELOG.md` is exactly this class.

**Trigger:** Needs-an-ADR criteria 1 (crosses the Rust↔TS IPC boundary and binds
a directory-level test convention), 2 (extends the CSD `IPC` namespace with a
proposed IPC-11), 4 (Cargo feature change), and 6 (the harness shape will be
re-litigated at every new command if not decided now).

**Constraints found:**
- `coding_standards.md` §7.1 IPC-01/IPC-09/IPC-10 — commands return
  `Result<T, String>`, must be registered in `generate_handler!`, called only
  through `lib/tauri.ts`. The harness must exercise this contract, not a
  parallel one.
- `.claude/rules/rust-backend.md` — "Use injected test doubles and temporary
  databases rather than real user keychain entries or application data." This
  forbids crossing `set_api_key`/`get_api_key`/`delete_api_key` while they
  hardcode `RealKeychain`, and forced the `AppState.keychain` seam (§Decision 3).
- `test_plan.md` TC-INF-07-01 (`invoke_get_credit_balance__returns_balance_through_registered_command`,
  type E2E) — the only planned real-IPC test; Tier 1 satisfies its registration
  half without a WebView.
- `src/lib/ipc-contract.guardrail.test.ts` — regex-parses `generate_handler![...]`
  blocks **from `lib.rs` source text**; the shared registry must stay in
  `lib.rs` or the guardrail silently loses coverage.
- `CSD TST-10` — "Rust tests use `#[tokio::test]` for async. No `block_on()`."
  `tauri::test::get_ipc_response` is internally synchronous (channel rendezvous
  with tauri's own lazy `async_runtime`), so plain `#[test]` complies.

**Precedent search record:**
- Searched: `MockRuntime`, `mock_builder`, `tauri::test`, `tauri-driver`,
  `wdio`, `webdriver`, `playwright`, `ipc round trip`, `integration test`,
  rule namespaces `IPC-*`, `TST-*`, `TC-INF-*` — across all planning docs in
  `docs/`, `docs/adr/*.md`, `.github/workflows/`, `src/`, `src-tauri/`.
- Result: **no prior ADR** decides IPC-boundary testing. `technical_design_document.md`
  §testing names "Vitest + Tauri test utils" for integration tests — the only
  doc gesture toward this, never implemented. `docs/audits/validation-33d1e43-2026-08-25.md`
  confirms "Playwright E2E | 0 files | not implemented". ADR-0015 (TPC-05) and
  the CHANGELOG record seam defects this harness prevents, but no decision on
  how to test the seam.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A — Shared `add_commands<R>` registry + `tauri::test` MockRuntime harness (dev-only)** | One command list, zero drift; exercises real serde decode, camelCase param mapping, `generate_handler!` dispatch, and the error envelope in-process; no WebView/GPU/CI-infra needed; guardrail regex still finds the list in `lib.rs` | Touches production `lib.rs` (thin extraction); tauri `test` module is marked unstable; new dev-dependency feature | None — extends IPC namespace via proposed IPC-11 |
| B — Duplicate the command list inside the test harness | Zero production risk | A command registered in `run()` but missing from the harness is a *silent* gap — recreates the exact defect class being closed; violates the single-registry intent of IPC-09 | IPC-09 (registry drift) |
| C — Full cross-process E2E now (Playwright + CDP / tauri-driver) | True end-to-end including WebView transport | Needs Windows runner + WebView2 + built binary; slow; the QA doc §12 caveats (no `browser.close()` on CDP, readiness polling) make it fragile in CI today; overkill for the casing/envelope classes | Phase 5 gate scope (test_plan §E2E), not a Tier-1 need |
| D — Status quo (static guardrails only) | No cost | `ipc-contract.guardrail.test.ts` proves names match, not that dispatch, param decode, or envelope transport work; QA-01-class defects stay invisible | Fails the purpose of this ADR |

Option C remains the Phase 5 gate requirement (E2E-01–10) and is unaffected by
this decision — Tier 1 does not replace it, it closes the two highest-yield
classes now.

## Decision

**Adopt Option A: a MockRuntime IPC round-trip harness as the repo's Tier-1
boundary test, in four parts:**

1. **Shared registry** — `pub fn add_commands<R: tauri::Runtime>(builder) -> builder`
   in `src-tauri/src/lib.rs` owns the single `generate_handler![...]` list used
   by `run()`. The recovery-UI builder keeps its own deliberately smaller
   registry (destructive-command isolation is asserted, not inherited).
2. **Dev-only feature** — `[dev-dependencies] tauri = { version = "2", features = ["test"] }`.
   Production builds keep only `protocol-asset`; the `test` feature unifies into
   test targets only.
3. **Keychain seam** — `AppState` gains `pub keychain: Arc<dyn Keychain>`
   (production default `RealKeychain`; `new_with_keychain` now takes
   `Arc<dyn Keychain>`). The three keychain commands route through
   `state.keychain` instead of the hardcoded `RealKeychain`, so the harness can
   cross them with `InMemoryKeychain` — required by `.claude/rules/rust-backend.md`
   (no real user keychain entries). Production behavior is unchanged.
4. **Harness** — `src-tauri/tests/ipc_round_trip.rs`: `mock_builder()` +
   `add_commands` + `AppState(tempdir, InMemoryKeychain)`, invoking ~16 commands
   across all five command modules through `tauri::test::get_ipc_response` with
   **camelCase JSON bodies** (pinning the param-mapping contract) and asserting
   `{code, message}` envelope codes on every rejection path.

**Newly proposed rule ID(s):**
- `IPC-11` (proposed) — Every command registered in the main
  `generate_handler!` must have at least one MockRuntime round-trip test in
  `src-tauri/tests/ipc_round_trip.rs` pinning (a) its camelCase argument decode
  and (b) the `{code, message}` envelope on its primary rejection path. New
  commands without a harness entry fail review.

## Consequences

**Positive:**
- Param-casing, registration, dispatch, and envelope-transport defects become
  compile/test-time failures instead of runtime surprises (QA-01's class).
- TC-INF-07-01's "real IPC round trip through `generate_handler!` registration"
  is satisfied for the balance command's dispatch half without a WebView.
- One command registry with no drift path; the existing static guardrail keeps
  its text-parsing role unchanged.
- Runs in `cargo test` on all three CI platforms today — zero new CI infra.

**Negative:**
- `tauri::test` is marked unstable upstream; a future Tauri minor bump may
  require harness adjustments (mitigation: harness is one file, ~16 tests).
- `lib.rs` production code changes shape (thin extraction + `state.keychain`
  routing); the `run()`-registry text test in `lib.rs` tests was rewritten to
  target `add_commands`.
- The WebView transport layer (postMessage/IPC bridge, `convertFileSrc`, CSP,
  real events) remains untested by this tier — Phase 5 E2E scope, unchanged.

**Follow-ups:**
- Docs to update (handoff to `doc-sync`): `coding_standards.md` §7.1 (IPC-11),
  `test_plan.md` (TC-INF-07-01 status + a `E2E`→`RUST-IPC` tier note),
  `technical_stack_documentation.md` §9 (test tooling row),
  `CONTRIBUTING.md` (integration-tests bullet — "mocked Tauri invoke" is no
  longer the whole story), `implementation_execution_plan.md` Phase 5 gate note.
- Tests to add: extend IPC-11 coverage to the remaining registered commands
  (currently ~16 of 46 covered); fake-`TaskProvider` Ok-path for
  create/poll/download once a reusable double exists outside `api.rs`'s
  `cfg(test)`.
- Tech debt to register: none beyond the above follow-ups.

## References

- `docs/audits/e2e-ui-qa-2026-11-08.md` §2, §13 (the gap statement and the
  "make the gap durable" recommendation this ADR implements)
- `coding_standards.md` §7.1 (IPC-01–10), §11.2 (TST-10)
- `test_plan.md` TC-INF-07-01, E2E tier definition
- `.claude/rules/rust-backend.md` (injected test doubles requirement)
- Related ADRs: ADR-0004 (provider seam), ADR-0008/0009 (recovery registry
  isolation), ADR-0015 (TPC-05 fail-closed dispatch pinned by the harness)
