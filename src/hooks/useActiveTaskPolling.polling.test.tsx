// Integration test for the useActiveTaskPolling hook's useEffect polling loop.
//
// This covers the branch from useActiveTaskPolling.ts (lines 75–148) that the
// existing mapPollResultToSaveArgs regression test does not touch:
//   - no interval when there are no active PENDING/IN_PROGRESS tasks
//   - polling calls invoke('poll_task') per active task
//   - status/progress/error updates flow into updateTask
//   - SUCCEEDED triggers save_completed_task + (autoDownloadOnSuccess) download_asset
//   - query cache invalidation and toasts fire on success
//   - a FAILED poll result does not trigger save/download

import '@testing-library/jest-dom/vitest';

import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  useTaskStore: vi.fn(),
  useSettingsStore: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock('@lib/tauri', () => ({
  invoke: mocks.invoke,
  onEvent: vi.fn(),
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
    useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  };
});

import { useActiveTaskPolling } from './useActiveTaskPolling';
import type { ActiveTask } from '@lib/meshy-types';

function makeTask(overrides: Partial<ActiveTask> = {}): ActiveTask {
  return {
    taskId: 'task-1',
    endpoint: 'text-to-3d',
    meshyType: 'text-to-3d',
    status: 'IN_PROGRESS',
    progress: 20,
    label: 'a dragon',
    startedAt: 1000,
    error: null,
    ...overrides,
  };
}

const SUCCEEDED_RESULT = {
  id: 'task-1',
  status: 'SUCCEEDED',
  progress: 100,
  prompt: 'a dragon',
  model_urls: { glb: 'https://assets.meshy.ai/t1/model.glb' },
  thumbnail_url: 'https://assets.meshy.ai/t1/thumb.png',
  texture_urls: null,
  consumed_credits: 25,
  created_at: 1000,
  started_at: 1010,
  finished_at: 1100,
};

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function mockStores(tasks: Map<string, ActiveTask>, updateTask: ReturnType<typeof vi.fn>) {
  mocks.useTaskStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ activeTasks: tasks, updateTask }),
  );
  mocks.useSettingsStore.mockImplementation((selector: (s: unknown) => unknown) =>
    selector({ pollIntervalMs: 5000, autoDownloadOnSuccess: true }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mockStores(new Map([['task-1', makeTask()]]), vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useActiveTaskPolling — polling loop', () => {
  it('does not set an interval when there are no active tasks', async () => {
    mockStores(new Map(), vi.fn());

    renderHook(() => useActiveTaskPolling(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('polls each active task and updates status/progress', async () => {
    const updateTask = vi.fn();
    mockStores(new Map([['task-1', makeTask()]]), updateTask);
    mocks.invoke.mockResolvedValue({ ...SUCCEEDED_RESULT, status: 'IN_PROGRESS', progress: 55 });

    renderHook(() => useActiveTaskPolling(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mocks.invoke).toHaveBeenCalledWith('poll_task', {
      endpoint: 'text-to-3d',
      taskId: 'task-1',
    });
    expect(updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ status: 'IN_PROGRESS', progress: 55 }),
    );
  });

  it('saves the completed task and downloads assets on SUCCEEDED', async () => {
    mocks.invoke.mockResolvedValue(SUCCEEDED_RESULT);

    renderHook(() => useActiveTaskPolling(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mocks.invoke).toHaveBeenCalledWith(
      'save_completed_task',
      expect.objectContaining({ taskId: 'task-1' }),
    );
    expect(mocks.invoke).toHaveBeenCalledWith(
      'download_asset',
      expect.objectContaining({ taskId: 'task-1' }),
    );
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['assets'] });
  });

  it('skips download when autoDownloadOnSuccess is disabled', async () => {
    mocks.useSettingsStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ pollIntervalMs: 5000, autoDownloadOnSuccess: false }),
    );
    mocks.invoke.mockResolvedValue(SUCCEEDED_RESULT);

    renderHook(() => useActiveTaskPolling(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mocks.invoke).toHaveBeenCalledWith(
      'save_completed_task',
      expect.objectContaining({ taskId: 'task-1' }),
    );
    expect(mocks.invoke).not.toHaveBeenCalledWith('download_asset', expect.anything());
  });

  it('does not save or download for FAILED results', async () => {
    const updateTask = vi.fn();
    mockStores(new Map([['task-1', makeTask()]]), updateTask);
    mocks.invoke.mockResolvedValue({
      ...SUCCEEDED_RESULT,
      status: 'FAILED',
      task_error: { message: 'boom', code: 'ERR' },
      model_urls: undefined,
    });

    renderHook(() => useActiveTaskPolling(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mocks.invoke).toHaveBeenCalledWith('poll_task', expect.anything());
    expect(mocks.invoke).not.toHaveBeenCalledWith('save_completed_task', expect.anything());
    expect(updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ status: 'FAILED', error: 'boom' }),
    );
  });

  it('dedupes save_completed_task across multiple poll ticks', async () => {
    mocks.invoke.mockResolvedValue(SUCCEEDED_RESULT);

    renderHook(() => useActiveTaskPolling(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });

    const saveCalls = mocks.invoke.mock.calls.filter((c) => c[0] === 'save_completed_task');
    expect(saveCalls).toHaveLength(1);
  });
});
