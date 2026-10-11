# Doc Sync Plan — ADR-0013 Version Number Semantics

**Triggered by:** ADR-0013 (`docs/adr/0013-version-number-semantics.md`), Accepted 2026-10-11.
**Mode:** draft only (no `--apply`). No planning doc was edited. Every hunk
below changes a rule definition or prose, so all of them are outside the
`--apply` allowlist and must be applied by hand after review.
**Already done, so not in this plan:** the `docs/adr/README.md` index row
(written by `adr-log`) and the `docs/CHANGELOG.md` `[Unreleased]` entry
(added in the same PR as ADR-0013).

## Staleness passes

| Pass | Finding |
|---|---|
| (a) Routing | ADR-0013 Consequences names: GREB §10.1, §10.2; GREB REL-02 (amend) and REL-06–08 (add); CSD GIT-06; `docs/SECURITY.md` |
| (b) Claim verification | CSD §3 naming table gives `v1.1.0-beta` as a valid tag example, which suspended REL-02 no longer allows. GREB §10.4's example heading uses ` - 2025-XX-XX`, but `docs/CHANGELOG.md` uses ` — YYYY-MM-DD`. TSS §2.3's example `tauri.conf.json` hardcodes `"version": "1.0.0"` **and** `"targets": ["dmg", "msi", "deb", "appimage"]`; see §6, which is a contradiction and is **not** resolved here |
| (c) Markers | GREB v1.0.1 (2026-08-26), CSD v1.0.2 (2026-09-05) and TSS v1.0.1 (2026-08-26) all predate ADR-0013 (2026-10-11), so they are stale by definition for the sections below |

---

## 1. `docs/Github_Repository_Expectations.md` (GREB)

### Hunk 1: §10.1 Versioning (definition, increment table, rule table)

Old:
````
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
````

New:
````
MeshyForge follows Semantic Versioning 2.0.0 (SemVer). ADR-0013 defines the
public interface as **the user's installed data and capabilities**, not code
APIs:

1. **On-disk user data:** the SQLite schema (`src-tauri/migrations/*.sql`), asset files and layout, and persisted settings (`settingsStore` persist name and `version`).
2. **Install identity:** bundle identifier `com.meshyforge.app`, keychain service `meshyforge`, and the app data directory.
3. **User-visible capabilities:** shipped workflows, panels, task types, and supported platforms.

The Tauri IPC contract is **not** part of the public interface, because
frontend and backend ship together in one binary. Adapting to Meshy API drift
counts as a fix.

```
v{MAJOR}.{MINOR}.{PATCH}
```

| Bump | When (any one is sufficient) |
|---|---|
| **MAJOR** | Existing user data cannot be opened or upgraded automatically, or upgrading loses data · A migration is not forward-only or needs manual user action · Install identity changes · A shipped capability or supported platform is removed · A `settingsStore` persist `version` bump has no `migrate` |
| **MINOR** | Any new SQLite migration · A new user-visible capability, panel, or task type · A widened security posture (a new allowed remote origin), also listed under `### Security` in the changelog · A `settingsStore` persist `version` bump that has a `migrate` |
| **PATCH** | Bug fixes with no schema, identity, or settings-shape change · Security fixes that narrow posture · Dependency updates with no user-visible or data change |

**Compatibility guarantee:** builds with the same `MAJOR.MINOR` can open each
other's data directory. Within a `MAJOR`, newer builds always upgrade older
data automatically.

| Rule ID | Rule | Rationale |
|---|---|---|
| **REL-01** | Tags follow `v{major}.{minor}.{patch}` format: `v1.0.0`, `v1.1.0`, `v1.0.1`. | SemVer | CSD GIT-06 |
| **REL-02** | *Suspended per ADR-0013 while `msi` is a bundle target.* Tauri's MSI bundler rejects non-numeric pre-release identifiers, and Windows Installer ignores the 4th version field when comparing for upgrades. If reintroduced by a later ADR, pre-release identifiers must be numeric-only. | MSI constraint | ADR-0013 |
| **REL-03** | The `package.json` version and `Cargo.toml` version must match the tag version. | Consistency | — |
| **REL-04** | The `tauri.conf.json` version must match the tag version. | Tauri build embeds version | TSS §2.3 |
| **REL-05** | No tag may be created without a passing CI run on the commit being tagged. | Release quality | — |
| **REL-06** | `package.json` is the authoritative version. `Cargo.toml`, `Cargo.lock` (own package) and `tauri.conf.json` must equal it, and the frontend `APP_VERSION` must be imported from it, never hardcoded. Enforced by `src/lib/runtime-guardrails.test.ts`. | Single source of truth | ADR-0013 |
| **REL-07** | A `## [X.Y.Z] — YYYY-MM-DD` heading must exist in `docs/CHANGELOG.md` before tag `vX.Y.Z` is created. `[Unreleased]` is renamed in the release commit. | Release notes precede release | ADR-0013, CSD DOC-09 |
| **REL-08** | The release PR description justifies the bump against the increment table above, citing the highest trigger met. Version numbers change only in a `chore(release)` commit. | Auditable versioning | ADR-0013 |
````

### Hunk 2: §10.2 Release Process

Old:
```
2. All quality gates pass (automated + manual).
3. Update version numbers in package.json, Cargo.toml, tauri.conf.json.
4. Update docs/CHANGELOG.md with release notes.
```

