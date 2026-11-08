# Doc Sync Plan — ADR-0016 MockRuntime IPC Round-Trip Harness

**Triggered by:** ADR-0016 (`docs/adr/0016-mock-runtime-ipc-round-trip-harness.md`), Accepted 2026-11-08, implemented on branch `fix/ipc-decoupling-remediation` (commit 4948b94).
**Mode:** draft. Every hunk below is prose or a rule/table definition, which falls **outside** the `--apply` allowlist (roadmap status flips, CHANGELOG appends, `docs/adr/README.md` regeneration). Nothing here edits a planning doc; apply manually after review.
**Already done, so not in this plan:** the `docs/adr/README.md` ADR-0016 index row (added by hand in 4948b94).

## Principle

ADR-0016 is **accepted and implemented**: the `tauri::test` MockRuntime harness (`src-tauri/tests/ipc_round_trip.rs`, 17 tests) now crosses the real `generate_handler!` dispatch. Docs that claimed "no test crosses IPC" or that the only integration tier was "mocked Tauri invoke" are now stale and should be corrected to describe the shipped harness — not a future plan.

## Staleness passes

| Pass | Finding |
|---|---|
| (a) Routing | ADR-0016 "Docs to update" names CSD §7.1 (IPC-11), `test_plan.md` (TC-INF-07-01 + tier note), TSS §9 (test-tooling row), `CONTRIBUTING.md` (integration-tests bullet), IEP Phase 5 gate note |
| (b) Claim verification | **Two anchor errors found.** (1) ADR-0016 cites `technical_stack_documentation.md §9` for the test-tooling row, but §9 is *HTTP Client: reqwest*; the test-tooling table is **§14.1**. (2) CSD **IPC-09** says commands are registered "in `main.rs` via `tauri::generate_handler![...]`", but registration has always lived in `lib.rs` (`main.rs` only calls `meshyforge::run()`); the `add_commands<R>` extraction makes this explicit. Both corrected below. |
| (c) Markers | CSD v1.0.4, test_plan v1.0.1, TSS v1.0.2, IEP v1.0.0 all predate ADR-0016; `CONTRIBUTING.md` has no metadata table |

## Proposed hunks

### 1. `coding_standards.md` §7.1 — add IPC-11, correct IPC-09

Version bump **1.0.4 → 1.0.5**; changelog line at top of that doc.

IPC-09 — old:
> | **IPC-09** | Every command must be registered in `main.rs` via `tauri::generate_handler![...]`. Unregistered commands are not callable from the frontend. | Tauri requirement | — |

new (anchor correction, behavior unchanged):
> | **IPC-09** | Every command must be registered in `src-tauri/src/lib.rs`'s `add_commands` builder via `tauri::generate_handler![...]`. Unregistered commands are not callable from the frontend. | Tauri requirement | — |

Add a new row after IPC-10:
> | **IPC-11** | Every command in the main `generate_handler!` list must be reachable through the shared `add_commands<R: tauri::Runtime>` registry so it is exercised by the `tauri::test` MockRuntime round-trip harness (`src-tauri/tests/ipc_round_trip.rs`). A command that takes `AppHandle`/`Window` must be runtime-generic (`stream_task<R: tauri::Runtime>`) to live in that registry. | Proves real IPC dispatch, not just name-match | ADR-0016 |

Also update the §19.1 rule-index row `IPC-01–10` → `IPC-01–11` (line ~2068).

### 2. `test_plan.md` — TC-INF-07-01 tier + new cases

Version bump **1.0.1 → 1.0.2**.

TC-INF-07-01 (line 146) is tagged `E2E` (Playwright) but is now covered by the Rust integration harness. Retag and note:
> | TC-INF-07-01 | `invoke_get_credit_balance__returns_balance_through_registered_command` | RUST | Real IPC round trip through `generate_handler!` registration (`tauri::test` MockRuntime, `src-tauri/tests/ipc_round_trip.rs`; ADR-0016) |

Add to §2.2 type table a tier note (the four tags stay, but `RUST` now spans unit *and* IPC-boundary integration tests). Suggested footnote under the table:
> The `RUST` tag covers both in-crate unit tests (`*_inner` direct) and the `tauri::test` MockRuntime integration harness that crosses the real command boundary (ADR-0016). `E2E` remains reserved for full cross-process Playwright flows.

