import { describe, expect, it } from 'vitest';

import {
  APP_NAME,
  APP_VERSION,
  DEFAULT_GC_TIME_MS,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_STALE_TIME_MS,
  SIDEBAR_TRANSITION,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from './constants';

describe('app constants', () => {
  it('defines APP_NAME as MeshyForge', () => {
    expect(APP_NAME).toBe('MeshyForge');
  });

  it('defines APP_VERSION as 1.0.0', () => {
    expect(APP_VERSION).toBe('1.0.0');
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
