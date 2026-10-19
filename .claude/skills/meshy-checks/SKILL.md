---
name: meshy-checks
version: 1.0
description: Run the four GREB/CSD checks pr-lint cannot script (PR-12 phase span, DEP-05/06 deps, DEBT-04 debt cap, Rust coverage) on the current branch. Use after pr-check on Meshy. NOT for lint/test gates or the scripted PR checks.
---
# Meshy Checks (thin; project-unique)
Follows autonomy-policy.md. Reads `.claude/gates.json` (phases, pr, hard_stop_globs) and the adapter `thresholds`. Run after `pr-check`; each check returns pass | fail | NOT_VERIFIED (tool or network missing; never pass).

## 1. PR-12 phase span (fail if diff touches more than 3 phases; p0 scaffold excluded, its `src/` prefix matches everything)
```
node -e "const c=require('./.claude/gates.json'),{execSync:x}=require('child_process');const f=x('git diff --name-only origin/main...HEAD').toString().split('\n').filter(Boolean);const h=c.phases.filter(p=>p.id!=='p0'&&p.requires.some(r=>f.some(n=>n.startsWith(r)))).map(p=>p.id);console.log(JSON.stringify({phases:h,verdict:h.length>3?'fail':'pass'}))"
```
Fail: propose a split by phase id in the report (do not split automatically).

## 2. DEP-05/06 new dependencies
List added deps: `git diff origin/main...HEAD -U0 -- package.json src-tauri/Cargo.toml | grep '^+' | grep -v '^+++'`. Per new dep:
- npm: `npm view <pkg> license` must be MIT, Apache-2.0, ISC or BSD*; `curl -s https://api.npmjs.org/downloads/point/last-week/<pkg>` downloads >= 1000.
- Cargo (inferred): `https://crates.io/api/v1/crates/<crate>` license + recent downloads; same bar.
- Ranges must be caret (`^`); `three` must be pinned exact (no `^`/`~`).
Dependency ADR needed: route to `adr-log` (decide + log, not a stop).

## 3. DEBT-04 tech-debt cap (max 2 new debt issues per PR)
`gh pr view --json body -q .body` (or `--pr-body file` text); count lines/links naming new tech-debt issues (marker `tech-debt`, inferred; log the marker used). More than 2: fail, report which to defer.

## 4. Rust coverage (floors: meshy/ 80, storage/ 80, commands/ 60, security/ 50)
`cargo llvm-cov --manifest-path src-tauri/Cargo.toml --summary-only` (gates.json `rust-cov`; needs cargo-llvm-cov, inferred). Compare per-directory line % to the floors for directories the diff touched. Tool absent: NOT_MEASURED, never 0%. Frontend floors are already read by pr-check from the istanbul summary.

## Report (Outcome / Decisions / Parked / Next)
One table: check, verdict, evidence. Parked: any hard_stop_globs file in the diff (security, capabilities, CSP, client.rs headers) with the exact file list.

v1.0: replaces unscripted rules from the retired meshyforge-pr-check and test-coverage-check skills.
