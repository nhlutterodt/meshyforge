import { describe, expect, it } from 'vitest';

import {
  ANIMATION_LIBRARY_URL,
  APP_NAME,
  APP_VERSION,
  DEFAULT_GC_TIME_MS,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_STALE_TIME_MS,
  MESHY_ENDPOINTS,
  SIDEBAR_TRANSITION,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from './constants';

describe('MESHY_ENDPOINTS', () => {
  it('maps textTo3D to the v2 preview endpoint', () => {
    expect(MESHY_ENDPOINTS.textTo3D).toBe('/v2/text-to-3d');
  });

  it('maps imageTo3D to the v1 endpoint', () => {
    expect(MESHY_ENDPOINTS.imageTo3D).toBe('/v1/image-to-3d');
  });

  it('maps multiImageTo3D to the v1 multi-image endpoint', () => {
    expect(MESHY_ENDPOINTS.multiImageTo3D).toBe('/v1/multi-image-to-3d');
  });

  it('maps remesh to the v1 remesh endpoint', () => {
    expect(MESHY_ENDPOINTS.remesh).toBe('/v1/remesh');
  });

  it('maps retexture to the v1 retexture endpoint', () => {
    expect(MESHY_ENDPOINTS.retexture).toBe('/v1/retexture');
  });

  it('maps convert to the v1 convert endpoint', () => {
    expect(MESHY_ENDPOINTS.convert).toBe('/v1/convert');
  });

  it('maps resize to the v1 resize endpoint', () => {
    expect(MESHY_ENDPOINTS.resize).toBe('/v1/resize');
  });

  it('maps uvUnwrap to the v1 uv-unwrap endpoint', () => {
    expect(MESHY_ENDPOINTS.uvUnwrap).toBe('/v1/uv-unwrap');
  });

  it('maps rigging to the v1 rigging endpoint', () => {
    expect(MESHY_ENDPOINTS.rigging).toBe('/v1/rigging');
  });

  it('maps animation to the v1 animation endpoint', () => {
    expect(MESHY_ENDPOINTS.animation).toBe('/v1/animation');
  });

  it('maps textToImage to the v2 text-to-image endpoint', () => {
    expect(MESHY_ENDPOINTS.textToImage).toBe('/v2/text-to-image');
  });

  it('maps imageToImage to the v2 image-to-image endpoint', () => {
    expect(MESHY_ENDPOINTS.imageToImage).toBe('/v2/image-to-image');
  });
});

describe('app constants', () => {
  it('defines APP_NAME as MeshyForge', () => {
    expect(APP_NAME).toBe('MeshyForge');
  });

  it('defines APP_VERSION as 1.0.0', () => {
    expect(APP_VERSION).toBe('1.0.0');
  });

  it('defines ANIMATION_LIBRARY_URL as a meshy.ai URL', () => {
    expect(ANIMATION_LIBRARY_URL).toContain('api.meshy.ai');
  });
});

describe('timing constants', () => {
  it('sets DEFAULT_POLL_INTERVAL_MS to 5000', () => {
    expect(DEFAULT_POLL_INTERVAL_MS).toBe(5000);
  });

  it('sets DEFAULT_STALE_TIME_MS to 30000', () => {
    expect(DEFAULT_STALE_TIME_MS).toBe(30_000);
  });

  it('sets DEFAULT_GC_TIME_MS to 5 minutes', () => {
    expect(DEFAULT_GC_TIME_MS).toBe(5 * 60 * 1000);
  });
});

describe('sidebar constants', () => {
  it('sets expanded width to w-56', () => {
    expect(SIDEBAR_WIDTH_EXPANDED).toBe('w-56');
  });

  it('sets collapsed width to w-14', () => {
    expect(SIDEBAR_WIDTH_COLLAPSED).toBe('w-14');
  });

  it('sets transition string', () => {
    expect(SIDEBAR_TRANSITION).toBe('transition-all duration-200');
  });
});
