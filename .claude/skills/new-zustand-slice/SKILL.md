---
name: new-zustand-slice
description: >-
  Scaffolds a new Zustand store or extends one of MeshyForge's existing
  three (appStore, taskStore, settingsStore) in src/stores/, enforcing
  coding_standards.md §8.1's STT-01 through STT-07 state-boundary rules
  verbatim — persist-wrapped vs. ephemeral, no @tanstack/react-query or
  @tauri-apps/api imports, mutation only via named actions, explicit
  partialize field lists. Use when adding new UI-only or persisted-preference
  state. Do NOT use for server/API/SQLite-derived data (that belongs in a
  TanStack Query hook — use new-query-hook) or for form-input state (belongs
  in local React useState per STT-04, not a store at all).
---

# New Zustand Slice

Adds a new Zustand store, or extends one of the three existing ones, in `src/stores/`. Source of truth: `coding_standards.md` §8.1 (STT-01–07); `zustand_store_implementations.md` holds the complete, current implementations of all three stores — read the one closest to what you're adding before writing anything.

## 0. First question: does this belong in Zustand at all?

Apply the state-boundary table (coding_standards.md §8.1) before creating anything:

| State kind | Owner | Rule |
|---|---|---|
| Data from the Meshy API or SQLite | TanStack Query | **STT-01** — never Zustand, regardless of how convenient caching it there looks |
| UI-only state (nav, selection, sidebar, active-task tracking) | Zustand, **not** persisted | **STT-02** |
| User preferences (default model, poll interval, auto-download) | Zustand **with** `persist` | **STT-03** |
| Form input (prompt text, slider, checkboxes) | React `useState`, local to the component | **STT-04** — never Zustand or Query |

If your state is server-derived or form-local, stop — this skill is the wrong tool; use `new-query-hook` or plain `useState` instead.

## 1. Only 3 stores exist by design — extend before you create

`appStore.ts` (navigation/UI chrome), `taskStore.ts` (in-flight task tracking), `settingsStore.ts` (persisted preferences) are the complete set (zustand_store_implementations.md §2–4). This is a low-frequency skill: **check whether the new state is a natural addition to one of these three before scaffolding a fourth file.** A 4th store is the exception, justified by a genuinely distinct domain (not just "this feature wants its own file").

## 2. STT-05: stores are pure state containers

```
Zustand store files must NOT import:
  - @tanstack/react-query  (server state doesn't belong here — STT-01)
  - @tauri-apps/api         (no side-effecting platform calls from a store)
  - React itself            (these are plain `create()` stores, not components/hooks-with-JSX)
```
(ORG-08 restates this from the file-organization side.)

## 3. STT-07: mutation only through named actions

State changes only through action functions defined on the store's own interface — never `set()` called from outside the store creator (a component reaching into `useXStore.setState(...)` directly, or destructuring `set` out of the hook, is not this pattern). Every existing store follows this:
```typescript
interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;   // the ONLY way to flip sidebarCollapsed
}
export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
```
Use the functional-update form `set((s) => ({...}))` whenever the new state depends on prior state; use the object form `set({...})` for unconditional replacement (see `appStore.setActiveView`).

**Map/Set-backed state**: if the new slice holds a `Map`/`Set` (like `taskStore.activeTasks: Map<string, ActiveTask>`), every action must construct a **new** `Map`/`Set` instance and return it — mutating the existing collection in place and returning the same reference silently fails Zustand's shallow-equality change detection (zustand_store_implementations.md §3 usage notes):
```typescript
updateTask: (taskId, updates) => set((s) => {
  const tasks = new Map(s.activeTasks);   // new instance, not s.activeTasks.set(...)
  const existing = tasks.get(taskId);
  if (existing) tasks.set(taskId, { ...existing, ...updates });
  return { activeTasks: tasks };
}),
```

## 4. STT-06 / HOK-10: direction of the Zustand ↔ Query boundary

- A TanStack Query hook must never call this store's `set()`/actions (HOK-10, enforced from the hook side by `new-query-hook`).
- The reverse is fine and is the actual wiring pattern: a **Feature component** calls a mutation hook, and in *its own* `onSuccess`/effect (not inside the hook file), calls this store's action — e.g. a Generate panel calling `useCreateRetexture()` then, on success, `useTaskStore.getState().addTask({...})`.

## 5. STT-02 vs. STT-03: persist or not

- **Ephemeral (STT-02, default)**: no `persist` wrapper. `appStore`/`taskStore` are the pattern — state resets to defaults on relaunch, which is intentional (navigation defaulting to `'generate'`, no stale in-flight tasks surviving a restart).
- **Persisted (STT-03, `settingsStore` only right now)**: wrap with `zustand/middleware`'s `persist`:
  ```typescript
  export const use<Name>Store = create<State>()(
    persist(
      (set) => ({ ...DEFAULTS, /* actions */ }),
      {
        name: 'meshyforge-<domain>',   // e.g. 'meshyforge-settings'
        version: 1,
        partialize: (state) => ({
          // explicitly re-list EVERY persisted field by name — see §6
        }),
      },
    ),
  );
  ```
  Only add `persist` if the state genuinely needs to survive an app relaunch (user preferences). Don't persist `appStore`/`taskStore`-shaped state without a specific reason — if cross-session view memory is later wanted, that's a deliberate change to `appStore`, not a default.

## 6. `partialize` must explicitly re-list every persisted field — not destructure-exclude

```typescript
// GOOD — explicit, stable across refactors:
partialize: (state) => ({
  defaultAiModel: state.defaultAiModel,
  pollIntervalMs: state.pollIntervalMs,
  // ...every persisted field, named individually
}),

// WRONG — do not do this:
partialize: ({ setDefaultAiModel, setPollIntervalMs, ...rest }) => rest,
```
Rationale (zustand_store_implementations.md §4 usage notes): re-listing keeps the persisted payload explicit; a destructuring-exclusion approach means a newly added action could accidentally leak into `localStorage` if someone forgets to add it to the exclusion list. `version: 1` is reserved for a future `migrate(persistedState, version)` function if the persisted shape ever changes — don't add a `migrate` function until there's an actual prior version to migrate from.

> Note: the current `settingsStore.ts` reference implementation itself only exposes setter actions for 6 of its 13 state fields — this asymmetry is preserved intentionally in the source (zustand_store_implementations.md §5, judgment call 2), not a bug to silently "fix" by adding the missing setters. If you need a setter for one of the other 7 fields, add it deliberately and note why, rather than assuming symmetry was the goal.

## 7. Consumption pattern (for whoever calls the new store)

Components read via the selector function form, not whole-store destructuring (HOK-08 — a component-layer rule, but it directly shapes how any new field should be consumed):
```typescript
// GOOD:
const collapsed = useAppStore((s) => s.sidebarCollapsed);
// BAD — subscribes to the entire store, re-renders on unrelated changes:
const { sidebarCollapsed } = useAppStore();
```

## 8. File placement

`src/stores/<name>Store.ts`, exported hook `use<Name>Store`. No React import, no `@tanstack/react-query` import, no `@tauri-apps/api` import (§2).
