# ADR-0014: Bundle Targets and Platform Release Scope

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-11 |
| **Deciders** | Repository owner (confirmed 2026-10-11: "Match docs" bundle targets; keep identifier and defer; installer testing available on Windows and Linux) |
| **Phase** | Phase 5 (Polish & Release), before the first tagged release |
| **Related rules/features** | FRD §1, §9 (Must Have cross-platform installers); TSS §2.3, §16.3, §20.1; GREB §10.3; IEP 5.9–5.10; ADR-0013 (REL-02, install identity); `security_threat_model.md` §10 residual risk #6 |
| **Supersedes** | None |

## Context

**Trigger:** The source of truth for what a release produces contradicts every
planning document. ADR-0013's doc-sync plan (§6) flagged it and handed it off
here. Satisfies needs-an-ADR criteria 5 (resolves a doc contradiction) and 6
(the first tag ships whatever is decided).

**Evidence (2026-10-11, `main` @ `487bce1`):**

| Source | Says |
|---|---|
| `src-tauri/tauri.conf.json` `bundle.targets`, unchanged since `6b83adc` (initial commit) | `["msi"]` |
| FRD §1 (line 147), §9 (line 4284) | Platform: macOS, Windows, Linux. Installers: DMG (macOS arm64 + x86_64), MSI (Windows x64), DEB + AppImage (Linux x64) |
| TSS §2.3 example config | `"targets": ["dmg", "msi", "deb", "appimage"]` |
| TSS §20.1 | macOS arm64 is **Primary**; macOS x86_64, Windows x64, and Ubuntu 22.04+ are Supported |
| GREB §10.3, TSS §16.3, IEP 5.10 | Release produces DMG, MSI, DEB and AppImage on tag |
| `.github/workflows/release.yml` | Builds macOS arm64/x86_64, Windows x64 and Linux x64; uploads DMG/MSI/DEB/AppImage/NSIS globs |
| `README.md` §Download | Links MSI, two DMGs and an AppImage. **No GitHub release exists**, so all four links land on an empty page |
| CI `build-smoke` run `38116412412` | macOS and Linux: `Built application at …/release/meshyforge`, with **no bundle produced**. Windows: `Finished 1 bundle` (MSI) |

So a `v*` tag today would run four release builds, and only the Windows job
would attach an installer. Three of the four platforms promised by a Must Have
requirement would silently ship nothing.

A second issue surfaced in the same logs. Tauri warns that the identifier
`com.meshyforge.app` "ends with `.app` … conflicts with the application bundle
extension on macOS". The identifier also names the app data directory:
Tauri's `app_data_dir()` in `lib.rs`, and the hardcoded `APP_IDENTIFIER` in
`storage/recovery_protocol.rs:6`, which must stay equal to it.

**Constraints found:**
- ADR-0013: install identity (bundle identifier, data directory) is part of the
  public interface. Changing it after a release is a MAJOR bump. REL-02 stays
  suspended while `msi` is a target.
- `security_threat_model.md` §10 residual risk #6: unsigned builds on every
  platform are an accepted MVP risk (GREB §12.3).
- Owner's test hardware: Windows and Linux. **No macOS hardware.**

**Precedent search record:**
- Searched: `targets`, `dmg`, `appimage`, `deb`, `nsis`, `macos`, `linux`,
  `cross-platform`, `supported platform`, `identifier`, `APP_IDENTIFIER`,
  `code signing`.
- Searched in: FRD, TDD, TSS, GREB, IEP, `security_threat_model.md`, README,
  `docs/adr/0001`–`0013`, `tauri.conf.json`, `ci.yml`, `release.yml`,
  `src-tauri/src/`.
