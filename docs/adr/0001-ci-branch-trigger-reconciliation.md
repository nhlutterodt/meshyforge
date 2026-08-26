# ADR-0001: CI Branch-Trigger and Branching-Model Reconciliation

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-08-25 |
| **Deciders** | Project owner (confirmed Option C — hybrid `main` push + all PRs) |
| **Phase** | Post-MVP (Phase 5 complete; governance reconciliation) |
| **Related rules/features** | GREB BRN-07, GREB CI-01, GREB §11.1, TSS §16.2, FRD acceptance criteria |
| **Supersedes** | None |

## Context

The validation audit (`docs/audits/validation-33d1e43-2026-08-25.md`, F-DRIFT-03)
found that `.github/workflows/ci.yml:5` triggers on `push: [main, develop]`,
but GREB BRN-07 (line 277) states "No `develop` or `staging` branches."
Further investigation revealed a **three-way contradiction**:

1. **BRN-07** (GREB §5.2, line 277): "No `develop` or `staging` branches.
   `main` is the only long-lived branch."
2. **CI-01** (GREB §11.4, line 922): "CI must run on every push to **any
   branch** and every PR to `main`."
3. **ci.yml** (line 5): `branches: [main, develop]` — triggers on only
   `main` + `develop`, not "any branch."

`ci.yml` violates *both* rules: it references a branch BRN-07 forbids
(`develop`), and it doesn't trigger on "any branch" as CI-01 requires
(feature branches like `feat/*` are excluded from push triggers — they only
get CI when a PR is opened).

**Needs-an-ADR test satisfied — criteria 2, 5, and 6:**
- Criterion 2: Narrows/extends a numbered rule (CI-01) in GREB's `CI`
  namespace.
- Criterion 5: Resolves a known doc contradiction (BRN-07 vs. CI-01 vs.
  `ci.yml`).
- Criterion 6: Expensive to reverse — CI trigger config affects
  branch-protection rules and developer workflow expectations.

**Constraints found:**
- `GREB §5.1` (line 251): "MeshyForge uses a simple trunk-based branching
  model appropriate for a solo-developer personal project" — constrains the
  branching model to trunk-based.
- `GREB §5.2 BRN-07` (line 277): "No `develop` or `staging` branches. `main`
  is the only long-lived branch." — forbids `develop`.
- `GREB §11.4 CI-01` (line 922): "CI must run on every push to any branch
  and every PR to `main`." — requires "any branch" push triggers.
- `GREB §11.1` (line 890): ci.yml row says "Push to any branch, PR to
  `main`" — mirrors CI-01.
- `TSS §16.2` (line 1775): CI workflow example shows `branches: [main,
  develop]` — the code was copied from this spec, propagating the
  contradiction.
- `FRD` (line 774): Acceptance criteria says "GIVEN a push to any branch" —
  aligns with CI-01.
- `GREB §5.2 BRN-03` (line 261): Branch names follow
  `{type}/{kebab-case-description}` — feature branches are expected and
  short-lived.
- `GREB §5.2 BRN-04` (line 263): "Branches are short-lived (max 7 days)" —
  feature branches are ephemeral.
- `GREB §5.2 BRN-05` (line 265): "Branches are automatically deleted after
  merge" — reinforces ephemeral branches.
- `GREB §5.3 MRG-03` (line 285): "Merge is blocked if any required status
  check is failing" — PR-triggered CI is the quality gate.

**Precedent search record:**
- Searched: `BRN-07|CI-01|develop branch|staging branch|any branch|trunk-based`
  across all `docs/**`
- Searched in: `docs/Github_Repository_Expectations.md`,
  `docs/technical_stack_documentation.md`,
  `docs/feature_requirements_documentation.md`,
  `docs/audits/validation-33d1e43-2026-08-25.md`,
  `docs/doc-sync/2026-08-25-consolidated-sync-plan.md`
- Searched for prior ADRs: `docs/adr/**` — directory did not exist; no prior
  ADRs exist.
- Result: No prior ADR precedent found. The contradiction is documented in
  the audit (F-DRIFT-03) and the consolidated sync plan (Part C.3) but had
  not been adjudicated.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A: Narrow CI to `main`-only push (BRN-07 authoritative)** | Simplest fix; matches solo-project trunk-based model; BRN-07 stays untouched; fewest CI minutes; `main` push CI catches post-merge regressions immediately; aligns ci.yml with BRN-07 | Feature-branch pushes get no CI — developers only learn of failures after opening a PR; slower feedback loop; narrows CI-01's "any branch" intent | Narrows **CI-01** (GREB §11.4) from "any branch" to "`main`"; narrows **§11.1 table** (line 890) from "any branch" to "`main`"; contradicts **FRD** acceptance criteria (line 774: "GIVEN a push to any branch") which would also need updating |
