// src/hooks/useTaskPolling.ts
// Source: CSD §8.3, hook_implementations.md §3
// Note: poll_task returns raw Meshy API JSON with snake_case field names.

import { invoke } from '@lib/tauri';
import { useSettingsStore } from '@stores/settingsStore';
import { useQuery } from '@tanstack/react-query';

export type MeshyTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';

// Raw Meshy API response (snake_case fields)
export interface MeshyTaskResponse {
  id: string;
  status: MeshyTaskStatus;
  progress: number;
  model_urls?: Record<string, string>;
  thumbnail_url?: string;
  task_error?: { message: string };
  consumed_credits: number;
}

// TResult defaults to the generic task shape above, but callers that need
// endpoint-specific raw fields (e.g. a print-analyze report's snake_case
// fields, which poll_task passes through verbatim from the Meshy API) may
// supply their own shape as long as it still carries `status`, since the
// terminal-status check below depends on it.
export function useTaskPolling<TResult extends { status: MeshyTaskStatus } = MeshyTaskResponse>(
  taskId: string | null,
  endpoint: string,
) {
  const pollIntervalMs = useSettingsStore((s) => s.pollIntervalMs);

  return useQuery({
    queryKey: ['task', taskId],

    queryFn: async () => {
      return await invoke<TResult>('poll_task', { endpoint, taskId });
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
