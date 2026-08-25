// src/hooks/useUpdateNotes.ts
// Source: hook_implementations.md §2.3

import { invoke } from '@lib/tauri';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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

    retry: 0,
  });
}
