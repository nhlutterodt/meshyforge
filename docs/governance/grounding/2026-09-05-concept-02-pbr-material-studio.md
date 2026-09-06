# Grounding: Concept 02 — "PBR Material Studio"

Date: 2026-09-05
Scope: full AI material-channel generation (Diffuse/Albedo, Normal, Roughness,
Metallic) applied onto existing mesh geometry, with per-channel toggle
preview directly in the 3D viewport. Read-only research; no implementation
proposed.

## Current state (file:line)

**1. The AI-generation half (Retexture + PBR request) is already fully wired,
end to end, in the contract layer:**

- FRD `FR-POST-02` (`docs/feature_requirements_documentation.md:1666-1705`)
  specifies Retexture as **Must Have, Phase 3**, with functional requirements
  `FR-POST-02-F1..F9` including "Enable PBR toggle (default from settings)"
  (F4) and "Texture resolution: 2k, 4k, 8k" (F5).
- TS contract: `src/lib/meshy-types.ts:174-187` — `RetextureRequest` already
  has `enablePbr?: boolean` (line 182) and `textureResolution?: '2k'|'4k'|'8k'`
  (line 183), plus `enableOriginalUv`, `removeLighting`, `targetFormats`,
  `alphaThumbnail`, `textStylePrompt`, `imageStyleUrl`, `multiviewImageUrls`.
- Rust contract: `src-tauri/src/meshy/models.rs:456-475` — `RetextureRequest`
  struct mirrors the TS interface field-for-field (`enable_pbr` at line 472,
  `texture_resolution` at line 474 by inspection of the same block). The same
  `enable_pbr`/`texture_resolution` pair also exists on `TextTo3DRefineRequest`
  (line 317, ~460), `ImageTo3DRequest` (line 354), and
  `MultiImageTo3DRequest` (line 399) — PBR-enable is a cross-cutting,
  already-modeled concept, not Retexture-specific.
- Command wiring: `src-tauri/src/commands/api.rs:320-326` —
  `create_retexture` is a registered `#[tauri::command]`; test fixtures at
  `api.rs:1390-1422` and `:1536-1542` exercise `enablePbr`/`enable_pbr`
  serialization both ways (camelCase wire vs. Rust snake_case), confirming
  this isn't dead code — it's tested.
- Settings default: `technical_design_document.md:2013` documents
  `default_enable_pbr = true` as a settings-store default, and
  `technical_stack_documentation.md:473` lists `Switch` component usage for
  "Remesh, PBR, remove lighting, auto-size, moderation" as an intended UI
  pattern.

**2. Per-channel texture download/storage already exists and is exercised:**

- `TextureUrl` struct, `src-tauri/src/meshy/models.rs:231-237` — five named,
  optional channel fields: `base_color`, `metallic`, `normal`, `roughness`,
  `emission`.
- Schema: `src-tauri/migrations/001_initial.sql:17` —
  `texture_paths TEXT NOT NULL DEFAULT '[]'` with an inline comment already
  documenting the shape: `[{ "base_color": "...", "metallic": "...", ... }]`.
- Download logic: `src-tauri/src/commands/api.rs:184-219`, inside the
  generic, task-type-agnostic `download_asset` command
  (`api.rs:511` `#[tauri::command] pub async fn download_asset`) — when a
  completed task's response includes `texture_urls`, each channel URL is
  validated (`validate_download_url`), downloaded to
  `asset_dir/textures/<filename>` via `texture_filename(i, key)`, and the
  resulting per-channel local paths are persisted to the `texture_paths`
  column via `state.database.mark_downloaded` (`api.rs:222-233`,
  `storage/database.rs:140-150`).
- TS surface: `AssetRow.texturePaths: TextureUrl[]` at
  `src/lib/meshy-types.ts:56`; raw DB-row variants at lines 299 and 348.

**Conclusion of (1)+(2): the proposal's "full AI material-channel generation"
half is not a gap. The request fields, the Rust struct, the download
pipeline, and the DB column to store multiple named channel files per asset
already exist and are already tested**, independent of any UI.

**3. The UI does not use any of this. `PostProcessPanel.tsx`'s Retexture tab
is a stub, contradicting the FRD it cites:**

- `src/components/generate/PostProcessPanel.tsx:56-63` — `handleRetexture`
  builds `const body: RetextureRequest = { inputTaskId: inputTaskId.trim() }`
  — **no other field is populated**: no `textStylePrompt`, `imageStyleUrl`,
  `enablePbr`, `textureResolution`, `enableOriginalUv`, `removeLighting`,
  `targetFormats`, or `alphaThumbnail`.
