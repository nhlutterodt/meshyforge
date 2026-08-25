# Hook Implementations — MeshyForge

## Document Metadata
| Field | Value |
|---|---|
| **Project** | MeshyForge — AI 3D Asset Studio |
| **Document Type** | Hook Implementations Reference |
| **Version** | 1.0.0 |
| **Date** | 2026 |
| **Status** | Reference (produced per project decision, overriding Documentation Gap Assessment v1.0.0 Gap 5) |
| **Dependencies** | CSD v1.0.0 §8.3 (canonical patterns), UI/UX v1.0.0 §7.4 (hook-command mapping table) |

---

## 1. Purpose

This is the target content of `src/hooks/*.ts` files, written as a complete reference ahead of implementation. UI/UX §7.4's Hook → Command Mapping table remains the source of truth for which hook calls which command, its query/mutation classification, and its TanStack Query key — this document exists only to spell out the full, literal code for all 30 hooks so nothing is left to interpolate by hand.

Per the Documentation Gap Assessment (§6.4, Gap 5), this document was **not** recommended for generation — the assessment judged the 2 reference patterns in CSD §8.3 (`useCreateTextTo3D`, `usePollTask`) plus the UI/UX §7.4 mapping table as sufficient to derive the remaining hooks. The project owner overrode that recommendation. This document is produced as a standalone reference and duplicates logic already covered normatively by CSD §8.3 and UI/UX §7.4; **those two sections remain the source of truth** in the event of any conflict.

### 1.1 On the "third reference pattern" (`useDownloadAsset`)

The gap assessment (§6.4) describes CSD §8.3 as containing three reference implementations — a mutation pattern (`useCreateTextTo3D`), a polling pattern (`usePollTask`), and a "download" pattern (`useDownloadAsset`). A full re-read of CSD §8.3 (and the rest of §8, through §8.4's data-flow diagram) found only **two** literal code implementations in that section: the mutation pattern and the polling pattern. `useDownloadAsset` appears in CSD §8.4 only as a step in the store-to-component data flow diagram (`lib/tauri.ts: invoke('download_asset', { taskId, modelUrls, ... })`, followed by `qc.invalidateQueries(['assets'])` in the mutation's `onSuccess`) — not as a standalone code block. Treating the gap assessment's description as slightly ahead of the actual CSD content, `useDownloadAsset` below is implemented as a **mutation-hook variant** of the `useCreateTextTo3D` pattern: same shape (`useMutation` + `onSuccess` invalidation + `onError` logging + `retry: 0`), adapted to accept a file-download request and return local file paths instead of a task ID, using the exact command name, argument names, and invalidation target (`['assets']`) shown in the CSD §8.4 diagram.

### 1.2 Conventions applied (CSD §5.2, Hook Rules)

Every hook below follows CSD §5.2's HOK-01 through HOK-10:

| Rule | How it's applied here |
|---|---|
| HOK-01 | Every hook name starts with `use`. |
| HOK-02 | Hooks contain only TanStack Query / Tauri `invoke` logic — no JSX, no rendering. |
| HOK-03 | No hook conditionally calls another hook; conditional behavior lives in `enabled` flags and effect bodies. |
| HOK-04 | Every `useEffect` (in `useStreamTask`) has an explicit dependency array. |
| HOK-05 | `useStreamTask`'s effect returns a cleanup function that calls the SSE `UnlistenFn`. |
| HOK-06/07 | No `useMemo`/`useCallback` is used for primitives or non-prop functions — query keys here are stable primitive arrays, so none is needed (see HOK-09). |
| HOK-08 | N/A to this document — Zustand selector usage is a component-layer concern, not a hook-layer one, per UI/UX §7.4 ("multi-step operations are orchestrated by the Feature component, not by a single hook"). |
| HOK-09 | All query keys are stable arrays of primitives (`['assets', search, tag]`, `['task', taskId]`, etc.) — no `useMemo` is required for key construction. |
| HOK-10 | No hook calls Zustand `set()` or a store action. Cache writes go through `QueryClient` (`invalidateQueries`, `setQueryData`), never through a Zustand store. |

