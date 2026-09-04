---
name: meshyforge-test-coverage-check
description: >-
  Checks new or changed MeshyForge code against per-directory coverage
  thresholds from coding_standards.md §11.4 (components >=70%, hooks >=80%,
  lib >=90%, stores >=80% on the frontend; meshy >=80%, storage >=80%,
  commands >=60%, security >=50% on the Rust side), confirms co-located test
  files exist per the naming convention, and cross-references test_plan.md's
  TC-ID checklist for the relevant feature. Use when reviewing new
  components, hooks, Tauri commands, or Rust modules, or when asked whether
  a change has adequate test coverage. Use before merging a PR that adds or
  changes application code.
---

# MeshyForge Test Coverage Check

Checks new/changed source files for (a) meeting the per-directory coverage
threshold from CSD §11.4, (b) having a co-located test file per CSD ORG-03,
and (c) covering the relevant TC-ID rows from `test_plan.md`. Read-only audit
— reports findings, does not write tests.

## Before anything else: confirm there is code and tests to check

MeshyForge is greenfield — before Phase 0/1 land any files under `src/` or
`src-tauri/src/`, there is nothing to run coverage against. Before auditing:

1. Confirm the target file(s) actually exist.
2. Confirm a test runner is configured (`vitest.config.ts`/coverage config,
   `Cargo.toml` test setup) before claiming a coverage percentage — if no
   coverage tooling is wired up yet, say "coverage tooling not yet configured;
   cannot compute a percentage" rather than guessing or reporting 0% as if it
   were a measured failure.
3. If the feature being checked has no corresponding `test_plan.md` entry
   (i.e., it isn't one of the 76 FR-xxx features spanning TC-IDs
   `TC-INF-01-01` through `TC-SET-05-04`), say so rather than inventing a
   TC-ID.

## Part A — Coverage thresholds (CSD §11.4)

Cite the exact table — do not approximate these numbers:

| Path | Threshold | Notes |
|---|---|---|
| `src/components/` | ≥ 70% lines | UI/UX §13.1 |
| `src/hooks/` | ≥ 80% lines | |
| `src/lib/` | ≥ 90% lines | |
| `src/stores/` | ≥ 80% lines | |
| `src-tauri/src/meshy/` | ≥ 80% lines | API client |
| `src-tauri/src/storage/` | ≥ 80% lines | database |
| `src-tauri/src/commands/` | ≥ 60% lines | Tauri commands |
| `src-tauri/src/security/` | ≥ 50% lines | keychain; platform-dependent |

Additionally, per UI/UX §13.1 (restated in `test_plan.md` §2.2): the frontend
test suite overall must hit ≥ 70% lines / ≥ 70% functions.

If real coverage numbers are obtainable (`npm run test -- --coverage`,
`cargo tarpaulin` or equivalent), run them and compare against the table above
per changed directory. If not runnable in this context, inspect the changed
files and their test files directly — flag any exported function, branch, or
component prop path with no visible corresponding test as a likely gap,
noting this is a manual estimate, not a measured percentage.

## Part B — Co-located test file convention (CSD ORG-03, TST rules)

- TypeScript/React: `Foo.tsx` must have `Foo.test.tsx` in the same directory.
- Rust: tests live in `#[cfg(test)] mod tests` within the same file as the
  code under test (not a separate `tests/` file, unless it's a true
  integration test).
- New Tauri commands require Rust tests (GREB PR-03 / CSD PR-03).
- New React components require component tests (GREB PR-04 / CSD PR-04).
- Test naming: verb-led behavior descriptions (TST-01/02), grouped by
  `describe` blocks such as "rendering", "validation", "generation", "error
  handling", "accessibility" (TST-03). Flag test names that describe
  implementation instead of behavior (e.g. "test button disabled state"
  instead of "disables generate button when prompt is empty").
- No snapshot tests (TST-08). No `console.log` in tests (TST-06). `userEvent`
  over `fireEvent` (TST-05). Rust async tests use `#[tokio::test]`, not
  `block_on()` (TST-10).

For any new/changed file with no co-located test file at all, flag it — this
is a harder requirement than the percentage threshold and should be checked
even when coverage tooling isn't available.

## Part C — Cross-reference test_plan.md TC-IDs

`test_plan.md` enumerates 246 test cases across 76 features, ID scheme
`TC-<domain>-<feature-number>-<sequence>` (e.g. `TC-GEN-01-03`), each tagged
`RTL` / `RUST` / `E2E` / `GATE` (see its §2.2/§2.3). When a change implements
or touches a specific FRD feature:

1. Find that feature's TC-ID rows in `test_plan.md` (grep for the feature ID,
   e.g. `FR-GEN-01`).
2. For each TC-ID whose type is `RTL` or `RUST` (the two types expected to be
   covered by co-located unit/component tests — `E2E` and `GATE` cases live
   elsewhere per §2.2's tooling column), check whether a test with a matching
   behavior exists in the change.
3. Report which TC-IDs are covered, which are missing, and which are
   out-of-scope for this change (e.g. `E2E`/`GATE` cases that belong to
   Playwright suites or CI config, not this diff).

If the change doesn't map to any single FRD feature (e.g. a pure refactor or
a shared utility), say so and skip Part C rather than forcing a mapping.

## Output format

Three sections (A, B, C) matching the parts above. For Part A, report
measured or estimated coverage against the threshold per touched directory.
For Part B, list any file missing its co-located test. For Part C, list
covered / missing / out-of-scope TC-IDs by ID. If coverage tooling, test
files, or test_plan.md mappings are simply not applicable yet (no code, no
tests wired up, no feature mapping), state that plainly per section instead
of leaving it blank or guessing.
