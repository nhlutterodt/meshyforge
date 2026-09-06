# Grounding: "Full Print Workbench" proposal (non-manifold repair, wall-thickness heatmap, hollowing, multi-toolhead splitting)

Date: 2026-09-05
Status: Read-only grounding memo (no implementation, no ADR filed)

## Current state (file:line)

**PrintPanel.tsx is a thin form over three existing Meshy cloud endpoints — no
local geometry processing, no viewport visualization, no hollowing/drain-hole
UI.** Verified by full read of `src/components/generate/PrintPanel.tsx:1-115`:

- Three tabs: Multi-Color, Analyze, Repair (`PrintPanel.tsx:71-76`).
- Multi-Color tab: an `AssetTaskPicker` for input task ID
  (`PrintPanel.tsx:63-70`) + a max-colors slider (1-16, default 4)
  (`PrintPanel.tsx:20,79-90`) + a button that calls
  `useCreateMultiColorPrint().mutate({ inputTaskId, maxColors })`
  (`PrintPanel.tsx:22,26-36`).
- Analyze tab: a single button calling
  `useCreateAnalyzePrintability().mutate({ inputTaskId })`
  (`PrintPanel.tsx:23,38-47`). **No result rendering at all** — no status
  badge, no issue count, no metrics table for watertight/volume/non-manifold-
  edges/degenerate-faces/hole-count. The component only fires the mutation
  and toasts success/failure (`PrintPanel.tsx:43-46`); there is no report
  display in this file, and no other component under
  `src/components/generate/` was found rendering a printability report
  (confirmed by the full read — `PrintPanel.tsx` is the entire panel).
- Repair tab: a single button calling
  `useCreateRepairPrintability().mutate({ inputTaskId })`
  (`PrintPanel.tsx:24,49-58`). **No result rendering**, and no rendering of
  FR-PRINT-03-F3's required warning text ("Existing textures are removed
  during repair...") anywhere in the file — grepped `PrintPanel.tsx` content
  above in full; the string does not appear.

This is the **third** "looks implemented but isn't" gap found this session
(the audit's "basic form inputs in PrintPanel.tsx" undersells what's missing:
it's not just "basic," the Analyze/Repair tabs create the task and then
display nothing about the result — a bare toast is the entire feedback loop).

**Request/response types** (`src/lib/meshy-types.ts:321-335`):

```ts
export interface MultiColorPrintRequest {
  inputTaskId?: string;
  modelUrl?: string;
  maxColors?: number;
}

export interface AnalyzePrintabilityRequest {
  inputTaskId?: string;
  modelUrl?: string;
}

export interface RepairPrintabilityRequest {
  inputTaskId?: string;
  modelUrl?: string;
}
```

None of these three interfaces has a response/report type in the same file —
searched `meshy-types.ts:315-354` (the `UvUnwrap`/print/download/animation
block) and found no `PrintabilityReport`, `AnalyzePrintabilityResponse`, or
similar. Searched the whole file for `atertight`, `on.?manifold`,
`egenerate`, `oleCount` case-insensitively via the interfaces read — none of
FR-PRINT-02's required report fields (watertight boolean, volume,
non-manifold edge count, degenerate face count, hole count) exist as a typed
field anywhere in the request/response types read. **The FRD's acceptance
criteria for FR-PRINT-02 is unimplemented on the frontend**, not merely
"basic" — there is no typed shape to hold that data even if the backend
returned it.

**Backend commands exist and are registered**
(`src-tauri/src/commands/api.rs`, `src-tauri/src/lib.rs` — both matched
`create_analyze_printability|create_repair_printability|create_multi_color_print`),
consistent with the FRD's declared endpoint mapping:

| FRD ID | Meshy endpoint | Command |
|---|---|---|
| FR-PRINT-01 | `POST /v1/print/multi-color` | `create_multi_color_print` |
| FR-PRINT-02 | `POST /v1/print/analyze` | `create_analyze_printability` |
| FR-PRINT-03 | `POST /v1/print/repair` | `create_repair_printability` |

