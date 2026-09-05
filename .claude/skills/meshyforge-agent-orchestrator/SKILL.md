---
name: meshyforge-agent-orchestrator
description: >-
  Turns a set of findings for MeshyForge (an audit report, a code review, a
  bug list, a feature backlog) into risk-classified, tier-routed, ledger-
  tracked work, then dispatches subagents to do it. Reads and writes
  docs/governance/task-manifest.yaml (the durable ledger any agent/machine
  can resume from cold) and routes each item through this repo's existing
  governance skills rather than duplicating their logic: adr-log for
  architectural/contract/security/dependency decisions, doc-sync for
  planning-doc drift, phase-gate-check before advancing a build phase.
  Classifies capability tier per docs/governance/model-routing.md so cheap,
  proven-sufficient work doesn't consume frontier-model budget. Use when
  Neils has more than one finding/task to act on and wants tracked,
  orchestrated work rather than one-off fixes with no durable record.
---

# MeshyForge Agent Orchestrator

Execution counterpart to plain grounding/reading. Where `adr-log` records
one decision and `doc-sync` fixes one doc, this skill takes a *set* of
findings or backlog items and turns them into ledger-tracked, tier-routed,
safety-gated work — then dispatches the agents to do it.

**This skill does not replace the specialized skills it routes to.** It
never drafts an ADR itself (hands off to `adr-log`), never edits a planning
doc itself (hands off to `doc-sync`), and never declares a phase gate passed
itself (hands off to `phase-gate-check`). Its own job is classification,
routing, ledger bookkeeping, and dispatch.

## Step 1 — Load the ledger

Read `docs/governance/task-manifest.yaml`. This is the source of truth —
if `.claude/state/task_ledger.db` exists and disagrees with it, the YAML
wins (the DB is a disposable projection; see the manifest's own header
comment and `scripts/governance/sync_task_ledger.mjs`). Note the highest
existing `TASK-NNNN` id — new entries are sequential from there, never
reused, even for abandoned tasks.

## Step 2 — Normalize each finding into a task

For each item in the input (audit finding, bug report, backlog request):

1. Write a one-sentence imperative title with a teeth clause where
   relevant — what must NOT happen, not just what should. E.g. "Fix the
   Rig panel's task-id field to accept the picker's output without
   re-validating a stale endpoint list" is better than "Fix Rig panel."
2. Check whether an existing `TASK-NNNN` already covers this (grep titles
   and notes) before creating a duplicate. If found, append a note and
   update status instead of creating a new entry.

## Step 3 — Classify risk and capability tier

Risk level (0–4) and capability tier (T0–T3) are **not the same axis** —
risk is about blast radius if this goes wrong; tier is about what kind of
reasoning the work requires. Determine both:

**Risk level** — apply `adr-log`'s needs-an-ADR test (Step 2 of that
skill) first: if any of its 6 criteria fire, this is at minimum risk level
2, and if it's Security or Dependency class, risk level 3. A finding that's
purely cosmetic/local and cheaply reversible is risk level 0–1. When
genuinely unsure, round up — matches `delivery-governance`'s own
"Medium-uncertain is the higher tier until something specific downgrades
it" rule.

**Capability tier** — apply `docs/governance/model-routing.md`'s routing
table. Look up the work type; if it doesn't match a listed row, classify
by the tier definitions (T0 mechanical / T1 scoped-implementation / T2
cross-cutting-judgment / T3 irreversible-high-blast-radius) and add the
work type as a new row in that table so the next pass doesn't have to
re-derive it.

## Step 4 — Route before dispatching

Before assigning an agent to *do* the work, check whether it needs to go
through an existing gate first:

| If the task... | Route through first |
|---|---|
| Trips any `adr-log` needs-an-ADR criterion | `adr-log` — get the ADR drafted and (for Architectural/Contract/Security/Dependency) confirmed by Neils before implementation starts |
| Implies a planning-doc edit (new feature, changed contract, corrected claim) | `doc-sync` — draft plan first; only its narrow `--apply` allowlist may auto-edit |
| Would advance to the next IEP build phase | `phase-gate-check` — confirm the current phase's gate actually passed |
| Touches the Rust<->TS IPC boundary | Note in the task's `evidence_gate` that both sides must change together (GREB PR-05) — a fix landing on only one side is not done |

A task blocked on an ADR confirmation gets `status: blocked` and
`blocked_by` pointing at a placeholder note (ADRs aren't ledger entries
themselves — reference the ADR id once it exists) until Neils confirms.

## Step 5 — Write the ledger entry

Append to `docs/governance/task-manifest.yaml` following its documented
schema (id, title, status, risk_level, capability_tier, owner, created,
updated, blocked_by, evidence_gate, adr_refs, notes). Set a concrete,
checkable `evidence_gate` — "tests pass" is too vague if there's a
specific test file or `phase-gate-check` criterion this should satisfy;
name it.

Run `node scripts/governance/sync_task_ledger.mjs` after any batch of
ledger edits so the SQLite projection doesn't drift from the file that
governs it.

## Step 6 — Dispatch

For each unblocked task, dispatch per its capability tier (Agent tool,
`isolation: "worktree"` if the work could collide with other in-flight
changes — check via the same worktree/claim audit `delivery-governance`
uses, since MeshyForge has no in-repo claim system of its own yet). Brief
the dispatched agent with: the task's full ledger entry, the specific
files/rule IDs implicated, and which of `adr-log`/`doc-sync`/
`phase-gate-check` it must hand off to rather than act on directly.

**Never dispatch a T3 task's actual decision-making to a subagent without
the human confirmation `adr-log` Step 5 already requires.** Tier only
governs who *drafts* the options and analysis — the confirm-before-write
gate for Architectural/Contract/Security/Dependency decisions is
independent of tier and always applies.

## Step 7 — Update status as work completes

On completion (or a blocker discovered mid-work), update the task's
`status`, `updated` date, and append a note — don't overwrite prior notes,
the history is part of what makes this resumable by a different agent.
Re-run the sync script. If the task revealed a doc drift or ADR-worthy
decision that wasn't anticipated in Step 4, route it now rather than
folding it silently into this task's scope.

## What this skill deliberately does not do

Per `delivery-governance`'s v1 scope (the pattern this skill's dispatch
step borrows from): no git branch/worktree mutation beyond what the Agent
tool's own `isolation: "worktree"` option handles, no unenforced claim
files, no silent auto-application of anything outside `doc-sync`'s
existing narrow allowlist. If a task needs actual git mutation this skill
doesn't perform, say so and hand off rather than improvising it here.
