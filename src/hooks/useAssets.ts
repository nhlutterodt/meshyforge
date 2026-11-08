// src/hooks/useAssets.ts
// Source: hook_implementations.md §3, UI/UX DAT-01
//
// Gallery assets load in pages of `gallery_page_size` (50) rather than the
// whole table (DAT-01). The query key includes the filter but NOT the offset:
// TanStack's `pageParam` distinguishes pages within one infinite query, so a
// cached page set is reused when the user returns to the same filter.
//
// `useInfiniteAssets` is the gallery's hook. `useAssets` remains for consumers
// that need the FULL asset set — the task picker, the asset detail view, and
// the generate panels all filter/sort client-side and would silently hide
// eligible assets if handed only the first page. It requests the backend's
// unpaged mode explicitly (no limit/offset) and returns every row in one call.

import type { AssetPage, AssetRow } from '@lib/meshy-types';
import { invoke } from '@lib/tauri';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

/** Catalog page size (TDD §16.1 `gallery_page_size`). The backend applies the
 * same default; this is what the gallery requests, not a second source of
 * truth — `getNextPageParam` trusts the count the backend reports. */
export const GALLERY_PAGE_SIZE = 50;

/**
 * One page at a time, with `fetchNextPage` driving a "Load More" affordance.
 *
 * `hasNextPage` is derived from the backend's total match count rather than a
 * short page, because the final page is usually exactly full and
 * `returned < limit` would then wrongly report the end.
 */
export function useInfiniteAssets(search = '', tag: string | null = null) {
  const trimmedSearch = search.trim();
  const isFiltered = trimmedSearch !== '' || tag !== null;

  return useInfiniteQuery({
    queryKey: ['assets', 'page', trimmedSearch, tag],
    initialPageParam: 0,

    queryFn: async ({ pageParam }) => {
      if (isFiltered) {
        return await invoke<AssetPage>('search_assets_page', {
          query: trimmedSearch,
          tag: tag ?? undefined,
          limit: GALLERY_PAGE_SIZE,
          offset: pageParam,
        });
      }
      return await invoke<AssetPage>('list_assets_page', {
        limit: GALLERY_PAGE_SIZE,
        offset: pageParam,
      });
    },

    // Advance by how many rows have actually arrived rather than by the page
    // size constant: if the constant and the backend's applied limit ever
    // disagree, stepping by the constant would skip or re-read a window.
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((total, page) => total + page.assets.length, 0);
      if (loaded >= lastPage.total) return undefined;
      return loaded;
    },

    retry: 1,
  });
}

/**
 * Every asset, unpaged. For consumers that need the complete set.
 *
 * Deliberately not the gallery's hook (see the module comment). Unabbreviated
 * via the backend's explicit unpaged mode rather than looping pages, so the
 * whole table still crosses IPC in a single call — a loop would issue N
 * sequential round trips for data the caller analyses at once.
 */
export function useAssets() {
  return useQuery({
    queryKey: ['assets', 'all'],

    queryFn: async () => {
      const page = await invoke<AssetPage>('list_assets_page');
      return page.assets;
    },

    retry: 1,
  });
}

/** Exported for callers that want the row type without the types module. */
export type { AssetRow };