Two data-layer rules from UI/UX §6.1 also constrain every hook below:

- **DAT-07**: queries use `retry: 1` at most; mutations use `retry: 0` always.
- **DAT-08**: SSE (`useStreamTask`) is opt-in — the caller (a Feature component reading `useSettingsStore((s) => s.useSseStreaming)`) controls the `enabled` argument. The hook itself has no opinion on whether SSE or polling is active.

### 1.3 Type extensions required

CSD §6.2 (`src/lib/meshy-types.ts`) does not yet define types for every command used below. TDD §6.2 explicitly notes UV Unwrap has "no specific type — uses `input_task_id` or `model_url`" (TDD §6.2, FR-POST-05 source alignment), and the three `/v1/print/*` endpoints and the download/animation-library responses are documented only in prose (FRD §5.7, FRD FR-POST-07-F3, TDD §7.2 `download_asset`). The following types are additions this document assumes exist in `src/lib/meshy-types.ts` — they are direct transcriptions of the field lists already specified in TDD §6.2/§7.2 and FRD §5.7:

```typescript
// src/lib/meshy-types.ts — additions

export interface UvUnwrapRequest {
  inputTaskId?: string;
  modelUrl?: string;
  targetFormats?: ExportFormat[];
}

export interface MultiColorPrintRequest {
  inputTaskId?: string;
  modelUrl?: string;
  maxColors?: number;        // 1–16, default 4 (FRD FR-PRINT-01-F2)
}

export interface AnalyzePrintabilityRequest {
  inputTaskId?: string;
  modelUrl?: string;         // .glb, .gltf, .obj, .fbx, .stl (FRD FR-PRINT-02-F1)
}

export interface RepairPrintabilityRequest {
  inputTaskId?: string;
  modelUrl?: string;         // .glb, .gltf, .obj, .fbx, .stl (FRD FR-PRINT-03-F1)
}

export interface DownloadAssetRequest {
  taskId: string;
  modelUrls: Record<string, string>;
  thumbnailUrl?: string;
  textureUrls?: TextureUrl[];
}

export interface DownloadAssetResponse {
  filePaths: Record<string, string>;
  thumbnailPath: string | null;
  texturePaths: TextureUrl[] | null;
}

export interface AnimationLibraryItem {
  actionId: number;
  name: string;
  category: string;          // FRD FR-POST-07-F3
}
```

---

## 2. Mutation Hooks

### 2.1 Generation & Post-Processing Create Hooks

All 15 `create_*` hooks follow the CSD §8.3 mutation pattern exactly: call the command with `{ body }`, invalidate `['credit-balance']` on success (task creation consumes credits), log and rethrow nothing extra on error, and never retry a user-initiated action. The one exception is `useCreateAnalyzePrintability`, which is a free operation (FRD FR-PRINT-02-F3: "Free — no credits consumed") and therefore does **not** invalidate the credit balance.

