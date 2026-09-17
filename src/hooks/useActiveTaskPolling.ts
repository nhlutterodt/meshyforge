// src/hooks/useActiveTaskPolling.ts
// Polls all active (non-terminal) tasks in the taskStore and updates them.
// When a task reaches SUCCEEDED, saves it to SQLite and optionally downloads.
//
// IMPORTANT: The Meshy API returns snake_case field names (model_urls,
// thumbnail_url, etc.). The poll_task command returns raw JSON from the
// API, so we must read snake_case keys here, NOT the camelCase keys
// defined in the TaskObject TypeScript type.

import { invoke } from '@lib/tauri';
import { useSettingsStore } from '@stores/settingsStore';
import { useTaskStore } from '@stores/taskStore';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

// Raw Meshy API response shape (snake_case, not camelCase)
export interface MeshyTaskResponse {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  progress: number;
  prompt?: string;
  model_urls?: Record<string, string>;
  thumbnail_url?: string;
  texture_urls?: Array<Record<string, string | null>>;
  task_error?: { message: string; type?: string; code?: string };
  consumed_credits: number;
  created_at: number;
  started_at: number;
  finished_at: number;
  result?: MeshyTaskResult | null;
}

// Nested result payload. Animation/retarget/merge URLs nest under `result`
// (animation_glb_url / animation_fbx_url / processed_*_url); text-to-motion
// nests motion_url / motion_format / duration_ms / mode. See
// docs/LESSONS_LEARNED.md #10 (opaque JSON, locate by traversing) and #13.
export interface MeshyTaskResult {
  motion_url?: string | null;
  motion_format?: string | null;
  duration_ms?: number | null;
  mode?: string | null;
  animation_glb_url?: string | null;
  animation_fbx_url?: string | null;
  processed_usdz_url?: string | null;
  processed_armature_fbx_url?: string | null;
  processed_animation_fps_fbx_url?: string | null;
}

// Maps nested `result` URL fields (snake_case) onto the canonical download
// format keys `download_asset` understands. Top-level `model_urls` (used by
// text-to-3d / image-to-3d) pass through unchanged. Explicit `null` and
// missing fields both degrade to an empty map; returns null only when there
// are no URLs at all (so save_completed_task's optional `modelUrls` stays
// null rather than `{}`).
export function flattenResultUrls(result: MeshyTaskResponse): Record<string, string> | null {
  const urls: Record<string, string> = {};
  if (result.model_urls) {
    for (const [key, value] of Object.entries(result.model_urls)) {
      if (typeof value === 'string' && value.trim() !== '') urls[key] = value;
    }
  }
  const nested = result.result;
  if (nested && typeof nested === 'object') {
    const n = nested as Record<string, unknown>;
    const animationMapping: Array<[string, string]> = [
      ['animation_glb_url', 'glb'],
      ['animation_fbx_url', 'fbx'],
      ['processed_usdz_url', 'usdz'],
      ['processed_armature_fbx_url', 'fbx'],
      ['processed_animation_fps_fbx_url', 'fbx'],
    ];
    for (const [wire, format] of animationMapping) {
      const value = n[wire];
      if (typeof value !== 'string' || value.trim() === '') continue;
      // PRIMARY wins over processed variants: several source fields map to
      // the same output key (fbx), and the earlier fields are the canonical
      // file while the processed_* entries are derived artifacts. Without
      // this guard, last-wins silently overwrote the primary FBX with a
      // post-processed variant whose ordering is not defined by the API.
      if (urls[format] === undefined) {
        urls[format] = value;
      }
    }
    const motionUrl = n.motion_url;
    if (typeof motionUrl === 'string' && motionUrl.trim() !== '') {
      // prime -> FBX, swift -> BVH; motion_format is the authoritative key.
      urls[n.motion_format === 'bvh' ? 'bvh' : 'fbx'] = motionUrl;
    }
  }
  const keys = Object.keys(urls);
  return keys.length > 0 ? urls : null;
}

// ─── Snake_case → save_completed_task args mapper ────────────
// Extracted for unit testing (regression: previously read camelCase
// keys from raw snake_case JSON, causing undefined values).
export interface SaveCompletedTaskArgs {
  taskId: string;
  taskType: string;
  prompt: string | null;
  aiModel: null;
  status: string;
  progress: number;
  consumedCredits: number;
  thumbnailUrl: string | null;
  modelUrls: Record<string, string> | null;
  textureUrls: Array<Record<string, string | null>> | null;
  createdAt: number;
  startedAt: number;
  finishedAt: number;
}

