---
name: feature-panel-scaffold
description: >-
  Scaffolds a new Composite or Feature-layer React panel component for
  MeshyForge (e.g. a new generate sub-panel, gallery panel, or settings
  panel) — picks the correct component-taxonomy layer and state-access
  rules, file naming, co-located test file, a named `Props` interface, and
  form-input rules if the panel contains inputs. Use when adding a new
  composite or top-level view/panel component under `src/components/`. Do
  NOT use for shadcn/ui primitives (`src/components/ui/`), R3F/3D
  components, or one-off utility components — those follow different rules
  not covered here.
---

# Feature Panel Scaffold

Scaffolds a new Composite- or Feature-layer component for MeshyForge, per the component taxonomy in `UI_UX_Documentation.md` §4 and the React coding rules in `coding_standards.md` §5.1.

## Step 1 — Classify the component before writing anything

`UI_UX_Documentation.md` §4.1–4.2 defines five categories with different state-access rules. Determine which one this component is — **this decision changes every rule that follows**:

| Category | Description | Zustand read | Zustand write | TanStack Query read | TanStack Query mutate | Props |
|---|---|---|---|---|---|---|
| **Primitive** | shadcn/ui copy-paste, unmodified/minimally themed | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Composite** | App-specific, composed from primitives (e.g. `TextTo3DPanel`, `AssetGrid`, `TaskMonitor`) | ✅ (read-only) | ❌ | ✅ | ✅ | ✅ |
| **Feature** | Full panel mapped to a route/view (e.g. `GenerateView`, `GalleryView`, `SettingsView`) | ✅ | ✅ | ✅ | ✅ | ❌ (top-level; no props) |
| **3D** | React Three Fiber components | ❌ | ❌ | ❌ | ❌ | ✅ only |
| **Common** | Shared utility components across features (`Sidebar`, `TopBar`, `ImageDropzone`) | ❌ | ❌ | ❌ | ❌ | ✅ |

This skill covers **Composite** and **Feature**. If what's being built is a shadcn/ui primitive, a 3D/R3F component, or a cross-feature shared utility, stop — this skill's rules don't apply cleanly (Primitives and 3D/Common components take props only and must never call `useAppStore()` or `useQuery()` directly).

**Before writing the skeleton in Step 3**, confirm the specific hook(s)/store the new panel needs already exist (`src/hooks/useMeshyApi.ts`, `src/stores/appStore.ts`, `src/stores/taskStore.ts`, `src/lib/meshy-types.ts` per TDD/UI-UX/IEP) rather than assuming the import in the skeleton below resolves. Mid-build, it's normal for a panel's backing hook or command not to exist yet — if so, that's prerequisite work (via `new-query-hook` and/or `new-meshy-endpoint`), not something to invent inline here. Same check applies to Step 7's test setup: confirm `src/test/setup.ts` and its `vitest.config.ts` `setupFiles` entry (`technical_stack_documentation.md` §14) actually exist before assuming `invoke` is already globally mocked; if not, mock it locally in the test file instead.

**Hard rule (UI_UX §4.2):** "A Primitive component that needs app state must be wrapped by a Composite component that provides the state via props. Primitives never call `useAppStore()` or `useQuery()`." If you're tempted to add Zustand/Query access to something that's really a Primitive, wrap it in a Composite instead of loosening the primitive.