(`docs/feature_requirements_documentation.md:4145-4147`)

So: **the three basic cloud round-trips (create-task calls) are real and
wired end-to-end (UI button -> hook -> Tauri command -> registered in
`lib.rs`)**. What's missing even within the *existing* scope is the report
display and the repair-warning text the FRD itself requires
(FR-PRINT-02-F2, FR-PRINT-03-F3).

## FRD requirements, read in full

- **FR-PRINT-01** (Multi-Color 3D Print Conversion, Must/Phase 3,
  deps FR-GAL-10): converts a textured model to a multi-color 3MF via
  `/v1/print/multi-color`; max_colors 1-16 default 4; 10-credit cost estimate.
  (`docs/feature_requirements_documentation.md:2030-2067`)
- **FR-PRINT-02** (Analyze Printability, Must/Phase 3, deps FR-GAL-10):
  analyzes for "watertightness, volume, holes, non-manifold edges, degenerate
  faces" via `/v1/print/analyze`; result must display overall status
  (healthy/warning/error), issue count, watertight boolean, volume,
  non-manifold edge count, degenerate face count, hole count; free (no
  credits). (`docs/feature_requirements_documentation.md:2070-2107`)
- **FR-PRINT-03** (Repair Printability, Must/Phase 3, deps FR-PRINT-02):
  repairs non-manifold edges/degenerate faces/holes via `/v1/print/repair`;
  output format matches input; must warn "Existing textures are removed
  during repair. Use Retexture to add them back."; 10-credit cost estimate.
  (`docs/feature_requirements_documentation.md:2110-2147`)

None of the three FR-PRINT sections, nor their acceptance criteria, mention
wall-thickness color visualization, mesh hollowing, drain-hole placement, or
multi-toolhead color splitting. These are the audit's additions, not present
in the current FRD scope for this feature.

## Gap vs. proposal, split by sub-feature

The audit's "Full Print Workbench" proposal bundles four sub-features of very
different character. They must not be flattened into one lump:

### A. Already-real (cloud round-trip exists, UI incomplete)
- **Non-manifold mesh repair** — real today as a *cloud* operation via
  `/v1/print/repair` / `create_repair_printability`
  (`docs/feature_requirements_documentation.md:4147`), triggered from
  `PrintPanel.tsx:49-58`. Gap: no result/report rendering, no
  FR-PRINT-03-F3 warning text shown in the UI (both required by the FRD
  today, unrelated to the audit's proposal).
- **Watertight-closing / printability analysis** — real today as a cloud
  operation via `/v1/print/analyze` / `create_analyze_printability`
  (`docs/feature_requirements_documentation.md:4146`), triggered from
  `PrintPanel.tsx:38-47`. Gap: FR-PRINT-02's entire report display (status
  badge, issue count, metrics table with the 5 named fields) is unbuilt —
  confirmed no such rendering or response type exists
  (`PrintPanel.tsx` full read; `meshy-types.ts:327-330`).

### B. 100% net-new, no existing precedent anywhere in this repo
- **Wall-thickness color-heatmap visualization in the 3D viewport** —
  searched `docs/` (all `.md`) and `docs/adr/` for "wall thickness",
  "wall-thickness", "heatmap": zero hits outside this session's own two
  grounding memos (`docs/governance/grounding/2026-09-05-concept-08-hybrid-
  local-execution.md`, and the FRD hit at line ~2340 which is unrelated —
  see below). No existing type, component, shader, or viewport hook computes
  or renders a per-face/per-vertex thickness value anywhere in `src/`.
