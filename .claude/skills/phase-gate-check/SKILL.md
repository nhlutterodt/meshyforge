---
name: phase-gate-check
description: >-
  Verifies that the current MeshyForge IEP build phase's quality gate has
  actually passed before advancing to the next phase - runs/checks lint
  (Biome), tsc --noEmit, cargo clippy -D warnings, cargo test, and CI status,
  against the specific gate criteria for that phase from
  implementation_execution_plan.md and coding_standards.md §18. Correctly
  reports "not yet applicable" when the repo hasn't reached a given phase
  (e.g. Phase 0 not started) rather than fabricating a gate result. Use when
  asked whether it's safe to move to the next build phase, whether a phase's
  quality gate has passed, or to audit overall build-phase progress.
---

# MeshyForge Phase Gate Check

Verifies a specific IEP build phase's quality gate has actually passed before
work advances to the next phase. Source of truth for phase gates:
`implementation_execution_plan.md` §4–9 (each phase's own "Quality Gate" line)
and `coding_standards.md` §18 (Enforcement Mechanisms — the tooling that
implements the automated half of every gate). Read-only audit — reports
gate status, does not fix failures or advance phases itself.

## The six phases and their gates

| Phase | Milestone | Features (FRD §4.1) | Quality Gate (IEP source) |
|---|---|---|---|
| 0 — Project Scaffold | `Phase 0: Scaffold` | FR-INF-01, FR-INF-02, FR-INF-08 | `npm run tauri dev` launches; `npm run lint`, `npx tsc --noEmit`, `cargo clippy`, `cargo test` all pass; CI green on all platforms (IEP §4) |
| 1 — Backend Foundation | `Phase 1: Backend` | FR-INF-03–07 | `cargo test` and `cargo clippy` pass; commands callable from frontend; SQLite DB created at correct platform path; keychain store/get works; credit balance returns a number with a valid key (IEP §5) |
| 2 — Core UI Shell | `Phase 2: UI Shell` | FR-KEY-01–04, FR-SET-01–04, FR-NOTIF-02 | Four views render; API key entry/validate/store works; credit balance refreshes; sidebar collapses; StatusBar shows correct state; a11y audit passes; lint + tsc + component tests pass (IEP §6) |
| 3 — Generation Workflows | `Phase 3: Generation` | FR-GEN-01–07, FR-POST-01–07, FR-IMG-01–02, FR-PRINT-01–03, FR-CLAB-01–07, FR-TASK-01–07, FR-NOTIF-01/03 | Text-to-3D and image-to-3D full flows work; ≥3 endpoint types tested end-to-end; task monitor shows real-time progress; OS notification fires; error states (402/401/network) display; credit balance updates; all forms keyboard-accessible; component tests for `TextTo3DPanel`/`ImageTo3DPanel` pass; lint + tsc pass (IEP §7) |
| 4 — Asset Library | `Phase 4: Asset Library` | FR-GAL-01–10, FR-PREV-01–04, FR-TAG-01–04, FR-EXP-01–05 | Gallery displays downloaded assets; card click opens detail with 3D preview; GLB renders with orbit controls; search + tag filter work; tags/notes/favorite persist; export writes to chosen path; delete removes record + files; virtualization works at 200+ mock assets; 3D preview unmounts cleanly; all interactions keyboard-accessible; component tests for `AssetCard`/`AssetGrid`/`AssetDetail` pass; lint + tsc pass (IEP §8) |
| 5 — Polish and Release | `Phase 5: Polish` | FR-SET-05 | Full E2E passes on all platforms; Playwright e2e covers first launch, API key setup, generate, gallery view, export; bundle ≤ 300 KB gzipped; no memory leaks; all a11y tests pass; lint + tsc + clippy + cargo test pass; release workflow produces valid installers; README correct (IEP §9) |

Hard rule (IEP §10.5, GREB MLS-03): **no phase begins until the previous
phase's quality gate has fully passed.** Phases are not partially gateable —
a gate either passed or it didn't.

## Step 1 — Determine current phase state before checking anything

Do not assume which phase is "current." Establish it from repo state:

1. Check whether `src/` and `src-tauri/` exist at all. **If neither exists,
   Phase 0 has not started.** Report exactly that — "Phase 0 (Project
   Scaffold) has not started; no gate to check. Nothing to report as passed
   or failed." Do not run lint/tsc/clippy/test commands against a nonexistent
   project and do not fabricate a gate result either way.
