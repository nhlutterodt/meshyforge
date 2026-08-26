# Consolidated Documentation Sync Plan

## Status

Draft for human review. This plan does not modify versioned planning documents.
All hunks below are proposed changes pending approval. Items marked **ADR
required** must not be applied until the referenced ADR is accepted.

## Trigger

This plan consolidates three sources of documentation drift identified on
2026-08-25 against the completed MeshyForge MVP (v1.0.0, git HEAD `33d1e43`):

1. The MVP security pass (already drafted in
   `2026-08-25-mvp-security-sync-plan.md`).
2. The 3D preview runtime validation (already drafted in
   `2026-08-25-preview-runtime-sync-plan.md`).
3. Three additional reverse-drift findings from the implementation validation
   audit (`docs/audits/validation-33d1e43-2026-08-25.md` §6, Step 7).

All claims in the two existing draft plans were re-verified against the current
codebase and confirmed accurate. The three additional drift items were
independently verified with exact file paths and line numbers (see Evidence
below).

## Verification Summary

Every proposed hunk below was validated against the codebase on 2026-08-25.
The two predecessor plans' claims — `get_api_key` signature, `validation.rs`
centralization, image signature checks, CI secret scan, `Cargo.lock` tracking,
`env.example` removal, Drei direct module imports, lazy preview failure
containment, CSP `connect-src` scoping, and the Environment preset contradiction
— are all confirmed accurate. The three new drift items are likewise confirmed.

## Evidence

### Predecessor plan claims (re-verified)

- `src-tauri/src/commands/keychain.rs:37` — `pub async fn get_api_key() -> Result<bool, String>` (not `Result<Option<String>, String>`).
- `src-tauri/src/commands/validation.rs` — centralizes endpoint, UUID, numeric, download-origin (`https://assets.meshy.ai` only), prompt-length (≤600), and filename validators.
- `src-tauri/src/commands/assets.rs:40` — `validated_image_mime` checks PNG (`89 50 4E 47`), JPEG (`FF D8 FF`), and WebP (`RIFF…WEBP`) magic bytes.
- `.github/workflows/ci.yml:16-24` — `security-checks` job, step "Reject tracked Meshy API keys," uses `git grep -IlE 'msy_[A-Za-z0-9_-]{20,}'` (filename-only output via `-l`).
- `src-tauri/Cargo.lock` exists; `.gitignore` has no `Cargo.lock` exclusion.
- Neither `env.example` nor `.env.example` exists at repo root; `.gitignore:6` retains a stale `!.env.example` un-ignore rule (harmless, references a non-existent file).
- `src/components/gallery/AssetPreview3D.tsx:6-11` — imports only `@react-three/drei/core/*.js` helpers (Bounds, Center, ContactShadows, Gltf, OrbitControls); no root barrel import.
- `src/components/gallery/AssetDetail.tsx:30-35` — `React.lazy` with `.catch(() => ({ default: PreviewLoadError }))` for module-load rejection; `PreviewLoadError` renders `role="alert"` fallback.
- `src-tauri/tauri.conf.json:18` — `connect-src 'self' ipc: http://ipc.localhost asset: http://asset.localhost https://asset.localhost` (no remote Meshy hosts); `img-src` includes `https://assets.meshy.ai` for thumbnails only.
- `src/lib/runtime-guardrails.test.ts` — 4 tests enforcing Drei barrel exclusion, Vite prebundle exclusion, CSP connect-src scoping, and lazy failure containment.
- `src/components/gallery/AssetPreview3D.tsx:104-106` — uses `<ambientLight intensity={1.2}>` + `<directionalLight position={[5,8,5]} intensity={2.5}>`; no `<Environment>` element. Contradicts `technical_stack_documentation.md:690,755` and `UI_UX_Documentation.md:753` which require `<Environment preset="studio" />`.

### New drift items (audit F-DRIFT-01–03, independently verified)

