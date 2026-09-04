---
name: validate-implementation
description: >-
  Read-only audit of MeshyForge's implementation against its planning docs —
  repository governance, automated quality gates, coding-standard rule
  sweeps, FRD feature coverage, test_plan.md test-case coverage, and a
  security spot-check against security_threat_model.md — scoped to what the
  current build phase (per implementation_execution_plan.md) has actually
  reached, so later-phase gaps are reported as "not yet due" rather than
  failures. May run non-mutating commands (tsc --noEmit, cargo clippy, cargo
  test, coverage tools) but never edits source or planning docs; writes only
  its own report to docs/audits/. Use when asked to audit, validate, or
  check the state of the MeshyForge implementation against its specs, or
  before/after a phase-gate review.
---

# Validate Implementation

A read-only audit skill. It runs non-mutating commands (`tsc --noEmit`,
`cargo clippy`, `cargo test`, coverage tooling) to gather evidence once code
exists, greps source against the coding-standard rule IDs, and writes a
single report. **It never edits source code or planning docs** — the only
file it writes is its own report under `docs/audits/`. Findings that imply a
doc is wrong or a decision needs to be made are routed to `doc-sync` or
`adr-log`, not fixed in place here.

## Before anything else: confirm there is code to audit

MeshyForge is greenfield at project start — only the 14 root-level planning
docs exist until Phase 0 of `implementation_execution_plan.md` produces
`package.json`, `src-tauri/Cargo.toml`, etc. Check specifically for **code**
artifacts — `package.json`, `src/`, `src-tauri/` — not the full GREB §4.1 root
file list: non-code repo files like `LICENSE`, `.gitignore`, or `README.md`
may already exist (from repo setup) while zero implementation exists, and
"none of GREB's expected files exist" would then be false even though there's
still nothing to audit. If none of `package.json`/`src/`/`src-tauri/` exist,
report that plainly (e.g. "No implementation exists yet — Phase 0 not
started. Nothing to audit.") and stop before Steps 1–7 (Step 1's governance
check may still separately note missing non-code repo files as its own
governance finding, once there's a real audit to run). Do not fabricate
findings or treat an absent codebase as either a pass or a fail.

## Order of checks (cheap -> expensive, structural -> semantic)

### 0. Preflight — resolve phase-due-ness

Resolve the current git HEAD (if the repo has git history yet — note plainly
if it doesn't). Determine which `implementation_execution_plan.md` phase's
quality gate was **last passed**, by checking which phase-gate artifacts
exist and whether their gate's verification conditions hold (e.g. Phase 0's
gate needs `npm run tauri dev` to launch and lint/tsc/clippy/cargo test all
green; Phase 1's gate additionally needs `cargo test` + `cargo clippy` clean
and the SQLite DB/keychain paths working — see IEP §4–9 for each phase's
exact gate text).

Anything belonging to a **later** phase than the last-passed gate is scored
**"Not yet due"**, not a gap — do not penalize Phase 3 generation panels for
not existing when Phase 1 hasn't passed its gate yet. Carry this
phase-boundary forward into every later step.

### 1. Governance

Compare actual repo layout against `Github_Repository_Expectations.md` §4
(Repository Structure): root file/directory list (§4.1), `.github/`
structure (§4.2), `docs/` structure (§4.3), and the `REP-01`–`REP-10` file
presence rules (§4.4) — license exists, README has required sections
(§14.2), lock files committed, `.gitignore` matches CSD §14.4, no secrets,
all 6 design docs present under `docs/` (`REP-06`/`DOC-REP-01` — note that as
of this writing the planning docs still live at repo root, which is itself a
standing governance gap; don't silently "fix" this, report it and point at
`adr-log`/`doc-sync` for the actual resolution), no binaries/symlinks/>1MB
files outside the allowed exceptions.

### 2. Automated gates

Run and record pass/fail for the gate table in `coding_standards.md` §18.1:
Biome (`npx biome check src/`), `tsc --noEmit`, ESLint hooks rules, `cargo
clippy -- -D warnings`, `cargo fmt -- --check`, `cargo test`, `vitest
--coverage`, and a Tauri build smoke test — whichever of these have an
applicable target yet given the phase from Step 0. Cross-check against
`Github_Repository_Expectations.md` §11.3's required-status-check list so
CI-blocking vs. warning-only status (§18.4 Block/Warn/Info) is reported
accurately, not just pass/fail.

### 3. Standards sweep

Targeted greps per rule namespace — pull the exact pattern from the relevant
doc section rather than guessing. Representative examples (not exhaustive;
`coding_standards.md` §19.1 is the full 198-rule index):

| Rule | What to grep for | Source |
|---|---|---|
| `TYP-01` | `: any`, `as any`, `<any>` in `src/**/*.ts(x)` | CSD §4.2 |
| `RCT-10` / `CTR-07` | `@tauri-apps/api/core` imported anywhere outside `src/lib/tauri.ts` | CSD §5.1, UI/UX §7.2 |
| `RST-01` | `.unwrap()` / `.expect(` in `src-tauri/src/**/*.rs` outside `#[cfg(test)]` blocks | CSD §6.1 |
| `VAL-06` | `format!(` or string concatenation feeding `conn.execute`/`conn.prepare` | CSD §6.5, §12.2 |
| `SEC-04` | The API key variable/field appearing in `log::`/`tracing::`/`println!` calls | CSD §12.1 |
| `RCT-08` / `CMP-07` | Component files exceeding 200 lines | CSD §5.1, UI/UX §4.4 |
| `DOC-REP-06` | Any doc file (this report included) exceeding 2000 lines | GREB §14.3 |
| `STY-01` | Raw hex colors (`#[0-9a-fA-F]{3,8}`) in `className`/`style` props | CSD §9.1 |
| `DRK-01` | `dark:` Tailwind prefix anywhere | CSD §9.4 |

Severity for each finding follows CSD §18.5 (Block/Warn/Info by rule
prefix) — report it, don't invent a severity.

### 4. Feature coverage

Map `feature_requirements_documentation.md` §4.1/§5 feature IDs (`FR-xxx-NN`)
to expected artifacts via the matching `implementation_execution_plan.md`
step(s), and classify each as **Implemented / Partial / Absent / Not yet
due** (using the Step 0 phase boundary). Cross-check against FRD §9 MVP
Completion Criteria (72 Must Have features, 10 E2E workflows) for the
overall verdict.

### 5. Test coverage

Match `test_plan.md`'s `TC-<domain>-<feature>-<seq>` test cases (§3–§8,
organized by phase) against actual test names — `test_plan.md` §2.1 states
test names map 1:1 to `it('...')` descriptions by reading underscores as
spaces, so this is a mechanical match, not a fuzzy one. Report per-module
coverage against the thresholds in `test_plan.md` §2.2: `src/components/`
>=70% lines, `src/hooks/` >=80%, `src/lib/` >=90%, `src/stores/` >=80%,
`src-tauri/src/meshy/` >=80%, `src-tauri/src/storage/` >=80%,
`src-tauri/src/commands/` >=60%, `src-tauri/src/security/` >=50%, frontend
suite overall >=70% lines / >=70% functions (UI/UX §13.1).

