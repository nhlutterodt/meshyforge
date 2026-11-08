// src/hooks/useDownloadAsset.ts
// Source: hook_implementations.md §2.4
//
// ADR-0015 step 3 (TPC-03/TASK-0031): download_asset takes the typed
// role-tagged artifacts; Rust downloads every one of them and returns
// role-keyed local paths (primary keys unchanged, TPC-04).

import type { DownloadAssetRequest, DownloadAssetResponse } from '@lib/meshy-types';
import { invoke } from '@lib/tauri';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
    },

    onError: (error) => {
      console.error('Failed to download asset:', error);
    },

    retry: 0,
  });
}
