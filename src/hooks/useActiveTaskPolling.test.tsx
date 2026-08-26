// Regression tests for snake_case Meshy API → save_completed_task mapping.
//
// Bug: Previously the polling hook read camelCase keys (modelUrls,
// thumbnailUrl, etc.) from raw snake_case JSON, producing undefined
// values and empty gallery entries. This test ensures the mapping
// reads the correct snake_case fields from MeshyTaskResponse.

import { describe, expect, it } from 'vitest';

import type { MeshyTaskResponse } from './useActiveTaskPolling';
import { mapPollResultToSaveArgs } from './useActiveTaskPolling';

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
