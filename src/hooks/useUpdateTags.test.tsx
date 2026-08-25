import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUpdateTags } from './useUpdateTags';

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

describe('useUpdateTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls update_tags with assetId and tags array', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateTags(), { wrapper: Wrapper });

    result.current.mutate({ assetId: 'asset-1', tags: ['monster', 'fantasy'] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('update_tags', {
      assetId: 'asset-1',
      tags: ['monster', 'fantasy'],
    });
  });

  it('handles an empty tags array (clearing all tags)', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateTags(), { wrapper: Wrapper });

    result.current.mutate({ assetId: 'asset-2', tags: [] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('update_tags', {
      assetId: 'asset-2',
      tags: [],
    });
  });

  it('does not retry on failure', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('DB error'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateTags(), { wrapper: Wrapper });

    result.current.mutate({ assetId: 'asset-3', tags: ['tag'] });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.failureCount).toBe(1);
  });
});