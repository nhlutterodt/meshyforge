// Regression tests for assetUrl — ensures remote URLs pass through
// and local paths are converted via convertFileSrc.
//
// Context: Norton quarantined a Vite prebundle, but the real gallery
// bug was that assetUrl() was wrapping https://assets.meshy.ai URLs
// in convertFileSrc(), producing invalid asset.localhost paths that
// Tauri's asset protocol rejected.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @tauri-apps/api/core and event so we don't need a Tauri runtime
const mockInvoke = vi.hoisted(() => vi.fn());
const mockConvertFileSrc = vi.hoisted(() =>
  vi.fn((path: string) => `https://asset.localhost/${path.replace(/^[\\/]/, '')}`),
);
const mockListen = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
  convertFileSrc: mockConvertFileSrc,
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: mockListen,
}));

// Import after mock is set up
import { assetUrl, invoke, onEvent } from './tauri';

describe('assetUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes through https URLs unchanged', () => {
    const remote =
      'https://assets.meshy.ai/01f788f9/tasks/01a039b2/output/preview.png?Expires=123&Signature=abc';
    expect(assetUrl(remote)).toBe(remote);
  });

  it('passes through http URLs unchanged', () => {
    const remote = 'http://example.com/model.glb';
    expect(assetUrl(remote)).toBe(remote);
  });

  it('passes through data: URIs unchanged', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgo=';
    expect(assetUrl(dataUri)).toBe(dataUri);
  });

  it('converts absolute local paths via convertFileSrc', () => {
    const result = assetUrl('/home/user/assets/model.glb');
    expect(result).toContain('asset.localhost');
    expect(result).toContain('model.glb');
  });

  it('converts Windows-style local paths via convertFileSrc', () => {
    const result = assetUrl('C:\\Users\\neils\\AppData\\assets\\thumb.png');
    expect(result).toContain('asset.localhost');
  });

  it('does not wrap remote URLs in asset.localhost', () => {
    const remote = 'https://assets.meshy.ai/thumb.png';
    const result = assetUrl(remote);
    expect(result).not.toContain('asset.localhost');
  });
});

describe('invoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the resolved value on success', async () => {
    mockInvoke.mockResolvedValue(42);
    const result = await invoke<number>('get_credit_balance');
    expect(result).toBe(42);
    expect(mockInvoke).toHaveBeenCalledWith('get_credit_balance', undefined);
  });

  it('passes args through to the underlying invoke', async () => {
    mockInvoke.mockResolvedValue({ ok: true });
    await invoke('create_text_to_3d', { body: { prompt: 'dragon' } });
    expect(mockInvoke).toHaveBeenCalledWith('create_text_to_3d', {
      body: { prompt: 'dragon' },
    });
  });

  it('throws a MeshyFrontendError when the error is a JSON string', async () => {
    mockInvoke.mockRejectedValue(
      JSON.stringify({ code: 'API_ERROR_402', message: 'Insufficient credits', details: 'plan' }),
    );
    await expect(invoke('create_text_to_3d')).rejects.toEqual({
      code: 'API_ERROR_402',
      message: 'Insufficient credits',
      details: 'plan',
    });
  });

  it('throws an error with UNKNOWN code when the error string is not JSON', async () => {
    mockInvoke.mockRejectedValue('something went wrong');
    await expect(invoke('create_text_to_3d')).rejects.toEqual({
      code: 'UNKNOWN',
      message: 'something went wrong',
    });
  });

  it('throws an error with UNKNOWN code and generic message for non-string errors', async () => {
    mockInvoke.mockRejectedValue(new Error('network'));
    await expect(invoke('create_text_to_3d')).rejects.toEqual({
      code: 'UNKNOWN',
      message: 'An unknown error occurred',
    });
  });

  it('throws an error with UNKNOWN code for null errors', async () => {
    mockInvoke.mockRejectedValue(null);
    await expect(invoke('create_text_to_3d')).rejects.toEqual({
      code: 'UNKNOWN',
      message: 'An unknown error occurred',
    });
  });

  it('uses the original error string as message when JSON.parse succeeds but code/message are missing', async () => {
    mockInvoke.mockRejectedValue(JSON.stringify({ unrelated: 'field' }));
    await expect(invoke('create_text_to_3d')).rejects.toEqual({
      code: 'UNKNOWN',
      message: JSON.stringify({ unrelated: 'field' }),
      details: undefined,
    });
  });
});

describe('onEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a listener and returns the unlisten function', async () => {
    const unlisten = vi.fn();
    mockListen.mockResolvedValue(unlisten);

    const handler = vi.fn();
    const result = await onEvent('task-progress', handler);

    expect(mockListen).toHaveBeenCalledWith('task-progress', expect.any(Function));
    expect(result).toBe(unlisten);
  });

  it('calls the handler with the payload extracted from the event object', async () => {
    let registeredCallback: ((e: { payload: unknown }) => void) | undefined;
    mockListen.mockImplementation(async (_event: string, cb: (e: { payload: unknown }) => void) => {
      registeredCallback = cb;
      return vi.fn();
    });

    const handler = vi.fn();
    await onEvent<{ taskId: string; status: string }>('task-complete', handler);

    // Simulate a Tauri event — listen wraps the payload in { payload: ... }
    registeredCallback?.({ payload: { taskId: 'task-1', status: 'SUCCEEDED' } });

    expect(handler).toHaveBeenCalledWith({ taskId: 'task-1', status: 'SUCCEEDED' });
  });
});
