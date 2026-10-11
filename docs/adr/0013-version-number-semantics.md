# ADR-0013: Version Number Semantics and Single Version Source

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-11 |
| **Deciders** | Repository owner (directed 2026-10-11: "review and adopt standards from applicable options") |
| **Phase** | Phase 5 (Polish & Release) and every release thereafter |
| **Related rules/features** | GREB REL-01–05, §10.1–10.4; CSD GIT-06, DOC-09; GREB DOC-REP-02; `docs/SECURITY.md` §Supported Versions |
| **Supersedes** | None. Narrows GREB §10.1's SemVer definition and suspends REL-02. |

## Context

**Trigger:** GREB §10.1 adopts SemVer but defines MAJOR only as "breaking
changes (incompatible API changes)". MeshyForge is a desktop application with
no public API, so the definition gives no answer for the changes this project
actually makes: SQLite migrations, IPC contract changes, new allowed remote
origins, and Meshy endpoint drift fixes. Without a working definition the
version fields drifted apart, and no release was ever tagged. Satisfies
needs-an-ADR criteria 2 (extends/narrows REL-01–05), 5 (resolves a doc-vs-
build contradiction, see REL-02 below) and 6 (re-litigated on every release).

**Evidence (2026-10-11, `main` @ `16ea987`):**

- **No git tags exist** locally or on `origin`. `release.yml` triggers only on
  `v*` tags, so `1.0.0`, `1.0.1`, `1.0.2` exist as `CHANGELOG.md` headings
  only; no installer was ever produced by the release pipeline.
- **Four version sources, three values:** `package.json` = `1.0.2`;
  `src-tauri/Cargo.toml` (and `Cargo.lock`) = `1.0.0`;
  `src-tauri/tauri.conf.json` = `1.0.0`; `src/lib/constants.ts` `APP_VERSION`
  = `'1.0.0'` (hardcoded, shown in the About panel, and pinned to `1.0.0` by
  `constants.test.ts`). REL-03 and REL-04 are both violated today.