2. If `src/` and `src-tauri/` exist, check which phase's deliverables are
   present by cross-referencing IEP §4–9's step-by-step file lists (e.g.
   Phase 2 gate requires `src/stores/`, `src/components/settings/`,
   `src/app/layout.tsx`; Phase 3 requires `src/components/generate/`,
   `src/hooks/useMeshyApi.ts`, etc.). Find the highest phase with *any*
   deliverables present — call this phase N — but **do not treat phase N as
   "current" until you've verified phases 0 through N-1 are each fully
   complete too**, per the hard sequential-gate rule above. Check each prior
   phase's deliverable list and gate criteria in ascending order; the first
   phase you find with missing deliverables or a criterion that was never
   verified is the actual current phase, even if later-phase files already
   exist (this happens — e.g. someone scaffolds a Phase 3 component before
   Phase 1's backend gate ever passed). Report this explicitly: "Phase X has
   files present but its own gate was never verified — treating Phase X as
   current, not the later phase with more files."
3. If the user names a specific phase to check, check that phase's gate
   specifically — but still confirm its deliverables exist before running any
   verification command. Checking a gate for a phase whose files don't exist
   yet should report "not yet applicable," not a failure.

## Step 2 — Run/check the automated portion of the gate

Every phase gate includes some subset of these (CSD §18.1 is the canonical
tooling list):

| Check | Command | Blocks gate? |
|---|---|---|
| Frontend lint | `npx biome check src/` | Yes |
| TypeScript types | `npx tsc --noEmit` | Yes |
| Rust lint | `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` | Yes |
| Rust format | `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | Yes |
| Rust tests | `cargo test --manifest-path src-tauri/Cargo.toml` | Yes |
| Frontend tests | `npm run test -- --coverage` | Yes (threshold) |
| Build smoke test | `npm run tauri build` | Yes |
| CI status | Check `frontend-checks`, `frontend-tests`, `rust-checks` (×3 platforms), `build-smoke` (×3 platforms) per GREB §11.3 | Yes |

Run only the commands relevant to what actually exists (e.g. don't run
`cargo test` if `src-tauri/Cargo.toml` doesn't exist; don't run `npm run
tauri build` before Phase 0's scaffold files are in place). If a command
can't be run because its prerequisite config doesn't exist yet, report that
specific check as "not yet configured" rather than "failed."

**Before trusting any `npx`-invoked result**, confirm the tooling is actually
installed rather than letting `npx` silently fall through to fetching an
unrelated same-named package from the npm registry — this is a real trap:
`npx tsc` and `npx biome` resolve to abandoned/unrelated packages (`tsc`,
`biome`) if `node_modules` isn't populated, not to TypeScript or Biome. Before
running any `npx` command: check `node_modules/` exists and a lockfile
(`package-lock.json`/`pnpm-lock.yaml`) is present; if not, report "dependencies
not installed — run `npm install` first" and do not run the command. If
`node_modules` exists, prefer the local binary directly
(`node_modules/.bin/tsc`, `node_modules/.bin/biome`) over bare `npx` to avoid
the resolution ambiguity entirely. Likewise for Rust: confirm `cargo` resolves
on PATH (`cargo --version`) before running any `cargo` command; if it doesn't,
report "cargo not available in this environment" as its own distinct status,
not as a failed check.

For the **CI status** row specifically: there is no local command that
reproduces a hosted CI run. Check for `.github/workflows/*.yml` — if absent,
report "no CI workflow configured yet, nothing to check." If present, either
use the `gh` CLI (`gh run list --branch <branch> --limit 5`) if available and
authenticated, or report "CI config exists but status must be checked on
GitHub directly — not verifiable from this context" rather than treating an
unchecked CI status as passing.

## Step 3 — Check the phase-specific functional criteria

The automated checks above are necessary but not sufficient — each phase gate
in the table above also has functional/manual criteria (e.g. Phase 2's "API
key entry/validate/store works," Phase 4's "3D preview unmounts cleanly").
These generally require either running the app manually or having E2E/
component test coverage for the specific behavior. Where a `run` skill or the
project's test suite can verify these, use it; where it genuinely requires
manual verification (a11y audits, cross-platform installer checks, memory
leak audits per CSD §18.3), say so explicitly rather than claiming an
automated pass for a manual gate.

## Step 4 — Verdict

State clearly, per phase checked:
- **Not yet applicable** — phase hasn't started (no deliverables present).
- **In progress, gate not yet run** — deliverables exist but checks haven't
  been executed or can't be from this context.
- **Gate failed** — specific checks failed; list which ones and why, with the
  exact command output where available.
- **Gate passed** — all automated checks green and functional criteria
  verifiably met; safe to begin the next phase per IEP §10.5/GREB MLS-03.

Never report "passed" on partial evidence — if any required check couldn't be
verified, the verdict is "gate not fully verified," not "passed."
