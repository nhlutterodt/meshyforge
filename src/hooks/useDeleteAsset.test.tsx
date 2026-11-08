import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AssetRow } from '@lib/meshy-types';
import { useDeleteAsset } from './useDeleteAsset';

/** Minimal asset row — only the fields the patch touches matter here. */
function makeAsset(id: string): AssetRow {
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
  };
}

// Mock the Tauri invoke wrapper
vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@lib/tauri';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return { Wrapper, qc };
}

describe('useDeleteAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls delete_asset with the given assetId', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteAsset(), {
      wrapper: Wrapper,
    });

    result.current.mutate('asset-123');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('delete_asset', { assetId: 'asset-123' });
  });

  it('removes the asset from cached pages and invalidates the lists', async () => {
    // P-05: a delete changes list membership, so it patches the row out of the
    // already-loaded pages (so the card disappears immediately) AND invalidates
    // the lists (so pagination is re-derived from the backend).
    vi.mocked(invoke).mockResolvedValue(undefined);
    const { Wrapper, qc } = createWrapper();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    const kept = makeAsset('asset-keep');
    const doomed = makeAsset('asset-456');
    qc.setQueryData(['assets', 'all'], [kept, doomed]);

    const { result } = renderHook(() => useDeleteAsset(), { wrapper: Wrapper });

    result.current.mutate('asset-456');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('delete_asset', { assetId: 'asset-456' });

    // The deleted row is gone from the cache, the other survives.
    const cached = qc.getQueryData<AssetRow[]>(['assets', 'all']);
    expect(cached?.map((a) => a.id)).toEqual(['asset-keep']);

    // And the lists are invalidated, so the deleted row cannot reappear when
    // the refetch resolves.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['assets'] });
  });

  it('does not retry on failure', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('Network error'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteAsset(), { wrapper: Wrapper });

    result.current.mutate('asset-789');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.failureCount).toBe(1);
  });
});