- `PostProcessPanel.tsx:128-136` — the `TabsContent value="retexture"` block
  renders **only a single "Retexture Model" button**. No text-prompt input,
  no image-URL input, no PBR switch, no resolution `Select`, no format
  checkboxes — none of the controls FR-POST-02's acceptance criteria
  requires ("WHEN the user views the available controls THEN they see: text
  style prompt, image style URL, ... enable PBR toggle, texture resolution,
  remove lighting toggle, target formats, alpha thumbnail",
  `feature_requirements_documentation.md:1688-1691`).
- Compare to the same file's Resize tab (`PostProcessPanel.tsx:142-193`),
  which does have real inputs (mode select, value input, origin select) —
  confirming the Retexture tab isn't just "the file's style," it is
  specifically unfinished relative to its own sibling tab and its own FRD
  section.
- `gap_assessment_documentation.md:347` lists item 3.14
  (`PostProcessPanel.tsx`, "Remesh/retexture/convert/resize/UV forms
  submit") as satisfied by this same file — that checkbox does not hold for
  Retexture's field set once the FRD acceptance criteria are checked
  against the actual component. This is the third instance this session of
  the audit-trail (gap assessment / FRD "done" claims) not matching shipped
  code, alongside `CreativeLabPanel.tsx`'s fake product-type concatenation
  and `ExportDialog.tsx`'s total stub (both noted in prior groundings this
  session).

**4. The viewport-preview half — per-channel toggle — does not exist at
all, anywhere:**

- `src/components/gallery/AssetPreview3D.tsx:87-100` parses only
  `asset.filePaths` for a `glb` key; it never reads or references
  `asset.texturePaths` anywhere in the file (confirmed by full read: no
  occurrence of `texturePaths` in `AssetPreview3D.tsx`).
- `Model` (`AssetPreview3D.tsx:45-56`) calls `useGLTF(glbPath)` and clones
  the scene as-is — whatever materials/maps are embedded in the GLB are
  what render; there is no material-swap, no channel-isolation shader, no
  toggle state.
- Grep of `src/` for `texturePaths` (`src/lib/meshy-types.ts:56,299,348`,
  plus five test-fixture mock objects) shows the field is **typed and
  covered by mocks in tests, but never read by any rendering component** —
  `AssetGrid.tsx`, `AssetCard.tsx`, and `AssetPreview3D.tsx` all omit it.
- `useViewportControls.ts` (`src/hooks/useViewportControls.ts:1-100`)
  exposes only camera/orbit controls (`distance`, `zoomIn`, `zoomOut`,
  `resetView`, `setControlsRef`, `boundsApiRef`, `minDistance`,
  `maxDistance`) — no material/channel-related state or action exists in
  the registry today.

## Gap vs. proposal

| Sub-capability | State |
|---|---|
| Request PBR-enabled retexture from Meshy (API contract) | **Exists**, fully typed both sides, tested (`meshy-types.ts:182-183`, `models.rs:472+`, `api.rs:1390-1542`) |
| Download & persist per-channel texture files locally | **Exists**, generic to any task (`api.rs:184-219`, `001_initial.sql:17`) |
| UI form to actually request PBR/resolution/prompt fields | **Missing** — `PostProcessPanel.tsx:128-136` is a bare button; none of FR-POST-02-F1–F9's fields are rendered or sent |
| Viewport per-channel toggle preview | **Missing entirely** — no code reads `texturePaths` for rendering; `AssetPreview3D.tsx` renders only the GLB's baked-in materials; `useViewportControls.ts` has no material axis |
| A control-registry action for "swap active texture channel" | **Missing**, and no doc/ADR proposes one (see precedent search) |

The proposal's "full AI material-channel generation" is **not** a real gap —
the generation/download/storage substrate is already built and tested. The
actual net-new work implied by "PBR Material Studio" is entirely on the
**consumption side**: (a) build the Retexture UI form FR-POST-02 already
specifies but `PostProcessPanel.tsx` never implemented, and (b) build a new
viewport capability — swapping which downloaded channel file is bound as the
active material map — that has zero precedent in any existing component,
hook, or ADR.

## Viewport-registry interaction (per ADR-0006 / VP-13 / VP-14)

- ADR-0006 (`docs/adr/0006-viewport-control-registry.md`, Status: Accepted,
  2026-09-05) established `useViewportControls` as "the single seam for
  client-side, local, free, non-destructive viewport controls" (Decision,
  lines 63-67) and proposed `VP-13`: "Client-side viewport controls ...
  must be added via a typed control-registry hook ..., not ad hoc props on
  the viewer component" (lines 83-86). A per-channel material-preview toggle
  is exactly this shape: it changes what the viewer displays without
  touching the asset, so per **VP-13 it must go through
  `useViewportControls`** (or an analogous registry extension), not be
  hand-wired into `AssetPreview3D.tsx`.
