# GitHub Repository Expectations and Behaviors Document — MeshyForge

## Document Metadata
| Field | Value |
|---|---|
| **Project** | MeshyForge — AI 3D Asset Studio |
| **Document Type** | GitHub Repository Expectations and Behaviors |
| **Version** | 1.0.1 |
| **Date** | 2026-08-26 |
| **Status** | Approved for Implementation |
| **Dependencies** | TDD v1.0.0, TSS v1.0.0, UI/UX v1.0.0, CSD v1.0.0, FRD v1.0.0 |

---

## Table of Contents
1. [Document Scope and Authority](#1-document-scope-and-authority)
2. [Source Alignment Matrix](#2-source-alignment-matrix)
3. [Repository Configuration](#3-repository-configuration)
4. [Repository Structure](#4-repository-structure)
5. [Branch Protection and Workflow Rules](#5-branch-protection-and-workflow-rules)
6. [Commit Standards](#6-commit-standards)
7. [Pull Request Standards](#7-pull-request-standards)
8. [Issue Tracking and Labeling](#8-issue-tracking-and-labeling)
9. [Milestone and Project Board Management](#9-milestone-and-project-board-management)
10. [Release Management](#10-release-management)
11. [CI/CD Pipeline Expectations](#11-cicd-pipeline-expectations)
12. [Repository Secrets and Security](#12-repository-secrets-and-security)
13. [Dependency Management](#13-dependency-management)
14. [Documentation in Repository](#14-documentation-in-repository)
15. [Code Review Process](#15-code-review-process)
16. [Technical Debt Tracking](#16-technical-debt-tracking)
17. [GitHub Features Usage](#17-github-features-usage)
18. [Repository Health Maintenance](#18-repository-health-maintenance)
19. [Onboarding and Contributor Expectations](#19-onboarding-and-contributor-expectations)
20. [Enforcement and Audit](#20-enforcement-and-audit)

---

## 1. Document Scope and Authority

### 1.1 Purpose

This document defines the mandatory rules, expectations, and behaviors for the MeshyForge GitHub repository. It governs repository configuration, branch protection, commit conventions, pull request process, issue tracking, release management, CI/CD, secrets, dependencies, documentation, code review, technical debt tracking, and repository health. Every interaction with the repository must conform to these standards.

### 1.2 Hierarchy

```
TDD  ── What to build
TSS  ── What tools to use
UI/UX ── How the UI must behave
CSD  ── How the code must be written
FRD  ── What features are required
GREB (THIS) ── How the repository must be governed
  │
  └── Implementation (code in the repository)
```

### 1.3 Applicability

| Repository Area | Standards Apply |
|---|---|
| Repository settings (visibility, permissions, features) | §3 |
| Branch structure and protection | §5 |
| Commit history | §6 |
| Pull requests | §7 |
| Issues and labels | §8 |
| Milestones and project boards | §9 |
| Releases and tags | §10 |
| GitHub Actions workflows | §11 |
| Repository secrets | §12 |
| `package.json`, `Cargo.toml`, lock files | §13 |
| `README.md`, `docs/`, `LICENSE`, `CONTRIBUTING.md` | §14 |
| Code review comments and approvals | §15 |
| `tech-debt` labeled issues | §16 |
| GitHub Wiki, Discussions, Pages, Sponsors | §17 |
| `.github/` directory (templates, workflows, configs) | All sections |

---

## 2. Source Alignment Matrix

Every rule in this document is traceable to an upstream requirement.

### 2.1 CSD Alignment

| CSD Section | CSD Requirement | GREB Section | Conformance |
|---|---|---|---|
| §14.1 — Branch strategy | `main` always green; branches named `{type}/{kebab-case}`; squash merge; no direct commits to main | §5, §6 | Branch protection enforces no direct pushes; branch naming validated in PR template |
| §14.2 — Commit messages | `{type}({scope}): {description}`; lowercase imperative; ≤ 72 chars | §6 | Commit message linting in CI; PR template includes convention reminder |
| §14.3 — PR standards | Description required; CI must pass; tests required for new commands/components; IPC changes update both sides; no new deps without justification; squash merge | §7 | PR template enforces checklist; CI gates block merge |
| §14.4 — `.gitignore` | node_modules, dist, src-tauri/target, .env, *.db, secrets | §4 | `.gitignore` committed and verified in CI |
| §15 — Code review | 46-item checklist across TS/React, Rust, testing, security, performance | §15 | PR template includes condensed checklist; reviewer references full CSD §15.1 |
| §17 — Technical debt | `tech-debt` label in issues; reviewed at end of each build phase; max 2 new TD items per PR | §16 | Issue template for tech debt; milestone review includes TD audit |
| §18 — Enforcement | Biome, tsc, clippy, cargo test, Vitest, Tauri build all block merge | §11 | CI workflow runs all checks as required status checks |

### 2.2 TSS Alignment

| TSS Section | TSS Requirement | GREB Section | Conformance |
|---|---|---|---|
| §16 — CI/CD | `ci.yml` (lint, type-check, test, build smoke on 3 platforms); `release.yml` (build installers on tag); `audit.yml` (weekly npm + cargo audit) | §11 | Workflows committed to `.github/workflows/`; required status checks |
| §17 — Dependencies | Exact versions in package.json and Cargo.toml; lock files committed | §13 | Lock files verified in CI; Dependabot configured |
| §20 — Cross-platform | macOS (arm64 + x86_64), Windows (x64), Linux (x64) | §10, §11 | Release matrix includes all 4 targets |

### 2.3 UI/UX Alignment

| UI/UX Section | UI/UX Requirement | GREB Section | Conformance |
|---|---|---|---|
| §12 — Build phases | 6 phases with dependencies and quality gates | §9 | Milestones created per phase; issues assigned to phase milestones |
| §13 — Quality gates | Automated (CI) and manual (a11y, cross-platform, memory) | §11, §15 | CI enforces automated gates; PR template includes manual gate checklist |
| §13.2 — Manual gates | Keyboard nav, screen reader, contrast, reduced motion, memory leak, bundle size, offline, error recovery | §15 | Manual gate checklist in PR template for Phase 4 and 5 PRs |

### 2.4 FRD Alignment

| FRD Section | FRD Requirement | GREB Section | Conformance |
|---|---|---|---|
| §4 — Feature catalog | 76 features with IDs, priorities, phases | §8, §9 | Each feature is a GitHub issue with `feature` label and milestone assignment |
| §6 — Dependency graph | Critical path of 12 features | §9 | Milestone ordering respects dependency graph |
| §9 — MVP completion | 72 Must Have features; 10 E2E workflows; all quality gates pass | §9, §10 | `v1.0.0` milestone contains all Must Have features; release blocked until milestone complete |

---

## 3. Repository Configuration

### 3.1 Repository Settings

| Setting | Value | Rationale | Source |
|---|---|---|---|
| **Visibility** | Public | Open-source personal project; MIT license | TSS §1.1 |
| **License** | MIT (LICENSE file in root) | Permissive open-source license | TSS §1.1 |
| **Default branch** | `main` | Convention; CSD GIT-01 | CSD §14.1 |
| **Allow force pushes** | No (on `main`) | Protect commit history | CSD GIT-01 |
| **Allow deletions** | No (on `main`) | Protect branch | CSD GIT-01 |
| **Allow merge commits** | No | Squash merge only (CSD GIT-04) | CSD §14.1 |
| **Allow rebase merges** | No | Squash merge only | CSD §14.1 |
| **Allow squash merges** | Yes | One commit per PR (CSD GIT-04) | CSD §14.1 |
| **Automatically delete head branches** | Yes | Keep branch list clean | — |
| **Issues** | Enabled | Feature tracking, bug reports, tech debt | §8 |
| **Projects** | Enabled | Build phase tracking | §9 |
| **Discussions** | Disabled | Use issues for all tracking; no Q&A forum needed for personal project | §17 |
| **Wiki** | Disabled | All documentation lives in `docs/` directory in the repository | §17 |
| **GitHub Pages** | Disabled | No website for MVP; documentation is in-repo | §17 |
| **Sponsors** | Disabled | Personal project; no monetization for MVP | §17 |
| **Packages** | Disabled | No npm/cargo packages published for MVP | — |
| **Actions** | Enabled | CI/CD required | §11 |
| **Archived** | No | Active development | — |

### 3.2 Branch Protection Rules

| Rule | Setting | Rationale |
|---|---|---|
| **Branch name pattern** | `main` | Protect the default branch |
| **Require pull request before merging** | Yes | No direct commits (CSD GIT-05) |
| **Required approvals** | 0 (personal project) | Solo developer; CI is the gate |
| **Dismiss stale approvals** | N/A (0 approvals required) | — |
| **Require status checks to pass** | Yes | CI must pass before merge |
| **Required status checks** | See §11.3 | All CI jobs must pass |
| **Require conversation resolution** | Yes | All review comments must be resolved |
| **Require signed commits** | No (optional for MVP) | Can be added post-MVP |
| **Require linear history** | Yes (squash merge ensures this) | Clean history |
| **Restrict pushes that create matching branches** | No | Feature branches can be created freely |
| **Restrict who can push to matching branches** | N/A (solo developer) | — |

### 3.3 Repository Access

| Role | Permissions | Assignee |
|---|---|---|
| **Owner** | Full admin | Repository creator (solo developer) |
| **Collaborators** | None for MVP | — |
| **Outside contributors** | Can submit PRs (public repo) | Anyone |

---

## 4. Repository Structure

### 4.1 Root Directory Contents

The repository root must contain exactly the following files and directories. No additional top-level files or directories are permitted without updating this document.

```
meshyforge/
├── .github/              # GitHub-specific files (workflows, templates, configs)
├── docs/                 # Design documents and contributor guides
├── src/                  # React frontend source code
├── src-tauri/            # Rust backend source code (Tauri)
├── .gitignore            # Git ignore rules
├── LICENSE               # MIT license file
├── README.md             # Project README
├── package.json          # npm dependencies and scripts
├── package-lock.json     # npm lock file (committed)
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── biome.json            # Biome linter/formatter configuration
├── eslint.config.js      # ESLint supplementary configuration
└── tailwind.config.ts    # Tailwind CSS configuration (if needed beyond @theme)
```

### 4.2 `.github/` Directory Structure

```
.github/
├── workflows/
│   ├── ci.yml            # Continuous integration (lint, test, build)
│   ├── release.yml       # Release build (on tag push)
│   └── audit.yml         # Weekly dependency audit
├── ISSUE_TEMPLATE/
│   ├── feature.yml       # Feature request template
│   ├── bug.yml           # Bug report template
│   ├── tech-debt.yml     # Technical debt item template
│   └── config.yml        # Issue template config (blank issues disabled)
├── pull_request_template.md  # PR template with checklist
├── CODEOWNERS            # Code ownership rules
└── dependabot.yml        # Dependabot configuration
```

### 4.3 `docs/` Directory Structure

```
docs/
├── TDD.md                # Technical Design Document
├── TSS.md                # Tech Stack Specification
├── UI-UX-Guardrails.md   # UI/UX Guardrails and Build Document
├── CSD.md                # Coding Standards Document
├── FRD.md                # Feature Requirements Document
├── GREB.md               # GitHub Repository Expectations and Behaviors (this document)
├── CONTRIBUTING.md       # Contributor guide
├── CHANGELOG.md          # Release changelog
└── API_REFERENCE.md      # Meshy API endpoint summary
```

### 4.4 File Presence Rules

| Rule ID | Rule | Rationale | Enforcement |
|---|---|---|---|
| **REP-01** | `LICENSE` file must exist in root and contain the MIT license text. | Legal requirement for open-source | CI check: file exists |
| **REP-02** | `README.md` must exist in root and contain the sections defined in §14.2. | Onboarding | CI check: file exists and contains required headers |
| **REP-03** | `package-lock.json` and `Cargo.lock` must be committed. | Reproducible builds (CSD GIT-07) | CI check: files exist and are not in .gitignore |
| **REP-04** | `.gitignore` must match the standard defined in CSD §14.4. | No secrets or build artifacts in repo | CI check: verify .gitignore contains required entries |
| **REP-05** | No file in the repository may contain a real API key, password, or secret. | Security | Pre-commit scan + CI secret scanning |
| **REP-06** | All design documents (TDD, TSS, UI/UX, CSD, FRD, GREB) must be committed to `docs/`. | Single source of truth | CI check: all 6 files exist |
| **REP-07** | No binary files (images, videos, executables) in the repository except: app icons in `src-tauri/icons/` and images in `docs/` if referenced by documentation. | Keep repo lightweight | Code review |
| **REP-08** | No symlinks in the repository. | Cross-platform compatibility (Windows) | CI check |
| **REP-09** | No files larger than 1MB in the repository (except app icons). | Keep clone fast | CI check |
| **REP-10** | The `.github/` directory must contain exactly the files listed in §4.2. No additional workflow files without updating this document. | Governance | Code review |

---

## 5. Branch Protection and Workflow Rules

### 5.1 Branch Model

MeshyForge uses a simple trunk-based branching model appropriate for a solo-developer personal project:

```
main (always green, always releasable)
 │
 ├── feat/{description}     ← New features
 ├── fix/{description}      ← Bug fixes
 ├── refactor/{description} ← Code restructuring
 ├── perf/{description}     ← Performance improvements
 ├── test/{description}     ← Test additions
 ├── docs/{description}     ← Documentation changes
 ├── chore/{description}    ← Maintenance (deps, config)
 ├── ci/{description}       ← CI/CD changes
 └── release/{version}      ← Release preparation (rare; usually tag directly)
```

### 5.2 Branch Rules

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **BRN-01** | `main` is always green. CI must pass before any merge. | Releasable main at all times | CSD GIT-01 |
| **BRN-02** | No direct commits to `main`. All changes go through a branch + PR. | Audit trail | CSD GIT-05 |
| **BRN-03** | Branch names follow `{type}/{kebab-case-description}`. Examples: `feat/text-to-3d-panel`, `fix/polling-memory-leak`. | Consistency | CSD GIT-02 |
| **BRN-04** | Branches are short-lived (max 7 days). Long-lived branches cause merge conflicts. | Integration frequency | CSD GIT-03 |
| **BRN-05** | Branches are automatically deleted after merge (GitHub setting: "Automatically delete head branches"). | Clean branch list | §3.1 |
| **BRN-06** | No more than 3 active branches at a time. Focus on completing before starting new work. | Focus | — |
| **BRN-07** | No `develop` or `staging` branches. `main` is the only long-lived branch. | Simplicity for solo project | — |
| **BRN-08** | Release branches are not used. Tags are created directly on `main` after merge. | Simplicity | — |

### 5.3 Merge Rules

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **MRG-01** | Squash merge only. One commit per PR. | Clean linear history | CSD GIT-04 |
| **MRG-02** | The squash commit message follows the commit convention (§6). The PR title is used as the default squash message. | Consistency | CSD GIT-04 |
| **MRG-03** | Merge is blocked if any required status check is failing. | CI is the gate | §11.3 |
| **MRG-04** | Merge is blocked if there are unresolved conversation threads on the PR. | All feedback addressed | §3.2 |
| **MRG-05** | No merge commits or rebase merges. Only squash merges. | Linear history | CSD GIT-04 |
| **MRG-06** | The PR is squashed by the author (not a reviewer) after all checks pass. | Author responsibility | — |

---

## 6. Commit Standards

### 6.1 Commit Message Convention

All commit messages (including squash-merge commits from PRs) must follow the Conventional Commits format defined in CSD §14.2.

```
{type}({scope}): {description}

{optional body}

{optional footer}
```

### 6.2 Type Values

| Type | Meaning | Example |
|---|---|---|
| `feat` | New feature | `feat(generate): add text-to-3D panel with form validation` |
| `fix` | Bug fix | `fix(tasks): stop polling when task reaches terminal status` |
| `refactor` | Code restructuring (no behavior change) | `refactor(tauri): extract error_json helper to shared module` |
| `perf` | Performance improvement | `perf(gallery): virtualize asset grid above 100 items` |
| `test` | Test addition or fix | `test(client): add wiremock tests for 402 and 429 errors` |
| `docs` | Documentation | `docs(tdd): update endpoint coverage matrix` |
| `chore` | Maintenance, deps, config | `chore(deps): bump three.js to 0.170.0` |
| `style` | Formatting, linting (no logic change) | `style(biome): apply biome format to all source files` |
| `ci` | CI/CD changes | `ci: add Linux build to release workflow` |

### 6.3 Scope Values

| Scope | Covers |
|---|---|
| `generate` | Generation panels (text-to-3D, image-to-3D, multi-image, creative lab) |
| `post` | Post-processing panels (remesh, retexture, convert, resize, uv-unwrap, rig, animate) |
| `img` | Image generation panels (text-to-image, image-to-image) |
| `print` | 3D printing panels |
| `gallery` | Gallery, asset cards, search, filter |
| `preview` | 3D preview viewport |
| `tasks` | Task monitor, polling, streaming, history |
| `settings` | Settings, preferences, about |
| `export` | Export dialog, batch export |
| `tauri` | Tauri commands, IPC, configuration |
| `client` | Meshy API client (Rust) |
| `database` | SQLite, migrations, queries |
| `keychain` | API key storage |
| `deps` | Dependency updates |
| (none) | Cross-cutting changes |

### 6.4 Commit Message Rules

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **CMT-01** | Description is lowercase, imperative mood: "add", "fix", "update". Not "added", "fixed". | Conventional Commits | CSD §14.2 |
| **CMT-02** | Description is ≤ 72 characters. | Git convention | CSD §14.2 |
| **CMT-03** | Body explains why, not what. The diff shows what. | Avoid noise | CSD §14.2 |
| **CMT-04** | Footer references issues: `Closes #42`, `Refs #17`. | Issue tracking | CSD §14.2 |
| **CMT-05** | No `wip`, `fix typo`, `test`, or other non-descriptive commit messages on `main` (after squash). | Clean history | — |
| **CMT-06** | Commit messages on feature branches before squash can be informal. The squash message must follow the convention. | Flexibility during development | — |
| **CMT-07** | No commit may modify a lock file (`package-lock.json`, `Cargo.lock`) without a corresponding dependency change in `package.json` or `Cargo.toml`. | Lock files must match manifests | §13 |
| **CMT-08** | No commit may add a new dependency without justification in the PR description. | Dependency scrutiny | CSD PR-06 |

### 6.5 Commit History Expectations

| Property | Expectation |
|---|---|
| **History shape** | Linear (squash merge ensures this) |
| **Merge commits** | Zero (squash merge only) |
| **Commit count per PR** | One (squash) |
| **Commit author** | The developer who squash-merges |
| **Commit date** | The squash-merge date |
| **Commit message** | PR title (following convention) |
| **Co-authors** | Include `Co-authored-by:` footer if pair programming or AI assistance was used |

---

## 7. Pull Request Standards

### 7.1 PR Template

Every PR must use the pull request template defined in `.github/pull_request_template.md`. The template enforces a checklist that maps to CSD and UI/UX standards.

```markdown
<!-- .github/pull_request_template.md -->

## Summary

<!-- One-to-three sentence description of what this PR changes and why. -->

## Build Phase

<!-- Which UI/UX build phase does this PR belong to? -->
<!-- Phase 0: Scaffold | Phase 1: Backend | Phase 2: UI Shell | Phase 3: Generation | Phase 4: Asset Library | Phase 5: Polish -->

Phase: [ ]

## Feature ID(s)

<!-- Which FRD feature IDs does this PR implement? -->
<!-- Example: FR-GEN-01, FR-GEN-02 -->

FR: [ ]

## Checklist

### TypeScript / React
- [ ] No `any` types (CSD TYP-01)
- [ ] No non-null assertions without justification (CSD TYP-03)
- [ ] All exported functions have explicit return types (CSD TYP-05)
- [ ] Components are function declarations with named exports (CSD RCT-01, RCT-02)
- [ ] Props interface is named and exported (CSD RCT-03, CMP-01)
- [ ] No component exceeds 200 lines (CSD RCT-08, CMP-07)
- [ ] No direct `@tauri-apps/api/core` imports outside `lib/tauri.ts` (CSD RCT-10, CTR-07)
- [ ] Zustand selectors use function form (CSD HOK-08, RND-05)
- [ ] TanStack Query keys are stable (CSD HOK-09, RND-06)
- [ ] `useEffect` has dependency array and cleanup (CSD HOK-04, HOK-05)
- [ ] No `console.log` in production code (CSD VAR-08)
- [ ] `cn()` used for class merging (CSD STY-08)
- [ ] No raw hex colors in className (CSD STY-01, TKN-01)
- [ ] No `dark:` prefix (CSD DRK-01)
- [ ] List items have stable keys (CSD RND-02)
- [ ] Accessibility: labels, aria-labels, focus-visible (UI/UX KBD-03, SEM-02, SEM-03)

### Rust
- [ ] No `unwrap()` or `expect()` in non-test code (CSD RST-01)
- [ ] All errors use `?` operator or explicit match (CSD RST-01)
- [ ] Error enum derives `thiserror::Error` (CSD RST-12)
- [ ] All public items have doc comments (CSD RST-06)
- [ ] All IPC structs derive `Serialize`/`Deserialize` with `rename_all = "camelCase"` (CSD RST-08)
- [ ] All SQL queries use `params![]` (CSD VAL-06)
- [ ] No `unsafe` code (CSD RST-09)
- [ ] Database access via `Database` struct only (CSD RST-15)
- [ ] Command inputs validated before API call (CSD IPC-04, VAL-01)
- [ ] No API key in log statements (CSD SEC-04)

### Testing
- [ ] New components have test files (CSD TST co-location)
- [ ] New Tauri commands have Rust tests
- [ ] Tests follow naming convention (CSD TST-01, TST-02)
- [ ] No snapshot tests (CSD TST-08)
- [ ] Coverage thresholds met

### Security
- [ ] API key not exposed to frontend (CSD SEC-02, CTR-03)
- [ ] No secrets in log statements (CSD SEC-04, SEC-06)
- [ ] Error messages sanitized (CSD SAN-01, SAN-03, SAN-04)

### Performance
- [ ] 3D Canvas uses `frameloop="demand"` (CSD PRF-01) — if applicable
- [ ] `useGLTF.clear()` on unmount (CSD PRF-03) — if applicable
- [ ] No synchronous heavy computation in `useEffect` (CSD PRF-07)
- [ ] File downloads stream to disk (CSD BPR-04) — if applicable

### Dependencies
- [ ] No new dependency added without justification (CSD PR-06)
- [ ] Lock files updated if dependencies changed (CSD GIT-07)

### IPC Contract
- [ ] If IPC contract changed: `meshy-types.ts` updated on both sides (CSD PR-05)

### Technical Debt
- [ ] If technical debt introduced: `tech-debt` issue created (CSD DEBT-01)
- [ ] No more than 2 new tech-debt items (CSD DEBT-04)

## Testing

<!-- How did you test this change? What commands did you run? -->

## Screenshots / Recordings

<!-- If UI changes were made, include before/after screenshots or screen recordings. -->

## Related Issues

<!-- Link to issues this PR closes or references. -->
<!-- Example: Closes #42, Refs #17 -->
```

### 7.2 PR Rules

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **PR-01** | Every PR must have a description explaining the change and linking to the relevant build phase and feature IDs. | Traceability | CSD PR-01, FRD §4 |
| **PR-02** | Every PR must pass all CI checks before merge. | CI is the gate | CSD PR-02, UI/UX §13.1 |
| **PR-03** | PRs that add new Tauri commands must include Rust tests for those commands. | Test coverage | CSD PR-03 |
| **PR-04** | PRs that add new React components must include component tests. | Test coverage | CSD PR-04 |
| **PR-05** | PRs that modify the IPC contract (`lib/tauri.ts` or `commands/*.rs`) must update `meshy-types.ts` on both sides. | Type safety | CSD PR-05 |
| **PR-06** | No PR may introduce a new dependency without justification in the PR description. | Dependency scrutiny | CSD PR-06 |
| **PR-07** | PRs are squash-merged. The squash commit message follows the commit convention. | Clean history | CSD PR-07, MRG-01 |
| **PR-08** | All checklist items in the PR template must be checked or explicitly marked as N/A with justification. | Due diligence | — |
| **PR-09** | PRs that introduce UI changes must include screenshots or screen recordings in the PR description. | Visual verification | — |
| **PR-10** | PRs must reference the feature ID(s) they implement from the FRD. | Feature traceability | FRD §4 |
| **PR-11** | No PR may exceed 500 lines of diff (excluding lock files and generated files). If it does, split into smaller PRs. | Reviewability | — |
| **PR-12** | No PR may touch more than 3 build phases. If it does, split into smaller PRs. | Phase isolation | UI/UX §12 |
| **PR-13** | PRs that modify design documents (TDD, TSS, UI/UX, CSD, FRD, GREB) must bump the document version and add a changelog entry at the top. | Document versioning | CSD DOC-10 |
| **PR-14** | PRs are opened against `main` only. No PRs against feature branches. | Simplicity | BRN-07 |

### 7.3 PR Size Guidelines

| Diff Size (excluding locks/generated) | Action |
|---|---|
| ≤ 100 lines | Ideal. Quick to review. |
| 101–300 lines | Acceptable. Standard PR size. |
| 301–500 lines | Maximum. Consider splitting. |
| > 500 lines | **Blocked.** Must split into smaller PRs. (PR-11) |

---

## 8. Issue Tracking and Labeling

### 8.1 Issue Types

MeshyForge uses GitHub Issues for all tracking. Three issue templates are provided:

| Template | File | Purpose |
|---|---|---|
| **Feature** | `.github/ISSUE_TEMPLATE/feature.yml` | New feature implementation (maps to FRD feature) |
| **Bug** | `.github/ISSUE_TEMPLATE/bug.yml` | Bug report |
| **Tech Debt** | `.github/ISSUE_TEMPLATE/tech-debt.yml` | Technical debt item (CSD §17) |

Blank issues are disabled (`config.yml` sets `blank_issues_enabled: false`).

### 8.2 Feature Issue Template

```yaml
# .github/ISSUE_TEMPLATE/feature.yml
name: Feature
description: Implement a feature from the FRD
labels: ["feature"]
body:
  - type: input
    id: feature-id
    attributes:
      label: Feature ID
      description: The FRD feature ID (e.g., FR-GEN-01)
      placeholder: FR-GEN-01
    validations:
      required: true
  - type: input
    id: phase
    attributes:
      label: Build Phase
      description: Which UI/UX build phase does this feature belong to?
      placeholder: "Phase 3"
    validations:
      required: true
  - type: input
    id: priority
    attributes:
      label: Priority
      description: Must Have, Should Have, Could Have, or Won't Have
      placeholder: "Must Have"
    validations:
      required: true
  - type: textarea
    id: description
    attributes:
      label: Description
      description: Copy the feature description from the FRD.
    validations:
      required: true
  - type: textarea
    id: acceptance-criteria
    attributes:
      label: Acceptance Criteria
      description: Copy the acceptance criteria from the FRD.
      render: markdown
    validations:
      required: true
  - type: textarea
    id: dependencies
    attributes:
      label: Dependencies
      description: List the feature IDs this feature depends on (from FRD §6).
      render: markdown
  - type: textarea
    id: source-alignment
    attributes:
      label: Source Alignment
      description: List the TDD, TSS, UI/UX, and CSD sections this feature references.
      render: markdown
```

### 8.3 Bug Issue Template

```yaml
# .github/ISSUE_TEMPLATE/bug.yml
name: Bug
description: Report a bug
labels: ["bug"]
body:
  - type: textarea
    id: description
    attributes:
      label: Bug Description
      description: Clear description of the bug.
    validations:
      required: true
  - type: dropdown
    id: platform
    attributes:
      label: Platform
      options:
        - macOS (Apple Silicon)
        - macOS (Intel)
        - Windows
        - Linux
        - All platforms
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      description: Exact steps to reproduce the behavior.
      render: markdown
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What you expected to happen.
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: Actual Behavior
      description: What actually happened.
    validations:
      required: true
  - type: textarea
    id: logs
    attributes:
      label: Error Logs / Screenshots
      description: Paste any error messages, logs, or screenshots.
      render: shell
  - type: input
    id: app-version
    attributes:
      label: App Version
      placeholder: "1.0.0"
    validations:
      required: true
```

### 8.4 Tech Debt Issue Template

```yaml
# .github/ISSUE_TEMPLATE/tech-debt.yml
name: Technical Debt
description: Track deferred work or known technical debt
labels: ["tech-debt"]
body:
  - type: input
    id: td-id
    attributes:
      label: Tech Debt ID
      description: The TD ID from CSD §17.2 (e.g., TD-01) or "NEW" if not yet registered.
      placeholder: "TD-01"
    validations:
      required: true
  - type: textarea
    id: title
    attributes:
      label: Title
      description: Short description of the deferred work.
    validations:
      required: true
  - type: textarea
    id: description
    attributes:
      label: Description
      description: What was deferred and why.
    validations:
      required: true
  - type: dropdown
    id: impact
    attributes:
      label: Impact
      description: What happens if this is not addressed.
      options:
        - Low — cosmetic or minor inconvenience
        - Medium — degraded experience or maintainability risk
        - High — security, performance, or correctness risk
    validations:
      required: true
  - type: dropdown
    id: effort
    attributes:
      label: Effort
      options:
        - S — Small (≤ 2 hours)
        - M — Medium (≤ 1 day)
        - L — Large (multiple days)
    validations:
      required: true
  - type: input
    id: phase
    attributes:
      label: Phase Introduced
      description: Which build phase introduced this debt?
      placeholder: "Phase 5"
    validations:
      required: true
```

### 8.5 Label Taxonomy

| Label | Color | Purpose | Source |
|---|---|---|---|
| `feature` | `#a2eeef` (light blue) | Feature implementation from FRD | FRD §4 |
| `bug` | `#d73a4a` (red) | Bug report | — |
| `tech-debt` | `#fbca04` (yellow) | Technical debt item | CSD §17 |
| `phase-0` | `#bfd4f2` (pale blue) | Phase 0: Scaffold | UI/UX §12 |
| `phase-1` | `#bfd4f2` | Phase 1: Backend | UI/UX §12 |
| `phase-2` | `#bfd4f2` | Phase 2: UI Shell | UI/UX §12 |
| `phase-3` | `#bfd4f2` | Phase 3: Generation | UI/UX §12 |
| `phase-4` | `#bfd4f2` | Phase 4: Asset Library | UI/UX §12 |
| `phase-5` | `#bfd4f2` | Phase 5: Polish | UI/UX §12 |
| `priority-must` | `#b60205` (dark red) | Must Have priority | FRD §1.3 |
| `priority-should` | `#d93f0b` (orange) | Should Have priority | FRD §1.3 |
| `priority-could` | `#fbca04` (yellow) | Could Have priority | FRD §1.3 |
| `blocked` | `#5319e7` (purple) | Blocked by another issue or external dependency | — |
| `good-first-issue` | `#7057ff` (purple) | Good for new contributors | — |
| `help-wanted` | `#008672` (green) | Additional help needed | — |
| `wontfix` | `#ffffff` (white) | Decided not to fix | — |
| `duplicate` | `#cfd3d7` (gray) | Duplicate of another issue | — |
| `invalid` | `#cfd3d7` (gray) | Invalid issue | — |

### 8.6 Issue Rules

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **ISU-01** | Every feature from the FRD must have a corresponding GitHub issue with the `feature` label and the feature ID in the title. | Feature traceability | FRD §4 |
| **ISU-02** | Every issue must be assigned to a milestone corresponding to its build phase. | Phase tracking | §9 |
| **ISU-03** | Every issue must have a priority label (`priority-must`, `priority-should`, `priority-could`). | Priority tracking | FRD §1.3 |
| **ISU-04** | Issues are closed when the corresponding PR is merged. The PR must include `Closes #{issue-number}` in the description or squash message. | Automatic closure | — |
| **ISU-05** | No issue may be closed without a merged PR or an explicit decision (with `wontfix` label and justification comment). | Audit trail | — |
| **ISU-06** | Bug issues must include platform, steps to reproduce, expected vs. actual behavior, and app version. | Reproducibility | §8.3 |
| **ISU-07** | Tech debt issues must include TD ID, impact, effort, and phase introduced. | Debt tracking | CSD §17.1, §8.4 |
| **ISU-08** | No blank issues. All issues must use one of the three templates. | Consistency | §8.1 |
| **ISU-09** | Issues that are blocked by another issue must have the `blocked` label and reference the blocking issue. | Dependency tracking | — |
| **ISU-10** | Duplicate issues must be marked with the `duplicate` label and a comment linking to the original issue. | De-duplication | — |

---

## 9. Milestone and Project Board Management

### 9.1 Milestone Structure

Milestones correspond to UI/UX build phases. Each milestone has a defined set of features from the FRD.

| Milestone | UI/UX Phase | Features | Due Date | Source |
|---|---|---|---|---|
| `Phase 0: Scaffold` | §12.2 | FR-INF-01, FR-INF-02, FR-INF-08 | Flexible | UI/UX §12.2 |
| `Phase 1: Backend` | §12.3 | FR-INF-03–07 | After Phase 0 quality gate | UI/UX §12.3 |
| `Phase 2: UI Shell` | §12.4 | FR-KEY-01–04, FR-SET-01–04, FR-NOTIF-02 | After Phase 1 quality gate | UI/UX §12.4 |
| `Phase 3: Generation` | §12.5 | FR-GEN-01–07, FR-POST-01–07, FR-IMG-01–02, FR-PRINT-01–03, FR-CLAB-01–07, FR-TASK-01–07, FR-NOTIF-01, FR-NOTIF-03 | After Phase 2 quality gate | UI/UX §12.5 |
| `Phase 4: Asset Library` | §12.6 | FR-GAL-01–10, FR-PREV-01–04, FR-TAG-01–04, FR-EXP-01–05 | After Phase 3 quality gate | UI/UX §12.6 |
| `Phase 5: Polish` | §12.7 | FR-SET-05 | After Phase 4 quality gate | UI/UX §12.7 |
| `v1.0.0 Release` | — | All 72 Must Have features | After Phase 5 quality gate | FRD §9 |

### 9.2 Milestone Rules

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **MLS-01** | Each milestone corresponds to exactly one UI/UX build phase. | Phase alignment | UI/UX §12 |
| **MLS-02** | A milestone may not be closed until its quality gate (UI/UX §12.2–12.7) has passed. | Quality enforcement | UI/UX §12 |
| **MLS-03** | A milestone may not be started until the previous milestone is closed. | Sequential phases | UI/UX §12.1 |
| **MLS-04** | Every issue must be assigned to a milestone. No milestone-less issues. | Phase tracking | ISU-02 |
| **MLS-05** | The `v1.0.0 Release` milestone is closed when all 72 Must Have features are implemented and all quality gates pass. | MVP completion | FRD §9 |
| **MLS-06** | Milestone due dates are flexible (personal project) but should be set to maintain momentum. | Self-accountability | — |

### 9.3 Project Board

| Property | Value |
|---|---|
| **Board name** | MeshyForge MVP |
| **Columns** | Backlog → In Progress → In Review → Done |
| **Automation** | Issues automatically move to "In Progress" when assigned; to "In Review" when a PR is linked; to "Done" when closed. |
| **View** | Grouped by milestone |

### 9.4 Project Board Rules

| Rule ID | Rule |
|---|---|
| **PRJ-01** | Every open issue must appear on the project board. |
| **PRJ-02** | No more than 3 issues in "In Progress" at a time. |
| **PRJ-03** | Issues in "In Review" must have a linked PR. |
| **PRJ-04** | The board is reviewed at the end of each milestone. |

---

## 10. Release Management

### 10.1 Versioning

MeshyForge follows Semantic Versioning (SemVer):

```
v{MAJOR}.{MINOR}.{PATCH}

MAJOR — Breaking changes (incompatible API changes)
MINOR — New features (backward-compatible)
PATCH — Bug fixes (backward-compatible)
```

| Rule ID | Rule | Rationale |
|---|---|---|
| **REL-01** | Tags follow `v{major}.{minor}.{patch}` format: `v1.0.0`, `v1.1.0`, `v1.0.1`. | SemVer | CSD GIT-06 |
| **REL-02** | Pre-release versions use `-` suffix: `v1.1.0-beta`, `v1.1.0-rc.1`. | SemVer pre-release | — |
| **REL-03** | The `package.json` version and `Cargo.toml` version must match the tag version. | Consistency | — |
| **REL-04** | The `tauri.conf.json` version must match the tag version. | Tauri build embeds version | TSS §2.3 |
| **REL-05** | No tag may be created without a passing CI run on the commit being tagged. | Release quality | — |

### 10.2 Release Process

```
1. All Must Have features for the milestone are implemented and merged.
2. All quality gates pass (automated + manual).
3. Update version numbers in package.json, Cargo.toml, tauri.conf.json.
4. Update docs/CHANGELOG.md with release notes.
5. Commit version bump: `chore(release): bump version to v1.0.0`.
6. Push the commit and wait for CI to pass.
7. Create and push tag: `git tag v1.0.0 && git push origin v1.0.0`.
8. Release workflow (release.yml) triggers automatically.
9. Verify installers are built and attached to the GitHub Release.
10. Publish the GitHub Release with auto-generated release notes.
```

### 10.3 Release Workflow Expectations

| Property | Expectation | Source |
|---|---|---|
| **Trigger** | Tag push matching `v*` | TSS §16.3 |
| **Build matrix** | macOS arm64, macOS x86_64, Windows x64, Linux x64 | TSS §20.1 |
| **Artifacts** | DMG (macOS), MSI (Windows), DEB + AppImage (Linux) | TSS §16.3 |
| **Release creation** | `softprops/action-gh-release@v2` with `generate_release_notes: true` | TSS §16.3 |
| **Release notes** | Auto-generated from commit history + manual additions in CHANGELOG.md | — |

### 10.4 Changelog Format

`docs/CHANGELOG.md` follows the [Keep a Changelog](https://keepachangelog.com/) format (CSD DOC-09):

```markdown
# Changelog

## [Unreleased]

## [1.0.0] - 2025-XX-XX

### Added
- Text to 3D generation (preview + refine) with full parameter controls
- Image to 3D generation with drag-and-drop image upload
- Multi-Image to 3D generation (1-4 images)
- Post-processing: remesh, retexture, convert, resize, UV unwrap, rigging, animation
- 2D image generation: text-to-image, image-to-image
- 3D printing: multi-color print, analyze printability, repair printability
- Creative Lab: keychain, fridge magnet, figure, vinyl figure, brick figure, lamp, keycap
- Task monitor with real-time progress, polling, and SSE streaming
- Asset gallery with thumbnail grid, search, tag filtering, and sort
- 3D model preview with orbit controls and studio lighting
- Asset tagging, notes, and metadata management
- Single and batch export with format selection
- API key management with OS keychain storage
- Credit balance display with auto-refresh
- OS notifications on task completion
- User preferences with persistent storage
- Cross-platform support: macOS, Windows, Linux

### Known Technical Debt
- Dark theme only (no light mode) — see TD-01
- No auto-update mechanism — see TD-02
- No internationalization — see TD-03
```

### 10.5 Release Artifact Verification

| Check | Method |
|---|---|
| DMG opens and app launches on macOS | Manual test on both arm64 and x86_64 |
| MSI installs and app launches on Windows | Manual test on Windows 10/11 |
| DEB installs and app launches on Linux | Manual test on Ubuntu 22.04 |
| AppImage runs on Linux | Manual test on Ubuntu 22.04 |
| App version in About panel matches tag | Manual verification |
| No crash on first launch with no API key | Manual test |
| API key entry and validation works | Manual test |

---

## 11. CI/CD Pipeline Expectations

### 11.1 Workflow Files

| File | Trigger | Purpose | Source |
|---|---|---|---|
| `.github/workflows/ci.yml` | Push to `main`, all PRs | Lint, type-check, test, build smoke test | TSS §16.2 |
| `.github/workflows/release.yml` | Tag push matching `v*` | Build installers for 4 targets, create GitHub Release | TSS §16.3 |
| `.github/workflows/audit.yml` | Weekly schedule (Monday 09:00 UTC) | `npm audit` + `cargo audit` for vulnerabilities | TSS §16.4 |

### 11.2 CI Workflow Jobs

| Job | Runner | Steps | Required? |
|---||---|---|
| `frontend-checks` | ubuntu-latest | npm ci → biome check → tsc --noEmit | ✅ Yes |
| `frontend-tests` | ubuntu-latest | npm ci → vitest --coverage | ✅ Yes |
| `rust-checks` | ubuntu-latest, windows-latest, macos-latest (matrix) | cargo fmt --check → cargo clippy → cargo test | ✅ Yes |
| `build-smoke` | ubuntu-latest, macos-latest, windows-latest (matrix) | npm ci → tauri build | ✅ Yes |

### 11.3 Required Status Checks

The following status checks must pass before a PR can be merged (branch protection required checks):

| Check Name | Blocks Merge? |
|---|---|
| `frontend-checks` | ✅ Yes |
| `frontend-tests` | ✅ Yes |
| `rust-checks (ubuntu-latest)` | ✅ Yes |
| `rust-checks (windows-latest)` | ✅ Yes |
| `rust-checks (macos-latest)` | ✅ Yes |
| `build-smoke (ubuntu-latest)` | ✅ Yes |
| `build-smoke (macos-latest)` | ✅ Yes |
| `build-smoke (windows-latest)` | ✅ Yes |

### 11.4 CI Rules

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **CI-01** | CI must run on every push to `main` and every pull request. Feature branches are validated through PR-triggered CI, not push triggers. | Catch issues early | TSS §16.2 |
| **CI-02** | CI must run on all three platforms (ubuntu, windows, macos) for Rust checks and build smoke tests. | Cross-platform correctness | TSS §20.1 |
| **CI-03** | CI must use `Swatinem/rust-cache@v2` for Rust build caching. | Build speed | TSS §16.2 |
| **CI-04** | CI must use `actions/setup-node@v4` with `cache: 'npm'` for npm caching. | Build speed | TSS §16.2 |
| **CI-05** | No CI job may exceed 15 minutes. If it does, optimize caching or split the job. | CI responsiveness | — |
| **CI-06** | CI must not use `continue-on-error: true` on required status checks. | Enforce quality | — |
| **CI-07** | The audit workflow uses `continue-on-error: true` — it reports but does not block. | Warning-only | TSS §16.4 |
| **CI-08** | No secrets are passed to CI jobs that don't need them. | Least privilege | §12 |
| **CI-09** | CI workflows must be pinned to specific action versions (e.g., `actions/checkout@v4`, not `@main`). | Supply chain security | — |
| **CI-10** | No workflow may check out code with `fetch-depth: 0` unless full history is needed (release workflow). | CI speed | — |

### 11.5 Release Workflow Rules

| Rule ID | Rule | Rationale |
|---|---|---|
| **REL-CI-01** | Release workflow triggers only on tags matching `v*`. | Prevent accidental releases |
| **REL-CI-02** | Release workflow uses `fail-fast: false` so one platform failure doesn't cancel others. | Maximize build success |
| **REL-CI-03** | Linux build job must install system dependencies (`libwebkit2gtk-4.1-dev`, etc.) per TSS §20.3. | Tauri Linux build requirement |
| **REL-CI-04** | Release artifacts are uploaded via `actions/upload-artifact@v4` and then downloaded for the release job. | Artifact pipeline |
| **REL-CI-05** | GitHub Release is created via `softprops/action-gh-release@v2` with `generate_release_notes: true`. | Auto-generated notes |
| **REL-CI-06** | Release workflow must not run if CI on the tagged commit has not passed. | Release quality |

---

## 12. Repository Secrets and Security

### 12.1 Secrets Management

MeshyForge does not require any GitHub repository secrets for the MVP. The CI/CD pipeline does not use API keys, deployment credentials, or signing certificates.

| Rule ID | Rule | Rationale |
|---|---|---|
| **SEC-REP-01** | No GitHub repository secrets are configured for the MVP. | No deployment, no signing, no API keys in CI |
| **SEC-REP-02** | If secrets are added post-MVP (e.g., for code signing), they must be scoped to the minimum required workflows. | Least privilege |
| **SEC-REP-03** | No secret values may appear in workflow files, issue comments, PR descriptions, or commit messages. | Secret hygiene |
| **SEC-REP-04** | The repository must have GitHub's secret scanning enabled (automatic for public repos). | Detect leaked secrets |
| **SEC-REP-05** | The repository must have GitHub's dependency alerts enabled. | Vulnerability notifications |
| **SEC-REP-06** | If a secret is accidentally committed, the commit must be force-pushed away immediately, the secret must be rotated, and a post-mortem issue must be created. | Incident response |

### 12.2 Security Scanning

| Scan Type | Tool | Frequency | Blocks Merge? |
|---|---|---|---|
| **Secret scanning** | GitHub built-in (automatic for public repos) | Every push | No (alert only) |
| **Dependency alerts** | GitHub Dependabot alerts | Continuous | No (alert only) |
| **Dependency audit** | `npm audit` + `cargo audit` (audit.yml) | Weekly | No (alert only) |
| **Code scanning** | Not configured for MVP (no CodeQL) | — | — |

### 12.3 Code Signing

| Platform | Code Signing | MVP Status |
|---|---|---|
| **macOS** | Not signed (no Apple Developer certificate) | User must right-click → Open on first launch |
| **Windows** | Not signed (no EV certificate) | SmartScreen warning on first launch |
| **Linux** | N/A (no signing for DEB/AppImage) | — |

Code signing is deferred to post-MVP (CSD TD-02).

---

## 13. Dependency Management

### 13.1 Dependency Rules

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **DEP-01** | All npm dependencies must use caret ranges (`^`) in `package.json`. Exceptions: `three` (exact pin). | TSS §19.2 | TSS §19.1 |
| **DEP-02** | All Rust dependencies must use caret ranges (`^`) in `Cargo.toml`. | TSS §19.2 | TSS §19.1 |
| **DEP-03** | `package-lock.json` and `Cargo.lock` must be committed to the repository. | Reproducible builds | CSD GIT-07 |
| **DEP-04** | No new dependency may be added without justification in the PR description. | Dependency scrutiny | CSD PR-06 |
| **DEP-05** | No dependency may be added that has fewer than 1,000 weekly npm downloads or fewer than 100 crates.io downloads, unless justified. | Supply chain risk | — |
| **DEP-06** | No dependency may be added with a license other than MIT, Apache-2.0, ISC, or BSD. | License compatibility | — |
| **DEP-07** | Dependencies are reviewed monthly for updates. Patch updates are applied via PR. Minor updates require testing. Major updates require a dedicated migration branch. | TSS §19.3 | TSS §19.3 |
| **DEP-08** | Unused dependencies must be removed. Run `npx depcheck` (npm) and `cargo udeps` (Rust) periodically. | Keep deps minimal | — |
| **DEP-09** | No dependency may introduce a transitive dependency with a known critical vulnerability (CVSS ≥ 7.0). | Security | — |
| **DEP-10** | The `three` package is pinned to an exact version (`"0.170.0"`) because Three.js uses `0.x` versioning where minor versions can break. | TSS §19.2 | TSS §19.1 |

### 13.2 Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  # npm dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "monthly"
    open-pull-requests-limit: 5
    labels:
      - "deps"
    commit-message:
      prefix: "chore(deps)"
    groups:
      # Group minor/patch updates together
      minor-and-patch:
        update-types:
          - "minor"
          - "patch"

  # Cargo dependencies
  - package-ecosystem: "cargo"
    directory: "/src-tauri"
    schedule:
      interval: "monthly"
    open-pull-requests-limit: 5
    labels:
      - "deps"
    commit-message:
      prefix: "chore(deps)"
    groups:
      minor-and-patch:
        update-types:
          - "minor"
          - "patch"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
    labels:
      - "deps"
    commit-message:
      prefix: "chore(ci)"
```

### 13.3 Dependabot Rules

| Rule ID | Rule | Rationale |
|---|---|---|
| **DBT-01** | Dependabot PRs are treated like any other PR: CI must pass, checklist must be completed. | No special treatment |
| **DBT-02** | Dependabot PRs for major version updates must be tested manually before merge. | Major versions may break |
| **DBT-03** | Dependabot PRs for `three` must be treated as major updates (manual testing required) even if they are minor version bumps. | Three.js `0.x` versioning |
| **DBT-04** | Dependabot is limited to 5 open PRs per ecosystem to avoid noise. | Focus |
| **DBT-05** | Dependabot runs monthly (not weekly) to reduce PR volume. | Focus |
| **DBT-06** | Minor and patch updates are grouped into a single PR per ecosystem. | Reduce PR count |

---

## 14. Documentation in Repository

### 14.1 Documentation Files

| File | Location | Purpose | Required | Source |
|---|---|---|---|---|
| `README.md` | Root | Project overview, setup, usage | ✅ | CSD DOC-07 |
| `LICENSE` | Root | MIT license text | ✅ | REP-01 |
| `docs/TDD.md` | `docs/` | Technical Design Document | ✅ | REP-06 |
| `docs/TSS.md` | `docs/` | Tech Stack Specification | ✅ | REP-06 |
| `docs/UI-UX-Guardrails.md` | `docs/` | UI/UX Guardrails and Build Document | ✅ | REP-06 |
| `docs/CSD.md` | `docs/` | Coding Standards Document | ✅ | REP-06 |
| `docs/FRD.md` | `docs/` | Feature Requirements Document | ✅ | REP-06 |
| `docs/GREB.md` | `docs/` | GitHub Repository Expectations and Behaviors (this document) | ✅ | REP-06 |
| `docs/CONTRIBUTING.md` | `docs/` | Contributor guide | ✅ | CSD DOC-08 |
| `docs/CHANGELOG.md` | `docs/` | Release changelog | ✅ | CSD DOC-09 |
| `docs/API_REFERENCE.md` | `docs/` | Meshy API endpoint summary | ✅ | TDD §17 |
| `.github/pull_request_template.md` | `.github/` | PR template with checklist | ✅ | §7.1 |
| `.github/ISSUE_TEMPLATE/*.yml` | `.github/ISSUE_TEMPLATE/` | Issue templates | ✅ | §8.1 |
| `.github/CODEOWNERS` | `.github/` | Code ownership rules | ✅ | §15.3 |
| `.github/dependabot.yml` | `.github/` | Dependabot configuration | ✅ | §13.2 |

### 14.2 README.md Required Sections

`README.md` must contain the following sections in order:

```markdown
# MeshyForge

> One-line description.

## Screenshot

<!-- Screenshot of the app -->

## Features

<!-- Bullet list of key features -->

## Prerequisites

<!-- Node.js 22+, Rust 1.75+, platform-specific deps -->

## Setup

<!-- Clone, npm install, npm run tauri dev -->

## Build

<!-- npm run tauri build -->

## Download

<!-- Links to latest release installers -->

## Documentation

<!-- Links to docs/ files -->

## Tech Stack

<!-- Brief summary with link to TSS -->

## License

MIT
```

### 14.3 Documentation Rules

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **DOC-REP-01** | All design documents (TDD, TSS, UI/UX, CSD, FRD, GREB) must be committed to `docs/` and kept in sync with the codebase. | Single source of truth | REP-06 |
| **DOC-REP-02** | Design documents are versioned. Changes require a version bump and changelog entry at the top of the document. | Document traceability | CSD DOC-10 |
| **DOC-REP-03** | `README.md` must be updated when: new features are added, setup instructions change, or download links change. | Onboarding accuracy | CSD DOC-07 |
| **DOC-REP-04** | `docs/CONTRIBUTING.md` must include: development setup, code conventions summary, testing instructions, PR process, and link to CSD. | Onboarding | CSD DOC-08 |
| **DOC-REP-05** | `docs/CHANGELOG.md` must be updated for every release with the format defined in §10.4. | Release history | CSD DOC-09 |
| **DOC-REP-06** | No documentation file may exceed 2000 lines. If it does, split it. | Readability | — |
| **DOC-REP-07** | Documentation is written in Markdown. No other format (reStructuredText, AsciiDoc, etc.). | Consistency | — |
| **DOC-REP-08** | Screenshots in documentation are stored in `docs/images/` and referenced via relative paths. | Asset management | — |
| **DOC-REP-09** | No documentation references external URLs that require authentication (e.g., private Notion, Google Docs). All documentation is in-repo. | Self-contained | — |
| **DOC-REP-10** | The README must link to all 6 design documents in `docs/`. | Discoverability | — |

### 14.4 CODEOWNERS

```
# .github/CODEOWNERS
# Each line defines who owns a specific path.
# For a solo project, the owner is the repository creator.

* @<github-username>

# More specific rules can be added as the project grows:
# /src-tauri/ @<github-username>
# /src/ @<github-username>
# /docs/ @<github-username>
# /.github/ @<github-username>
```

---

## 15. Code Review Process

### 15.1 Review Workflow

```
1. Author creates a feature branch.
2. Author implements the feature, writes tests, runs local checks.
3. Author opens a PR against `main`.
4. CI runs automatically (all required status checks).
5. Author self-reviews the diff using the CSD §15.1 checklist.
6. If CI fails, author fixes and pushes again.
7. If CI passes, author reviews the PR for:
   a. All checklist items checked or marked N/A.
   b. Screenshots/recordings attached (if UI changes).
   c. Feature ID(s) referenced.
   d. Build phase identified.
   e. Related issues linked.
8. Author squash-merges the PR.
9. Head branch is automatically deleted.
10. Related issues are automatically closed.
```

### 15.2 Self-Review Checklist

The self-review must verify all items from the PR template (§7.1). The author must go through every item and either check it or mark it as N/A with a justification comment.

### 15.3 Code Review Rules

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **REV-01** | Self-review is mandatory before squash-merge. The author must read through their own diff. | Due diligence | — |
| **REV-02** | The full CSD §15.1 checklist (46 items) must be referenced during self-review. The PR template contains a condensed version. | Comprehensive review | CSD §15.1 |
| **REV-03** | For a solo project, external review is not required. CI is the primary gate. | Solo developer | — |
| **REV-04** | If a second reviewer is available (e.g., community contributor), at least 1 approval is required before merge. | Quality | — |
| **REV-05** | Review comments must be constructive and reference specific CSD, UI/UX, or FRD sections. | Actionable feedback | — |
| **REV-06** | All conversation threads must be resolved before merge (branch protection: "Require conversation resolution"). | No unresolved feedback | §3.2 |
| **REV-07** | No review comment may be dismissed without a response. If the author disagrees, they must explain why. | Audit trail | — |
| **REV-08** | For PRs that touch the IPC contract (lib/tauri.ts or commands/*.rs), the author must verify that `meshy-types.ts` is updated on both sides. | Type safety | CSD PR-05 |
| **REV-09** | For PRs that add new Tauri commands, the author must verify the command is registered in `main.rs`. | Command discoverability | CSD IPC-09 |
| **REV-10** | For PRs in Phase 4 or 5, the author must perform the manual quality gates from UI/UX §13.2 (keyboard nav, screen reader, contrast, reduced motion, memory leak, bundle size, offline, error recovery). | Release readiness | UI/UX §13.2 |

### 15.4 Manual Quality Gate Checklist (Phase 4 and 5 PRs)

The following checklist must be completed and documented in the PR description for any PR that modifies UI components in Phase 4 or 5:

```markdown
## Manual Quality Gates (Phase 4/5 only)

- [ ] Keyboard navigation: Tab through the affected view; every interactive element is reachable; focus is visible
- [ ] Screen reader: VoiceOver/NVDA announces all content; no unlabeled controls; status updates announced
- [ ] Contrast: All text/background pairs in the affected view meet 4.5:1 (normal) or 3:1 (large/UI)
- [ ] Reduced motion: Enable `prefers-reduced-motion: reduce`; all animations are instant; spinners show text
- [ ] Memory leak: Open/close the affected view 20 times; no sustained memory growth in DevTools
- [ ] Bundle size: `npm run build` produces initial load ≤ 300 KB gzipped
- [ ] Offline mode: Disable network; affected view works for local operations; only generation fails gracefully
- [ ] Error recovery: Trigger 402, 401, 429, network error; each shows appropriate toast; retry works; no crashes
```

---

## 16. Technical Debt Tracking

### 16.1 Technical Debt in GitHub Issues

All technical debt is tracked via GitHub Issues with the `tech-debt` label (CSD §17.1). The `tech-debt` label is the single source of truth.

### 16.2 Technical Debt Rules

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **TD-REP-01** | Every PR that introduces technical debt must create a `tech-debt` issue with the debt details using the tech-debt issue template (§8.4). | Tracking | CSD DEBT-01 |
| **TD-REP-02** | Every PR that resolves technical debt must close the corresponding `tech-debt` issue and reference it in the PR description. | Closure tracking | CSD DEBT-02 |
| **TD-REP-03** | Technical debt issues are reviewed at the end of each milestone (build phase). Items older than 2 phases must be addressed or explicitly deferred with a justification comment. | Prevent debt accumulation | CSD DEBT-03 |
| **TD-REP-04** | No PR may introduce more than 2 new `tech-debt` issues without explicit justification in the PR description. | Limit debt per PR | CSD DEBT-04 |
| **TD-REP-05** | The `tech-debt` label in GitHub Issues is the single source of truth. No debt is tracked in spreadsheets, external docs, or memory. | Single source | CSD DEBT-05 |
| **TD-REP-06** | Tech debt issues must include: TD ID, title, description, impact (Low/Medium/High), effort (S/M/L), and phase introduced. | Completeness | §8.4 |
| **TD-REP-07** | Tech debt issues must be assigned to the milestone corresponding to the phase where they were introduced. | Phase tracking | — |
| **TD-REP-08** | At milestone closure, a comment must be added to each open `tech-debt` issue in that milestone, either scheduling it for a future milestone or explicitly deferring it. | Debt review | CSD DEBT-03 |

### 16.3 Known Technical Debt Issues (Pre-Registered)

The following tech debt items from CSD §17.2 must be created as GitHub Issues at repository initialization:

| TD ID | Title | Issue Label | Milestone |
|---|---|---|---|
| TD-01 | Dark theme only | `tech-debt` | Phase 5 |
| TD-02 | No auto-update mechanism | `tech-debt` | Post-MVP |
| TD-03 | No internationalization | `tech-debt` | Post-MVP |
| TD-04 | Prompt preset persistence (may defer) | `tech-debt` | Phase 5 |
| TD-05 | Linux keychain fallback | `tech-debt` | Phase 1 |
| TD-06 | No batch generation queue | `tech-debt` | Post-MVP |
| TD-07 | SSE streaming is opt-in (default is polling) | `tech-debt` | Phase 3 |

---

## 17. GitHub Features Usage

### 17.1 Feature Usage Matrix

| GitHub Feature | Used? | Purpose | Rules |
|---|---|---|---|
| **Issues** | ✅ Yes | Feature tracking, bug reports, tech debt | §8 |
| **Pull Requests** | ✅ Yes | Code changes | §7 |
| **Actions** | ✅ Yes | CI/CD | §11 |
| **Milestones** | ✅ Yes | Build phase tracking | §9 |
| **Projects (Project Boards)** | ✅ Yes | Kanban board for MVP tracking | §9.3 |
| **Labels** | ✅ Yes | Issue categorization | §8.5 |
| **Releases** | ✅ Yes | Versioned releases with installers | §10 |
| **Tags** | ✅ Yes | SemVer tags for releases | §10.1 |
| **Wiki** | ❌ No | All docs in `docs/` directory | DOC-REP-01 |
| **Discussions** | ❌ No | Use issues for all tracking | §3.1 |
| **GitHub Pages** | ❌ No | No website for MVP | §3.1 |
| **Sponsors** | ❌ No | No monetization for MVP | §3.1 |
| **Packages** | ❌ No | No npm/cargo packages published | §3.1 |
| **Code Scanning (CodeQL)** | ❌ No | Not configured for MVP | §12.2 |
| **Secret Scanning** | ✅ Yes (automatic) | Detect leaked secrets | SEC-REP-04 |
| **Dependabot** | ✅ Yes | Dependency update PRs | §13.2 |
| **Dependabot Alerts** | ✅ Yes (automatic) | Vulnerability notifications | SEC-REP-05 |
| **CODEOWNERS** | ✅ Yes | Code ownership (solo developer for MVP) | §14.4 |
| **Branch Protection** | ✅ Yes | Protect `main` | §3.2 |
| **Auto-merge** | ❌ No | Manual squash-merge only | MRG-01 |
| **Draft PRs** | ✅ Yes | Work-in-progress PRs | — |

### 17.2 Draft PR Rules

| Rule ID | Rule |
|---|---|
| **DFT-01** | Draft PRs may be opened to show work in progress. |
| **DFT-02** | Draft PRs do not trigger required status checks (CI may still run but is not blocking). |
| **DFT-03** | A draft PR must be marked "Ready for Review" before it can be merged. |
| **DFT-04** | No draft PR may remain open for more than 7 days. Either mark it ready or close it. |

---

## 18. Repository Health Maintenance

### 18.1 Periodic Maintenance Tasks

| Task | Frequency | Action |
|---|---|---|
| **Dependency audit** | Weekly (automated via `audit.yml`) | Review `npm audit` and `cargo audit` results |
| **Dependabot PRs** | Monthly (automated) | Review and merge or close Dependabot PRs |
| **Stale branch cleanup** | Monthly | Delete branches older than 30 days that are not associated with an open PR |
| **Stale issue review** | Monthly | Review issues with no activity for 30+ days; close or add comment |
| **Tech debt review** | At milestone closure | Review all open `tech-debt` issues; schedule or defer (TD-REP-08) |
| **Unused dependency check** | Quarterly | Run `npx depcheck` and `cargo udeps`; remove unused deps (DEP-08) |
| **CI workflow review** | Quarterly | Verify CI actions are up to date; remove unused workflows |
| **Documentation sync** | At milestone closure | Verify all `docs/` files are up to date with the codebase |

### 18.2 Repository Health Metrics

| Metric | Target | Measurement |
|---|---|---|
| **CI pass rate** | ≥ 95% on `main` | GitHub Insights → Actions |
| **Average PR size** | ≤ 300 lines (excluding locks) | Manual review |
| **Open issue count** | ≤ 20 at any time | GitHub Issues |
| **Open `tech-debt` issues** | ≤ 7 at any time | GitHub Issues with `tech-debt` label |
| **Time from PR open to merge** | ≤ 3 days | Manual observation |
| **Stale branches** | 0 (branches deleted after merge) | GitHub branch list |
| **Dependencies with critical vulnerabilities** | 0 | `npm audit` + `cargo audit` |

### 18.3 Health Rules

| Rule ID | Rule | Rationale |
|---|---|---|
| **HLT-01** | If CI pass rate on `main` drops below 95%, no new features may be merged until CI is fixed. | Maintain green main |
| **HLT-02** | If open issue count exceeds 20, a triage session is required to close or consolidate issues. | Manageable backlog |
| **HLT-03** | If open `tech-debt` issues exceed 7, at least 2 must be resolved before new features are merged. | Debt management |
| **HLT-04** | If a dependency has a critical vulnerability (CVSS ≥ 7.0), a fix PR must be opened within 48 hours. | Security response |
| **HLT-05** | No branch may remain open for more than 7 days without activity. Stale branches are deleted. | Branch hygiene |
| **HLT-06** | The repository must not have any open PRs in "draft" status for more than 7 days. | PR hygiene |

---

## 19. Onboarding and Contributor Expectations

### 19.1 Onboarding Path

A new contributor (or the developer returning after a break) should be able to get the app running by following these steps:

```
1. Read README.md for project overview and setup instructions.
2. Read docs/CONTRIBUTING.md for development conventions.
3. Read docs/TDD.md for system architecture.
4. Read docs/TSS.md for technology choices.
5. Read docs/CSD.md for coding standards.
6. Read docs/FRD.md for feature requirements.
7. Read docs/GREB.md (this document) for repository governance.
8. Clone the repository.
9. Install prerequisites (Node.js 22+, Rust 1.75+, platform deps per TSS §20.3).
10. Run `npm install`.
11. Run `npm run tauri dev`.
12. The app window launches.
```

### 19.2 Contributor Rules

| Rule ID | Rule | Rationale |
|---|---|---|
| **CON-01** | All contributors must follow the CSD coding standards. | Consistency |
| **CON-02** | All contributors must use the PR template and complete the checklist. | Due diligence |
| **CON-03** | All contributors must follow the commit message convention. | Clean history |
| **CON-04** | All contributors must write tests for new code. | Coverage |
| **CON-05** | External contributors (non-owners) must get approval from the repository owner before merge. | Quality control |
| **CON-06** | No contributor may push directly to `main`. All changes go through PR. | Audit trail |
| **CON-07** | No contributor may force-push to `main`. | History protection |
| **CON-08** | No contributor may modify or delete GitHub Actions workflows without owner approval. | CI integrity |
| **CON-09** | No contributor may add or modify repository secrets. | Security |
| **CON-10** | All contributors must respect the design documents (TDD, TSS, UI/UX, CSD, FRD, GREB). Proposed changes to design documents require a PR with version bump and changelog entry. | Document governance |

---

## 20. Enforcement and Audit

### 20.1 Automated Enforcement

| Standard | Tool | Enforcement | Blocks Merge? |
|---|---|---|---|
| Branch protection (no direct push to main) | GitHub branch protection rules | GitHub settings | ✅ Yes |
| Required status checks | GitHub branch protection + CI workflows | CI must pass | ✅ Yes |
| Conversation resolution | GitHub branch protection | All threads resolved | ✅ Yes |
| Squash merge only | GitHub merge settings | Only squash enabled | ✅ Yes |
| Auto-delete branches | GitHub settings | Automatic | — |
| Secret scanning | GitHub built-in | Alert | ❌ No (alert) |
| Dependency alerts | GitHub Dependabot | Alert | ❌ No (alert) |
| Dependabot updates | Dependabot | Auto-creates PRs | ❌ No (PR must be merged manually) |
| `.gitignore` verification | CI check | File exists with required entries | ✅ Yes |
| License file verification | CI check | LICENSE exists | ✅ Yes |
| README verification | CI check | README exists with required headers | ✅ Yes |
| Design document verification | CI check | All 6 docs exist in `docs/` | ✅ Yes |
| Lock file verification | CI check | Lock files exist and are not in .gitignore | ✅ Yes |
| No large files | CI check | No files > 1MB (except icons) | ✅ Yes |
| No symlinks | CI check | No symlinks in repo | ✅ Yes |

### 20.2 Manual Enforcement

| Standard | Method | Frequency |
|---|---|---|
| Commit message convention | Self-review before squash-merge | Every PR |
| PR checklist completion | Self-review of all items | Every PR |
| Manual quality gates (a11y, performance) | Manual testing per UI/UX §13.2 | Phase 4 and 5 PRs |
| Tech debt review | Milestone closure review | End of each milestone |
| Repository health metrics | Manual review of GitHub Insights | Monthly |
| Stale issue/branch cleanup | Manual review | Monthly |
| Documentation sync | Manual review at milestone closure | End of each milestone |

### 20.3 Audit Trail

| Event | Recorded In | Retention |
|---|---|---|
| **Commit to main** | Git history (squash-merge) | Permanent |
| **PR opened/merged/closed** | GitHub PR history | Permanent |
| **Issue opened/closed** | GitHub issue history | Permanent |
| **CI run** | GitHub Actions history | 90 days (GitHub default) |
| **Release created** | GitHub Releases | Permanent |
| **Branch created/deleted** | GitHub branch history | Until deleted |
| **Label created/modified** | GitHub label history | Permanent |
| **Milestone created/closed** | GitHub milestone history | Permanent |
| **Repository setting changed** | GitHub audit log (if enabled) | Varies |
| **Secret scanning alert** | GitHub security tab | Permanent |

### 20.4 Enforcement Summary

| Enforcement Type | Count | Blocks Merge? |
|---|---|---|
| GitHub settings (branch protection, merge rules) | 6 | ✅ Yes |
| CI checks (lint, type-check, test, build) | 8 required status checks | ✅ Yes |
| CI file/structure verification | 6 | ✅ Yes |
| PR template checklist | 35 items | Self-review |
| Manual quality gates (Phase 4/5) | 8 items | Self-review |
| Repository health metrics | 6 targets | Monitoring |
| **Total automated enforcement points** | **20** | — |
| **Total manual enforcement points** | **49** | — |

---
