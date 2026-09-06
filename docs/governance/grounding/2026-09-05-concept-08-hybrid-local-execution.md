# Grounding Memo — Concept 08: Hybrid Local Execution Model

Status: grounding only (no decision). Read-only research; no source files were modified.
Scope: whether/how MeshyForge could perform local geometry operations (format
conversion, decimation, geometry inspection, bounding-box math) instead of
always calling the cloud Meshy API. This memo is input context for two
parallel groundings (Geometry/LOD Suite; 3D Printing Workbench) — it does not
recommend an approach.

---

## Current state

**Every task type is cloud-only today. There is no local geometry code path
anywhere in the Rust backend.**

- `src-tauri/Cargo.toml` (full file read, lines 1-81) lists every dependency:
  `tauri` 2, `tauri-plugin-dialog/notification/shell/log` 2,
  `reqwest` 0.12 (json/stream/rustls-tls-native-roots), `serde`/`serde_json` 1,
  `rusqlite` 0.31 (bundled), `keyring` 3, `tokio` 1 (full), `futures-util` 0.3,
  `thiserror` 2, `anyhow` 1, `async-trait` 0.1, `chrono` 0.4, `uuid` 1,
  `log` 0.4, `base64` 0.22; build-dep `tauri-build` 2; dev-deps `wiremock`,
  `tempfile`, `tokio-test`. **No GLTF/GLB parsing crate, no mesh-manipulation
  crate, no decimation crate, no CAD/geometry-kernel crate, and no `wasm-*`
  toolchain crate of any kind is present.** (Cargo.toml lines 8-72, verified
  in full — nothing omitted.)
- `src-tauri/src/provider/mod.rs` lines 28-83: the `TaskProvider` trait
  defines exactly 8 methods — `create_task`, `get_task`, `cancel_task`,
  `get_balance`, `download_file`, `stream_task`, `fetch_animation_library`,
  `allowed_download_hosts`/`endpoint_for` — every one of them either makes an
  HTTP call to the provider or is metadata about the provider (host allowlist,
  endpoint mapping). There is no method on the trait, and no sibling trait
  anywhere in `provider/`, for a local/offline operation.
- `src-tauri/src/commands/api.rs` (1804 lines, header + all `create_*`
  commands read in full, lines 1-543): every `create_*` Tauri command
  (`create_text_to_3d`, `create_image_to_3d`, `create_remesh`,
  `create_retexture`, `create_convert`, `create_resize`, `create_rigging`,
  `create_animation`, `create_text_to_image`, `create_image_to_image`,
  `create_multi_image_to_3d`, `create_uv_unwrap`, `create_multi_color_print`,
  `create_analyze_printability`, `create_repair_printability`) delegates to
  the single shared `create_task_inner` (lines 66-87), which calls
  `provider.create_task(...)` unconditionally — line 79-82. There is no
  branch anywhere that checks task type and takes a local path instead.
  `poll_task_inner` (90-107), `delete_task_inner` (110-126), and
  `stream_task_inner` (463-496) are likewise 100% provider-delegating.
- `download_asset_inner` (129-240) is the closest thing to "local processing"
  in the codebase, but it is pure I/O: it downloads model/thumbnail/texture
  files to disk (lines 148-219) and records paths in SQLite — it does not
  parse, inspect, or transform mesh geometry. The `glb`/`gltf`/`obj`/`mesh`
  string hits in this file (grepped: lines 154, 198, and various test fixtures
  at 646, 949-1313) are all filename/extension string matching for the
  download destination (`model_filename`, `texture_filename` in
  `src-tauri/src/commands/validation.rs`), not geometry code.
- `src-tauri/src/provider/types.rs` lines 27-89 define the `TaskType` enum
  (30 variants, verified against the test at lines 96-175 which asserts
  `wire_values.len() == 30`) — see the Task-type feasibility section below
  for the full list and split.