| ID | Claim | Code evidence | Doc evidence | Verdict |
|---|---|---|---|---|
| F-DRIFT-01 | Keychain service name mismatch | `src-tauri/src/security/keychain.rs:12` — `const SERVICE_NAME: &str = "meshyforge"` | `docs/test_plan.md:137` — TC-INF-06-01 expects `com.meshyforge.app` | **Confirmed drift** — code uses bare `"meshyforge"`, spec expects `"com.meshyforge.app"`; the test name says "under_meshyforge_service" but the verifies column says `com.meshyforge.app` (spec is internally inconsistent) |
| F-DRIFT-02 | `next-themes` is a vestigial dependency | `package.json:37` — `"next-themes": "^0.4.6"`; `src/components/ui/sonner.tsx:15` — `theme="dark"` hardcoded; zero imports of `next-themes` across all of `src/` | `docs/technical_stack_documentation.md` — `next-themes` not mentioned anywhere (not in dependency list ~lines 2025-2045, not in dependency graph ~lines 2125-2145, not flagged as vestigial) | **Confirmed drift** — vestigial dep undocumented |
| F-DRIFT-03 | CI triggers on `develop` branch forbidden by BRN-07 | `.github/workflows/ci.yml:5` — `branches: [main, develop]` | `docs/Github_Repository_Expectations.md:277` — BRN-07: "No `develop` or `staging` branches. `main` is the only long-lived branch." | **Confirmed drift** — dead CI trigger contradicts branching model |

---

## Part A — MVP Security Sync (from `2026-08-25-mvp-security-sync-plan.md`)

All hunks below are re-confirmed accurate. See the predecessor plan for full
rationale; this section restates the proposed changes for consolidated review.

### A.1 — `coding_standards.md`

**Version:** `1.0.0` → `1.0.1`
**Date:** `2025` → `2026-08-25`
**Changelog line to add:**

> 1.0.1 (2026-08-25): Corrected the API-key presence contract and clarified that secret scanning must not echo matched credential content.

**Hunk 1 — SEC-02 contract correction.** Current:

> The `get_api_key` Tauri command returns `Option<String>`, but the frontend stores only a boolean `hasApiKey` in Zustand.

Proposed:

> The `get_api_key` Tauri command returns only a boolean indicating whether a key exists. The raw key never crosses IPC or enters frontend state.

**Hunk 2 — Repository secret scan clarification.** Add to GIT-08 enforcement note:

> Automated credential scans must report filenames only. They must not print matching lines because a failed scan must not copy a secret into CI logs.

### A.2 — `technical_design_document.md`

**Version:** `1.0.0 (MVP)` → `1.0.1 (MVP)`
**Date:** `2025` → `2026-08-25`
**Changelog line to add:**

> 1.0.1 (2026-08-25): Aligned the API-key presence command and Rust input-validation design with the completed MVP security boundary.

**Hunk 1 — Key presence command signature.** Current:

```rust
async fn get_api_key() -> Result<Option<String>, String>
```

Proposed:

```rust
async fn get_api_key() -> Result<bool, String>
```

Add:

> This command reveals presence only. Reading the raw credential over IPC is prohibited.

**Hunk 2 — Input validation row.** Current:

> All form inputs are validated client-side (TypeScript types) and server-side (Rust struct deserialization). Invalid requests are rejected before hitting the API.

Proposed:

> Frontend validation provides immediate feedback, but every Tauri command treats its payload as untrusted. Shared Rust validators enforce required sources, the 600-character prompt limit, UUID task IDs, numeric ranges, supported endpoint paths, and safe filename components before client acquisition or network access. Invalid requests return `INVALID_INPUT` without consuming credits.

### A.3 — `security_threat_model.md`

**Version:** `1.0.0` → `1.0.1`
**Date:** `2026` → `2026-08-26`
**Changelog line to add:**

> 1.0.1 (2026-08-26): Recorded implemented IPC, filesystem, credential, and error-boundary controls; codified download-origin allowlist per ADR-0002 (SEC-09).

**Hunk 1 — implementation-status notes** (add to existing threats, no new rule IDs):

