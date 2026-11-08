import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
}));

import { invoke, onEvent } from '@lib/tauri';
import { useStreamTask } from './useTaskStream';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return { Wrapper, qc };
}

describe('useStreamTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not start streaming when disabled', async () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useStreamTask('task-1', 'text-to-3d-preview', false), {
      wrapper: Wrapper,
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(onEvent).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('does not start streaming when taskId is null', async () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useStreamTask(null, 'text-to-3d-preview', true), {
      wrapper: Wrapper,
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(onEvent).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('subscribes to task-progress events and invokes stream_task when enabled', async () => {
    vi.mocked(onEvent).mockResolvedValue(vi.fn());
    vi.mocked(invoke).mockResolvedValue(undefined);

    const { Wrapper } = createWrapper();
    renderHook(() => useStreamTask('task-1', 'text-to-3d-preview', true), {
      wrapper: Wrapper,
    });

    await waitFor(() =>
      expect(onEvent).toHaveBeenCalledWith('task-progress', expect.any(Function)),
    );
    // ADR-0015 TPC-05: stream_task dispatches on the taskType wire value.
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('stream_task', {
        taskType: 'text-to-3d-preview',
        taskId: 'task-1',
      }),
    );
  });

  it('stores task-progress payloads (TaskSnapshot JSON, TPC-02) in the query cache', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const setQueryData = vi.spyOn(qc, 'setQueryData');
    let emitProgress: ((data: unknown) => void) | undefined;
    vi.mocked(onEvent).mockImplementation((_event, handler) => {
      emitProgress = handler as (data: unknown) => void;
      return Promise.resolve(vi.fn());
    });
    vi.mocked(invoke).mockResolvedValue(undefined);

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }
    renderHook(() => useStreamTask('task-1', 'text-to-3d-preview', true), { wrapper: Wrapper });
    await waitFor(() => expect(onEvent).toHaveBeenCalled());

    const snapshot = {
      id: 'task-1',
      taskType: 'text-to-3d-preview',
      status: 'IN_PROGRESS',
      progress: 60,
      consumedCredits: 0,
      createdAt: 1,
      startedAt: 2,
      finishedAt: 0,
      artifacts: [],
      providerPayload: {},
    };
    await act(async () => {
      emitProgress?.(snapshot);
    });
    expect(setQueryData).toHaveBeenCalledWith(['task', 'task-1'], snapshot);
    expect(qc.getQueryData(['task', 'task-1'])).toEqual(snapshot);
  });

  it('unsubscribes on unmount', async () => {
    const unlisten = vi.fn();
    vi.mocked(onEvent).mockResolvedValue(unlisten);
    vi.mocked(invoke).mockResolvedValue(undefined);

    const { Wrapper } = createWrapper();
    const { unmount } = renderHook(() => useStreamTask('task-1', 'text-to-3d-preview', true), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(onEvent).toHaveBeenCalled());
    unmount();
    expect(unlisten).toHaveBeenCalled();
  });
});
