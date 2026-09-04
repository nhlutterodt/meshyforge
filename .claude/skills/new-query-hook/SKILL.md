---
name: new-query-hook
description: >-
  Scaffolds one new TanStack Query hook (useQuery or useMutation) in
  src/hooks/ for MeshyForge, enforcing coding_standards.md §5.2's HOK-01
  through HOK-10 hook rules and the DAT-07/DAT-08 data-loading rules verbatim
  — hook naming, no JSX in hook files, stable primitive query keys, retry
  limits, and the rule that hooks never call Zustand set() directly. Use
  when adding a single new query or mutation hook for an existing typed
  command. Do NOT use for scaffolding a whole new Meshy endpoint (command +
  types + hook + store wiring — use new-meshy-endpoint) or for the Zustand
  side of state (use new-zustand-slice).
---

# New Query Hook

Adds one hook to `src/hooks/` calling an existing Tauri command via `invoke()`. Source of truth: `coding_standards.md` §5.2 (HOK-01–10); `hook_implementations.md` reproduces the full set of 30 concrete hooks matching those rules — read the closest matching example there before writing a new one (mutation pattern: `useCreateTextTo3D`; polling pattern: `usePollTask`; listener pattern: `useStreamTask`).

## 1. Decide query vs. mutation

- **`useQuery`**: reads data (GET/poll/list). Examples: `usePollTask`, `useCreditBalance`, `useAssets`, `useApiKey`, `useAnimationLibrary`.
- **`useMutation`**: writes/creates/deletes (POST/DELETE, or any user-initiated action). Examples: all 15 `useCreate*` hooks, `useDeleteTask`, `useDeleteAsset`, `useUpdateTags`, `useToggleFavorite`, `useDownloadAsset`.
- Per **STT-01**, this hook is the *only* place server/API/SQLite-derived data may live — never mirror its result into a Zustand store.

## 2. Rule-by-rule checklist (coding_standards.md §5.2)

| Rule | Requirement | How it shows up |
|---|---|---|
| **HOK-01** | Hook name starts with `use`. | `useCreateRetexture`, `usePollTask`, … |
| **HOK-02** | File contains *only* TanStack Query / Tauri `invoke` logic — no JSX, no rendering logic. Lives in `src/hooks/`. (ORG-07) | — |
| **HOK-03** | No hook conditionally calls another hook. Conditional behavior lives in an `enabled` flag or effect body, not in whether the hook itself runs. | `useStreamTask`'s `enabled` param, not a conditional `useEffect` call |
| **HOK-04** | Every `useEffect` has an explicit dependency array — only relevant for listener hooks (§4 below). | `useStreamTask`: `[enabled, taskId, endpoint, qc]` |
| **HOK-05** | `useEffect` cleanup must be returned for any effect creating a subscription/listener/timer/reference. | `useStreamTask` returns `() => { cancelled = true; unlisten?.(); }` |
| **HOK-06 / HOK-07** | No `useMemo`/`useCallback` for primitive values or non-prop functions. | Not needed here — see HOK-09: keys are already stable primitive arrays |
| **HOK-08** | N/A at the hook layer. Reading a Zustand selector to decide a hook's behavior (e.g. `useSseStreaming`) is the **calling component's** job — pass the result in as a parameter (`enabled: boolean`), don't read the store inside the hook file. | hook_implementations.md §1.2: *"multi-step operations are orchestrated by the Feature component, not by a single hook."* |
| **HOK-09** | Query keys are stable arrays of primitives: `['task', taskId]`, `['assets', search, tag]`, `['credit-balance']`, `['api-key']`, `['animation-library']`. Use `useMemo` only if key construction is genuinely non-trivial — none of the existing 30 hooks need it. | — |
| **HOK-10** | Hook **never** calls Zustand `set()` or a store action, directly or indirectly. Cache writes go through `QueryClient` only (`invalidateQueries`, `setQueryData`). | `useStreamTask` writes live SSE data via `qc.setQueryData(['task', taskId], data)` — never touches `useTaskStore` |

`STT-06` restates HOK-10 from the store side: "TanStack Query hooks must not call Zustand `set()`." Treat the two as one rule enforced from both files.

## 3. Retry limits (DAT-07)

> "No TanStack Query may have `retry: 3` or higher. Max 1 retry for queries, 0 for mutations." (UI_UX_Documentation.md DAT-07, restated in hook_implementations.md §1.2)

- Every `useMutation` in this codebase: `retry: 0`, no exceptions.
- Every `useQuery`: `retry: 1` maximum (never omit `retry` and rely on the TanStack default of 3).

## 4. Mutation hook template

```typescript
// src/hooks/use<PascalName>.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { <RequestType>, <ResponseType> } from '@lib/meshy-types';

export function use<PascalName>() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: <RequestType>) => {
      return await invoke<<ResponseType>>('<command_name>', { body });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['<affected-key>'] });
      // Task-creating mutations invalidate ['credit-balance'] (creation
      // consumes credits) — EXCEPT genuinely free operations, e.g.
      // useCreateAnalyzePrintability, which omits this call entirely.
    },

    onError: (error) => {
      console.error('Failed to <verb> <noun>:', error);
    },

    retry: 0,
  });
}
```
If the command takes multiple named arguments instead of one `body`, define an `Args` interface for the mutation input (see `useDeleteTask`'s `DeleteTaskArgs { endpoint, taskId }` or `useUpdateTags`'s `UpdateTagsArgs { assetId, tags }`) rather than a positional-arg `mutationFn`.

## 5. Query hook template

```typescript
// src/hooks/use<PascalName>.ts
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { <ResponseType> } from '@lib/meshy-types';

export function use<PascalName>(/* params that belong in the key */) {
  return useQuery({
    queryKey: ['<stable>', /* ...primitive params... */],

    queryFn: async () => {
      return await invoke<<ResponseType>>('<command_name>', { /* args */ });
    },

    enabled: /* only if conditionally runnable, e.g. taskId !== null */,
    refetchInterval: /* only for polling hooks — a function that returns
                         false on terminal status, else the interval in ms;
                         see usePollTask */,
    staleTime: /* Infinity only for data that changes rarely, e.g.
                  useAnimationLibrary (DAT-06) */,
    retry: 1,
  });
}
```

## 6. Special case: polling hooks must stop on terminal status (DAT-02)

If this is a task-status query, `refetchInterval` must be a function (not a bare number) that inspects `query.state.data?.status` and returns `false` for `SUCCEEDED`/`FAILED`/`CANCELED`, otherwise the poll interval — copy `usePollTask`'s implementation exactly rather than re-deriving it; **for an already-known endpoint, don't write a new polling hook at all — call `usePollTask(taskId, endpoint)` with your endpoint string**, since it's already generic.

## 7. Special case: listener/side-effect hooks (SSE)

If the hook opens an event listener (`onEvent`) rather than issuing a request/response, it belongs in `useEffect`, not `useQuery`/`useMutation` — follow `useStreamTask`'s shape: `enabled` + `taskId` + `endpoint` params, `unlisten` captured and returned as cleanup (HOK-05), writes go to `qc.setQueryData(['task', taskId], data)` so both polling and streaming consumers read from the same cache key (DAT-08: SSE is opt-in per task, decided by the caller, never by the hook itself).

## 8. Imports and file placement

```typescript
import { useMutation | useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke, onEvent } from '@lib/tauri';   // onEvent only for listener hooks
import type { ... } from '@lib/meshy-types';
```
File: `src/hooks/use<PascalName>.ts`, one hook per file, matching the existing 30-file layout in `hook_implementations.md`.
