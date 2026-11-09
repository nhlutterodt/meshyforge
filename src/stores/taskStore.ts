// src/stores/taskStore.ts
// Source: TDD §8.1, zustand_store_implementations.md §3

import { create } from 'zustand';
import type { ActiveTask } from '../lib/meshy-types';

interface TaskState {
  activeTasks: Map<string, ActiveTask>;
  addTask: (task: ActiveTask) => void;
  updateTask: (taskId: string, updates: Partial<ActiveTask>) => void;
  removeTask: (taskId: string) => void;
  clearCompleted: () => void;
}

/**
 * True when applying `updates` to `task` would change the stored task.
 *
 * No `undefined` special-case is needed: `tsconfig.json` enables
 * `exactOptionalPropertyTypes`, so `Partial<ActiveTask>` makes an explicit
 * `undefined` value a type error at every call site and the "spread
 * `undefined` over a real value" hazard cannot be expressed.
 */
function hasChanged(task: ActiveTask, updates: Partial<ActiveTask>): boolean {
  for (const key of Object.keys(updates) as Array<keyof ActiveTask>) {
    if (!Object.is(task[key], updates[key])) return true;
  }
  return false;
}

export const useTaskStore = create<TaskState>((set) => ({
  activeTasks: new Map(),
  addTask: (task) =>
    set((s) => {
      const tasks = new Map(s.activeTasks);
      tasks.set(task.taskId, task);
      return { activeTasks: tasks };
    }),
  updateTask: (taskId, updates) =>
    set((s) => {
      const existing = s.activeTasks.get(taskId);
      // RND-05 no-op guard: `updateTask` runs on every poll tick / SSE
      // message for every active task, but a tick usually restates values
      // that are already current (same progress, same status, same error).
      // Zustand notifies listeners on every `set` whose returned slice is a
      // new object (zustand/esm/vanilla.mjs `setState` compares with
      // `Object.is`), so a fresh Map here costs a `useSyncExternalStore`
      // re-check in every `activeTasks` subscriber — StatusBar, TopBar,
      // TaskMonitor, TaskHistory — on every tick, for no state change.
      // Returning `s` unchanged skips the notification entirely.
      if (!existing || !hasChanged(existing, updates)) {
        return s;
      }
      // Each real update still creates a NEW Map: shallow-equality change
      // detection requires a new reference (zustand_store_implementations
      // §2, "Usage notes").
      const tasks = new Map(s.activeTasks);
      tasks.set(taskId, { ...existing, ...updates });
      return { activeTasks: tasks };
    }),
  removeTask: (taskId) =>
    set((s) => {
      const tasks = new Map(s.activeTasks);
      tasks.delete(taskId);
      return { activeTasks: tasks };
    }),
  clearCompleted: () =>
    set((s) => {
      const tasks = new Map(s.activeTasks);
      for (const [id, task] of tasks) {
        if (['SUCCEEDED', 'FAILED', 'CANCELED'].includes(task.status)) {
          tasks.delete(id);
        }
      }
      return { activeTasks: tasks };
    }),
}));
