// Tests for the asset cache-patch helpers (findings P-05).
//
// The failure mode these guard against is subtle: a query-key typo or a
// mis-shaped patch makes the helper a silent no-op, and the UI then simply
// shows stale data — no error, no failing call. So the assertions here are
// about the cache CONTENTS changing, not about a method being called.

import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';

import type { AssetPage, AssetRow } from '@lib/meshy-types';

import { ALL_ASSETS_KEY, ALL_TAGS_KEY, patchCachedAssets } from './assetQueryKeys';

function makeAsset(id: string, overrides: Partial<AssetRow> = {}): AssetRow {
  return {
    id,
    taskType: 'text-to-3d-preview',
    status: 'SUCCEEDED',
    progress: 100,
    consumedCredits: 5,
    prompt: `model ${id}`,
    filePaths: {},
    texturePaths: [],
    notes: '',
    tags: [],
    createdAt: 1000,
    startedAt: 0,
    finishedAt: 0,
    downloadedAt: 0,
    hasTextures: false,
    hasRig: false,
    hasAnimation: false,
    favorite: false,
    lastViewedAt: 0,
    ...overrides,
  };
}

function makeInfinite(pages: AssetRow[][]) {
  return {
    pages: pages.map(
      (assets, index): AssetPage => ({
        assets,
        total: pages.flat().length,
        limit: 50,
        offset: index * 50,
      }),
    ),
    pageParams: pages.map((_, index) => index * 50),
  };
}

describe('patchCachedAssets', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('patches a row in the unpaged list', () => {
    qc.setQueryData<AssetRow[]>(ALL_ASSETS_KEY, [makeAsset('a'), makeAsset('b')]);

    const touched = patchCachedAssets(qc, 'a', (asset) => ({ ...asset, favorite: true }));

    expect(touched).toBe(1);
    const after = qc.getQueryData<AssetRow[]>(ALL_ASSETS_KEY);
    expect(after?.[0]?.favorite).toBe(true);
    expect(after?.[1]?.favorite).toBe(false);
  });

  it('patches a row inside a paginated infinite query without disturbing pagination', () => {
    // The whole point of P-05: an edit must not force the pages to refetch.
    // `getQueryState().fetchStatus` staying idle plus `pageParams` being
    // preserved is what proves no refetch was triggered and no scroll position
    // was lost.
    const key = ['assets', 'page', '', null];
    qc.setQueryData(key, makeInfinite([[makeAsset('a'), makeAsset('b')], [makeAsset('c')]]));

    patchCachedAssets(qc, 'c', (asset) => ({ ...asset, notes: 'edited' }));

    const after = qc.getQueryData<ReturnType<typeof makeInfinite>>(key);
    expect(after?.pages).toHaveLength(2);
    expect(after?.pageParams).toEqual([0, 50]);
    expect(after?.pages[1]?.assets[0]?.notes).toBe('edited');
    expect(after?.pages[0]?.assets[0]?.notes).toBe('');
  });

  it('removes a row when the patch returns null', () => {
    qc.setQueryData<AssetRow[]>(ALL_ASSETS_KEY, [makeAsset('a'), makeAsset('b')]);

    patchCachedAssets(qc, 'a', () => null);

    const after = qc.getQueryData<AssetRow[]>(ALL_ASSETS_KEY);
    expect(after?.map((asset) => asset.id)).toEqual(['b']);
  });

  it('removes a row from a paginated page too', () => {
    const key = ['assets', 'page', '', null];
    qc.setQueryData(key, makeInfinite([[makeAsset('a'), makeAsset('b')]]));

    patchCachedAssets(qc, 'a', () => null);

    const after = qc.getQueryData<ReturnType<typeof makeInfinite>>(key);
    expect(after?.pages[0]?.assets.map((asset) => asset.id)).toEqual(['b']);
  });

  it('patches the same asset across every loaded page in one pass', () => {
    const key = ['assets', 'page', '', null];
    // The same row can legitimately appear on two pages: offset paging is
    // shift-prone, and how far the user scrolled decides what is loaded.
    qc.setQueryData(
      key,
      makeInfinite([
        [makeAsset('dup'), makeAsset('x')],
        [makeAsset('dup'), makeAsset('y')],
      ]),
    );

    const touched = patchCachedAssets(qc, 'dup', (asset) => ({ ...asset, favorite: true }));

    expect(touched).toBe(1);
    const after = qc.getQueryData<ReturnType<typeof makeInfinite>>(key);
    expect(after?.pages[0]?.assets[0]?.favorite).toBe(true);
    expect(after?.pages[1]?.assets[0]?.favorite).toBe(true);
  });

  it('reports zero when nothing in the cache matches the asset', () => {
    // The signal that would have caught a key typo. An empty cache and an
    // unmatched id both correctly yield 0, which is why callers must not treat
    // `touched === 0` as an error.
    qc.setQueryData<AssetRow[]>(ALL_ASSETS_KEY, [makeAsset('a')]);
    expect(patchCachedAssets(qc, 'missing', (asset) => asset)).toBe(1);

    const empty = new QueryClient();
    expect(patchCachedAssets(empty, 'missing', (asset) => asset)).toBe(0);
  });

  it('does not touch unrelated queries', () => {
    qc.setQueryData<AssetRow[]>(ALL_ASSETS_KEY, [makeAsset('a')]);
    qc.setQueryData(['credit-balance'], 500);
    qc.setQueryData(ALL_TAGS_KEY, ['fantasy']);

    patchCachedAssets(qc, 'a', (asset) => ({ ...asset, favorite: true }));

    expect(qc.getQueryData(['credit-balance'])).toBe(500);
    expect(qc.getQueryData(ALL_TAGS_KEY)).toEqual(['fantasy']);
  });

  it('leaves a future unpaged sibling list patched without being named explicitly', () => {
    // Prefix coverage: a new `['assets', 'filtered']` array query should be
    // maintained without editing every mutation site.
    const sibling = ['assets', 'filtered'];
    qc.setQueryData<AssetRow[]>(sibling, [makeAsset('a'), makeAsset('b')]);

    patchCachedAssets(qc, 'b', (asset) => ({ ...asset, favorite: true }));

    const after = qc.getQueryData<AssetRow[]>(sibling);
    expect(after?.[1]?.favorite).toBe(true);
  });
});
