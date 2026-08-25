// src/hooks/useTaskPolling.ts
// Source: CSD §8.3, hook_implementations.md §3
// Note: poll_task returns raw Meshy API JSON with snake_case field names.

import { invoke } from '@lib/tauri';
import { useSettingsStore } from '@stores/settingsStore';
import { useQuery } from '@tanstack/react-query';

// Raw Meshy API response (snake_case fields)
interface MeshyTaskResponse {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  progress: number;
  model_urls?: Record<string, string>;
  thumbnail_url?: string;
  task_error?: { message: string };
  consumed_credits: number;
}

export function useTaskPolling(taskId: string | null, endpoint: string) {
  const pollIntervalMs = useSettingsStore((s) => s.pollIntervalMs);

  return useQuery({
    queryKey: ['task', taskId],

    queryFn: async () => {
      return await invoke<MeshyTaskResponse>('poll_task', { endpoint, taskId });
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
