import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AssetPage, AssetRow } from '@lib/meshy-types';

import { GALLERY_PAGE_SIZE, useAssets, useInfiniteAssets } from './useAssets';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@lib/tauri';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return { Wrapper, qc };
}

function makeAsset(id: string): AssetRow {
  return {
    id,
    taskType: 'text-to-3d-preview',
    status: 'SUCCEEDED',
    progress: 100,
    consumedCredits: 25,
    prompt: `model ${id}`,
    thumbnailPath: `/assets/${id}.png`,
    filePaths: {},
    texturePaths: [],
    notes: '',
    tags: [],
    createdAt: 1000,
    startedAt: 1100,
    finishedAt: 1200,
    downloadedAt: 1300,
    hasTextures: false,
    hasRig: false,
    hasAnimation: false,
    favorite: false,
    lastViewedAt: 0,
  };
}

function makePage(ids: string[], total: number, offset = 0): AssetPage {
  return {
    assets: ids.map(makeAsset),
    total,
    limit: GALLERY_PAGE_SIZE,
    offset,
  };
}

describe('useInfiniteAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests the first page through list_assets_page with the page size', async () => {
    vi.mocked(invoke).mockResolvedValue(makePage(['a', 'b'], 2));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useInfiniteAssets(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('list_assets_page', {
      limit: GALLERY_PAGE_SIZE,
      offset: 0,
    });
    expect(result.current.data?.pages[0]?.assets).toHaveLength(2);
  });

  it('uses search_assets_page when a query is provided', async () => {
    vi.mocked(invoke).mockResolvedValue(makePage(['a'], 1));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useInfiniteAssets('dragon'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('search_assets_page', {
      query: 'dragon',
      tag: undefined,
      limit: GALLERY_PAGE_SIZE,
      offset: 0,
    });
  });

  it('uses search_assets_page when only a tag is provided', async () => {
    vi.mocked(invoke).mockResolvedValue(makePage(['a'], 1));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useInfiniteAssets('', 'fantasy'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('search_assets_page', {
      query: '',
      tag: 'fantasy',
      limit: GALLERY_PAGE_SIZE,
      offset: 0,
    });
  });

  it('treats a whitespace-only query as unfiltered', async () => {
    vi.mocked(invoke).mockResolvedValue(makePage(['a'], 1));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useInfiniteAssets('   '), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('list_assets_page', {
      limit: GALLERY_PAGE_SIZE,
      offset: 0,
    });
  });

  it('reports no next page when the first page holds the whole match set', async () => {
    vi.mocked(invoke).mockResolvedValue(makePage(['a', 'b'], 2));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useInfiniteAssets(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('reports a next page from the backend total even when the page is exactly full', async () => {
    // The decisive case for using `total` rather than `returned < limit`: with
    // a full first page, a short-page heuristic would end paging early and
    // hide every asset beyond it.
    vi.mocked(invoke).mockResolvedValue(makePage(['a', 'b'], 4));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useInfiniteAssets(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
  });

  it('fetches the next window by offset and appends it', async () => {
    // Key the mock off the requested offset rather than call ordering: a
    // sequence mock silently breaks if React Query re-invokes queryFn.
    vi.mocked(invoke).mockImplementation(
      async (_command: string, args?: Record<string, unknown>) => {
        const offset = (args?.offset as number | undefined) ?? 0;
        return offset === 0 ? makePage(['a', 'b'], 3) : makePage(['c'], 3, offset);
      },
    );
    const { Wrapper, qc } = createWrapper();
    const { result, rerender } = renderHook(() => useInfiniteAssets(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await result.current.fetchNextPage();

    // Assert on the accumulated CACHE first, then read the hook after an
    // explicit re-render. React Query appends the page to the cache and
    // notifies its observer, but in this jsdom setup the observer's snapshot
    // is not re-flushed by `waitFor`/`act` alone — waiting on the hook's
    // `data.pages` here times out even though the fetch completed and the
    // cache holds both pages. Waiting on the cache avoids coupling this test
    // to that flush quirk while still asserting the real behavior.
    await waitFor(() =>
      expect(
        qc.getQueryData<{ pages: unknown[] }>(['assets', 'page', '', null])?.pages,
      ).toHaveLength(2),
    );
    rerender();

    // Offset advanced by rows actually loaded (2), not by a page-size guess.
    expect(invoke).toHaveBeenLastCalledWith('list_assets_page', {
      limit: GALLERY_PAGE_SIZE,
      offset: 2,
    });
    expect(result.current.data?.pages).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('useAssets (unpaged)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests every asset by omitting limit and offset', async () => {
    // Consumers of this hook filter client-side (task picker, detail view,
    // generate panels), so a page-limited response would silently hide
    // eligible assets. Omitting both params selects the backend's unpaged mode.
    vi.mocked(invoke).mockResolvedValue(makePage(['a', 'b', 'c'], 3));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAssets(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('list_assets_page');
    expect(result.current.data).toHaveLength(3);
  });

  it('does not call the paginated search path', async () => {
    vi.mocked(invoke).mockResolvedValue(makePage(['a'], 1));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAssets(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).not.toHaveBeenCalledWith('search_assets_page', expect.anything());
  });
});
