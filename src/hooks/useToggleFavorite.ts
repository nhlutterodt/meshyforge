// src/hooks/useToggleFavorite.ts
// Source: hook_implementations.md §2.3

import { invoke } from '@lib/tauri';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useToggleFavorite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (assetId: string) => {
      return await invoke<void>('toggle_favorite', { assetId });
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] });
    },

    retry: 0,
  });
}
