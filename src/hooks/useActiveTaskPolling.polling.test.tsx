// Integration test for the useActiveTaskPolling hook's useEffect polling loop.
//
// This covers the branch from useActiveTaskPolling.ts that the
// mapSnapshotToSaveArgs regression test does not touch:
//   - no interval when there are no active PENDING/IN_PROGRESS tasks
//   - polling calls invoke('poll_task') per active task
//   - status/progress/error updates flow into updateTask
//   - SUCCEEDED triggers save_completed_task (wrapped `args`) +
//     (autoDownloadOnSuccess) download_asset with the typed artifacts
//   - query cache invalidation and toasts fire on success
//   - a FAILED poll result does not trigger save/download

import '@testing-library/jest-dom/vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
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
    useQueryClient: () => ({
      invalidateQueries: mocks.invalidateQueries,
      // P-05: the pipeline patches cached rows via these, so the stub needs
      // them. Empty results are correct here — these tests assert on the
      // invoke/invalidate calls, and an empty cache means "nothing to patch".
      getQueryData: () => undefined,
      setQueryData: vi.fn(),
      getQueryCache: () => ({ findAll: () => [] }),
    }),
  };
});

import type { ActiveTask, TaskSnapshot } from '@lib/meshy-types';
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

// ADR-0015 step 2: poll_task returns the normalized camelCase TaskSnapshot.
// Step 3: the snapshot's role-tagged artifacts flow verbatim into
// save_completed_task's `args.artifacts` and download_asset's `artifacts`.
const SUCCEEDED_ARTIFACTS = [
  { role: 'primary', format: 'glb', url: 'https://assets.meshy.ai/t1/model.glb' },
  { role: 'armature', format: 'fbx', url: 'https://assets.meshy.ai/t1/armature.fbx' },
  {
    role: 'presetClip',
    format: 'glb',
    label: 'walking',
    url: 'https://assets.meshy.ai/t1/walking.glb',
  },
] as const;

const SUCCEEDED_RESULT: TaskSnapshot = {
  id: 'task-1',
  taskType: 'text-to-3d-preview',
  status: 'SUCCEEDED',
  progress: 100,
  consumedCredits: 25,
  createdAt: 1000,
  startedAt: 1010,
  finishedAt: 1100,
  thumbnailUrl: 'https://assets.meshy.ai/t1/thumb.png',
  artifacts: SUCCEEDED_ARTIFACTS.map((a) => ({ ...a })),
  providerPayload: {
    prompt: 'a dragon',
    texture_urls: null,
  },
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

    // ADR-0015 TPC-05: dispatch by taskType, not endpoint.
    expect(mocks.invoke).toHaveBeenCalledWith('poll_task', {
      taskType: 'text-to-3d-preview',
      taskId: 'task-1',
    });
    expect(updateTask).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ status: 'IN_PROGRESS', progress: 55 }),
    );
  });

  it('polls a replacement task when the active task count stays the same', async () => {
    const updateTask = vi.fn();
    let activeTasks = new Map([['task-1', makeTask()]]);
    mocks.useTaskStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ activeTasks, updateTask }),
    );
    mocks.invoke.mockResolvedValue({ ...SUCCEEDED_RESULT, status: 'IN_PROGRESS' });

    const hook = renderHook(() => useActiveTaskPolling(), { wrapper });
    activeTasks = new Map([['task-2', makeTask({ taskId: 'task-2', taskType: 'image-to-3d' })]]);
    hook.rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(mocks.invoke).toHaveBeenCalledWith('poll_task', {
      taskType: 'image-to-3d',
      taskId: 'task-2',
    });
    expect(mocks.invoke).not.toHaveBeenCalledWith('poll_task', {
      taskType: 'text-to-3d-preview',
      taskId: 'task-1',
    });
  });

  it('saves the completed task and downloads assets on SUCCEEDED', async () => {
    mocks.invoke.mockResolvedValue(SUCCEEDED_RESULT);

    renderHook(() => useActiveTaskPolling(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // ADR-0015 step 3: Tauri 2 maps the command's `args: SaveCompletedTaskArgs`
    // parameter to the payload key `args`, so the save payload is nested.
    expect(mocks.invoke).toHaveBeenCalledWith(
      'save_completed_task',
      expect.objectContaining({
        args: expect.objectContaining({
          taskId: 'task-1',
          artifacts: SUCCEEDED_RESULT.artifacts,
        }),
      }),
    );
    expect(mocks.invoke).toHaveBeenCalledWith(
      'download_asset',
      expect.objectContaining({ taskId: 'task-1' }),
    );
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['assets'] });
  });

  // TASK-0031 evidence gate (frontend side): "a test asserts no result URL
  // present in a task response is silently dropped". Every artifact of the
  // fixture snapshot must appear in the download invoke args — nothing
  // filtered, nothing merged, no PRIMARY-wins collapse.
  it('TASK-0031: passes every snapshot artifact to download_asset with no drop', async () => {
    mocks.invoke.mockResolvedValue(SUCCEEDED_RESULT);

    renderHook(() => useActiveTaskPolling(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    const downloadCall = mocks.invoke.mock.calls.find((c) => c[0] === 'download_asset');
    expect(downloadCall).toBeDefined();
    const payload = downloadCall?.[1] as { artifacts: unknown[] };
    expect(payload.artifacts).toHaveLength(SUCCEEDED_RESULT.artifacts.length);
    for (const artifact of SUCCEEDED_RESULT.artifacts) {
      expect(payload.artifacts).toContainEqual(artifact);
    }
    // The legacy format map is no longer part of the IPC payload.
    expect(payload).not.toHaveProperty('modelUrls');

    // And the save args carry the same complete artifact list.
    const saveCall = mocks.invoke.mock.calls.find((c) => c[0] === 'save_completed_task');
    const saveArgs = (saveCall?.[1] as { args: { artifacts: unknown[] } }).args;
    expect(saveArgs.artifacts).toHaveLength(SUCCEEDED_RESULT.artifacts.length);
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
      expect.objectContaining({ args: expect.objectContaining({ taskId: 'task-1' }) }),
    );
    expect(mocks.invoke).not.toHaveBeenCalledWith('download_asset', expect.anything());
  });

  it('does not save or download for FAILED results', async () => {
    const updateTask = vi.fn();
    mockStores(new Map([['task-1', makeTask()]]), updateTask);
    mocks.invoke.mockResolvedValue({
      ...SUCCEEDED_RESULT,
      status: 'FAILED',
      error: { code: 'ERR', message: 'boom' },
      artifacts: [],
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
