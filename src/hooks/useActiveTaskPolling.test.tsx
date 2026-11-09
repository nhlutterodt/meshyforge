// Regression tests for the ADR-0015 snapshot → save_completed_task/download_asset
// mapping.
//
// History: before step 2, poll_task returned raw snake_case Meshy JSON and
// this hook re-implemented the wire shape (MeshyTaskResponse,
// flattenResultUrls). A prior refactor had read camelCase keys from that raw
// snake_case JSON, producing undefined values and empty gallery entries — the
// LESSONS_LEARNED #10 defect class. Step 2 replaced the raw shape with the
// normalized camelCase TaskSnapshot; step 3 (WU-E) replaced the transitional
// `rebuildLegacyModelUrls` format-map rebuild with typed artifact
// pass-through: Rust owns the TPC-04 key/filename mapping, so the PRIMARY-wins
// regression tests that lived here are obsolete — the normalizer retains every
// URL by role and the download command refuses to skip any (TASK-0031).

import type { TaskArtifact, TaskSnapshot } from '@lib/meshy-types';
import { describe, expect, it } from 'vitest';

import { mapSnapshotToSaveArgs } from './useActiveTaskPolling';

function artifact(
  role: TaskArtifact['role'],
  format: string,
  url: string,
  label?: string,
): TaskArtifact {
  return { role, format, url, ...(label ? { label } : {}) };
}

function makeSnapshot(overrides: Partial<TaskSnapshot> = {}): TaskSnapshot {
  return {
    id: '01a039b2-b12c-7b56-b955-7fe20515aed0',
    taskType: 'text-to-3d-preview',
    status: 'SUCCEEDED',
    progress: 100,
    consumedCredits: 25,
    createdAt: 1787661000,
    startedAt: 1787661010,
    finishedAt: 1787661100,
    artifacts: [],
    providerPayload: {},
    ...overrides,
  };
}

const sampleSnapshot = makeSnapshot({
  thumbnailUrl: 'https://assets.meshy.ai/abc/preview.png',
  artifacts: [
    artifact('primary', 'glb', 'https://assets.meshy.ai/abc/model.glb'),
    artifact('primary', 'fbx', 'https://assets.meshy.ai/abc/model.fbx'),
  ],
  providerPayload: {
    prompt: 'a low poly chair',
    texture_urls: [{ baseColor: 'https://assets.meshy.ai/abc/tex.png' }],
  },
});

