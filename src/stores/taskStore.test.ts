import { beforeEach, describe, expect, it } from 'vitest';

import type { ActiveTask } from '@lib/meshy-types';
import { useTaskStore } from './taskStore';

const sampleTask: ActiveTask = {
  taskId: 'task-001',
  taskType: 'text-to-3d-preview',
  status: 'PENDING',
  progress: 0,
  label: 'Text to 3D: a chair',
  startedAt: Date.now(),
  error: null,
};

const inProgressTask: ActiveTask = {
  taskId: 'task-002',
  taskType: 'remesh',
  status: 'IN_PROGRESS',
  progress: 50,
  label: 'Remesh',
  startedAt: Date.now(),
  error: null,
};

const succeededTask: ActiveTask = {
  taskId: 'task-003',
  taskType: 'convert',
  status: 'SUCCEEDED',
  progress: 100,
  label: 'Convert',
  startedAt: Date.now(),
  error: null,
};

const failedTask: ActiveTask = {
  taskId: 'task-004',
  taskType: 'resize',
  status: 'FAILED',
  progress: 50,
  label: 'Resize',
  startedAt: Date.now(),
  error: 'Insufficient credits',
};

const canceledTask: ActiveTask = {
  taskId: 'task-005',
  taskType: 'rig',
  status: 'CANCELED',
  progress: 0,
  label: 'Rigging',
  startedAt: Date.now(),
  error: null,
};

