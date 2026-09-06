# Grounding Memo — Concept 10: Unified Contextual Workbench

Status: grounding only (no decision). Read-only research; no source files were
modified. This memo does not propose a final information architecture. It
grounds the CURRENT navigation/component structure precisely enough for
whoever eventually confirms the four related concept ADRs (PBR Material
Studio, Rigging/Animation Pipeline, Geometry/LOD Suite, Print Workbench) to
judge whether this UI paradigm shift is warranted — and argues explicitly
that this concept should be sequenced **after**, not alongside, those four.

---

## Current state

### Navigation structure (today: sidebar + tabs, not a workbench)

- `src/app/layout.tsx:13-31` — the root app shell is a fixed 3-row flex
  column: `TopBar` (row 1) → a flex row of `Sidebar` + `<main>` content (row
  2) → `StatusBar` (row 3). This matches `docs/UI_UX_Documentation.md` §3.1
  (lines 163-181, ASCII diagram) and Layout Rules `LAY-01`–`LAY-08`
  (`UI_UX_Documentation.md:187-194`).
- `src/components/common/Sidebar.tsx:15-20` — exactly 4 top-level nav items:
  `generate`, `gallery`, `tasks`, `settings` (`NAV_ITEMS` array), each
  switching `useAppStore`'s `activeView` (`Sidebar.tsx:23-24,66`). Sidebar
  width is `w-56`/`w-14` collapsed (`Sidebar.tsx:32-33`, matching
  `LAY-04`), and it auto-collapses below 1280px per `RES-01`
  (`UI_UX_Documentation.md:786`).
- `src/app/routes.tsx:44-169` — `Routes()` is a single `switch (activeView)`
  with 4 cases (`generate`, `gallery`, `tasks`, `settings`;
  `routes.tsx:62-168`). There is no router library — this switch *is* the
  routing layer.
- Within the `generate` case, a second, independent nested-tab layer exists:
  `routes.tsx:65-126` renders a shadcn `Tabs` with 9 `TabsTrigger`/
  `TabsContent` pairs (`routes.tsx:70-125`), each panel wrapped in its own
  `ErrorBoundary` with a `GeneratePanelFallback` (`routes.tsx:33-42,82-124`)
  so one panel crashing doesn't take down the others. This tab state lives in
  `useAppStore`'s `activeGenerateTab` (`src/stores/appStore.ts:12-22,36-37`),
  a separate piece of state from `activeView`.
- So today's structure is **two nested, independent selector layers** —
  sidebar view (4 options) then, only inside Generate, a tab strip (9
  options) — not a single persistent viewport with adaptive side panels.

### Full panel/component inventory (the workbench's migration surface)

`src/components/generate/` — 9 panels, each mounted as one `TabsContent` in
`routes.tsx:81-124`:

| File | Lines | Wired in routes.tsx |
|---|---|---|
| `TextTo3DPanel.tsx` | 67 | 81-85 |
| `ImageTo3DPanel.tsx` | 72 | 86-90 |
| `MultiImagePanel.tsx` | 437 | 91-95 |
| `PostProcessPanel.tsx` | 202 | 96-100 |
| `RiggingPanel.tsx` | 61 | 101-105 |
| `AnimationPanel.tsx` | 79 | 106-110 |
| `ImageGenPanel.tsx` | 112 | 111-115 |
| `PrintPanel.tsx` | 115 | 116-120 |
| `CreativeLabPanel.tsx` | 100 | 121-125 |

`src/components/gallery/` — 6 non-test components: `AssetCard.tsx` (88),
`AssetDetail.tsx` (237), `AssetGrid.tsx` (51), `AssetPreview3D.tsx` (181),
`SearchBar.tsx` (40), `TagFilter.tsx` (41). `AssetGrid`/`SearchBar`/
`TagFilter` are composed directly in `routes.tsx:133-148` (gallery case);
`AssetDetail` replaces that whole view when `selectedAssetId` is set
(`routes.tsx:130-131`).

