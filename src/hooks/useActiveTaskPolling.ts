// src/hooks/useActiveTaskPolling.ts
// Polls all active (non-terminal) tasks in the taskStore and updates them.
// When a task reaches SUCCEEDED, saves it to SQLite and optionally downloads.
//
// ADR-0015 step 2 (TPC-02): poll_task returns the normalized camelCase
// TaskSnapshot. The snake_case `MeshyTaskResponse` / `flattenResultUrls`
// wire-knowledge copies are deleted; the snapshot's role-tagged `artifacts`
// are the single source for download keys.
//
// ADR-0015 step 3 (TPC-04): save_completed_task and download_asset take the
// typed artifacts directly — the transitional `rebuildLegacyModelUrls`
// format-map rebuild is deleted, along with the step-2 PRIMARY-wins logic it
// existed to emulate. The Rust command layer owns the key/filename mapping.

import type { TaskArtifact, TaskSnapshot } from '@lib/meshy-types';
import { invoke } from '@lib/tauri';
import { useSettingsStore } from '@stores/settingsStore';
import { useTaskStore } from '@stores/taskStore';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

// ─── Snapshot → save_completed_task args mapper ────────────────
// Extracted for unit testing. Mirrors Rust `commands::assets::SaveCompletedTaskArgs`
// (camelCase serde). Tauri 2 extracts each command parameter by its camelCase
// key, so the frontend invokes with `{ args }` — NOT flattened top-level keys.
//
// Transitional per ADR-0015 TPC-06: `prompt` and `textureUrls` have no
// snapshot field yet and are still read from providerPayload; they retire
// with it in step 4.
export interface SaveCompletedTaskArgs {
  taskId: string;
  taskType: string;
  prompt: string | null;
  aiModel: null;
  status: string;
  progress: number;
  consumedCredits: number;
  thumbnailUrl: string | null;
  artifacts: TaskArtifact[];
  textureUrls: Array<Record<string, string | null>> | null;
  createdAt: number;
  startedAt: number;
  finishedAt: number;
}

export function mapSnapshotToSaveArgs(
  taskId: string,
  taskType: string,
  snapshot: TaskSnapshot,
  providerPayload: Record<string, unknown> = readProviderPayload(snapshot),
): SaveCompletedTaskArgs {
  return {
    taskId,
    taskType,
    // Transitional (TPC-06): prompt/texture_urls have no snapshot field yet.
    prompt: typeof providerPayload.prompt === 'string' ? providerPayload.prompt : null,
    aiModel: null,
    status: snapshot.status,
    // Fall back to 0 for numeric fields: SaveCompletedTaskArgs' Rust fields
    // are required (non-Option), so an undefined value here would drop the
    // key from the invoke() JSON payload entirely and make the whole save
    // silently fail deserialization (see the meshyType/taskType regression
    // this file guards against). The snapshot already normalizes missing/null
    // numerics to 0 in Rust.
    progress: snapshot.progress ?? 0,
    consumedCredits: snapshot.consumedCredits ?? 0,
    thumbnailUrl: snapshot.thumbnailUrl ?? null,
    // TPC-03/TPC-04: the artifacts pass through verbatim; Rust owns the
    // storage-key mapping (primary keeps the bare format key).
    artifacts: snapshot.artifacts,
    textureUrls: Array.isArray(providerPayload.texture_urls)
      ? (providerPayload.texture_urls as Array<Record<string, string | null>>)
      : null,
    createdAt: snapshot.createdAt ?? 0,
    startedAt: snapshot.startedAt ?? 0,
    finishedAt: snapshot.finishedAt ?? 0,
  };
}

/** The raw provider JSON carried on the snapshot. Typed `unknown` per
 * TPC-06; readers must tolerate a non-object payload. */
function readProviderPayload(snapshot: TaskSnapshot): Record<string, unknown> {
  return typeof snapshot.providerPayload === 'object' && snapshot.providerPayload !== null
    ? (snapshot.providerPayload as Record<string, unknown>)
    : {};
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
    .map((task) => `${task.taskId}|${task.taskType}`)
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
          // ADR-0015 TPC-05: dispatch by taskType (the serde wire value).
          const snapshot = await invoke<TaskSnapshot>('poll_task', {
            taskType: task.taskType,
            taskId: task.taskId,
          });

          updateTask(task.taskId, {
            status: snapshot.status,
            progress: snapshot.progress,
            error: snapshot.error?.message ?? null,
          });

          // When task succeeds, save to database and optionally download
          if (snapshot.status === 'SUCCEEDED' && !savedTaskIds.current.has(task.taskId)) {
            savedTaskIds.current.add(task.taskId);

            // Save the completed task as an asset in SQLite. Tauri 2 maps
            // the command's `args: SaveCompletedTaskArgs` parameter to the
            // payload key `args`, so the struct is nested, not flattened.
            try {
              const args = mapSnapshotToSaveArgs(task.taskId, task.taskType, snapshot);
              await invoke('save_completed_task', { args });

              // Invalidate the assets query so the gallery refreshes
              qc.invalidateQueries({ queryKey: ['assets'] });

              // Auto-download if enabled and the task produced artifacts.
              // TPC-03/TASK-0031: every artifact is passed through — Rust
              // downloads all of them and none may be silently skipped.
              if (autoDownloadOnSuccess && snapshot.artifacts.length > 0) {
                const providerPayload = readProviderPayload(snapshot);
                try {
                  await invoke('download_asset', {
                    taskId: task.taskId,
                    artifacts: snapshot.artifacts,
                    thumbnailUrl: snapshot.thumbnailUrl ?? null,
                    textureUrls: Array.isArray(providerPayload.texture_urls)
                      ? providerPayload.texture_urls
                      : null,
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
