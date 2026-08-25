// Regression tests for assetUrl — ensures remote URLs pass through
// and local paths are converted via convertFileSrc.
//
// Context: Norton quarantined a Vite prebundle, but the real gallery
// bug was that assetUrl() was wrapping https://assets.meshy.ai URLs
// in convertFileSrc(), producing invalid asset.localhost paths that
// Tauri's asset protocol rejected.

import { describe, expect, it, vi } from 'vitest';

// Mock @tauri-apps/api/core so we don't need a Tauri runtime
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((path: string) => `https://asset.localhost/${path.replace(/^[\\/]/, '')}`),
}));

// Import after mock is set up
import { assetUrl } from './tauri';

describe('assetUrl', () => {
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
    // convertFileSrc should have been called — result is an asset.localhost URL
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
