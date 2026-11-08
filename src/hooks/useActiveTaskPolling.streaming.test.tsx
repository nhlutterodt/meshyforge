// WU-G (F4, decision D) integration tests: the SSE transport branch of
// useActiveTaskPolling — the seam that makes the persisted `useSseStreaming`
// setting actually select streaming (stream_task + task-progress events) —
// plus its degradation paths back to the interval poll.
//
// Pinned behaviors:
//   - streaming ON: progress events update taskStore; a SUCCEEDED progress
//     snapshot drives the SAME save/download pipeline as the poll path
//     (exactly once); no poll_task while the stream is healthy.
//   - stream_task rejection → the interval safety net polls the task and the
//     save still happens exactly once.
//   - quiet stream (no progress event within pollIntervalMs * 3) → degrades
//     to polling.
//   - task-complete → health mark dropped → next tick polls (terminal
//     fallback when the terminal progress snapshot was missed).
//   - interleaved progress events from two concurrent streams demultiplex by
//     snapshot.id — each event updates only its own task.
//   - unmount → both listeners unsubscribed.
//
// The polling branch itself (streaming OFF) is covered unchanged by
// useActiveTaskPolling.polling.test.tsx.

import '@testing-library/jest-dom/vitest';

import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  useTaskStore: vi.fn(),
  useSettingsStore: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock('@lib/tauri', () => ({
  invoke: mocks.invoke,
  onEvent: mocks.onEvent,
  assetUrl: vi.fn((p: string) => p),
}));

vi.mock('sonner', () => {
  const toastFn = vi.fn();
  return {
    toast: Object.assign(toastFn, {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    }),
  };
});

vi.mock('@stores/taskStore', () => ({
  useTaskStore: mocks.useTaskStore,
}));

vi.mock('@stores/settingsStore', () => ({
  useSettingsStore: mocks.useSettingsStore,
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...original,
    useQueryClient: () => ({
      invalidateQueries: mocks.invalidateQueries,
      // P-05: same stub shape as the polling test — see the comment there.
      getQueryData: () => undefined,
      setQueryData: vi.fn(),
      getQueryCache: () => ({ findAll: () => [] }),
    }),
  };
});

import type { ActiveTask, TaskSnapshot } from '@lib/meshy-types';
import { toast } from 'sonner';
import { useActiveTaskPolling } from './useActiveTaskPolling';

function makeTask(overrides: Partial<ActiveTask> = {}): ActiveTask {
  return {
    taskId: 'task-1',
    taskType: 'text-to-3d-preview',
    status: 'IN_PROGRESS',
    progress: 20,
    label: 'a dragon',
    startedAt: 1000,
    error: null,
    ...overrides,
  };
}

const SUCCEEDED_ARTIFACTS = [
  { role: 'primary', format: 'glb', url: 'https://assets.meshy.ai/t1/model.glb' },
  { role: 'armature', format: 'fbx', url: 'https://assets.meshy.ai/t1/armature.fbx' },
] as const;

function snapshotFor(taskId: string, overrides: Partial<TaskSnapshot> = {}): TaskSnapshot {
  return {
    id: taskId,
    taskType: 'text-to-3d-preview',
    status: 'IN_PROGRESS',
    progress: 50,
    consumedCredits: 25,
    createdAt: 1000,
    startedAt: 1010,
    finishedAt: 1100,
    thumbnailUrl: 'https://assets.meshy.ai/t1/thumb.png',
    artifacts: SUCCEEDED_ARTIFACTS.map((a) => ({ ...a })),
    providerPayload: { prompt: 'a dragon' },
    ...overrides,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  // useQueryClient is mocked away below, so no QueryClientProvider is needed.
  return <>{children}</>;
}

/** Captured `onEvent` handlers by event name, plus the returned unlisten spy. */
let eventHandlers: Map<string, (data: unknown) => void>;
let unlisten: ReturnType<typeof vi.fn>;

function mockStores(tasks: Map<string, ActiveTask>, updateTask: ReturnType<typeof vi.fn>) {
  mocks.useTaskStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ activeTasks: tasks, updateTask }),
  );
  mocks.useSettingsStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ pollIntervalMs: 5000, autoDownloadOnSuccess: true, useSseStreaming: true }),
  );
}

