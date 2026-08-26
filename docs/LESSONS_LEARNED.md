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
| API key validation and storage | "Validate" failed on a key the user was certain was correct; the key never appeared to persist across restarts | `apiKey` was sent to `invoke` untrimmed, so incidental copy-paste whitespace changed the Bearer token; separately, `keyring = "3"` had no platform feature enabled, so it silently used a non-persistent, non-shared mock credential store instead of the real OS keychain | Trim the key at the point it is sent, not just at the button-enabled guard; add explicit `windows-native`/`apple-native`/`async-secret-service` features to `keyring` so it uses a real OS backend, and un-skip the `#[ignore]`d real-keychain tests locally to prove a genuine store-then-get round trip |
| API key validation (still failing after the above) | Validation still failed with a confirmed-correct key; no HTTP status was ever visible, only a generic "invalid" | `reqwest`'s `rustls-tls` feature trusts only a bundled Mozilla CA list, not the OS certificate store, so it rejected the certificate presented by an HTTPS-scanning antivirus (Norton) intercepting the connection — every real API call died at the TLS handshake, and the error was discarded rather than logged | Log the real error (status/body or full source chain) instead of collapsing every failure to `false`; switch to `rustls-tls-native-roots`, which sources trusted roots from the OS store like `curl`/schannel already do; verify with a headless diagnostic test hitting the real API before asking for another manual retry |
| Endpoint paths and crash containment | Animate loaded then went to a black screen; "Generate Image" returned Not Found; Rig/Post/Animate/Print required hand-typing raw task IDs | Meshy endpoint paths (`/v1/animation`, `/v2/text-to-image`, `/v2/image-to-image`) were hardcoded in three unsynced places and had drifted from the real paths (and from the FRD, which was correct all along); the real animation-library response's wrapper object was passed through unwrapped, and no Generate panel had a crash-containing error boundary; the existing local asset history was never wired into the panels that need a task ID | Made `provider::meshy::ENDPOINT_MAP` the single canonical endpoint list with the other two derived from it; unwrapped the animation-library response server-side plus a frontend `Array.isArray` guard; added a shared `ErrorBoundary` around every Generate panel; added a thumbnail-driven `AssetTaskPicker` reusing the existing `useAssets` data |

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

## 8. A Crate With No Default Backend Fails Silently, Not Loudly

### Observation

The user entered a correct Meshy API key and clicked Validate; validation failed. The `keyring` crate's own debug logs showed every credential lookup — including the one immediately after a successful `set_password` — returning `MockCredential { ... secret: None ... }`.

### Root Cause

Two independent bugs, both on the API key path:

1. `apiKey` was sent to `invoke('validate_api_key', ...)` and `invoke('set_api_key', ...)` exactly as typed. The button-enabled guard checked `apiKey.trim()`, but the value actually transmitted was not trimmed. A key copy-pasted with a trailing newline or leading space (extremely common — copying from a terminal `cat`, a `.env` file, or a triple-click browser selection all do this) produces a different, invalid `Authorization: Bearer` value even though the key itself is correct.
2. `keyring = "3"` in `Cargo.toml` specified no feature flags. `keyring-rs` 3.x has no default backend by design — `docs.rs`'s own build metadata has to explicitly list `apple-native`, `windows-native`, etc. to document the real backends, and the crate's own doc comment states plainly: with no platform feature enabled, "this crate will use the (platform-independent) mock credential store," which by its own documentation "provides... no persistence" — each `Entry::new()` call gets an independent, empty in-memory store. `Cargo.lock` confirmed it: `keyring`'s locked dependency list was only `["log", "zeroize"]`, with no `windows-sys`, `security-framework`, or D-Bus crate anywhere — proof no OS backend was ever linked in, in any build, since the dependency was first added. Four `#[ignore]`d tests already existed that would have caught this (`test_store_and_get_key` and friends), but being `#[ignore]`d by default, they had never actually been run.

### Resolution

Trim the key at the point it is transmitted (`apiKey.trim()`), not only at the guard. Add `features = ["windows-native", "apple-native", "async-secret-service"]` to the `keyring` dependency. `async-secret-service` (not `sync-secret-service`) was chosen deliberately: it uses the pure-Rust `zbus` D-Bus client instead of binding the system `libdbus-1` C library, so it needs no new CI system package — `sync-secret-service` would have required adding `libdbus-1-dev` to every Linux CI job's `apt-get install` list. Verified by temporarily reverting the feature flags and re-running the `--ignored` tests: `test_store_and_get_key` failed with `left: None, right: Some("msy_test_key_12345")` on the mock backend, and passed against the real Windows Credential Manager once the feature was restored.