```typescript
// src/hooks/useCreateTextTo3D.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type {
  TextTo3DPreviewRequest,
  TextTo3DRefineRequest,
  TaskCreateResponse,
} from '@lib/meshy-types';

export function useCreateTextTo3D() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: TextTo3DPreviewRequest | TextTo3DRefineRequest) => {
      return await invoke<TaskCreateResponse>('create_text_to_3d', { body });
    },

    onSuccess: (_data, _variables) => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to create text-to-3D task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useCreateImageTo3D.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { ImageTo3DRequest, TaskCreateResponse } from '@lib/meshy-types';

export function useCreateImageTo3D() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: ImageTo3DRequest) => {
      return await invoke<TaskCreateResponse>('create_image_to_3d', { body });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to create image-to-3D task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useCreateMultiImageTo3D.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { MultiImageTo3DRequest, TaskCreateResponse } from '@lib/meshy-types';

export function useCreateMultiImageTo3D() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: MultiImageTo3DRequest) => {
      return await invoke<TaskCreateResponse>('create_multi_image_to_3d', { body });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to create multi-image-to-3D task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useCreateRemesh.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { RemeshRequest, TaskCreateResponse } from '@lib/meshy-types';

export function useCreateRemesh() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: RemeshRequest) => {
      return await invoke<TaskCreateResponse>('create_remesh', { body });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to create remesh task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useCreateRetexture.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { RetextureRequest, TaskCreateResponse } from '@lib/meshy-types';

export function useCreateRetexture() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: RetextureRequest) => {
      return await invoke<TaskCreateResponse>('create_retexture', { body });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to create retexture task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useCreateConvert.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { ConvertRequest, TaskCreateResponse } from '@lib/meshy-types';

export function useCreateConvert() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: ConvertRequest) => {
      return await invoke<TaskCreateResponse>('create_convert', { body });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to create convert task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useCreateResize.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { ResizeRequest, TaskCreateResponse } from '@lib/meshy-types';

export function useCreateResize() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: ResizeRequest) => {
      return await invoke<TaskCreateResponse>('create_resize', { body });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to create resize task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useCreateUvUnwrap.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { UvUnwrapRequest, TaskCreateResponse } from '@lib/meshy-types';

export function useCreateUvUnwrap() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: UvUnwrapRequest) => {
      return await invoke<TaskCreateResponse>('create_uv_unwrap', { body });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to create UV unwrap task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useCreateRigging.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { RiggingRequest, TaskCreateResponse } from '@lib/meshy-types';

export function useCreateRigging() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: RiggingRequest) => {
      return await invoke<TaskCreateResponse>('create_rigging', { body });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to create rigging task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useCreateAnimation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { AnimationRequest, TaskCreateResponse } from '@lib/meshy-types';

export function useCreateAnimation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: AnimationRequest) => {
      return await invoke<TaskCreateResponse>('create_animation', { body });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to create animation task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useCreateTextToImage.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { TextToImageRequest, TaskCreateResponse } from '@lib/meshy-types';

export function useCreateTextToImage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: TextToImageRequest) => {
      return await invoke<TaskCreateResponse>('create_text_to_image', { body });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to create text-to-image task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useCreateImageToImage.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { ImageToImageRequest, TaskCreateResponse } from '@lib/meshy-types';

export function useCreateImageToImage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: ImageToImageRequest) => {
      return await invoke<TaskCreateResponse>('create_image_to_image', { body });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to create image-to-image task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useCreateMultiColorPrint.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { MultiColorPrintRequest, TaskCreateResponse } from '@lib/meshy-types';

export function useCreateMultiColorPrint() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: MultiColorPrintRequest) => {
      return await invoke<TaskCreateResponse>('create_multi_color_print', { body });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to create multi-color print task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useCreateAnalyzePrintability.ts
import { useMutation } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { AnalyzePrintabilityRequest, TaskCreateResponse } from '@lib/meshy-types';

// FRD FR-PRINT-02-F3: "Free — no credits consumed."
// Unlike every other create_* hook, this one does NOT invalidate
// ['credit-balance'] on success, because the operation never changes it.
export function useCreateAnalyzePrintability() {
  return useMutation({
    mutationFn: async (body: AnalyzePrintabilityRequest) => {
      return await invoke<TaskCreateResponse>('create_analyze_printability', { body });
    },

    onError: (error) => {
      console.error('Failed to create printability analysis task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useCreateRepairPrintability.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { RepairPrintabilityRequest, TaskCreateResponse } from '@lib/meshy-types';

export function useCreateRepairPrintability() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: RepairPrintabilityRequest) => {
      return await invoke<TaskCreateResponse>('create_repair_printability', { body });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to create printability repair task:', error);
    },

    retry: 0,
  });
}
```

### 2.2 API Key Hooks

```typescript
// src/hooks/useSetApiKey.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';

export function useSetApiKey() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (key: string) => {
      return await invoke<void>('set_api_key', { key });
    },

    onSuccess: () => {
      // A newly stored key changes both whether we have a key
      // and what the credit balance reads as.
      qc.invalidateQueries({ queryKey: ['api-key'] });
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      console.error('Failed to store API key:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useValidateApiKey.ts
import { useMutation } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';

// Stateless check — does not touch the stored key or any cache.
// Used by the Settings panel to verify a key before calling useSetApiKey.
export function useValidateApiKey() {
  return useMutation({
    mutationFn: async (key: string) => {
      return await invoke<boolean>('validate_api_key', { key });
    },

    onError: (error) => {
      console.error('Failed to validate API key:', error);
    },

    retry: 0,
  });
}
```

