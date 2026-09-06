# Grounding Memo — Concept 04: Geometry, Remeshing & LOD Suite

Date: 2026-09-05
Status: Read-only grounding research. No implementation, schema, or doc changes made.
Scope: the audit's proposal for (a) interactive polygon-count reduction
preserving UV seams/hard edges, (b) a quad-dominant-vs-triangle retopology
toggle, and (c) automated LOD cascade generation (LOD0/LOD1/LOD2) packaged
into a single GLTF asset.

---

## Current state

### `PostProcessPanel.tsx` — Remesh and Convert tabs, read in full

`src/components/generate/PostProcessPanel.tsx:1-202` (entire file read).

**Remesh tab (`:123-127`, handler `:47-54`) sends only `inputTaskId`:**

```ts
function handleRemesh() {
  if (!inputTaskId.trim()) return toast.error('Input task ID required');
  const body: RemeshRequest = { inputTaskId: inputTaskId.trim() };
  remeshMutation.mutate(body, { ... });
}
```

The Remesh tab's entire UI (`:123-127`) is a single `<Button>` — "Remesh
Model." There is no topology selector, no polycount slider/input, no
decimation-mode selector, no target-format checkboxes, and no alpha-thumbnail
toggle anywhere in the component. `RemeshRequest`'s other five fields
(`targetFormats`, `topology`, `targetPolycount`, `decimationMode`,
`alphaThumbnail` — see below) are never referenced in this file at all
(confirmed by reading the file in full; the only field constructed is
`inputTaskId`).

**Convert tab (`:137-141`, handler `:65-75`) sends a hardcoded format pair,
no format-selection UI:**

```ts
function handleConvert() {
  if (!inputTaskId.trim()) return toast.error('Input task ID required');
  const body: ConvertRequest = {
    inputTaskId: inputTaskId.trim(),
    targetFormats: ['glb', 'fbx'] as ExportFormat[],
  };
  convertMutation.mutate(body, { ... });
}
```

Same pattern: the Convert tab's UI (`:137-141`) is a single `<Button>` —
"Convert Model." `targetFormats` is hardcoded to `['glb', 'fbx']` in code;
there is no checkbox group, no `<Select>`, nothing letting the user choose
which formats to convert to.