- VAL-01 through VAL-03 are enforced by shared command validators before network access.
- VAL-04 is enforced by canonical managed-root confinement for reveal operations.
- VAL-05 is enforced by extension and magic-byte checks.
- SAN-01, SAN-03, and SAN-04 are enforced at command boundaries while detailed failures remain local.
- DEP-03 and GIT-07 are satisfied by committing both application lockfiles.
- SEC-REP-04 is supplemented by a blocking, filename-only CI pattern scan.

**Hunk 2 — Tampering mitigation (line 114).** Current:

> TDD §11 "Signed download URLs" row (fetched server-side over HTTPS)

Proposed:

> TDD §11 "Signed download URLs" row (fetched server-side over HTTPS); SEC-09 (download host allowlist restricts all downloads to `https://assets.meshy.ai`, preventing SSRF via malformed API responses)

**Hunk 3 — Residual Risk #1 (line 178).** Add note:

> Note: `assets.meshy.ai` (download host) TLS validation is covered by `reqwest`'s secure defaults, same as `api.meshy.ai`.

### A.4 — Signed download origins (ADR-0002 accepted)

**Status: ADR-0002 accepted 2026-08-26 — downstream doc hunks now draftable.**

ADR-0002 (`docs/adr/0002-signed-download-origin-policy.md`) adopted Option A
(exact host allowlist, `assets.meshy.ai` only). The ADR proposes SEC-09 and
lists downstream doc edits. Those hunks are restated below.

**Hunk 1 — `coding_standards.md` §12: add SEC-09** (after SEC-08, line ~1541):

> | **SEC-09** | All file downloads must be restricted to HTTPS URLs whose exact host is `assets.meshy.ai`. The `validate_download_url` validator must be called before every `download_file` call. No wildcard or alternate hosts are permitted without an ADR. | SSRF prevention | ADR-0002 |

**Hunk 2 — `technical_design_document.md` §11 `download_asset` listing** (lines 947–1001): add `validate_download_url` calls before each `download_file` call to match actual code at `api.rs:141, 162, 185`.

**Hunk 3 — `technical_design_document.md` §11 "Signed download URLs" row** (line 1770). Current:

> Meshy returns pre-signed URLs for model/texture downloads. These are fetched server-side (Rust) and saved to the local filesystem. No auth header needed for these.

Proposed:

> Meshy returns pre-signed URLs for model/texture downloads. These are fetched server-side (Rust) and saved to the local filesystem. No auth header needed. All download URLs are validated by `validate_download_url` to restrict to `https://assets.meshy.ai` (SEC-09). Invalid origins return `INVALID_INPUT`.

**Hunk 4 — `security_threat_model.md`** — covered by A.3 Hunk 2 and Hunk 3 above.

---

## Part B — Preview Runtime Sync (from `2026-08-25-preview-runtime-sync-plan.md`)

All hunks below are re-confirmed accurate. See the predecessor plan for full
rationale; this section restates the proposed changes for consolidated review.

### B.1 — `technical_stack_documentation.md`

**Version:** `1.0.0` → `1.0.1`
**Date:** `2025` → `2026-08-25`
**Changelog line to add:**

> 1.0.1 (2026-08-25): Clarified antivirus-safe Drei module imports, Tauri asset fetch CSP, and lazy preview failure containment following Windows runtime validation.

**Hunk 1 — Section 7.3.** Current:

> OrbitControls, Environment maps, and ContactShadows are required through Drei.

Proposed:

> Import required Drei helpers from their typed `@react-three/drei/core/<Helper>.js` modules. Do not import the `@react-three/drei` root barrel in the lazy preview while root prebundling is excluded, because it evaluates unrelated helpers and can introduce development-only CommonJS interop failures.

**Hunk 2 — Section 7.4 import example.** Current:

```typescript
import { OrbitControls, Environment, ContactShadows, useGLTF, Bounds, Center } from '@react-three/drei';
```

Proposed:

```typescript
import { Bounds } from '@react-three/drei/core/Bounds.js';
import { Center } from '@react-three/drei/core/Center.js';
import { ContactShadows } from '@react-three/drei/core/ContactShadows.js';
import { useGLTF } from '@react-three/drei/core/Gltf.js';
import { OrbitControls } from '@react-three/drei/core/OrbitControls.js';
```