### Guardrails

- Trim (or otherwise normalize) any credential/token value at the exact call site that transmits it, not only at a UI-enabled guard several lines away — the two can silently drift.
- A crate with no default feature set is a crate that compiles and runs successfully while doing nothing. `cargo build` succeeding, and even the crate's own happy-path debug logs showing no error, is not evidence a dependency is configured correctly — check what backend it actually resolved to (here, literally logged as `MockCredential`).
- `#[ignore]`d tests that exist specifically to catch a class of bug (here, "does this actually hit the real backend") must be run at least once after any change to the dependency they cover, not left permanently unexercised. Consider a periodic or pre-release CI job that runs `cargo test -- --ignored` on a real (non-sandboxed) runner.
- When adding a system-integration crate feature, check whether it binds a system C library (`pkg-config`/`dep:*-sys`) before assuming it "just works" in CI; prefer a pure-Rust alternative when the crate offers one, and verify by checking whether the resulting `Cargo.lock` pulled in a `-sys` crate.

## 9. A Discarded Error Is a Debugging Tax Paid Later, With Interest

### Observation

After fixing the trim and keychain bugs above, the user retried with a confirmed-correct key. Validation still failed, identically to before — no new information to act on.

### Root Cause

`validate_api_key_inner` mapped every possible failure to a bare `Ok(false)`:

```rust
match client.get_balance().await {
    Ok(_) => Ok(true),
    Err(_) => Ok(false),
}
```

A wrong key (401), no credits (402), a wrong endpoint (404), a DNS failure, and a TLS handshake rejection all produced the exact same user-visible "API key is invalid." The real cause — `reqwest`'s `rustls-tls` feature trusts only a bundled Mozilla CA list, not the OS certificate store, so it rejected the certificate presented by an HTTPS-scanning antivirus (Norton, confirmed installed on this machine) intercepting the connection to `api.meshy.ai` — was completely invisible without instrumentation. `curl` from the same machine, using the OS store via schannel, connected and got a clean `401 Unauthorized` with the same (deliberately wrong) key, proving the failure had nothing to do with the key.

### Resolution

Added `log::error!` on the discarded error path, walking the full `std::error::Error::source()` chain rather than the top-level `Display` (which for `reqwest::Error` only shows "error sending request for url (...)" with none of the underlying cause). This immediately surfaced `invalid peer certificate: UnknownIssuer` — the exact rustls trust-store error. Rather than asking for another manual UI retry to confirm the fix, added a headless diagnostic test (`MeshyClient::new(fake_key).get_balance()` against the real API, run via `cargo test -- --ignored --nocapture`) to get the answer in seconds and iterate without depending on the user's time. Converted it into a permanent regression test once the fix was confirmed.

### Guardrails

