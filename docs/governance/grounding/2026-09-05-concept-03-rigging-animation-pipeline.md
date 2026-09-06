# Grounding: Concept #3 — "Complete Character Pipeline" (skeleton auto-placement, pose/clip previewer, multi-clip FBX/GLTF export)

Status: read-only research memo. No implementation proposed. No files other
than this one were modified.

Proposal restated (from the architectural audit): (1) skeleton auto-placement
& joint-weighting via automatic humanoid/quadruped anatomical landmark
detection; (2) an interactive pose/clip previewer showing motion clips
directly on the rigged mesh in the viewport; (3) multi-clip FBX/GLTF export
with embedded animation tracks and skeleton hierarchies.

## Current state (per proposal sub-part)

### Sub-part 1: "skeleton auto-placement & joint-weighting via automatic landmark detection"

What exists today is Meshy's **cloud** auto-rigging endpoint, wired minimally:

- `src/components/generate/RiggingPanel.tsx:1-61` — a form with exactly two
  inputs: an `AssetTaskPicker` for `inputTaskId` (line 33-40, filtered by
  `hasDownloadedModel`) and a `heightMeters` number input (line 42-51). It
  builds a `RiggingRequest` (line 20-23) and calls `useCreateRigging()`
  (line 8, 14).
- `src/hooks/useMeshyApi.ts:128-133` — `useCreateRigging` wraps Tauri command
  `create_rigging`, hitting Meshy endpoint `/v1/rigging`, `taskType: 'rig'`.
- `src/lib/meshy-types.ts:204-209` — `RiggingRequest` = `{ inputTaskId?,
  modelUrl?, heightMeters?, textureImageUrl? }`.
- **The audit's own "Current Implementation" framing ("basic auto-rigging
  form") undersells what's missing, not what's there** — per the session's
  standing instruction to verify rather than trust: comparing
  `RiggingPanel.tsx` against `docs/feature_requirements_documentation.md`
  FR-POST-06 (lines 1831-1875), three of six required functional
  requirements are absent from the shipped form:
  - FR-POST-06-F3 (optional texture image URL input) — `RiggingRequest`
    supports `textureImageUrl` (meshy-types.ts:208) but `RiggingPanel.tsx`
    has no field for it (only `inputTaskId` and `heightMeters` are wired,
    lines 15-16, 20-23).
  - FR-POST-06-F4 (non-humanoid warning) — no warning text or humanoid
    detection anywhere in the 61-line file.
  - FR-POST-06-F5 (300,000-face limit warning/disable) — no face-count check
    or disabled-state logic in the file.
  - FR-POST-06-F6 (credit cost estimate) is also absent — no "Cost: N
    credits" string in the file.
  This is a fourth "looks implemented but isn't" gap found this session (in
  addition to CreativeLabPanel.tsx and ExportDialog.tsx from prior work):
  the rigging form is thinner than even the FRD's own baseline, before any
  new capability is added on top.
- **Anatomical landmark detection, humanoid/quadruped classification, or
  joint-weighting logic does not exist anywhere in this codebase.** Searched
  `src/`, `src-tauri/src/`, and `docs/` for `landmark`, `joint weight`,
  `joint-weight`, `anatomical` — zero matches outside this new memo. The
  entirety of "rigging" in MeshyForge today is: send a task ID + height to
  Meshy's cloud endpoint and receive back an already-rigged GLB/FBX (per
  FR-POST-06's acceptance criteria, feature_requirements_documentation.md:
  1854-1857 — Meshy's response already contains "rigged character GLB/FBX
  URL" plus two preset animations). MeshyForge does no rigging computation of
  its own, local or cloud-orchestrated; it is a pure passthrough client to
  Meshy's black-box rigging model.
- Quadruped support specifically: not mentioned anywhere in FRD, TDD, or
  UI/UX docs. Meshy's public rigging endpoint (per FR-POST-06-F4's own
  warning text, "works best with standard humanoid characters") is itself
  humanoid-oriented — quadruped auto-rigging is not a documented capability
  of the wrapped API, let alone of MeshyForge.

### Sub-part 2: "interactive pose/clip previewer ... directly on the rigged mesh in the viewport"

