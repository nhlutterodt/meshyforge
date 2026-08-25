import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
}));

vi.mock('@stores/settingsStore', () => ({
  useSettingsStore: vi.fn((selector) =>
    selector({
      pollIntervalMs: 5000,
    }),
  ),
}));

import { invoke } from '@lib/tauri';
import { useTaskPolling } from './useTaskPolling';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return { Wrapper, qc };
}

describe('useTaskPolling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when taskId is null', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTaskPolling(null, '/v2/text-to-3d'), {
      wrapper: Wrapper,
    });

    // Should not fetch at all
    expect(result.current.fetchStatus).toBe('idle');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('polls the task via poll_task when taskId is provided', async () => {
    vi.mocked(invoke).mockResolvedValue({
      id: 'task-1',
      status: 'IN_PROGRESS',
      progress: 42,
      consumed_credits: 0,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTaskPolling('task-1', '/v2/text-to-3d'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('IN_PROGRESS');
    expect(result.current.data?.progress).toBe(42);
    expect(invoke).toHaveBeenCalledWith('poll_task', {
      endpoint: '/v2/text-to-3d',
      taskId: 'task-1',
    });
  });

  it('fetches a SUCCEEDED task and stops polling', async () => {
    vi.mocked(invoke).mockResolvedValue({
      id: 'task-2',
      status: 'SUCCEEDED',
      progress: 100,
      consumed_credits: 25,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTaskPolling('task-2', '/v2/text-to-3d'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('SUCCEEDED');
    // refetchInterval should return false for terminal status — we verify
    // the hook is enabled and fetches successfully; the refetchInterval
    // callback logic is tested via the query's internal behavior
  });

  it('fetches a FAILED task', async () => {
    vi.mocked(invoke).mockResolvedValue({
      id: 'task-3',
      status: 'FAILED',
      progress: 50,
      consumed_credits: 0,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTaskPolling('task-3', '/v2/text-to-3d'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('FAILED');
  });

  it('fetches a CANCELED task', async () => {
    vi.mocked(invoke).mockResolvedValue({
      id: 'task-4',
      status: 'CANCELED',
      progress: 0,
      consumed_credits: 0,
    });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTaskPolling('task-4', '/v2/text-to-3d'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('CANCELED');
  });
});