### 2.3 Task & Asset Management Hooks

```typescript
// src/hooks/useDeleteTask.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';

export interface DeleteTaskArgs {
  endpoint: string;
  taskId: string;
}

// Cancels an in-progress task on the Meshy API side (TDD §7.1 `delete_task`).
export function useDeleteTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ endpoint, taskId }: DeleteTaskArgs) => {
      return await invoke<void>('delete_task', { endpoint, taskId });
    },

    onSuccess: (_data, { taskId }) => {
      // Stop any active usePollTask/useStreamTask query for this task.
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },

    onError: (error) => {
      console.error('Failed to cancel task:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useDeleteAsset.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';

// Deletes the local SQLite record and filesystem directory
// (UI/UX §7.4/§8: "deletes SQLite record + filesystem directory").
export function useDeleteAsset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      return await invoke<void>('delete_asset', { assetId });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
    },

    onError: (error) => {
      console.error('Failed to delete asset:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useUpdateTags.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';

export interface UpdateTagsArgs {
  assetId: string;
  tags: string[];
}

export function useUpdateTags() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, tags }: UpdateTagsArgs) => {
      return await invoke<void>('update_tags', { assetId, tags });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
    },

    onError: (error) => {
      console.error('Failed to update tags:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useToggleFavorite.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';

export function useToggleFavorite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      return await invoke<void>('toggle_favorite', { assetId });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
    },

    onError: (error) => {
      console.error('Failed to toggle favorite:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useUpdateNotes.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';

export interface UpdateNotesArgs {
  assetId: string;
  notes: string;
}

export function useUpdateNotes() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, notes }: UpdateNotesArgs) => {
      return await invoke<void>('update_notes', { assetId, notes });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
    },

    onError: (error) => {
      console.error('Failed to update notes:', error);
    },

    retry: 0,
  });
}
```

```typescript
// src/hooks/useRevealInFinder.ts
import { useMutation } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';

// Opens the OS file manager at the given path. Does not change any
// server or local data, so no query invalidation is needed.
export function useRevealInFinder() {
  return useMutation({
    mutationFn: async (path: string) => {
      return await invoke<void>('reveal_in_file_manager', { path });
    },

    onError: (error) => {
      console.error('Failed to reveal file in file manager:', error);
    },

    retry: 0,
  });
}
```

### 2.4 Download Hook

As described in §1.1, this is the "download" pattern referenced by the gap assessment — implemented as a mutation variant of the CSD §8.3 `useCreateTextTo3D` pattern, using the exact command name and invalidation target shown in CSD §8.4's data-flow diagram.

```typescript
// src/hooks/useDownloadAsset.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { DownloadAssetRequest, DownloadAssetResponse } from '@lib/meshy-types';

export function useDownloadAsset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: DownloadAssetRequest) => {
      return await invoke<DownloadAssetResponse>('download_asset', {
        taskId: body.taskId,
        modelUrls: body.modelUrls,
        thumbnailUrl: body.thumbnailUrl,
        textureUrls: body.textureUrls,
      });
    },

    onSuccess: (_data, _variables) => {
      // A new (or updated) asset is now on disk and in SQLite —
      // the gallery must re-fetch. CSD §8.4 data-flow diagram.
      qc.invalidateQueries({ queryKey: ['assets'] });
    },

    onError: (error) => {
      console.error('Failed to download asset:', error);
    },

    retry: 0,
  });
}
```

---

## 3. Query Hooks