Other component directories a workbench redesign would also touch:
`src/components/common/` (11 non-test files, including `Sidebar.tsx`,
`TopBar.tsx`, `StatusBar.tsx` — the shell itself), `src/components/settings/`
(4: `AboutPanel`, `ApiKeyManager`, `CreditBalance`, `PreferencesPanel`),
`src/components/tasks/` (4: `TaskCard`, `TaskHistory`, `TaskMonitor`,
`TaskProgressBar`), `src/components/export/` (2: `ExportDialog`,
`ExportProgress`). Counts verified via directory listing, not estimated.

### The most load-bearing fact: there is no persistent central 3D viewport today

`AssetPreview3D` (`src/components/gallery/AssetPreview3D.tsx`) is the only 3D
viewport component in the codebase (confirmed by grep — the only non-test
references are `AssetDetail.tsx` and `ErrorBoundary.tsx`'s generic type
usage). It is:

- Lazy-loaded and mounted **only** from `AssetDetail.tsx:36-40` (dynamic
  `import()`), inside a `Suspense` boundary at `AssetDetail.tsx:123-125`.
- `AssetDetail` itself only renders when `selectedAssetId` is set inside the
  `gallery` view case (`routes.tsx:130-131`) — i.e., the 3D viewport is
  reachable only via Sidebar → Gallery → select an asset.
- Governed by `UI_UX_Documentation.md` `VP-01`
  (`UI_UX_Documentation.md:726`): *"The R3F Canvas mounts only when the
  asset detail panel is open. It unmounts when the panel closes. No hidden
  Canvas instances."*

None of the 9 generate panels render `AssetPreview3D` or any 3D canvas —
Text→3D, Image→3D, Rigging, Animation, Print, etc. are all form-only panels
today (confirmed: `AssetPreview3D` does not appear in any file under
`src/components/generate/`). A "3D viewport always at the center, with a
generation drawer beside it" workbench is therefore not a layout
rearrangement of existing pieces — it requires overturning `VP-01` itself
(keeping a Canvas mounted across Generate and Gallery views simultaneously)
plus building live-preview wiring into every generate panel that has none
today. That is a `VP-*` rule reversal, which the ADR-log's Step 2 criterion 2
("extends, narrows, or deviates from a numbered rule") triggers on its own.

### Component-taxonomy mismatch worth flagging

`UI_UX_Documentation.md` §4.1 (lines 216-226) already documents a planned
"Feature" component category — `GenerateView`, `GalleryView`, `TaskView`,
`SettingsView` — as the route-mapped, read-write-Zustand layer. In the actual
code, no such components exist; `routes.tsx`'s inline `switch` plays that
role directly (`routes.tsx:62-168`), and the "Composite" panels
(`TextTo3DPanel` etc., §4.1 examples list) are wired straight into
`TabsContent` with no intervening Feature-layer component. A workbench
redesign inherits this gap: the doc's own taxonomy for "how a
route/view-level component should be shaped" doesn't match what's actually
built, so a mode-based (Drafting/Painting/Rigging/Printing/Optimizing)
Feature layer would be new construction, not a refactor of an existing
Feature layer.

---

## Blast radius

Concrete, not "many":

- **2 files** implement all current navigation/routing: `src/app/routes.tsx`
  (169 lines, all of it) and `src/components/common/Sidebar.tsx` (79 lines,
  all of it). `src/app/layout.tsx` (32 lines) is the app-shell frame both
  depend on.
- **1 store slice** (`src/stores/appStore.ts:8-41`) owns `activeView`,
  `activeGenerateTab`, and `sidebarCollapsed` — all three would need to be
  redesigned or replaced by a mode-based equivalent.
- **9 generate panels** (3,907 total lines across `generate/` +
  `gallery/` non-test files per `wc -l`) would each need either (a) a live
  3D-preview slot added, (b) restructuring into a left-drawer-compatible
  form factor, or (c) both.