- **Mesh hollowing with configurable wall thickness and drain-hole
  placement** — searched `docs/` for "hollow" (case-insensitive): the only
  hit besides the two grounding memos is FR-CLAB-06 (Creative Lab — Lamp,
  `docs/feature_requirements_documentation.md:2331-2364`), whose build stage
  has `thickness_mm` and `cut_amount_percent` parameters and produces a
  "hollow STL lampshade." This is a **narrow, unrelated precedent**: it is a
  parameter set sent to a Meshy Creative Lab cloud endpoint
  (`/openapi/creative-lab/lamp/v1/build`, same FRD block, Source Alignment
  row), not a local hollowing algorithm, and it hollows a lamp-specific
  generative shape, not an arbitrary user mesh with drain-hole placement.
  There is no general-purpose local or cloud hollowing feature for arbitrary
  print-workbench meshes anywhere in the FRD, TDD excerpts, or ADRs searched.
- **Multi-toolhead color splitting before STL/3MF export** — searched
  `docs/` for "multi-toolhead", "multi toolhead": zero hits anywhere,
  including the two session grounding memos. FR-PRINT-01's existing
  "multi-color" feature is a single cloud call
  (`/v1/print/multi-color`) that returns one 3MF file
  (`docs/feature_requirements_documentation.md:2049-2052`) — it does not
  expose toolhead assignment, per-color material mapping, or any splitting
  step as a separate concept. "Multi-color" (existing, cloud, single-file
  output) and "multi-toolhead splitting" (proposed, unclear locus, implies
  per-material file/geometry partitioning) are different scopes that the
  audit's phrasing risks conflating.

Net: of the four sub-features named in the proposal, two map onto features
that already exist as *cloud* task types with incomplete frontends (analyze,
repair), and two (heatmap, hollowing+drain-holes) plus the export-splitting
angle of the third (multi-toolhead) are wholly new capability with no
precedent, no types, no endpoints, and per the parallel Cargo.toml grounding,
no geometry-processing crate to build them on locally.

## Dependency on TASK-0014's local-execution decision

Per the parallel grounding
(`docs/governance/grounding/2026-09-05-concept-08-hybrid-local-execution.md:184-189`),
`PrintAnalyze` and `PrintRepair` are classified as **plausible local-execution
candidates** (manifold checks, wall-thickness, hole-filling are geometry-
inspection operation categories) — but this is explicitly a plausibility
claim about the operation *category*, not a confirmed statement of what
Meshy's cloud endpoint actually does internally (same memo, line 181-183,
216-219: "This repo's docs do not disclose Meshy's internal implementation").
`PrintMultiColor` is flagged likely cloud-side (probable generative
texture/color assignment) (same memo, lines 202-204).

This grounding's findings sharpen that split for the print-workbench
proposal specifically:
- If TASK-0014 resolves toward local execution for Analyze/Repair, the
  **wall-thickness heatmap** (which needs per-face thickness data, the same
  kind of computation `PrintAnalyze` would need if brought local) and
  **hollowing** (a mesh-modification operation adjacent to `PrintRepair`'s
  local-candidate category) would ride on the same new geometry-processing
  dependency that decision would introduce. They are not automatically
  included by that decision, though — heatmap *rendering* and hollow+drain-
  hole *placement logic* are both additional scope beyond "detect
  non-manifold edges," even if they reuse the same underlying mesh
  representation.
- If TASK-0014 resolves toward keeping these cloud-side, the heatmap/
  hollowing proposal would require either (a) Meshy's API exposing this data/
  operation (unconfirmed, out of scope for this repo's docs), or (b) a
  separate local dependency decision made independently of TASK-0014.
- Multi-toolhead splitting's cloud-vs-local locus is not addressed by
  TASK-0014's memo at all (it only classified `PrintMultiColor` as a whole,
  not a hypothetical toolhead-splitting sub-step) — this is a genuinely open
  question this grounding cannot resolve from existing docs.

**This proposal cannot be scoped or estimated independently of TASK-0014's
outcome** for at least the heatmap and hollowing sub-features.

## Viewport-registry fit question

`docs/adr/0006-viewport-control-registry.md` (Status: Accepted) scopes its
Decision explicitly: "a typed `useViewportControls` registry hook as the
single seam for client-side, local, free, non-destructive **viewport
controls** (rotate/pan/zoom... plus reset-view and scale-preview)"
(`0006:63-67`). Its rule VP-13 (proposed) is scoped to "Client-side viewport
controls (reset-view, scale-preview, and any future local/free/non-
destructive **render control**)" (`0006:83-86`) — i.e., camera/interaction
state, not surface appearance.

