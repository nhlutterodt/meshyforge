import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useToggleFavorite } from './useToggleFavorite';

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

describe('useToggleFavorite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls toggle_favorite with the given assetId', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useToggleFavorite(), { wrapper: Wrapper });

    result.current.mutate('asset-001');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('toggle_favorite', { assetId: 'asset-001' });
  });

  it('does not retry on failure', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('DB error'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useToggleFavorite(), { wrapper: Wrapper });

    result.current.mutate('asset-002');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.failureCount).toBe(1);
  });
});