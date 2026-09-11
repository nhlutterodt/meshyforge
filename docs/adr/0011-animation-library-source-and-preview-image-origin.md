# ADR-0011: Animation library source endpoint and preview-image origin

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-11 |
| **Deciders** | Repository owner (confirmed in-session, 2026-09-11) |
| **Phase** | Phase 4 (Asset Library) / Phase 5 (Character Pipeline) |
| **Related rules/features** | SEC-09, FR-POST-07 (F2, F3), ADR-0002 |
| **Supersedes** | None. Extends ADR-0002's origin-allowlist policy to a second control surface. |

## Context

The animation action picker (`FR-POST-07`) sources its ~500-entry library from
an **undocumented internal web endpoint**, not the public API.

`src-tauri/src/provider/meshy.rs:92-95`:

```rust
const ANIMATION_LIBRARY_PATH: &str = "/web/public/animations/resources";

fn animation_library_url(base_url: &str) -> String {
    let root = base_url.strip_suffix("/openapi").unwrap_or(base_url);
    format!("{root}{ANIMATION_LIBRARY_PATH}")
}
```

The `/openapi` suffix is deliberately stripped to reach the web app's own
resource endpoint. It returns `{"animations": [...]}`, which
`fetch_animation_library` unwraps to a bare array
(`provider/meshy.rs:813-829`), guarded by two tests
(`provider/meshy.rs:1031-1061`) and a defensive `Array.isArray` check in
`src/hooks/useAnimationLibrary.ts:11-17` after a prior crash recorded in
`docs/LESSONS_LEARNED.md`.

This works. It is also an unversioned internal surface with no deprecation
contract, reached by stripping a documented API prefix — a pattern that fails
silently and totally if the web app is restructured.

**The documented public alternative** is `GET /openapi/v1/animations/library`:
consumes no credits, returns the complete list in one call (not paginated),
filterable by `search` / `category` / `sub_category` / `action_ids`. Each entry
carries fields the current source does not expose:

| Field | Current source | Public API | Value |
|---|---|---|---|
| `action_id` | as `id` | yes | wire value |
| `name` | yes | yes | display |
| `key` | **absent** | yes | stable slug; durable identity |
| `category` | yes | yes | grouping |
| `sub_category` | **absent** | yes | second-level filter |
| `preview_url` | **absent** | yes | animated GIF preview |

`action_id` is documented as non-contiguous, with retired actions leaving
permanent gaps and disappearing from the endpoint. `key` is the stable
identifier. Today `src/lib/meshy-types.ts:377-381` declares
`AnimationLibraryItem { id, name, category, thumbnail? }`, and `thumbnail?` is
never rendered — `AnimationPanel.tsx:89-99` shows a name and a category badge
only. The user searches ~500 opaque action names such as "Reaping Swing" with
no visual.

**The blocking constraint.** `preview_url` GIFs are served from
`https://cdn.meshy.ai`. The Tauri CSP (`src-tauri/tauri.conf.json`) is,
verbatim:

```
default-src 'self'; connect-src 'self' ipc: http://ipc.localhost asset: http://asset.localhost https://asset.localhost; img-src 'self' asset: http://asset.localhost https://asset.localhost https://assets.meshy.ai data:; script-src 'self'; style-src 'self' 'unsafe-inline'
```

`img-src` allows `https://assets.meshy.ai` but **not** `https://cdn.meshy.ai`.
Preview GIFs would be blocked by the webview and fail silently.

ADR-0002 adopted an exact-host allowlist (`assets.meshy.ai` only) for
**downloads**, enforced by `validate_download_url`
(`src-tauri/src/commands/validation.rs:185-192`, HTTPS + exact host match,
called at `api.rs:141, 162, 185`), and stated that no alternate host is
permitted "without an ADR." Hence this ADR.

**Precedent search record:**

