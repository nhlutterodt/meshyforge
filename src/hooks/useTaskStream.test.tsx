import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
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
    renderHook(() => useStreamTask('task-1', '/v2/text-to-3d', false), {
      wrapper: Wrapper,
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(onEvent).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('does not start streaming when taskId is null', async () => {
    const { Wrapper } = createWrapper();
    renderHook(() => useStreamTask(null, '/v2/text-to-3d', true), {
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
    renderHook(() => useStreamTask('task-1', '/v2/text-to-3d', true), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(onEvent).toHaveBeenCalledWith('task-progress', expect.any(Function)));
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('stream_task', {
        endpoint: '/v2/text-to-3d',
        taskId: 'task-1',
      }),
    );
  });

  it('unsubscribes on unmount', async () => {
    const unlisten = vi.fn();
    vi.mocked(onEvent).mockResolvedValue(unlisten);
    vi.mocked(invoke).mockResolvedValue(undefined);

    const { Wrapper } = createWrapper();
    const { unmount } = renderHook(() => useStreamTask('task-1', '/v2/text-to-3d', true), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(onEvent).toHaveBeenCalled());
    unmount();
    expect(unlisten).toHaveBeenCalled();
  });
});