**Does not exist in any form.** Searched `docs/UI_UX_Documentation.md`,
`docs/technical_stack_documentation.md`, `docs/user_guide.md`, and
`docs/feature_requirements_documentation.md` for `pose preview`, `pose/clip`,
`clip previewer`, `skeleton` (as a 3D-scene concept), `landmark`,
`multi-clip` — see Precedent search record below for exact hits. The only
"skeleton" hits are (a) Meshy's cloud rigging feature itself
(`user_guide.md:197`, `:182`, FRD:1840 — "adds a skeleton to a model") and
(b) the unrelated shadcn `<Skeleton>` loading-placeholder UI component
(`UI_UX_Documentation.md:676`, `technical_stack_documentation.md:485` —
animated-pulse grey boxes for loading states, not a 3D bone hierarchy). There
is no mention of playing back an animation clip on a mesh inside the R3F
viewport (`src/components/gallery/AssetPreview3D.tsx`) anywhere in the docs
or code. `AnimationPanel.tsx` (below) only creates an animation *task*
against Meshy's cloud endpoint — it does not play back the result.

### Sub-part 3: "multi-clip FBX/GLTF export with embedded animation tracks and skeleton hierarchies"

**Depends entirely on export infrastructure that does not exist for any
asset type**, per this session's parallel grounding
(`docs/governance/grounding/2026-09-05-concept-09-gltf-canonical.md:66-69`):
`src/components/export/ExportDialog.tsx:43-55`'s `handleExport` is a
non-functional stub that shows a false success toast while invoking no
backend command at all. There is no `TaskType::Convert`-based or local
export-conversion path wired end-to-end today (confirmed independently via
`docs/governance/task-manifest.yaml:286-300`, TASK-0016, blocked_by
TASK-0015). "Multi-clip" and "embedded animation tracks" are additional
requirements on top of an export pathway that is currently *zero percent*
implemented — this sub-part is not "extend export to handle animation," it
is "build export from nothing, then extend it to handle animation." No file
in `src/`, `src-tauri/src/`, or `docs/` mentions multi-clip export; searched
`multi-clip`, `multi clip` — zero matches anywhere.

### Animation panel (verified against FR-POST-07, since the audit also credits "animation clip listing")

- `src/components/generate/AnimationPanel.tsx:1-79` — an `AssetTaskPicker`
  filtered by `isCompletedRig` for `rigTaskId` (lines 43-49), a `<Select>`
  populated from `useAnimationLibrary()` (line 23, 56-67), and a submit that
  builds `AnimationRequest{ rigTaskId, actionId }` (lines 30-33) and calls
  `useCreateAnimation()` → Tauri `create_animation` → Meshy `/v1/animations`
  (`useMeshyApi.ts:135-140`).
- `src/hooks/useAnimationLibrary.ts:1-28` — **this is a real Meshy API call**,
  not a mock or client-side list. It invokes Tauri command
  `fetch_animation_library` (line 13), which per
  `feature_requirements_documentation.md:1914` hits Meshy's public endpoint
  `GET https://api.meshy.ai/web/public/animations/resources`, cached with
  `staleTime: Infinity` (line 25, matching FR-POST-07-F2). So the "animation
  clip listing" claim is accurate as far as it goes — it is a genuine cloud
  fetch of Meshy's ~500-entry preset library, not a fake/local list.
- However, against FR-POST-07 (lines 1878-1920) two more functional
  requirements are unimplemented in `AnimationPanel.tsx`: FR-POST-07-F3
  ("searchable list" — the `<Select>` has no search/filter input, just a
  scrollable dropdown of every item) and FR-POST-07-F6 (optional post-process
  `change_fps`/`fbx2usdz`/`extract_armature` — `AnimationRequest.postProcess`
  exists in the type, `meshy-types.ts:214-217`, but `AnimationPanel.tsx`
  never sets it; no UI for it exists). FR-POST-07-F7 (credit cost estimate)
  is also absent. This is consistent with the pattern already found in
  RiggingPanel: the type layer is more complete than the UI layer.

## The cloud-only-vs-local-landmark-detection tension

This is the central ambiguity in sub-part 1 and must not be resolved here.

