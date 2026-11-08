// src/hooks/useActiveTaskPolling.ts
// Tracks all active (non-terminal) tasks in the taskStore and updates them.
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
//
// WU-G (F4, decision D — SSE seam wired): the persisted `useSseStreaming`
// setting now selects the transport, per active task, inside this single
// orchestrator. The orphan `useTaskStream.ts` hook was folded in and deleted
// so exactly ONE implementation owns the save/download pipeline
// (`handleTaskSnapshot`), shared verbatim by both transports.
//
//   OFF  — interval polling, identical to the previous behavior.
//   ON   — `invoke('stream_task', { taskType, taskId })` per active task
//          (fire-and-forget; the Rust command streams until its terminal-status
//          detection and only then resolves). One `task-progress` listener
//          serves all streamed tasks: concurrent invocations share the event
//          name, so the handler demultiplexes by `snapshot.id` (the normalized
//          payload carries it). A `task-complete` listener is the terminal
//          fallback when a progress event missed the terminal status.
//
// Degradation (documented mechanism): the interval loop ALWAYS runs while
// tasks are active — it is the safety net. On each tick, a streaming task is
// skipped only while its stream is "healthy": it received a `task-progress`
// event within pollIntervalMs * 3 (the window is seeded at stream start, so a
// stream that never delivers its first event degrades after a few ticks). A
// `stream_task` rejection (network, MISSING_API_KEY, …), a stream that
// resolves, or a `task-complete` event each clear the health mark immediately,
// so the next tick polls that task normally.
//
// Dedup: `savedTaskIds` is one ref shared by both transports, so a task is
// saved (and downloaded/toasted) exactly once no matter which transport sees
// its SUCCEEDED snapshot first.

import type {
  ActiveTask,
  DownloadAssetResponse,
  TaskArtifact,
  TaskSnapshot,
} from '@lib/meshy-types';
import { invoke, onEvent } from '@lib/tauri';
import { useSettingsStore } from '@stores/settingsStore';
import { useTaskStore } from '@stores/taskStore';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { invalidateAllTags, invalidateAssetLists, patchCachedAssets } from './assetQueryKeys';

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
    // are required (non-Option i64), so an undefined value here would drop the
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

// ─── Shared snapshot → save/download pipeline (F4 dedup) ───────

/** Everything the pipeline needs from the hook. Both transports call the ONE
 * `handleTaskSnapshot` implementation below — the F4 dedup requirement. */
interface SnapshotPipelineCtx {
  updateTask: (taskId: string, updates: Partial<ActiveTask>) => void;
  qc: QueryClient;
  autoDownloadOnSuccess: boolean;
  savedTaskIds: Set<string>;
}

/**
 * The single task-tracking pipeline: update the taskStore from the snapshot,
 * then — on SUCCEEDED, at most once per task — save to SQLite and optionally
 * download. Used verbatim by the poll interval AND the SSE progress handler.
 */
