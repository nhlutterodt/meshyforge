import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreditBalance } from './useCreditBalance';

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

describe('useCreditBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the credit balance via get_credit_balance', async () => {
    vi.mocked(invoke).mockResolvedValue(500);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreditBalance(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(500);
    expect(invoke).toHaveBeenCalledWith('get_credit_balance');
  });

  it('returns zero credits when the API returns 0', async () => {
    vi.mocked(invoke).mockResolvedValue(0);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreditBalance(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(0);
  });

  it('retries once on failure (retry: 1)', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('Network error'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreditBalance(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    // Should have been called at least twice (initial + 1 retry)
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