By contrast, the **Resize** tab (`:142-193`) *does* have real form controls
— a mode `<Select>`, a numeric `<Input>`, and an origin `<Select>` — proving
the panel's author knows how to build form inputs when they did; Remesh and
Convert simply don't have them. This directly falsifies the audit's
"Current Implementation" bullet claiming "form inputs for target polycount
and format conversion in PostProcessPanel.tsx" — no such inputs exist in
this file. This is the third "looks implemented but isn't" finding this
session (after the two noted in concept-08 and concept-09's memos).

### `RemeshRequest`/`ConvertRequest` TypeScript interfaces — full fields already exist

`src/lib/meshy-types.ts:164-172`:

```ts
export interface RemeshRequest {
  inputTaskId?: string;
  modelUrl?: string;
  targetFormats?: ExportFormat[];
  topology?: 'quad' | 'triangle';
  targetPolycount?: number;
  decimationMode?: 1 | 2 | 3 | 4;
  alphaThumbnail?: boolean;
}
```

`src/lib/meshy-types.ts:189-193`:

```ts
export interface ConvertRequest {
  inputTaskId?: string;
  modelUrl?: string;
  targetFormats: ExportFormat[];
}
```

`ConvertRequest` has no topology/polycount/decimation fields at all (by
design — Convert is a pure format-conversion endpoint per FRD/TDD, not a
geometry-reduction one). `RemeshRequest` already has every field the audit's
proposal names for "interactive polygon-count reduction" and the
"quad-dominant-vs-triangle toggle": `targetPolycount` and `topology`. **The
type layer is complete; the UI layer at `PostProcessPanel.tsx` simply never
surfaces these fields.**

### Rust-side `RemeshRequest`/`ConvertRequest` and `decimationMode` — verified real and wired

`docs/rust_type_definitions.md:590-613` (§4.5 `RemeshRequest`):

```rust
/// Request body for remeshing an existing model. Mirrors TDD §6.2
/// `RemeshRequest`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemeshRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_task_id: Option<String>,
    // ... model_url ...
    #[serde(skip_serializing_if = "Option::is_none")]
    pub topology: Option<Topology>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_polycount: Option<i64>,
    /// Valid values: `1`, `2`, `3`, `4`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decimation_mode: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alpha_thumbnail: Option<bool>,
}
```

`decimationMode`/`decimation_mode` is confirmed **real and already wired**
as a cloud-request field — not a placeholder — appearing identically at
`docs/rust_type_definitions.md:429` (on `TextTo3DPreviewRequest`'s inline
remesh sub-fields) and `:610` (on `RemeshRequest` itself), each documented
"Valid values: `1`, `2`, `3`, `4`." This matches concept-08's memo finding
verbatim — cited, not re-derived. A shared `Topology` enum is defined at
`docs/rust_type_definitions.md:210-217` ("Mesh topology style for
retopology/remesh operations... Mirrors the `topology?: 'quad' \| 'triangle'`
inline union used by `TextTo3DPreviewRequest`, `ImageTo3DRequest`,
`MultiImageTo3DRequest`, and `RemeshRequest`") and reused across all four
request types (`:422-425`, `:513-516`, `:565-568`, `:604-607`) — confirming
topology-toggle plumbing is a cross-cutting, already-established pattern in
this codebase for generation-time requests, not something novel to invent
for Remesh.

`ConvertRequest` (`docs/rust_type_definitions.md:651-662`, §4.7): only
`input_task_id`, `model_url`, and `target_formats` — no topology/polycount
fields, confirming Convert is deliberately a separate, narrower concern from
Remesh.

### FRD FR-POST-01 — full entry read, confirms UI gap is a spec violation, not a spec gap

`docs/feature_requirements_documentation.md:1621-1664` (full entry read):

- FR-POST-01-F2: "Target formats: GLB, FBX, OBJ, USDZ, BLEND, STL, 3MF"
- FR-POST-01-F3: "Topology: quad or triangle (default: triangle)"
- FR-POST-01-F4: "Target polycount: 100–300,000 (default: 30,000)"
- FR-POST-01-F5: "Decimation mode: 1 (ultra), 2 (high), 3 (medium), 4 (low)"
- FR-POST-01-F6: "Alpha thumbnail toggle"
- FR-POST-01-F7: "Credit cost estimate: 'Cost: 5 credits'"

None of F2–F7 are implemented in `PostProcessPanel.tsx`'s Remesh tab (only a
single button exists, per above). **This is not an undocumented feature gap
— the FRD explicitly specifies these controls as Must-Have (Phase 3,
`:1625-1626`) acceptance criteria, and the shipped code does not meet them.**
This elevates the finding from "audit's claim is imprecise" to "shipped code
fails its own written spec."

Also relevant, confirming the polycount/topology/decimation-mode fields are
used consistently across the app, not unique to Remesh: FR-GEN-01-F4
(`:1282`, generation-time remesh toggle "shows topology + polycount +
decimation mode when enabled") and FR-GEN-07-F3 (`:1601`, "Polycount slider:
range 100–300,000"). The generation panels' shared-control note
(`:1573`, "Shared form control components used across all generation
panels: model selector, polycount slider, format checkboxes, pose selector,
PBR toggle") implies these controls may already exist as reusable components
elsewhere in the generation flow — this memo did not verify whether such
shared components exist and are simply not being reused in
`PostProcessPanel.tsx`, or whether they don't exist at all (see Open
Questions).

## Gap vs. proposal, split by sub-feature

### (a) Remesh-UI-gap — polygon-count reduction and quad/triangle toggle

**This is a UI-only gap on top of an already-real cloud endpoint.** Every
field the audit's proposal needs (`topology`, `targetPolycount`,
`decimationMode`) already exists, typed and serde-mapped, on both the
TypeScript (`meshy-types.ts:164-172`) and Rust (`rust_type_definitions.md
:597-613`) sides, and is already sent to Meshy's real `/v1/remesh` endpoint
per FRD `:1641` ("a POST request is sent to /v1/remesh"). Closing this gap
means adding form controls to `PostProcessPanel.tsx`'s Remesh tab (a
`<Select>` for topology, a slider/`<Input>` for polycount, a `<Select>` for
decimation mode) that construct and pass the already-existing `RemeshRequest`
fields — the same shape of work the Resize tab (`:142-193`) already
demonstrates in this same file. **No new Rust code, no new dependency, no
new IPC command, and no schema change is needed for this sub-feature** — it
is a frontend-only, single-file, `PostProcessPanel.tsx`-scoped change.