- **Conclusion:** the "Hybrid Execution Model" proposed by the audit does not
  exist in any form yet. This would be greenfield work — new dependency,
  new trait surface (or new trait method), new command(s), and a new
  frontend decision point for routing local vs. cloud — not a refactor of an
  existing local path.

## Dependency-rule constraints

From `docs/Github_Repository_Expectations.md` §13.1, full table read
(lines 984-997):

- **DEP-06** (line 993): *"No dependency may be added with a license other
  than MIT, Apache-2.0, ISC, or BSD."* This is an allowlist, not a
  case-by-case review — a candidate crate/library with GPL, LGPL, MPL, or a
  custom/viral license fails this rule outright regardless of technical fit.
  Many mature C/C++ geometry kernels (e.g. CGAL is GPL/commercial-dual-license)
  would need explicit scrutiny against this before any WASM-wrapping approach
  could even be considered; the allowed set (MIT/Apache-2.0/ISC/BSD) matches
  the license culture of the Rust crates.io ecosystem far better than the
  C/C++ CAD-geometry-library ecosystem.
- **DEP-09** (line 996): *"No dependency may introduce a transitive
  dependency with a known critical vulnerability (CVSS ≥ 7.0)."* This is a
  transitive-graph check, not just a top-level check — a mesh-processing
  crate with a deep dependency tree (common for crates wrapping native
  geometry libraries, or crates with many parser/codec sub-dependencies)
  raises the audit surface proportionally. `cargo audit`/Dependabot are
  already wired per §12.2 (lines 961-967) and would need to clear on any
  new addition.
- **DEP-10** (line 997): *"The `three` package is pinned to an exact version
  (`"0.170.0"`) because Three.js uses `0.x` versioning where minor versions
  can break."* This is the only existing precedent in the rules for
  overriding the default caret-range policy (DEP-01, line 988, which
  explicitly names `three` as the sole exception). The rationale given is
  narrow and version-scheme-specific (0.x semver instability), not a general
  "geometry libraries get special treatment" rule. **Note (an open
  question, see below): the rule as written does not match the repo** —
  `package.json` line 43 currently pins `three` as `"^0.170.0"` (caret), not
  an exact `"0.170.0"` as DEP-10 states. Any future ADR citing DEP-10 as a
  template should flag this drift rather than assume the documented rule is
  currently enforced in practice.
- **DEP-04/DEP-05** (lines 991-992) also apply and are not geometry-specific:
  any new crate needs an explicit PR-description justification and must
  clear the download-count floor (100 crates.io downloads/wk, or npm 1,000)
  unless justified — relevant because some purpose-built decimation crates
  are low-download niche projects.
- No existing DEP rule addresses **binary size** or **WASM toolchain
  presence** at all — those constraints, if they matter, would need a new
  rule or an ADR-level exception, not an existing one to lean on.

## Precedent search record

Exact terms searched, files/dirs checked, and results:

