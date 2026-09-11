# ADR-0010: Viewport animation playback via the viewport-control registry

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-11 |
| **Deciders** | Repository owner (confirmed in-session, 2026-09-11) |
| **Phase** | Phase 4 (Asset Library) / Phase 5 (Character Pipeline) |
| **Related rules/features** | VP-02, VP-05, VP-06, VP-07, VP-13, VP-14, FR-PREV-01–04, FR-POST-06, FR-POST-07 |
| **Supersedes** | None |

## Context

MeshyForge can create rigging tasks (`FR-POST-06`, `RiggingPanel.tsx`) and
animation tasks (`FR-POST-07`, `AnimationPanel.tsx`), download the resulting
GLB, and display it — motionless. The viewport never plays the animation the
user paid for.

This was first recorded in
`docs/governance/grounding/2026-09-05-concept-03-rigging-animation-pipeline.md`
("interactive pose/clip previewer ... **Does not exist in any form**") and
re-confirmed on 2026-09-11 by a targeted search of `src/` for
`useAnimations|AnimationMixer|AnimationAction|mixer|clipAction` — **zero
matches**.

**Constraints found, with evidence:**

- `src/components/gallery/AssetPreview3D.tsx:44-54` — `Model` destructures only
  `scene` from `useGLTF`. The `animations` array that drei already returns is
  discarded.
- `src/components/gallery/AssetPreview3D.tsx:46` — `scene.clone(true)`.
  `Object3D.clone()` deep-clones bone nodes but leaves the cloned
  `SkinnedMesh.skeleton` bound to the **original** bones, so a cloned skinned
  mesh does not deform. Currently harmless (nothing animates); becomes a defect
  the instant playback lands.
- `src/components/gallery/AssetPreview3D.tsx:115-130` — `frameloop="demand"`.
  An `AnimationMixer` advances its clock but emits no frames under `demand`.
- UI/UX §10.1 **VP-02** already mandates `demand` as default with a switch to
  `always` on pointer-down and back on pointer-up. Playback must extend this
  policy, not replace it.
- ADR-0006 **VP-13** — viewport controls must be added via the typed
  `useViewportControls` registry, not ad-hoc props on the viewer component.
- ADR-0006 **VP-14** — confirm a capability can be satisfied locally (free,
  instant, non-destructive) before wiring it to a paid TaskProvider endpoint.
- `vite.config.ts` sets `optimizeDeps.exclude: ['@react-three/drei']`, which is
  why `AssetPreview3D.tsx:7-12` uses `@react-three/drei/core/<X>.js` deep
  imports rather than the barrel. New imports must match.
- `src/components/gallery/AssetPreview3D.test.tsx` mocks every drei deep import
  individually and replaces `Canvas` with a `div`. Any new hook must be
  mockable the same way.

**Precedent search record:**

| Searched | Where | Result |
|---|---|---|
| `useAnimations`, `AnimationMixer`, `clipAction` | `src/**` | 0 hits |
| `animation playback`, `animated preview` | `docs/**/*.md` | 0 hits |
| `useAnimations` availability | `node_modules/@react-three/drei/core/` | present (drei 10.7.8) |
| `clone` export | `node_modules/three/examples/jsm/utils/SkeletonUtils.js` | present (three 0.170.0) |

No new runtime dependency is required.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A: Extend `useViewportControls` with a playback sub-registry; `useAnimations` inside `AssetPreview3D`; frameloop driven by playback state** | Complies with VP-13 and VP-14; reuses the existing `setControlsRef`/`boundsApiRef` bridging pattern; no new dependency; testable under the existing mock strategy; playback is free and local | Widens an already central hook; frameloop policy becomes two-sourced (pointer drag + playback) and must be reconciled explicitly | None |
| **B: Self-contained `<AnimatedModel>` with local `useState` and ad-hoc props on `AssetPreview3D`** | Smallest diff; no change to shared hook | Directly violates VP-13; creates a second, competing control surface; reset-view and playback would not be able to coordinate | ADR-0006 (VP-13) |
| **C: Defer to a dedicated full "clip previewer" route with its own canvas** | Room for timeline scrubbing, multi-clip comparison later | Duplicates the entire viewport stack (Bounds, Center, ContactShadows, OrbitControls, error boundaries); large surface for a feature whose core is ~40 lines; premature | VP-13 in spirit; DRY |

