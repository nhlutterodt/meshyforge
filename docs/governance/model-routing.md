# Model Capability Routing Policy

| Field | Value |
|---|---|
| **Version** | 1.0.0 |
| **Date** | 2026-09-04 |
| **Status** | Active |
| **Governed by** | [ADR-0005](../adr/0005-agentic-delivery-governance.md) |

## Purpose

Route each unit of work to the *cheapest capability tier that has proven,
evidence-backed, it can do that work correctly in this repo* — not to a
named vendor or model. Model availability and pricing change; the
capability a task actually requires does not. This table is a policy, not a
benchmark: a task only moves down a tier once it has been run at the lower
tier with a passing outcome recorded (see "Promotion/demotion evidence"
below), never on the assumption that a smaller model "should" be able to
do it.

## Capability tiers

| Tier | Capability profile | What it's for |
|---|---|---|
| **T0 — Mechanical** | Follows an explicit, narrow, already-decided procedure with a deterministic pass/fail check (lint, type-check, a scaffold template, a rename across a fixed grep result set). No judgment calls. | Skill-guided scaffolding (`new-meshy-endpoint`, `new-rust-ts-type-pair`, `new-sqlite-migration`, `new-zustand-slice`, `new-query-hook`, `feature-panel-scaffold`), changelog/version-bump edits, `doc-sync`'s allowlisted `--apply` edits, running/reporting `phase-gate-check`. |
| **T1 — Scoped implementation** | Writes or edits code inside one module/file boundary against a spec that already exists (a feature requirement, an accepted ADR's Decision section, a bug with a known root cause). May need to reason about one IPC boundary but isn't deciding the boundary's shape. | Implementing an FRD-specified feature, fixing a `LESSONS_LEARNED.md`-class bug once root-caused, writing/updating tests for scoped changes, `meshyforge-pr-check`, `meshyforge-test-coverage-check`. |
| **T2 — Cross-cutting judgment** | Reasons across >1 module or the Rust<->TS boundary without a pre-existing spec; classifies risk; chooses between real tradeoffs; something a wrong call on is expensive to reverse. | Anything `adr-log`'s needs-an-ADR test (Step 2) flags as Architectural/Contract/Security/Dependency; root-causing a novel runtime failure (the `LESSONS_LEARNED.md` pattern, before the fix is known); `meshyforge-security-review`; classifying a backlog item's risk level in the task ledger; orchestration/dispatch decisions themselves. |
| **T3 — Irreversible / high-blast-radius** | Decisions that are expensive or impossible to reverse once shipped, or that touch the security/trust boundary in a way users depend on (keychain posture, download-origin allowlist, release signing, an ADR that supersedes a prior Accepted ADR). | Confirming/writing an ADR in the Security or Dependency class per `adr-log`; anything touching `security_threat_model.md`'s residual-risk list; release-workflow changes. |

## Routing table

| Work type | Tier | Notes |
|---|---|---|
| Run a scaffolding skill (`new-*`, `feature-panel-scaffold`) | T0 | Template-following; verify output against the skill's own checklist, don't re-derive it |
| `phase-gate-check`, `meshyforge-test-coverage-check` (read-only verification) | T0 | Deterministic commands, deterministic verdict |
| `doc-sync` draft-plan generation | T1 | Requires reading and correctly summarizing doc drift, not just running a command |
| `doc-sync --apply` (allowlisted edits only) | T0 | The allowlist itself is what keeps this mechanical |
| Implement an FRD-specified feature or fix a root-caused bug | T1 | Spec or root cause must already exist; if it doesn't, the work is actually T2 until it does |
| `meshyforge-pr-check`, `meshyforge-ipc-boundary-audit` | T1 | Checklist-driven but requires judgment on what a finding means |
| Root-cause an unexplained runtime failure | T2 | This is what produced every `LESSONS_LEARNED.md` entry; treat as T2 until the cause is nailed down, even if the eventual fix is one line |
| `adr-log` Architectural/Contract classification and options drafting | T2 | The confirm-before-write gate in `adr-log` Step 5 is the safety net regardless of tier |
| `meshyforge-security-review` | T2 | Security-relevant false negatives are expensive |
| `meshyforge-agent-orchestrator` risk classification and dispatch | T2 | Deciding what tier *other* work needs is itself a T2 judgment call |
| Security or Dependency-class ADR; release/signing changes | T3 | Always requires the human confirmation `adr-log` Step 5 already mandates — the tier restriction is about who/what *drafts* the options, not a bypass of that gate |

## Promotion/demotion evidence

A task type may move down a tier only after:

1. At least one real run at the lower tier produced a correct result, checked
   against the deterministic gate the work already has (tests, `tsc`,
   `clippy`, `phase-gate-check`, or human review for judgment work).
2. The run is recorded in the task ledger (`docs/governance/task-manifest.yaml`
   or its SQLite projection) with the tier used and the outcome, so the
   evidence is auditable later, not just remembered.

A task type moves up a tier immediately, with no evidence bar, the first
time a lower-tier attempt produces an incorrect result, misses a check this
policy assumed was deterministic, or turns out to require a judgment call
this table didn't anticipate. When in doubt, round up — this mirrors
`delivery-governance`'s own "Medium-uncertain is the higher tier" rule.

## Relationship to `adr-log`'s confirm-before-write gate

This routing table decides *which capability tier drafts or performs* a
piece of work. It never substitutes for `adr-log` Step 5's requirement that
a human confirm any Architectural/Contract/Security/Dependency decision
before it's written to disk — a T2 or T3 classification here is about
capability, not about removing the human checkpoint that already exists.