One caveat: the proposal's phrase "preserving UV seams/hard edges" is *not*
a field on `RemeshRequest` anywhere in the type or Rust definitions (only
`topology`, `targetPolycount`, `decimationMode`, `alphaThumbnail`,
`targetFormats` exist). If Meshy's `/v1/remesh` endpoint has no
seam/hard-edge-preservation parameter, this half of the proposal cannot be
satisfied by exposing more UI for the existing cloud request — it would
require either (i) a Meshy API capability this repo's docs don't disclose
(out of scope to verify — Meshy's raw API reference wasn't in the grounding
scope), or (ii) local geometry processing, which folds into sub-feature (b)
below.

### (b) LOD-cascade-generation-and-packaging — 100% net-new, no existing endpoint or local capability

**Confirmed via multiple independent searches: nothing resembling "LOD"
exists anywhere in this codebase or its docs.**

- `TaskType` enum (`src-tauri/src/provider/types.rs:27-165`, all 30 wire
  variants read in full, matching the exhaustiveness test at line 167
  `assert_eq!(wire_values.len(), 30, ...)`) has no `Lod`/`LevelOfDetail`
  variant and no variant name resembling it. The full variant list:
  `TextTo3dPreview`, `TextTo3dRefine`, `ImageTo3d`, `MultiImageTo3d`,
  `Retexture`, `Remesh`, `Convert`, `Resize`, `UvUnwrap`, `Rig`, `Animate`,
  `TextToImage`, `ImageToImage`, `PrintMultiColor`, `PrintAnalyze`,
  `PrintRepair`, plus 14 `CreativeLab*` variants. **Zero relation to LOD
  generation.**
- Grepping `LOD|level of detail|LOD0|LOD1|LOD2|quad-dominant|retopology`
  case-insensitively across all of `docs/` (see Precedent Search Record
  below) surfaces only: the word "retopology" used generically in
  `docs/rust_type_definitions.md:210` (as a doc-comment label for the
  existing `Topology` enum, not a retopology *feature*) and in
  `docs/adr/0006-viewport-control-registry.md:75` ("real retopology" used
  as an example of future server-side-processing-dependent work, not a
  planned feature — see that ADR's exact wording in the Precedent Search
  Record). No other match anywhere in `docs/` for any LOD-related term.
- Grepping `src/` for any GLTF-**writing** code (`GLTFExporter`, `Exporter`,
  any export-oriented usage) found **zero matches**. The only GLTF-related
  code in `src/` is `useGLTF`/`useGLTF.clear` from
  `@react-three/drei/core/Gltf.js`
  (`src/components/gallery/AssetPreview3D.tsx:13,46,51`), which is
  exclusively a **read/render** hook for the 3D preview viewport — it loads
  and displays an existing GLB, it does not author, merge, or write one.
  This directly confirms the task instructions' hypothesis: the frontend
  has no GLTF-authoring capability today, only GLTF-consuming capability.
