import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUpdateNotes } from './useUpdateNotes';

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

describe('useUpdateNotes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls update_notes with assetId and notes', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateNotes(), { wrapper: Wrapper });

    result.current.mutate({ assetId: 'asset-1', notes: 'A dragon model' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('update_notes', {
      assetId: 'asset-1',
      notes: 'A dragon model',
    });
  });

  it('handles empty notes string', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateNotes(), { wrapper: Wrapper });

    result.current.mutate({ assetId: 'asset-2', notes: '' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('update_notes', {
      assetId: 'asset-2',
      notes: '',
    });
  });

  it('does not retry on failure', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('DB write error'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateNotes(), { wrapper: Wrapper });

    result.current.mutate({ assetId: 'asset-3', notes: 'test' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.failureCount).toBe(1);
  });
});