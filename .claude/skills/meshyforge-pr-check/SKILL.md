---
name: meshyforge-pr-check
description: >-
  Validates a MeshyForge PR or diff against Github_Repository_Expectations.md
  - branch naming ({type}/{kebab-case}), Conventional Commits format, the
  500-line diff cap (PR-11), IPC-contract both-sides-sync requirement
  (PR-05), required PR description sections (Build Phase, Feature ID),
  new-dependency justification (PR-06/DEP-04), tech-debt cap per PR
  (DEBT-04), and the required CI status checks (frontend-checks,
  frontend-tests, rust-checks and build-smoke per platform). Use when
  reviewing a pull request, a branch before opening a PR, or a diff for
  compliance with MeshyForge's repository governance rules. Use before
  merging any PR or when asked to check PR/branch/commit compliance.
---

# MeshyForge PR Check

Validates a branch, diff, or open PR against `Github_Repository_Expectations.md`
(GREB) and the CSD rules it incorporates by reference. Read-only audit — reports
findings, does not modify or merge anything.

## Before anything else: confirm there's something to check

If asked to check "the current PR" or "this branch" and there is no diff
against `main` (e.g., a fresh clone with no commits yet, or `main` and the
current branch are identical), report that plainly — "No diff to review; this
branch has no changes relative to main yet" — rather than fabricating findings
against a diff that doesn't exist. If specific GREB-governed files don't exist
yet (e.g., `.github/pull_request_template.md`, `.github/workflows/ci.yml`),
note which checks couldn't run because the underlying file/process doesn't
exist yet (this is expected pre-Phase-0-completion) rather than treating their
absence as a violation of this skill's own checks — GREB governs the *process*
once it exists, not a mandate that Phase 0 already be done.

## Checks

### 1. Branch naming (GREB BRN-03, CSD GIT-02)

Pattern: `{type}/{kebab-case-description}`, where `{type}` is one of `feat`,
`fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci` (GREB §5.1 also lists
`release/{version}`, used rarely). Example valid: `feat/text-to-3d-panel`,
`fix/polling-memory-leak`. Flag: missing type prefix, camelCase/snake_case
description, uppercase letters, or a type not in the list.

### 2. Commit message format (GREB §6, CSD §14.2)

Format: `{type}({scope}): {description}` with the same type list as above.
Rules to check (cite by ID):
- **CMT-01**: description is lowercase, imperative mood ("add" not "added").
- **CMT-02**: description ≤ 72 characters.
- **CMT-05**: no `wip`, `fix typo`, or other non-descriptive messages on `main`
  after squash (informal messages on the feature branch pre-squash are fine —
  GREB CMT-06 — only the final squash message must comply).
- **CMT-07**: no commit touches `package-lock.json`/`Cargo.lock` without a
  corresponding `package.json`/`Cargo.toml` change.
- **CMT-08**: no commit adds a dependency without PR-description justification
  (checked together with §6 below).

Valid `type` scopes are listed in GREB §6.3 (`generate`, `post`, `img`,
`print`, `gallery`, `preview`, `tasks`, `settings`, `export`, `tauri`,
`client`, `database`, `keychain`, `deps`, or none for cross-cutting changes).

### 3. Diff size (GREB PR-11, §7.3)

| Diff size (excluding lock files and generated files) | Verdict |
|---|---|
| ≤ 100 lines | Ideal |
| 101–300 lines | Acceptable |
| 301–500 lines | Maximum — recommend splitting |
| > 500 lines | **Blocked per PR-11** — must split into smaller PRs |

Exclude `package-lock.json`, `Cargo.lock`, and any generated files from the
count before applying the threshold.

### 4. PR touching more than 3 build phases (GREB PR-12)

If the diff spans code/docs belonging to more than 3 of the 6 IEP phases
(Phase 0–5, per `implementation_execution_plan.md`), flag for splitting.

### 5. IPC contract both-sides-sync (GREB PR-05)

If the diff touches `src/lib/tauri.ts` or any `src-tauri/src/commands/*.rs`
file, confirm `src/lib/meshy-types.ts` is *also* touched in the same diff. A
change to one side without the other is a PR-05 violation — the Rust struct
and TS interface must move together.

### 6. Required PR description sections (GREB §7.1 template)

The PR description (or the task description if no PR exists yet) must include:
- **Build Phase**: one of Phase 0–5, per the template's comment listing them.
- **Feature ID(s)**: FRD feature IDs implemented (e.g., `FR-GEN-01`), per
  PR-10.
- A **Summary** section.
- If new Tauri commands were added: Rust tests included (PR-03).
- If new React components were added: component tests included (PR-04).
- If UI changed: screenshots/recordings included (PR-09).

### 7. New-dependency justification (GREB PR-06 / DEP-04, §13.1)

If `package.json`/`Cargo.toml` gained a new dependency, the PR description
must justify it. Also check the dependency-quality bars from §13.1 where
determinable:
- **DEP-05**: ≥1,000 weekly npm downloads or ≥100 crates.io downloads (or
  justified otherwise).
- **DEP-06**: license is MIT, Apache-2.0, ISC, or BSD.
- **DEP-01/DEP-02**: caret ranges (`^`) except `three`, which is pinned exact
  (DEP-10).

### 8. Tech-debt cap (GREB DEBT-04, CSD §17.3)

No PR may introduce more than 2 new `tech-debt`-labeled issues (DEBT-04). If
the PR description references new tech-debt items, count them. If tech debt
is introduced, confirm a corresponding `tech-debt` issue is referenced
(DEBT-01).

### 9. Required CI status checks (GREB §11.2–11.3)

These are the exact required check names — cite them verbatim, don't
approximate:

- `frontend-checks` (ubuntu-latest: npm ci → biome check → tsc --noEmit)
- `frontend-tests` (ubuntu-latest: npm ci → vitest --coverage)
- `rust-checks (ubuntu-latest)`, `rust-checks (windows-latest)`,
  `rust-checks (macos-latest)` (cargo fmt --check → cargo clippy → cargo test)
- `build-smoke (ubuntu-latest)`, `build-smoke (macos-latest)`,
  `build-smoke (windows-latest)` (npm ci → tauri build)

If CI results are available (e.g., via `gh pr checks`), confirm all 8 are
green. If CI infrastructure (`.github/workflows/ci.yml`) doesn't exist yet in
the repo, report that this check is not yet applicable — don't fail a PR for
missing CI results the pipeline was never capable of producing.

### 10. Merge mechanics (GREB §3.2, §5.3)

Squash merge only (MRG-01/MRG-05); no direct commits to `main` (BRN-02); all
review conversations resolved before merge (MRG-04). These are usually
GitHub-enforced, but flag if visibly violated (e.g., a merge commit in the
history, or commits authored directly on `main`).

## Output format

One line per check category (1–10) with pass/fail/not-applicable and the
specific rule ID(s) cited. For failures, quote the offending text (branch
name, commit message, diff stat, missing section) and the rule it violates.
End with a pass/fail summary count. If there's no diff/PR to check at all,
say so and stop — don't run the checklist against nothing.