- **6 gallery components**, most centrally `AssetPreview3D.tsx` (181 lines)
  and `AssetDetail.tsx` (237 lines) — the only two files that currently know
  how to mount/manage the 3D Canvas at all.
- **1 doc-level rule reversal**: `VP-01` (`UI_UX_Documentation.md:726`)
  explicitly prohibits what a persistent central viewport requires (a Canvas
  that survives view switches). Reversing it has downstream perf
  implications the doc already flags elsewhere in §10.1 (`VP-02`
  `frameloop="demand"`/`"always"` switching, `VP-07` GLTF cache release on
  unmount) — a workbench would need new answers for both once the Canvas no
  longer simply unmounts between assets.
- **11 `common/` components** (the shell/shared layer: `Sidebar`, `TopBar`,
  `StatusBar`, plus 8 others) are candidates for at least partial rework
  since the shell's 3-row/sidebar-left grid (`LAY-01`–`LAY-08`) is precisely
  what a center-viewport-plus-two-drawers layout would replace.
- Not directly in scope but adjacent: `settings/` (4 files), `tasks/`
  (4 files), `export/` (2 files) — these live inside the current
  Sidebar-selected `activeView` switch and would need a place in whatever
  navigation model replaces or wraps it.

This makes Concept 10 the only one of the ten audit concepts identified so
far (in this session's groundings) whose blast radius spans the app shell,
the routing switch, the global store, and effectively every panel component
— not one subsystem. That breadth is itself why it should be evaluated last,
not first (see Sequencing below).

---

## Viewport-registry precedent (ADR-0006)

`docs/adr/0006-viewport-control-registry.md` (read in full) is the most
directly relevant prior decision:

- It established `useViewportControls` (`src/hooks/useViewportControls.ts`,
  100 lines, read in full) as the single seam for adding new **client-side,
  local, free, non-destructive** viewport controls (reset-view, zoom
  in/out/dolly) — consumed today only by `AssetPreview3D.tsx`.
- It codified two new rules, now merged into `UI_UX_Documentation.md` §10.1
  (confirmed present at lines 738-739, so `doc-sync` has already run against
  this ADR):
  - **`VP-13`**: new client-side viewport controls must go through the
    registry hook, not ad hoc props on the viewer component.
  - **`VP-14`**: before wiring any new preview/asset capability to a paid
    `TaskProvider` endpoint, first check whether it can be satisfied locally
    via the registry (view-only vs. asset-mutating is the dividing line).
- Scope note: `useViewportControls` governs *what controls exist on the
  Canvas* (rotate/zoom/reset). It says nothing about *when the Canvas is
  mounted, where it sits in the layout, or what surrounds it* — those are
  `VP-01` (Canvas lifecycle) and `LAY-01`–`08` (layout grid) territory,
  which ADR-0006 does not touch and does not supersede.

**Fit assessment for Concept 10:** A "contextual tool/inspector panel that
adapts based on active mode" is a different extensibility axis than
ADR-0006 solved. ADR-0006's registry answers "how do I add one more control
to *one* viewer instance without editing it." Concept 10 asks "how do I swap
an entire panel's contents based on an app-level mode, while a *persistent*
viewer stays mounted underneath." The existing registry pattern does not
obviously extend to that — it has no notion of "mode," no lifecycle spanning
across the Sidebar's `activeView` switch, and was designed around a
single-viewer, mount-on-open/unmount-on-close model (`VP-01`) that a
persistent-workbench viewport would need to replace outright. Whoever drafts
Concept 10's eventual ADR should treat "does the mode-switching pattern
extend `useViewportControls`'s registry, or does it need an entirely
separate registry/store keyed by mode" as one of its Options — not assume
either answer.

---

## Explicit sequencing dependency

This concept should be confirmed **last**, after the four sibling concepts
(PBR Material Studio [audit #2], Rigging/Animation Pipeline [audit #3],
Geometry/LOD Suite [audit #4], Print Workbench [audit #5]) reach settled
ADRs. Reasons, grounded in what's already been found this session:

1. **The right-hand "contextual tool panel" has no defined contents without
   those four ADRs.** The audit's five named modes (Drafting, Material
   Painting, Rigging, Printing, Geometry Optimization) map directly onto
   four of the five sibling concepts. Until those decide what
   inspector/tool UI each mode actually needs, Concept 10 has nothing
   concrete to lay the right panel out around — it would be designing the
   frame before the exhibits exist.
2. **Concept #8 (Hybrid Local Execution) is already flagged as foundational
   input to #4 and #5** (`docs/governance/task-manifest.yaml:262`: "this
   task's outcome is relevant input for any future work on Concepts #4
   ... and #5 ... since all of them ask 'should this operation run locally'
   without yet having an answer to 'how would MeshyForge run anything
   locally at all.'"). Concept 10's Printing/Geometry modes inherit that same
   open dependency one level further downstream — a workbench ADR drafted
   before #8/#4/#5 settle risks baking in assumptions (e.g., which
   operations show live in-viewport feedback vs. round-trip to the API) that
   those ADRs could invalidate.
3. **This session already found two audit "current implementation" claims to
   be wrong on inspection** (CreativeLabPanel.tsx per
   `docs/governance/task-manifest.yaml:314` — it doesn't call a real Creative
   Lab API at all, just decorates a generic Text→3D call; and ExportDialog.tsx
   per `task-manifest.yaml:279`). Concept 10's own audit framing ("modular
   generation drawer," "adapts based on active mode") should not be taken at
   face value either — this grounding confirms the *current* structure
   (tabs, not drawers; no live viewport in Generate at all) precisely so a
   later ADR isn't drafted against the audit's assumed baseline instead of
   the real one.
4. **Reversing `VP-01`** (Canvas lifecycle) is exactly the kind of
   "expensive to reverse" foundational change ADR-0006 itself was gated on
   (its own trigger cited "criterion 6 ... foundational UI architecture;
   expensive to redo once other panels/viewers depend on it" —
   `docs/adr/0006-viewport-control-registry.md:20-22`). Doing this twice —
   once loosely for Concept 10 now, then again more precisely once #2/#3/#4/#5
   land — would be strictly worse than doing it once, last.

---

## Precedent search record

- Searched terms: `workbench`, `contextual panel`, `drafting mode`,
  `unified viewport`, `Unified Contextual Workbench`, `Concept #10`,
  `concept-10` (case-insensitive) across `docs/` (recursive) via grep.
- Also searched `sidebar`, `navigation`, `layout` (case-insensitive) across
  `docs/UI_UX_Documentation.md` to enumerate every IA-relevant heading/rule.
- Results:
  - `workbench`: 2 hits, both incidental — `docs/governance/task-manifest.yaml:262`
    and `docs/governance/grounding/2026-09-05-concept-08-hybrid-local-execution.md:7,188`
    — both refer to the *separate* "3D Printing Workbench" concept (#5), not
    this one, and both are self-referential mentions inside concept-08's own
    memo, not a prior grounding of Concept 10.
  - `contextual panel`, `drafting mode`, `unified viewport`, `Unified
    Contextual Workbench`, `Concept #10`, `concept-10`: **zero matches**
    anywhere in `docs/`. No prior grounding, ADR, or planning-doc section
    addresses this proposal by name or concept.
  - `docs/adr/*.md` (all 6 existing ADRs, via README index): none address
    app-shell navigation/layout restructuring. ADR-0006 is the closest
    (viewport controls) but is scoped to control wiring, not layout/mode
    switching (see Fit assessment above).
- Conclusion: this is a genuinely new proposal with no existing precedent or
  partial prior decision to build on — everything above is grounded in
  reading the live navigation/component code and the current
  `UI_UX_Documentation.md` spec, not in any prior architectural discussion.

---

## Preliminary needs-an-ADR classification

Per `.claude/skills/adr-log/SKILL.md` Step 2 (`needs-an-ADR test`), this
proposal trips multiple independent criteria — any single one is sufficient,
and it hits at least four:

- **Criterion 1** (crosses IPC boundary or binds ≥2 modules/a
  directory-level convention): binds the entire `src/components/generate/`,
  `src/components/gallery/`, and `src/components/common/` directories plus
  `src/app/routes.tsx`, `src/app/layout.tsx`, and `src/stores/appStore.ts` —
  far more than 2 modules.
- **Criterion 2** (extends/narrows/deviates from a numbered rule): would
  require reversing or substantially rewriting `VP-01` (Canvas
  mount-only-when-open lifecycle, `UI_UX_Documentation.md:726`) and
  rewriting `LAY-01`–`LAY-08` (the 3-row/sidebar-left shell grid,
  `UI_UX_Documentation.md:187-194`), plus likely `RES-01` (sidebar
  auto-collapse behavior, line 786) and the Z-index scale (§3.3,
  lines 196-211) once a third panel column exists.
- **Criterion 2 (rule-ID namespace, UI/UX)**: also implicates `CMP-04`
  (no prop drilling beyond two levels, `UI_UX_Documentation.md:257`) since a
  mode-driven right panel reading viewport/asset state will need either a
  new store slice or careful prop-threading design, and the `4.1`/`4.2`
  Component Taxonomy tables (categories, state-access matrix) would need a
  new "mode" concept added to whichever category the contextual panel falls
  into.
- **Criterion 6** (expensive to reverse / likely re-litigated): explicitly
  the framing ADR-0006 used for its own, much narrower, viewport change
  (`docs/adr/0006-viewport-control-registry.md:20-22`). Concept 10 is a
  strict superset of that same "foundational UI architecture" risk class,
  scaled to the entire app shell.
- Per Step 5, this is squarely an **Architectural** classification (the
  highest-caution category: "ALWAYS pause and present the classification,
  the options, and the recommended option to the user for confirmation
  before writing the ADR file"). Given the blast radius above, whoever
  eventually drafts this ADR should expect a materially larger Step 4
  options table than ADR-0006's (which had 3 options) — at minimum "full
  workbench replacement," "hybrid (persistent viewport added to Generate,
  Sidebar/tabs otherwise retained)," and "defer / no change" deserve
  separate options, mirroring ADR-0006's own A/B/C shape but scoped to the
  whole shell rather than one hook.

---

## Open questions

1. Do the four sibling concepts' ADRs converge on a shared "mode" vocabulary
   (Drafting/Painting/Rigging/Printing/Optimizing), or will each define its
   own tool-panel needs independently in a way Concept 10 would then have to
   reconcile after the fact?
2. If `VP-01` is reversed to keep the Canvas persistently mounted, what
   replaces its current unmount-triggered cleanup (`VP-07`,
   `useGLTF.clear(path)`) when switching between assets/modes without a full
   unmount — this has real memory-growth implications the doc already flags
   for the current model-per-asset lifecycle.
3. Would a persistent central viewport need to render during the `gallery`,
   `tasks`, and `settings` views too, or only during `generate`? The audit's
   framing ("interactive 3D viewport at the center") is ambiguous on this,
   and the answer changes whether `VP-01`'s replacement is scoped to one
   view or the whole app shell.
4. Does the left "generation drawer" replace the Sidebar's 4 top-level items
   entirely, or nest inside the existing `generate` view (leaving
   Gallery/Tasks/Settings as they are)? The audit's own language ("shifting
   ... from today's sidebar-tab navigation") suggests full replacement, but
   this grounding found no evidence the audit considered the
   Gallery/Tasks/Settings views at all — they may be out of this concept's
   actual scope even though the sidebar that navigates to them is squarely
   in it.
