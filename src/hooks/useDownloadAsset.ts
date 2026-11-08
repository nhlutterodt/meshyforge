// src/hooks/useDownloadAsset.ts
// Source: hook_implementations.md §2.4
//
// ADR-0015 step 3 (TPC-03/TASK-0031): download_asset takes the typed
// role-tagged artifacts; Rust downloads every one of them and returns
// role-keyed local paths (primary keys unchanged, TPC-04).

import type { DownloadAssetRequest, DownloadAssetResponse } from '@lib/meshy-types';
import { invoke } from '@lib/tauri';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchCachedAssets } from './assetQueryKeys';

export function useDownloadAsset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: DownloadAssetRequest) => {
      return await invoke<DownloadAssetResponse>('download_asset', {
        taskId: body.taskId,
        artifacts: body.artifacts,
        thumbnailUrl: body.thumbnailUrl,
        textureUrls: body.textureUrls,
      });
    },

    // P-05: unlike the other field mutations, this one already has the exact
    // new values in its own response — `download_asset` returns the local
    // file paths it just wrote. Using them avoids a refetch entirely, and also
    // avoids the download→invalidate→download race in which a refetch starts
    // before `mark_downloaded` has committed.
    onSuccess: (response, body) => {
      patchCachedAssets(qc, body.taskId, (asset) => ({
        ...asset,
        filePaths: response.filePaths,
        // Conditional spread: `exactOptionalPropertyTypes` forbids assigning
        // `string | undefined` to an optional `string`, and a null response
        // thumbnail means "unchanged", not "clear it".
        ...(response.thumbnailPath !== null ? { thumbnailPath: response.thumbnailPath } : {}),
      }));
    },

    onError: (error) => {
      console.error('Failed to download asset:', error);
    },

    retry: 0,
  });
}
