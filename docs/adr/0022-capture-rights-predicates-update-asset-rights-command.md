# ADR-0022: Capture the Rights Predicates — One `update_asset_rights` Command

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-23 |
| **Deciders** | Neils (confirmed the capture-UI decision as §6 D1 and the single-command shape via the adr-log weight gate, 2026-11-23) |
| **Phase** | Phase 4–5 |
| **Related rules/features** | `LM-01`, `LM-05` (recorded, not surfaced), ADR-0018, IPC-11 (ADR-0016) |
| **Supersedes** | None |

## Context

`ADR-0018` added the rights record and its derivation. **Nothing writes it.** A
grep for `plan_tier`/`planTier` across `src/` and `src-tauri/src/` returned
**zero** hits before this decision, so every asset keeps `NULL` predicates and
every export derives `NOASSERTION` / `tier-unrecorded`.

The absence of **Fact A** is a deferral; the absence of any capture path is a
permanent hole wearing a deferral's clothes. `LM-01` cannot be satisfied by
schema alone.

**Trigger:** needs-an-ADR criteria 1 (crosses the Rust↔TS IPC boundary), 3 (a new
command surface), and 6 (the arg shape constrains every future writer).

**Constraints found:**
- `ADR-0019` / `D-4` — a new command is normally avoided, because
  `src/lib/tauri.ts`'s `CommandName` union is pinned by a guardrail test. Here a
  command is **unavoidable**: nothing exists that writes these columns.
- `ADR-0018` decision 1 — the tri-state lives in Rust as an enum, and `NULL`
  (pre-baseline) is distinct from `'unknown'` (a recorded assertion).
- `ADR-0018` decision 3 / `D-1` — the identifier and reason are derived **in
  Rust, once**. A writer that returned only the predicates would leave the UI
  holding a stale identifier, and recomputing it in TypeScript is the drift this
  programme keeps paying for.
- `SEC-F`'s spirit — no paths, no free text: a free-text field would become a
  place to write a legal conclusion.
- `IPC-11` (ADR-0016) — every registered command needs a MockRuntime round-trip
  test pinning its camelCase argument decode and its rejection envelope.
- `src/lib/rights-derivation.guardrail.test.ts` — the build fails if
  `NOASSERTION` appears under `src/` outside `meshy-types.ts`, so the frontend
  must be able to render "not established" **without naming the vocabulary**.

**Precedent search record:**
- Searched: `update_asset_rights`, `rights`, `predicate`, `plan tier`,
  `CommandName`, `update_notes`, `patch_asset` across `docs/*.md`,
  `docs/adr/*.md`, `src/lib/tauri.ts`, `src/hooks/`, `src-tauri/src/commands/`.
- Result: **no precedent.** `update_notes` and `update_tags` are the nearest
  writers, and both take a single free-text/array argument.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A. One `update_asset_rights` command taking four validated enum values** | Explicit contract; every value validated in Rust; returns the refreshed derived record so the UI never recomputes | Widens the `CommandName` union, the guardrail, and IPC-11 coverage | None — the widening is the point |
| B. Fold the write into `update_notes` | No new command | A notes edit would silently mutate a legal record; two unrelated concerns on one command | `LM-01`'s integrity |
| C. A generic `patch_asset(patch: object)` | One command for everything | Unbounded input surface: the caller decides which columns are writable, and validation becomes a data-driven branch nobody can audit | `VAL`-namespace expectations |
| D. No capture UI (defer) | Nothing to build | `LM-01`/`LM-02`/`LM-03` stay inert forever, not just until Fact A | The baseline's admission criterion §1.1 |

## Decision

**Adopt Option A**, in four parts:

1. **One command**,
   `update_asset_rights(asset_id, plan_tier, published_to_community, third_party_material_attested, disclosure_posture)` —
   four **enum** arguments plus the id. **No path, no free text.**
2. **Validation in Rust.** An unrecognised value is `INVALID_INPUT`; `'unknown'`
   is legal (a recorded assertion); `NULL` is **not reachable from the UI**,
   because it means pre-baseline and re-creating it would be a lie about when the
   record was made.
3. **The command returns the refreshed `RightsRecord`**, including the derived
   `identifier` and `reason`. The hook patches that record into the query cache,
   so the frontend stores what Rust computed and never derives it.
4. **The command sets `rights_recorded_at`.** Without it the tri-state collapses:
   `NULL` predicates and an asserted `'unknown'` become indistinguishable.

**Check:** a Rust test writes each value and reads it back; a test proves an
unrecognised enum is refused; a test proves `recorded_at` is set; an IPC-11
harness entry pins the camelCase decode and the `INVALID_INPUT` envelope.

## Consequences

**Positive:**
- The record becomes populatable — the difference between a control that exists
  and a control that means anything.
- Explicit enum arguments make the contract auditable in one line, and the
  rejection path is testable.
- Returning the derived record keeps `D-1` true without a second read.

**Negative:**
- `CommandName` grows by one, so the union, the guardrail, and IPC-11 coverage
  move together — always the cost of a new command in this repo.
- A fourth place to remember when the rights vocabulary changes (Rust constants,
  `AssetRow`, this command, and the UI labels).
- No "clear" affordance: a mis-set predicate can be corrected but not
  un-recorded.

**Follow-ups:**
- Docs: `docs/legal-metadata-baseline.md` §3 `LM-01` gains the capture path;
  `rust_type_definitions.md` (the command args).
- Tests: write/read round-trip per predicate; invalid enum; `recorded_at`;
  harness entry.
- Tech debt: none.

## References

- `docs/legal-metadata-baseline.md` §3 (`LM-01`, `LM-05`), §6 (D1)
- `docs/adr/0018-per-asset-rights-record-predicates-derived-identifier.md`
- `docs/adr/0019-export-rights-record-sidecar-baseline-glb-projection.md` (`D-4`)
- `docs/adr/0016-mock-runtime-ipc-round-trip-harness.md` (IPC-11)
- `src/lib/tauri.ts`, `src/hooks/useUpdateNotes.ts` (the writer pattern)
- Tasks: `TASK-0049`