// src/hooks/useActiveTaskPolling.ts
// Polls all active (non-terminal) tasks in the taskStore and updates them.
// When a task reaches SUCCEEDED, saves it to SQLite and optionally downloads.
//
// ADR-0015 step 2 (TPC-02): poll_task returns the normalized camelCase
// TaskSnapshot. The snake_case `MeshyTaskResponse` / `flattenResultUrls`
// wire-knowledge copies are deleted; the snapshot's role-tagged `artifacts`
// are the single source for download keys.

import type { TaskArtifact, TaskSnapshot } from '@lib/meshy-types';
import { invoke } from '@lib/tauri';
import { useSettingsStore } from '@stores/settingsStore';
import { useTaskStore } from '@stores/taskStore';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

// ─── Transitional snapshot → legacy `modelUrls` rebuild ─────────
//
// `download_asset`/`save_completed_task` still take the legacy
// `Record<format, url>` shape (the artifacts API is ADR-0015 step 3/WU-E).
// This rebuilds it from the normalized artifacts with the exact precedence
// the deleted `flattenResultUrls` had: PRIMARY wins per format, other roles
// fill gaps only. Preset clips never filled a bare key in the old map (a
// walking clip is not `model.glb`), so they are skipped here until step 3
// gives them a role-qualified key. `preRemeshed` keeps its role-qualified
// legacy key (`pre_remeshed_glb`), which
// `commands::validation::model_filename` already accepts. Returns null when
// there are no URLs at all (so save_completed_task keeps `modelUrls: null`
// rather than `{}`).
export function rebuildLegacyModelUrls(artifacts: TaskArtifact[]): Record<string, string> | null {
  const urls: Record<string, string> = {};
  for (const artifact of artifacts) {
    if (artifact.role === 'presetClip') continue;
    const key =
      artifact.role === 'preRemeshed' && artifact.format === 'glb'
        ? 'pre_remeshed_glb'
        : artifact.format;
    // PRIMARY wins over variants; variants fill only gaps.
    if (artifact.role === 'primary' || urls[key] === undefined) {
      urls[key] = artifact.url;
    }
  }
  return Object.keys(urls).length > 0 ? urls : null;
}

// ─── Snapshot → save_completed_task args mapper ────────────────
// Extracted for unit testing. Transitional per ADR-0015 TPC-06: `prompt` and
// `textureUrls` have no snapshot field yet (step 3 replaces this args shape),
// so they are read from the transitional providerPayload and retire with it.
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
    // Fall back to 0 for numeric fields: save_completed_task's Rust
    // parameters are required (non-Option), so an undefined value here
    // would drop the key from the invoke() JSON payload entirely and
    // make the whole save silently fail deserialization (see the
    // meshyType/taskType regression this file guards against). The
    // snapshot already normalizes missing/null numerics to 0 in Rust.
    progress: snapshot.progress ?? 0,
    consumedCredits: snapshot.consumedCredits ?? 0,
    thumbnailUrl: snapshot.thumbnailUrl ?? null,
    modelUrls: rebuildLegacyModelUrls(snapshot.artifacts),
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

            // Save the completed task as an asset in SQLite
            try {
              const saveArgs = mapSnapshotToSaveArgs(task.taskId, task.taskType, snapshot);
              await invoke('save_completed_task', saveArgs as unknown as Record<string, unknown>);

              // Invalidate the assets query so the gallery refreshes
              qc.invalidateQueries({ queryKey: ['assets'] });

              // Auto-download if enabled and model URLs are available. The
              // legacy format map is rebuilt from role-tagged artifacts so
              // rig/animate/motion tasks download too (step 3 replaces this
              // call's arg shape with the artifacts API).
              const modelUrls = rebuildLegacyModelUrls(snapshot.artifacts);
              if (autoDownloadOnSuccess && modelUrls) {
                const providerPayload = readProviderPayload(snapshot);
                try {
                  await invoke('download_asset', {
                    taskId: task.taskId,
                    modelUrls,
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