Add new cases under FR-INF-07 (one per harness seam), `TC-INF-07-04` camelCase-decode, `TC-INF-07-05` error-envelope transport, `TC-INF-07-06` keychain seam, `TC-INF-07-07` save→list composite, `TC-INF-07-08` destructive-restore isolation, `TC-INF-07-09` phantom-command rejection, `TC-INF-07-10` provider-guard-before-network ordering. §9.2 count table: RUST 29→37 (TC-INF-07-01 retag + 7 new), E2E 11→10, Total 246→253 (196+37+10+10=253).

### 3. `technical_stack_documentation.md` §14.1 — test-tooling row

Version bump **1.0.2 → 1.0.3**. (ADR cited §9; correct location is the §14.1 tooling table.)

Add a row to the §14.1 table:
> | **IPC round-trip tests** | `tauri::test` MockRuntime | `2` (dev-only `test` feature) | Real `generate_handler!` dispatch across the IPC boundary: command decode, error-envelope transport, keychain seam (ADR-0016) |

### 4. `CONTRIBUTING.md` — Backend testing bullets

Replace the Backend block (line ~156):
> ### Backend
>
> - Unit tests: `cargo test` with `wiremock` for HTTP mocking
> - IPC round-trip tests: `cargo test --test ipc_round_trip` — `tauri::test` MockRuntime harness that exercises the real `generate_handler!` dispatch (ADR-0016). On Windows these need the Common-Controls v6 manifest `build.rs` embeds for test executables; no extra step is required.
> - Keychain tests: Marked `#[ignore]` — run with `cargo test -- --ignored`

And the Frontend "Integration tests: Testing Library with mocked Tauri invoke" line stays true for the frontend, but add a pointer:
> - Frontend tests mock `@lib/tauri`; the **real** IPC boundary is covered by the Rust `ipc_round_trip` harness above, not by any frontend test.

### 5. `implementation_execution_plan.md` — Phase 5 gate note

Version bump **1.0.0 → 1.0.1**. Under §9 Phase 5, add a step or gate note:
> | 5.15 | Maintain the `tauri::test` IPC round-trip harness (ADR-0016) as commands are added; extend IPC-11 coverage from the current ~17-command slice toward full registry coverage | ADR-0016, CSD IPC-11 | `cargo test --test ipc_round_trip` passes; new main-registry commands are reachable through `add_commands<R>` | Phase 4 gate |

### 6. `docs/CHANGELOG.md` — `[Unreleased] → Added` (allowlist #2, safe to apply)

> - **Real IPC-boundary tests** (ADR-0016): a `tauri::test` MockRuntime harness (`src-tauri/tests/ipc_round_trip.rs`) now drives commands through the actual `generate_handler!` dispatch — command-name routing, camelCase wire decode, the `{code,message}` error envelope, and the injected keychain seam — closing the gap where 866 prior tests never crossed the IPC boundary. Commands are registered through a shared `add_commands<R>` builder so the harness and the app use one list.

## Not changed (deliberately)

- `docs/audits/e2e-ui-qa-2026-11-08.md`: a dated audit snapshot; §2's "no test crosses IPC" was true when written. ADR-0016's Context cites it. Do not rewrite history — the harness is the response to that finding, not a retroactive edit of it.
- The `tauri` dev-dependency `features = ["test"]` and the `build.rs` manifest embed are code, recorded in ADR-0016 Consequences; no separate doc beyond §14.1 above.
- `docs/adr/README.md`: row already added manually in 4948b94; `adr-index.mjs index` not run (it would replace the curated multi-column index with a generated one).

## Verify-after-apply checklist

1. CSD: IPC-11 row present; IPC-09 says `lib.rs`/`add_commands`; §19.1 index reads `IPC-01–11`; version 1.0.5 + changelog line.
2. test_plan: TC-INF-07-01 tagged `RUST`; new TC-INF-07-0x rows; §9.2 counts sum to 253; version 1.0.2.
3. TSS: §14.1 has the IPC round-trip row; version 1.0.3.
4. CONTRIBUTING: Backend + Frontend bullets updated.
5. IEP: Phase 5 step 5.15 added; version 1.0.1.
6. CHANGELOG: `[Unreleased] → Added` line present.
