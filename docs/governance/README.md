# MeshyForge Delivery Governance

This directory holds the durable, git-tracked state that lets any agent —
this session, a different session, a different machine — pick up work in
this repo cold. It exists because `docs/adr/` already answered *how
decisions get recorded* well before this was written; this closes the
remaining gap: *how work gets tracked, tiered, and resumed* across
sessions. Full rationale: [ADR-0005](../adr/0005-agentic-delivery-governance.md).

## The pieces

| File | Role |
|---|---|
| [`task-manifest.yaml`](task-manifest.yaml) | Source of truth for planned/in-flight/done work. Human-readable, git-diffable. Read its header comment for the schema. |
| [`model-routing.md`](model-routing.md) | Capability-tier policy (T0–T3) — routes work to the cheapest tier proven sufficient for it, not to a named model. |
| `.claude/state/task_ledger.db` (gitignored, generated) | Queryable SQLite projection of the manifest, for fast lookups across a larger backlog. Never hand-edited — rebuild with the sync script below. |
| [`../../scripts/governance/sync_task_ledger.mjs`](../../scripts/governance/sync_task_ledger.mjs) | Rebuilds the SQLite projection from the YAML. Run after any manifest edit. |
| [`.claude/skills/meshyforge-agent-orchestrator/`](../../.claude/skills/meshyforge-agent-orchestrator/SKILL.md) | Takes a set of findings/backlog items, classifies and tiers them, routes ADR/doc/phase-gate work to the skills that already own those decisions, dispatches subagents, updates the ledger. |

## How this fits the existing governance skills

Nothing here replaces `adr-log`, `doc-sync`, or `phase-gate-check` — they
already do their jobs well (see `docs/LESSONS_LEARNED.md` for evidence this
process catches real bugs, not just process for its own sake). This layer
sits *around* them:

```
finding/backlog item
        |
        v
meshyforge-agent-orchestrator  --classifies risk + tier-->  docs/governance/task-manifest.yaml
        |
        |--- ADR-worthy? -----------> adr-log (confirm-before-write gate unchanged)
        |--- doc drift? -------------> doc-sync (draft-only by default, unchanged)
        |--- phase advance? ---------> phase-gate-check (unchanged)
        v
   dispatch (Agent tool), tiered per model-routing.md
        |
        v
   ledger updated, sync_task_ledger.mjs run
```

## A prerequisite this fixed, not just documented

Before this ADR, `.gitignore` blanket-ignored `.claude/`, so every skill
in `.claude/skills/` — including `adr-log` and `doc-sync` themselves —
existed only on the machine that authored them. A fresh clone had none of
this tooling. `.gitignore` now tracks `.claude/skills/` and only ignores
`.claude/state/` (this directory's own generated SQLite cache) and
`.claude/*.local.*`. If you're reading this from a fresh clone, that fix is
why you can.

## Starting a new work session

1. Read `task-manifest.yaml`'s `pending`/`in_progress`/`blocked` entries
   before starting anything — don't re-derive state that's already
   recorded.
2. If you have new findings/backlog to act on, use
   `meshyforge-agent-orchestrator` rather than fixing things ad hoc — the
   point of this system is that the *next* agent can see what you did and
   why, not just that the code changed.
3. Keep `task-manifest.yaml` and the SQLite projection in sync — the YAML
   always wins on disagreement, but don't let them drift silently.