describe('mapSnapshotToSaveArgs', () => {
  it('passes artifacts through verbatim (TPC-04 mapping is Rust-side)', () => {
    const args = mapSnapshotToSaveArgs('task-1', 'text-to-3d', sampleSnapshot);
    expect(args.artifacts).toEqual(sampleSnapshot.artifacts);
    expect(args.artifacts).toHaveLength(2);
    // The legacy format map is gone.
    expect(args).not.toHaveProperty('modelUrls');
  });

  it('passes role-tagged artifacts through without dropping or merging any', () => {
    // The step-2 PRIMARY-wins tests were here; they are obsolete because the
    // Rust normalizer retains every URL by role and save/download now carry
    // the artifacts verbatim. This pins that same-format artifacts (three
    // glb, three fbx) all survive the mapping.
    const artifacts = [
      artifact('primary', 'glb', 'https://assets.meshy.ai/x/a.glb'),
      artifact('primary', 'fbx', 'https://assets.meshy.ai/x/a.fbx'),
      artifact('armature', 'fbx', 'https://assets.meshy.ai/x/arm.fbx'),
      artifact('fpsVariant', 'fbx', 'https://assets.meshy.ai/x/fps.fbx'),
      artifact('presetClip', 'glb', 'https://assets.meshy.ai/x/walking.glb', 'walking'),
      artifact('preRemeshed', 'glb', 'https://assets.meshy.ai/x/pre.glb'),
    ];
    const snapshot = makeSnapshot({ artifacts });
    const args = mapSnapshotToSaveArgs('task-1', 'animate', snapshot);
    expect(args.artifacts).toEqual(artifacts);
    expect(args.artifacts).toHaveLength(artifacts.length);
  });

  it('maps snapshot thumbnailUrl through', () => {
    const args = mapSnapshotToSaveArgs('task-1', 'text-to-3d', sampleSnapshot);
    expect(args.thumbnailUrl).toBe('https://assets.meshy.ai/abc/preview.png');
  });

  it('maps transitional providerPayload texture_urls to textureUrls', () => {
    const args = mapSnapshotToSaveArgs('task-1', 'text-to-3d', sampleSnapshot);
    expect(args.textureUrls).toEqual([{ baseColor: 'https://assets.meshy.ai/abc/tex.png' }]);
  });

  it('maps snapshot consumedCredits', () => {
    const args = mapSnapshotToSaveArgs('task-1', 'text-to-3d', sampleSnapshot);
    expect(args.consumedCredits).toBe(25);
  });

  it('maps snapshot createdAt/startedAt/finishedAt', () => {
    const args = mapSnapshotToSaveArgs('task-1', 'text-to-3d', sampleSnapshot);
    expect(args.createdAt).toBe(1787661000);
    expect(args.startedAt).toBe(1787661010);
    expect(args.finishedAt).toBe(1787661100);
  });

  it('maps transitional providerPayload prompt', () => {
    const args = mapSnapshotToSaveArgs('task-1', 'text-to-3d', sampleSnapshot);
    expect(args.prompt).toBe('a low poly chair');
  });

  it('passes taskId and taskType through', () => {
    const args = mapSnapshotToSaveArgs('task-99', 'image-to-3d', sampleSnapshot);
    expect(args.taskId).toBe('task-99');
    expect(args.taskType).toBe('image-to-3d');
  });

  // Regression test: the numeric fields previously had no fallback, so an
  // undefined value (a partial/edge-case response) would drop that key from
  // the invoke('save_completed_task', ...) JSON payload entirely.
  // SaveCompletedTaskArgs' matching Rust struct fields are required
  // (non-Option i64), so a missing key fails IPC deserialization and the task
  // silently never saves. The Rust normalizer already defaults missing/null
  // numerics to 0 (TPC-02); the `?? 0` guards here keep that contract even if
  // a snapshot arrives without them.
  it('falls back to 0 for missing numeric fields instead of dropping the IPC key', () => {
    const partial = {
      id: 'task-4',
      taskType: 'multi-image-to-3d',
      status: 'SUCCEEDED',
      progress: undefined,
      consumedCredits: undefined,
      createdAt: undefined,
      startedAt: undefined,
      finishedAt: undefined,
      artifacts: [],
      providerPayload: {},
    } as unknown as TaskSnapshot;
    const args = mapSnapshotToSaveArgs('task-4', 'multi-image-to-3d', partial);
    expect(args.progress).toBe(0);
    expect(args.consumedCredits).toBe(0);
    expect(args.createdAt).toBe(0);
    expect(args.startedAt).toBe(0);
    expect(args.finishedAt).toBe(0);
    // None of these numeric fields may be `undefined` — JSON.stringify
    // (used by invoke) drops undefined-valued keys, which is exactly
    // what broke save_completed_task before.
    for (const key of [
      'progress',
      'consumedCredits',
      'createdAt',
      'startedAt',
      'finishedAt',
    ] as const) {
      expect(args[key]).not.toBeUndefined();
    }
  });

  it('handles missing optional fields with null/empty fallbacks', () => {
    const minimal = makeSnapshot();
    const args = mapSnapshotToSaveArgs('task-2', 'text-to-3d', minimal);
    expect(args.prompt).toBeNull();
    expect(args.thumbnailUrl).toBeNull();
    expect(args.artifacts).toEqual([]);
    expect(args.textureUrls).toBeNull();
  });

  // Regression test: a prior refactor (ADR-0004, PR #2) renamed this
  // object's `meshyType` key to `taskType` but left the Rust command's
  // parameter as `meshy_type` — Tauri's IPC layer matches camelCase JS keys
  // to snake_case Rust params, so the missing key made every
  // `invoke('save_completed_task', ...)` reject with a deserialization error,
  // caught by a bare `console.error`, so completed tasks silently never
  // saved to the gallery.
  //
  // This pins the exact key set of the `args` payload sent over IPC. If it
  // changes, the Rust `SaveCompletedTaskArgs` struct in
  // src-tauri/src/commands/assets.rs — and its contract test
  // `save_completed_task_args_deserialize_frontend_payload_shape` — must be
  // updated to match, or completed tasks will stop saving again.
  it('sends exactly the argument keys save_completed_task expects over IPC', () => {
    const args = mapSnapshotToSaveArgs('task-1', 'multi-image-to-3d', sampleSnapshot);
    expect(Object.keys(args).sort()).toEqual(
      [
        'taskId',
        'taskType',
        'prompt',
        'aiModel',
        'status',
        'progress',
        'consumedCredits',
        'thumbnailUrl',
        'artifacts',
        'textureUrls',
        'createdAt',
        'startedAt',
        'finishedAt',
      ].sort(),
    );
  });

  it('handles FAILED status with snapshot error', () => {
    const failed = makeSnapshot({
      id: 'task-3',
      status: 'FAILED',
      progress: 50,
      error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded' },
      consumedCredits: 0,
    });
    const args = mapSnapshotToSaveArgs('task-3', 'text-to-3d', failed);
    expect(args.status).toBe('FAILED');
    expect(args.prompt).toBeNull();
  });

  it("maps a text-to-motion snapshot's motion artifacts through", () => {
    const snapshot = makeSnapshot({
      id: 'task-motion',
      taskType: 'text-to-motion',
      consumedCredits: 10,
      artifacts: [artifact('motion', 'fbx', 'https://assets.meshy.ai/x/motion.fbx')],
    });
    const args = mapSnapshotToSaveArgs('task-motion', 'text-to-motion', snapshot);
    expect(args.thumbnailUrl).toBeNull();
    expect(args.artifacts).toEqual([
      { role: 'motion', format: 'fbx', url: 'https://assets.meshy.ai/x/motion.fbx' },
    ]);
  });
});