- Result: no prior ADR on bundle targets. All planning docs agree on four
  installer formats, and only `tauri.conf.json` differs.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A. Match the docs: `["msi", "dmg", "deb", "appimage"]`** | Brings the config in line with FRD, TSS, GREB, IEP, README and `release.yml` with no planning-doc rewrites. `build-smoke` then runs bundling on all three OSes on every PR, so packaging breakage is caught before a tag | Installers are unsigned (accepted risk #6). macOS cannot be hand-tested by the owner | None |
| B. Windows-only 1.1.0 (keep `["msi"]`) | Ships only what is tested by hand | Contradicts a Must Have requirement. Requires amending FRD §9, TSS §20.1, GREB §10.3, IEP 5.10, README and the `release.yml` matrix, and demotes the TSS "Primary" platform | FRD §9, TSS §20.1 |
| C. All targets, macOS and Linux labelled "untested preview" | Honest about test coverage | Linux can be tested, so the label overstates the gap. Adds a release-notes convention for every release | None |

Identifier sub-decision:

| Option | Pros | Cons |
|---|---|---|
| **Keep `com.meshyforge.app` for 1.1.0; defer** | No data-directory move. The warning has no functional effect on Windows and Linux | macOS warning persists. Changing it after 1.1.0 ships becomes a MAJOR bump under ADR-0013 unless done with an automatic data migration |
| Change before 1.1.0 | Never counts as a MAJOR identity change | Needs a one-time data-directory copy for existing development installs, plus a lockstep `APP_IDENTIFIER` change and tests. That is real work outside this ADR's scope |

## Decision

**Adopt Option A.** Set `src-tauri/tauri.conf.json` `bundle.targets` to
`["msi", "dmg", "deb", "appimage"]`, matching TSS §2.3 exactly. Keep
`com.meshyforge.app` for 1.1.0.

### Release verification gate (per platform)

| Platform | Installer | Required before tag |
|---|---|---|
| Windows x64 | MSI | `build-smoke` produces the bundle **and** the owner hand-tests the install and launch |
| Linux x64 | DEB, AppImage | `build-smoke` produces both bundles **and** the owner hand-tests at least one of them (a VM or WSLg is acceptable) |
| macOS arm64 / x86_64 | DMG | `build-smoke` produces the bundle. **No hand test is possible.** The GitHub Release notes must say the macOS build is CI-built but not hand-verified, and that it is unsigned (Gatekeeper will warn) |

This matches FRD §9's installer list while being explicit that macOS
verification is CI-only. It is not a "preview" label on Linux, which is
hand-tested.

**Newly proposed rule IDs** (proposed; not yet present in GREB):
- `REL-09` (proposed): `bundle.targets` in `tauri.conf.json` must produce every
  installer format listed in FRD §9 and GREB §10.3. `build-smoke` must produce
  a bundle on every matrix platform. A run that prints `Built application`
  without `Finished N bundle(s)` is a failure.
- `REL-10` (proposed): Release notes state, per platform, whether the installer
  was hand-tested or only CI-built.

## Consequences

**Positive:**
- The first tag will produce the installers the README already links to.
- Packaging breakage on macOS and Linux surfaces in PR CI, not at release time.
- ADR-0013's MSI constraints stay in force unchanged, because MSI remains a target.

**Negative:**
- **macOS is shipped without hand verification.** This is a residual risk,
  recorded in the release notes per the gate above.
- Unsigned DMGs trigger Gatekeeper on first launch. On Apple Silicon, users may
  need to clear the quarantine attribute. This is accepted risk #6, restated
  here because it is now user-visible.
- CI `build-smoke` time increases slightly (DMG/DEB/AppImage packaging).

**Follow-ups:**
- Implemented with this ADR: the `tauri.conf.json` `bundle.targets` change.
- Docs to update (handoff to `doc-sync`):
  - GREB §10.3: add REL-09/REL-10 (proposed) and the per-platform gate.
  - `security_threat_model.md` §10 #6: note that Gatekeeper friction is now user-facing for DMG users.
  - README §Download: add a macOS "CI-built, not hand-tested, unsigned" note.
- `release.yml` uploads an NSIS `*.exe` glob that no target produces. It is
  harmless (no file is matched) but dead config. Remove it in a later
  release-workflow change.
- Deferred, needs a future ADR: the identifier rename away from `.app` plus a
  data-directory migration, which must keep `APP_IDENTIFIER` in
  `storage/recovery_protocol.rs` in lockstep with `tauri.conf.json`.
- Optional enforcement for REL-09: make `build-smoke` fail when no bundle is
  produced (for example, by checking that `src-tauri/target/*/release/bundle/`
  is non-empty).

## References

- FRD §1, §9; TSS §2.3, §16.3, §20.1; GREB §10.3, §12.3; IEP 5.9–5.10
- `security_threat_model.md` §10 #6
- CI run `38116412412` (`build-smoke` logs, 2026-10-11)
- Related ADRs: ADR-0013 (versioning, install identity, REL-02)
