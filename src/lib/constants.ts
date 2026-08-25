// src/lib/constants.ts
// API endpoint map and application defaults

export const MESHY_ENDPOINTS = {
  textTo3D: '/v2/text-to-3d',
  imageTo3D: '/v1/image-to-3d',
  multiImageTo3D: '/v1/multi-image-to-3d',
  remesh: '/v1/remesh',
  retexture: '/v1/retexture',
  convert: '/v1/convert',
  resize: '/v1/resize',
  uvUnwrap: '/v1/uv-unwrap',
  rigging: '/v1/rigging',
  animation: '/v1/animation',
  textToImage: '/v2/text-to-image',
  imageToImage: '/v2/image-to-image',
} as const;

export const ANIMATION_LIBRARY_URL = 'https://api.meshy.ai/web/public/animations/resources';

export const APP_NAME = 'MeshyForge';
export const APP_VERSION = '1.0.0';

export const DEFAULT_POLL_INTERVAL_MS = 5000;
export const DEFAULT_STALE_TIME_MS = 30_000;
export const DEFAULT_GC_TIME_MS = 5 * 60 * 1000;

export const SIDEBAR_WIDTH_EXPANDED = 'w-56';
export const SIDEBAR_WIDTH_COLLAPSED = 'w-14';
export const SIDEBAR_TRANSITION = 'transition-all duration-200';
