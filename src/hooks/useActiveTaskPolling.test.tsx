// Regression tests for the ADR-0015 step-2 snapshot → save_completed_task
// mapping.
//
// History: before step 2, poll_task returned raw snake_case Meshy JSON and
// this hook re-implemented the wire shape (MeshyTaskResponse,
// flattenResultUrls). A prior refactor had read camelCase keys from that raw
// snake_case JSON, producing undefined values and empty gallery entries —
// the LESSONS_LEARNED #10 defect class. Step 2 replaces the raw shape with
// the normalized camelCase TaskSnapshot; these tests pin the snapshot-side
// mapping, including the PRIMARY-wins download behavior the old
// flattenResultUrls regression tests covered (fixtures rewritten to
// snapshot form, expectations unchanged).

import type { TaskArtifact, TaskSnapshot } from '@lib/meshy-types';
import { describe, expect, it } from 'vitest';

import { mapSnapshotToSaveArgs, rebuildLegacyModelUrls } from './useActiveTaskPolling';

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
  it('maps primary artifacts to the legacy modelUrls format map', () => {
    const args = mapSnapshotToSaveArgs('task-1', 'text-to-3d', sampleSnapshot);
    expect(args.modelUrls).toEqual({
      glb: 'https://assets.meshy.ai/abc/model.glb',
      fbx: 'https://assets.meshy.ai/abc/model.fbx',
    });
    expect(args.modelUrls?.glb).toBe('https://assets.meshy.ai/abc/model.glb');
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
  // save_completed_task's matching Rust parameters are required (non-Option
  // i64), so the missing key fails IPC deserialization and the task silently
  // never saves. The Rust normalizer already defaults missing/null numerics
  // to 0 (TPC-02); the `?? 0` guards here keep that contract even if a
  // snapshot arrives without them.
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

  it('handles missing optional fields with null fallbacks', () => {
    const minimal = makeSnapshot();
    const args = mapSnapshotToSaveArgs('task-2', 'text-to-3d', minimal);
    expect(args.prompt).toBeNull();
    expect(args.thumbnailUrl).toBeNull();
    expect(args.modelUrls).toBeNull();
    expect(args.textureUrls).toBeNull();
  });

  // Regression test: a prior refactor (ADR-0004, PR #2) renamed this
  // object's `meshyType` key to `taskType` but left the Rust
  // `save_completed_task` command's parameter as `meshy_type: String`.
  // Tauri's IPC layer matches camelCase JS keys to snake_case Rust params
  // ('taskType' JS <-> 'task_type' Rust), so the missing `meshyType` key
  // made every `invoke('save_completed_task', ...)` call reject with a
  // deserialization error — caught by a bare `console.error`, so
  // completed tasks silently never saved to the gallery.
  //
  // This pins the exact key set sent over IPC. If it changes, the Rust
  // command's parameter list in src-tauri/src/commands/assets.rs
  // (`save_completed_task`) — and its mirrored contract test
  // `save_completed_task_command_args_match_frontend_payload_shape` —
  // must be updated to match, or completed tasks will stop saving again.
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
        'modelUrls',
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
});

