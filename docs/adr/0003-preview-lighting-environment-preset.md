# ADR-0003: 3D Preview Lighting — Environment Preset vs. Deterministic Local Lights

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-08-26 |
| **Deciders** | Project owner (confirmed Option B — deterministic local lights) |
| **Phase** | Post-MVP (Phase 5 complete; preview rendering standardization) |
| **Related rules/features** | UI/UX VP-09 (proposed), VP-10 (proposed), VP-11 (proposed), VP-12 (proposed), TSS §7.3, §7.4, UI/UX §10.3 |
| **Supersedes** | None |

## Context

The MeshyForge 3D asset preview (`AssetPreview3D.tsx`) renders GLB models in a
React Three Fiber Canvas inside the Tauri WebView. The planning docs specify
Drei's `<Environment preset="studio" />` for PBR material reflections, but the
implementation uses deterministic local lights instead. This ADR resolves the
contradiction.

**The contradiction:**
- **TSS §7.3** (`technical_stack_documentation.md:690`): lists "Environment maps
  (drei) ← Required (for studio lighting)" in the bundle tree.
- **TSS §7.4** (`technical_stack_documentation.md:702, 755`): import example
  includes `Environment` from `@react-three/drei`; reference implementation
  shows `<Environment preset="studio" />`.
- **UI/UX §10.3** (`UI_UX_Documentation.md:753`): lighting table specifies
  `<Environment preset="studio" />` as providing "realistic reflections on
  PBR materials."
- **Implementation** (`AssetPreview3D.tsx:96–98`): uses
  `<ambientLight intensity={1.2}>` +
  `<directionalLight position={[5,8,5]} intensity={2.5} castShadow>` — no
  `<Environment>` element anywhere in the file.
- **CSP** (`tauri.conf.json:19`): `connect-src` allows only `'self'`, `ipc:`,
  `http://ipc.localhost`, `asset:`, `http://asset.localhost`,
  `https://asset.localhost` — no external CDN. Drei's
  `<Environment preset="studio">` fetches HDR files from a CDN at runtime,
  which the CSP **would block**.
- **Runtime guardrail** (`runtime-guardrails.test.ts:49`): actively asserts
  `connect-src` contains no source matching `meshy.ai` — and by extension no
  external CDN.
- **Vite config** (`vite.config.ts:36–39`): `optimizeDeps.exclude:
  ['@react-three/drei']` (Norton AV false-positive) forces direct
  `/core/*.js` imports instead of the root barrel.

**Secondary mismatch:** The implementation's light parameters also diverge
from UI/UX §10.3's specification:

| Light | Spec (UI/UX §10.3) | Implementation |
|---|---|---|
| Ambient | intensity `0.4` | intensity `1.2` |
| Key | `[5,5,5]` at `1.2` | `[5,8,5]` at `2.5` |
| Fill | `[-5,3,-5]` at `0.3` | (none) |
| Environment | `<Environment preset="studio" />` | (omitted) |

**Needs-an-ADR test satisfied — criteria 1, 2, 5, 6:**
- Criterion 1: Spans UI (React/R3F), build (Vite prebundle exclusion), and CSP
  configuration — binds ≥2 modules/directories.
- Criterion 2: Deviates from TSS §7.4 reference implementation and UI/UX §10.3
  lighting table.
- Criterion 5: Resolves a doc contradiction — TSS and UI/UX require
  `<Environment preset="studio" />`, but the implementation omits it and the
  CSP blocks its HDR fetch.
- Criterion 6: Expensive to reverse — affects PBR material rendering quality
  and CSP posture.

**Constraints found:**
- `tauri.conf.json:19` — CSP `connect-src` has no external CDN origin; adding
  one would expand the network boundary.
- `runtime-guardrails.test.ts:49` — asserts no `meshy.ai` in `connect-src`;
  adding a CDN origin would require updating this test.
- `vite.config.ts:36–39` — `@react-three/drei` excluded from prebundling;
  direct `/core/*.js` imports required for all Drei helpers.
- `runtime-guardrails.test.ts:7–14` — enforces root-barrel ban and requires
  5 specific `/core/*.js` imports; `Environment` is neither required nor
  forbidden.
- `AssetPreview3D.tsx:6–11` — imports 5 Drei helpers via direct `/core/*.js`
  paths; no `Environment` import.
- `UI_UX_Documentation.md:1045` — deliverables list mentions "R3F Canvas with
  OrbitControls, Environment, ContactShadows" — also needs updating.

**Precedent search record:**
- Searched: `Environment|preset|studio|lighting|ambient|directional|fill|key light|hdr|environment map|VP-|3D Viewport`
  across all `docs/**` and `src/**`.
- Searched in: `technical_stack_documentation.md`, `UI_UX_Documentation.md`,
  `AssetPreview3D.tsx`, `runtime-guardrails.test.ts`, `vite.config.ts`,
  `tauri.conf.json`.
- Searched for prior ADRs: `docs/adr/**` — ADR-0001 (CI branch-trigger) and
  ADR-0002 (download origins) exist, neither touches preview rendering.
- Result: No prior precedent on preview lighting. The contradiction is
  documented in the consolidated sync plan (Part B.3) but had not been
  adjudicated.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A: Restore `<Environment preset="studio" />` via direct module import + CSP exception** | Matches TSS/UI/UX specs; provides PBR reflections; best visual fidelity | Requires adding a CDN origin to `connect-src` CSP — broadens the network boundary; HDR fetch may fail offline; CDN availability not guaranteed; must add `@react-three/drei/core/Environment.js` to guardrail test | Contradicts the runtime guardrail's "no external CDN" assertion (line 49); would require a CSP update + guardrail test update; reverses the locked-down CSP posture |
