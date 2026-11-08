// useRecovery.test.tsx — hook-level coverage for the recovery IPC surface

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRecovery, useRecoveryRestore } from './useRecovery';

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

const NORMAL = {
  state: 'Normal' as const,
  backupIds: [],
  quarantineExists: false,
  failureCode: null,
};

describe('useRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null status until recovery_status resolves', async () => {
    vi.mocked(invoke).mockResolvedValue(NORMAL);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRecovery(), { wrapper: Wrapper });

    expect(result.current.status).toBeNull();
    await waitFor(() => expect(result.current.status).toEqual(NORMAL));
    expect(invoke).toHaveBeenCalledWith('recovery_status');
  });

  it('falls back to the Normal state when the status read fails', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('RECOVERY_DIRECTORY_UNAVAILABLE'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRecovery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.status).not.toBeNull());
    expect(result.current.status?.state).toBe('Normal');
    expect(result.current.isError).toBe(true);
  });

  it('surfaces a RecoveryRequired status unchanged', async () => {
    vi.mocked(invoke).mockResolvedValue({
      state: 'RecoveryRequired',
      backupIds: ['backup-1.db'],
      quarantineExists: true,
      failureCode: null,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRecovery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.status?.state).toBe('RecoveryRequired'));
    expect(result.current.status?.backupIds).toEqual(['backup-1.db']);
  });

  it('requests the restore for the selected backup id', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRecoveryRestore(), { wrapper: Wrapper });

    await result.current.mutateAsync('backup-2.db');
    expect(invoke).toHaveBeenCalledWith('request_recovery_restore', { backupId: 'backup-2.db' });
  });
});
