# Runtime Integration Lessons Learned

## Purpose

This record captures production-relevant failures discovered while validating MeshyForge against real Meshy tasks on Windows. It complements unit tests and planning documents with evidence from the complete Tauri runtime: Meshy API responses, Zustand task state, SQLite persistence, local downloads, the Tauri asset protocol, WebView2, Vite, React Three Fiber, and antivirus behavior.

The central lesson is that a successful build is not proof of a successful workflow. Every boundary that transforms, persists, transports, or renders data needs an observable runtime check and a focused regression test.

## Resolution Summary

| Area | User-visible symptom | Root cause | Permanent resolution |
|---|---|---|---|
| Task registration | Creation notification fired, but Task Monitor was empty | The create mutation returned an ID without adding a local active-task record | Register the task immediately, then let the global polling owner monitor it |
| Polling contract | Tasks remained active or completed without usable asset data | TypeScript camelCase types were applied mentally to raw snake_case JSON | Map every Meshy wire field explicitly before frontend or persistence use |
| Persistence and Gallery | Meshy task succeeded, but Gallery remained empty | Completion did not form one reliable save, download, and cache-invalidation transaction | Persist terminal metadata, download files, save local paths, and invalidate asset queries |
| Thumbnail URLs | Remote thumbnails failed while local files worked inconsistently | `convertFileSrc` was applied to URLs it does not own; CSP omitted required image hosts | Pass through network/data URLs and convert only local filesystem paths |
| Antivirus and Vite | Norton quarantined a generated Drei prebundle | Vite generated a large monolithic dependency artifact that triggered a heuristic | Verify package integrity, exclude the Drei root from dev prebundling, and retain protection |
| 3D preview | Selecting a thumbnail briefly loaded, then the WebView went black | The scaffold ignored the GLB; later, Drei's root barrel evaluated an unused broken `Stats` import | Load the real GLB, use direct Drei helper modules, scope CSP fetch origins, and contain failures |
| Internal IPC contract | Multi-Image to 3D task reported SUCCEEDED, but no asset appeared in Gallery; other assets were unaffected | A rename (ADR-0004) changed the frontend save payload's key from `meshyType` to `taskType` but left the Tauri command's Rust parameter as `meshy_type`; the mismatched IPC key rejected silently with no toast | Rename Rust command parameters and read-model struct fields together with their frontend counterparts; add regression tests pinning the exact key set on both sides of the boundary |

## 1. Task Creation Must Establish Local Ownership

### Observation

The Meshy API accepted a task and the application displayed a creation notification, but no task appeared in Task Monitor. The API response proved remote creation only; it did not prove that the application had established a durable local record to poll.

### Root Cause

The create mutation and task monitor were disconnected. A returned task ID was treated as completion of the frontend action instead of the start of a locally owned workflow.

### Resolution

Immediately after successful creation, add a task entry containing the task ID, task type, prompt or label, and initial state. A single global polling owner then reads active task IDs, updates progress, and handles terminal states. Navigation must not own polling because users can leave the creation screen while work continues.

### Guardrails

- A create-mutation regression must assert that the returned ID is inserted into the active task store.
- Task Monitor must derive active cards from that store, not component-local mutation state.
- Runtime smoke testing must navigate away from Generate and confirm progress continues.
- Notifications are secondary evidence; the authoritative checks are task-store presence and visible Task Monitor state.

## 2. TypeScript Types Do Not Transform Wire JSON

### Observation

Polling requests succeeded, but fields such as model URLs, thumbnail URL, texture URLs, credits, and timestamps became `undefined` downstream.

### Root Cause

Meshy returns snake_case wire fields such as `model_urls`, `thumbnail_url`, and `consumed_credits`. Frontend interfaces used camelCase names, but a TypeScript assertion does not rename runtime object keys.

### Resolution

Represent the raw Meshy response accurately and map it once at the boundary. The mapper now converts snake_case fields into the arguments expected by persistence and download commands while preserving null handling and terminal error information.

### Guardrails

- Keep fixture payloads in the exact Meshy wire format.
- Assert each high-value field independently, including optional and failed-task variants.
- Do not cast an unvalidated API object directly to a differently cased domain interface.
- When debugging missing data, inspect actual runtime keys before changing UI code.

## 3. Local Persistence Is the Task History

### Observation

A task succeeded remotely, but no asset appeared after reopening or refreshing Gallery.

### Root Cause

The documented Meshy endpoints return or poll known task IDs; they do not provide the application with a general workspace task-list API suitable for reconstructing local history. Without locally retaining task IDs and terminal results, completed work cannot be rediscovered reliably.

### Resolution

Treat SQLite as the application's task and asset history. On success, persist task metadata, download models and thumbnails to the app-data asset directory, store the resulting local paths, then invalidate the Gallery query. Terminal polling stops only after the completion path has been handled.