Add after the lazy-loading example:

> The component that owns `React.lazy` must contain module-load rejection and render an in-panel fallback. The preview's internal error boundary handles GLTF and rendering failures only; it cannot catch failure of the preview module itself.

Add to the Tauri asset-loading note:

> Three.js loads GLB data through fetch. Tauri's local asset origins therefore belong in CSP `connect-src` as well as `img-src`; remote Meshy origins are not required in `connect-src` after files are downloaded locally.

### B.2 — `UI_UX_Documentation.md`

**Version:** `1.0.0` → `1.0.1`
**Date:** `2025` → `2026-08-25`
**Changelog line to add:**

> 1.0.1 (2026-08-25): Added enforceable preview module-import, CSP, and lazy-failure containment guardrails from Windows Tauri runtime findings.

**Hunk 1 — Section 10.1, add new guardrail rules:**

| Rule ID | Rule | Category |
|---|---|---|
| **VP-09** | The lazy preview must import required Drei helpers from `@react-three/drei/core/<Helper>.js`; importing the `@react-three/drei` root barrel is prohibited while the package is excluded from Vite dependency prebundling. | [PERF] [BUILD] |
| **VP-10** | The component that calls `React.lazy` for the preview must catch module-load rejection and render an error state inside the viewport. The preview's internal error boundary remains responsible for GLTF, WebGL, and render failures. | [BUILD] [A11Y] |
| **VP-11** | Tauri CSP `connect-src` must allow only self, IPC, and local asset-protocol origins required by GLTFLoader. Wildcards and Meshy remote hosts are prohibited for downloaded model fetches. | [DECOUPLE] [BUILD] |

**Hunk 2 — Update 3D Viewport enforcement summary:**

- Count: `8` → `11`
- Enforcement: `Vitest runtime guardrails + component tests + Tauri smoke test + memory leak test`

**Hunk 3 — Update total guardrail count:**

- Total: `126` → `129`

### B.3 — Preview lighting (ADR-0003 accepted)

**Status: ADR-0003 accepted 2026-08-26 — downstream doc hunks now draftable.**

ADR-0003 (`docs/adr/0003-preview-lighting-environment-preset.md`) adopted
Option B (deterministic local lights as MVP standard). The ADR proposes VP-12
and lists downstream doc edits. Those hunks are restated below.

**Version:** `technical_stack_documentation.md` 1.0.0 → 1.0.1; `UI_UX_Documentation.md` 1.0.0 → 1.0.1

**Hunk 1 — `technical_stack_documentation.md` §7.3** (line 690). Current:

> ├── Environment maps (drei)            ← Required (for studio lighting)

Proposed: remove this line entirely (Environment maps are not used).

**Hunk 2 — `technical_stack_documentation.md` §7.2** (line 678). Current:

> `@react-three/drei` provides `OrbitControls`, `Environment`, `ContactShadows`, `useGLTF`, `Bounds`, `Center` — all essential for a 3D asset viewer.

Proposed:

> `@react-three/drei` provides `OrbitControls`, `ContactShadows`, `useGLTF`, `Bounds`, `Center` — all essential for a 3D asset viewer.

**Hunk 3 — `technical_stack_documentation.md` §7.4 import example** (line 702). Remove `Environment` from the import list.

**Hunk 4 — `technical_stack_documentation.md` §7.4 lighting** (lines 750–765). Current:

```typescript
<ambientLight intensity={0.4} />
<directionalLight position={[5, 5, 5]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
<directionalLight position={[-5, 3, -5]} intensity={0.3} />
...
<Environment preset="studio" />
```

Proposed:

```typescript
<ambientLight intensity={1.2} />
<directionalLight position={[5, 8, 5]} intensity={2.5} castShadow />
```

**Hunk 5 — `UI_UX_Documentation.md` §10.3 lighting table** (lines 746–753). Current:

