# ADR-0005: Agentic Delivery Governance — Task Ledger, Model Routing, Orchestration

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-04 |
| **Deciders** | Project owner (confirmed task-ledger backing store, orchestrator scope, and model-routing approach via three explicit choices) |
| **Phase** | Post-Phase-5 (Polish/Release complete per CHANGELOG 1.0.2) — this governs process, not a build phase |
| **Related rules/features** | GREB `DOC-REP`, `REV`; CSD `DOC` namespace (doc versioning discipline, extended here to a new doc class); no FR-xxx (process, not a shipped feature) |
| **Supersedes** | None |

## Context

MeshyForge already has real, working decision-and-drift governance:
`adr-log` (5 ADRs including this one), `doc-sync` (3 sync plans on record),
`phase-gate-check`, and `docs/LESSONS_LEARNED.md` (11 postmortems with
guardrails). What it did not have: a durable record of *in-flight and
planned work* that survives a session boundary, a policy for which
capability tier should do a given piece of work, or a skill that turns a
batch of findings into tracked, dispatched work rather than one-off fixes.

**Trigger:** No single existing rule ID covers this — it's new process
surface, not an extension of one. Satisfies needs-an-ADR criteria 1
(binds a new directory-level convention, `docs/governance/`), 4 (adds a
new npm devDependency, `js-yaml`), and 6 (expensive to re-litigate: once
agents start writing to a task ledger, changing its shape later means
migrating every existing entry).

**Constraints found:**
- `.gitignore:13` — `.claude/` was blanket-ignored. Confirmed via
  `git ls-files | grep -c '^\.claude/'` returning `0` and
  `git check-ignore -v .claude/skills/adr-log/SKILL.md` resolving to that
  line. Every skill in `.claude/skills/` — 14 of them, including `adr-log`
  and `doc-sync` — was therefore untracked. This directly contradicts the
  premise of durable, cross-machine governance and had to be fixed as part
  of this decision, not deferred.
- `package.json:3` — `"version": "1.0.0"` while `docs/CHANGELOG.md`'s
  newest entry was `1.0.2`, with both the Rust and TypeScript changes it
  describes already present in `src`/`src-tauri`. A real, current drift,
  not a stale artifact — corrected directly (risk level 0, no ADR needed
  for the correction itself).
- `tsconfig.json:28` — `include` is `["src", "src-tauri/src/types.ts"]`,
  so a new `scripts/` directory is outside `tsc`'s scope; a new
  devDependency used only there doesn't affect the frontend type-check
  surface.
- Node version floor is 22+ (`README.md` Prerequisites). Node 22 ships
  `node:sqlite` (`DatabaseSync`) as a built-in, verified working in this
  environment (`node -e "require('node:sqlite')"` succeeds, with an
  experimental-feature warning).
- `docs/adr/README.md` index columns (ID, Title, Status, Date, Area, Docs
  Affected, Related Rules) — ADR-0001 already establishes "Governance / CI"
  as a valid Area, so a process-governance ADR fits the existing
  convention without inventing a new category.

**Precedent search record:**
- Searched `docs/**` for: `task ledger`, `orchestrat`, `model routing`,
  `backlog`, `capability tier`. Zero results outside this ADR's own new
  files.
- Searched `docs/adr/**` (ADR-0001 through 0004) — none address work
  tracking, model selection, or multi-agent dispatch. ADR-0001 is the
  closest precedent for a *process* (not code) ADR, confirming the
  pattern is allowed.
- Searched `.claude/skills/**` — 14 existing skills, none overlapping this
  scope; `adr-log` and `doc-sync` explicitly describe themselves as
  single-decision/single-doc tools, not batch/backlog tools, so no
  duplication.

## Options Considered

### Task ledger backing store

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| YAML manifest only | Matches existing `docs/adr` convention exactly; zero new tooling | No fast querying across a large backlog; every read means parsing the whole file | None |
| SQLite only | Queryable, structured | Binary diffs badly in git — exactly the "silent drift" failure mode `doc-sync`'s design note warns against; not resumable by reading in an editor | Spirit of `doc-sync`'s draft-not-silent-edit principle |
| **YAML source of truth + SQLite as a rebuildable, gitignored projection (chosen)** | Diffable, auditable history in git (YAML); fast queries when needed (SQLite); DB can never silently diverge from the record that governs it, since it's disposable and regenerated | Requires a sync step (`sync_task_ledger.mjs`) and, since Node has no built-in YAML parser, one new devDependency (`js-yaml`) | None — `*.db` is already gitignored (`.gitignore` §"Database", confirmed pre-existing) |

### Orchestration skill scope

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| No new skill — coordinate manually or via the generic `agent-orchestrator` skill | No new surface to maintain | Loses this repo's specific routing knowledge (when to hand off to `adr-log` vs `doc-sync` vs `phase-gate-check`); the generic skill has no knowledge of those | None |
| **Scoped `meshyforge-agent-orchestrator`, execution counterpart to the existing decision/drift skills (chosen)** | Reuses `adr-log`'s needs-an-ADR test and confirm-before-write gate instead of duplicating it; reuses `doc-sync`'s draft-only default; adds only classification, ledger bookkeeping, and dispatch — the actual gap | One more skill to keep in sync if the skills it routes to change their own contracts | None, by construction — it explicitly defers to the others rather than overlapping them |