| Searched | Where | Result |
|---|---|---|
| `preview_url`, `sub_category` | `src-tauri/src/**/*.rs`, `src/**` | 0 hits |
| `cdn.meshy.ai` | entire repo | 0 hits |
| `thumbnail` render | `src/components/generate/AnimationPanel.tsx` | declared on type, never rendered |
| download host allowlist | `provider/meshy.rs:90` | `["assets.meshy.ai"]` |

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A: Status quo — keep the internal `/web/public/...` endpoint** | Zero work; two passing tests already cover it | Unversioned internal surface with no deprecation contract; forgoes `key`, `sub_category`, `preview_url` permanently; a silent breakage takes the whole picker down | Forward-compatibility; FR-POST-07-F3 intent |
| **B: Switch to `GET /openapi/v1/animations/library`; add `https://cdn.meshy.ai` to `img-src` only** | Supported, documented, credit-free endpoint; unlocks GIF previews, sub-category filtering and stable `key` identity; small, contained diff | Widens the webview image origin set by one host; requires a threat-model note | Nothing, if the download allowlist is held unchanged |
| **C: Switch endpoint, but proxy preview GIFs through Rust into the local asset cache** | No CSP widening at all; previews work offline | Requires a new command, cache-eviction policy, and disk budget for ~500 GIFs; adds `cdn.meshy.ai` to the **privileged fetch** surface, which is a strictly higher-trust tier than rendering | ADR-0002's minimal-SSRF-exposure rationale |

## Decision

Adopt **Option C**, revised.

Switch the library source to the documented public endpoint. Preview images are
**cached locally and served from disk as the primary path**; `cdn.meshy.ai` is
permitted **only as a fallback render origin** when no local copy exists.

> **Decision history.** This ADR was first drafted adopting Option B (render
> directly from `cdn.meshy.ai`). The repository owner rejected a remote CDN as
> a primary runtime dependency and directed that it be a fallback only. Option C
> is adopted in its place. The security analysis below is **revised
> accordingly** — see "Correction to the original SEC-10 rationale".

**Decision rules:**

1. `ANIMATION_LIBRARY_PATH` becomes `/v1/animations/library`, appended to the
   standard `base_url` **without** stripping `/openapi`. The bespoke
   `animation_library_url` prefix-stripping helper is removed.
2. The command layer normalises the response into a typed
   `AnimationLibraryEntry` with a camelCase IPC contract, accepting the API's
   snake_case (`action_id`, `sub_category`, `preview_url`) via serde aliases.
   The frontend never sees provider-shaped snake_case fields.
3. `AnimationLibraryItem` is widened to
   `{ id, key, name, category, subCategory?, previewUrl?, thumbnail? }`.
   `id` continues to carry `action_id`, so `AnimationRequest.actionId` is
   unchanged and no request-shape migration is required.
4. `key` is the stable identity for storage and for the on-disk cache filename;
   `action_id` remains the wire value only.
5. **Preview caching is local-first.** A `cache_animation_preview` command
   downloads a preview to `{data_dir}/previews/{sanitised_key}.gif` and returns
   the local path. It is idempotent — an existing file is returned without a
   refetch. The picker renders the local file via the `asset:` protocol.
6. **Caching is demand-driven, not bulk.** Only the preview for the currently
   selected action is fetched. The library holds ~500 entries; eagerly caching
   all of them would be an unacceptable disk and network cost for a picker.
7. `https://cdn.meshy.ai` is added to the CSP `img-src` directive **and to no
   other directive**, solely so the fallback render path works before a local
   copy exists or when caching fails.
8. `https://cdn.meshy.ai` is added to a **preview-fetch allowlist that is
   separate from `DOWNLOAD_HOSTS`**. Model/texture downloads remain restricted
   to `assets.meshy.ai` exactly as ADR-0002 requires; the preview path cannot
   widen them.
9. Cache filenames are derived by sanitising `key` to `[A-Za-z0-9_-]` only.
   Path separators and traversal sequences must be impossible by construction.
10. Preview failure is always non-fatal: the picker remains fully operable on
    name / category / sub-category text with no image at all.

### Correction to the original SEC-10 rationale