async function handleTaskSnapshot(
  task: ActiveTask,
  snapshot: TaskSnapshot,
  ctx: SnapshotPipelineCtx,
): Promise<void> {
  ctx.updateTask(task.taskId, {
    status: snapshot.status,
    progress: snapshot.progress,
    error: snapshot.error?.message ?? null,
  });

  // When task succeeds, save to database and optionally download. The
  // savedTaskIds guard is shared across both transports, and the check-and-add
  // below is synchronous, so a poll tick and a stream event racing the same
  // terminal snapshot cannot double-save.
  if (snapshot.status !== 'SUCCEEDED' || ctx.savedTaskIds.has(task.taskId)) {
    return;
  }
  ctx.savedTaskIds.add(task.taskId);

  try {
    // Save the completed task as an asset in SQLite. Tauri 2 maps
    // the command's `args: SaveCompletedTaskArgs` parameter to the
    // payload key `args`, so the struct is nested, not flattened.
    const args = mapSnapshotToSaveArgs(task.taskId, task.taskType, snapshot);
    await invoke('save_completed_task', { args });

    // A newly saved task ADDS a row, so list membership and the newest-first
    // ordering both change — this is a genuine invalidation, not a patch
    // (P-05). It also feeds the tag dropdown, since a new asset can introduce
    // tags. `invalidateAssetLists` keeps the key family in one place.
    void invalidateAssetLists(ctx.qc);
    void invalidateAllTags(ctx.qc);

    // Auto-download if enabled and the task produced artifacts.
    // TPC-03/TASK-0031: every artifact is passed through — Rust
    // downloads all of them and none may be silently skipped.
    if (ctx.autoDownloadOnSuccess && snapshot.artifacts.length > 0) {
      const providerPayload = readProviderPayload(snapshot);
      try {
        const download = await invoke<DownloadAssetResponse>('download_asset', {
          taskId: task.taskId,
          artifacts: snapshot.artifacts,
          thumbnailUrl: snapshot.thumbnailUrl ?? null,
          textureUrls: Array.isArray(providerPayload.texture_urls)
            ? providerPayload.texture_urls
            : null,
        });
        // The download response carries the exact local paths it wrote, so the
        // row can be patched rather than refetched. That also removes the
        // download→invalidate→fetch race the old second invalidation had.
        patchCachedAssets(ctx.qc, task.taskId, (asset) => ({
          ...asset,
          filePaths: download.filePaths,
          // Conditional spread — see the note in useDownloadAsset.
          ...(download.thumbnailPath !== null ? { thumbnailPath: download.thumbnailPath } : {}),
        }));
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

/** A streaming task is "healthy" while it delivered a `task-progress` event
 * within the last pollIntervalMs * 3 (the window is seeded at stream start). */
function isStreamHealthy(
  lastEventAt: Map<string, number>,
  taskId: string,
  pollIntervalMs: number,
): boolean {
  const last = lastEventAt.get(taskId);
  return last !== undefined && Date.now() - last < pollIntervalMs * 3;
}

export function useActiveTaskPolling() {
  const activeTasks = useTaskStore((s) => s.activeTasks);
  const updateTask = useTaskStore((s) => s.updateTask);
  const pollIntervalMs = useSettingsStore((s) => s.pollIntervalMs);
  const useSseStreaming = useSettingsStore((s) => s.useSseStreaming);
  const autoDownloadOnSuccess = useSettingsStore((s) => s.autoDownloadOnSuccess);
  const qc = useQueryClient();

  // Track which tasks we've already saved to avoid duplicate inserts.
  // ONE ref shared by the poll loop and the SSE handler: one save per task.
  const savedTaskIds = useRef<Set<string>>(new Set());

  // taskId → timestamp of that task's last `task-progress` event (or of the
  // stream start). The interval consults this to suppress re-polling while a
  // stream is healthy; entries are seeded at stream start and cleared on
  // stream resolve/reject, `task-complete`, or effect cleanup.
  const streamLastEventAt = useRef<Map<string, number>>(new Map());

  // taskIds with a `stream_task` invocation still running. Survives effect
  // re-runs (task set changed / setting toggled) so an already-streaming task
  // is never double-invoked; the pending invocation's own handlers clear the
  // entry, and its events reach whichever listener is currently mounted.
  const liveStreams = useRef<Set<string>>(new Set());

  const tasksToPoll = Array.from(activeTasks.values()).filter(
    (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS',
  );
  const tasksToPollRef = useRef(tasksToPoll);
  const pollingTaskKey = tasksToPoll
    .map((task) => `${task.taskId}|${task.taskType}`)
    .sort()
    .join('\u0000');

  // Latest pipeline inputs, read through a ref so neither transport effect
  // needs to restart (and no stream is torn down) when a preference changes.
  const pipelineCtx: SnapshotPipelineCtx = {
    updateTask,
    qc,
    autoDownloadOnSuccess,
    savedTaskIds: savedTaskIds.current,
  };
  const pipelineCtxRef = useRef(pipelineCtx);

  useEffect(() => {
    tasksToPollRef.current = tasksToPoll;
    pipelineCtxRef.current = pipelineCtx;
  });

  // ─── Safety-net interval loop ────────────────────────────────
  // Runs whenever any task is active, regardless of the transport setting.
  // With SSE streaming on, tasks whose stream is healthy are skipped per
  // tick; everything else (streaming off, failed stream, quiet stream,
  // ended stream) polls exactly as before.
  useEffect(() => {
    if (pollingTaskKey === '') return;

    const interval = setInterval(async () => {
      for (const task of tasksToPollRef.current) {
        if (
          useSseStreaming &&
          isStreamHealthy(streamLastEventAt.current, task.taskId, pollIntervalMs)
        ) {
          continue;
        }
        try {
          // ADR-0015 TPC-05: dispatch by taskType (the serde wire value).
          const snapshot = await invoke<TaskSnapshot>('poll_task', {
            taskType: task.taskType,
            taskId: task.taskId,
          });
          await handleTaskSnapshot(task, snapshot, pipelineCtxRef.current);
        } catch (error) {
          console.error(`Failed to poll task ${task.taskId}:`, error);
        }
      }
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [pollingTaskKey, pollIntervalMs, useSseStreaming]);

  // ─── SSE streaming manager (useSseStreaming ON) ──────────────
  // One stream_task invocation per active task plus two listeners (progress
  // + terminal fallback). Cleaned up on unmount, when the active-task set
  // changes, or when the setting flips off.
  useEffect(() => {
    if (!useSseStreaming || pollingTaskKey === '') return;

    const tasks = tasksToPollRef.current;
    let disposed = false;
    const unlisteners: Array<() => void> = [];

    // Seed the health window so the interval skips these tasks until each
    // stream proves itself (or the window lapses without a single event).
    const startedAt = Date.now();
    for (const task of tasks) {
      streamLastEventAt.current.set(task.taskId, startedAt);
    }

    void onEvent<TaskSnapshot>('task-progress', (snapshot) => {
      if (disposed) return;
      // Concurrent stream_task invocations share this event name; the
      // normalized snapshot's `id` is the demultiplex key (Rust emits the
      // full TaskSnapshot per chunk, ADR-0015 TPC-02).
      if (typeof snapshot?.id !== 'string') return;
      const task = tasksToPollRef.current.find((t) => t.taskId === snapshot.id);
      // Events for unknown tasks are ignored (and never extend a health mark).
      if (!task) return;
      streamLastEventAt.current.set(task.taskId, Date.now());
      void handleTaskSnapshot(task, snapshot, pipelineCtxRef.current);
    }).then((unlisten) => {
      if (disposed) unlisten();
      else unlisteners.push(unlisten);
    });

    void onEvent<{ taskId: string; status: string }>('task-complete', (data) => {
      if (disposed || typeof data?.taskId !== 'string') return;
      // Terminal fallback: if the terminal progress snapshot was missed (or
      // arrived non-normalized), the task's health mark lapses here so the
      // next interval tick polls it and drives it through the pipeline.
      streamLastEventAt.current.delete(data.taskId);
    }).then((unlisten) => {
      if (disposed) unlisten();
      else unlisteners.push(unlisten);
    });

    for (const task of tasks) {
      if (liveStreams.current.has(task.taskId)) continue;
      liveStreams.current.add(task.taskId);
      // Fire-and-forget: the Rust command returns only at terminal
      // detection. Resolve or reject clears both the live marker and the
      // health mark, so the interval safety net takes the task over.
      invoke<void>('stream_task', { taskType: task.taskType, taskId: task.taskId })
        .then(() => {
          liveStreams.current.delete(task.taskId);
          streamLastEventAt.current.delete(task.taskId);
        })
        .catch((error) => {
          console.error(`Stream failed for task ${task.taskId}, falling back to polling:`, error);
          liveStreams.current.delete(task.taskId);
          streamLastEventAt.current.delete(task.taskId);
        });
    }

    return () => {
      disposed = true;
      for (const unlisten of unlisteners) unlisten();
      // This instance no longer listens, so its tasks must not look healthy
      // to the interval; liveStreams stays for any still-running invocation.
      for (const task of tasks) {
        streamLastEventAt.current.delete(task.taskId);
      }
    };
  }, [pollingTaskKey, useSseStreaming]);
}