- Never collapse a `Result<T, E>` into a bare boolean or generic message on a path a user will hit repeatedly while troubleshooting. Log the real `E` — status code, response body, or full source chain — server-side even when the user-facing message must stay generic for security reasons. The key itself must never be logged; the failure *reason* almost never contains the secret and should always be logged.
- When a network-adjacent bug needs several iterations to pin down, prefer a headless reproduction (a `#[ignore]`d test hitting the real dependency, run with `--nocapture`) over repeated "click this, tell me what happened" round trips through a GUI — it's faster for both sides and produces a permanent regression test as a side effect.
- Cross-check a suspicious network failure against a second HTTP client that uses a different trust store (`curl` via the OS's native TLS) before assuming the credential, request, or remote service is at fault — a client-specific TLS trust gap looks identical to a real auth failure from the request's own error message alone.

## 10. A Duplicated Endpoint List Drifts; A Missing Boundary Check Crashes the App

### Observation

Three independent, user-reported symptoms turned out to share two root causes: the Animate tab loaded briefly then went to a black screen; clicking "Generate Image" (Text to Image and Image to Image) returned a Not Found error; and Rigging, Post-Process, Animation, and Print all required the user to hand-type a raw task ID with no way to see or pick from their own generated assets.

### Root Cause

Two unrelated defects, both pre-existing before this fix:

1. **Endpoint paths were hardcoded in three unsynced places.** `provider/meshy.rs::ENDPOINT_MAP`, `commands/api.rs::endpoint_to_task_type()` (a reverse lookup), and `commands/validation.rs::TASK_ENDPOINTS` (a security allowlist) each kept their own literal copy of every Meshy endpoint path. Three of Meshy's endpoints drifted from their real paths: `/v1/animation` instead of the real `/v1/animations` (plural), and `/v2/text-to-image` / `/v2/image-to-image` instead of the real `/v1/...` (there is no v2 for these). `docs/feature_requirements_documentation.md` had the correct paths the entire time — the FRD was never wrong; the implementation silently drifted from its own specification, and nothing forced the three copies to agree with each other or with the FRD. ADR-0004 had already identified `validation.rs`'s copy as a problem and decided it should be provider-supplied instead (see its "Consequences" section and Risk Register item RR4 in `docs/refactoring/provider-abstraction.md`), but that decision was never implemented.
2. **No render-time crash in a Generate panel was contained.** The real animation-library endpoint returns `{"animations": [...]}` (an object), but the backend passed that object through unwrapped, and `AnimationPanel` called `(library ?? []).map(...)` on it — `.map` is not a function on a plain object, so this threw during render. Lesson 6 above already established that an *uncontained* render failure can blank the entire WebView, and had already added a local error boundary around the 3D preview specifically — but no equivalent boundary existed around any Generate tab panel, so the same failure class recurred in a different component that had never been protected.

The asset-picker UX gap turned out to be the same class of drift as the endpoint paths: `docs/feature_requirements_documentation.md` already specified it (FR-POST-01-F1: "Asset selector: dropdown of all assets or manual task ID input"; FR-POST-07-F4: rig task ID "can be auto-filled from a succeeded rigging task"), but the shipped panels only ever implemented the manual-entry half. The data needed to build the dropdown half already existed — the SQLite asset history (thumbnails, task type, status) the Gallery's `useAssets` hook already fetches — it just wasn't wired into these four panels.

### Resolution

- `provider::meshy::ENDPOINT_MAP` is now the single canonical endpoint list. `commands/api.rs::endpoint_to_task_type()` derives its reverse lookup from it, and `commands/validation.rs` derives `task_endpoints()` from it instead of keeping a separate `TASK_ENDPOINTS` const — completing the ADR-0004 consequence that was decided but never shipped.
- `MeshyProvider::fetch_animation_library` now unwraps the `animations` key server-side (falling back to an empty array if it's ever absent), and `useAnimationLibrary` independently guards with `Array.isArray` — two layers, since either the provider or a future provider (ADR-0004 anticipates more than one) could reintroduce the mismatch.
- A shared `ErrorBoundary` component (`src/components/common/ErrorBoundary.tsx`, generalized from the boundary Lesson 6 added only to `AssetPreview3D`) now wraps every Generate tab panel, not just the 3D preview.
- A new `AssetTaskPicker` component reuses the existing `useAssets` data to offer a thumbnail-driven picker in Rigging, Post-Process, Animation, and Print, alongside (not replacing) the manual entry field.

### Guardrails

- A value hardcoded in more than one place is a value that will eventually disagree with itself. When a second copy of an endpoint list, a wire-format mapping, or any other cross-cutting constant is about to be written, check whether the first copy can be made canonical and the second derived from it instead — as `provider::meshy::ENDPOINT_MAP` now is for both `commands/api.rs` and `commands/validation.rs`.
- A local error boundary around one crash-prone component (Lesson 6's 3D preview) is not evidence the rest of the app is protected — grep for every top-level render location (here, every `TabsContent` in `src/app/routes.tsx`) and confirm each one is contained, not just the component that crashed last time.
- Before assuming a hand-typed test mock matches a real backend response, check what the real endpoint actually returns. `useAnimationLibrary.test.tsx` mocked `invoke` to resolve a bare array directly for over a year of the app's life, while the real endpoint had always returned a wrapping object — the test never exercised the boundary it was named after. A wiremock/`MockServer` test that asserts on the real HTTP path and body (as added in `provider/meshy.rs`) catches this; a hand-mocked `invoke` return value does not.
- When a UI requires an identifier a user is expected to already have (a task ID, a file path, a record key), check whether the application already has a list of those identifiers with enough context (thumbnail, type, status) to let the user pick rather than recall and retype one.

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

0. API key transmission (trimmed value reaching `validate_api_key`/`set_api_key`), the keychain backend actually resolved (check `keyring`'s debug log for `MockCredential` vs. a real platform backend), and — if validation fails with no obvious cause — the actual error `validate_api_key_inner` logs (`MeshyError::ApiError` status/body vs. `MeshyError::Network`'s full source chain; a TLS trust failure looks nothing like a wrong key). Every step below assumes a working provider.
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