The Option B draft argued that `img-src` is a strictly lower trust tier than
privileged fetch, and therefore that permitting the render origin while refusing
the fetch origin was the conservative choice. **Under Option C that argument no
longer applies**, because local-first caching necessarily means the privileged
Rust client fetches from `cdn.meshy.ai`.

Stated plainly: **this decision adds slightly more total attack surface than
Option B did** — it adds a fetch origin *and* a fallback render origin, where
Option B added only a render origin. That cost is accepted deliberately in
exchange for removing a remote CDN from the primary runtime path, giving
offline-capable previews after first use, and eliminating repeat network traffic
on every picker open.

The residual SSRF exposure is bounded by the same control that bounds
`assets.meshy.ai` today: the URL is not attacker-supplied but taken from an
authenticated API response, it is validated for HTTPS and exact host before any
request, and the destination filename is sanitised rather than derived from the
URL.

**Newly proposed rule ID(s):**

- `SEC-10` (proposed, revised) — Remote origins must be allowlisted separately
  per capability. A preview-image origin permitted for fetching or rendering
  previews must not be added to `DOWNLOAD_HOSTS` and must not be accepted by
  `validate_download_url`. Widening the model/texture download allowlist
  requires its own ADR.
- `SEC-11` (proposed) — Provider endpoints must be reached via the provider's
  documented, versioned API surface. Constructing a URL by stripping or
  rewriting the documented API prefix to reach an internal endpoint requires an
  ADR recording the absence of a public equivalent.
- `SEC-12` (proposed) — Any remote asset cached to disk must derive its
  filename from a sanitised allowlisted-character identifier, never from the
  remote URL or an unsanitised provider-supplied string.

## Consequences

**Positive:**

- The picker gains animated previews, which is the single largest usability
  gain available for a ~500-entry list of opaque action names.
- `sub_category` enables a second filter axis without new API calls — the
  endpoint returns everything in one free request.
- Storing `key` removes a latent failure mode where a retired `action_id`
  lingers in persisted state and later produces a `400`.
- The app stops depending on an undocumented internal surface.
- `SEC-10` gives the project a reusable, principled distinction between render
  origins and fetch origins, rather than re-litigating per host.

**Negative:**

- The webview image origin set grows by one host. Mitigated by `SEC-10`'s
  explicit scope limit and by the fact that `img-src` cannot initiate
  privileged requests.
- Preview GIFs are fetched from the network on picker open, so the picker is
  visually degraded offline (text still works). No offline guarantee is claimed.
- A response-shape change on the new endpoint would require updating the shim;
  accepted, because the endpoint is versioned and documented, unlike the current
  one.

**Follow-ups:**

- Docs to update (via `doc-sync`): `docs/security_threat_model.md` (§3
  Component (a) Tauri Webview — record `cdn.meshy.ai` as a render-only
  external dependency), `docs/coding_standards.md` (register SEC-10, SEC-11),
  `docs/feature_requirements_documentation.md` (FR-POST-07-F2/F3 amended for
  preview thumbnails and sub-category filtering), `docs/CHANGELOG.md`.
- Tests to add: Rust — library URL construction no longer strips `/openapi`;
  bare-array response handled; wrapped-array response still handled; empty
  fallback preserved. TypeScript — picker renders `previewUrl` when present,
  and remains operable when the image fails to load.
- Tech debt to register: Option C (local GIF cache for offline previews) is
  deferred, not rejected; revisit if an offline requirement is adopted.

## References

- `docs/adr/0002-signed-download-origin-policy.md` (SEC-09, exact-host allowlist)
- `docs/governance/grounding/2026-09-11-animation-engine-investigation.md` §2
- `docs/security_threat_model.md` §3, §10 (residual risks)
- `src-tauri/src/provider/meshy.rs:90-95, 813-829, 1031-1061`
- `src-tauri/src/commands/validation.rs:185-192`
- Related ADRs: ADR-0002, ADR-0010
- Related tasks: TASK-0029, TASK-0030
