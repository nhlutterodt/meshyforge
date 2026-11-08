// src/hooks/useUpdateNotes.ts
// Source: hook_implementations.md §2.3

import { invoke } from '@lib/tauri';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchCachedAssets } from './assetQueryKeys';

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

    // P-05: patch the single changed field instead of refetching every loaded
    // page of the gallery for an edit that cannot affect list membership.
    onSuccess: (_data, { assetId, notes }) => {
      patchCachedAssets(qc, assetId, (asset) => ({ ...asset, notes }));
    },

    retry: 0,
  });
}
