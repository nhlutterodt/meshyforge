// src/hooks/useAssets.ts
// Source: hook_implementations.md §3

import type { AssetRow } from '@lib/meshy-types';
import { invoke } from '@lib/tauri';
import { useQuery } from '@tanstack/react-query';

export function useAssets(search = '', tag: string | null = null) {
  return useQuery({
    queryKey: ['assets', search, tag],

    queryFn: async () => {
      const isFiltered = search.trim() !== '' || tag !== null;

      if (isFiltered) {
        return await invoke<AssetRow[]>('search_assets', {
          query: search,
          tag: tag ?? undefined,
        });
      }
      return await invoke<AssetRow[]>('get_all_assets');
    },

    retry: 1,
  });
}