| Light | Type | Position | Intensity | Purpose |
|---|---|---|---|---|
| Ambient | `ambientLight` | — | `0.4` | Base fill light |
| Key | `directionalLight` | `[5, 5, 5]` | `1.2` | Primary illumination, casts shadows |
| Fill | `directionalLight` | `[-5, 3, -5]` | `0.3` | Reduces harsh shadows on opposite side |
| Environment | `<Environment preset="studio" />` | — | — | Provides realistic reflections on PBR materials |

Proposed:

| Light | Type | Position | Intensity | Purpose |
|---|---|---|---|---|
| Ambient | `ambientLight` | — | `1.2` | Base illumination |
| Key | `directionalLight` | `[5, 8, 5]` | `2.5` | Primary illumination, casts shadows |

**Hunk 6 — `UI_UX_Documentation.md` §10.1: add VP-12** (after VP-08):

> | **VP-12** | The 3D preview must use deterministic local lights (`<ambientLight>` + `<directionalLight>`) and must not use `<Environment preset="...">` or fetch HDR files from a CDN. The CSP `connect-src` must not allow external CDN origins for preview rendering. | [BUILD] [DECOUPLE] |

**Hunk 7 — `UI_UX_Documentation.md` guardrail counts.** 3D Viewport count: `8` → `12` (VP-09–12); Total: `126` → `130`.

**Hunk 8 — `UI_UX_Documentation.md` §10.1 enforcement summary.** Update:

> Enforcement: `Vitest runtime guardrails + component tests + Tauri smoke test + memory leak test`

**Hunk 9 — `runtime-guardrails.test.ts`: add VP-12 assertion.** Add test that `AssetPreview3D.tsx` source does not contain `Environment` and that `connect-src` contains no external CDN origin.

**Hunk 10 — `UI_UX_Documentation.md` line ~1045 deliverables.** Remove `Environment` from:

> R3F Canvas with OrbitControls, Environment, ContactShadows

Proposed:

> R3F Canvas with OrbitControls, ContactShadows

---

## Part C — Additional Drift Items (audit F-DRIFT-01–03)

These three items were routed to doc-sync by the validation audit and are
independently verified above. None require an ADR — they are extensions, not
contradictions.

### C.1 — `test_plan.md` — Keychain service name (F-DRIFT-01)

**Version:** `1.0.0` → `1.0.1`
**Date:** `2026` → `2026-08-25`
**Changelog line to add:**

> 1.0.1 (2026-08-25): Corrected TC-INF-06-01 expected keychain service name to match the implemented `"meshyforge"` value.

**Hunk — TC-INF-06-01 verifies column.** Current (`docs/test_plan.md:137`):

> | TC-INF-06-01 | `set_api_key__stores_key_in_os_keychain_under_meshyforge_service` | RUST | `store_key()` writes to `keyring::Entry` for service `com.meshyforge.app` |

Proposed:

> | TC-INF-06-01 | `set_api_key__stores_key_in_os_keychain_under_meshyforge_service` | RUST | `store_key()` writes to `keyring::Entry` for service `meshyforge` |

**Rationale:** The implementation at `src-tauri/src/security/keychain.rs:12`
uses `SERVICE_NAME = "meshyforge"`. The test name already says
"under_meshyforge_service" — only the verifies column drifted to
`com.meshyforge.app`. This is a doc correction to match code, not a code
change. (If the reverse-DNS form is preferred for forward-compatibility, that
is a code change requiring its own ADR per criterion 4 — touches the
keychain namespace and could affect existing installed keys. This plan takes
the lower-risk path of syncing the doc to the implemented value.)

### C.2 — `technical_stack_documentation.md` — `next-themes` vestigial dependency (F-DRIFT-02)

**Version:** `1.0.0` → `1.0.1` (combined with Part B.1 — single version bump)
**Date:** `2025` → `2026-08-25` (combined with Part B.1)
**Changelog line to add** (append to the B.1 changelog line):

> ; noted `next-themes` as a vestigial dependency retained from the shadcn/ui scaffold.

**Hunk — Dependency list section (~lines 2025-2045).** Add entry:

