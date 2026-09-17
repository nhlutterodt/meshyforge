// Regression tests for snake_case Meshy API → save_completed_task mapping.
//
// Bug: Previously the polling hook read camelCase keys (modelUrls,
// thumbnailUrl, etc.) from raw snake_case JSON, producing undefined
// values and empty gallery entries. This test ensures the mapping
// reads the correct snake_case fields from MeshyTaskResponse.

import { describe, expect, it } from 'vitest';

import type { MeshyTaskResponse } from './useActiveTaskPolling';
import { flattenResultUrls, mapPollResultToSaveArgs } from './useActiveTaskPolling';

const sampleResponse: MeshyTaskResponse = {
  id: '01a039b2-b12c-7b56-b955-7fe20515aed0',
  status: 'SUCCEEDED',
  progress: 100,
  prompt: 'a low poly chair',
  model_urls: {
    glb: 'https://assets.meshy.ai/abc/model.glb',
    fbx: 'https://assets.meshy.ai/abc/model.fbx',
  },
  thumbnail_url: 'https://assets.meshy.ai/abc/preview.png',
  texture_urls: [{ baseColor: 'https://assets.meshy.ai/abc/tex.png' }],
  consumed_credits: 25,
  created_at: 1787661000,
  started_at: 1787661010,
  finished_at: 1787661100,
};