New:
```
2. All quality gates pass (automated + manual).
3. Choose the bump per §10.1's increment table and record the justification in the release PR (REL-08).
4. Update version numbers in package.json, Cargo.toml (+ Cargo.lock), tauri.conf.json. The REL-06 guardrail test must pass.
5. Rename `## [Unreleased]` in docs/CHANGELOG.md to `## [X.Y.Z] — YYYY-MM-DD` (REL-07).
```
Then renumber the remaining steps (old 5–10 become 6–11).

### Hunk 3: §10.4 example heading

Old: `## [1.0.0] - 2025-XX-XX`
New: `## [1.0.0] — YYYY-MM-DD`

This matches the existing `docs/CHANGELOG.md` convention and REL-07.

### Version bump

`1.0.1` → `1.0.2`, Date → `2026-10-11`.
Changelog line: "GREB → v1.0.2: §10.1 defines version semantics and the public interface per ADR-0013; REL-02 suspended; REL-06–08 added; §10.2 adds bump-justification and changelog-rename steps."

§20.4 enforcement counts: **no change.** REL-06 runs inside the existing `frontend-tests` required check and adds no new CI job.

---

## 2. `docs/coding_standards.md` (CSD)

### Hunk 1: §3 naming table, tag example

Old: `| Git tags | \`v\` + semver | \`v1.0.0\`, \`v1.1.0-beta\` | §14 |`
New: `| Git tags | \`v\` + semver | \`v1.0.0\`, \`v1.1.0\` (no pre-release suffix while REL-02 is suspended, ADR-0013) | §14 |`

### Hunk 2: GIT-06

Old: `| **GIT-06** | Tag releases with \`v{major}.{minor}.{patch}\`: \`v1.0.0\`, \`v1.1.0\`. | Semantic versioning |`
New: `| **GIT-06** | Tag releases with \`v{major}.{minor}.{patch}\`: \`v1.0.0\`, \`v1.1.0\`. What each increment means is defined in GREB §10.1 / ADR-0013. | Semantic versioning |`

### Version bump

`1.0.2` → `1.0.3`, Date → `2026-10-11`.
Changelog line: "CSD → v1.0.3: GIT-06 and the tag naming example now reference ADR-0013; removed the `-beta` tag example (REL-02 suspended)."

---

## 3. `docs/SECURITY.md`

This file has no Document Metadata table, so no version bump.

Old:
```
MeshyForge security fixes are applied to the current `1.x` release line.
```
New:
```
MeshyForge security fixes are applied to the latest `1.MINOR` release (for example, after 1.1.0 ships, fixes land as 1.1.x; 1.0.x receives none). Version meaning is defined in ADR-0013.
```

Changelog line: "SECURITY.md: the supported-version statement now names the latest 1.MINOR line per ADR-0013."

---

## 4. `docs/technical_stack_documentation.md` (TSS)

### Hunk: §2.3 example `tauri.conf.json`, version line only

Old: `  "version": "1.0.0",`
New: `  "version": "X.Y.Z", // must equal package.json (GREB REL-06, ADR-0013)`

The example already uses a `//` header comment, so an inline comment matches
its existing style. **The `"targets"` line in the same example is not touched
here;** see §6.

### Version bump

`1.0.1` → `1.0.2`, Date → `2026-10-11`.
Changelog line: "TSS → v1.0.2: §2.3 example no longer hardcodes an app version; it points to the REL-06 single-source rule."

---

## 5. `docs/CHANGELOG.md`

Once hunks 1–4 are applied, add under `## [Unreleased]` → `### Governance`:

```
- **Documentation sync — ADR-0013**: GREB → v1.0.2 (§10.1 version semantics, REL-02 suspended, REL-06–08 added, §10.2 steps); CSD → v1.0.3 (GIT-06, tag example); TSS → v1.0.2 (§2.3 version placeholder); SECURITY.md supported-version wording
```

Then change the existing Governance bullet's "`REL-06`–`08` … not yet
registered" to drop REL-06–08 from the pending list.

---

## 6. Contradiction found, handed off to `adr-log` (not resolved here)

**Bundle targets.** These sources disagree about what a release produces:

| Source | Says |
|---|---|
| `src-tauri/tauri.conf.json` `bundle.targets` (since `6b83adc`, the initial commit) | `["msi"]` |
| TSS §2.3 example | `["dmg", "msi", "deb", "appimage"]` |
| GREB §10.3 | Build matrix of macOS arm64/x86_64, Windows x64 and Linux x64; artifacts DMG, MSI, DEB and AppImage |
| `.github/workflows/release.yml` | Builds on all 4 platforms and uploads DMG, MSI, DEB, AppImage and NSIS globs |

A `v*` tag today would run four platform builds, but only the Windows job
would produce an installer. This is a contradiction between still-valid
statements, not an extension, so `doc-sync` stops here. Route it through
`adr-log` (needs-an-ADR criterion 5).

The outcome also affects ADR-0013: if `msi` stops being a target, REL-02's
suspension can be revisited. **This must be decided before the `v1.1.0` tag.**

---

## Apply checklist

- [ ] Hunks 1.1–1.3 (GREB) and version bump
- [ ] Hunks 2.1–2.2 (CSD) and version bump
- [ ] Hunk 3 (SECURITY.md)
- [ ] Hunk 4 (TSS) and version bump
- [ ] §5 CHANGELOG line
- [ ] All in **one commit** (`docs: apply ADR-0013 doc-sync`)
- [ ] §6 opened as an `adr-log` question (bundle targets)
