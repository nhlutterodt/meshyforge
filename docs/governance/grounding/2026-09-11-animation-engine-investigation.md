# Grounding: Animation Engine — Playback, Library Source, and Pre-Spend Gating

Status: investigation memo. Feeds ADR-0010 and ADR-0011. No implementation was
performed and no source file was modified. Produced by a four-team parallel
read-only investigation on 2026-09-11.

Supersedes nothing. Extends
`docs/governance/grounding/2026-09-05-concept-03-rigging-animation-pipeline.md`,
whose Sub-part 2 finding ("interactive pose/clip previewer — does not exist in
any form") is **re-confirmed as still true** six days later, and whose
Sub-part 1/animation-panel FRD gaps are **confirmed as since closed**.

## Scope of investigation

Four teams, non-overlapping surfaces, all read-only:

| Team | Surface | Key question |
|---|---|---|
| A | R3F viewport + playback | What constrains adding playback? |
| B | Meshy HTTP client + CSP | What constrains changing the library source? |
| C | SQLite + download pipeline + lineage | What is actually persisted for rig/animate? |
| D | Governance + conventions | What format must artifacts take? |

## 1. Confirmed: the engine can generate animations it cannot play

Searched `src/` for `useAnimations|AnimationMixer|AnimationAction|mixer|clipAction`.
**Zero matches.**

`src/components/gallery/AssetPreview3D.tsx:44-54` destructures only `scene`:

```typescript
function Model({ glbPath }: ModelProps) {
  const { scene } = useGLTF(glbPath);
  const model = useMemo(() => scene.clone(true), [scene]);
  ...
}
```

`useGLTF` returns `{ scene, scenes, animations }`. The `animations` array is
present on every animated GLB Meshy returns and is **never read**. A user who
spends 5 credits on a rig and 3 on an animation sees a motionless model.

### 1.1 Two latent defects that will make a naive fix fail silently

**(a) `frameloop="demand"`** — `AssetPreview3D.tsx:115-130` sets
`frameloop="demand"` on the `<Canvas>`. An `AnimationMixer` advances its clock
but produces no frames unless the loop is running. Playback added without
addressing this renders nothing and looks like "the animation is broken."

This is not a free change: UI/UX §10.1 **VP-02** already mandates `demand` as
the default with a switch to `always` on pointer-down and back on pointer-up.
Any playback design must *extend* that policy rather than replace it.

**(b) `scene.clone(true)` is wrong for skinned meshes** — `Object3D.clone()`
deep-clones bone nodes, but the cloned `SkinnedMesh` retains a `skeleton`
referencing the **original** bones. The clone will not deform.

Today this is harmless because nothing is animated and static geometry clones
correctly. It becomes a defect the moment playback lands. Verified available
remedy, in the installed tree:

```
node_modules/three/examples/jsm/utils/SkeletonUtils.js
  exports: getBoneName, retarget, retargetClip, clone,
           getBoneByName, getBones, getHelperFromSkeleton, parallelTraverse
```

`clone( source )` is exported and is the correct primitive. Note this is
*adopting a documented remedy from the library already installed*, not
importing third-party code.

### 1.2 Required APIs are already installed

| Package | Resolved version | Relevant surface |
|---|---|---|
| `three` | 0.170.0 | `AnimationMixer`, `SkeletonUtils.clone` |
| `@react-three/drei` | 10.7.8 | `core/useAnimations.js` — **exists** |
| `@react-three/fiber` | 9.x | `Canvas`, `invalidate` |

`node_modules/@react-three/drei/core/useAnimations.d.ts`:

```typescript
export declare function useAnimations<T extends AnimationClip>(
  clips: T[],
  root?: React.RefObject<Object3D | undefined | null> | Object3D
): Api<T>;   // { ref, clips, mixer, names, actions }
```

No new dependency is required for playback.

### 1.3 Binding constraints on any playback implementation

- **ADR-0006 VP-13** — viewport controls must be registered through the typed
  `useViewportControls` registry, **not** ad-hoc props on the viewer. Play/pause
  is a free, local, non-destructive viewport control and therefore falls
  squarely under VP-13.
- **ADR-0006 VP-14** — confirm a capability can be satisfied locally before
  wiring it to a paid TaskProvider endpoint. Playback is purely local; it must
  not create tasks.
- **Deep-import convention** — `AssetPreview3D.tsx:7-12` imports
  `@react-three/drei/core/<X>.js`, never the barrel, because `vite.config.ts`
  sets `optimizeDeps.exclude: ['@react-three/drei']`. New imports must follow
  the same form: `@react-three/drei/core/useAnimations.js`.
- **Test mocking** — `AssetPreview3D.test.tsx` mocks each drei deep import
  individually, replaces `Canvas` with a `div`, and exposes imperative APIs via
  `forwardRef` + `useImperativeHandle`. A new `useAnimations` mock must follow
  this pattern.

## 2. The animation library uses an undocumented endpoint

`src-tauri/src/provider/meshy.rs:92-95`:

```rust
const ANIMATION_LIBRARY_PATH: &str = "/web/public/animations/resources";

fn animation_library_url(base_url: &str) -> String {
    let root = base_url.strip_suffix("/openapi").unwrap_or(base_url);
    format!("{root}{ANIMATION_LIBRARY_PATH}")
}
```

This strips `/openapi` to reach an **internal web-app endpoint**, not the
public API. It works, and `AnimationLibraryItem { id, name, category, thumbnail? }`
(`src/lib/meshy-types.ts:377-381`) matches its real shape. But it carries no
stability contract.

The documented public API now offers `GET /openapi/v1/animations/library` —
free of credits, complete (not paginated), filterable by `search`, `category`,
`sub_category`, `action_ids`. Each entry carries `action_id`, `name`, `key`
(stable slug), `category`, `sub_category`, and `preview_url` (an animated GIF).

`thumbnail?` is declared on the type but never rendered
(`AnimationPanel.tsx:89-99` shows name + category badge only). The picker
presents ~500 entries with names like "Reaping Swing" and no visual.

### 2.1 The blocking constraint Team B found

`src-tauri/tauri.conf.json` CSP, verbatim:

```
default-src 'self'; connect-src 'self' ipc: http://ipc.localhost asset: http://asset.localhost https://asset.localhost; img-src 'self' asset: http://asset.localhost https://asset.localhost https://assets.meshy.ai data:; script-src 'self'; style-src 'self' 'unsafe-inline'
```

`img-src` permits `https://assets.meshy.ai` but **not** `https://cdn.meshy.ai`,
which is where `preview_url` GIFs are served. **Rendering preview GIFs is
currently blocked by CSP and would fail silently in the webview.**

ADR-0002 adopted an exact-host allowlist and states no alternate host is
permitted "without an ADR." That is why this work requires ADR-0011 rather
than a code change.

## 3. Correction to a prior claim: lineage is NOT already wired

An earlier verbal assessment in this workstream stated that `parent_task_id`,
`has_rig`, and `has_animation` made lineage "nearly free." **That was wrong**,
and Team C disproved it.

The column exists (`migrations/001_initial.sql:17`) and is present on both
`AssetRecord` and `AssetRow` (`src-tauri/src/meshy/models.rs:715-785`), but:

- it is **hardcoded to `None`** on write — `src-tauri/src/commands/assets.rs:233`
- it is **never queried** — no WHERE / JOIN / accessor anywhere
- it is **never updated** after insert

So lineage is an empty column, not a populated graph. Any lineage feature is
net-new plumbing through `save_completed_task_inner`, not a read-side view.
This is recorded so the estimate is not repeated optimistically.

## 4. Rig and animate results are partially discarded

`download_asset` (`src-tauri/src/commands/api.rs:124-245`) iterates whatever
keys the frontend passes in `model_urls` and stores them into the `file_paths`
JSON object under those same keys. It is format-agnostic by design.

Consequences verified by Team C:

- A **rig** result's `basic_animations` (walking/running, incl. the
  `*_armature_glb_url` variants) is **not extracted or downloaded**. Two free
  animation clips per rig are discarded on every rig task.
