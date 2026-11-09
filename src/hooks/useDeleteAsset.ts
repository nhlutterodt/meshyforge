// src/hooks/useDeleteAsset.ts
// Source: hook_implementations.md §2.3

import { invoke } from '@lib/tauri';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateAllTags, invalidateAssetLists, patchCachedAssets } from './assetQueryKeys';

export function useDeleteAsset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      return await invoke<void>('delete_asset', { assetId });
    },

    // P-05: a delete DOES change list membership, so unlike the field edits it
    // cannot be expressed as a patch of one row — the pagination has to be
    // re-derived, hence BOTH steps. Patch first so the card disappears
    // immediately rather than lingering until a refetch resolves; without the
    // invalidation the patched-out row would come back when the stale cache
    // entry was next fetched.
    onSuccess: (_data, assetId) => {
      patchCachedAssets(qc, assetId, () => null);
      void invalidateAssetLists(qc);
      void invalidateAllTags(qc);
    },

    retry: 0,
  });
}
