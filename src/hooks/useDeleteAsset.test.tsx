import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeleteAsset } from './useDeleteAsset';

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

  it('invalidates the assets query on success', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const { Wrapper, qc } = createWrapper();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteAsset(), { wrapper: Wrapper });

    result.current.mutate('asset-456');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('delete_asset', { assetId: 'asset-456' });
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
