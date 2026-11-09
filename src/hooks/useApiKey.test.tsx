// useApiKey.test.tsx — hook-level coverage for FRD FR-KEY-01/02
//
// The component-level tests in ApiKeyManager.test.tsx cover the UI states;
// these pin the hook contract itself: existence semantics, trimming, and the
// credit-balance invalidation that must follow a keychain change.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useApiKey } from './useApiKey';

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

describe('useApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockResolvedValue(undefined);
  });

  it('reports key existence from get_api_key without exposing the secret', async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) =>
      cmd === 'get_api_key' ? Promise.resolve(true) : Promise.resolve(undefined),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApiKey(), { wrapper: Wrapper });

    expect(result.current.isChecking).toBe(true);
    await waitFor(() => expect(result.current.hasKey).toBe(true));
    expect(invoke).toHaveBeenCalledWith('get_api_key');
  });

  it('trims the key before validate_api_key and set_api_key', async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) =>
      cmd === 'validate_api_key' ? Promise.resolve(true) : Promise.resolve(undefined),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApiKey(), { wrapper: Wrapper });

    await expect(result.current.validate('  msy_padded\n')).resolves.toBe(true);
    expect(invoke).toHaveBeenCalledWith('validate_api_key', { key: 'msy_padded' });

    await result.current.save('  msy_padded\n');
    expect(invoke).toHaveBeenCalledWith('set_api_key', { key: 'msy_padded' });
  });

  it('seeds existence and invalidates the credit balance after save', async () => {
    const { Wrapper, qc } = createWrapper();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useApiKey(), { wrapper: Wrapper });

    await result.current.save('msy_new');

    await waitFor(() => expect(qc.getQueryData(['api-key'])).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['credit-balance'] });
  });

  it('clears existence and invalidates the credit balance after remove', async () => {
    const { Wrapper, qc } = createWrapper();
    qc.setQueryData(['api-key'], true);
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const { result } = renderHook(() => useApiKey(), { wrapper: Wrapper });

    await result.current.remove();

    await waitFor(() => expect(qc.getQueryData(['api-key'])).toBe(false));
    expect(invoke).toHaveBeenCalledWith('delete_api_key');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['credit-balance'] });
  });

  it('rejects when validation fails so callers can show the invalid state', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('API_ERROR_401'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApiKey(), { wrapper: Wrapper });

    await expect(result.current.validate('msy_bad')).rejects.toThrow();
  });
});
