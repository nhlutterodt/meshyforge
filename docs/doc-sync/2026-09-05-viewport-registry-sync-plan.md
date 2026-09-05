# Doc Sync Plan — ADR-0006 Viewport Control Registry

**Triggered by:** ADR-0006 (`docs/adr/0006-viewport-control-registry.md`), Accepted 2026-09-05.
**Also folds in:** a pre-existing staleness bug found during claim verification (pass b), unrelated to ADR-0006 itself but in the same rule-ID namespace, so fixed in the same pass rather than left to recur silently.

## 1. `docs/UI_UX_Documentation.md`

**Routing:** ADR-0006's Consequences list names this doc directly (§10.1 rule table, guardrail count).

### Hunk 1 — add VP-13/VP-14 to §10.1

Old:
```
| **VP-12** | The 3D preview must use deterministic local lights (`<ambientLight>` + `<directionalLight>`) and must not use `<Environment preset="...">` or fetch HDR files from a CDN. The CSP `connect-src` must not allow external CDN origins for preview rendering. | [BUILD] [DECOUPLE] |

### 10.2 Camera and Controls
```
New:
```
| **VP-12** | The 3D preview must use deterministic local lights (`<ambientLight>` + `<directionalLight>`) and must not use `<Environment preset="...">` or fetch HDR files from a CDN. The CSP `connect-src` must not allow external CDN origins for preview rendering. | [BUILD] [DECOUPLE] |
| **VP-13** | Client-side viewport controls (reset-view, scale-preview, and any future local/free/non-destructive render control) must be added via a typed control-registry hook (`useViewportControls`), not ad hoc props on the viewer component. | [ARCH] |
| **VP-14** | Before adding a new preview/asset capability, confirm whether it can be satisfied locally via the viewport-control registry (free, instant, non-destructive) before wiring it to a `TaskProvider` endpoint (paid, async, permanent). Document the determination in the implementing PR's description. | [ARCH] [DECOUPLE] |

### 10.2 Camera and Controls
```

### Hunk 2 — §14 guardrail count table

Old: `| **3D Viewport** (VP-01–12) | 12 | Vitest runtime guardrails + component tests + Tauri smoke test + memory leak test |` / `| **Total** | **130** | — |`
New: `| **3D Viewport** (VP-01–14) | 14 | Vitest runtime guardrails + component tests + Tauri smoke test + memory leak test |` / `| **Total** | **132** | — |`

### Version bump

`1.0.1` → `1.0.2`, Date → `2026-09-05`. Changelog line: "Added VP-13/VP-14 (viewport control registry, local-first decision rule) per ADR-0006."

## 2. `docs/coding_standards.md`

**Routing:** §19.1's rule-ID cross-reference index lists `VP-01–08 | 3D viewport... | UI/UX §10.1`, which is **already stale independent of ADR-0006** — ADR-0003 added VP-09–12 (per `docs/CHANGELOG.md`'s 1.0.1 entry) but this index row was never updated to match. Caught here via doc-sync's claim-verification pass, not caused by this ADR.

### Hunk — §19.1 index row

Old: `| VP-01–08 | 3D viewport | Canvas lifecycle, dpr, frameloop | UI/UX §10.1 |`
New: `| VP-01–14 | 3D viewport | Canvas lifecycle, dpr, frameloop, control registry, local-first rule | UI/UX §10.1 |`

Total count row is a cross-doc rollup (126 CSD-native + 72 UI/UX-owned = 198) that does not individually track VP's sub-count, so it is unaffected by the VP delta and left as-is.

### Version bump

`1.0.1` → `1.0.2`, Date → `2026-09-05`. Changelog line: "Corrected stale VP-01–08 index row to VP-01–14 (VP-09–14 were added by ADR-0003/ADR-0006 but never reflected here); no rule text duplicated, cross-reference only."

## 3. `docs/CHANGELOG.md`

Append under `[Unreleased]`, new `### Added` bullets:
- ADR-0006 (viewport control registry, local-first decision rule): `docs/adr/0006-viewport-control-registry.md`, `VP-13`/`VP-14` (proposed → now recorded in UI/UX §10.1 and CSD §19.1).

### Fixed
- `coding_standards.md` §19.1's VP index row was stale since ADR-0003 (said VP-01–08, should have said VP-01–12); corrected to VP-01–14 alongside the ADR-0006 addition.

## Applied

This plan was applied directly (all three hunks are prose/rule-table edits outside doc-sync's `--apply` allowlist, so applied as a reviewed manual edit at the user's explicit request, not via the automated allowlist path) in the same session it was drafted, per the user's request to have documentation correct before implementation begins.