> | `next-themes` | `^0.4.6` | Vestigial — retained from the shadcn/ui scaffold; `sonner.tsx` hardcodes `theme="dark"` and no component imports `next-themes`. Candidate for removal in a future cleanup pass. |

**Hunk — Dependency graph section (~lines 2125-2145).** Add node:

> `next-themes` (vestigial, no inbound edges)

**Rationale:** `next-themes@^0.4.6` is in `package.json:37` but has zero
imports across `src/`. `sonner.tsx:15` hardcodes `theme="dark"`. The TSS
dependency list and graph both omit it entirely. Documenting it as vestigial
is an extension (adds missing detail), not a contradiction. Removing the
dependency from `package.json` is a separate code change outside this plan's
scope; the doc should reflect current reality.

### C.3 — `Github_Repository_Expectations.md` — CI `develop` branch trigger (F-DRIFT-03)

**Status: ADR-0001 accepted — downstream doc edits now draftable.**

ADR-0001 (`docs/adr/0001-ci-branch-trigger-reconciliation.md`) was accepted
on 2026-08-25, adopting Option C (hybrid: `main` push + all PRs). The ADR's
Consequences section lists the downstream doc and code edits. Those hunks
are restated below in doc-sync format for application.

**Version:** `1.0.0` → `1.0.1`
**Date:** `2025` → `2026-08-25`
**Changelog line to add:**

> 1.0.1 (2026-08-25): Narrowed CI-01 and §11.1 ci.yml trigger description per ADR-0001 (hybrid `main` push + all PRs); removed `develop` from push triggers.

**Hunk 1 — §11.4 CI-01 rule** (line 922). Current:

> | **CI-01** | CI must run on every push to any branch and every PR to `main`. | Catch issues early | TSS §16.2 |

Proposed:

> | **CI-01** | CI must run on every push to `main` and every pull request. Feature branches are validated through PR-triggered CI, not push triggers. | Catch issues early | TSS §16.2 |

**Hunk 2 — §11.1 workflow files table** (line 890). Current:

> | `.github/workflows/ci.yml` | Push to any branch, PR to `main` | Lint, type-check, test, build smoke test | TSS §16.2 |

Proposed:

> | `.github/workflows/ci.yml` | Push to `main`, all PRs | Lint, type-check, test, build smoke test | TSS §16.2 |

**Hunk 3 — `technical_stack_documentation.md` §16.2 ci.yml example** (line 1775). Current:

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
```

Proposed:

```yaml
on:
  push:
    branches: [main]
  pull_request:
