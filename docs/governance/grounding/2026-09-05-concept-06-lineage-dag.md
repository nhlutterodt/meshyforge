# Grounding: Concept #6 — "Full DAG Lineage Tree"

**Status:** Grounding complete. **Recommendation: do not open a new ADR
track. Append to the existing, already-blocked TASK-0010.**

## Audit's proposal

A visual DAG tracking parent-to-child asset derivations (Draft → Refinement
→ Retexture → Rig → Print), with non-destructive branching and rollback to
any historical node.

## Current state (file:line evidence)

**Schema already has linear parent linkage.**
`src-tauri/src/storage/database.rs:44,55,386` — the `assets` table has a
`parent_task_id` column, read and written in the asset-insert path
(`asset.parent_task_id` at line 55; defaulted to `None` at line 386 for
top-level generations). This is a single parent pointer per asset — a chain,
not a branching DAG (an asset has exactly one parent, no concept of multiple
derivation branches from one source, no rollback/versioning of a node once
superseded).

**FRD already specifies a *linear* version of this, not a DAG.**
`docs/feature_requirements_documentation.md:3720-3727` (FR-GAL-10 context):
"A visual representation of the task chain showing how an asset was derived
from parent tasks... a task chain is displayed: 'preview → refine (this)' or
'image-to-3d → remesh → retexture (this)'." This is explicitly a chain
(single path back to origin), not branching, and has no rollback semantics.

**No dedicated frontend lineage-visualization component was found.** Grepped
`src/` for `task chain`, `taskChain`, `parent_task`, `parentTask`,
`derivation`, `lineage` (case-insensitive) — only `src/lib/meshy-types.ts`
matched. Either the FR-GAL-10 chain view renders under a different
name/component not caught by these terms (e.g. inline in `AssetDetail.tsx`
under a generic label), or it isn't built yet. **Not confirmed either way —
flagged as an open question, not asserted.**

## Why this overlaps TASK-0010, not a new task

`docs/governance/task-manifest.yaml` already has **TASK-0010** (status:
`blocked`, risk_level 3, capability_tier T2, owner: `unassigned`): "ADR:
persistence integrity & auditing hardening — enforce task_log's FK, wire up
its dead audit columns, add assets.updated_at, define a corruption/recovery
strategy." That task's own notes bundle its four sub-fixes specifically
*because* "the four sub-fixes share a schema migration" — and a DAG-shaped
lineage model (multiple children per asset, branch points, rollback/versioning
of superseded nodes) is exactly the kind of schema change that belongs in the
same migration conversation, not a second, independently-drafted ADR that
could contradict TASK-0010's eventual schema decisions (e.g. if TASK-0010
adds `assets.updated_at` and a recovery strategy, and a separate DAG-lineage
ADR independently redesigns the same table's relational shape, one of the two
will need rework).

`.claude/skills/meshyforge-agent-orchestrator/SKILL.md` Step 2.2 is explicit:
"Check whether an existing `TASK-NNNN` already covers this... before creating
a duplicate. If found, append a note and update status instead of creating a
new entry." TASK-0010 doesn't *fully* cover DAG lineage (it's scoped to
integrity/auditing, not derivation modeling), but it is the natural home for
this schema-adjacent proposal since both are blocked on the same class of
decision (SQLite schema evolution) and both are currently unowned.

## Preliminary needs-an-ADR classification

Trips `adr-log` criterion 3 (touches the SQLite schema) — same criterion
TASK-0010 already trips. No new criterion beyond what TASK-0010 already
established.

## Recommendation for Phase 2 ledger synthesis

Do **not** create a new `TASK-00XX` for this. Append a note to **TASK-0010**
recording: (a) this proposal exists and its scope (branching DAG + rollback,
beyond TASK-0010's original integrity/auditing scope), (b) the evidence above
(`parent_task_id` linear-chain precedent, FR-GAL-10's existing linear-chain
spec), and (c) a recommendation that whoever eventually drafts TASK-0010's
ADR treat "should the schema support branching lineage, not just a linear
parent pointer" as one of its Options, rather than resolving it in a second,
separately-numbered ADR later.

## Open questions

- Whether a frontend task-chain view already renders (per FR-GAL-10) under a
  name this grep didn't catch — check `AssetDetail.tsx` directly before
  assuming zero UI exists.
- Whether "rollback to any historical node" implies mutable/undo semantics
  Aon assets that have already been exported/shared externally — a product
  question, not just a schema one, worth surfacing whenever TASK-0010's ADR
  is actually drafted.
