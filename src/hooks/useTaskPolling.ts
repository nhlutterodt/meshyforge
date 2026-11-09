// src/hooks/useTaskPolling.ts
// Source: CSD §8.3, hook_implementations.md §3
//
// ADR-0015 step 2 (TPC-02): poll_task returns the normalized camelCase
// TaskSnapshot — the raw snake_case Meshy JSON no longer crosses IPC here.

import type { TaskSnapshot } from '@lib/meshy-types';
import { invoke } from '@lib/tauri';
import { useSettingsStore } from '@stores/settingsStore';
import { useQuery } from '@tanstack/react-query';

export type MeshyTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';

// TResult defaults to the normalized snapshot, but callers that need
// provider-specific raw fields (e.g. a print-analyze report's fields, which
// still live in the snapshot's transitional providerPayload — ADR-0015 TPC-06)
// may supply their own shape as long as it still carries `status`, since the
// terminal-status check below depends on it.
export function useTaskPolling<TResult extends { status: MeshyTaskStatus } = TaskSnapshot>(
  taskId: string | null,
  taskType: string,
) {
  const pollIntervalMs = useSettingsStore((s) => s.pollIntervalMs);

  return useQuery({
    queryKey: ['task', taskId],

    queryFn: async () => {
      return await invoke<TResult>('poll_task', { taskType, taskId });
    },

    enabled: taskId !== null,

    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELED') {
        return false;
      }
      return pollIntervalMs;
    },

    refetchIntervalInBackground: true,
  });
}