export function mapPollResultToSaveArgs(
  taskId: string,
  taskType: string,
  result: MeshyTaskResponse,
): SaveCompletedTaskArgs {
  return {
    taskId,
    taskType,
    prompt: result.prompt ?? null,
    aiModel: null,
    status: result.status,
    // Fall back to 0 for numeric fields: save_completed_task's Rust
    // parameters are required (non-Option), so an undefined value here
    // would drop the key from the invoke() JSON payload entirely and
    // make the whole save silently fail deserialization (see the
    // meshyType/taskType regression this file guards against).
    progress: result.progress ?? 0,
    consumedCredits: result.consumed_credits ?? 0,
    thumbnailUrl: result.thumbnail_url ?? null,
    modelUrls: flattenResultUrls(result),
    textureUrls: result.texture_urls ?? null,
    createdAt: result.created_at ?? 0,
    startedAt: result.started_at ?? 0,
    finishedAt: result.finished_at ?? 0,
  };
}

export function useActiveTaskPolling() {
  const activeTasks = useTaskStore((s) => s.activeTasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const pollIntervalMs = useSettingsStore((s) => s.pollIntervalMs);
  const autoDownloadOnSuccess = useSettingsStore((s) => s.autoDownloadOnSuccess);
  const qc = useQueryClient();

  // Track which tasks we've already saved to avoid duplicate inserts
  const savedTaskIds = useRef<Set<string>>(new Set());

  const tasksToPoll = Array.from(activeTasks.values()).filter(
    (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS',
  );
  const tasksToPollRef = useRef(tasksToPoll);
  const pollingTaskKey = tasksToPoll
    .map((task) => `${task.taskId}|${task.endpoint}|${task.taskType}`)
    .sort()
    .join('\u0000');

  useEffect(() => {
    tasksToPollRef.current = tasksToPoll;
  }, [tasksToPoll]);

  useEffect(() => {
    if (pollingTaskKey === '') return;

    const interval = setInterval(async () => {
      for (const task of tasksToPollRef.current) {
        try {
          const result = await invoke<MeshyTaskResponse>('poll_task', {
            endpoint: task.endpoint,
            taskId: task.taskId,
          });

          updateTask(task.taskId, {
            status: result.status,
            progress: result.progress,
            error: result.task_error?.message ?? null,
          });

          // When task succeeds, save to database and optionally download
          if (result.status === 'SUCCEEDED' && !savedTaskIds.current.has(task.taskId)) {
            savedTaskIds.current.add(task.taskId);

            // Save the completed task as an asset in SQLite
            try {
              const saveArgs = mapPollResultToSaveArgs(task.taskId, task.taskType, result);
              await invoke('save_completed_task', saveArgs as unknown as Record<string, unknown>);

              // Invalidate the assets query so the gallery refreshes
              qc.invalidateQueries({ queryKey: ['assets'] });

              // Auto-download if enabled and model URLs are available.
              // Nested animation/motion result URLs are flattened so
              // retarget/merge/text-to-motion tasks download too.
              const modelUrls = flattenResultUrls(result);
              if (autoDownloadOnSuccess && modelUrls) {
                try {
                  await invoke('download_asset', {
                    taskId: task.taskId,
                    modelUrls,
                    thumbnailUrl: result.thumbnail_url ?? null,
                    textureUrls: result.texture_urls ?? null,
                  });
                  qc.invalidateQueries({ queryKey: ['assets'] });
                  toast.success('Asset downloaded to local storage');
                } catch (dlError) {
                  console.error('Auto-download failed:', dlError);
                  toast.error('Asset saved but download failed');
                }
              } else {
                toast.success('Task completed — asset saved');
              }
            } catch (saveError) {
              console.error('Failed to save completed task:', saveError);
            }
          }
        } catch (error) {
          console.error(`Failed to poll task ${task.taskId}:`, error);
        }
      }
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [pollingTaskKey, pollIntervalMs, updateTask, autoDownloadOnSuccess, qc]);
}
