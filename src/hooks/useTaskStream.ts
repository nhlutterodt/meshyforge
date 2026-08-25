// src/hooks/useTaskStream.ts
// Source: hook_implementations.md §4

import type { TaskObject } from '@lib/meshy-types';
import { invoke, onEvent } from '@lib/tauri';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function useStreamTask(taskId: string | null, endpoint: string, enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || taskId === null) {
      return;
    }

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    async function start() {
      unlisten = await onEvent<TaskObject>('task-progress', (data) => {
        qc.setQueryData(['task', taskId], data);
      });

      if (cancelled) {
        return;
      }

      try {
        await invoke<void>('stream_task', { endpoint, taskId });
      } catch (error) {
        console.error('Failed to start task stream:', error);
      }
    }

    void start();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [enabled, taskId, endpoint, qc]);
}
