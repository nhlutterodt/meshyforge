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
      const tasks = new Map(s.activeTasks);
      const existing = tasks.get(taskId);
      if (existing) {
        tasks.set(taskId, { ...existing, ...updates });
      }
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