```

**Hunk 4 — `feature_requirements_documentation.md` acceptance criteria** (line 774). Current:

> GIVEN a push to any branch

Proposed:

> GIVEN a push to `main` or a pull request

**Code-side fix** (noted in ADR-0001 Consequences, not applied by this plan):

- `.github/workflows/ci.yml:5`: change `branches: [main, develop]` → `branches: [main]`
- `.github/workflows/ci.yml:7`: change `pull_request: branches: [main]` → `pull_request:` (remove branches filter so all PRs trigger)

---

## Part D — Phase Completion Markers

Do not flip `implementation_execution_plan.md`, `feature_requirements_documentation.md`
§9, `gap_assessment_documentation.md` §9.1, or `Github_Repository_Expectations.md`
§9.1 milestone rows solely from the MVP declaration. Run the formal
`phase-gate-check` first and apply only the status changes supported by that
report. This plan does not propose any phase-marker flips.

---

## Consolidated Version-Bump Summary

| Document | Current | Proposed | Combined with |
|---|---|---|---|
| `coding_standards.md` | 1.0.0 (2025) | 1.0.1 (2026-08-26) | Parts A.1 + A.4 (SEC-09) |
| `technical_design_document.md` | 1.0.0 (MVP) (2025) | 1.0.1 (MVP) (2026-08-26) | Parts A.2 + A.4 (download listing) |
| `security_threat_model.md` | 1.0.0 (2026) | 1.0.1 (2026-08-26) | Parts A.3 + A.4 (Tampering mitigation, Residual Risk #1) |
| `technical_stack_documentation.md` | 1.0.0 (2025) | 1.0.1 (2026-08-26) | Parts B.1 + B.3 (ADR-0003 lighting) + C.2 + C.3 (ADR-0001 ci.yml) |
| `UI_UX_Documentation.md` | 1.0.0 (2025) | 1.0.1 (2026-08-26) | Parts B.2 + B.3 (ADR-0003 VP-12, lighting table) |
| `test_plan.md` | 1.0.0 (2026) | 1.0.1 (2026-08-26) | C.1 |
| `Github_Repository_Expectations.md` | 1.0.0 (2025) | 1.0.1 (2026-08-26) | C.3 (ADR-0001) |
| `feature_requirements_documentation.md` | 1.0.0 (2025) | 1.0.1 (2026-08-26) | C.3 (ADR-0001) — acceptance criteria only |

No other planning docs require version bumps from this sync. The reference
docs (`hook_implementations.md`, `zustand_store_implementations.md`,
`rust_type_definitions.md`, `user_guide.md`) have no verified drift and remain
at 1.0.0.

---

## Apply Checklist

The following items fall within the doc-sync `--apply` allowlist (status/checkbox
flips, changelog appends, ADR README regeneration) and may be auto-applied once
approved:

- Changelog appends to `docs/CHANGELOG.md` for each approved version bump.

All three ADRs are **accepted** — their downstream doc hunks are draftable now:

- **ADR-0001** (CI branch-trigger, accepted 2026-08-25) → C.3 hunks (CI-01, §11.1 table, TSS §16.2, FRD acceptance criteria) + `ci.yml` code fix
- **ADR-0002** (download origins, accepted 2026-08-26) → A.4 hunks (SEC-09 rule, TDD download listing, threat model mitigations)
- **ADR-0003** (preview lighting, accepted 2026-08-26) → B.3 hunks (TSS §7.3/§7.4 lighting, UI/UX §10.3 lighting table, VP-12 guardrail, guardrail counts, runtime test)

The only **code change** in the entire batch is the `ci.yml` trigger fix from ADR-0001.

The following items are **prose/rule changes** and remain draft-only even under
`--apply` — they require manual application after human review:

- All hunks in Parts A, B, and C (SEC-02 contract, SEC-09 rule, validation
  wording, Drei import guidance, VP-09–12 guardrail additions, lighting table
  updates, keychain service name correction, `next-themes` vestigial note,
  GREB CI-trigger note).

---

## Review Checklist

1. Approve the `get_api_key` contract corrections (A.1, A.2).
2. Approve the explicit-validator wording (A.2).
3. Confirm whether secret scans should be required both locally and in CI (A.1).
4. ~~Choose a signed-download origin option before creating the Security ADR (A.4).~~ **Resolved: ADR-0002 accepted (Option A — exact host allowlist).** Apply the A.4 doc hunks (SEC-09, TDD listing, threat model).
5. Confirm the direct helper modules are treated as supported project-level imports (B.1).
6. Confirm VP-09 through VP-11 identifiers and guardrail counts (B.2).
7. ~~Decide whether the lighting contradiction should enter ADR review now or remain explicitly open (B.3).~~ **Resolved: ADR-0003 accepted (Option B — deterministic local lights).** Apply the B.3 doc hunks (TSS lighting, UI/UX lighting table, VP-12, guardrail counts, runtime test).
8. Approve the TC-INF-06-01 keychain service name correction (C.1).
9. Approve the `next-themes` vestigial dependency documentation (C.2).
10. ~~Decide whether to remove `develop` from `ci.yml` (code fix) or open an ADR to change BRN-07 (C.3).~~ **Resolved: ADR-0001 accepted (Option C — hybrid `main` push + all PRs).** Apply the C.3 doc hunks and the ci.yml code fix per ADR-0001's Consequences.
11. Run the phase-gate check before changing MVP completion markers in planning documents (Part D).
12. Apply approved planning-document hunks in one commit with metadata and changelog updates.