### 6. Security spot-check

This is a **spot-check**, not a full audit — the `meshyforge-security-review`
skill exists for a deep SEC/VAL/SAN pass; if the audit turns up more than a
handful of security-relevant findings, note that and recommend running that
skill rather than duplicating its work here. At this step, only confirm: (a)
evidence exists for the `SEC-01`–`08`, `VAL-01`–`06`, `SAN-01`–`04` rules
applicable to code that currently exists, and (b) the status of the six
residual risks in `security_threat_model.md` §10 (TLS pinning, download
integrity, DB/asset file permissions, keychain namespacing, Actions
permission scoping, code signing) — report whether each is still an
accepted gap or has since been addressed (which would itself imply a missed
ADR, since closing one is an Architectural/Security decision per `adr-log`'s
needs-an-ADR test).

### 7. Reverse drift

Any code found with no specifying doc section (a file, command, or pattern
that doesn't trace back to TDD/CSD/UI-UX/FRD) is a finding routed to
`adr-log` (if it represents an undocumented decision) or `doc-sync` (if it's
a completed feature the docs just haven't caught up to) — never silently
ignored and never resolved by this skill directly.

## Output

Write to `docs/audits/validation-<short-sha>-<date>.md` (use `no-git` in
place of `<short-sha>` if there's no git history yet). Structure the report
to mirror `gap_assessment_documentation.md`'s own shape, since that's the
existing precedent for this kind of document in this repo:

1. **Metadata table** — project, document type, version, date, scope
   (which phase this audit covers per Step 0), dependencies (docs read).
2. **Executive summary** + a verdict-at-a-glance table (one row per check
   area from Steps 1–7, with a pass/fail/not-yet-due verdict).
3. **Scope and exclusions** — explicitly list what was excluded as
   "not yet due" per Step 0, so the report can't be misread as claiming
   those areas failed.
4. **Methodology** — the order above, and which commands were actually run.
5. **Baseline inventory** — a compact table of what currently exists
   (files, commands run, doc versions read), mirroring
   `gap_assessment_documentation.md` §5.
6. **Per-finding detail tables** — one row per finding: **ID, Expected
   (`DOC §x.y`), Actual (`file:line`), Severity, Recommendation, Rationale**.
7. **Consolidated summary** — one table reconciling every finding's
   disposition, mirroring `gap_assessment_documentation.md` §7.
8. **Remediation plan in IEP step format** — reuse the Action/Source/
   Verification/Dependencies columns from `implementation_execution_plan.md`
   so remediation steps drop directly into the existing phase plan.
9. **Cross-reference appendix** — traceability from each finding back to
   its source doc section, mirroring `gap_assessment_documentation.md` §10.
