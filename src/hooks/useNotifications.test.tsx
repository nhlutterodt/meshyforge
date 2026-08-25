import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  onEvent: vi.fn(),
}));

vi.mock('@stores/settingsStore', () => ({
  useSettingsStore: vi.fn((selector) => selector({ notifyOnTaskComplete: true })),
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

import { onEvent } from '@lib/tauri';
import { useSettingsStore } from '@stores/settingsStore';
import { toast } from 'sonner';
import { useNotifications } from './useNotifications';

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSettingsStore).mockImplementation((selector: any) =>
      selector({ notifyOnTaskComplete: true }),
    );
  });

  it('subscribes to task-complete events when notifications are enabled', async () => {
    vi.mocked(onEvent).mockResolvedValue(vi.fn());
    renderHook(() => useNotifications());

    // Wait for the async setup to run
    await vi.waitFor(() => {
      expect(onEvent).toHaveBeenCalledWith('task-complete', expect.any(Function));
    });
  });

  it('does not subscribe when notifications are disabled', async () => {
    vi.mocked(useSettingsStore).mockImplementation((selector: any) =>
      selector({ notifyOnTaskComplete: false }),
    );

    renderHook(() => useNotifications());

    // Give the effect a moment to run (it should early-return)
    await new Promise((r) => setTimeout(r, 50));
    expect(onEvent).not.toHaveBeenCalled();
  });

  it('shows a success toast on SUCCEEDED status', async () => {
    let eventHandler: ((data: any) => void) | undefined;
    vi.mocked(onEvent).mockImplementation(async (_event: string, handler: any) => {
      eventHandler = handler;
      return vi.fn();
    });

    renderHook(() => useNotifications());

    await vi.waitFor(() => expect(eventHandler).toBeDefined());
    eventHandler?.({ taskId: 'task-1', status: 'SUCCEEDED' });

    expect(toast.success).toHaveBeenCalledWith('Task completed successfully');
  });

  it('shows an error toast on FAILED status', async () => {
    let eventHandler: ((data: any) => void) | undefined;
    vi.mocked(onEvent).mockImplementation(async (_event: string, handler: any) => {
      eventHandler = handler;
      return vi.fn();
    });

    renderHook(() => useNotifications());

    await vi.waitFor(() => expect(eventHandler).toBeDefined());
    eventHandler?.({ taskId: 'task-2', status: 'FAILED' });

    expect(toast.error).toHaveBeenCalledWith('Task failed');
  });

  it('shows an info toast for non-succeeded, non-failed statuses', async () => {
    let eventHandler: ((data: any) => void) | undefined;
    vi.mocked(onEvent).mockImplementation(async (_event: string, handler: any) => {
      eventHandler = handler;
      return vi.fn();
    });

    renderHook(() => useNotifications());

    await vi.waitFor(() => expect(eventHandler).toBeDefined());
    eventHandler?.({ taskId: 'task-3', status: 'CANCELED' });

    expect(toast).toHaveBeenCalledWith('Task canceled');
  });

  it('unsubscribes on unmount', async () => {
    const unlisten = vi.fn();
    vi.mocked(onEvent).mockResolvedValue(unlisten);
    const { unmount } = renderHook(() => useNotifications());

    await vi.waitFor(() => expect(onEvent).toHaveBeenCalled());
    unmount();
    expect(unlisten).toHaveBeenCalled();
  });
});