- **Tauri's MSI bundler constrains the version shape.** The WiX bundler
  (`tauri-bundler` `msi/mod.rs`, `convert_version` + `validate_wix_version`)
  requires `major ≤ 255`, `minor ≤ 255`, `patch ≤ 65535`, and rejects any
  pre-release identifier that is not numeric-only ("optional pre-release
  identifier in app version must be numeric-only and cannot be greater than
  65535 for msi target"). A numeric pre-release becomes the MSI's 4th field,
  which Windows Installer ignores when comparing versions for upgrades.
  `tauri.conf.json` `bundle.targets` is `["msi"]`, so this constraint applies
  to every release build.
- `docs/SECURITY.md` already promises fixes to "the current `1.x` release
  line", and `settingsStore` persists with `version: 1`. Both depend on the
  MAJOR digit having a stable meaning.

**Constraints found:**
- GREB §10.1 / REL-01, CSD GIT-06: tags are `v{major}.{minor}.{patch}`.
- GREB REL-02: pre-release tags such as `v1.1.0-beta` and `v1.1.0-rc.1`.
  **Both would fail the MSI build** (non-numeric pre-release identifier).
- GREB REL-03/04: `package.json`, `Cargo.toml`, `tauri.conf.json` must match
  the tag. Not enforced by any check.
- GREB §10.4 / CSD DOC-09: Keep a Changelog format.
- GREB DOC-REP-02: planning docs carry their own document versions.

**Precedent search record:**
- Searched: `semver`, `semantic version`, `calver`, `version bump`,
  `pre-release`, `GIT-06`, `REL-0`, `CARGO_PKG_VERSION`, `APP_VERSION`,
  `getVersion`.
- Searched in: all `docs/*.md` planning docs, `docs/adr/0001`–`0012`,
  `src/`, `src-tauri/src/`, `src-tauri/tauri.conf.json`, `.github/workflows/`.
- Result: SemVer is already adopted (GREB §10.1, CSD GIT-06) without an
  app-specific compatibility definition. No prior ADR touches versioning.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A. SemVer 2.0.0 with an app-specific "public interface" definition** | Keeps REL-01, GIT-06, SECURITY.md `1.x` and existing changelog headings valid; fits the MSI limits (255.255.65535); Cargo and npm both expect SemVer; MAJOR keeps a real meaning (user data continuity) | Needs a written definition (this ADR); no pre-releases while MSI is the only target | Suspends REL-02 |
| B. Calendar versioning (`YYYY.MM.PATCH`) | Communicates release date; common for apps without APIs | `2026` > 255 **fails the MSI build**; breaks REL-01, GIT-06, SECURITY.md's `1.x` line, and Cargo/npm SemVer semantics; says nothing about data compatibility | REL-01, GIT-06, MSI bundler |
| C. Short CalVer (`YY.M.PATCH`, e.g. `26.10.0`) | Fits MSI limits; date-legible | Discards the meaning of MAJOR; downgrades a `1.x` app to look like `26.x`; same doc conflicts as B | REL-01, GIT-06, SECURITY.md |
| D. Monotonic build number only | Simplest | No compatibility signal at all; still needs a 3-part shape for MSI | REL-01, GIT-06 |

## Decision

Adopt **Option A: SemVer 2.0.0, where the public interface is the user's
installed data and capabilities, not code APIs.** One version applies to the
whole app (frontend + backend ship in one binary).

### What the public interface is

1. **On-disk user data:** the SQLite database schema
   (`src-tauri/migrations/*.sql`), the asset files and directory layout under
   the app data directory, and persisted frontend settings (`settingsStore`
   `persist` name and `version`).
2. **Install identity:** the bundle identifier (`com.meshyforge.app`), the OS
   keychain entry (service `meshyforge`), and the app data directory location.
   Changing any of these orphans existing installs.
3. **User-visible capabilities:** shipped workflows, panels, and task types,
   and the supported platforms.

**Not part of the public interface:** the Tauri IPC contract (`lib/tauri.ts`
↔ `commands/*.rs`), because frontend and backend always ship together; Rust
and TypeScript internals; and the Meshy HTTP API, which is an external
dependency (adapting to it is a fix, not a contract change).

### Increment rules

| Bump | When (any one is sufficient) |
|---|---|
| **MAJOR** | Existing user data cannot be opened or upgraded automatically, or upgrading loses data · A migration is not forward-only, or needs manual user action · Install identity changes (bundle identifier, keychain service/account, data directory) · A shipped capability or supported platform is removed · A `settingsStore` persist `version` bump has no `migrate` function |
| **MINOR** | Any new SQLite migration, even an additive one: a migrated DB is not guaranteed to open in an older build · A new user-visible capability, panel, or Meshy task type · A security-posture widening (a new allowed remote origin in CSP or a download/preview allowlist); it must also appear under `### Security` in the changelog · A `settingsStore` persist `version` bump that has a `migrate` function |
| **PATCH** | Bug fixes, including Meshy endpoint drift corrections, with no schema, identity, or settings-shape change · Security fixes that narrow posture · Dependency updates with no user-visible or data change · Test-only or docs-only changes that ship in a build |

**Compatibility guarantee:** any two builds with the same `MAJOR.MINOR` can
open each other's data directory. Within a `MAJOR`, newer builds always
upgrade older data automatically.

### Version sources

- **The authoritative value** is `package.json` `version`.
- `src-tauri/Cargo.toml` `[package] version` and `src-tauri/tauri.conf.json`
  `version` must equal it as literal strings (REL-03/04). `Cargo.lock` follows
  `Cargo.toml`.
- **Runtime display derives from the source, never a literal:**
  `APP_VERSION` is imported from `package.json` at build time.
- Version numbers change **only** in a `chore(release): bump version to
  vX.Y.Z` commit (GREB §10.2 step 5). Feature and fix commits never touch
  them. A drift correction is the one exception, and it must restore the last
  declared changelog version, not invent a new one.
- Planning-doc versions (GREB DOC-REP-02) are independent of the app version.

### Pre-releases

**REL-02 is suspended.** While MSI is a bundle target, pre-release tags
(`-beta`, `-rc.N`) cannot be built, and numeric pre-releases collide with
Windows Installer upgrade logic. `release.yml` would also publish any `v*` tag
as a full release. Release candidates are validated by building the release
commit locally or in CI (`npm run tauri build`) before tagging. A future ADR
may reintroduce a pre-release channel, for example a separate bundle
identifier or a non-MSI target.

### Historical versions

`1.0.0`, `1.0.1` and `1.0.2` remain valid changelog history but are **not**
tagged retroactively. Those commits violate REL-03/04, so a retroactive tag
would label a build that never shipped. The first tag will be the next
release, cut under this ADR.

### Next version

Under these rules the unreleased work since `1.0.2` adds migration
`002_persistence_integrity.sql` (MINOR), several new capabilities (MINOR), and
the `cdn.meshy.ai` image-origin widening (MINOR, `### Security`). Nothing meets
a MAJOR trigger. **The next release is `1.1.0`.**

**Newly proposed rule IDs** (proposed; not yet present in GREB):
- `REL-06` (proposed): A test asserts that `package.json`, `Cargo.toml`,
  `Cargo.lock` (own package) and `tauri.conf.json` versions are equal, and
  that `APP_VERSION` is derived from `package.json`.
- `REL-07` (proposed): Every release must have a `## [X.Y.Z] — YYYY-MM-DD`
  heading in `docs/CHANGELOG.md` before its tag is created. The `[Unreleased]`
  section is renamed in the release commit.
- `REL-08` (proposed): A version bump must be justified against ADR-0013's
  increment table in the release PR description, citing the highest trigger
  met.
- `REL-02` (amended): "Suspended per ADR-0013 while `msi` is a bundle target.
  Pre-release identifiers, if reintroduced, must be numeric-only."

## Consequences

**Positive:**
- MAJOR, MINOR and PATCH each answer a concrete question about the user's
  data and install, which a desktop app can actually be held to.
- The MSI bundler limits are respected by construction.
- The About panel can no longer report a different version from the installer.

**Negative:**
- No beta or RC channel until a follow-up ADR.
- Any schema migration forces at least a MINOR bump, even for a one-column
  change. This is intentional, but it makes PATCH releases with schema fixes
  impossible.

**Follow-ups:**
- **Corrections, before any release commit:**
  - Restore `Cargo.toml`, `Cargo.lock` and `tauri.conf.json` to the last
    declared version, `1.0.2`.
  - Derive `APP_VERSION` from `package.json`.
  - Add the REL-06 guard test.
- Docs to update (handoff to `doc-sync`):
  - GREB §10.1: add the public-interface definition and increment table, and
    amend REL-02.
  - GREB: add REL-06–08 (proposed), and add a step to §10.2 that justifies the
    bump per REL-08.
  - CSD GIT-06 row: cross-reference ADR-0013.
  - `docs/SECURITY.md`: define "current `1.x` line" as the latest `1.MINOR`.
- **Open contradiction (not decided here):**
  - `tauri.conf.json` `bundle.targets` is `["msi"]`, but `release.yml` and
    GREB §10.3 expect DMG, DEB, AppImage and NSIS artifacts on four
    platforms. A tag today would produce Windows MSI output only.
  - Decide the target list before the `1.1.0` tag. If MSI stays a target, this
    ADR's MSI constraints stay in force.

## References

- GREB §10.1–10.4 (REL-01–05), CSD GIT-06, DOC-09, GREB DOC-REP-02
- SemVer 2.0.0 — https://semver.org/spec/v2.0.0.html
- Keep a Changelog 1.1.0 — https://keepachangelog.com/en/1.1.0/
- Tauri v2 config reference, `WixConfig.version`, and `tauri-bundler`
  `bundle/windows/msi/mod.rs` (`convert_version`, `validate_wix_version`)
- Related ADRs: ADR-0004 (IPC/provider seam, explicitly outside the public
  interface), ADR-0008/0009 (the migration that makes the next release MINOR)