```typescript
// src/hooks/useTaskPolling.ts
// ─── Canonical pattern, reproduced verbatim from CSD §8.3 ──────
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { TaskObject } from '@lib/meshy-types';

export function usePollTask(taskId: string | null, endpoint: string) {
  return useQuery({
    queryKey: ['task', taskId],

    queryFn: async () => {
      return await invoke<TaskObject>('poll_task', { endpoint, taskId });
    },

    enabled: taskId !== null,

    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELED') {
        return false;
      }
      return 5000;
    },

    refetchIntervalInBackground: true,
  });
}
```

```typescript
// src/hooks/useCreditBalance.ts
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';

export function useCreditBalance() {
  return useQuery({
    queryKey: ['credit-balance'],

    queryFn: async () => {
      return await invoke<number>('get_credit_balance');
    },

    refetchInterval: 60_000,     // DAT-04: no more frequent than 60s
    refetchOnWindowFocus: true,  // DAT-04: also refetch on window focus

    retry: 1,                    // DAT-07: max 1 retry for queries
  });
}
```

```typescript
// src/hooks/useAssets.ts
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { Asset } from '@lib/meshy-types';

// UI/UX §7.4: this hook maps to TWO commands — get_all_assets when there
// is no active search/tag filter, and search_assets otherwise. The query
// key still uniquely identifies the result set (HOK-09), and the hook
// still calls exactly one command per invocation, per UI/UX §7.4's rule
// that no hook may call multiple commands in sequence.
export function useAssets(search: string = '', tag: string | null = null) {
  return useQuery({
    queryKey: ['assets', search, tag],

    queryFn: async () => {
      const isFiltered = search.trim() !== '' || tag !== null;

      if (isFiltered) {
        return await invoke<Asset[]>('search_assets', { query: search, tag });
      }
      return await invoke<Asset[]>('get_all_assets');
    },

    retry: 1,
  });
}
```

```typescript
// src/hooks/useApiKey.ts
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';

// CTR-03: the frontend must never hold the raw API key. get_api_key
// returns Option<String> from the backend, but this hook's `select`
// narrows that down to a boolean before it is ever exposed to a
// component or written into a Zustand store.
export function useApiKey() {
  return useQuery({
    queryKey: ['api-key'],

    queryFn: async () => {
      return await invoke<string | null>('get_api_key');
    },

    select: (data): boolean => data !== null,

    staleTime: 5 * 60 * 1000,  // rarely changes; explicitly invalidated by useSetApiKey
    retry: 1,
  });
}
```

```typescript
// src/hooks/useAnimationLibrary.ts
import { useQuery } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { AnimationLibraryItem } from '@lib/meshy-types';

export function useAnimationLibrary() {
  return useQuery({
    queryKey: ['animation-library'],

    queryFn: async () => {
      return await invoke<AnimationLibraryItem[]>('fetch_animation_library');
    },

    staleTime: Infinity,  // DAT-06: fetched once, cached indefinitely
    retry: 1,
  });
}
```

---

## 4. Side-Effect / Listener Hooks

```typescript
// src/hooks/useTaskStream.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invoke, onEvent } from '@lib/tauri';
import type { TaskObject } from '@lib/meshy-types';

// DAT-08: SSE is opt-in per task, not default. The caller (a Feature
// component reading useSettingsStore((s) => s.useSseStreaming)) decides
// `enabled`; this hook has no opinion on polling vs. streaming.
//
// Received events are written into the SAME query cache key that
// usePollTask uses (['task', taskId]), so any component reading task
// state via usePollTask sees live updates regardless of which
// transport (polling or SSE) is actually active. Per HOK-10, this
// hook never calls a Zustand store's set() — only QueryClient methods.
export function useStreamTask(
  taskId: string | null,
  endpoint: string,
  enabled: boolean,
) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || taskId === null) {
      return;
    }

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    async function start() {
      unlisten = await onEvent<TaskObject>('task-progress', (data) => {
        qc.setQueryData(['task', taskId], data);
      });

      if (cancelled) {
        return;
      }

      try {
        await invoke<void>('stream_task', { endpoint, taskId });
      } catch (error) {
        console.error('Failed to start task stream:', error);
      }
    }

    void start();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [enabled, taskId, endpoint, qc]);
}
```

---

*End of Hook Implementations — MeshyForge v1.0.0*