- If "automatic humanoid/quadruped anatomical landmark detection" means
  **requesting Meshy's existing cloud rigging endpoint**, sub-part 1 is
  already ~40% built (a thin form exists, per Current state above) and
  Meshy's own black-box model already does landmark detection server-side —
  MeshyForge just doesn't expose the intermediate landmarks or support
  quadrupeds, both of which are outside Meshy's documented public API surface
  entirely (not just outside MeshyForge's UI).
- If it means **building new local/client-side anatomical landmark
  detection** (e.g., running a pose-estimation or mesh-analysis model inside
  the Tauri app, independent of Meshy's cloud rig endpoint), that is an
  entirely new capability class that:
  1. **Directly contradicts** the standing classification from this
     session's parallel hybrid-local-execution grounding
     (`docs/governance/grounding/2026-09-05-concept-08-hybrid-local-execution.md:193-200`),
     which places `Rig` (line 199) and `Animate` (line 200) in the
     **"inherently cloud-only"** bucket — "require generative/learned AI
     inference that this repo has no local model for" — with explicitly NO
     local-processing candidate status, alongside Retexture, TextToImage,
     and ImageToImage.
  2. Would be **greenfield ML/CV infrastructure**: that same grounding
     memo independently confirmed (task-manifest.yaml:263) "src-tauri/Cargo.toml
     (full file) has zero GLTF/mesh/decimation/WASM-toolchain crates" and
     "every TaskType, without exception, currently routes through
     provider.create_task()" — there is no local inference runtime, no
     pose-estimation model, no landmark-detection library anywhere in this
     repo today (Rust or TS side).
  3. Would very likely trip the **Dependency** ADR criterion (see
     Preliminary needs-an-ADR classification below) on top of whatever
     Architectural criterion the pose-previewer/export halves already trip —
     a local landmark-detection feature needs a concrete ML/CV
     library/model (e.g., a pose-estimation crate or an ONNX runtime),
     which is a new dependency requiring the license/CVE review
     `Github_Repository_Expectations.md` DEP-06/DEP-09 mandate.
- **This memo takes no position on which reading the audit intended.** Both
  are plausible from the phrasing "automatic humanoid/quadruped anatomical
  landmark detection" — it reads like new local ML capability, but could
  also just be florid restating of what Meshy's rig endpoint already does
  server-side. Whoever scopes this into a task must force a binary choice
  before any ADR or implementation work starts, because the two readings
  have almost disjoint engineering costs (thin-UI-completion vs.
  greenfield-ML-integration) and the cloud-only classification is currently
  the only decided fact on record.

## Export dependency (on TASK-0015/16's resolution)

Sub-part 3 cannot be scoped independently of TASK-0015
(`docs/governance/task-manifest.yaml:267-284`, blocked, risk_level 3 — ADR
deciding canonical asset storage + export-conversion architecture,
remote-`TaskType::Convert`-vs-local) and TASK-0016
(`task-manifest.yaml:286-300`, blocked, blocked_by TASK-0015 — fixing the
`ExportDialog.tsx` stub itself). Concretely:

- There is currently no Tauri command for export/format-conversion at all
  (TASK-0016's evidence_gate: "a real Tauri command (net-new — none
  currently registered in lib.rs's generate_handler! list)").
- Whatever export pathway TASK-0015 settles on (remote via
  `TaskType::Convert`, or local conversion) will determine whether
  "multi-clip FBX/GLTF export with embedded animation tracks" is even
  possible using Meshy's API primitives, since `TaskType::Convert`
  (`api.rs:328-334`) is a raw Meshy passthrough with no documented
  multi-clip-bundling semantics (searched `feature_requirements_documentation.md`
  for `FR-CONV`/"Convert Task"/"TaskType::Convert" per
  task-manifest.yaml:283 — zero matches; it has no FRD entry at all).
- Practically: sub-part 3 should not be scoped or estimated until TASK-0015
  is resolved. Building animation-export logic against an export
  architecture that doesn't exist yet risks doing the work twice.

## Viewport-registry interaction

`docs/adr/0006-viewport-control-registry.md` is **Accepted**
(metadata table, line 5) and directly governs sub-part 2 if it is ever
built:

- The Decision section (lines 61-91) establishes `useViewportControls` as
  "the single seam for client-side, local, free, non-destructive viewport
  controls" and proposes rule **VP-13**: "Client-side viewport controls
  ... must be added via a typed control-registry hook
  (`useViewportControls`), not ad hoc props on the viewer component"
  (lines 82-86).
- It also proposes **VP-14** (lines 87-91): before wiring any new
  preview/asset capability to a paid Meshy endpoint, first determine whether
  the same outcome can be achieved locally via the registry — and
  explicitly draws the line as "view vs. asset," not "which is cheaper"
  (lines 76-80).
- A pose/clip previewer that plays an animation clip on the mesh **inside
  the viewport** is squarely a "view" capability (it does not mutate the
  asset) and would be a textbook new consumer of the
  `useViewportControls` registry per VP-13 — it should not be built as
  ad hoc state/props on `AssetPreview3D.tsx` directly. This is independent
  of whether the underlying animation *data* comes from Meshy's cloud
  `/v1/animations` task (already real) — VP-14's distinction applies: fetching
  the clip is a provider-boundary concern (already wired via
  `useCreateAnimation`/`useAnimationLibrary`), but scrubbing/playing it back
  on the mesh is a pure local viewport control and belongs in the registry,
  not as a new one-off prop threaded into the viewer.
- No existing ADR or doc addresses skeletal/bone-driven playback inside R3F
  specifically — ADR-0006's registry currently only covers camera-level
  controls (reset-view, scale-preview per its Decision text); extending it
  to drive a `THREE.AnimationMixer`/`SkinnedMesh` pose would be a genuine
  extension of the registry's scope, not something the ADR already answers.

## Precedent search record

- Searched `pose preview|pose/clip|clip previewer|skeleton|landmark|joint
  weight(ing)|joint-weight|multi-clip|multi clip` (case-insensitive) across
  `docs/UI_UX_Documentation.md`, `docs/technical_stack_documentation.md`,
  `docs/user_guide.md`, `docs/feature_requirements_documentation.md`.
  - Hits: only "skeleton" (4 occurrences total) — all either (a) Meshy's
    cloud rig feature description (`user_guide.md:197,182`,
    `feature_requirements_documentation.md:1840`) or (b) the unrelated
    shadcn `<Skeleton>` loading-placeholder component
    (`UI_UX_Documentation.md:676`, `technical_stack_documentation.md:485,
    486` — note `:486` even mentions "animation library search" but that
    refers to the `Command`/Ctrl+K search palette component being reused
    for the existing animation-library dropdown, not a new capability).
  - `landmark`, `joint weight`, `joint-weight`, `multi-clip`, `multi clip`,
    `pose preview`, `pose/clip`, `clip previewer`: zero matches in any of
    the four files.
- Searched `landmark|joint weight|joint-weight|anatomical` across `src/`,
  `src-tauri/src/`, and `docs/` (whole-repo, case-insensitive): zero matches
  outside this new memo.
- Searched `docs/adr/*.md` (all 6 existing ADRs + README): only ADR-0006
  (viewport-control-registry) is relevant, and only to sub-part 2 (camera/
  view controls), not to rigging/animation/export. ADR-0004 (Task Provider
  Abstraction) governs the existing `create_rigging`/`create_animation`
  cloud calls but was not re-read in full here since its scope
  (`TaskProvider` trait genericity) was already confirmed by ADR-0006's own
  Context section (0006:34-39) as settled and non-conflicting.
- Searched `"Complete Character Pipeline"|"basic auto-rigging form"|"animation
  clip listing"` across the whole repo: no matches — the architectural
  audit document itself is not checked into this repository; its claims
  arrive only via the task description and could not be cross-checked
  against a source file, only against the actual shipped
  Rigging/AnimationPanel code (done above).
- Cross-referenced `docs/governance/task-manifest.yaml` for TASK-0015/0016
  (export) and the hybrid-local-execution grounding memo's Rig/Animate
  classification (concept-08, lines 193-200) — both already-established
  facts per this session's prior work, re-cited here rather than re-derived.

## Preliminary needs-an-ADR classification

Per `.claude/skills/adr-log/SKILL.md` Step 2 (needs-an-ADR test), evaluated
per sub-part — none of this is a final ADR recommendation, only a
classification of which criteria would trip if/when this is scoped:

- **Sub-part 1 (landmark detection), local-ML reading:**
  - Criterion 1 (crosses IPC boundary / binds >=2 modules) — yes, if local
    detection runs in Rust and needs a new IPC contract to hand results
    (bone positions/weights) to the TS/viewport side.
  - Criterion 4 (adds/drops a dependency) — yes, almost certainly: a
    pose-estimation/anatomical-landmark model or CV library is a new
    Cargo (or npm, if done client-side in JS/WASM) dependency, subject to
    `Github_Repository_Expectations.md` DEP-06 (license allowlist) and
    DEP-09 (transitive CVE risk) per SKILL.md line 75-76.
  - Criterion 6 (expensive to reverse / re-litigated later) — yes: once a
    specific landmark-detection approach/model is chosen and integrated,
    switching approaches later is a substantial rewrite.
  - This reading would also **directly contradict** the standing
    cloud-only classification for `Rig`/`Animate` from concept-08 — an ADR
    scoping this would need to either explicitly override that
    classification (with justification) or the audit's phrasing would need
    to be reinterpreted as the cloud-endpoint reading instead.
  - **Sub-part 1, cloud-endpoint reading:** no new ADR criteria trip beyond
    what already governs `create_rigging` (ADR-0004, already Accepted) —
    this would be inline UI-completion work (the FR-POST-06-F3/F4/F5/F6 gaps
    already documented above), not an architectural decision.

- **Sub-part 2 (pose/clip previewer in viewport):**
  - Criterion 6 (expensive to reverse / foundational UI architecture) —
    plausibly yes, per the same reasoning ADR-0006 itself used ("expensive
    to redo once other panels/viewers depend on it").
  - Whether this needs its *own* ADR or is simply "a new registry entry
    under ADR-0006's already-Accepted VP-13/14 rules" is the live question —
    arguably it is covered by citing ADR-0006 inline (SKILL.md's
    "Inline-only cases": "already covered by an existing rule ID"), *unless*
    playing back skeletal animation (as opposed to camera manipulation) is
    judged different enough in kind to need its own scope decision (e.g.,
    does the registry need a new sub-API for mesh-level, not camera-level,
    controls?). This memo does not resolve that judgment call.

- **Sub-part 3 (multi-clip export):**
  - Already gated on TASK-0015's ADR (Architectural class, per
    task-manifest.yaml:259, criteria 1 and conditionally 4). Multi-clip/
    animation-track embedding would be an *addition* to whatever TASK-0015
    decides, likely re-opening or extending that same ADR rather than
    requiring an independent one — but only once TASK-0015 lands.

- **Overall:** this proposal, if the local-landmark-detection reading is
  intended, is the most architecturally heavy of the three sub-parts
  discussed across this session's parallel groundings (concept-08,
  concept-09, and this one) because it is the only one that would
  simultaneously trip Architectural, Dependency, *and* a direct conflict
  with an already-decided classification (cloud-only Rig/Animate).

## Open questions

1. Does "automatic humanoid/quadruped anatomical landmark detection" mean
   (a) parameterizing/extending the existing Meshy cloud rig call, or (b) a
   new local ML/CV capability? This must be resolved before any task is
   scoped — the two readings are not incrementally related, they are
   different projects.
2. If (b): is there budget/appetite to introduce a first-ever local
   ML/inference dependency into a codebase that has zero such dependencies
   today (per concept-08's Cargo.toml audit), and does that require
   revisiting the hybrid-local-execution ADR's cloud-only classification for
   `Rig`/`Animate` rather than just adding a new, disjoint local feature next
   to a passthrough cloud one?
3. Does quadruped rigging have any support path via Meshy's API at all, or
   would it require an entirely different (possibly non-Meshy) service —
   this was not answerable from any doc in this repo and would need
   external verification against Meshy's actual API documentation (out of
   scope for this read-only, repo-internal grounding).
4. For sub-part 2: should skeletal/pose playback be added as a new category
   of control inside the existing `useViewportControls` registry (extending
   ADR-0006's scope), or does driving a `SkinnedMesh`/`AnimationMixer`
   warrant a distinct hook/seam and its own ADR? ADR-0006's Decision text
   only discusses camera-level controls (reset-view, scale-preview);
   whether "play this clip on this mesh" is the same kind of thing is not
   settled by the existing ADR text.
5. Should the FR-POST-06/FR-POST-07 UI gaps found in this memo (missing
   texture-URL field, non-humanoid/face-limit warnings, credit estimates,
   searchable animation list, missing post-process UI) be filed as their
   own bug-fix tasks (in the TASK-0016 mold — pre-existing gaps, not part of
   the new proposal) independent of whether the character-pipeline proposal
   is ever scoped? They were discovered incidentally during this grounding
   and are not blocked on any of the above open questions.