### Guardrails

- Test the raw response-to-save mapping with real wire casing.
- Verify that terminal tasks stop polling.
- Confirm SQLite contains the task ID and local file paths.
- Confirm every stored path exists before considering download completion successful.
- Invalidate the asset query after persistence so Gallery updates without restart.
- Do not design recovery around an undocumented Meshy workspace-list capability.

## 4. Asset URL Conversion and CSP Are Separate Boundaries

### Observation

Remote thumbnails were converted into invalid local asset URLs. Later, image thumbnails worked while GLB loading remained vulnerable to CSP blocking.

### Root Cause

`convertFileSrc` is for device file paths only. HTTP, HTTPS, and data URLs must pass through unchanged. In addition, an `<img>` load is controlled by `img-src`, while Three.js `GLTFLoader` fetches model data and is controlled by `connect-src`.

### Resolution

The `assetUrl` boundary now passes through network and data URLs and converts only local paths. Tauri CSP permits Meshy's thumbnail host only in `img-src`. `connect-src` remains local-only and explicitly permits Tauri IPC plus `asset:`, `http://asset.localhost`, and `https://asset.localhost`. The asset protocol remains scoped to `$APPDATA/assets/**`.

### Guardrails

- Unit-test HTTP, HTTPS, data, Windows, and POSIX path handling.
- Parse `tauri.conf.json` in a guardrail test and assert required local fetch origins.
- Reject wildcard or Meshy remote origins in `connect-src`.
- Assert the asset protocol scope remains limited to the application asset directory.
- Validate model loading inside the Tauri WebView; a normal browser cannot reproduce this boundary.

## 5. Antivirus Workarounds Must Preserve Security

### Observation

Norton quarantined Vite's generated monolithic Drei prebundle during development.

### Root Cause

The alert targeted generated bundler output, not a verified source package file. Large generated dependency bundles can match heuristic signatures even when their inputs are legitimate.

### Resolution

Package integrity and registry provenance were verified first. Drei was then excluded from Vite dependency prebundling, avoiding the generated artifact without disabling antivirus, adding broad exclusions, or weakening application security.

### Guardrails

- Never disable endpoint protection as the first response to a generated-file alert.
- Verify lockfile, registry, and package integrity before classifying an alert as a false positive.
- Keep `@react-three/drei` in `optimizeDeps.exclude` unless a replacement is runtime-tested with antivirus enabled.
- Keep exclusions narrow and repository-local when an environmental exception is unavoidable.
- Re-run development startup and production bundling after dependency-optimizer changes.

## 6. Lazy 3D Preview Failures Must Not Reach the App Root

### Observation

Opening a Gallery asset briefly transitioned, then the entire WebView became black while the native window remained responsive.

### Evidence and Root Cause

The original preview rendered a placeholder cube and ignored the downloaded GLB path. After real GLB loading was added, WebView2 DevTools exposed the decisive exception: Drei's root barrel imported its unused `Stats` helper, and the excluded prebundle path served `stats.js` without the expected default export. The rejected lazy import occurred before the preview component's internal error boundary could mount, so React lost the lazy detail subtree and blanked the application surface.

A separate black frame observed during diagnosis came from a Tauri hot rebuild after `tauri.conf.json` changed. Runtime logs distinguished that development restart from the stable preview failure. Black frames must therefore be correlated with process and watcher logs before assigning a rendering cause.

### Resolution

- Load the downloaded GLB with `useGLTF(assetUrl(glbPath))`.
- Clone the cached scene before rendering.
- Frame with `Bounds` and `Center`, use deterministic local lighting, and enable bounded orbit controls.
- Clear the GLTF cache on unmount.
- Import only the required typed Drei modules from `@react-three/drei/core/*.js`; do not evaluate the root barrel.
- Catch lazy-module rejection in `AssetDetail` and render an in-panel failure state.
- Catch GLB/render failures inside `AssetPreview3D` and show the local thumbnail fallback.
- Permit local asset fetch origins in CSP `connect-src`.

### Guardrails

- The runtime guardrail suite rejects `from '@react-three/drei'` in the preview.
- The suite requires each approved direct helper import.
- The suite requires lazy-import rejection containment and an accessible alert fallback.
- Component tests cover real GLB URL selection, framing composition, zoom limits, absent paths, loader failure, and cache cleanup.
- Production build validation is required because tree-shaking and chunk composition differ from development.
- A Tauri smoke test must open a real downloaded GLB and verify that surrounding detail controls remain visible.

## 7. Internal Tauri IPC Argument Names Are a Contract, Not Just Types

### Observation