The actual implementation confirms this scope: `useViewportControls.ts`
(`src/hooks/useViewportControls.ts:1-100`) owns exactly camera distance,
`OrbitControls`/`BoundsApi` refs, `zoomIn`/`zoomOut`/`resetView` — pure
camera-transform state. There is no material, shader, geometry-attribute, or
mesh-coloring concept anywhere in the hook.

A wall-thickness heatmap is a **per-face/per-vertex color overlay computed
from mesh geometry and applied as a material/shader pass** — it changes what
the mesh *looks like* (its surface data), not how the *camera* is positioned
or how the user interacts with the view. This is a categorically different
kind of viewport extension than anything ADR-0006 was scoped around:

- ADR-0006's registry pattern (a hook returning camera-control callbacks and
  refs) has no natural slot for "a computed per-vertex color buffer" or "a
  custom `THREE.ShaderMaterial` swapped in over the model's default
  material." Forcing the heatmap into `useViewportControls` would conflate
  "control state" with "render/appearance state," which is exactly the kind
  of scope creep ADR-0006's own Decision text warns against when
  distinguishing *view* changes from *asset* changes (`0006:78-80` — though
  that distinction was drawn for a different purpose, local camera framing
  vs. real dimension changes, it illustrates the ADR's intent to keep the
  registry narrowly about camera/interaction).
