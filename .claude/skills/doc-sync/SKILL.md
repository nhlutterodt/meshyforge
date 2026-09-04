---
name: doc-sync
description: >-
  Detects when MeshyForge's planning docs have drifted from the codebase —
  after a feature lands, a phase gate passes, an ADR is accepted, or a
  validate-implementation finding is accepted as needing a doc update — and
  proposes fixes. Defaults to a draft-only sync plan (per-doc hunks, version
  bumps, changelog lines) written for human review; never edits a planning
  doc directly unless invoked with --apply, and even then only for a narrow
  allowlist (roadmap status/checkbox flips, changelog appends, regenerating
  docs/adr/README.md). If a proposed change would contradict an existing doc
  rather than extend it, stops and hands off to adr-log instead of resolving
  the contradiction itself. Use when a feature/change lands, a phase gate
  passes, an ADR is accepted, or a validate-implementation finding is
  accepted as needing a doc update.
---

# Doc Sync

**Default is draft, never auto-edit.** MeshyForge's planning docs are
versioned decision documents (each carries a Document Metadata table with
Version/Date/Status, and `Github_Repository_Expectations.md` `PR-13` /
`DOC-REP-02` — sourced from CSD `DOC-10` — require a version bump and
changelog entry on every doc change). A silent edit erases that provenance
and could launder an unapproved architectural change into apparent settled
policy. This skill writes a draft plan for a human to review by default;
only an explicit `--apply` flag, restricted to a narrow allowlist, may touch
a doc directly.

## Inputs

- A diff range (default: since the last relevant doc update — check each
  candidate doc's Document Metadata `Date`/`Version` against `git log`).
- Any related ADR IDs (from `docs/adr/`, if `adr-log` has produced any).
- The current build phase (per `implementation_execution_plan.md`).
- Optional `--apply` flag.

## Staleness detection — three passes

### (a) Routing table

Map changed code paths to the doc(s) that describe them:

| Code path changed | Doc(s) to check |
|---|---|
| Rust command signature/behavior (`src-tauri/src/commands/*.rs`) | `technical_design_document.md` (§7 command designs), `rust_type_definitions.md` |
| IPC contract (`src/lib/tauri.ts`, `src/lib/meshy-types.ts`, `commands/*.rs`) | Both sides must already be in sync per CSD `PR-05`/GREB `PR-05` — if only one side changed, that itself is a finding, not just staleness |
| New/changed Zustand store | `zustand_store_implementations.md`, `technical_design_document.md` §8.1 |
| New/changed hook | `hook_implementations.md`, `coding_standards.md` §8.3, UI/UX §7.4's hook->command mapping table |
| Dependency added/removed/re-pinned | `technical_stack_documentation.md`, `Github_Repository_Expectations.md` §13 (`DEP-01`–`10`) |
| SQLite schema/migration | `technical_design_document.md` §6.1 |
| Feature reaches "done" (passes its FRD acceptance criteria) | `feature_requirements_documentation.md` status, `implementation_execution_plan.md` step verification, `gap_assessment_documentation.md` §9 roadmap |
| Phase gate passes | `implementation_execution_plan.md` phase quality-gate line, `Github_Repository_Expectations.md` §9.1 milestone table |
| ADR accepted | Every doc listed in that ADR's Consequences "Docs to update" list |

### (b) Claim verification

Planning docs make verbatim, checkable claims — counts, version pins, file
lists — that can silently go stale even without a matching code change (a
doc can simply be wrong on arrival). Re-check these against current reality;
a mismatch is stale regardless of whether recent code changed. Precedent for
why this matters in this repo (both already resolved — cited as worked
examples of the failure mode, not as claims to re-flag): `feature_requirements_documentation.md`
§4.2/§4.3 once claimed "65 features" while §4.1/§5 specified 76, since
corrected to 76 throughout; and `gap_assessment_documentation.md` originally
claimed CSD §8.3 had 3 fully-coded hook reference patterns before correcting
it to 2. Treat any inventory, count, version pin, or file list asserted in a
doc as a claim to verify fresh, not just to trust — including in this
skill's own examples above, which age the same way.

### (c) Markers

Every planning doc's Document Metadata table has `Version`/`Date`/`Status`
fields. Compare these against the date of the last change to the area that
doc.md describes (per the routing table). A doc whose marker predates a
relevant merged change is stale by definition, independent of (a) and (b).

## Default output: draft sync plan

Write `docs/doc-sync/<date>-sync-plan.md` containing, per affected doc:

- The proposed hunk (old text -> new text).
- The version bump this hunk implies (per `DOC-REP-02`/CSD `DOC-10`).
- The changelog line to add at the top of that doc.
- The rationale, citing the diff / ADR / phase-gate event that triggered it.

This file is for review — do not touch the actual planning doc unless
`--apply` is passed and the hunk falls inside the allowlist below.

## `--apply`: narrow allowlist only

Even with `--apply`, auto-application is restricted to:

1. Status/checkbox flips in roadmap tables (e.g.
   `gap_assessment_documentation.md` §9.1's Documentation Production Roadmap
   status column, `feature_requirements_documentation.md` §9 completion
   checklist, `Github_Repository_Expectations.md` §9.1 milestone rows).
2. Changelog appends to `docs/CHANGELOG.md`, following the Keep a Changelog
   format in `Github_Repository_Expectations.md` §10.4.
3. Regenerating the `docs/adr/README.md` index (same operation `adr-log`
   performs after writing a new ADR — either tool may run it; it is
   idempotent).

Anything outside this allowlist — a hunk that changes prose, a rule
definition, a schema description, a dependency version, etc. — always stays
in draft form for manual application, even under `--apply`.

On approval, apply exactly the approved hunks in **one commit**.

## Contradiction handling — stop, don't resolve

If a proposed change would **contradict** an existing doc (the new content
conflicts with a still-valid rule or statement) rather than **extend** it
(the new content adds detail consistent with what's there), this skill must
stop and hand off to `adr-log` instead of resolving the contradiction
itself. Recognizing a contradiction is exactly the kind of decision
`adr-log`'s needs-an-ADR test criterion 5 exists for — `doc-sync` detects
and routes, it does not adjudicate.