describe('rebuildLegacyModelUrls — nested lanes + null tolerance (ADR-0012/#13 fixtures in snapshot form)', () => {
  it('maps animation result artifacts to canonical format keys', () => {
    const artifacts = [artifact('primary', 'glb', 'https://assets.meshy.ai/x/a.glb')];
    expect(rebuildLegacyModelUrls(artifacts)).toEqual({ glb: 'https://assets.meshy.ai/x/a.glb' });
  });

  it('maps a text-to-motion prime artifact to an fbx key', () => {
    const artifacts = [artifact('motion', 'fbx', 'https://assets.meshy.ai/x/motion.fbx')];
    expect(rebuildLegacyModelUrls(artifacts)).toEqual({
      fbx: 'https://assets.meshy.ai/x/motion.fbx',
    });
  });

  it('maps a text-to-motion swift artifact to a bvh key', () => {
    const artifacts = [artifact('motion', 'bvh', 'https://assets.meshy.ai/x/motion.bvh')];
    expect(rebuildLegacyModelUrls(artifacts)).toEqual({
      bvh: 'https://assets.meshy.ai/x/motion.bvh',
    });
  });

  it('returns null for a no-thumbnail, no-artifact task', () => {
    expect(rebuildLegacyModelUrls([])).toBeNull();
  });

  it('passes text/image-to-3d primary artifacts through unchanged', () => {
    const artifacts = [artifact('primary', 'glb', 'https://assets.meshy.ai/x/model.glb')];
    expect(rebuildLegacyModelUrls(artifacts)).toEqual({
      glb: 'https://assets.meshy.ai/x/model.glb',
    });
  });

  it('mapSnapshotToSaveArgs keeps thumbnailUrl null and flattens motion artifacts', () => {
    const snapshot = makeSnapshot({
      id: 'task-motion',
      taskType: 'text-to-motion',
      consumedCredits: 10,
      artifacts: [artifact('motion', 'fbx', 'https://assets.meshy.ai/x/motion.fbx')],
    });
    const args = mapSnapshotToSaveArgs('task-motion', 'text-to-motion', snapshot);
    expect(args.thumbnailUrl).toBeNull();
    expect(args.modelUrls).toEqual({ fbx: 'https://assets.meshy.ai/x/motion.fbx' });
  });

  it('keeps the primary animation fbx when processed fbx variants are present', () => {
    // The Rust normalizer retains every URL by role (armature/fpsVariant no
    // longer collide with the primary); the legacy rebuild must still pick
    // the PRIMARY for the bare `fbx` key — the exact old download behavior.
    const artifacts = [
      artifact('primary', 'glb', 'https://assets.meshy.ai/x/a.glb'),
      artifact('primary', 'fbx', 'https://assets.meshy.ai/x/a.fbx'),
      artifact('armature', 'fbx', 'https://assets.meshy.ai/x/arm.fbx'),
      artifact('fpsVariant', 'fbx', 'https://assets.meshy.ai/x/fps.fbx'),
    ];
    expect(rebuildLegacyModelUrls(artifacts)).toEqual({
      glb: 'https://assets.meshy.ai/x/a.glb',
      fbx: 'https://assets.meshy.ai/x/a.fbx',
    });
  });

  it('fills the fbx key from a variant only when the primary fbx is missing', () => {
    const artifacts = [
      artifact('primary', 'glb', 'https://assets.meshy.ai/x/a.glb'),
      artifact('armature', 'fbx', 'https://assets.meshy.ai/x/arm.fbx'),
    ];
    expect(rebuildLegacyModelUrls(artifacts)).toEqual({
      glb: 'https://assets.meshy.ai/x/a.glb',
      fbx: 'https://assets.meshy.ai/x/arm.fbx',
    });
  });

  it('maps a bvh motion artifact to the bvh key (format is authoritative)', () => {
    // The old flattenResultUrls defaulted a missing motion_format to fbx;
    // the Rust normalizer resolved that at snapshot time (TPC-03), so the
    // rebuild just honors the artifact's format.
    const artifacts = [artifact('motion', 'bvh', 'https://assets.meshy.ai/x/motion.bvh')];
    expect(rebuildLegacyModelUrls(artifacts)).toEqual({
      bvh: 'https://assets.meshy.ai/x/motion.bvh',
    });
  });

  it('keeps the role-qualified legacy key for preRemeshed artifacts', () => {
    // TPC-04 precedent: model_filename accepts `pre_remeshed_glb`.
    const artifacts = [
      artifact('primary', 'glb', 'https://assets.meshy.ai/x/model.glb'),
      artifact('preRemeshed', 'glb', 'https://assets.meshy.ai/x/pre.glb'),
    ];
    expect(rebuildLegacyModelUrls(artifacts)).toEqual({
      glb: 'https://assets.meshy.ai/x/model.glb',
      pre_remeshed_glb: 'https://assets.meshy.ai/x/pre.glb',
    });
  });

  it('lets a later primary overwrite an earlier variant for the same format', () => {
    // PRIMARY wins regardless of artifact order.
    const artifacts = [
      artifact('formatVariant', 'usdz', 'https://assets.meshy.ai/x/variant.usdz'),
      artifact('primary', 'usdz', 'https://assets.meshy.ai/x/model.usdz'),
    ];
    expect(rebuildLegacyModelUrls(artifacts)).toEqual({
      usdz: 'https://assets.meshy.ai/x/model.usdz',
    });
  });

  it('ignores presetClip artifacts for the bare legacy keys', () => {
    // The legacy format map cannot hold two glb artifacts; preset clips
    // (walking/running) were never downloadable through it — they survive
    // in the snapshot for step 3's artifacts API.
    const artifacts = [
      artifact('primary', 'glb', 'https://assets.meshy.ai/x/a.glb'),
      artifact('presetClip', 'glb', 'https://assets.meshy.ai/x/walking.glb', 'walking'),
    ];
    expect(rebuildLegacyModelUrls(artifacts)).toEqual({ glb: 'https://assets.meshy.ai/x/a.glb' });
  });
});