### Model routing policy

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| Defer until there's real multi-agent throughput to optimize | No speculative policy to maintain | Nothing stops the first orchestrated batch of work from over- or under-provisioning capability, with no record of why a choice was made | None |
| **Write it now as a capability-tier table (T0–T3), evidence-gated promotion/demotion, chosen** | Gives `meshyforge-agent-orchestrator` something concrete to route against from its first run; ties directly to `delivery-governance`'s already-loaded routing-profile pattern, adapted to this repo's actual skill set | A table written before real usage data risks being wrong in its first-draft assignments | None — explicitly designed to be corrected via the promotion/demotion evidence rule rather than treated as fixed |

## Decision

**Adopt all three, as one coherent system**, since they're interdependent
(the orchestrator needs both the ledger and the routing table to function
as anything more than a coordination checklist):

1. **Task ledger**: `docs/governance/task-manifest.yaml` is the source of
   truth. `scripts/governance/sync_task_ledger.mjs` (uses `node:sqlite`,
   Node's built-in, to avoid adding a database driver dependency) rebuilds
   `.claude/state/task_ledger.db` from it — gitignored, disposable, never
   hand-edited. New devDependency: `js-yaml` (MIT license, passes
   `DEP-06`; devDependency only, no frontend bundle impact, outside
   `tsconfig.json`'s `include`).

2. **Orchestrator skill**: `.claude/skills/meshyforge-agent-orchestrator/`
   classifies risk (reusing `adr-log`'s needs-an-ADR test) and capability
   tier (per the routing table below), routes ADR/doc/phase-gate work to
   the skills that already own those decisions, and dispatches/tracks the
   rest against the ledger. It never bypasses `adr-log` Step 5's
   human-confirmation gate for Architectural/Contract/Security/Dependency
   decisions, regardless of tier.

3. **Model routing**: `docs/governance/model-routing.md` defines tiers
   T0 (mechanical) through T3 (irreversible/high-blast-radius), a routing
   table mapping MeshyForge's actual work types (scaffolding skills,
   `doc-sync`, root-causing a `LESSONS_LEARNED.md`-class bug, ADR drafting,
   etc.) to a tier, and an evidence-gated promotion/demotion rule so the
   table self-corrects from real outcomes rather than staying a one-time
   guess.

**Newly proposed rule ID(s):** None — this ADR intentionally does not add
to the `CSD`/`UI-UX`/`GREB` rule namespaces. It governs agent workflow, not
application code or repository policy in those docs' scope. If that
changes (e.g., a future GREB revision formalizes this), a follow-up ADR
should make that extension explicitly rather than retrofitting rule IDs
here.

## Consequences

**Positive:**
- A different agent, or the same agent in a new session, can read
  `docs/governance/task-manifest.yaml` and correctly resume work without
  re-deriving repo state from scratch or re-reading this entire ADR.
- `.claude/skills/` is now version-controlled — the single highest-leverage
  fix in this ADR, since every other governance skill in this repo was
  silently machine-local before it.
- Capability-tier routing gives a concrete, falsifiable policy instead of
  an implicit "use whatever's available" default — and it's designed to
  correct itself from evidence rather than staying static.

**Negative:**
- One new devDependency (`js-yaml`) and reliance on an experimental Node
  API (`node:sqlite`) for tooling — both scoped to dev/governance tooling,
  never shipped in the app bundle, and the SQLite cache is fully
  rebuildable if `node:sqlite`'s behavior ever changes.
- `node:sqlite` failed with a disk I/O error when tested against this
  session's network-mounted sandbox filesystem; verified working correctly
  against a genuine local filesystem in the same session. Documented in
  the sync script's own header as an environment constraint, not a script
  defect — a real local disk (as `D:\` is on the project owner's machine)
  should not hit this.
- Three more files to keep from drifting (`task-manifest.yaml`, its SQLite
  projection, `model-routing.md`) — mitigated by the sync script and by
  the YAML-wins-on-disagreement rule stated in both the manifest's header
  and `docs/governance/README.md`.

**Follow-ups:**
- Docs to update: `docs/adr/README.md` index (this ADR's row); `docs/CHANGELOG.md`
  (new "Unreleased" governance entry — this is process/tooling, not an
  app-version-bumping change).
- Tests to add: none required for this ADR's scope (process tooling, not
  app code covered by the existing test suite) — if `meshyforge-agent-orchestrator`
  or the sync script accumulate real bugs, add regression coverage then,
  per the same "test the boundary that actually broke" principle
  `LESSONS_LEARNED.md` already documents.
- Tech debt to register: none — this closes a gap rather than deferring
  one.

## References

- `docs/governance/README.md`, `docs/governance/model-routing.md`,
  `docs/governance/task-manifest.yaml`
- `.claude/skills/meshyforge-agent-orchestrator/SKILL.md`
- `scripts/governance/sync_task_ledger.mjs`
- Related ADRs: ADR-0001 (precedent for a process/governance-class ADR),
  ADR-0004 (precedent for an ADR whose execution is tracked in a separate
  living document — here, the task ledger plays that role going forward)
- `docs/LESSONS_LEARNED.md` (evidence the existing decision/drift skills
  this ADR builds on actually catch real defects)