| **B: Broaden CI to all-branch push (CI-01 intent preserved)** | Fastest feedback — CI runs on every feature-branch push; CI-01's intent preserved without weakening; BRN-07 clarification is an extension (adds nuance about long-lived vs. short-lived), not a contradiction; FRD acceptance criteria already aligns | More CI minutes (every push to every branch); potential noise from WIP pushes; BRN-07 requires a prose clarification | Clarifies **BRN-07** (GREB §5.2) to distinguish long-lived vs. short-lived branches — an extension, not a violation; no other rule conflicts |
| **C: Hybrid — `main` push + all PRs (compromise)** | Catches post-merge regressions on `main`; validates all feature branches via PR triggers (before merge); moderate CI cost; no ambiguity about when CI runs; BRN-07 stays authoritative for long-lived branches; PR-triggered CI is the documented merge gate (MRG-03) | Feature-branch pushes before PR creation still get no CI; slightly more CI minutes than A (PRs trigger on any target branch, not just `main`); requires CI-01 to be narrowed from "push to any branch" to "push to `main` + all PRs" | Narrows **CI-01** from "push to any branch" to "push to `main` + PR to any target"; narrows **§11.1 table** similarly; contradicts **FRD** acceptance criteria (line 774) |

## Decision

**Adopt Option C: Hybrid — `main` push + all PRs.**

CI triggers on every push to `main` and every pull request (regardless of
target branch). Feature branches are validated through PR-triggered CI before
merge, not through push triggers. This combines post-merge regression
detection on `main` with pre-merge quality gating on all PRs, at moderate CI
cost.

Rationale: This is a solo-developer project with a trunk-based model.
BRN-07 is the controlling governance rule — it explicitly forbids
`develop`/`staging` branches and designates `main` as the only long-lived
branch. Feature branches are short-lived (BRN-04: max 7 days) and
auto-deleted after merge (BRN-05), making push-triggered CI on them a
marginal benefit. PR-triggered CI provides the quality gate before merge
(per MRG-03: "Merge is blocked if any required status check is failing"),
and triggering on all PRs (not just PRs to `main`) provides flexibility for
internal-dependency PRs or cross-branch reviews if they ever arise. The
hybrid model balances governance simplicity with practical coverage without
the CI-minute cost of all-branch push triggers.

**Newly proposed rule ID(s)** (proposed — do not imply they exist until
GREB is actually updated):
- `CI-01` (revised) — "CI must run on every push to `main` and every pull
  request. Feature branches are validated through PR-triggered CI, not push
  triggers."

## Consequences

**Positive:**
- ci.yml, BRN-07, CI-01, and §11.1 table all become consistent
- Post-merge regressions caught immediately via `main` push CI
- All feature branches validated via PR-triggered CI before merge
- BRN-07 remains the authoritative branching rule without modification
- Trunk-based model preserved as documented in §5.1
- Moderate CI cost — no per-push triggers on feature branches
- PR-triggered CI aligns with MRG-03's merge-gate requirement

**Negative:**
- Feature-branch pushes before PR creation get no CI — slower feedback for
  WIP pushes
- CI-01 is narrowed from "push to any branch" to "push to `main` + all PRs"
  — a reduction in push-triggered coverage
- FRD acceptance criteria (line 774: "GIVEN a push to any branch") must be
  updated to "GIVEN a push to `main` or a pull request"

**Follow-ups:**
- **Docs to update** (handed off to doc-sync — this ADR does not edit them):
  - `Github_Repository_Expectations.md` §11.4 CI-01 (line 922): narrow "every
    push to any branch and every PR to `main`" → "every push to `main` and
    every pull request"
  - `Github_Repository_Expectations.md` §11.1 table (line 890): narrow
    "Push to any branch, PR to `main`" → "Push to `main`, all PRs"
  - `Github_Repository_Expectations.md` metadata: bump to v1.0.1, date
    2026-08-25
  - `technical_stack_documentation.md` §16.2 (line 1775): update ci.yml
    example to `push: branches: [main]` and `pull_request:` with no
    branches filter
  - `feature_requirements_documentation.md` (line 774): update acceptance
    criteria "GIVEN a push to any branch" → "GIVEN a push to `main` or a
    pull request"
  - `docs/CHANGELOG.md`: add doc-version-bump entries
- **Code to update:**
  - `.github/workflows/ci.yml:5`: change `branches: [main, develop]` →
    `branches: [main]`
  - `.github/workflows/ci.yml:7`: change `pull_request: branches: [main]`
    → `pull_request:` (remove the branches filter so all PRs trigger)
- **Tests to add:** None — CI trigger config is not unit-tested
- **Tech debt to register:** None

## References

- `GREB §5.1` (line 251) — trunk-based branching model
- `GREB §5.2 BRN-07` (line 277) — no develop/staging branches
- `GREB §5.2 BRN-04` (line 263) — branches short-lived (max 7 days)
- `GREB §5.2 BRN-05` (line 265) — branches auto-deleted after merge
- `GREB §5.3 MRG-03` (line 285) — merge blocked if status checks failing
- `GREB §11.4 CI-01` (line 922) — CI must run on every push to any branch
- `GREB §11.1` (line 890) — ci.yml trigger description
- `TSS §16.2` (line 1775) — CI workflow example
- `FRD` (line 774) — acceptance criteria "GIVEN a push to any branch"
- Related audit: `docs/audits/validation-33d1e43-2026-08-25.md` F-DRIFT-03
- Related sync plan: `docs/doc-sync/2026-08-25-consolidated-sync-plan.md` Part C.3
- Related ADRs: None (first ADR)