| Term(s) | Where searched | Result |
|---|---|---|
| `WASM`, `wasm` | `docs/technical_stack_documentation.md` | No matches. |
| `WASM`, `wasm` | `docs/technical_design_document.md` | No matches. |
| `WASM`, `wasm`, `local processing`, `decimation`, `geometry engine`, `mesh processing`, `offline processing` | entire `docs/` tree (recursive grep) | Matches only in `docs/feature_requirements_documentation.md` (lines 1272, 1282, 1637), `docs/test_plan.md` (line 308), `docs/technical_design_document.md` (lines 487, 565 area — actually in `docs/rust_type_definitions.md`), and `docs/rust_type_definitions.md` (lines 429, 610, 893-area). **All matches are the word "decimation" used as the name of a cloud-API request parameter** (`decimationMode` / `decimation mode` — a field sent to Meshy's `/v1/remesh` cloud endpoint per `docs/rust_type_definitions.md` lines 429, 610), not local/offline decimation processing. Verified by reading `docs/technical_design_document.md` lines 880-899, which shows this is cloud command boilerplate (`client.create_task(endpoint, &body)`), confirming the nearby "decimation" hit is unrelated proximity, not a local-processing description.
| `WASM` | entire `docs/` tree | No matches at all (zero hits across every doc, including `docs/adr/`). |
| — | `docs/adr/*.md` (all 6 existing ADRs + README, listed via glob) | No ADR titled or covering hybrid execution, local geometry, or WASM exists (`0001` CI triggers, `0002` signed download origin, `0003` lighting preset, `0004` task provider abstraction, `0005` agentic delivery governance, `0006` viewport control registry — none touch geometry processing). |
| `three`, `wasm`, `gltf`, `mesh` | `package.json` | Only hit: line 43, `"three": "^0.170.0"` — a rendering/viewer library (already used for 3D preview), not a geometry-processing or WASM-toolchain dependency. |

**Negative result, stated explicitly:** MeshyForge's planning documentation
contains no prior mention, proposal, or discussion of WASM, local geometry
processing, a geometry engine, or offline mesh processing anywhere. This
concept has zero documentary precedent to build on — an ADR here would be
starting from a blank slate, not reconciling conflicting prior guidance.

## Candidate approaches

Raw material only — no recommendation, per task instructions.

1. **Native Rust mesh crate (e.g. crates.io ecosystem crates for
   GLTF/GLB I/O and mesh simplification/decimation)** — Tradeoff: best DEP-06
   fit (most such crates are MIT/Apache-2.0/dual-licensed, matching the
   Rust ecosystem norm) and no new WASM toolchain needed since it runs
   natively in `src-tauri`, but maturity/feature-completeness for
   production-grade decimation varies crate-to-crate and would need explicit
   per-crate license/CVE (DEP-06/DEP-09) and download-floor (DEP-05)
   verification before any PR could add one — none currently vetted in this
   repo.
2. **Compile an existing mature C/C++ geometry library to WASM, call it from
   the Rust backend or the frontend** — Tradeoff: could reuse decades of
   battle-tested geometry-kernel code (better maturity than the current
   pure-Rust mesh ecosystem for some operations), but the project has zero
   WASM toolchain today (no `wasm-pack`, no `wasm32-*` target references
   anywhere in `Cargo.toml` or `package.json`), so this is not a drop-in —
   it's new build infrastructure; also many candidate C/C++ geometry kernels
   carry GPL/LGPL licensing that would fail DEP-06 outright and need
   substitution with a permissively-licensed alternative before this path is
   even viable.
3. **Frontend/browser WASM module (compiled once, shipped as a static
   asset, called from React/TS rather than Rust)** — Tradeoff: keeps the
   Rust backend untouched (no new Cargo.toml entries, sidesteps DEP-02/06/09
   entirely since it's not a Cargo dependency), but shifts CPU-heavy geometry
   work onto the renderer process/main thread of a Tauri webview, and
   MeshyForge's Github_Repository_Expectations dependency rules are written
   almost entirely around `Cargo.toml`/`package.json` entries — a bundled
   static WASM binary asset would need its own governance answer (how is it
   vetted/updated/audited?) that DEP-01 through DEP-10 don't currently cover.
4. **Status quo — keep all geometry operations cloud-side (no new
   dependency at all)** — Tradeoff: zero new dependency-rule exposure, zero
   binary-size impact, zero new toolchain, but does not address the audit's
   stated goal (eliminating credit spend on non-AI operations) at all; this
   is the only option requiring no ADR and no code change to the local-vs-cloud
   boundary.

## Task-type feasibility split

Based on the 30-variant `TaskType` enum in
`src-tauri/src/provider/types.rs` lines 27-89 (confirmed exhaustive by the
test at line 167: `assert_eq!(wire_values.len(), 30, ...)`):

**Plausible local-execution candidates** (pure geometry/format math, no
generative AI inference required in principle):
- `Convert` (line 41) — format conversion (e.g. GLB↔OBJ↔FBX) is
  well-established as a local operation in mesh-processing libraries broadly.
- `Resize` (line 43) — bounding-box/scale math is arithmetic on existing
  geometry, not inference.
- `Remesh` (line 39) — decimation/polygon-count reduction and
  topology remapping (quad/triangle) are algorithmic, not generative,
  operations in most mesh-processing toolchains (though Meshy's specific
  remesh implementation may use learned methods server-side — this repo's
  docs do not disclose Meshy's internal remesh algorithm, so this is a
  plausibility claim about the *operation category*, not a claim about
  Meshy's implementation).
- `PrintAnalyze` (line 56) — printability analysis (manifold checks,
  wall-thickness, overhangs) is geometry inspection, plausible locally.
- `PrintRepair` (line 58) — non-manifold repair/hole-filling is a
  well-known local mesh-processing operation category (this is exactly what
  the parallel "3D Printing Workbench" grounding is likely to depend on this
  memo for).
- `UvUnwrap` (line 45) — UV unwrapping is algorithmic geometry processing,
  though quality varies significantly by algorithm sophistication.

**Inherently cloud-only** (require generative/learned AI inference that
this repo has no local model for, and the audit's own framing explicitly
reserves cloud calls for this category):
- `TextTo3dPreview` / `TextTo3dRefine` (lines 28-31) — generative text-to-3D.
- `ImageTo3d` / `MultiImageTo3d` (lines 32, 34) — generative image-to-3D.
- `Retexture` (line 36) — AI texture generation/inference.
- `Rig` (line 46) — auto-rigging inference.
- `Animate` (line 48) — animation generation/inference.
- `TextToImage` / `ImageToImage` (lines 50, 52) — generative image models.
- `PrintMultiColor` (line 54) — multi-color print generation (appears to
  involve generative texture/color assignment, not pure geometry — treated
  as cloud-side pending confirmation from Meshy's own API docs, which are
  out of scope for this grounding pass).
- All 14 Creative Lab variants (lines 61-88,
  `CreativeLabKeychainPrototype/Build` through
  `CreativeLabKeycapPrototype/Build`) — these are described in the enum's
  own doc comment (line 60) as "same granularity as MeshyType" generative
  product-form endpoints; nothing in the codebase suggests any of the
  14 are geometry-math-only rather than generative.

## Open questions

- Does Meshy's actual server-side `Remesh`/`Convert`/`Resize`/`PrintAnalyze`/
  `PrintRepair` implementation use generative/learned methods internally, or
  classical geometry algorithms? This repo's docs do not disclose Meshy's
  internal implementation, so the "plausible local candidate" list above is
  a claim about the operation category in general, not a verified claim
  about parity with Meshy's specific output quality.
- DEP-10 as written (`docs/Github_Repository_Expectations.md` line 997)
  claims `three` is pinned to an *exact* version, but `package.json` line 43
  currently shows `"^0.170.0"` (caret range). This drift should be resolved
  (doc-sync or a corrected ADR precedent) before DEP-10 is cited as a
  template for a new geometry dependency's pinning strategy.
- No DEP rule currently addresses WASM toolchain adoption or binary-size
  budgets — if a WASM-based candidate approach were ever pursued, this
  memo's Github_Repository_Expectations reading found no existing rule to
  govern it; that would need to be a new rule or an explicit ADR carve-out.
- The frontend (`package.json`, `src/`) was only spot-checked for `three`/
  `wasm`/`gltf`/`mesh` mentions, not read in full — a deeper audit of
  `src/lib/`, `src/hooks/`, and the R3F viewer components was out of scope
  for this backend/dependency-focused grounding pass and may be relevant to
  the frontend-WASM candidate approach above.
- This memo did not inspect `src-tauri/Cargo.lock` for transitive crates
  that might already vendor partial geometry functionality (e.g. via a
  dev-dependency); only direct `Cargo.toml` dependencies were confirmed
  absent of geometry crates.