- "LOD cascade generation" requires, at minimum: (i) generating 2-3
  separate reduced-polycount mesh variants (a Remesh-like operation,
  repeated 2-3x per source asset), and (ii) packaging all variants as
  named mesh/node entries inside **one** `.gltf`/`.glb` container (typically
  via GLTF extensions like `MSFT_lod` or app-specific multi-mesh nodes) —
  neither of which corresponds to any existing Meshy `TaskType`, any
  existing Tauri command, or any existing frontend library capability in
  this repo. There is no cloud endpoint to call for this (no `TaskType::Lod`
  or equivalent exists per the enum check above) and no local library
  wired up to do it (confirmed zero mesh/GLTF-processing crates in
  `src-tauri/Cargo.toml` per the concept-08 memo, cited below, and zero
  GLTF-writing code in `src/` per this memo's own grep). **This sub-feature
  is unambiguously greenfield on both the cloud-integration axis (no Meshy
  endpoint to wrap) and the local-capability axis (no library to call).**

## Dependency on TASK-0014's local-execution decision

Per this session's concept-08 memo
(`docs/governance/grounding/2026-09-05-concept-08-hybrid-local-execution.md`,
"Candidate approaches" and "Dependency-rule constraints" sections, read in
full — not re-derived here) and the corresponding manifest entry
(`docs/governance/task-manifest.yaml:250-263`, `TASK-0014`, status
`blocked`), MeshyForge has:

- **Zero geometry/mesh-processing crates** in `src-tauri/Cargo.toml` today
  (concept-08 memo, Cargo.toml lines 8-72, verified in full).
- No existing trait method or code path for local (non-cloud) geometry
  operations anywhere in `src-tauri/src/provider/` (concept-08 memo,
  `provider/mod.rs:28-83`, all 8 `TaskProvider` methods are cloud/HTTP or
  provider-metadata operations).
- An explicit, unresolved ADR task (`TASK-0014`, `docs/governance
  /task-manifest.yaml:250`) whose own title states it must "decide
  local-processing dependency strategy (native Rust crate vs. WASM vs.
  status quo) **before any local geometry feature is built**," and whose
  notes (`:262`) name this Concept (#4, Geometry/LOD Suite) explicitly as a
  downstream consumer of that decision: *"this task's outcome is relevant
  input for any future work on Concepts #4 (Geometry/LOD Suite)... since
  all of them ask 'should this operation run locally' without yet having an
  answer to 'how would MeshyForge run anything locally at all.'"*

**Consequence for this proposal:** sub-feature (a) (Remesh UI gap) has *no*
dependency on TASK-0014 — it is a pure frontend change against the existing
cloud `/v1/remesh` endpoint, regardless of how that ADR resolves. Sub-feature
(b) (LOD cascade generation) is **directly blocked** on TASK-0014's outcome
if any part of LOD-variant generation is intended to run locally (avoiding
2-3x the credit cost of repeated cloud Remesh calls, which is presumably
part of the audit's motivation, though this memo did not verify that
motivation is stated explicitly in the audit text) — any new geometry crate
choice must clear DEP-06 (license allowlist: MIT/Apache-2.0/ISC/BSD only)
and DEP-09 (transitive CVE floor) per the concept-08 memo's citation of
`Github_Repository_Expectations.md` §13.1, lines 993 and 996. If LOD
generation is instead resolved as "call Meshy's cloud Remesh endpoint N
times at different target polycounts, then locally merge the N downloaded
GLBs into one packaged file," the dependency shifts to a **GLTF-merging/
authoring** capability specifically (a narrower need than general mesh
decimation) — this still requires a new crate or new frontend library with
no precedent in this repo, but sidesteps the decimation-algorithm portion
of TASK-0014's scope. This fork is itself worth flagging to whoever scopes
the eventual work package (see Open Questions).

## Precedent search record

Exact terms searched, files/dirs checked, and results:

| Term(s) | Where searched | Result |
|---|---|---|
| `LOD`, `level of detail`, `LOD0`, `LOD1`, `quad-dominant`, `quad dominant`, `retopology`, `retopo` (case-insensitive) | entire `docs/` tree (recursive grep) | 5 hits total. `docs/rust_type_definitions.md:210` — doc comment "Mesh topology style for retopology/remesh operations" (labels the existing `Topology` enum used by Remesh-family requests; not a distinct feature). `docs/governance/task-manifest.yaml:92,262` — task-manifest prose referencing "Geometry/LOD Suite" as this concept's own name (self-referential, not precedent). `docs/governance/grounding/2026-09-05-concept-08-hybrid-local-execution.md:7` — that memo's own scope note naming "Geometry/LOD Suite" as a sibling grounding (self-referential). `docs/adr/0006-viewport-control-registry.md:75` — "require server-side processing (real retopology, AI-driven texture..." used as a *rhetorical example* of hypothetical future server-dependent viewport features, not a planned retopology feature. **No hit anywhere describes an LOD cascade, a quad-dominant retopology toggle as a feature, or LOD0/1/2 naming as an actual planned capability.** |
| `Remesh`, `topology`, `polycount`, `poly count`, `polygon count` (case-insensitive) | `docs/feature_requirements_documentation.md` | Confirms FR-POST-01 (Remesh, `:1621-1664`) and FR-GEN-01/03/07 (generation-time remesh toggle + shared polycount slider, `:1272-1601`) as the only Remesh/topology/polycount feature entries. No FR entry for LOD anywhere in the file (the same grep pass that found the Remesh hits found no LOD-related lines). |
| `TaskType` enum (all 30 variants) | `src-tauri/src/provider/types.rs:27-165` | No `Lod`/`LevelOfDetail` variant; confirmed exhaustive via the file's own test asserting `wire_values.len() == 30`. |
| `useGLTF`, `GLTFLoader`, `Exporter` | entire `src/` tree | Only `useGLTF`/`useGLTF.clear` hits, all in `src/components/gallery/AssetPreview3D.tsx` (and its test file) — a read/render hook, not an authoring one. Zero `Exporter`/`GLTFExporter`/any export-oriented GLTF code anywhere in `src/`. |
| `GLTFExporter`, `new GLTF`, `exportGLTF`, `toGLTF` (case-insensitive) | entire `src/` tree | Zero matches. |
| — | `docs/adr/*.md` (all existing ADRs) | `0006-viewport-control-registry.md` is the only ADR mentioning "retopology," and only as an illustrative aside (`:75`), not a decision or planned feature. No ADR covers LOD, mesh decimation UI, or GLTF multi-mesh packaging. |

**Negative result, stated explicitly:** MeshyForge's planning documentation
contains no prior mention, proposal, or discussion of an LOD cascade, LOD0/
LOD1/LOD2 naming, a quad-dominant retopology toggle as a distinct feature,
or multi-mesh GLTF packaging, anywhere in `docs/`. The only "retopology"-
adjacent concept that exists in code or docs is the already-wired
`topology: quad | triangle` field on the Remesh-family request types
(§Current state above) — which the audit's own "toggle" language may in
fact be describing, conflating the already-real Remesh topology field with
a net-new LOD-packaging capability that doesn't exist. This distinction
(single-mesh topology choice vs. multi-mesh LOD cascade) is the crux of
this memo's sub-feature split.

## Preliminary needs-an-ADR classification

Per `.claude/skills/adr-log/SKILL.md` Step 2 (`SKILL.md:45-91`), the two
sub-features classify very differently:

**(a) Remesh UI gap:** Trips **no** Step 2 criterion. It is a single-file,
single-module (`PostProcessPanel.tsx`) frontend change using
already-existing typed fields (`RemeshRequest.topology`/`targetPolycount`/
`decimationMode`) against an already-existing, already-wired cloud endpoint.
It does not cross the IPC boundary in a new way (the command
`create_remesh`/`useCreateRemesh` already exists and is already called by
this exact file), does not touch the SQLite schema, does not add a
dependency, and is cheaply reversible. Per Step 2's own framing ("the answer
is quotable verbatim from a doc section... local to one file and cheaply
reversible"), this is an **inline-only case — no ADR needed.** It is,
however, a straightforward FR-POST-01-F2 through F7 compliance gap that
`validate-implementation` or a normal PR would catch.

**(b) LOD cascade generation/packaging:** Trips **at least three** Step 2
criteria:

1. **Criterion 1** (crosses IPC boundary / binds >=2 modules): any LOD
   feature needs new coordination between the frontend (triggering N
   Remesh-style operations or one new command), a new or repurposed Tauri
   command, and (if packaging happens locally) new backend GLTF-authoring
   logic — a new module boundary that doesn't exist today.
2. **Criterion 3** (touches SQLite schema / documented residual risk,
   arguably): packaging LOD0/1/2 into a single GLTF changes what a
   "downloaded asset" *is* — today `file_paths` (per the concept-09 memo,
   `001_initial.sql:16-17`) maps one key per **format**, not per LOD level;
   representing 3 LOD variants inside one GLB file may need no schema
   change (they'd live inside the one `glb` file's internal node graph) or
   may need new asset-metadata tracking (e.g., "does this asset have an LOD
   cascade") — this is a real open schema-policy question, not a given.
3. **Criterion 4** (dependency), **conditionally**: triggered if local
   GLTF-authoring/mesh-decimation is the chosen implementation path (new
   Cargo crate, subject to DEP-06/DEP-09 per the concept-08 memo); not
   triggered if the entire feature is implemented as N sequential calls to
   Meshy's existing cloud Remesh endpoint followed by a purely
   metadata-level "these N assets are an LOD set" grouping with no new
   binary packaging at all (a materially smaller, though arguably
   proposal-diverging, interpretation — see Open Questions).

Per Step 5 (`SKILL.md:116-122`), an Architectural/Dependency question of
this shape must pause for user confirmation before any ADR is drafted or
written — consistent with this memo's read-only, no-file-touched scope.
This memo does not draft ADR options (that is adr-log's job, not a
grounding memo's); it only establishes that sub-feature (b) needs one and
sub-feature (a) does not.

## Open questions

1. **Does the audit's "quad-dominant-vs-triangle retopology toggle" mean
   the already-existing `RemeshRequest.topology: 'quad' | 'triangle'`
   field** (just needing UI exposure, sub-feature (a)), **or a genuinely
   new local retopology algorithm** offering quality/control beyond
   whatever Meshy's cloud Remesh already provides? The audit's proposal
   text (as summarized in this task's Background) doesn't disambiguate, and
   this repo's docs don't disclose Meshy's internal remesh algorithm
   (carried from the concept-08 memo). This materially changes scope: the
   first reading is a small UI PR; the second is a new local
   geometry-algorithm capability.
2. **Does "LOD cascade... packaged into a single GLTF asset" require true
   binary GLTF authoring** (merging 3 mesh variants into one `.glb`'s node
   graph, e.g. via an `MSFT_lod`-style extension), **or would a lighter
   "3 separate GLB files grouped by metadata" implementation satisfy the
   proposal's intent**? The former is the greenfield GLTF-authoring problem
   this memo documents as having zero precedent; the latter is closer to
   "run Remesh 3x and tag the results," which is a much smaller
   (though still net-new relative to today's single-remesh-per-click UI)
   feature. The audit's own wording ("packaged into a single GLTF asset")
   reads as the former, but this is this memo's interpretation, not a
   confirmed requirement.
3. **Does `docs/feature_requirements_documentation.md:1573`'s "shared form
   control components used across all generation panels" (polycount slider,
   format checkboxes, etc.) already exist as reusable components elsewhere
   in the codebase**, meaning the Remesh-UI-gap fix (sub-feature (a)) is
   "import and wire up an existing shared component" rather than "build a
   slider from scratch"? This memo did not search for such shared
   components outside `PostProcessPanel.tsx` — that search is in scope for
   whoever picks up sub-feature (a), not this grounding pass.
4. **What is Meshy's actual server-side Remesh capability regarding
   "preserving UV seams/hard edges"**? No field for this exists on
   `RemeshRequest` in either the TS or Rust definitions found in this repo.
   If Meshy's API has no such parameter, the audit's UV-seam-preservation
   language cannot be satisfied merely by adding UI for existing fields —
   it would require either an undisclosed Meshy API capability (out of
   scope here — this memo did not fetch Meshy's live API reference) or new
   local geometry logic, folding this piece into the sub-feature (b)
   dependency chain regardless of how the LOD-cascade question resolves.
5. **How does sub-feature (b) interact with the still-unresolved
   GLTF-canonical-storage question** from the concept-09 memo
   (`docs/governance/grounding/2026-09-05-concept-09-gltf-canonical.md`)?
   That memo found Export is a complete non-functional stub and that no
   canonical single-format storage policy exists yet. An LOD-packaged GLTF
   asset would need to slot into whatever `file_paths`/export architecture
   that separate, not-yet-resolved question lands on — this memo flags the
   overlap (both are GLTF-authoring-adjacent) without attempting to
   resolve either question itself, per this task's scope.
