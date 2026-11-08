// src/hooks/useUpdateTags.ts
// Source: hook_implementations.md §2.3

import { invoke } from '@lib/tauri';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateAllTags, patchCachedAssets } from './assetQueryKeys';

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

    // P-05: the asset rows are patched, not refetched. The tag dropdown is a
    // separate query derived from the union of all assets' tags, so it DOES
    // need invalidating — previously nothing did, leaving the filter stale.
    onSuccess: (_data, { assetId, tags }) => {
      patchCachedAssets(qc, assetId, (asset) => ({ ...asset, tags }));
      void invalidateAllTags(qc);
    },

    retry: 0,
  });
}
