// src/hooks/assetQueryKeys.ts
//
// The one place that knows the shape of the asset query-key family.
//
// Why this exists (findings P-05): seven mutation sites called
// `invalidateQueries({ queryKey: ['assets'] })`. TanStack matches a query key
// by PREFIX, so that single call targeted `['assets', 'all']` *and* every
// `['assets', 'page', search, tag]` entry. Before DAT-01 pagination there was
// one asset query, so invalidation cost one refetch; after it, a mutation
// refetched every page the user had loaded. Favouriting an asset on page 3 of
// 5 turned into five sequential round trips, and `staleTime` does not help
// because `invalidateQueries` forces the refetch regardless.
//
// Two distinct operations, deliberately separated:
//
//   invalidateAssetLists  — "the membership/order of every list may have
//                           changed" (a delete, or a newly saved task). Until
//                           the list queries are paginated they still answer
//                           from one query per filter, so this stays cheap.
//
//   patchCachedAssets     — "an existing row's fields changed" (favourite,
//                           notes, tags, a completed download). This does NOT
//                           invalidate anything: it writes the known delta into
//                           the rows already in cache, so an infinite query
//                           keeps its loaded pages instead of refetching them.
//                           A refetch here would also be worse than a patch:
//                           re-fetching page 1 of a paginated list re-derives
//                           every page from the server, and offset paging is
//                           shift-prone, so a pure refetch can visibly
//                           reshuffle the grid for an edit that changed one
//                           field.

import type { AssetPage, AssetRow } from '@lib/meshy-types';
import type { QueryClient } from '@tanstack/react-query';

/** Every asset-list query, paginated or not. */
export const ASSET_LISTS_KEY = ['assets'] as const;

/** The unpaged, "give me every asset" query (`useAssets`). */
export const ALL_ASSETS_KEY = ['assets', 'all'] as const;

/** The paginated gallery query (`useInfiniteAssets`), keyed by filter. */
export const ASSET_PAGES_KEY = ['assets', 'page'] as const;

/** The tag dropdown (`useAllTags`). */
export const ALL_TAGS_KEY = ['all-tags'] as const;

/**
 * Apply `patch` to one asset in every cache entry that holds asset rows, and
 * to the tag list if the change affected tags.
 *
 * Returns the number of cache entries that were updated, which makes the
 * "did this match anything" question testable — a silently non-matching key is
 * exactly the failure mode this helper exists to prevent.
 *
 * `patch` may return `null` to mean "remove this row" (a delete).
 */
export function patchCachedAssets(
  qc: QueryClient,
  assetId: string,
  patch: (asset: AssetRow) => AssetRow | null,
): number {
  let touched = 0;

  const applyToRows = (rows: AssetRow[]): AssetRow[] =>
    rows
      .map((row) => (row.id === assetId ? patch(row) : row))
      .filter((row): row is AssetRow => row !== null);

  // Iterate the cache by PREFIX rather than reading a fixed key.
  //
  // This is load-bearing, not stylistic: `queryClient.getQueryData(key)` looks
  // up by the exact serialized `queryHash`, so `getQueryData(['assets','page'])`
  // can never find `['assets','page','',null]`. Reading a fixed key here made
  // the paginated branch a silent no-op — the cache kept its old rows and the
  // UI simply showed stale data, with no error to notice. Found by the
  // paginated cases in assetQueryKeys.test.ts.
  //
  // Iterating also covers every filter's page set at once (the gallery keeps
  // one infinite query per search/tag combination), and patches the same row on
  // every loaded page — a row can legitimately appear on two pages, because
  // offset paging shifts when rows are inserted.
  for (const query of qc.getQueryCache().findAll({ queryKey: ASSET_LISTS_KEY })) {
    const data = query.state.data;

    if (isInfiniteAssetData(data)) {
      // Preserve `pages`/`pageParams` so the gallery neither refetches nor
      // loses how far the user has scrolled.
      qc.setQueryData(query.queryKey, {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          assets: applyToRows(page.assets),
        })),
      });
      touched += 1;
    } else if (Array.isArray(data)) {
      qc.setQueryData(query.queryKey, applyToRows(data as AssetRow[]));
      touched += 1;
    }
  }

  return touched;
}

/** An `InfiniteData<AssetPage>` envelope, i.e. `{ pages: [{ assets }] }`. */
function isInfiniteAssetData(data: unknown): data is { pages: AssetPage[]; pageParams: unknown[] } {
  if (typeof data !== 'object' || data === null) return false;
  const pages = (data as { pages?: unknown }).pages;
  return (
    Array.isArray(pages) &&
    pages.every(
      (page) =>
        typeof page === 'object' && page !== null && Array.isArray((page as AssetPage).assets),
    )
  );
}

/**
 * Signal that every asset list may have changed membership or order.
 *
 * A delete genuinely changes which rows belong on which page, and there is no
 * client-computable delta for that without re-deriving the pagination, so this
 * is a real invalidation rather than a patch. Prefix-matched by TanStack's
 * default partial-key semantics, so it covers `['assets', 'all']` and every
 * `['assets', 'page', …]` entry.
 */
export function invalidateAssetLists(qc: QueryClient): Promise<void> {
  return qc.invalidateQueries({ queryKey: ASSET_LISTS_KEY });
}

/**
 * The tag dropdown depends on the union of tags across ALL assets, so any tag
 * edit invalidates it. Previously nothing did — `useUpdateTags` invalidated
 * only `['assets']`, so `all-tags` went stale and the filter offered the
 * pre-edit tag set until the component remounted.
 */
export function invalidateAllTags(qc: QueryClient): Promise<void> {
  return qc.invalidateQueries({ queryKey: ALL_TAGS_KEY });
}