/** Default transport mocks: listeners register fine, stream_task never
 * resolves (the Rust command runs until terminal), poll_task returns a
 * non-terminal snapshot, save/download succeed. */
function mockTransport(streamTask: () => Promise<void> = () => new Promise(() => {})) {
  unlisten = vi.fn();
  eventHandlers = new Map();
  mocks.onEvent.mockImplementation((event: string, handler: (data: unknown) => void) => {
    eventHandlers.set(event, handler);
    return Promise.resolve(unlisten);
  });
  mocks.invoke.mockImplementation((command: string) => {
    if (command === 'stream_task') return streamTask();
    if (command === 'poll_task') {
      return Promise.resolve(snapshotFor('task-1', { status: 'IN_PROGRESS', progress: 30 }));
    }
    return Promise.resolve(undefined);
  });
}

const emitProgress = (snapshot: TaskSnapshot) =>
  act(async () => {
    eventHandlers.get('task-progress')?.(snapshot);
  });

const saveCalls = () => mocks.invoke.mock.calls.filter((c) => c[0] === 'save_completed_task');
const downloadCalls = () => mocks.invoke.mock.calls.filter((c) => c[0] === 'download_asset');
const pollCalls = () => mocks.invoke.mock.calls.filter((c) => c[0] === 'poll_task');

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mockTransport();
  mockStores(new Map([['task-1', makeTask()]]), vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useActiveTaskPolling — SSE streaming transport', () => {
  it('starts one stream_task per active task and subscribes to task-progress', async () => {
    renderHook(() => useActiveTaskPolling(), { wrapper });
    await act(async () => {});

    // ADR-0015 TPC-05: dispatch by taskType, same as poll_task.
    expect(mocks.invoke).toHaveBeenCalledWith('stream_task', {
      taskType: 'text-to-3d-preview',
      taskId: 'task-1',
    });
    expect(mocks.onEvent).toHaveBeenCalledWith('task-progress', expect.any(Function));
    expect(mocks.onEvent).toHaveBeenCalledWith('task-complete', expect.any(Function));
  });

  it('progress events update taskStore and no poll_task runs while the stream is healthy', async () => {
    const updateTask = vi.fn();
    mockStores(new Map([['task-1', makeTask()]]), updateTask);

    renderHook(() => useActiveTaskPolling(), { wrapper });
    await act(async () => {});

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await emitProgress(snapshotFor('task-1', { status: 'IN_PROGRESS', progress: 60 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    await emitProgress(snapshotFor('task-1', { status: 'IN_PROGRESS', progress: 80 }));

    expect(updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ status: 'IN_PROGRESS', progress: 60 }),
    );
    expect(updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ status: 'IN_PROGRESS', progress: 80 }),
    );
    // The interval safety net must stay suppressed while events keep flowing.
    expect(pollCalls()).toHaveLength(0);
  });

  it('a SUCCEEDED progress snapshot drives the shared save/download pipeline exactly once', async () => {
    const updateTask = vi.fn();
    mockStores(new Map([['task-1', makeTask()]]), updateTask);

    renderHook(() => useActiveTaskPolling(), { wrapper });
    await act(async () => {});

    await emitProgress(snapshotFor('task-1', { status: 'SUCCEEDED', progress: 100 }));

    expect(updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ status: 'SUCCEEDED', progress: 100 }),
    );
    expect(saveCalls()).toHaveLength(1);
    expect(saveCalls()[0]?.[1]).toEqual(
      expect.objectContaining({
        args: expect.objectContaining({
          taskId: 'task-1',
          artifacts: SUCCEEDED_ARTIFACTS.map((a) => ({ ...a })),
        }),
      }),
    );
    expect(downloadCalls()).toHaveLength(1);
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['assets'] });
    expect(toast.success).toHaveBeenCalledWith('Asset downloaded to local storage');

    // Further ticks stay suppressed (fresh health mark) and never re-save.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(saveCalls()).toHaveLength(1);
    expect(pollCalls()).toHaveLength(0);
  });

  it('interleaved events from two concurrent streams update only their own task', async () => {
    const tasks = new Map([
      ['task-1', makeTask()],
      ['task-2', makeTask({ taskId: 'task-2', taskType: 'image-to-3d' })],
    ]);
    const updateTask = vi.fn();
    mockStores(tasks, updateTask);

    renderHook(() => useActiveTaskPolling(), { wrapper });
    await act(async () => {});

    expect(mocks.invoke).toHaveBeenCalledWith('stream_task', {
      taskType: 'text-to-3d-preview',
      taskId: 'task-1',
    });
    expect(mocks.invoke).toHaveBeenCalledWith('stream_task', {
      taskType: 'image-to-3d',
      taskId: 'task-2',
    });

    await emitProgress(snapshotFor('task-2', { taskType: 'image-to-3d', progress: 70 }));

    expect(updateTask).toHaveBeenCalledTimes(1);
    expect(updateTask).toHaveBeenCalledWith('task-2', expect.objectContaining({ progress: 70 }));
    expect(updateTask).not.toHaveBeenCalledWith('task-1', expect.anything());
  });

  it('ignores progress events for tasks that are not in the store', async () => {
    const updateTask = vi.fn();
    mockStores(new Map([['task-1', makeTask()]]), updateTask);

    renderHook(() => useActiveTaskPolling(), { wrapper });
    await act(async () => {});

    await emitProgress(snapshotFor('ghost-task', { progress: 99 }));

    expect(updateTask).not.toHaveBeenCalled();
  });

  it('falls back to interval polling when the stream_task invoke rejects, saving exactly once', async () => {
    const updateTask = vi.fn();
    mockStores(new Map([['task-1', makeTask()]]), updateTask);
    // stream_task rejects (e.g. MISSING_API_KEY); poll_task succeeds with
    // SUCCEEDED so the safety net completes the pipeline.
    mocks.invoke.mockImplementation((command: string) => {
      if (command === 'stream_task') {
        return Promise.reject({ code: 'MISSING_API_KEY', message: 'No API key configured.' });
      }
      if (command === 'poll_task') {
        return Promise.resolve(snapshotFor('task-1', { status: 'SUCCEEDED', progress: 100 }));
      }
      return Promise.resolve(undefined);
    });

    renderHook(() => useActiveTaskPolling(), { wrapper });
    // Let the rejection settle and clear the health mark.
    await act(async () => {});

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // Safety net took over: poll_task ran and drove the shared pipeline.
    expect(pollCalls().length).toBeGreaterThanOrEqual(1);
    expect(saveCalls()).toHaveLength(1);
    expect(downloadCalls()).toHaveLength(1);
    expect(updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ status: 'SUCCEEDED' }),
    );
  });

  it('degrades to polling when no progress event arrives within pollIntervalMs * 3', async () => {
    // stream_task stays pending (never rejects/resolves) — only the quiet
    // health window can trigger the fallback.
    renderHook(() => useActiveTaskPolling(), { wrapper });
    await act(async () => {});

    // Ticks at 5s/10s are within the seeded 15s health window; the 15s+ tick is not.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(14000);
    });
    expect(pollCalls()).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(pollCalls().length).toBeGreaterThanOrEqual(1);
  });

  it('task-complete drops the health mark so the next tick polls the task (terminal fallback)', async () => {
    // poll_task returns SUCCEEDED so the fallback poll completes the pipeline.
    mocks.invoke.mockImplementation((command: string) => {
      if (command === 'poll_task') {
        return Promise.resolve(snapshotFor('task-1', { status: 'SUCCEEDED', progress: 100 }));
      }
      return Promise.resolve(undefined);
    });

    renderHook(() => useActiveTaskPolling(), { wrapper });
    await act(async () => {});

    await emitProgress(snapshotFor('task-1', { status: 'IN_PROGRESS', progress: 90 }));
    expect(pollCalls()).toHaveLength(0);

    await act(async () => {
      eventHandlers.get('task-complete')?.({ taskId: 'task-1', status: 'SUCCEEDED' });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(pollCalls().length).toBeGreaterThanOrEqual(1);
    // The poll's SUCCEEDED snapshot saves the task through the shared pipeline.
    expect(saveCalls()).toHaveLength(1);
  });

  it('dedupes the save when the poll safety net and the stream both see SUCCEEDED', async () => {
    // Stream a SUCCEEDED event, then let the stream resolve so the interval
    // takes over; the poll returns SUCCEEDED again — still exactly one save.
    let resolveStream: () => void = () => {};
    mocks.invoke.mockImplementation((command: string) => {
      if (command === 'stream_task') {
        return new Promise<void>((resolve) => {
          resolveStream = resolve;
        });
      }
      if (command === 'poll_task') {
        return Promise.resolve(snapshotFor('task-1', { status: 'SUCCEEDED', progress: 100 }));
      }
      return Promise.resolve(undefined);
    });

    renderHook(() => useActiveTaskPolling(), { wrapper });
    await act(async () => {});

    await emitProgress(snapshotFor('task-1', { status: 'SUCCEEDED', progress: 100 }));
    expect(saveCalls()).toHaveLength(1);

    await act(async () => {
      resolveStream();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(pollCalls().length).toBeGreaterThanOrEqual(1);
    expect(saveCalls()).toHaveLength(1);
    expect(downloadCalls()).toHaveLength(1);
  });

  it('does not double-invoke stream_task for a task whose stream is already running', async () => {
    const tasks = new Map([['task-1', makeTask()]]);
    mockStores(tasks, vi.fn());

    const hook = renderHook(() => useActiveTaskPolling(), { wrapper });
    await act(async () => {});

    // A second active task changes the task key → effect re-runs, but the
    // still-running task-1 stream must not be invoked a second time.
    tasks.set('task-2', makeTask({ taskId: 'task-2', taskType: 'image-to-3d' }));
    hook.rerender();
    await act(async () => {});

    const streamCalls = mocks.invoke.mock.calls.filter((c) => c[0] === 'stream_task');
    expect(
      streamCalls.filter((c) => (c[1] as { taskId: string }).taskId === 'task-1'),
    ).toHaveLength(1);
    expect(
      streamCalls.filter((c) => (c[1] as { taskId: string }).taskId === 'task-2'),
    ).toHaveLength(1);
  });

  it('unsubscribes both listeners and stops streaming on unmount', async () => {
    const { unmount } = renderHook(() => useActiveTaskPolling(), { wrapper });
    await act(async () => {});
    expect(eventHandlers.size).toBe(2);

    unmount();

    // Both onEvent promises resolved before unmount, so each got its unlisten.
    expect(unlisten).toHaveBeenCalledTimes(2);
  });

  it('unsubscribes listeners when the setting flips back to polling and polls again', async () => {
    let sseOn = true;
    mocks.useSettingsStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({
        pollIntervalMs: 5000,
        autoDownloadOnSuccess: true,
        useSseStreaming: sseOn,
      }),
    );

    const hook = renderHook(() => useActiveTaskPolling(), { wrapper });
    await act(async () => {});

    sseOn = false;
    hook.rerender();
    await act(async () => {});

    expect(unlisten).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(pollCalls().length).toBeGreaterThanOrEqual(1);
  });
});
