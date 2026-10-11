// src/lib/constants.ts
// Application defaults (provider-specific endpoint paths are now tracked
// internally by the provider — ADR-0004)

import { version } from '../../package.json';

export const APP_NAME = 'MeshyForge';
// Derived from package.json, the authoritative version source (ADR-0013).
export const APP_VERSION: string = version;

export const DEFAULT_POLL_INTERVAL_MS = 5000;
export const DEFAULT_STALE_TIME_MS = 30_000;
export const DEFAULT_GC_TIME_MS = 5 * 60 * 1000;

export const SIDEBAR_WIDTH_EXPANDED = 'w-56';
export const SIDEBAR_WIDTH_COLLAPSED = 'w-14';
export const SIDEBAR_TRANSITION = 'transition-all duration-200';