- `VP-14` (ADR-0006 lines 87-91): "Before adding a new preview/asset
  capability, confirm whether it can be satisfied locally via the
  viewport-control registry (free, instant, non-destructive) before wiring
  it to a `TaskProvider` endpoint (paid, async, permanent)."
- Applying VP-14's test to "toggle between PBR channels in the viewport":
  **once a Retexture task has completed and `download_asset` has run,** the
  channel files already sit on local disk (`texture_paths` DB column,
  `api.rs:184-219`) and are reachable via the same `assetUrl()` helper
  `AssetPreview3D.tsx:9,63,100` already uses for the GLB and thumbnail.
  Swapping the bound texture on an already-loaded Three.js material is a
  pure client-side operation — no network call, no credit spend, instantly
  reversible. This satisfies VP-14's "local, free, instant, non-destructive"
  test cleanly, **conditioned on the channels already being downloaded** —
  it is a real instance of the "view vs. asset" distinction ADR-0006's
  Decision section draws (lines 78-80): switching which already-downloaded
  channel is *displayed* is a view-level operation; it is not equivalent to,
  and does not substitute for, actually *requesting* a new PBR generation
  (which correctly stays on the `TaskProvider`/Retexture path per the
  parallel hybrid-local-execution grounding's finding that Retexture is
  cloud-only generative inference).
  - Caveat: this only holds for assets where a PBR-enabled Retexture (or
    Text/Image-to-3D with `enablePbr: true`) has actually run and been
    downloaded. For any asset that hasn't gone through that path,
    `texture_paths` is `'[]'` (the DB default, `001_initial.sql:17`, and the
    literal value used in every test fixture found, e.g.
    `AssetPreview3D.test.tsx:98`) — there is nothing local to toggle, and
    the only route to get channel data is the paid Retexture endpoint. So a
    channel-toggle control's availability is conditional on asset state,
    not universally "free" the way reset-view/zoom are.
- No existing registry action, prop, or hook state models "active material
  channel" today — this would be new surface in `useViewportControls.ts`
  (new state + a setter), consistent with VP-13's registry-only pattern, but
  it is a genuinely new axis (material/channel) alongside the registry's
  current sole axis (camera).

## Precedent search record

Searched (case-insensitive) for `PBR`, `pbr`, `material studio`, `channel
preview`, `albedo`, `roughness`, `metallic` across `docs/` (all `.md`
files). 11 files matched at least one term:

- `docs/governance/grounding/2026-09-05-concept-09-gltf-canonical.md` —
  prior grounding this session, not a spec.