- `has_animation` is never set true during a rig save.
- An **animate** result's `processed_armature_fbx_url`, `processed_usdz_url`,
  and `processed_animation_fps_fbx_url` are **not distinguished** from the
  primary mesh. Nothing records which artifact is skeleton-only versus full
  skinned mesh.

The armature-only outputs are the only mechanism by which a clip can ever be
separated from a mesh. Discarding them is the one decision here that is
expensive to reverse later, because recovering them costs credits per asset.

## 5. What is deliberately NOT proposed

Per the standing instruction to avoid refactors that later constraints would
overturn:

- **No normalized clip model / VRMA adoption.** Its value is portability across
  *different* rigs. There is one provider, one auto-rigger, and no second
  skeleton source. Building it now yields a refactor with no consumer.
- **No change to the `TaskProvider` trait.** `get_task` returning raw
  provider-shaped JSON is the one seam leak in an otherwise clean abstraction
  (`src-tauri/src/provider/mod.rs`), but it is tested and working. Normalizing
  pays off only when a second provider exists.
- **No addition of `cdn.meshy.ai` to `DOWNLOAD_HOSTS`.** See ADR-0011 — the
  webview render surface and the privileged Rust fetch surface are
  deliberately kept as separate trust tiers.

The single cheap hedge recommended is to persist armature artifacts under
distinct `file_paths` keys when they are produced, which costs nothing today
and preserves the option.

## 6. Outputs

| Artifact | Purpose |
|---|---|
| `docs/adr/0010-viewport-animation-playback-runtime.md` | Playback runtime decision (Proposed) |
| `docs/adr/0011-animation-library-source-and-preview-image-origin.md` | Library source + CSP origin decision (Proposed) |
| `docs/governance/task-manifest-addendum-2026-09-11.yaml` | TASK-0026…TASK-0032, pending merge |

## Precedent search record

| Searched | Where | Result |
|---|---|---|
| `useAnimations`, `AnimationMixer`, `AnimationAction`, `mixer`, `clipAction` | `src/**/*.ts`, `src/**/*.tsx` | 0 hits |
| `animation playback`, `play animation`, `AnimationMixer`, `animated preview` | `docs/**/*.md` | 0 hits |
| `preview_url`, `sub_category` | `src-tauri/src/**/*.rs` | 0 hits |
| `parent_task_id` writes | `src-tauri/src/**/*.rs` | 1 hit, hardcoded `None` (`commands/assets.rs:233`) |
| `clone` export | `node_modules/three/examples/jsm/utils/SkeletonUtils.js` | present |
| `useAnimations` | `node_modules/@react-three/drei/core/` | present (`.js`, `.cjs.js`, `.d.ts`) |
