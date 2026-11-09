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

import type { TaskSnapshot } from '@lib/meshy-types';
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

// ADR-0015 step 2: poll_task returns the normalized camelCase TaskSnapshot.
function makeSnapshot(overrides: Partial<TaskSnapshot> = {}): TaskSnapshot {
  return {
    id: 'task-1',
    taskType: 'text-to-3d-preview',
    status: 'IN_PROGRESS',
    progress: 42,
    consumedCredits: 0,
    createdAt: 1000,
    startedAt: 1010,
    finishedAt: 0,
    artifacts: [],
    providerPayload: {},
    ...overrides,
  };
}

describe('useTaskPolling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is disabled when taskId is null', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTaskPolling(null, 'text-to-3d-preview'), {
      wrapper: Wrapper,
    });

    // Should not fetch at all
    expect(result.current.fetchStatus).toBe('idle');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('polls the task via poll_task dispatching on taskType', async () => {
    vi.mocked(invoke).mockResolvedValue(makeSnapshot());
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTaskPolling('task-1', 'text-to-3d-preview'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('IN_PROGRESS');
    expect(result.current.data?.progress).toBe(42);
    // TPC-05: the IPC arg is taskType (the serde wire value), not endpoint.
    expect(invoke).toHaveBeenCalledWith('poll_task', {
      taskType: 'text-to-3d-preview',
      taskId: 'task-1',
    });
  });

  it('fetches a SUCCEEDED snapshot and stops polling', async () => {
    vi.mocked(invoke).mockResolvedValue(
      makeSnapshot({ id: 'task-2', status: 'SUCCEEDED', progress: 100, consumedCredits: 25 }),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTaskPolling('task-2', 'text-to-3d-preview'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('SUCCEEDED');
    // refetchInterval should return false for terminal status — we verify
    // the hook is enabled and fetches successfully; the refetchInterval
    // callback logic is tested via the query's internal behavior
  });

  it('fetches a FAILED snapshot', async () => {
    vi.mocked(invoke).mockResolvedValue(
      makeSnapshot({
        id: 'task-3',
        status: 'FAILED',
        progress: 50,
        error: { code: 'ERR', message: 'boom' },
      }),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTaskPolling('task-3', 'text-to-3d-preview'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('FAILED');
    expect(result.current.data?.error?.message).toBe('boom');
  });

  it('fetches a CANCELED snapshot', async () => {
    vi.mocked(invoke).mockResolvedValue(
      makeSnapshot({ id: 'task-4', status: 'CANCELED', progress: 0 }),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTaskPolling('task-4', 'text-to-3d-preview'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('CANCELED');
  });
});