- `docs/coding_standards.md` — no direct check performed beyond the initial
  grep hit; term present but not further read (out of scope: coding
  standards don't define feature scope).
- `docs/UI_UX_Documentation.md:985` — lists "PBR" as one of several controls
  `TextTo3DPanel.tsx` is expected to have (prompt input, model selector,
  remesh controls, pose, PBR, format checkboxes) — a generation-form
  control, not a viewport/preview concept.
- `docs/feature_requirements_documentation.md` — `FR-POST-02-F4`/`F5` (PBR
  toggle, texture resolution), read in full above; no other FR mentions
  channel-level viewport preview.
- `docs/technical_stack_documentation.md:473` — `Switch` component list
  includes "PBR" as a toggle, UI-pattern-level only.
- `docs/technical_design_document.md:1611,2013` — a wireframe ASCII mockup
  showing a `PBR: ☑` checkbox in a generation form, and the
  `default_enable_pbr` settings default. No viewport/preview content.
- `docs/doc-sync/2026-08-25-consolidated-sync-plan.md:293` — matched only
  because of "PBR materials" in a lighting-environment sentence
  ("Environment ... Provides realistic reflections on PBR materials") —
  unrelated to channel generation/preview, a red herring from the broad
  grep.
- `docs/adr/0003-preview-lighting-environment-preset.md` — governs
  `<Environment preset>` choice for reflections, not material channels;
  confirms ADR-0003 is lighting-only exactly as ADR-0006 itself already
  states (`0006-viewport-control-registry.md:47-49`).
- `docs/rust_type_definitions.md:253-255,385-387,456-641` — documents the
  `TextureResolution` enum and `TextureUrl` struct (mirroring
  `models.rs`), and every request struct's `enable_pbr`/`texture_resolution`
  field pair. Confirms the contract-layer completeness found above; no
  viewport-preview content.
- `docs/zustand_store_implementations.md` — **zero matches** on any of the
  seven searched terms (re-verified directly: grep returned no output).
- `docs/gap_assessment_documentation.md` — zero matches on the seven PBR/
  material terms in the initial broad grep; a separate targeted grep for
  `retexture` found only line 347 (the `PostProcessPanel.tsx` gap-item
  checkbox discussed above).

**Explicit negative results:** searched for "material studio" — zero
matches anywhere in `docs/`. Searched for "channel preview" — zero matches
anywhere in `docs/`. Searched for "albedo" — zero matches anywhere in
`docs/` (the codebase and FRD consistently use "base_color"/"diffuse"
naming, never "albedo"). No `docs/adr/*.md` other than 0003 (lighting) and
0006 (viewport registry, camera-only) touches the 3D preview at all.

## Preliminary needs-an-ADR classification

Per `.claude/skills/adr-log/SKILL.md` Step 2, this proposal trips:

- **Criterion 1** (new module-boundary convention): a per-channel material
  toggle is a new capability class inside `useViewportControls` — the
  registry currently only models one axis (camera state). Adding a second,
  materially different axis (which texture map is bound to which mesh
  material slot) is itself a module-boundary decision about whether it
  belongs in the *same* registry hook, a sibling hook, or a
  new small store — not answered by ADR-0006, which only ever discusses
  camera-shaped controls (rotate/pan/zoom/reset/scale-preview).
- **Criterion 6** (expensive to reverse / will be re-litigated): ADR-0006
  itself was triggered by exactly this kind of "no reusable seam" gap for
  camera controls; skipping a decision here risks the same ad hoc-prop
  pattern ADR-0006 was written to prevent, for a second, unrelated axis
  (materials) grafted onto the same hook without deciding whether that's
  the right shape.
- **VP-14 documentation obligation** (ADR-0006 Decision, line 91): "Document
  the determination in the implementing PR's description" — this grounding
  performs that determination (see Viewport-registry interaction section
  above: conditionally local-first, gated on prior PBR-enabled Retexture
  completion) but the actual PR implementing it would still need to carry
  that documentation per VP-14, and per Step 5 of the ADR-log skill this
  question (extends/narrows how VP-13's registry pattern applies to a new
  axis) reads as **Architectural**, which requires pausing for user
  confirmation of options before any ADR file is written — not something
  this read-only grounding should resolve unilaterally.
- Does **not** clearly trip criterion 3 (SQLite schema/security) — the
  schema (`texture_paths` column) already exists and needs no migration for
  a viewport-only read of already-stored paths. Does not trip criterion 4
  (dependency) on current evidence. The **UI-form gap** (item 3 above,
  giving `PostProcessPanel.tsx`'s Retexture tab the fields FR-POST-02
  already specifies) is arguably **Clarification-class only** — the FRD
  already fully specifies every field; wiring them up doesn't need a new
  ADR, since FR-POST-02-F1..F9 already settles the "what fields" question
  verbatim. The ADR-worthy part is specifically the *viewport channel-toggle
  registry* half, not the form-completion half.

## Open questions

1. Does a channel-toggle belong inside `useViewportControls` as a second
   axis, or as a separate hook/registry paired with it (e.g.
   `useMaterialPreview`) that `AssetPreview3D` composes alongside the
   camera hook? ADR-0006 doesn't address multi-axis registries.
2. What happens when only some channels are present (e.g. Meshy returned
   `base_color` and `normal` but not `metallic`/`roughness`/`emission` for
   a given asset)? `TextureUrl`'s fields are all `Option<String>`
   (`models.rs:232-236`) — a channel-toggle UI needs a defined disabled/
   fallback state per channel, which no doc currently specifies.
3. Should toggling a channel show the raw channel map as flat unlit color
   (a debug/inspector view) or a full re-lit material preview using only
   that channel (e.g. "roughness-only" material)? Neither the FRD nor any
   ADR defines the intended visual semantics — this is a product decision,
   not just an engineering one, and is out of scope for this grounding.
4. Is there any relationship intended between this proposal and Export
   (found to be a total non-functional stub in the parallel gltf-canonical
   grounding)? A GLTF already natively encodes a PBR metallic-roughness
   material; if Export is ever built, its GLTF output and this viewport
   toggle's channel source (`texture_paths`, separate flat files) are two
   different representations of "the same" PBR data that would need to be
   reconciled, but neither this grounding nor any existing doc addresses
   that overlap.
5. Given `PostProcessPanel.tsx`'s Retexture tab currently cannot request
   `enablePbr` at all (no UI field), is there any real-world asset today
   whose `texture_paths` is non-empty, or is the entire download pipeline
   (`api.rs:184-219`) currently unreachable in practice because nothing in
   the UI ever sends a request that would cause Meshy to return
   `texture_urls`? This grounding did not find evidence either way (no DB
   inspection performed; read-only static analysis only) — worth checking
   before scoping any implementation.
