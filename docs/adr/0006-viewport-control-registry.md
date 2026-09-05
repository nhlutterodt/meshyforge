# ADR-0006: Viewport Control Registry — Local-First Client-Side Preview Controls

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-05 |
| **Deciders** | nhlutterodt (confirmed via chat, 2026-09-05) |
| **Phase** | Post-MVP (Phase 5 complete; preview UX expansion) |
| **Related rules/features** | UI/UX `VP-01–12`, CSD `CTR-09`; FRD `FR-PREV-01–04`; ADR-0003, ADR-0004 |
| **Supersedes** | None |

## Context

The 3D asset viewer (`src/components/gallery/AssetPreview3D.tsx`) only offers
`OrbitControls` (pan/zoom/rotate, distance clamp 2–15) plus an auto-frame on
mount/resize. There is no reset-view, no scale-preview control, and no
extensibility seam — adding any new control today means editing
`AssetPreview3D.tsx` directly with no reusable pattern.

**Trigger:** Criterion 1 (new module-boundary convention — a controls
registry that does not exist yet) and criterion 6 (foundational UI
architecture; expensive to redo once other panels/viewers depend on it).

**Constraints found:**
- `UI_UX_Documentation.md` §10.1 (`VP-01`–`VP-12`) governs the 3D viewport's
  Canvas lifecycle, performance, and lighting, but says nothing about input
  controls beyond `OrbitControls` being implied by FRD `FR-PREV-*`. No
  existing rule blocks adding controls; none defines how to add them.
- `coding_standards.md` `CTR-09` — "validate inputs before hitting the Meshy
  API... prevents wasting credits on malformed requests" — already
  establishes a credit-conscious posture for the *provider* boundary. This
  ADR extends that same posture to a new axis: whether a capability needs
  the provider boundary *at all*.
- ADR-0004 (Task Provider Abstraction) confirms the `TaskProvider` trait
  (`src-tauri/src/provider/mod.rs:29-83`) is generic and task-type-driven,
  keyed by `TaskType`. It is the correct seam for any *real* Meshy mutating
  operation (Resize, Remesh, Retexture, Convert), but has nothing to do with
  client-side viewport controls — conflating the two was explicitly
  identified and rejected during TASK-0004's grounding pass.

**Precedent search record:**
- Searched: `preview`, `viewport`, `OrbitControls`, `VP-`, `control` across
  all root-level planning docs and `docs/adr/*.md`.
- Searched in: `UI_UX_Documentation.md`, `technical_design_document.md`,
  `coding_standards.md`, `feature_requirements_documentation.md`,
  `docs/adr/0001`–`0005`.
- Result: ADR-0003 is the only prior ADR touching preview rendering, and it
  covers lighting only (Environment preset vs. deterministic local lights).
  No prior ADR or rule addresses viewport *controls* or a registry pattern.
  `docs/governance/task-manifest.yaml` TASK-0004's grounding pass (2026-09-04)
  is the direct precedent input for this ADR, per its own recommendation.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A: Typed control-registry hook** (`useViewportControls`) — a hook that owns control state (camera reset, scale factor, damping, etc.) and exposes named actions; `AssetPreview3D` and any future viewer register against it without being rewritten per addition. | Extensible without touching the viewer component per new control; single place to enforce the local-first decision rule below; testable independent of Three.js/Canvas. | More upfront design than a prop; requires a first real consumer (`AssetPreview3D`) to prove the shape before a second viewer exists. | None |
| B: Props-drilled control flags on `AssetPreview3D` (e.g. `enableReset`, `scaleFactor`), extended ad hoc per new control. | Cheapest today; no new abstraction. | Exactly the "heavy refactor per addition" pattern this request explicitly wants to avoid; no reusable seam if a second viewer is ever added. | None (but re-litigates this ADR the next time a control is added — criterion 6) |
| C: Defer — ship nothing beyond current `OrbitControls`. | Zero cost. | Leaves the stated goal (greatly improve preview capabilities) unaddressed. | None |

## Decision

Adopt **Option A**: a typed `useViewportControls` registry hook as the single
seam for client-side, local, free, non-destructive viewport controls
(rotate/pan/zoom — already covered by `OrbitControls` — plus reset-view and
scale-preview as the first new additions). `AssetPreview3D` consumes this
hook instead of hardcoding control wiring inline.

This ADR also codifies, as an explicit local-first decision rule, the
principle raised during confirmation: **before wiring any new preview/asset
capability to a paid, permanent Meshy task endpoint (Resize, Remesh,
Retexture, Convert, etc.), first determine whether the same user-facing
outcome can be achieved locally, for free, instantly, and non-destructively
via the viewport-control registry.** Only capabilities that genuinely
require server-side processing (real retopology, AI-driven texture
generation, permanent dimension changes to the asset itself) go through the
`TaskProvider` seam from ADR-0004. A local viewport "scale the camera/model
in view" is never a substitute build reason to skip Resize when the user
actually wants the *asset's* real-world dimensions changed and persisted —
the distinction is *view* vs. *asset*, not merely "which is cheaper."

**Newly proposed rule ID(s):**
- `VP-13` (proposed) — Client-side viewport controls (reset-view,
  scale-preview, and any future local/free/non-destructive render control)
  must be added via a typed control-registry hook (`useViewportControls`),
  not ad hoc props on the viewer component.
- `VP-14` (proposed) — Before adding a new preview/asset capability, confirm
  whether it can be satisfied locally via the viewport-control registry
  (free, instant, non-destructive) before wiring it to a `TaskProvider`
  endpoint (paid, async, permanent). Document the determination in the
  implementing PR's description.

## Consequences

**Positive:**
- Future controls (reset-view, scale-preview, and beyond) are additive, not
  refactors — closes the exact risk criterion 6 flagged.
- Establishes a durable, citable rule distinguishing "change how I'm looking
  at the asset" from "change the asset," preventing accidental credit spend
  on a purely cosmetic request.
- Unblocks TASK-0007 (registry implementation), which was blocked on this
  decision.

**Negative:**
- One extra layer of indirection (`useViewportControls`) for what is
  currently a single `OrbitControls` element — the cost of extensibility.

**Follow-ups:**
- Docs to update (handoff to `doc-sync`): `UI_UX_Documentation.md` §10.1 to
  add `VP-13`/`VP-14` to the 3D Viewport rule table and its guardrail count
  (currently 12 → 14); `coding_standards.md` §19.1 rule-ID cross-reference
  index to list `VP-13`/`VP-14`.
- Tests to add: component tests for `useViewportControls` (reset-view
  restores default camera/distance; scale-preview clamps to a safe range)
  and an `AssetPreview3D` test asserting it consumes the hook rather than
  hardcoding controls.
- Tech debt to register: none.
- TASK-0007 (`docs/governance/task-manifest.yaml`) should be unblocked and
  implemented against this decision.

## References

- `UI_UX_Documentation.md` §10.1 (`VP-01`–`12`)
- `coding_standards.md` `CTR-09`
- Related ADRs: ADR-0003 (preview lighting), ADR-0004 (Task Provider
  Abstraction)
- `docs/governance/task-manifest.yaml` TASK-0004, TASK-0005, TASK-0007
