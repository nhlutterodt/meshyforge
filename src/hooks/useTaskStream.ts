// src/hooks/useTaskStream.ts
// Source: hook_implementations.md §4
//
// ADR-0015 step 2 (TPC-02/TPC-05): `task-progress` payloads are normalized
// camelCase TaskSnapshots (this replaces the F2 mis-typing of raw snake_case
// SSE JSON as camelCase TaskObject), and stream_task dispatches on taskType.

import type { TaskSnapshot } from '@lib/meshy-types';
import { invoke, onEvent } from '@lib/tauri';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

export function useStreamTask(taskId: string | null, taskType: string, enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || taskId === null) {
      return;
    }

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    async function start() {
      unlisten = await onEvent<TaskSnapshot>('task-progress', (data) => {
        qc.setQueryData(['task', taskId], data);
      });

      if (cancelled) {
        return;
      }

      try {
        await invoke<void>('stream_task', { taskType, taskId });
      } catch (error) {
        console.error('Failed to start task stream:', error);
      }
    }

    void start();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [enabled, taskId, taskType, qc]);
}
