// src/hooks/useUpdateTags.ts
// Source: hook_implementations.md §2.3

import { invoke } from '@lib/tauri';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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

    retry: 0,
  });
}
