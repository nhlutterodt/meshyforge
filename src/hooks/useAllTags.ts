// src/hooks/useAllTags.ts
// Fetches all unique tags from the database for the TagFilter dropdown.

import type { AssetRow } from '@lib/meshy-types';
import { invoke } from '@lib/tauri';
import { useQuery } from '@tanstack/react-query';

export function useAllTags() {
  return useQuery({
    queryKey: ['all-tags'],
    queryFn: async () => {
      const assets = await invoke<AssetRow[]>('get_all_assets');
      const tagSet = new Set<string>();
      for (const asset of assets) {
        // tags cross IPC as a parsed array (finding F2) — no re-parsing.
        for (const tag of asset.tags) {
          tagSet.add(tag);
        }
      }
      return Array.from(tagSet).sort();
    },
    staleTime: 10_000,
    retry: 1,
  });
}
