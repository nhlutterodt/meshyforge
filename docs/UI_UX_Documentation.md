# UI/UX Guardrails and Build Document — MeshyForge

## Document Metadata
| Field | Value |
|---|---|
| **Project** | MeshyForge — AI 3D Asset Studio |
| **Document Type** | UI/UX Guardrails and Build Document |
| **Version** | 1.0.0 |
| **Date** | 2025 |
| **Status** | Approved for Implementation |
| **Dependencies** | Technical Design Document v1.0.0, Tech Stack Specification v1.0.0 |

---

## Table of Contents
1. [Scope and Alignment](#1-scope-and-alignment)
2. [Design Token System](#2-design-token-system)
3. [Layout Architecture](#3-layout-architecture)
4. [Component Taxonomy](#4-component-taxonomy)
5. [Accessibility Guardrails](#5-accessibility-guardrails)
6. [Performance Guardrails](#6-performance-guardrails)
7. [Frontend-Backend Decoupling Contract](#7-frontend-backend-decoupling-contract)
8. [Interaction Patterns](#8-interaction-patterns)
9. [Visual Feedback States](#9-visual-feedback-states)
10. [3D Viewport Guardrails](#10-3d-viewport-guardrails)
11. [Responsive and Density Rules](#11-responsive-and-density-rules)
12. [Build Phases](#12-build-phases)
13. [Quality Gates](#13-quality-gates)
14. [Implementation Checklist](#14-implementation-checklist)

---

## 1. Scope and Alignment

### 1.1 Document Purpose

This document defines the enforceable guardrails for every UI component, interaction, and build phase of MeshyForge. It sits below the Technical Design Document (TDD) and Tech Stack Specification (TSS) in the document hierarchy and must not contradict either.

```
Technical Design Document (TDD)     ← What to build, system architecture, data model
        │
Tech Stack Specification (TSS)      ← What tools, versions, and dependencies
        │
UI/UX Guardrails and Build (THIS)   ← How to build the UI, what constraints apply,
        │                              what order to build in, what quality gates apply
        │
Implementation                      ← Code
```

### 1.2 Invariants From Upstream Documents

The following are fixed by the TDD and TSS and are **not subject to change** in this document:

| Invariant | Source | This Document's Role |
|---|---|---|
| Desktop runtime is Tauri 2.x | TSS §2 | All IPC patterns assume Tauri `invoke()` and `listen()` |
| Frontend is React 19 + TypeScript 5.7 | TSS §3 | All component patterns are React 19 idioms |
| Styling is Tailwind CSS 4 + shadcn/ui | TSS §5 | All styling uses Tailwind utilities and shadcn/ui components |
| State management is Zustand + TanStack Query | TSS §6 | State boundary rules defined in TSS §6.7 are enforced |
| 3D rendering is R3F + drei + three.js | TSS §7 | 3D viewport rules build on R3F Canvas |
| Backend is Rust with reqwest + rusqlite + keyring | TSS §8–11 | Decoupling contract assumes Tauri command boundary |
| Dark theme only for MVP | TDD §9.5 | All color usage assumes dark background |
| Design tokens are defined in `@theme` CSS | TSS §5.4 | This document enforces their usage; no ad-hoc colors |
| Icons are Lucide React | TSS §13 | No other icon sources permitted |
| Database is SQLite via rusqlite | TSS §10 | Frontend never touches SQLite directly |
| API key stored in OS keychain | TSS §11 | Frontend never sees raw API key |

### 1.3 Guardrail Categories

Every guardrail in this document is tagged with one or more categories:

| Tag | Meaning |
|---|---|
| **[A11Y]** | Accessibility — WCAG 2.1 Level AA conformance |
| **[PERF]** | Performance — rendering, data loading, bundle size |
| **[DECOUPLE]** | Frontend-backend decoupling — IPC contract enforcement |
| **[CONSISTENCY]** | Visual and interaction consistency across the app |
| **[BUILD]** | Build phase ordering and dependencies |

---

## 2. Design Token System

### 2.1 Token Hierarchy

All visual properties are derived from the CSS custom properties defined in `globals.css` (TSS §5.4). No component may hardcode a color, radius, font size, or spacing value that is not a token or a Tailwind utility derived from a token.

```
@theme tokens (globals.css)
    │
    ├── Colors (11 tokens)
    │   ├── bg-primary     #0a0a0b
    │   ├── bg-secondary   #18181b
    │   ├── bg-tertiary    #27272a
    │   ├── border         #3f3f46
    │   ├── text-primary   #fafafa
    │   ├── text-secondary #a1a1aa
    │   ├── text-muted     #71717a
    │   ├── accent         #6366f1
    │   ├── accent-hover   #4f46e5
    │   ├── success        #22c55e
    │   ├── warning        #f59e0b
    │   └── danger         #ef4444
    │
    ├── Radii (3 tokens)
    │   ├── radius-sm      6px
    │   ├── radius-md     8px
    │   └── radius-lg     12px
    │
    └── Fonts (2 tokens)
        ├── font-sans      Inter
        └── font-mono      JetBrains Mono
```

### 2.2 Token Usage Rules

| Rule ID | Rule | Category | Enforcement |
|---|---|---|---|
| **TKN-01** | No raw hex color values in component source code. Use Tailwind classes (`bg-zinc-900`, `text-zinc-400`) or `var(--color-*)` references. | [CONSISTENCY] | Biome lint rule: ban `#[0-9a-fA-F]{3,8}` in `className` strings |
| **TKN-02** | No inline `style={{ color: "#..." }}` for any color. Inline styles are only permitted for dynamic values (e.g., progress bar width percentage, tag badge color from user input). | [CONSISTENCY] | Code review |
| **TKN-03** | Font sizes use Tailwind's type scale (`text-xs` through `text-2xl`). No arbitrary pixel values. | [CONSISTENCY] | Biome lint rule: ban `text-[0-9]+px` in className |
| **TKN-04** | Spacing uses Tailwind's spacing scale (`p-1` through `p-12`, `gap-1` through `gap-8`). No arbitrary pixel values. | [CONSISTENCY] | Biome lint rule: ban `[pmg]-[0-9]+px` in className |
| **TKN-05** | Border radius uses Tailwind's radius scale (`rounded-sm`, `rounded-md`, `rounded-lg`). Maps to `--radius-sm`, `--radius-md`, `--radius-lg`. | [CONSISTENCY] | Code review |
| **TKN-06** | Shadows use Tailwind's shadow scale (`shadow-sm`, `shadow-md`, `shadow-lg`). No custom shadow definitions. | [CONSISTENCY] | Code review |
| **TKN-07** | The `font-mono` token is used only for: task IDs, API responses, code blocks, and file paths. All other text uses `font-sans`. | [CONSISTENCY] | Code review |
| **TKN-08** | Transitions use Tailwind's duration scale (`duration-150`, `duration-200`, `duration-300`). No custom durations. | [CONSISTENCY] | Code review |

### 2.3 Color Semantics Map

Each color token has a fixed semantic role. Components must use colors according to this map, not by aesthetic preference.

| Token | Semantic Role | Permitted In |
|---|---|---|
| `bg-primary` | App background, the outermost layer | `<body>`, root `<div>` |
| `bg-secondary` | Panels, cards, sidebar, top bar | Panel backgrounds, card backgrounds, sidebar |
| `bg-tertiary` | Inputs, hover states, nested panels, active tab | `<Input>`, `<Select>` trigger, hover `bg-tertiary/50`, active tab indicator |
| `border` | Dividers, borders, focus rings (with accent) | All borders, separators, focus-visible outlines |
| `text-primary` | Primary readable text | Labels, values, headings, button text (on accent bg) |
| `text-secondary` | Secondary, supporting text | Descriptions, subtitles, metadata labels |
| `text-muted` | Disabled, placeholder, timestamp text | Placeholder text, disabled labels, timestamps |
| `accent` | Primary action, selected state, focus ring | Primary buttons, selected tab indicator, focus-visible ring, checkbox checked |
| `accent-hover` | Hover state of accent-colored elements | Primary button hover, selected item hover |
| `success` | SUCCEEDED status, positive indicators | Task status badge (SUCCEEDED), credit balance (positive) |
| `warning` | IN_PROGRESS, PENDING status, caution | Task status badge (IN_PROGRESS, PENDING), low credit warning |
| `danger` | FAILED, CANCELED status, destructive actions | Task status badge (FAILED), delete button, error text, 402 error toast |

### 2.4 Status Color Assignment

Task and asset status colors are fixed and must not vary by component:

| Status | Badge Background | Badge Text | Icon | Icon Color |
|---|---|---|---|---|
| `PENDING` | `bg-warning/15` | `text-warning` | `Loader2` (no spin) | `text-warning` |
| `IN_PROGRESS` | `bg-warning/15` | `text-warning` | `Loader2` (spinning) | `text-warning` |
| `SUCCEEDED` | `bg-success/15` | `text-success` | `CheckCircle2` | `text-success` |
| `FAILED` | `bg-danger/15` | `text-danger` | `XCircle` | `text-danger` |
| `CANCELED` | `bg-zinc-700` | `text-zinc-400` | `XCircle` | `text-zinc-400` |

---

## 3. Layout Architecture

### 3.1 Root Layout

The application shell is a fixed grid with three regions. The grid does not scroll; only individual content areas scroll internally.

```
┌──────────────────────────────────────────────────────────────┐
│  TopBar (h-14, fixed)                                          │  ← Row 1
├──────────┬───────────────────────────────────────────────────┤
│          │                                                    │
│ Sidebar  │  Main Content Area                                 │  ← Row 2
│ (w-56    │  (flex-1, overflow-y-auto)                          │
│  or w-14 │                                                    │
│  when    │                                                    │
│  collapsed)│                                                  │
│          │                                                    │
├──────────┴───────────────────────────────────────────────────┤
│  StatusBar (h-8, fixed)                                       │  ← Row 3
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Layout Rules

| Rule ID | Rule | Category |
|---|---|---|
| **LAY-01** | The root container is `h-screen w-screen overflow-hidden flex flex-col`. No CSS Grid for the root — flexbox column. | [CONSISTENCY] |
| **LAY-02** | TopBar is `h-14 shrink-0`. StatusBar is `h-8 shrink-0`. Main content is `flex-1 min-h-0 overflow-hidden`. The `min-h-0` is required for nested flex scroll to work. | [PERF] |
| **LAY-03** | The main content area contains a flex row: Sidebar (`shrink-0`) + Content (`flex-1 min-h-0 overflow-y-auto`). | [CONSISTENCY] |
| **LAY-04** | Sidebar width is `w-56` (224px) expanded, `w-14` (56px) collapsed. Transition: `transition-all duration-200`. | [CONSISTENCY] |
| **LAY-05** | No component outside the main content area may scroll. The TopBar and StatusBar are fixed height and never overflow. | [PERF] |
| **LAY-06** | Every scrollable area uses the shadcn/ui `ScrollArea` component, not native `overflow-auto`, to ensure consistent scrollbar styling across platforms. | [CONSISTENCY] |
| **LAY-07** | The minimum window size is 1024×700 (set in `tauri.conf.json`). The layout must not break at this size. | [CONSISTENCY] |
| **LAY-08** | No component may use `position: fixed` or `position: absolute` except for: modals (Dialog), dropdowns (DropdownMenu), popovers (Popover), tooltips (Tooltip), and the toast container (Sonner). | [PERF] |

### 3.3 Z-Index Scale

Overlapping elements use a fixed z-index scale. No arbitrary z-index values.

| Layer | Z-Index | Elements |
|---|---|---|
| Base content | `z-0` | Panels, forms, gallery |
| Sticky headers within scroll areas | `z-10` | Tab bars, filter bars |
| Sidebar | `z-20` | Navigation sidebar |
| TopBar | `z-30` | Top bar with credits, settings |
| StatusBar | `z-30` | Status bar |
| Dropdowns, popovers | `z-40` | Select menus, context menus |
| Tooltips | `z-50` | Hover tooltips |
| Modals, dialogs | `z-50` | Dialog overlays |
| Toast notifications | `z-[100]` | Sonner toast container |

---

## 4. Component Taxonomy

### 4.1 Component Categories

All components fall into one of five categories. Each category has different rules for state access, performance, and accessibility.

| Category | Description | State Access | Examples |
|---|---|---|---|
| **Primitive** | shadcn/ui copy-paste components. Unmodified or minimally themed. | No app state | `Button`, `Input`, `Select`, `Switch`, `Tabs` |
| **Composite** | App-specific components composed from primitives. | Zustand (read-only) + TanStack Query | `TextTo3DPanel`, `AssetGrid`, `TaskMonitor` |
| **Feature** | Full feature panels that map to a route/view. | Zustand (read-write) + TanStack Query (mutations) | `GenerateView`, `GalleryView`, `TaskView`, `SettingsView` |
| **3D** | React Three Fiber components. | Props only (no Zustand) | `AssetPreview3D`, `Model`, `SceneLighting` |
| **Common** | Shared utility components used across features. | Props only (no Zustand) | `Sidebar`, `TopBar`, `StatusBar`, `ImageDropzone`, `PromptEditor` |

### 4.2 Component State Access Matrix

| Component Category | Zustand Read | Zustand Write | TanStack Query Read | TanStack Query Mutate | Local useState | Props |
|---|---|---|---|---|---|---|
| **Primitive** | ❌ | ❌ | ❌ | ❌ | ✅ (internal UI only) | ✅ |
| **Composite** | ✅ (read-only) | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Feature** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (top-level) |
| **3D** | ❌ | ❌ | ❌ | ❌ | ✅ (R3F internal) | ✅ only |
| **Common** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

**Rule:** A Primitive component that needs app state must be wrapped by a Composite component that provides the state via props. Primitives never call `useAppStore()` or `useQuery()`.

### 4.3 File Naming Conventions

| Convention | Example | Rationale |
|---|---|---|
| PascalCase for component files | `TextTo3DPanel.tsx` | React convention |
| camelCase for hook files | `useMeshyApi.ts` | JavaScript convention |
| kebab-case for non-component utility files | `meshy-types.ts` | Clarity in imports |
| `test.tsx` suffix for test files | `TextTo3DPanel.test.tsx` | Vitest auto-discovery |
| Co-located tests | `TextTo3DPanel.tsx` + `TextTo3DPanel.test.tsx` in same directory | Easy navigation |

### 4.4 Component Prop Interface Rules

| Rule ID | Rule | Category |
|---|---|---|
| **CMP-01** | Every Composite and Feature component must define a named `Props` interface, not an inline type. | [DECOUPLE] |
| **CMP-02** | Props interfaces must not use `any`. Use `unknown` with type narrowing or explicit union types. | [DECOUPLE] |
| **CMP-03** | Optional props must use `?:` syntax, not `| undefined`. This matches `exactOptionalPropertyTypes: true` in `tsconfig.json`. | [DECOUPLE] |
| **CMP-04** | No prop drilling beyond two levels. If data needs to pass through more than two components, use Zustand or TanStack Query. | [DECOUPLE] |
| **CMP-05** | Event handler props must be prefixed with `on`: `onGenerate`, `onExport`, `onTagChange`. | [CONSISTENCY] |
| **CMP-06** | Boolean props must be prefixed with `is`, `has`, `should`, or `can`: `isLoading`, `hasTextures`, `shouldRemesh`. | [CONSISTENCY] |
| **CMP-07** | Components must not exceed 200 lines. If a component exceeds 200 lines, extract sub-components. | [PERF] |

---

## 5. Accessibility Guardrails

### 5.1 Conformance Target

MeshyForge targets **WCAG 2.1 Level AA** conformance. Every guardrail in this section is mandatory.

### 5.2 Keyboard Navigation

| Rule ID | Rule | WCAG SC | Category |
|---|---|---|---|
| **KBD-01** | Every interactive element must be reachable via `Tab` key in a logical reading order (top-to-bottom, left-to-right). | 2.4.3 Focus Order | [A11Y] |
| **KBD-02** | No interactive element may be removed from the tab order via `tabIndex={-1}` unless it is a child of a composite widget (e.g., dropdown menu items managed by Radix). | 2.4.3 | [A11Y] |
| **KBD-03** | Focus must be visible on every interactive element. The focus ring uses `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary`. | 2.4.7 Focus Visible | [A11Y] |
| **KBD-04** | `outline: none` must never be applied globally. It may only be applied alongside a `focus-visible:ring-*` replacement. | 2.4.7 | [A11Y] |
| **KBD-05** | The `Escape` key must close any open Dialog, DropdownMenu, Popover, or Tooltip. This is handled by Radix UI primitives automatically — do not override. | 1.4.13 | [A11Y] |
| **KBD-06** | The `Enter` key must activate the primary action of the focused element. For buttons, this is native. For custom interactive elements, add `onKeyDown` handler. | 2.1.1 Keyboard | [A11Y] |
| **KBD-07** | The `Ctrl/Cmd + K` shortcut opens the Command palette (search). This is the only global keyboard shortcut in the MVP. | 2.1.1 | [A11Y] |
| **KBD-08** | No keyboard trap. If a user tabs into a Dialog, they must be able to tab through all controls and back to the first control (Radix handles this). | 2.1.2 No Trap | [A11Y] |
| **KBD-09** | The sidebar navigation items must be navigable via arrow keys (up/down) in addition to Tab. This requires `role="menu"` semantics or manual `onKeyDown` handling. | 2.1.1 | [A11Y] |
| **KBD-10** | When a task completes and a toast notification appears, focus must not be stolen from the user's current position. Toasts are announced via `aria-live="polite"`, not by moving focus. | 4.1.3 Status Messages | [A11Y] |

### 5.3 Semantic HTML and ARIA

| Rule ID | Rule | WCAG SC | Category |
|---|---|---|---|
| **SEM-01** | Use semantic HTML elements (`<nav>`, `<main>`, `<aside>`, `<section>`, `<button>`, `<input>`, `<label>`) before any ARIA. ARIA is a last resort, not a first choice. | 4.1.1 Parsing | [A11Y] |
| **SEM-02** | Every `<input>` must have an associated `<label>`. Use `<label htmlFor="id">` or wrap the input in `<label>`. The shadcn/ui `Label` component is the standard. | 1.3.1 Info and Relationships | [A11Y] |
| **SEM-03** | Every `<button>` must have an accessible name. If the button contains only an icon, it must have `aria-label`. Example: `<Button aria-label="Delete asset"><Trash2 /></Button>`. | 4.1.2 Name, Role, Value | [A11Y] |
| **SEM-04** | Icon-only elements that convey information must have `aria-label` or `aria-hidden="true"` if decorative. Lucide icons accept `aria-label` via spread props. | 1.3.1 | [A11Y] |
| **SEM-05** | The sidebar must have `role="navigation"` and `aria-label="Main navigation"`. | 1.3.1 | [A11Y] |
| **SEM-06** | The main content area must have `role="main"`. The sidebar must not be inside `<main>`. | 1.3.1 | [A11Y] |
| **SEM-07** | The task monitor must use `aria-live="polite"` on the task list container so that screen readers announce status changes without interrupting the user. | 4.1.3 | [A11Y] |
| **SEM-08** | Progress bars must use the native `<progress>` element or the shadcn/ui `Progress` component (which renders `<role="progressbar">`). Must include `aria-valuenow`, `aria-valuemin`, `aria-valuemax`. | 4.1.2 | [A11Y] |
| **SEM-09** | The gallery grid must use `role="grid"` with `role="gridcell"` on each card. Alternatively, use a semantic `<ul>` with `<li>` items if the grid is purely a list. | 1.3.1 | [A11Y] |
| **SEM-10** | Dialog titles must use the shadcn/ui `DialogTitle` component, which renders with `aria-labelledby` linking to the dialog. Never omit the title. | 4.1.2 | [A11Y] |
| **SEM-11** | The 3D preview canvas must have an `aria-label` describing the model being viewed. Example: `aria-label="3D preview of: a monster mask"`. The canvas itself is not keyboard-navigable, but the label provides context. | 1.3.1 | [A11Y] |
| **SEM-12** | The credit balance display in the TopBar must have `aria-live="polite"` so that screen readers announce credit changes after task creation. | 4.1.3 | [A11Y] |
| **SEM-13** | Loading states must use `aria-busy="true"` on the container while data is being fetched. This tells assistive technologies that content is being updated. | 4.1.2 | [A11Y] |
| **SEM-14** | Error messages in forms must be linked to their input via `aria-describedby`. The shadcn/ui `Form` component handles this automatically when used correctly. | 3.3.1 Error Identification | [A11Y] |
| **SEM-15** | No `role="presentation"` or `aria-hidden="true"` on focusable elements. | 1.3.1 | [A11Y] |

### 5.4 Color and Contrast

| Rule ID | Rule | WCAG SC | Category |
|---|---|---|---|
| **CLR-01** | Text contrast ratio must be ≥ 4.5:1 for normal text and ≥ 3:1 for large text (≥ 18pt or ≥ 14pt bold). | 1.4.3 Contrast (Minimum) | [A11Y] |
| **CLR-02** | Interactive element border contrast must be ≥ 3:1 against the adjacent background. | 1.4.11 Non-text Contrast | [A11Y] |
| **CLR-03** | Status badge text must have ≥ 4.5:1 contrast against the badge background. The `/15` opacity backgrounds in §2.4 are designed to meet this with the corresponding text color. | 1.4.3 | [A11Y] |
| **CLR-04** | Color must not be the sole indicator of status. Every status badge must include both color and an icon (see §2.4). | 1.4.1 Use of Color | [A11Y] |
| **CLR-05** | Focus indicators must have ≥ 3:1 contrast against the adjacent background. The `accent` color (`#6366f1`) on `bg-primary` (`#0a0a0b`) has a contrast ratio of 5.9:1. | 1.4.11 | [A11Y] |
| **CLR-06** | Disabled elements must have ≥ 3:1 contrast for their text against the background. The `text-muted` (`#71717a`) on `bg-secondary` (`#18181b`) has a contrast ratio of 3.3:1. | 1.4.3 | [A11Y] |
| **CLR-07** | Links (if any) must have ≥ 4.5:1 contrast and a non-color indicator (underline or icon). | 1.4.1 | [A11Y] |

### 5.5 Contrast Verification Table

| Foreground | Background | Ratio | Pass? | Context |
|---|---|---|---|---|
| `text-primary` (#fafafa) | `bg-primary` (#0a0a0b) | 19.0:1 | ✅ | Body text on app background |
| `text-primary` (#fafafa) | `bg-secondary` (#18181b) | 17.4:1 | ✅ | Text on panels/cards |
| `text-primary` (#fafafa) | `accent` (#6366f1) | 4.6:1 | ✅ | Button text on primary button |
| `text-secondary` (#a1a1aa) | `bg-secondary` (#18181b) | 7.2:1 | ✅ | Secondary text on panels |
| `text-secondary` (#a1a1aa) | `bg-primary` (#0a0a0b) | 7.9:1 | ✅ | Secondary text on app background |
| `text-muted` (#71717a) | `bg-secondary` (#18181b) | 3.3:1 | ✅ | Muted text on panels (borderline — use sparingly) |
| `text-muted` (#71717a) | `bg-primary` (#0a0a0b) | 3.6:1 | ✅ | Muted text on app background |
| `success` (#22c55e) | `bg-secondary` (#18181b) | 5.9:1 | ✅ | SUCCEEDED badge text |
| `warning` (#f59e0b) | `bg-secondary` (#18181b) | 6.7:1 | ✅ | IN_PROGRESS badge text |
| `danger` (#ef4444) | `bg-secondary` (#18181b) | 4.5:1 | ✅ | FAILED badge text |
| `accent` (#6366f1) | `bg-primary` (#0a0a0b) | 5.9:1 | ✅ | Focus ring on app background |
| `accent` (#6366f1) | `bg-secondary` (#18181b) | 5.4:1 | ✅ | Focus ring on panels |

### 5.6 Motion and Animation

| Rule ID | Rule | WCAG SC | Category |
|---|---|---|---|
| **MOT-01** | All non-essential animations must respect `prefers-reduced-motion: reduce`. When this media query is active, animations must be instant (0ms duration) or removed entirely. | 2.3.3 Animation from Interactions | [A11Y] |
| **MOT-02** | No content may auto-move, auto-scroll, or auto-update without user initiation. The task monitor updates via polling/SSE, but the list itself does not auto-scroll. | 2.2.2 Pause, Stop, Hide | [A11Y] |
| **MOT-03** | No flashing content faster than 3 times per second. No flashing at all in the MVP. | 2.3.1 Three Flashes | [A11Y] |
| **MOT-04** | Loading spinners (`Loader2` with `animate-spin`) must stop spinning when `prefers-reduced-motion: reduce` is active. Replace with a static "Loading…" text. | 2.3.3 | [A11Y] |

```css
/* globals.css — reduced motion override */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 5.7 Screen Reader Announcements

| Event | ARIA Live Region | Politeness | Message Template |
|---|---|---|---|
| Task created | TopBar credit balance | `polite` | (implied — balance updates) |
| Task progress update | Task card | `polite` | `Task "a monster mask" is 45% complete` |
| Task succeeded | Task card + Toast | `polite` | `Task "a monster mask" completed successfully` |
| Task failed | Task card + Toast | `assertive` | `Task "a monster mask" failed: image_too_complex` |
| Credits depleted | TopBar | `polite` | `Credit balance is now 0` |
| Asset downloaded | Toast | `polite` | `Asset downloaded to local storage` |
| API key invalid | Settings panel | `assertive` | `API key validation failed. Please check your key.` |

---

## 6. Performance Guardrails

### 6.1 Rendering Performance

| Rule ID | Rule | Category | Enforcement |
|---|---|---|---|
| **RND-01** | No component may re-render on every animation frame. The R3F Canvas is isolated in a `React.memo` boundary. The 3D scene updates internally via R3F's reconciler without triggering React re-renders. | [PERF] | React DevTools Profiler |
| **RND-02** | Lists of more than 10 items must use a keyed `map` with stable keys. Asset cards use the Meshy task ID as the key, never the array index. | [PERF] | Code review |
| **RND-03** | The gallery grid must virtualize when the asset count exceeds 100. Use `@tanstack/react-virtual` for windowed rendering. Below 100, render all cards normally. | [PERF] | Code review |
| **RND-04** | No `useEffect` may perform synchronous heavy computation (> 5ms). Heavy operations (file parsing, data transformation) must be deferred to the Rust backend via Tauri commands. | [PERF] | Code review |
| **RND-05** | Zustand store updates must use selector functions to prevent unnecessary re-renders. `useAppStore((s) => s.activeView)` — not `useAppStore((s) => s)` and destructuring. | [PERF] | Code review |
| **RND-06** | TanStack Query keys must be stable across re-renders. Use `useMemo` for complex query key arrays if they depend on state. | [PERF] | Code review |
| **RND-07** | The R3F Canvas must use `dpr={[1, 2]}` to cap pixel ratio at 2x. Higher ratios cause GPU memory spikes on high-DPI displays. | [PERF] | Code review |
| **RND-08** | The R3F Canvas must use `frameloop="demand"` when the user is not interacting with the 3D view (no orbit, no zoom). This prevents continuous WebGL rendering when idle. Switch to `frameloop="always"` on pointer-down. | [PERF] | Code review |
| **RND-09** | GLB models loaded via `useGLTF` must be cleared from the Three.js cache when the component unmounts. Use `useGLTF.clear(path)` in a cleanup effect to prevent memory leaks across asset previews. | [PERF] | Code review |
| **RND-10** | No component may mount the R3F Canvas until the user opens the asset detail view. The Canvas is lazy-loaded via `React.lazy()`. | [PERF] | Vite manualChunks + React.lazy |

### 6.2 Data Loading Performance

| Rule ID | Rule | Category | Enforcement |
|---|---|---|---|
| **DAT-01** | Gallery assets are loaded in pages of 50 (TDD §16.1 `gallery_page_size`). The query key includes the page number. Infinite scroll or "Load More" button triggers the next page. | [PERF] | TanStack Query `useInfiniteQuery` |
| **DAT-02** | Task polling stops immediately when the task reaches a terminal status (`SUCCEEDED`, `FAILED`, `CANCELED`). The `refetchInterval` function returns `false` for terminal statuses. | [PERF] | TanStack Query `refetchInterval` callback |
| **DAT-03** | Only active (non-terminal) tasks are polled. Completed tasks are read from SQLite and do not trigger HTTP requests. | [PERF] | Zustand `taskStore` tracks active task IDs; only those IDs are passed to `usePollTask` |
| **DAT-04** | Credit balance refetches every 60 seconds and on window focus. No more frequent. | [PERF] | TanStack Query `refetchInterval: 60000` |
| **DAT-05** | Thumbnails are loaded from the local filesystem via Tauri's `asset://` protocol, not from Meshy's signed URLs. Once an asset is downloaded, its thumbnail is permanently local. | [PERF] | `convertFileSrc()` in `src/lib/tauri.ts` |
| **DAT-06** | The animation library JSON is fetched once and cached indefinitely. It changes rarely. Store in TanStack Query with `staleTime: Infinity`. | [PERF] | TanStack Query `staleTime` |
| **DAT-07** | No TanStack Query may have `retry: 3` or higher. Max 1 retry for queries, 0 for mutations. Meshy API rate limits (429) should not be retried aggressively. | [PERF] | QueryClient default config |
| **DAT-08** | SSE streaming is opt-in per task, not default. Polling is the default mechanism. SSE is only used when the user explicitly enables it in settings (`use_sse_streaming: true`). | [PERF] | Zustand `settingsStore` |

### 6.3 Bundle Size Performance

| Rule ID | Rule | Category | Enforcement |
|---|---|---|---|
| **BDL-01** | The initial JS bundle (before code-splitting) must not exceed 300 KB gzipped. The Vite manualChunks config splits `react-vendor`, `three-vendor`, and `query-vendor` into separate chunks. | [PERF] | `vite build --report` (rollup-plugin-visualizer) |
| **BDL-02** | The `three-vendor` chunk is loaded only when the user opens the 3D preview. `const AssetPreview3D = React.lazy(() => import('./AssetPreview3D'))`. | [PERF] | React.lazy + Suspense |
| **BDL-03** | The Creative Lab panel is loaded only when the user navigates to the Creative Lab tab. `const CreativeLabPanel = React.lazy(() => import('./CreativeLabPanel'))`. | [PERF] | React.lazy + Suspense |
| **BDL-04** | No component may import from `three` directly. All Three.js imports go through `@react-three/fiber` and `@react-three/drei`. This ensures tree-shaking works correctly. | [PERF] | Biome lint: ban `from 'three'` except in `AssetPreview3D.tsx` |
| **BDL-05** | No icon may be imported via barrel import (`import { Icon1, Icon2, ... } from 'lucide-react'`). Use named imports: `import { Icon1 } from 'lucide-react'`. | [PERF] | Biome lint: enforce named imports from `lucide-react` |
| **BDL-06** | The TanStack Query DevTools are only included in development builds. `import.meta.env.DEV` guard around `<ReactQueryDevtools />`. | [PERF] | Conditional import |

### 6.4 Memory Management

| Rule ID | Rule | Category |
|---|---|---|
| **MEM-01** | When the user navigates away from the asset detail view, the R3F Canvas must unmount and dispose of its WebGL context. Use `gl.dispose()` in the Canvas `onUnmounted` callback. | [PERF] |
| **MEM-02** | `useGLTF.clear(path)` must be called when the asset preview component unmounts to release the parsed GLB from Three.js's cache. | [PERF] |
| **MEM-03** | TanStack Query `gcTime` is 5 minutes. Inactive query data is garbage-collected after 5 minutes of no observers. | [PERF] |
| **MEM-04** | The Zustand `taskStore` must be cleared of completed tasks when the user clicks "Clear Done" or when the app exits. Active tasks are persisted to SQLite, not to Zustand. | [PERF] |
| **MEM-05** | Downloaded files are not held in memory. The Rust backend streams file downloads directly to disk. The frontend only receives the file path, not the file contents. | [PERF] |

---

## 7. Frontend-Backend Decoupling Contract

### 7.1 The Decoupling Boundary

The frontend and backend communicate exclusively through Tauri's IPC mechanism. The frontend has no direct access to:
- The network (no `fetch()`, no `XMLHttpRequest`)
- The file system (no `fs` module)
- The database (no SQLite access)
- The OS keychain (no credential access)

All external access is mediated by Tauri commands defined in the Rust backend.

```
┌─── Frontend (React/TypeScript) ──────────────────────┐
│                                                       │
│  Components → Hooks → lib/tauri.ts (typed invoke)    │
│                          │                            │
│                     invoke<T>(command, args)          │
│                          │                            │
└──────────────────────────┼───────────────────────────┘
                           │  Tauri IPC (serde boundary)
                           │  JSON serialized over stdio
┌──────────────────────────┼───────────────────────────┐
│                          ▼                            │
│  Backend (Rust)                                       │
│  commands/*.rs → meshy/*.rs → reqwest (HTTP)          │
│                 → storage/*.rs → rusqlite (SQLite)    │
│                 → security/*.rs → keyring (Keychain)  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 7.2 Contract Rules

| Rule ID | Rule | Category |
|---|---|---|
| **CTR-01** | Every Tauri command must have a corresponding TypeScript type in `src/lib/meshy-types.ts`. The Rust struct and the TypeScript interface must have identical field names (snake_case in Rust, camelCase in TypeScript via serde rename). | [DECOUPLE] |
| **CTR-02** | The frontend must never construct API URLs. All URL construction happens in the Rust `meshy/client.rs`. The frontend only passes a command name and a request body. | [DECOUPLE] |
| **CTR-03** | The frontend must never see the raw API key. The `get_api_key` Tauri command returns `Option<String>` but the frontend stores only a boolean `hasApiKey` in Zustand. The actual key is read by the Rust backend from the keychain when constructing the `MeshyClient`. | [DECOUPLE] |
| **CTR-04** | The frontend must never handle HTTP error codes directly. The Rust backend maps HTTP errors to `MeshyError` variants, which are serialized to a structured error string. The frontend's `lib/tauri.ts` wrapper catches these and converts them to typed errors. | [DECOUPLE] |
| **CTR-05** | File downloads are initiated by the frontend passing a signed URL (from a task response) to the `download_asset` Tauri command. The Rust backend performs the download and returns local file paths. The frontend never performs HTTP downloads. | [DECOUPLE] |
| **CTR-06** | SSE streaming is initiated by the frontend calling the `stream_task` Tauri command. The Rust backend opens the SSE connection and emits events to the frontend via `app.emit()`. The frontend listens via `listen()`. The frontend never opens a network connection. | [DECOUPLE] |
| **CTR-07** | The `lib/tauri.ts` file is the single point of contact with `@tauri-apps/api/core`. No other file may import from `@tauri-apps/api/core` directly. This centralizes the IPC contract. | [DECOUPLE] |
| **CTR-08** | Every `invoke()` call in `lib/tauri.ts` must be wrapped in a try/catch that converts the error string to a typed `MeshyFrontendError`. Components and hooks never receive raw error strings. | [DECOUPLE] |
| **CTR-09** | The Rust backend must validate all inputs before making API calls. If a required field is missing, the Tauri command returns an error without hitting the Meshy API. This prevents wasting credits on malformed requests. | [DECOUPLE] |
| **CTR-10** | Tauri command return types must be `Result<T, String>` where `T` is a serde-serializable struct and the `String` error is a JSON-encoded error object with `code`, `message`, and optional `details` fields. | [DECOUPLE] |

### 7.3 The `lib/tauri.ts` Contract Layer

```typescript
// src/lib/tauri.ts
// This is the ONLY file that imports from @tauri-apps/api/core.
// All other files import from this module.

import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { convertFileSrc } from '@tauri-apps/api/core';

// ─── Typed Error ─────────────────────────────────────────────
export interface MeshyFrontendError {
  code: string;          // "API_ERROR_402" | "NETWORK_ERROR" | "MISSING_API_KEY" | etc.
  message: string;       // Human-readable error message
  details?: unknown;     // Additional context (HTTP body, endpoint, etc.)
}

// ─── Error Parser ────────────────────────────────────────────
function parseError(error: unknown): MeshyFrontendError {
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error);
      return {
        code: parsed.code ?? 'UNKNOWN',
        message: parsed.message ?? error,
        details: parsed.details,
      };
    } catch {
      return { code: 'UNKNOWN', message: error };
    }
  }
  return { code: 'UNKNOWN', message: 'An unknown error occurred' };
}

// ─── Typed Invoke ────────────────────────────────────────────
export async function invoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    return await tauriInvoke<T>(command, args);
  } catch (error) {
    throw parseError(error);
  }
}

// ─── Event Listener ──────────────────────────────────────────
export function onEvent<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<UnlistenFn> {
  return listen<T>(event, (e) => handler(e.payload));
}

// ─── File Source Converter ───────────────────────────────────
export function assetUrl(filePath: string): string {
  return convertFileSrc(filePath);
}

// ─── Dialog Wrappers ─────────────────────────────────────────
export { openImageDialog, openMultiImageDialog, pickExportPath }
  from './dialog-utils';
```

### 7.4 Hook → Command Mapping

Every TanStack Query hook maps to exactly one Tauri command. No hook may call multiple commands in sequence. Multi-step operations (create task → poll → download) are orchestrated by the Feature component, not by a single hook.

| Hook | Tauri Command | Query/Mutation | Key |
|---|---|---|---|
| `useCreateTextTo3D` | `create_text_to_3d` | Mutation | — |
| `useCreateImageTo3D` | `create_image_to_3d` | Mutation | — |
| `useCreateMultiImageTo3D` | `create_multi_image_to_3d` | Mutation | — |
| `useCreateRemesh` | `create_remesh` | Mutation | — |
| `useCreateRetexture` | `create_retexture` | Mutation | — |
| `useCreateConvert` | `create_convert` | Mutation | — |
| `useCreateResize` | `create_resize` | Mutation | — |
| `useCreateUvUnwrap` | `create_uv_unwrap` | Mutation | — |
| `useCreateRigging` | `create_rigging` | Mutation | — |
| `useCreateAnimation` | `create_animation` | Mutation | — |
| `useCreateTextToImage` | `create_text_to_image` | Mutation | — |
| `useCreateImageToImage` | `create_image_to_image` | Mutation | — |
| `useCreateMultiColorPrint` | `create_multi_color_print` | Mutation | — |
| `useCreateAnalyzePrintability` | `create_analyze_printability` | Mutation | — |
| `useCreateRepairPrintability` | `create_repair_printability` | Mutation | — |
| `usePollTask` | `poll_task` | Query | `['task', taskId]` |
| `useStreamTask` | `stream_task` | Side-effect (listen) | — |
| `useDownloadAsset` | `download_asset` | Mutation | — |
| `useCreditBalance` | `get_credit_balance` | Query | `['credit-balance']` |
| `useAssets` | `get_all_assets` / `search_assets` | Query | `['assets', search, tag]` |
| `useApiKey` | `get_api_key` | Query | `['api-key']` |
| `useSetApiKey` | `set_api_key` | Mutation | — |
| `useValidateApiKey` | `validate_api_key` | Mutation | — |
| `useAnimationLibrary` | `fetch_animation_library` | Query | `['animation-library']` |
| `useDeleteTask` | `delete_task` | Mutation | — |
| `useDeleteAsset` | `delete_asset` | Mutation | — |
| `useUpdateTags` | `update_tags` | Mutation | — |
| `useToggleFavorite` | `toggle_favorite` | Mutation | — |
| `useUpdateNotes` | `update_notes` | Mutation | — |
| `useRevealInFinder` | `reveal_in_file_manager` | Mutation | — |

### 7.5 Error Propagation Flow

```
Meshy API returns HTTP 402
        │
        ▼
Rust: reqwest receives 402
        │
        ▼
Rust: MeshyError::ApiError { status: 402, body: "{\"message\":\"Insufficient credits\"}" }
        │
        ▼
Rust: Tauri command returns Err(error.to_string())
  → serialized as: {"code":"API_ERROR_402","message":"Insufficient credits"}
        │
        ▼
TypeScript: tauriInvoke rejects with the error string
        │
        ▼
lib/tauri.ts: parseError() converts to MeshyFrontendError
  → { code: "API_ERROR_402", message: "Insufficient credits" }
        │
        ▼
TanStack Query mutation: onError callback
        │
        ▼
Component: displays error via Toast (Sonner)
  → toast.error("Insufficient credits", { description: "Your account needs more credits to perform this action." })
```

---

## 8. Interaction Patterns

### 8.1 Button Patterns

| Button Type | Visual | When to Use | Component |
|---|---|---|---|
| **Primary** | `bg-accent text-white hover:bg-accent-hover` | Main action of a panel (Generate, Download, Save) | `<Button variant="default">` |
| **Secondary** | `bg-bg-tertiary text-text-primary border border-border hover:bg-bg-tertiary/80` | Alternative action (Save Preset, Cancel) | `<Button variant="secondary">` |
| **Ghost** | `bg-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary` | Toolbar actions, icon buttons | `<Button variant="ghost">` |
| **Destructive** | `bg-danger text-white hover:bg-danger/90` | Delete, Remove | `<Button variant="destructive">` |
| **Outline** | `bg-transparent border border-border text-text-primary hover:bg-bg-tertiary` | Export format selection, filter chips | `<Button variant="outline">` |

**Rules:**
- Every panel must have exactly one Primary button. Secondary actions use Secondary or Ghost.
- Primary buttons must have minimum width `w-24` (96px) for visual weight.
- Icon-only buttons must have `size="icon"` (40×40px) and `aria-label`.
- Button text must be 1–3 words. Never a full sentence.

### 8.2 Form Patterns

| Rule ID | Rule | Category |
|---|---|---|
| **FRM-01** | Every form input must have a `<Label>` above it. Labels use `text-sm font-medium text-text-secondary`. | [A11Y] |
| **FRM-02** | Required fields must have a red asterisk `*` in the label. The asterisk must have `aria-label="required"`. | [A11Y] |
| **FRM-03** | Inputs must show validation errors inline, below the input, in `text-danger text-xs`. Errors must be linked via `aria-describedby`. | [A11Y] |
| **FRM-04** | Disabled inputs must have `opacity-50 cursor-not-allowed` and the label must have `text-text-muted`. | [CONSISTENCY] |
| **FRM-05** | The Generate button must be disabled when required fields are empty. The disabled state must have a tooltip explaining why: "Enter a prompt to generate". | [A11Y] |
| **FRM-06** | Slider inputs must have `aria-label` and `aria-valuenow` reflecting the current value. The value must be displayed as text next to the slider. | [A11Y] |
| **FRM-07** | Checkbox groups (format selection) must be wrapped in a `<fieldset>` with a `<legend>`. | [A11Y] |
| **FRM-08** | Select dropdowns must use the shadcn/ui `Select` component (Radix-based). No native `<select>` elements. | [CONSISTENCY] |
| **FRM-09** | Image upload areas must be keyboard-accessible. Pressing Enter on the dropzone triggers the file dialog. The dropzone must have `role="button"` and `tabIndex={0}`. | [A11Y] |
| **FRM-10** | Textareas (prompt input, notes) must auto-resize up to a maximum height of 200px. Use `resize-none` and auto-resize via `useRef` + `useEffect`. | [PERF] |

### 8.3 Gallery Interaction

| Action | Trigger | Result |
|---|---|---|
| Open asset detail | Click on asset card or Enter key when card is focused | Detail panel opens, 3D preview loads |
| Select multiple assets | `Ctrl/Cmd + Click` | Multi-select state (for batch export) |
| Select all | `Ctrl/Cmd + A` when gallery is focused | All visible assets selected |
| Favorite toggle | Click star icon on card | `toggle_favorite` mutation, star fills |
| Context menu | Right-click on card | Dropdown menu: Export, Tag, Delete, Reveal in Finder |
| Tag filter | Click tag badge on card or select from filter dropdown | Gallery filters by tag |
| Search | Type in search bar | Debounced 300ms, queries SQLite via `search_assets` |

### 8.4 Task Monitor Interaction

| Action | Trigger | Result |
|---|---|---|
| Cancel task | Click "Cancel" button on task card | `delete_task` mutation (Meshy API cancel) |
| Retry failed task | Click "Retry" button on failed task card | Re-submits the same request body |
| Download completed task | Click "Download" button on succeeded task | `download_asset` mutation |
| View in gallery | Click "View" button on succeeded task | Navigates to gallery, selects the asset |
| Clear completed | Click "Clear Done" button | Removes terminal tasks from the monitor (not from SQLite) |

### 8.5 Drag and Drop

| Rule ID | Rule | Category |
|---|---|---|
| **DND-01** | Image files may be dragged onto the Image to 3D panel. The dropzone must show a visual highlight (`border-accent bg-accent/10`) when a file is hovering. | [CONSISTENCY] |
| **DND-02** | Only image files (`.jpg`, `.jpeg`, `.png`, `.webp`) are accepted. Non-image files show a "not-allowed" cursor and a toast: "Only image files are supported". | [CONSISTENCY] |
| **DND-03** | Drag and drop is supplementary to the file dialog. The "Upload" button must always be present as the keyboard-accessible alternative. | [A11Y] |
| **DND-04** | No drag-and-drop for 3D model files. The app does not import external 3D models in the MVP. | [BUILD] |

---

## 9. Visual Feedback States

### 9.1 Loading States

| Scenario | Pattern | Component |
|---|---|---|
| Gallery initial load | Skeleton grid (6 placeholder cards with `animate-pulse`) | `<Skeleton>` in `<AssetGrid>` |
| Gallery subsequent loads | Dimmed overlay on existing cards (`opacity-50`) while fetching next page | CSS opacity transition |
| Task polling | Progress bar on task card with percentage text | `<Progress>` + `<TaskCard>` |
| 3D model loading | Wireframe box placeholder inside Canvas while GLB loads | `<ModelFallback>` (R3F mesh) |
| Credit balance loading | `—` text in TopBar | Inline text |
| Form submission | Button shows spinner (`Loader2 animate-spin`) and text changes to "Generating..." | `<Button>` with `isLoading` prop |
| API key validation | Input shows spinner on right side | `<Input>` with loading state |

### 9.2 Empty States

| Scenario | Visual | Text | Action |
|---|---|---|---|
| No API key set | Centered icon (`KeyRound`) + text | "No API key configured. Add your Meshy API key to start generating 3D assets." | Button: "Add API Key" → opens settings |
| Gallery empty (no assets) | Centered icon (`Images`) + text | "No assets yet. Generate your first 3D model to get started." | Button: "Go to Generate" → navigates to generate panel |
| Gallery empty (filtered) | Centered icon (`SearchX`) + text | "No assets match your search or filter." | Button: "Clear filters" |
| Task monitor empty | Centered icon (`Zap`) + text | "No active tasks. Tasks you create will appear here." | No action (informational) |
| Animation library empty | Centered icon (`Play`) + text | "Failed to load animation library. Check your network connection." | Button: "Retry" |

### 9.3 Error States

| Scenario | Pattern | Duration |
|---|---|---|
| API error (4xx) | Toast (Sonner) with error icon, error message, and "Details" expandable | 5 seconds (auto-dismiss) |
| API error (5xx) | Toast with "Server error. Retrying..." text | Persists until retry completes or user dismisses |
| Network error | Toast with "Network error. Check your connection." + Retry button | Persists until dismissed or retried |
| 402 Payment Required | Toast with "Insufficient credits" + link to Meshy pricing page | Persists until dismissed |
| 401 Unauthorized | Toast with "API key invalid or expired" + "Update Key" button → settings | Persists until dismissed |
| 429 Rate Limited | Toast with "Rate limit reached. Waiting before retry..." | Auto-dismissed when retry succeeds |
| Form validation error | Inline text below input in `text-danger text-xs` | Persists until input is corrected |
| 3D preview failure | Centered text in 3D viewport: "Unable to load 3D preview. Showing thumbnail instead." + thumbnail image | Persists |

### 9.4 Success States

| Scenario | Pattern | Duration |
|---|---|---|
| Task created | Toast: "Task created — 20 credits deducted" | 3 seconds |
| Task succeeded | Toast: "✅ [Task name] completed" + "View" button | 5 seconds |
| Asset downloaded | Toast: "Asset saved to local storage" | 3 seconds |
| Export complete | Toast: "Exported [N] assets to [path]" | 5 seconds |
| API key validated | Toast: "API key valid — [balance] credits available" | 3 seconds |
| Tag added | Badge appears on card with `animate-in fade-in slide-in-from-bottom-1 duration-200` | Persistent |

---

## 10. 3D Viewport Guardrails

### 10.1 Canvas Lifecycle

| Rule ID | Rule | Category |
|---|---|---|
| **VP-01** | The R3F Canvas mounts only when the asset detail panel is open. It unmounts when the panel closes. No hidden Canvas instances. | [PERF] |
| **VP-02** | The Canvas uses `frameloop="demand"` by default. On `onPointerDown` (user starts orbiting), switch to `frameloop="always"`. On `onPointerUp`, switch back to `"demand"`. | [PERF] |
| **VP-03** | The Canvas `dpr` is capped at `[1, 2]`. No `dpr={window.devicePixelRatio}` — this can cause GPU crashes on 4K/5K displays. | [PERF] |
| **VP-04** | The Canvas must have a fallback if WebGL is unavailable. Wrap in an error boundary that shows the thumbnail image instead. | [PERF] |
| **VP-05** | GLB files are loaded via `useGLTF(assetUrl(path))` where `assetUrl` converts a local file path to Tauri's `asset://` protocol URL. No remote URLs for local assets. | [DECOUPLE] |
| **VP-06** | The loaded scene must be cloned before rendering: `scene.clone(true)`. This prevents modifying the cached original when multiple previews are opened sequentially. | [PERF] |
| **VP-07** | On unmount, call `useGLTF.clear(path)` to release the GLB from Three.js's cache. This prevents memory growth when browsing many assets. | [PERF] |
| **VP-08** | The Canvas must have `gl={{ preserveDrawingBuffer: true }}` to enable future screenshot/export features. This has a minor performance cost but is required for canvas-to-image capture. | [BUILD] |

### 10.2 Camera and Controls

| Rule ID | Rule | Category |
|---|---|---|
| **CAM-01** | Initial camera position: `[3, 2, 5]`, FOV: `45`. This provides a 3/4 view of most assets. | [CONSISTENCY] |
| **CAM-02** | `OrbitControls` with `enableDamping`, `dampingFactor={0.05}`. Damping provides smooth rotation without performance cost. | [CONSISTENCY] |
| **CAM-03** | Min distance: `2`, max distance: `15`. Prevents the user from zooming inside the model or too far away. | [CONSISTENCY] |
| **CAM-04** | `maxPolarAngle={Math.PI * 0.9}`. Prevents the user from orbiting below the ground plane. | [CONSISTENCY] |
| **CAM-05** | Auto-fit: use drei's `<Bounds fit clip observe margin={1.2}>` wrapping `<Center>`. This automatically frames the model on load. | [CONSISTENCY] |
| **CAM-06** | No auto-rotate. The user must initiate all camera movement. | [A11Y] |

### 10.3 Lighting

| Light | Type | Position | Intensity | Purpose |
|---|---|---|---|---|
| Ambient | `ambientLight` | — | `0.4` | Base fill light |
| Key | `directionalLight` | `[5, 5, 5]` | `1.2` | Primary illumination, casts shadows |
| Fill | `directionalLight` | `[-5, 3, -5]` | `0.3` | Reduces harsh shadows on opposite side |
| Environment | `<Environment preset="studio" />` | — | — | Provides realistic reflections on PBR materials |
| Ground shadow | `<ContactShadows>` | `[0, -1.5, 0]` | — | Soft shadow under the model |

### 10.4 Accessibility for 3D

| Rule ID | Rule | Category |
|---|---|---|
| **3D-A11Y-01** | The Canvas container must have `aria-label` describing the model: `"3D preview of: [prompt or asset type]"`. | [A11Y] |
| **3D-A11Y-02** | The Canvas must have `role="img"` since it is a static preview, not an interactive 3D scene in the accessibility sense. | [A11Y] |
| **3D-A11Y-03** | Below the Canvas, display a text description of the model: type, AI model used, polygon count (if available), and texture status. This ensures screen reader users have model information without the 3D view. | [A11Y] |
| **3D-A11Y-04** | The 3D viewport must not trap keyboard focus. It is not focusable. Orbit controls are mouse/touch only. | [A11Y] |

---

## 11. Responsive and Density Rules

### 11.1 Window Size Handling

MeshyForge is a desktop application with a minimum window size of 1024×700. The layout adapts at two breakpoints:

| Window Width | Sidebar | Gallery Columns | Form Layout |
|---|---|---|---|
| ≥ 1280px | Expanded (`w-56`) | 4 columns | Side-by-side (form + preview) |
| 1024–1279px | Collapsed (`w-14`) | 3 columns | Stacked (form above preview) |

### 11.2 Rules

| Rule ID | Rule | Category |
|---|---|---|
| **RES-01** | The sidebar auto-collapses to icon-only when the window width drops below 1280px. The user can still expand it manually. | [CONSISTENCY] |
| **RES-02** | The gallery grid uses CSS grid with `auto-fill` and `minmax(200px, 1fr)`. This naturally adjusts column count based on available width. | [PERF] |
| **RES-03** | The generate panel switches from side-by-side (form | preview) to stacked (form above preview) when width < 1280px. Use `flex-col lg:flex-row`. | [CONSISTENCY] |
| **RES-04** | The task monitor panel is always full-width. Task cards stack vertically regardless of window width. | [CONSISTENCY] |
| **RES-05** | No component may have a fixed pixel width that exceeds the minimum window width (1024px). All widths must be relative (`w-full`, `flex-1`, `max-w-*`) or use Tailwind's responsive prefixes. | [CONSISTENCY] |
| **RES-06** | Font sizes do not change based on window width. The app uses a fixed 14px base font size. Only the layout density changes. | [CONSISTENCY] |

### 11.3 Gallery Card Dimensions

| Element | Size | Notes |
|---|---|---|
| Card width | `minmax(200px, 1fr)` | CSS grid handles this |
| Thumbnail aspect ratio | `1:1` (square) | `aspect-square` Tailwind class |
| Thumbnail image | `object-cover` | Fills the square without distortion |
| Card padding | `p-3` (12px) | Inner padding |
| Card gap | `gap-4` (16px) | Grid gap |
| Card border radius | `rounded-md` (8px) | Matches `--radius-md` |
| Card border | `border border-border` | Subtle separator |
| Card hover | `border-accent` + `shadow-md` | Visual feedback |

---

## 12. Build Phases

### 12.1 Phase Overview

The build is divided into 6 phases. Each phase has a clear deliverable, dependencies, and quality gate. No phase may begin until the previous phase's quality gate has passed.

```
Phase 0: Project Scaffold
    │
    ▼
Phase 1: Backend Foundation
    │
    ▼
Phase 2: Core UI Shell
    │
    ▼
Phase 3: Generation Workflows
    │
    ▼
Phase 4: Asset Library
    │
    ▼
Phase 5: Polish and Release
```

### 12.2 Phase 0: Project Scaffold

**Goal:** Runnable Tauri + Vite + React app with empty shell.

**Deliverables:**
- `package.json` with all dependencies from TSS §17.1
- `Cargo.toml` with all dependencies from TSS §17.2
- `tauri.conf.json` configured per TSS §2.3
- `vite.config.ts` configured per TSS §4.3
- `tsconfig.json` configured per TSS §3.3
- `biome.json` configured per TSS §15.3
- `globals.css` with `@theme` tokens per TSS §5.4
- `src/App.tsx` rendering "MeshyForge" text
- `src-tauri/src/main.rs` with Tauri builder and no commands
- CI workflow (`.github/workflows/ci.yml`) passing
- `.gitignore` (node_modules, dist, src-tauri/target)
- `README.md` with setup instructions

**Dependencies:** None (first phase)

**Quality Gate:**
- [ ] `npm run tauri dev` launches the app window
- [ ] `npm run lint` passes with zero errors
- [ ] `npx tsc --noEmit` passes
- [ ] `cargo clippy` passes with zero warnings
- [ ] `cargo test` passes (no tests yet, but compilation succeeds)
- [ ] CI workflow runs green on all three platforms

### 12.3 Phase 1: Backend Foundation

**Goal:** All Rust backend modules functional and tested in isolation.

**Deliverables:**

1. **Meshy API Client** (`src-tauri/src/meshy/client.rs`)
   - `MeshyClient::new(api_key)` constructor
   - `create_task(endpoint, body)` → `TaskCreateResponse`
   - `get_task(endpoint, task_id)` → `serde_json::Value`
   - `delete_task(endpoint, task_id)` → `()`
   - `download_file(url, dest_path)` → `u64` (bytes written)
   - `stream_task(endpoint, task_id, on_event)` → `()`
   - `get_balance()` → `BalanceResponse`
   - Error handling: `MeshyError` enum with all variants
   - Unit tests with `wiremock` for success, 401, 402, 429, 500

2. **Database** (`src-tauri/src/storage/database.rs`)
   - `Database::open(path)` with WAL mode and pragmas
   - Migration system (`migrations/001_initial.sql`)
   - `insert_asset(record)` → `()`
   - `update_task_status(task_id, task_json)` → `()`
   - `mark_downloaded(task_id, file_paths, thumbnail, textures)` → `()`
   - `get_all_assets()` → `Vec<AssetRow>`
   - `search_assets(query, tag)` → `Vec<AssetRow>`
   - `update_tags(asset_id, tags)` → `()`
   - `toggle_favorite(asset_id)` → `()`
   - `update_notes(asset_id, notes)` → `()`
   - `delete_asset(asset_id)` → `()`
   - `log_task_create(task_id, endpoint, body)` → `()`
   - Unit tests with `tempfile` for all CRUD operations

3. **Keychain** (`src-tauri/src/security/keychain.rs`)
   - `store_key(key)` → `()`
   - `get_key()` → `Option<String>`
   - `delete_key()` → `()`
   - Linux fallback for missing secret service
   - Unit tests (macOS/Windows only — Linux tests are conditional)

4. **Tauri Commands** (`src-tauri/src/commands/*.rs`)
   - `set_api_key`, `get_api_key`, `validate_api_key`
   - `get_credit_balance`
   - `download_asset`
   - `reveal_in_file_manager`
   - `read_file_as_data_uri`
   - All commands registered in `main.rs` via `.invoke_handler(tauri::generate_handler![...])`

5. **App State** (`src-tauri/src/main.rs`)
   - `AppState` struct holding `MeshyClient`, `Database`, and app data directory
   - `MeshyClient` initialized lazily from keychain on first use
   - `Database` opened on app startup

**Dependencies:** Phase 0 complete

**Quality Gate:**
- [ ] All Rust unit tests pass (`cargo test`)
- [ ] `cargo clippy` passes with zero warnings
- [ ] Tauri commands are callable from the frontend via `invoke()` (verified with a temporary test button)
- [ ] SQLite database file is created at the correct platform path
- [ ] API key can be stored and retrieved from the OS keychain
- [ ] Credit balance query returns a number when a valid API key is set

### 12.4 Phase 2: Core UI Shell

**Goal:** Navigation, layout, settings, and API key management functional.

**Deliverables:**

1. **Root Layout** (`src/app/layout.tsx`)
   - TopBar with credit balance display
   - Sidebar with navigation items (Generate, Gallery, Tasks, Settings)
   - StatusBar with active task count and storage usage
   - Main content area with route-based rendering

2. **Routing** (`src/app/routes.tsx`)
   - Four routes: `/generate`, `/gallery`, `/tasks`, `/settings`
   - Default route: `/generate`
   - No react-router — use Zustand `activeView` state (simpler for desktop app)

3. **Settings Panel** (`src/components/settings/`)
   - `ApiKeyManager.tsx` — input, validate, store, delete
   - `CreditBalance.tsx` — display, refresh button
   - `PreferencesPanel.tsx` — default AI model, poll interval, auto-download toggle, SSE toggle
   - `AboutPanel.tsx` — version, API status link

4. **Common Components** (`src/components/common/`)
   - `Sidebar.tsx` — navigation with icons, collapse toggle
   - `TopBar.tsx` — credits, settings gear, logo
   - `StatusBar.tsx` — active tasks, storage, API connection status

5. **Zustand Stores** (`src/stores/`)
   - `appStore.ts` — navigation, sidebar, selected asset
   - `settingsStore.ts` — user preferences with `persist` middleware
   - `taskStore.ts` — active task tracking

6. **TanStack Query Setup** (`src/main.tsx`)
   - `QueryClient` with default options per TSS §6.6
   - `QueryClientProvider` wrapping the app
   - DevTools gated behind `import.meta.env.DEV`

7. **lib/tauri.ts** contract layer per §7.3

8. **Toast system** (Sonner) mounted at root

**Dependencies:** Phase 1 complete (commands must exist)

**Quality Gate:**
- [ ] All four navigation views render (empty placeholders for Generate, Gallery, Tasks)
- [ ] API key can be entered, validated, and stored via the Settings panel
- [ ] Credit balance displays and refreshes on window focus
- [ ] Sidebar collapses and expands
- [ ] StatusBar shows correct state (0 tasks, API connected/disconnected)
- [ ] All components pass accessibility audit (keyboard navigation, focus visible, ARIA labels)
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] All Phase 2 component tests pass (`npm run test`)

### 12.5 Phase 3: Generation Workflows

**Goal:** All Meshy API generation endpoints accessible from the UI.

**Deliverables:**

1. **Generate Panel** (`src/components/generate/`)
   - `TextTo3DPanel.tsx` — prompt input, model selector, remesh controls, pose, PBR, format checkboxes, generate button
   - `ImageTo3DPanel.tsx` — image dropzone + file dialog, model selector, texture controls, generate button
   - `MultiImagePanel.tsx` — multi-image upload (1–4 images), generate button
   - `PostProcessPanel.tsx` — remesh, retexture, convert, resize, UV unwrap forms (requires selecting an existing asset)
   - `RiggingPanel.tsx` — height meters input, generate button (requires selecting a humanoid asset)
   - `AnimationPanel.tsx` — animation library browser, action selection, generate button (requires a rigged asset)
   - `ImageGenPanel.tsx` — text-to-image and image-to-image forms
   - `PrintPanel.tsx` — multi-color print, analyze printability, repair printability
   - `CreativeLabPanel.tsx` — keychain, fridge magnet, figure, vinyl figure, brick figure, lamp, keycap (two-stage prototype → build)

2. **Task Monitor** (`src/components/tasks/`)
   - `TaskMonitor.tsx` — list of active and recently completed tasks
   - `TaskCard.tsx` — progress bar, status badge, label, action buttons (cancel, retry, download, view)
   - `TaskProgressBar.tsx` — animated progress with percentage
   - `TaskHistory.tsx` — collapsed list of past tasks

3. **Hooks** (`src/hooks/`)
   - `useMeshyApi.ts` — all mutation hooks for task creation
   - `useTaskPolling.ts` — polling hook with conditional interval
   - `useTaskStream.ts` — SSE streaming hook (opt-in)
   - `useDownloadAsset.ts` — download mutation
   - `useCreditBalance.ts` — balance query
   - `useAnimationLibrary.ts` — animation library query

4. **Tauri Commands** (Rust side)
   - All `create_*` commands for every endpoint
   - `poll_task` command
   - `stream_task` command
   - `delete_task` command
   - `download_asset` command (already from Phase 1, now wired to UI)

5. **Notification integration**
   - OS notification on task completion (Tauri notification plugin)
   - Toast notification on task creation, success, failure

**Dependencies:** Phase 2 complete (UI shell, navigation, API key management)

**Quality Gate:**
- [ ] Text to 3D (preview + refine) full flow works: create → poll → download → appears in task monitor
- [ ] Image to 3D full flow works: upload image → create → poll → download
- [ ] At least 3 endpoint types tested end-to-end (text-to-3d, image-to-3d, remesh)
- [ ] Task monitor shows real-time progress
- [ ] OS notification fires on task completion
- [ ] Error states display correctly (402, 401, network error)
- [ ] Credit balance updates after task creation
- [ ] All form inputs are keyboard-accessible
- [ ] All generation forms have proper labels and ARIA
- [ ] Component tests for at least TextTo3DPanel and ImageTo3DPanel
- [ ] `npm run lint` and `npx tsc --noEmit` pass

### 12.6 Phase 4: Asset Library

**Goal:** Gallery, asset detail, 3D preview, tagging, search, and export functional.

**Deliverables:**

1. **Gallery** (`src/components/gallery/`)
   - `AssetGrid.tsx` — responsive grid with virtualization above 100 items
   - `AssetCard.tsx` — thumbnail, title, tags, credits, favorite star, status badge
   - `TagFilter.tsx` — dropdown of all tags with counts
   - `SearchBar.tsx` — debounced full-text search
   - `AssetDetail.tsx` — full detail panel with metadata, notes, tags, actions

2. **3D Preview** (`src/components/gallery/AssetPreview3D.tsx`)
   - R3F Canvas with OrbitControls, Environment, ContactShadows
   - GLB loading via `useGLTF` with Tauri asset protocol
   - Fallback to thumbnail if WebGL fails
   - Cleanup on unmount (`useGLTF.clear()`)

3. **Export** (`src/components/export/`)
   - `ExportDialog.tsx` — format selection, destination path, batch vs single
   - `ExportProgress.tsx` — progress tracking for batch exports

4. **Hooks** (additional)
   - `useAssets.ts` — paginated asset query
   - `useUpdateTags.ts` — tag mutation
   - `useToggleFavorite.ts` — favorite mutation
   - `useUpdateNotes.ts` — notes mutation
   - `useDeleteAsset.ts` — delete mutation

5. **Tauri Commands** (Rust side)
   - `get_all_assets` command
   - `search_assets` command
   - `update_tags` command
   - `toggle_favorite` command
   - `update_notes` command
   - `delete_asset` command (deletes SQLite record + filesystem directory)
   - `get_storage_usage` command (calculates total asset directory size)

**Dependencies:** Phase 3 complete (assets must exist from generation)

**Quality Gate:**
- [ ] Gallery displays all downloaded assets as thumbnail cards
- [ ] Clicking a card opens the detail panel with 3D preview
- [ ] 3D preview loads GLB files and renders with orbit controls
- [ ] Search filters assets by prompt text
- [ ] Tag filter filters assets by tag
- [ ] Tags can be added and removed from the detail panel
- [ ] Notes can be edited and saved
- [ ] Favorite toggle works and persists
- [ ] Export dialog exports assets in selected format to chosen path
- [ ] Delete removes the asset from gallery and deletes local files
- [ ] Gallery virtualization works (test with 200+ mock assets)
- [ ] 3D preview unmounts cleanly (no WebGL context leaks)
- [ ] All gallery interactions are keyboard-accessible
- [ ] Component tests for AssetCard, AssetGrid, AssetDetail
- [ ] `npm run lint` and `npx tsc --noEmit` pass

### 12.7 Phase 5: Polish and Release

**Goal:** Production-ready, cross-platform builds, documentation.

**Deliverables:**

1. **Prompt Presets**
   - Save current form state as a named preset
   - Load preset populates form fields
   - Presets stored in SQLite `settings` table
   - Preset dropdown in each generation panel

2. **Empty States and Error Handling**
   - All empty states from §9.2 implemented
   - All error states from §9.3 implemented
   - Network retry logic for 429 and 5xx errors

3. **Keyboard Shortcuts**
   - `Ctrl/Cmd + K` → Command palette (search assets, navigate views)
   - `Escape` → Close any open dialog/panel
   - `Delete` → Delete selected asset (with confirmation dialog)

4. **Performance Optimization**
   - Code-splitting verified (three-vendor chunk loads only on 3D preview)
   - Bundle size audit (≤ 300 KB gzipped initial load)
   - Memory leak audit (open/close 3D preview 20 times, verify no growth)

5. **Accessibility Audit**
   - Full keyboard navigation test (Tab through entire app)
   - Screen reader test (VoiceOver on macOS or NVDA on Windows)
   - Contrast verification (all text/background combinations from §5.5)
   - `prefers-reduced-motion` test

6. **Cross-Platform Testing**
   - macOS (Apple Silicon): full workflow test
   - macOS (Intel): full workflow test
   - Windows 10/11: full workflow test
   - Linux (Ubuntu 22.04): full workflow test

7. **Build and Release**
   - GitHub Actions release workflow produces installers for all platforms
   - Release notes auto-generated from commit history
   - `README.md` updated with download links

8. **Documentation**
   - `docs/CONTRIBUTING.md` — development setup, code conventions
   - `docs/CHANGELOG.md` — v1.0.0 release notes
   - Inline code comments for all Tauri commands and hooks

**Dependencies:** Phase 4 complete

**Quality Gate:**
- [ ] Full end-to-end test passes on all three platforms
- [ ] Playwright e2e tests pass for: first launch, API key setup, generate model, view in gallery, export
- [ ] Bundle size ≤ 300 KB gzipped (initial load, excluding lazy chunks)
- [ ] No memory leaks detected in 3D preview cycling
- [ ] All accessibility tests pass (keyboard, screen reader, contrast, reduced motion)
- [ ] `npm run lint`, `npx tsc --noEmit`, `cargo clippy`, `cargo test` all pass
- [ ] GitHub release workflow produces valid installers (dmg, msi, deb, AppImage)
- [ ] README has correct setup and usage instructions

---

## 13. Quality Gates

### 13.1 Automated Quality Gates (CI)

Every push and pull request must pass these checks:

| Check | Tool | Command | Threshold |
|---|---|---|---|
| **Frontend lint** | Biome | `npx biome check src/` | 0 errors |
| **Frontend type check** | TypeScript | `npx tsc --noEmit` | 0 errors |
| **Frontend tests** | Vitest | `npm run test -- --coverage` | ≥ 70% lines, ≥ 70% functions |
| **Rust lint** | Clippy | `cargo clippy -- -D warnings` | 0 warnings |
| **Rust format** | rustfmt | `cargo fmt -- --check` | 0 deviations |
| **Rust tests** | cargo test | `cargo test` | All pass |
| **Build smoke test** | Tauri build | `npm run tauri build` | Succeeds on all 3 platforms |

### 13.2 Manual Quality Gates (Pre-Release)

| Check | Method | Pass Criteria |
|---|---|---|
| **Keyboard navigation** | Tab through entire app without mouse | Every interactive element reachable, focus visible, logical order |
| **Screen reader** | VoiceOver (macOS) or NVDA (Windows) | All content announced, no unlabeled controls, status updates announced |
| **Contrast verification** | Manual check of all text/background pairs per §5.5 | All pairs ≥ 4.5:1 (normal text) or ≥ 3:1 (large text, UI components) |
| **Reduced motion** | Enable `prefers-reduced-motion: reduce` in OS | All animations instant, spinners replaced with text, no motion |
| **Memory leak** | Open/close 3D preview 20 times, observe DevTools memory | No sustained memory growth |
| **Bundle size** | `vite build` + bundle analyzer | Initial load ≤ 300 KB gzipped |
| **Offline mode** | Disable network, browse gallery, preview 3D, export | All local features work; only generation fails gracefully |
| **Error recovery** | Trigger 402, 401, 429, network error | Each shows appropriate toast, retry works, no crashes |

### 13.3 Per-Phase Gate Summary

| Phase | Automated | Manual | Deliverable |
|---|---|---|---|
| **0: Scaffold** | Lint + type-check + CI green | App launches | Runnable shell |
| **1: Backend** | Rust tests + clippy | Commands callable from frontend | All backend modules |
| **2: UI Shell** | Frontend tests + lint + type-check | Keyboard nav, ARIA check | Navigation + settings |
| **3: Generation** | Frontend tests + lint + type-check | 3 endpoint flows, error states | All generation panels |
| **4: Asset Library** | Frontend tests + lint + type-check | 3D preview, search, export | Gallery + detail + export |
| **5: Polish** | All automated gates + e2e | Full a11y audit, cross-platform | Release build |

---

## 14. Implementation Checklist

### 14.1 Pre-Implementation Verification

Before writing any code, verify the following:

- [ ] TDD v1.0.0 has been read and understood
- [ ] TSS v1.0.0 has been read and understood
- [ ] This document (UI/UX Guardrails) has been read and understood
- [ ] Node.js 22+ is installed
- [ ] Rust 1.75+ is installed via `rustup`
- [ ] Platform-specific Tauri prerequisites are installed (see TSS §20.3)
- [ ] Git repository is initialized
- [ ] GitHub repository is created (private or public)

### 14.2 File Creation Order (Phase 0)

```
1.  package.json                              ← TSS §17.1
2.  tsconfig.json                             ← TSS §3.3
3.  vite.config.ts                            ← TSS §4.3
4.  biome.json                                ← TSS §15.3
5.  eslint.config.js                          ← TSS §15.4
6.  src/styles/globals.css                    ← TSS §5.4 + §5.6 (reduced motion)
7.  src/main.tsx                              ← TSS §6.6 (QueryClient setup)
8.  src/App.tsx                               ← Placeholder
9.  src-tauri/Cargo.toml                      ← TSS §17.2
10. src-tauri/tauri.conf.json                 ← TSS §2.3
11. src-tauri/capabilities/default.json       ← TSS §2.4
12. src-tauri/src/main.rs                     ← Tauri builder
13. src-tauri/src/lib.rs                      ← Module declarations
14. src-tauri/build.rs                        ← tauri_build
15. .github/workflows/ci.yml                  ← TSS §16.2
16. .gitignore
17. README.md
```

### 14.3 Component Creation Order (Phase 2–4)

```
Phase 2:
  1.  src/lib/tauri.ts                        ← Contract layer (§7.3)
  2.  src/lib/meshy-types.ts                   ← All TypeScript types (TDD §6.2)
  3.  src/lib/constants.ts                     ← API endpoints, defaults
  4.  src/lib/utils.ts                         ← cn(), formatters (TSS §5.6)
  5.  src/stores/appStore.ts                   ← TSS §6.3
  6.  src/stores/taskStore.ts                  ← TSS §6.3
  7.  src/stores/settingsStore.ts              ← TSS §6.3 + persist
  8.  src/components/common/Sidebar.tsx
  9.  src/components/common/TopBar.tsx
  10. src/components/common/StatusBar.tsx
  11. src/components/settings/ApiKeyManager.tsx
  12. src/components/settings/CreditBalance.tsx
  13. src/components/settings/PreferencesPanel.tsx
  14. src/components/settings/AboutPanel.tsx
  15. src/app/layout.tsx
  16. src/app/routes.tsx

Phase 3:
  17. src/hooks/useMeshyApi.ts                 ← All mutation hooks
  18. src/hooks/useTaskPolling.ts
  19. src/hooks/useTaskStream.ts
  20. src/hooks/useDownloadAsset.ts
  21. src/hooks/useCreditBalance.ts
  22. src/hooks/useAnimationLibrary.ts
  23. src/hooks/useNotifications.ts
  24. src/components/common/PromptEditor.tsx
  25. src/components/common/ImageDropzone.tsx
  26. src/components/common/ModelSelector.tsx
  27. src/components/generate/TextTo3DPanel.tsx
  28. src/components/generate/ImageTo3DPanel.tsx
  29. src/components/generate/MultiImagePanel.tsx
  30. src/components/generate/PostProcessPanel.tsx
  31. src/components/generate/RiggingPanel.tsx
  32. src/components/generate/AnimationPanel.tsx
  33. src/components/generate/ImageGenPanel.tsx
  34. src/components/generate/PrintPanel.tsx
  35. src/components/generate/CreativeLabPanel.tsx
  36. src/components/tasks/TaskMonitor.tsx
  37. src/components/tasks/TaskCard.tsx
  38. src/components/tasks/TaskProgressBar.tsx
  39. src/components/tasks/TaskHistory.tsx

Phase 4:
  40. src/hooks/useAssets.ts
  41. src/hooks/useUpdateTags.ts
  42. src/hooks/useToggleFavorite.ts
  43. src/hooks/useUpdateNotes.ts
  44. src/hooks/useDeleteAsset.ts
  45. src/components/gallery/AssetGrid.tsx
  46. src/components/gallery/AssetCard.tsx
  47. src/components/gallery/TagFilter.tsx
  48. src/components/gallery/SearchBar.tsx
  49. src/components/gallery/AssetDetail.tsx
  50. src/components/gallery/AssetPreview3D.tsx  ← Lazy-loaded
  51. src/components/export/ExportDialog.tsx
  52. src/components/export/ExportProgress.tsx
```

### 14.4 Rust Command Registration Order

```rust
// src-tauri/src/main.rs
// Commands are registered in the order they are implemented.

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            let db = Database::open(&database_path(app.handle()))?;
            app.manage(AppState::new(db));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Phase 1: Foundation
            commands::keychain::set_api_key,
            commands::keychain::get_api_key,
            commands::keychain::validate_api_key,
            commands::api::get_credit_balance,
            commands::api::download_asset,
            commands::assets::reveal_in_file_manager,
            commands::assets::read_file_as_data_uri,

            // Phase 3: Generation
            commands::api::create_text_to_3d,
            commands::api::create_image_to_3d,
            commands::api::create_multi_image_to_3d,
            commands::api::create_remesh,
            commands::api::create_retexture,
            commands::api::create_convert,
            commands::api::create_resize,
            commands::api::create_uv_unwrap,
            commands::api::create_rigging,
            commands::api::create_animation,
            commands::api::create_text_to_image,
            commands::api::create_image_to_image,
            commands::api::create_multi_color_print,
            commands::api::create_analyze_printability,
            commands::api::create_repair_printability,
            commands::api::create_creative_lab_keychain,
            commands::api::create_creative_lab_fridge_magnet,
            commands::api::create_creative_lab_figure,
            commands::api::create_creative_lab_vinyl_figure,
            commands::api::create_creative_lab_brick_figure,
            commands::api::create_creative_lab_lamp,
            commands::api::create_creative_lab_keycap,
            commands::api::poll_task,
            commands::api::stream_task,
            commands::api::delete_task,
            commands::api::fetch_animation_library,

            // Phase 4: Asset Library
            commands::database::get_all_assets,
            commands::database::search_assets,
            commands::database::update_tags,
            commands::database::toggle_favorite,
            commands::database::update_notes,
            commands::database::delete_asset,
            commands::assets::get_storage_usage,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MeshyForge");
}
```

### 14.5 shadcn/ui Component Installation Order

shadcn/ui components are installed via CLI, not npm. Run these commands in order:

```bash
# Initialize shadcn/ui (creates components.json, lib/utils.ts)
npx shadcn@latest init

# Phase 2: Core UI
npx shadcn@latest add button input textarea label select
npx shadcn@latest add switch checkbox slider tabs
npx shadcn@latest add dropdown-menu dialog tooltip badge
npx shadcn@latest add card progress separator scroll-area skeleton
npx shadcn@latest add command

# Phase 3: Additional
npx shadcn@latest add sonner   # Toast notifications (or use sonner directly)

# Phase 5: Polish
npx shadcn@latest add popover   # For tag color picker, preset menu
```

### 14.6 Guardrail Enforcement Summary

| Guardrail Category | Count | Enforcement Method |
|---|---|---|
| **Token** (TKN-01–08) | 8 | Biome lint rules + code review |
| **Layout** (LAY-01–08) | 8 | Code review |
| **Component** (CMP-01–07) | 7 | Biome lint + code review |
| **Keyboard** (KBD-01–10) | 10 | Manual a11y test + code review |
| **Semantic** (SEM-01–15) | 15 | Manual a11y test + eslint-plugin-jsx-a11y |
| **Color** (CLR-01–07) | 7 | Contrast verification table (§5.5) + code review |
| **Motion** (MOT-01–04) | 4 | Manual reduced-motion test + CSS media query |
| **Rendering** (RND-01–10) | 10 | React DevTools Profiler + code review |
| **Data** (DAT-01–08) | 8 | TanStack Query config + code review |
| **Bundle** (BDL-01–06) | 6 | Bundle analyzer + Vite config |
| **Memory** (MEM-01–05) | 5 | DevTools memory profiler + code review |
| **Contract** (CTR-01–10) | 10 | Code review (lib/tauri.ts is single import point) |
| **3D Viewport** (VP-01–08) | 8 | Code review + memory leak test |
| **Camera** (CAM-01–06) | 6 | Code review |
| **3D A11Y** (3D-A11Y-01–04) | 4 | Manual a11y test |
| **Responsive** (RES-01–06) | 6 | Manual resize test |
| **Form** (FRM-01–10) | 10 | Code review + a11y test |
| **Total** | **126** | — |

---