A **Feature** component takes no top-level props (it's a route target — reads everything it needs from Zustand/TanStack Query itself) and both reads and writes Zustand. A **Composite** takes props, may read Zustand via selectors, but must not call Zustand's setters directly — writes go through store action functions invoked from a Feature or via callback props.

## Step 2 — Place the file and name it

Per `technical_design_document.md` §5 and `coding_standards.md` §3.3:

- Directory: `src/components/<feature-area>/<ComponentName>.tsx` — feature areas are `generate/`, `gallery/`, `tasks/`, `settings/`, `export/`, `common/`. Pick the one matching the panel's domain; don't invent a new top-level folder without checking these existing ones first.
- Component file: **PascalCase**, e.g. `TextTo3DPanel.tsx`.
- Component export name: PascalCase, matches the filename exactly.
- Co-located test file: `<ComponentName>.test.tsx` in the **same directory** (ORG-03, `coding_standards.md` §3.1) — do not put tests in a separate `__tests__/` tree.
- **ORG-01**: at most one exported React component per file. Helper types/constants used only by this component may live in the same file; anything shared goes to `src/lib/` or `src/hooks/`.
- **ORG-04**: no cross-feature imports — `src/components/generate/` may not import from `src/components/gallery/`. If two feature areas need the same logic, extract it to `src/lib/` or `src/hooks/`, not into either feature folder.
- **EXP-01**: named export only. No `export default`.

## Step 3 — Component definition rules (coding_standards.md §5.1)

| Rule ID | Rule |
|---|---|
| **RCT-01** | Function declaration, not an arrow function assigned to a const. |
| **RCT-02** | No default export (= ORG-04/EXP-01). |
| **RCT-03** | Named `Props` interface (= CMP-01), not an inline type. |
| **RCT-04** | Destructure props in the function signature, not `props.xxx`. |
| **RCT-05** | Optional props use `?:`, never `\| undefined` (matches `exactOptionalPropertyTypes: true`). |
| **RCT-06** | Boolean props prefixed `is`/`has`/`should`/`can` (= CMP-06). |
| **RCT-07** | Event handler props prefixed `on` (= CMP-05). |
| **RCT-08** | Component must not exceed 200 lines (= CMP-07) — extract sub-components instead of growing the file. |
| **RCT-09** | Must not call Tauri `invoke()` directly — use a hook from `src/hooks/`. |
| **RCT-10** | Must not import from `@tauri-apps/api/core` — only `src/lib/tauri.ts` may. |

Skeleton for a **Composite**:

```typescript
// src/components/<area>/<ComponentName>.tsx
import { useAppStore } from '@stores/appStore';
import { useSomeQuery } from '@hooks/useMeshyApi';
import type { SomeType } from '@lib/meshy-types';

export interface <ComponentName>Props {
  readonly onGenerate: (taskId: string) => void;
  readonly isGenerating: boolean;
}

export function <ComponentName>({ onGenerate, isGenerating }: <ComponentName>Props) {
  const activeView = useAppStore((s) => s.activeView); // selector, not (s) => s (RND-05)
  const { data } = useSomeQuery();

  return (/* JSX */);
}
```

A **Feature** component takes no `Props` (top-level, route-mapped) and is the orchestrator: it may call multiple hooks/mutations and pass callback props down into the Composites it renders, but a single hook must still map to exactly one Tauri command each (UI_UX §7.4) — multi-step flows (create task → poll → download) are sequenced in the Feature component, not inside one hook.

## Step 4 — The named `Props` interface (CMP rules, UI_UX_Documentation.md §4.4)

| Rule ID | Rule |
|---|---|
| **CMP-01** | Every Composite/Feature component defines a named `Props` interface (not inline). |
| **CMP-02** | No `any` in props — use `unknown` + narrowing or explicit unions. |
| **CMP-03** | Optional props use `?:`, not `\| undefined`. |
| **CMP-04** | No prop drilling beyond two levels — if data needs to pass through more than two components, lift it to Zustand or TanStack Query instead. |
| **CMP-05** | Event handler props prefixed `on`: `onGenerate`, `onExport`, `onTagChange`. |
| **CMP-06** | Boolean props prefixed `is`/`has`/`should`/`can`: `isLoading`, `hasTextures`, `shouldRemesh`. |
| **CMP-07** | Components must not exceed 200 lines; extract sub-components if they do. |

Mark props `readonly` in the interface (matches `TYP-06` in coding_standards.md and the example pattern used throughout the docs).

## Step 5 — If the panel includes form inputs, apply FRM rules (UI_UX_Documentation.md §8.2)

| Rule ID | Rule |
|---|---|
| **FRM-01** | Every input has a `<Label>` above it (`text-sm font-medium text-text-secondary`). |
| **FRM-02** | Required fields get a red `*` in the label, with `aria-label="required"` on the asterisk. |
| **FRM-03** | Validation errors render inline below the input in `text-danger text-xs`, linked via `aria-describedby`. |
| **FRM-04** | Disabled inputs: `opacity-50 cursor-not-allowed`, label gets `text-text-muted`. |
| **FRM-05** | The panel's primary action button is disabled when required fields are empty, with a tooltip explaining why (e.g. "Enter a prompt to generate"). |
| **FRM-06** | Sliders need `aria-label` and `aria-valuenow`, with the value also shown as text next to the slider. |
| **FRM-07** | Checkbox groups (e.g. format selection) are wrapped in `<fieldset>` + `<legend>`. |
| **FRM-08** | Use shadcn/ui `Select`, never a native `<select>`. |
| **FRM-09** | Image dropzones are keyboard-accessible: `role="button"`, `tabIndex={0}`, Enter triggers the file dialog. |
| **FRM-10** | Textareas auto-resize up to `max-h-[200px]` via `resize-none` + a `useRef`/`useEffect` pair. |

Form field state itself is local `useState`/`useReducer` (STT-04, coding_standards.md §8.1) — never store prompt text, slider values, or checkbox state in Zustand or TanStack Query. Only the panel's primary button click triggers a TanStack Query mutation.

## Step 6 — State access checklist before finishing

- Composite reads Zustand via a **selector function**, e.g. `useAppStore((s) => s.activeView)`, never `useAppStore((s) => s)` + destructure (RND-05).
- Composite must not call a Zustand setter directly — mutations go through the store's own action functions (STT-07), invoked from the owning Feature or bubbled up via an `on*` callback prop.
- Server-derived data (task status, credit balance, asset list) is TanStack Query only — never copied into Zustand (STT-01).
- If the panel needs data from more than 2 components away, that's the CMP-04 signal to lift it into a store or query hook instead of drilling props further.

## Step 7 — Write the co-located test

Create `<ComponentName>.test.tsx` next to the component, using Vitest + Testing Library per `technical_stack_documentation.md` §14. Mock `@tauri-apps/api/core`'s `invoke` (already globally mocked in `src/test/setup.ts`) rather than mocking the component's own hook module when possible, so the test exercises the real hook → `lib/tauri.ts` → `invoke` path.

## Do not

- Do not give a Primitive or Common component access to `useAppStore()` or `useQuery()` — wrap it in a Composite instead.
- Do not give a Composite component a top-level `Props`-less signature (that's the Feature shape) or give a Feature component a `Props` interface (Feature components are route-level and take none, per §4.2).
- Do not put the test file in a parallel `__tests__/` directory — it must be co-located (ORG-03).
- Do not exceed 200 lines (CMP-07/RCT-08) — split into sub-components under the same feature folder before that happens.
