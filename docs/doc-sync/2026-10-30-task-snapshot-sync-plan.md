# Doc Sync Plan — ADR-0015 Normalized Task Snapshot

**Triggered by:** ADR-0015 (`docs/adr/0015-normalized-task-snapshot-at-the-provider-response-boundary.md`), Accepted 2026-10-30.
**Mode:** applied. The hunks were applied in the same change as this record,
at the owner's request ("Run doc-sync").
**Already done, so not in this plan:** the `docs/adr/README.md` index row
(written with ADR-0015, commit 89a8235).

## Principle

ADR-0015 is accepted but **not implemented**. No doc may describe the
`TaskSnapshot` contract as shipped. Rules are registered as the target
contract (CSD TPC-01–06), the current behavior is registered as debt
(CSD TD-08), and docs that already describe pre-ADR-0004 shapes get pointer
notes rather than rewrites.

## Staleness passes

| Pass | Finding |
|---|---|
| (a) Routing | ADR-0015 "Docs affected" names ADR-0004, CSD §7.1, TDD §6.2/§7.1/§7.2, the hook reference, the Rust type reference, implementation-artifacts, the 2026-09-11 addendum and LESSONS #10/#13 |
| (b) Claim verification | The TDD §7.1/§7.2 listings still show the pre-ADR-0004 `MeshyClient` with endpoint strings (drift that predates this ADR). The hook reference §3/§4 types `poll_task` as camelCase `TaskObject`, but the code receives raw snake_case JSON. LESSONS #10 Resolution claims `ENDPOINT_MAP` is the single list, but the frontend `endpoint` fields in `useMeshyApi.ts` are a second copy |
| (c) Markers | CSD v1.0.3, TDD v1.0.1, hook reference v1.0.0 and Rust type reference v1.0.0 all predate ADR-0015 |

## Verdicts and edits

| Claim | Actual | Verdict | Doc edited |
|---|---|---|---|
| ADR-0004 trait: `get_task` returns raw JSON to the frontend | Still true in code; amended by ADR-0015 | PARTIAL | ADR-0004 → new "Amendments" section |
| CSD §7.1 has no response-contract rules | ADR-0015 proposes TPC-01–06 | NOT_IMPLEMENTED (target) | CSD v1.0.4: TPC table under §7.1; TD-08 in §17.2 |
| TDD §6.2 `TaskObject` is the poll result | Raw snake_case JSON is the poll result | DRIFT | TDD v1.0.2: note above `TaskObject` |
| TDD §7.1/§7.2 endpoint-string client and commands | Provider trait (ADR-0004); `poll_task` still takes `endpoint` | DRIFT (pre-existing) | TDD: superseded-shape notes |
| Hook reference §3/§4: `invoke<TaskObject>('poll_task', { endpoint })` | Raw JSON; endpoint param | DRIFT | Hook reference v1.0.1: note at §3 |
| Rust type reference §5 covers response structs | No provider types listed | PARTIAL | Rust type reference v1.0.1: pointer to `provider/types.rs` |
| implementation-artifacts `get_task` doc comment | Amended by ADR-0015 | PARTIAL | Inline AMENDED note |
| Addendum: get_task normalization "NOT proposed" | Reversed by ADR-0015 | DRIFT | Entry marked RETIRED with the new evidence; TASK-0031 `adr_refs` + re-scope note |
| LESSONS #10: endpoint list is single-sourced | A frontend copy and a silent fallback remain | PARTIAL | Dated guardrail line |
| LESSONS #13: fixtures exercise `flattenResultUrls` | Same fixtures become the normalizer's | ALIGNED (extended) | Dated guardrail line |
| CHANGELOG has no ADR-0015 entry | — | NOT_IMPLEMENTED | `[Unreleased]` → Governance: two lines |

## Not changed (deliberately)

- `docs/governance/task-manifest.yaml`: TASK-0024 Package D is not re-scoped
  here. Its audit-column work needs ADR-0015 PR 2 first; record that on the
  ledger when PR 2 lands.
- `docs/adr/README.md`: `adr-index.mjs index` was **not** run, because it
  replaces this repo's curated multi-column index with a generated one. The
  row was added by hand in 89a8235.