- A heatmap overlay is arguably closer to ADR-0003's territory (preview
  lighting — `Environment` preset vs. deterministic local lights, per
  `0006:47`) in that both are about the rendered *appearance* of the model,
  not controls over it — but ADR-0003 was not read in full here (out of this
  grounding's requested scope) and no claim is made about its actual content
  beyond what ADR-0006 cites.

**Preliminary conclusion**: the heatmap is very likely a materially different
architectural question than "add a control to the registry" — it likely
needs its own decision (new component/material layer, where the per-vertex
thickness data comes from, whether it's computed client-side from a loaded
mesh or delivered pre-baked from a cloud analyze call) rather than being
treated as "just another entry in `useViewportControls`." This grounding does
not resolve that question — it only establishes that ADR-0006's existing
registry is not an obvious fit and a fresh ADR-shaped question exists here.

## Precedent search record

Searched (case-insensitive) across `docs/` (all `.md`, recursive) and
`src-tauri/Cargo.toml`:

| Term | Files matched |
|---|---|
| `wall thickness` / `wall-thickness` / `heatmap` / `hollow` / `drain hole` / `multi-toolhead` / `multi toolhead` | `docs/governance/grounding/2026-09-05-concept-08-hybrid-local-execution.md`, `docs/feature_requirements_documentation.md` (FR-CLAB-06 lamp "hollow," unrelated to print-workbench hollowing — see Gap section) |
| `multi.?color` (regex) | 13 files, all either the FR-PRINT-01 feature itself, its cross-references in `implementation_execution_plan.md`/`test_plan.md`/`technical_design_document.md`/`rust_type_definitions.md`/`hook_implementations.md`/`user_guide.md`/`gap_assessment_documentation.md`/`Github_Repository_Expectations.md`/`docs/governance/task-manifest.yaml`, or the concept-08 grounding memo — no hits describing toolhead-level splitting |
| `create_analyze_printability` / `create_repair_printability` / `create_multi_color_print` | `src-tauri/src/commands/api.rs`, `src-tauri/src/lib.rs` (registration confirmed) |
| `useViewportControls` | `src/components/gallery/AssetPreview3D.tsx`, `src/hooks/useViewportControls.ts`, `src/hooks/useViewportControls.test.tsx` — no material/shader/heatmap consumer |
| Geometry/mesh-processing crates (`mesh`, `geometry`, `manifold`, `nalgebra`, `parry`, `obj-rs`, `stl`) | `src-tauri/Cargo.toml` — zero matches (only unrelated `reqwest`/TLS comment lines matched `stl` substring in "TLS"); consistent with, and independently reconfirmed here rather than only cited from, the concept-08 memo's finding of zero geometry-processing crates |

No `docs/adr/*.md` file besides ADR-0006 was found addressing viewport
appearance/material extensions (ADR-0003 was cited by ADR-0006 as covering
lighting only, not read in full in this pass).

## Preliminary needs-an-ADR classification (per `.claude/skills/adr-log/SKILL.md` Step 2)

This grounding does not file an ADR (out of scope per instructions) but
classifies which Step 2 criteria the proposal would trip if/when someone
scopes it for real:

- **Criterion 1** (crosses a module boundary / binds >=2 modules): likely
  trips for the heatmap (new viewport rendering layer, possibly new IPC if
  thickness is computed Rust-side) and for hollowing (new Rust geometry
  module + new Tauri command + new TS types) — not yet certain since no
  design exists, but the shape of the work touches both `src-tauri/src` and
  `src/components`/`src/hooks` at minimum.
- **Criterion 4** (adds/drops a dependency): trips with near-certainty for
  local hollowing/heatmap computation, since the parallel grounding already
  established zero geometry-processing crates exist
  (`Cargo.toml` reconfirmed above) — any local wall-thickness or hollowing
  math requires a new Cargo dependency, which is itself always an ADR under
  DEP-01–DEP-10 (`Github_Repository_Expectations.md` §13.1, per the skill's
  own citation).
- **Criterion 6** (expensive to reverse / likely relitigated): plausible for
  the viewport-registry question above — choosing to bolt a material/shader
  layer onto `useViewportControls` versus giving it its own seam is exactly
  the kind of foundational-UI-architecture choice ADR-0006 itself was filed
  under (`0006:20-23`, "criterion 6... expensive to redo once other panels/
  viewers depend on it").
- **Criterion 3** (touches security posture / schema) is not obviously
  triggered by anything found here, but was not exhaustively checked against
  `security_threat_model.md` in this pass (out of the requested scope).

This is a **preliminary read**, not a Step 3-5 precedent search/options draft
— that work belongs to an actual `adr-log` invocation once someone decides to
scope this proposal, not to this grounding memo.

## Open questions

1. Does Meshy's `/v1/print/analyze` response already return per-face or
   per-region thickness data that a heatmap could render directly (making
   this a rendering-only problem), or would thickness need to be computed
   locally from the raw mesh (making it a geometry-algorithm problem)? Not
   answered by any doc found in this repo — Meshy's response schema for
   `/v1/print/analyze` was not located during this pass (searched
   `meshy-types.ts:315-354`; no response interface exists to inspect).
2. Is "multi-toolhead splitting" meant to be a new step *before* the existing
   `/v1/print/multi-color` call (partitioning geometry by color region prior
   to upload), a new interpretation of that same endpoint's output, or an
   entirely separate local post-processing step on the returned 3MF? The
   audit's phrasing ("before STL/3MF export") assumes an export pipeline
   that the parallel GLTF-canonical grounding found does not exist yet
   (`docs/governance/grounding/2026-09-05-concept-09-gltf-canonical.md`,
   cited per this task's briefing — not independently re-verified in this
   pass) — so multi-toolhead splitting may be blocked on that missing export
   pipeline regardless of where the splitting computation happens.
3. Should FR-PRINT-02's still-missing report display (status badge, metrics
   table) and FR-PRINT-03's still-missing warning text be fixed as
   independent, smaller-scoped work *before* any Full Print Workbench design
   starts, given they're pre-existing Must-Have FRD gaps unrelated to the
   audit's new proposal? Not answered here — a scoping/prioritization
   question for whoever picks this up, not a grounding question.
4. Was ADR-0003 (preview lighting) scoped narrowly enough that it offers a
   closer precedent for "appearance layer over the mesh" than ADR-0006's
   control registry? Not verified — ADR-0003 was only seen second-hand via
   ADR-0006's citation in this pass, not read in full.