## Decision

Adopt **Option A**.

Playback is modelled as a viewport control, registered through
`useViewportControls`, exactly as reset-view and zoom already are.

**Decision rules:**

1. `Model` reads `animations` from the existing `useGLTF` result. No second
   load, no new fetch, no new task.
2. `Model` clones via `SkeletonUtils.clone(scene)` from
   `three/examples/jsm/utils/SkeletonUtils.js` instead of `scene.clone(true)`.
   The existing `useMemo` keying on `scene` is retained, as is the
   `useGLTF.clear(glbPath)` cleanup (VP-06, VP-07 remain satisfied).
3. Clip binding uses `useAnimations` from
   `@react-three/drei/core/useAnimations.js`, matching the deep-import
   convention.
4. `frameloop` becomes a derived value: `always` when playback is active OR a
   pointer drag is in progress; `demand` otherwise. This is a single derived
   expression, so the two drivers cannot contend.
5. Playback controls render only when `animations.length > 0`. Assets with no
   clips are visually and behaviourally unchanged.
6. Default loop mode is `LoopRepeat`. A one-shot mode
   (`LoopOnce` + `clampWhenFinished`) is exposed but not inferred, because the
   downloaded GLB does not carry the library `category` that would justify an
   inference. Inference is explicitly deferred, not designed around.
7. Playback creates no TaskProvider call and consumes no credits (VP-14).

**Newly proposed rule ID(s):**

- `VP-15` (proposed) — Animation playback state (active clip, play/pause, loop
  mode) must be owned by the `useViewportControls` registry. Viewer components
  receive it as registry output, never as locally-held component state.
- `VP-16` (proposed) — `frameloop` must be a single derived expression over all
  continuous-render drivers (pointer interaction, animation playback). No code
  path may set `frameloop` imperatively from more than one source.
- `VP-17` (proposed) — Any clone of a loaded GLTF scene that may contain a
  `SkinnedMesh` must use `SkeletonUtils.clone`, never `Object3D.clone`.

## Consequences

**Positive:**

- The rigging → animation → preview loop becomes coherent end-to-end; users can
  see what they paid for.
- `VP-17` retires a latent defect before it can produce a user-visible
  "animation is broken" bug that would be diagnosed as an API problem.
- `frameloop` policy is consolidated rather than duplicated, which makes VP-02's
  existing pointer-drag rule auditable in one place.
- Zero new dependencies; no bundle-size or supply-chain delta.

**Negative:**

- `useViewportControls` grows beyond camera concerns. Accepted because VP-13
  mandates the registry as the single control surface; the alternative is a
  second surface, which is worse.
- `frameloop="always"` during playback raises GPU/battery usage for the
  duration of playback. Bounded by pausing on unmount and defaulting to paused.
- Test files for `AssetPreview3D` must add a `useAnimations` mock, a small but
  non-zero maintenance cost on an already-large mock block.

**Follow-ups:**

- Docs to update (via `doc-sync`): UI/UX §10.1 (VP-02 restated in terms of
  VP-16, add VP-15/VP-17), `docs/coding_standards.md` (register VP-15–VP-17),
  `docs/feature_requirements_documentation.md` (new `FR-PREV-05`),
  `docs/technical_design_document.md` (viewport section),
  `docs/CHANGELOG.md`.
- Tests to add: `AssetPreview3D.test.tsx` — controls hidden when
  `animations: []`, shown when populated, play/pause toggles registry state,
  `frameloop` prop flips to `always` while playing;
  `useViewportControls.test.tsx` — playback registry state transitions, reset
  on asset change. `SkeletonUtils.clone` usage asserted via mock call.
- Tech debt to register: loop-mode inference from library `category` is
  deferred and depends on ADR-0011 landing `sub_category`/`key` metadata.

## References

- `docs/adr/0006-viewport-control-registry.md` (VP-13, VP-14)
- `docs/governance/grounding/2026-09-05-concept-03-rigging-animation-pipeline.md`
- `docs/governance/grounding/2026-09-11-animation-engine-investigation.md`
- UI/UX §10.1 (VP-01–VP-08), §5.3
- Related ADRs: ADR-0006, ADR-0011
- Related tasks: TASK-0026, TASK-0027, TASK-0028