describe('mapPollResultToSaveArgs', () => {
  it('maps snake_case model_urls to modelUrls', () => {
    const args = mapPollResultToSaveArgs('task-1', 'text-to-3d', sampleResponse);
    expect(args.modelUrls).toEqual(sampleResponse.model_urls);
    expect(args.modelUrls?.glb).toBe('https://assets.meshy.ai/abc/model.glb');
  });

  it('maps snake_case thumbnail_url to thumbnailUrl', () => {
    const args = mapPollResultToSaveArgs('task-1', 'text-to-3d', sampleResponse);
    expect(args.thumbnailUrl).toBe('https://assets.meshy.ai/abc/preview.png');
  });

  it('maps snake_case texture_urls to textureUrls', () => {
    const args = mapPollResultToSaveArgs('task-1', 'text-to-3d', sampleResponse);
    expect(args.textureUrls).toEqual(sampleResponse.texture_urls);
  });

  it('maps snake_case consumed_credits to consumedCredits', () => {
    const args = mapPollResultToSaveArgs('task-1', 'text-to-3d', sampleResponse);
    expect(args.consumedCredits).toBe(25);
  });

  it('maps snake_case created_at/started_at/finished_at', () => {
    const args = mapPollResultToSaveArgs('task-1', 'text-to-3d', sampleResponse);
    expect(args.createdAt).toBe(1787661000);
    expect(args.startedAt).toBe(1787661010);
    expect(args.finishedAt).toBe(1787661100);
  });

  it('passes taskId and TaskType through', () => {
    const args = mapPollResultToSaveArgs('task-99', 'image-to-3d', sampleResponse);
    expect(args.taskId).toBe('task-99');
    expect(args.taskType).toBe('image-to-3d');
  });

  // Regression test: created_at/started_at/finished_at/progress/
  // consumed_credits previously had no fallback, so an undefined value
  // (a partial/edge-case poll response — MeshyTaskResponse is a type
  // assertion, not a runtime-validated schema) would drop that key from
  // the invoke('save_completed_task', ...) JSON payload entirely.
  // save_completed_task's matching Rust parameters are required
  // (non-Option i64), so the missing key fails IPC deserialization and
  // the task silently never saves — the same failure class as the
  // meshyType/taskType bug this file guards against, just triggered by
  // a missing value instead of a renamed key.
  it('falls back to 0 for missing numeric fields instead of dropping the IPC key', () => {
    const partial = {
      id: 'task-4',
      status: 'SUCCEEDED',
    } as MeshyTaskResponse;
    const args = mapPollResultToSaveArgs('task-4', 'multi-image-to-3d', partial);
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
    const minimal: MeshyTaskResponse = {
      id: 'task-2',
      status: 'SUCCEEDED',
      progress: 100,
      consumed_credits: 10,
      created_at: 1000,
      started_at: 1010,
      finished_at: 1100,
    };
    const args = mapPollResultToSaveArgs('task-2', 'text-to-3d', minimal);
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
    const args = mapPollResultToSaveArgs('task-1', 'multi-image-to-3d', sampleResponse);
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

  it('handles FAILED status with task_error', () => {
    const failed: MeshyTaskResponse = {
      id: 'task-3',
      status: 'FAILED',
      progress: 50,
      task_error: { message: 'Rate limit exceeded', code: 'RATE_LIMIT' },
      consumed_credits: 0,
      created_at: 1000,
      started_at: 1010,
      finished_at: 1100,
    };
    const args = mapPollResultToSaveArgs('task-3', 'text-to-3d', failed);
    expect(args.status).toBe('FAILED');
    expect(args.prompt).toBeNull();
  });
});

describe('flattenResultUrls — nested result + null tolerance (ADR-0012)', () => {
  it('flattens nested animation result URLs into canonical format keys', () => {
    const result: MeshyTaskResponse = {
      id: 'task-anim',
      status: 'SUCCEEDED',
      progress: 100,
      consumed_credits: 3,
      created_at: 1000,
      started_at: 1010,
      finished_at: 1100,
      result: {
        animation_glb_url: 'https://assets.meshy.ai/x/a.glb',
        animation_fbx_url: null,
        processed_usdz_url: null,
      },
    };
    expect(flattenResultUrls(result)).toEqual({ glb: 'https://assets.meshy.ai/x/a.glb' });
  });

  it('flattens text-to-motion prime result to an fbx key', () => {
    const result: MeshyTaskResponse = {
      id: 'task-motion',
      status: 'SUCCEEDED',
      progress: 100,
      consumed_credits: 10,
      created_at: 1000,
      started_at: 1010,
      finished_at: 1100,
      result: {
        motion_url: 'https://assets.meshy.ai/x/motion.fbx',
        motion_format: 'fbx',
        duration_ms: 2500,
        mode: 'prime',
      },
    };
    expect(flattenResultUrls(result)).toEqual({ fbx: 'https://assets.meshy.ai/x/motion.fbx' });
  });

  it('flattens text-to-motion swift result to a bvh key', () => {
    const result: MeshyTaskResponse = {
      id: 'task-motion',
      status: 'SUCCEEDED',
      progress: 100,
      consumed_credits: 3,
      created_at: 1000,
      started_at: 1010,
      finished_at: 1100,
      result: {
        motion_url: 'https://assets.meshy.ai/x/motion.bvh',
        motion_format: 'bvh',
        duration_ms: 2500,
        mode: 'swift',
      },
    };
    expect(flattenResultUrls(result)).toEqual({ bvh: 'https://assets.meshy.ai/x/motion.bvh' });
  });

  it('returns null for a no-thumbnail, no-result, no-model_urls task', () => {
    const result: MeshyTaskResponse = {
      id: 'task-empty',
      status: 'SUCCEEDED',
      progress: 100,
      consumed_credits: 0,
      created_at: 1000,
      started_at: 1010,
      finished_at: 1100,
      result: null,
    };
    expect(flattenResultUrls(result)).toBeNull();
  });

  it('passes top-level model_urls through unchanged', () => {
    const result: MeshyTaskResponse = {
      id: 'task-3d',
      status: 'SUCCEEDED',
      progress: 100,
      model_urls: { glb: 'https://assets.meshy.ai/x/model.glb' },
      consumed_credits: 25,
      created_at: 1000,
      started_at: 1010,
      finished_at: 1100,
    };
    expect(flattenResultUrls(result)).toEqual({ glb: 'https://assets.meshy.ai/x/model.glb' });
  });

  it('mapPollResultToSaveArgs keeps thumbnailUrl null and flattens motion URLs', () => {
    const result: MeshyTaskResponse = {
      id: 'task-motion',
      status: 'SUCCEEDED',
      progress: 100,
      consumed_credits: 10,
      created_at: 1000,
      started_at: 1010,
      finished_at: 1100,
      result: {
        motion_url: 'https://assets.meshy.ai/x/motion.fbx',
        motion_format: 'fbx',
        duration_ms: 2500,
        mode: 'prime',
      },
    };
    const args = mapPollResultToSaveArgs('task-motion', 'text-to-motion', result);
    expect(args.thumbnailUrl).toBeNull();
    expect(args.modelUrls).toEqual({ fbx: 'https://assets.meshy.ai/x/motion.fbx' });
  });

  it('keeps the primary animation_fbx_url when processed fbx variants are present', () => {
    const result: MeshyTaskResponse = {
      id: 'task-anim2',
      status: 'SUCCEEDED',
      progress: 100,
      consumed_credits: 3,
      created_at: 1000,
      started_at: 1010,
      finished_at: 1100,
      result: {
        animation_glb_url: 'https://assets.meshy.ai/x/a.glb',
        animation_fbx_url: 'https://assets.meshy.ai/x/a.fbx',
        processed_armature_fbx_url: 'https://assets.meshy.ai/x/arm.fbx',
        processed_animation_fps_fbx_url: 'https://assets.meshy.ai/x/fps.fbx',
      },
    };
    expect(flattenResultUrls(result)).toEqual({
      glb: 'https://assets.meshy.ai/x/a.glb',
      fbx: 'https://assets.meshy.ai/x/a.fbx',
    });
  });

  it('fills the processed fbx variant only when the primary fbx is missing', () => {
    const result: MeshyTaskResponse = {
      id: 'task-anim3',
      status: 'SUCCEEDED',
      progress: 100,
      consumed_credits: 3,
      created_at: 1000,
      started_at: 1010,
      finished_at: 1100,
      result: {
        animation_glb_url: 'https://assets.meshy.ai/x/a.glb',
        animation_fbx_url: null,
        processed_armature_fbx_url: 'https://assets.meshy.ai/x/arm.fbx',
      },
    };
    expect(flattenResultUrls(result)).toEqual({
      glb: 'https://assets.meshy.ai/x/a.glb',
      fbx: 'https://assets.meshy.ai/x/arm.fbx',
    });
  });

  it('maps a bvh motion_url to the fbx key when motion_format is missing (documented gap)', () => {
    const result: MeshyTaskResponse = {
      id: 'task-motion-bvh',
      status: 'SUCCEEDED',
      progress: 100,
      consumed_credits: 3,
      created_at: 1000,
      started_at: 1010,
      finished_at: 1100,
      result: {
        motion_url: 'https://assets.meshy.ai/x/motion.bvh',
        duration_ms: 2500,
        mode: 'swift',
      },
    };
    expect(flattenResultUrls(result)).toEqual({
      fbx: 'https://assets.meshy.ai/x/motion.bvh',
    });
  });
});