A Multi-Image to 3D task completed — Task Monitor showed `SUCCEEDED` and progress updated correctly through polling — but the finished asset never appeared in Gallery. Assets already in Gallery were unaffected; only newly completed tasks were missing, and no error toast appeared. The same gap existed for every other task type, since all of them save through the same code path; Multi-Image was simply the flow being exercised when it was noticed.

### Root Cause

A refactor (ADR-0004 / PR #2) renamed the frontend's save payload key from `meshyType` to `taskType`, but the Tauri `save_completed_task` command's Rust parameter stayed `meshy_type: String`. Tauri's IPC layer matches an incoming camelCase JS key to a Rust command parameter by name (`taskType` <-> `task_type`), not by position and not by TypeScript's compile-time checking — TypeScript has no visibility into the Rust signature, so `tsc`, `cargo check`, and every existing mocked-`invoke` test all passed cleanly. With no matching key, every `invoke('save_completed_task', ...)` call rejected with a deserialization error. It was caught by a bare `console.error` with no user-facing toast, and because `qc.invalidateQueries` sat *after* the failed `await`, the Gallery query was never invalidated either — the task genuinely finished, it just never reached SQLite.

The read-side `AssetRow` struct had the same drift in the opposite direction: its `meshy_type` field still serialized as `meshyType`, while `AssetCard`, `AssetDetail`, and `AssetPreview3D` already read `asset.taskType` — so a repaired save would still have rendered with a blank label.

### Resolution

Renamed the Rust `save_completed_task` parameter and the `AssetRow` field to `task_type`, matching the frontend's key on both directions of the boundary. Added regression tests pinning the exact camelCase key set involved: a Rust test that deserializes the frontend's literal payload shape into a mirror of the command's parameter list and feeds it through the real save path, and a frontend test asserting the exact key set `mapPollResultToSaveArgs` produces. Also added `?? 0` fallbacks for the numeric fields (`progress`, `consumedCredits`, `createdAt`, `startedAt`, `finishedAt`) forwarded to required (non-`Option`) Rust parameters, since an `undefined` value there drops the key from the IPC payload the same way a renamed key does — `JSON.stringify` omits `undefined`-valued keys entirely.

### Guardrails

- Whenever a Tauri command's Rust parameter names, or an `AssetRow`-style struct's serialized field names, change, grep every frontend `invoke(...)` call site and every `asset.<field>` read for the old name before considering the rename done. `tsc` and `cargo check` cannot catch this class of mismatch — the two languages never type-check each other's IPC contract.
- An `invoke(...)` call built via `as unknown as Record<string, unknown>` (bypassing the generated argument type) is a high-risk site for this exact bug; treat it as needing an explicit key-set regression test on the frontend, and a mirrored-payload deserialization test on the Rust side.
- A silently caught `invoke(...)` rejection (bare `console.error`, no toast) can hide an IPC contract break indefinitely on a save/mutation path that gates visible state; prefer surfacing even a generic failure toast so a broken save is noticed immediately instead of discovered later as "missing data."
- Fields sourced from a response typed only via a TypeScript interface (no runtime schema validation) need an explicit fallback before being forwarded to a required Rust parameter, matching the pattern already used for the other fields in the same mapper.
- A mirror-struct Rust test that calls an `_inner` helper directly, bypassing the actual `#[tauri::command]` wrapper, does not protect against a rename of the wrapper's own parameter names in isolation — note that gap explicitly in the test rather than implying full IPC coverage.

## Required Validation Sequence

For changes touching creation, polling, persistence, asset URLs, CSP, Vite optimization, or preview rendering:

1. Run the narrow test for the changed boundary.
2. Run `npm run test:guardrails`.
3. Run `npm run type-check` and `npm run lint`.
4. Run `npm run test`.
5. Run `npm run build`.
6. Run applicable Rust checks.
7. Launch `npm run tauri dev` with antivirus enabled.
8. Create or use a real Meshy task and verify task creation through stable 3D preview.
9. Inspect WebView and Tauri logs for CSP, module, fetch, WebGL, and cleanup errors.

## Diagnostic Order

When the user-visible pipeline fails, inspect boundaries in this order:

1. Meshy create response and returned task ID.
2. Active task-store registration.
3. Raw polling payload and wire casing.
4. Terminal-state transition and polling stop condition.
5. `invoke('save_completed_task', ...)` argument keys against the Rust command's current parameter names (browser devtools console for a silently caught rejection).
6. SQLite task row and serialized model URLs.
7. Download response and local file existence.
8. Gallery query invalidation and asset row.
9. `assetUrl` output for thumbnail and GLB paths.
10. Tauri CSP directive governing the resource type.
11. Lazy-module, GLTF, and WebGL console errors.

This order follows data ownership from remote creation to local rendering and prevents UI symptoms from obscuring an earlier pipeline break.