describe('taskStore', () => {
  beforeEach(() => {
    // Clear all tasks from the singleton store between tests
    const tasks = useTaskStore.getState().activeTasks;
    for (const id of tasks.keys()) {
      useTaskStore.getState().removeTask(id);
    }
    expect(useTaskStore.getState().activeTasks.size).toBe(0);
  });

  it('starts with an empty active tasks map', () => {
    const store = useTaskStore.getState();
    expect(store.activeTasks.size).toBe(0);
  });

  describe('addTask', () => {
    it('adds a task to the store keyed by taskId', () => {
      useTaskStore.getState().addTask(sampleTask);
      const tasks = useTaskStore.getState().activeTasks;
      expect(tasks.size).toBe(1);
      expect(tasks.get('task-001')).toEqual(sampleTask);
    });

    it('preserves existing tasks when adding a new one', () => {
      useTaskStore.getState().addTask(sampleTask);
      useTaskStore.getState().addTask(inProgressTask);
      const tasks = useTaskStore.getState().activeTasks;
      expect(tasks.size).toBe(2);
      expect(tasks.has('task-001')).toBe(true);
      expect(tasks.has('task-002')).toBe(true);
    });

    it('overwrites a task with the same taskId', () => {
      useTaskStore.getState().addTask(sampleTask);
      useTaskStore.getState().addTask({ ...sampleTask, progress: 10, status: 'IN_PROGRESS' });
      const task = useTaskStore.getState().activeTasks.get('task-001');
      expect(task?.status).toBe('IN_PROGRESS');
      expect(task?.progress).toBe(10);
    });
  });

  describe('updateTask', () => {
    it('updates the status and progress of an existing task', () => {
      useTaskStore.getState().addTask(sampleTask);
      useTaskStore.getState().updateTask('task-001', { status: 'IN_PROGRESS', progress: 42 });
      const task = useTaskStore.getState().activeTasks.get('task-001');
      expect(task?.status).toBe('IN_PROGRESS');
      expect(task?.progress).toBe(42);
    });

    it('preserves unmodified fields when partially updating', () => {
      useTaskStore.getState().addTask(sampleTask);
      useTaskStore.getState().updateTask('task-001', { progress: 50 });
      const task = useTaskStore.getState().activeTasks.get('task-001');
      expect(task?.status).toBe('PENDING');
      expect(task?.progress).toBe(50);
    });

    it('does nothing when updating a task that does not exist', () => {
      useTaskStore.getState().updateTask('nonexistent', { progress: 100 });
      expect(useTaskStore.getState().activeTasks.size).toBe(0);
    });

    it('sets an error message on a failed task', () => {
      useTaskStore.getState().addTask(sampleTask);
      useTaskStore.getState().updateTask('task-001', { status: 'FAILED', error: 'Network error' });
      const task = useTaskStore.getState().activeTasks.get('task-001');
      expect(task?.status).toBe('FAILED');
      expect(task?.error).toBe('Network error');
    });
  });

  // RND-05 write amplification: `updateTask` fires on EVERY poll tick for
  // every active task, but a tick normally restates the values already held.
  // These tests assert on *listener notifications*, not just state values —
  // the winning behavior is "no notification when nothing changed", which a
  // state-only assertion cannot distinguish from the write happening.
  describe('updateTask no-op suppression (RND-05)', () => {
    /** Counts store notifications and captures each notified slice. */
    function trackNotifications() {
      const slices: Array<Map<string, ActiveTask>> = [];
      const unsubscribe = useTaskStore.subscribe((state) => {
        slices.push(state.activeTasks);
      });
      return { slices, unsubscribe };
    }

    it('does not notify subscribers when the same values are re-applied', () => {
      useTaskStore.getState().addTask(sampleTask);
      const { slices, unsubscribe } = trackNotifications();

      // Three consecutive ticks restating the identical snapshot.
      useTaskStore.getState().updateTask('task-001', { status: 'PENDING', progress: 0 });
      useTaskStore.getState().updateTask('task-001', { progress: 0 });
      useTaskStore.getState().updateTask('task-001', { status: 'PENDING', progress: 0 });

      unsubscribe();
      expect(slices).toHaveLength(0);
    });

    it('keeps the same Map instance when nothing changed', () => {
      useTaskStore.getState().addTask(sampleTask);
      const before = useTaskStore.getState().activeTasks;

      useTaskStore.getState().updateTask('task-001', { status: 'PENDING', progress: 0 });

      // Reference identity is what Zustand's Object.is check keys on, so
      // the unchanged slice must be the very same object.
      expect(useTaskStore.getState().activeTasks).toBe(before);
    });

    it('notifies exactly once and swaps the Map when a value really changes', () => {
      useTaskStore.getState().addTask(sampleTask);
      const before = useTaskStore.getState().activeTasks;
      const { slices, unsubscribe } = trackNotifications();

      useTaskStore.getState().updateTask('task-001', { progress: 42 });

      unsubscribe();
      expect(slices).toHaveLength(1);
      expect(useTaskStore.getState().activeTasks).not.toBe(before);
      expect(useTaskStore.getState().activeTasks.get('task-001')?.progress).toBe(42);
    });

    it('notifies when only the status changes', () => {
      useTaskStore.getState().addTask(sampleTask);
      const { slices, unsubscribe } = trackNotifications();

      useTaskStore.getState().updateTask('task-001', { status: 'IN_PROGRESS' });

      unsubscribe();
      expect(slices).toHaveLength(1);
      expect(useTaskStore.getState().activeTasks.get('task-001')?.status).toBe('IN_PROGRESS');
    });

    it('notifies when a later key differs even though earlier keys match', () => {
      useTaskStore.getState().addTask(inProgressTask); // progress: 50, IN_PROGRESS
      const { slices, unsubscribe } = trackNotifications();

      // `status` matches the stored value; `progress` does not. The change
      // must still be detected — guards against a first-key-only check.
      useTaskStore.getState().updateTask('task-002', { status: 'IN_PROGRESS', progress: 75 });

      unsubscribe();
      expect(slices).toHaveLength(1);
      expect(useTaskStore.getState().activeTasks.get('task-002')?.progress).toBe(75);
    });

    it('still no-ops silently for a task that does not exist', () => {
      const before = useTaskStore.getState().activeTasks;
      const { slices, unsubscribe } = trackNotifications();

      useTaskStore.getState().updateTask('nonexistent', { progress: 100 });

      unsubscribe();
      expect(slices).toHaveLength(0);
      expect(useTaskStore.getState().activeTasks).toBe(before);
    });
  });

  describe('removeTask', () => {
    it('removes a task by taskId', () => {
      useTaskStore.getState().addTask(sampleTask);
      useTaskStore.getState().removeTask('task-001');
      expect(useTaskStore.getState().activeTasks.size).toBe(0);
    });

    it('does not throw when removing a nonexistent task', () => {
      expect(() => useTaskStore.getState().removeTask('nonexistent')).not.toThrow();
    });

    it('only removes the specified task, leaving others intact', () => {
      useTaskStore.getState().addTask(sampleTask);
      useTaskStore.getState().addTask(inProgressTask);
      useTaskStore.getState().removeTask('task-001');
      const tasks = useTaskStore.getState().activeTasks;
      expect(tasks.size).toBe(1);
      expect(tasks.has('task-002')).toBe(true);
    });
  });

  describe('clearCompleted', () => {
    it('removes only tasks with terminal statuses', () => {
      useTaskStore.getState().addTask(sampleTask); // PENDING
      useTaskStore.getState().addTask(inProgressTask); // IN_PROGRESS
      useTaskStore.getState().addTask(succeededTask); // SUCCEEDED
      useTaskStore.getState().addTask(failedTask); // FAILED
      useTaskStore.getState().addTask(canceledTask); // CANCELED
      useTaskStore.getState().clearCompleted();
      const tasks = useTaskStore.getState().activeTasks;
      expect(tasks.size).toBe(2);
      expect(tasks.has('task-001')).toBe(true); // PENDING kept
      expect(tasks.has('task-002')).toBe(true); // IN_PROGRESS kept
      expect(tasks.has('task-003')).toBe(false); // SUCCEEDED removed
      expect(tasks.has('task-004')).toBe(false); // FAILED removed
      expect(tasks.has('task-005')).toBe(false); // CANCELED removed
    });

    it('does nothing when no tasks are terminal', () => {
      useTaskStore.getState().addTask(sampleTask);
      useTaskStore.getState().addTask(inProgressTask);
      useTaskStore.getState().clearCompleted();
      expect(useTaskStore.getState().activeTasks.size).toBe(2);
    });

    it('does nothing when the store is empty', () => {
      useTaskStore.getState().clearCompleted();
      expect(useTaskStore.getState().activeTasks.size).toBe(0);
    });
  });
});
