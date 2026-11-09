---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# Frontend rules

- Follow `docs/coding_standards.md` §§4–5, 8, 10–13 and
  `docs/UI_UX_Documentation.md`; those documents are authoritative for detailed
  rules.
- Components use named exports, function declarations, and a named `Props`
  interface. Keep components focused and place behavior tests beside the
  source.
- Components call application hooks, not Tauri commands directly. All Tauri
  API imports and invocation go through `src/lib/tauri.ts`.
- Keep state in its intended owner: provider/SQLite data in TanStack Query,
  shared UI state and preferences in Zustand, and transient form state in
  component-local React state. Active task tracking in `taskStore` is UI
  tracking; do not move server response caches into Zustand.
- Hooks should own data-fetching behavior, use stable query keys, and clean up
  subscriptions, timers, or listeners they create.
- Preserve accessibility, design tokens, and existing loading/error/empty
  states when changing UI behavior.
