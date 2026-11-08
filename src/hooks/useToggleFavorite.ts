// src/hooks/useToggleFavorite.ts
// Source: hook_implementations.md §2.3

import { invoke } from '@lib/tauri';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchCachedAssets } from './assetQueryKeys';

export function useToggleFavorite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      return await invoke<void>('toggle_favorite', { assetId });
    },

    // P-05: this used to invalidate `['assets']`, which prefix-matches every
    // loaded page and refetched them all to change one boolean. The mutation
    // toggles a known field of a known row, so patch it in place.
    onSuccess: (_data, assetId) => {
      patchCachedAssets(qc, assetId, (asset) => ({ ...asset, favorite: !asset.favorite }));
    },

    retry: 0,
  });
}