| **B: Adopt deterministic local lights as MVP standard; update TSS/UI/UX** | Matches current implementation and CSP; works fully offline; no CDN dependency; simplest; no security boundary change | No environment-map reflections on PBR materials (lower visual fidelity); TSS §7.4 and UI/UX §10.3 must be updated to match code | Resolves contradictions in TSS §7.4 (line 690, 755) and UI/UX §10.3 (line 753) by updating docs to match code — not a conflict, but a resolution |
| **C: Bundle a local HDR file; import Environment with `files` prop** | PBR reflections without CDN; works offline; no CSP change needed | Adds an HDR asset to the bundle (size increase); requires licensing/sourcing an HDR file; more complex; Drei's `Environment` with `files` may still have import issues under the Vite exclude | May need a new dependency/asset; moderate complexity; untested with the current Vite prebundle exclusion |

## Decision

**Adopt Option B: Deterministic local lights as the MVP standard.**

The 3D preview must use deterministic local lights (`<ambientLight>` +
`<directionalLight>`) and must not use `<Environment preset="...">` or fetch
HDR files from a CDN. The CSP `connect-src` must not allow external CDN origins
for preview rendering. The TSS and UI/UX docs must be updated to match the
implemented lighting, closing the contradiction by aligning docs to code rather
than expanding the security boundary for a cosmetic gain.

Rationale: MeshyForge is an asset *manager* — it previews models for
organization and export, not for production rendering. PBR environment-map
reflections are a visual enhancement, not a functional requirement. The
current implementation works, is fully offline, and respects the locked-down
CSP. Expanding the network boundary to allow a CDN fetch for reflections would
introduce a runtime dependency on external availability, a potential failure
mode for offline use, and a broader attack surface — all for a cosmetic gain
that does not serve the app's core purpose.

**Newly proposed rule ID(s)** (proposed — do not imply they exist until UI/UX
is actually updated):
- `VP-12` (proposed) — "The 3D preview must use deterministic local lights
  (`<ambientLight>` + `<directionalLight>`) and must not use
  `<Environment preset="...">` or fetch HDR files from a CDN. The CSP
  `connect-src` must not allow external CDN origins for preview rendering."

## Consequences

**Positive:**
- Docs, code, CSP, and guardrails all become consistent
- No CDN dependency; fully offline preview
- No CSP boundary expansion
- Simplest maintenance path — no external runtime dependencies
- VP-12 makes the decision enforceable in code review and guardrail tests

**Negative:**
- No PBR environment-map reflections (materials may look flatter than with
  studio environment)
- TSS and UI/UX require prose updates (draft-only, outside doc-sync
  `--apply` allowlist)
- Visual regression from the original spec's intent — accepted as a
  tradeoff for offline reliability and security

**Follow-ups:**
- **Docs to update** (handed off to doc-sync — this ADR does not edit them):
  - `technical_stack_documentation.md` §7.3 (line 690): remove "Environment
    maps (drei) ← Required (for studio lighting)"; §7.4 (lines 702, 750–765):
    update import example to remove `Environment`; update lighting to match
    implementation (ambient `1.2`, directional `[5,8,5]` at `2.5`, no fill,
    no Environment); line 678 helper-components table: remove `Environment`
    from the Drei list; line ~1045 deliverables: remove `Environment`;
    bump to v1.0.1
  - `UI_UX_Documentation.md` §10.3 (lines 746–753): remove Environment row,
    update light parameters to match implementation (ambient `1.2`, key
    `[5,8,5]` at `2.5`, no fill); §10.1: add VP-12 guardrail; update 3D
    Viewport guardrail count (8 → 12 with VP-09–12); update total guardrail
    count (126 → 130); line 1045: remove `Environment` from deliverables;
    bump to v1.0.1
  - `docs/CHANGELOG.md`: add doc-version-bump entries
- **Code to update:**
  - `src/lib/runtime-guardrails.test.ts`: add assertion that
    `Environment` is not imported in `AssetPreview3D.tsx` source; add
    assertion that `connect-src` contains no external CDN origin (currently
    only asserts no `meshy.ai`)
- **Tests to add:** Runtime guardrail assertion for VP-12 (no Environment
  import, no CDN in connect-src)
- **Tech debt to register:** None — the reduced visual fidelity is accepted,
  not deferred

## References

- `AssetPreview3D.tsx:6–11` — Drei imports (no Environment)
- `AssetPreview3D.tsx:96–98` — implemented lighting (ambient 1.2, directional 2.5)
- `tauri.conf.json:19` — CSP (no external CDN)
- `vite.config.ts:36–39` — Drei prebundle exclusion
- `runtime-guardrails.test.ts:7–14, 49` — guardrail assertions
- `technical_stack_documentation.md:678, 690, 702, 750–765` — TSS requirements
- `UI_UX_Documentation.md:746–753, 1045` — UI/UX lighting table and deliverables
- Related ADRs: None (first ADR on preview rendering)
- Related audit: `docs/audits/validation-33d1e43-2026-08-25.md` F-STD-06, F-STD-07
- Related sync plan: `docs/doc-sync/2026-08-25-consolidated-sync-plan.md` Part B.3