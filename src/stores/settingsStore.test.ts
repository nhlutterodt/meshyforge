import { beforeEach, describe, expect, it } from 'vitest';

import { useSettingsStore } from './settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.getState().resetToDefaults();
  });

  describe('initial state', () => {
    it('defaults defaultAiModel to latest', () => {
      expect(useSettingsStore.getState().defaultAiModel).toBe('latest');
    });

    it('defaults defaultTextureResolution to 2k', () => {
      expect(useSettingsStore.getState().defaultTextureResolution).toBe('2k');
    });

    it('defaults defaultShouldRemesh to false', () => {
      expect(useSettingsStore.getState().defaultShouldRemesh).toBe(false);
    });

    it('defaults defaultTargetPolycount to 30000', () => {
      expect(useSettingsStore.getState().defaultTargetPolycount).toBe(30000);
    });

    it('defaults defaultTargetFormats to glb and fbx', () => {
      expect(useSettingsStore.getState().defaultTargetFormats).toEqual(['glb', 'fbx']);
    });

    it('defaults defaultEnablePbr to true', () => {
      expect(useSettingsStore.getState().defaultEnablePbr).toBe(true);
    });

    it('defaults defaultRemoveLighting to true', () => {
      expect(useSettingsStore.getState().defaultRemoveLighting).toBe(true);
    });

    it('defaults pollIntervalMs to 5000', () => {
      expect(useSettingsStore.getState().pollIntervalMs).toBe(5000);
    });

    it('defaults useSseStreaming to false', () => {
      expect(useSettingsStore.getState().useSseStreaming).toBe(false);
    });

    it('defaults autoDownloadOnSuccess to true', () => {
      expect(useSettingsStore.getState().autoDownloadOnSuccess).toBe(true);
    });

    it('defaults notifyOnTaskComplete to true', () => {
      expect(useSettingsStore.getState().notifyOnTaskComplete).toBe(true);
    });

    it('defaults maxConcurrentTasks to 5', () => {
      expect(useSettingsStore.getState().maxConcurrentTasks).toBe(5);
    });
  });

  describe('setDefaultAiModel', () => {
    it('sets the model to meshy-6', () => {
      useSettingsStore.getState().setDefaultAiModel('meshy-6');
      expect(useSettingsStore.getState().defaultAiModel).toBe('meshy-6');
    });

    it('sets the model to meshy-7', () => {
      useSettingsStore.getState().setDefaultAiModel('meshy-7');
      expect(useSettingsStore.getState().defaultAiModel).toBe('meshy-7');
    });
  });

  describe('setDefaultTextureResolution', () => {
    it('sets the resolution to 4k', () => {
      useSettingsStore.getState().setDefaultTextureResolution('4k');
      expect(useSettingsStore.getState().defaultTextureResolution).toBe('4k');
    });

    it('sets the resolution to 8k', () => {
      useSettingsStore.getState().setDefaultTextureResolution('8k');
      expect(useSettingsStore.getState().defaultTextureResolution).toBe('8k');
    });
  });

  describe('setPollIntervalMs', () => {
    it('sets a valid interval within 1000–60000', () => {
      useSettingsStore.getState().setPollIntervalMs(10000);
      expect(useSettingsStore.getState().pollIntervalMs).toBe(10000);
    });

    it('clamps values below 1000 to 1000', () => {
      useSettingsStore.getState().setPollIntervalMs(500);
      expect(useSettingsStore.getState().pollIntervalMs).toBe(1000);
    });

    it('clamps values above 60000 to 60000', () => {
      useSettingsStore.getState().setPollIntervalMs(120000);
      expect(useSettingsStore.getState().pollIntervalMs).toBe(60000);
    });

    it('accepts exactly 1000 (lower bound)', () => {
      useSettingsStore.getState().setPollIntervalMs(1000);
      expect(useSettingsStore.getState().pollIntervalMs).toBe(1000);
    });

    it('accepts exactly 60000 (upper bound)', () => {
      useSettingsStore.getState().setPollIntervalMs(60000);
      expect(useSettingsStore.getState().pollIntervalMs).toBe(60000);
    });
  });

  describe('setUseSseStreaming', () => {
    it('enables SSE streaming', () => {
      useSettingsStore.getState().setUseSseStreaming(true);
      expect(useSettingsStore.getState().useSseStreaming).toBe(true);
    });

    it('disables SSE streaming', () => {
      useSettingsStore.getState().setUseSseStreaming(true);
      useSettingsStore.getState().setUseSseStreaming(false);
      expect(useSettingsStore.getState().useSseStreaming).toBe(false);
    });
  });

  describe('setAutoDownloadOnSuccess', () => {
    it('disables auto-download', () => {
      useSettingsStore.getState().setAutoDownloadOnSuccess(false);
      expect(useSettingsStore.getState().autoDownloadOnSuccess).toBe(false);
    });

    it('re-enables auto-download after disabling', () => {
      useSettingsStore.getState().setAutoDownloadOnSuccess(false);
      useSettingsStore.getState().setAutoDownloadOnSuccess(true);
      expect(useSettingsStore.getState().autoDownloadOnSuccess).toBe(true);
    });
  });

  describe('setNotifyOnTaskComplete', () => {
    it('disables notifications', () => {
      useSettingsStore.getState().setNotifyOnTaskComplete(false);
      expect(useSettingsStore.getState().notifyOnTaskComplete).toBe(false);
    });

    it('re-enables notifications after disabling', () => {
      useSettingsStore.getState().setNotifyOnTaskComplete(false);
      useSettingsStore.getState().setNotifyOnTaskComplete(true);
      expect(useSettingsStore.getState().notifyOnTaskComplete).toBe(true);
    });
  });

  describe('resetToDefaults', () => {
    it('restores all settings to defaults after modifications', () => {
      useSettingsStore.getState().setDefaultAiModel('meshy-5');
      useSettingsStore.getState().setDefaultTextureResolution('8k');
      useSettingsStore.getState().setPollIntervalMs(10000);
      useSettingsStore.getState().setUseSseStreaming(true);
      useSettingsStore.getState().setAutoDownloadOnSuccess(false);
      useSettingsStore.getState().setNotifyOnTaskComplete(false);

      useSettingsStore.getState().resetToDefaults();

      const state = useSettingsStore.getState();
      expect(state.defaultAiModel).toBe('latest');
      expect(state.defaultTextureResolution).toBe('2k');
      expect(state.pollIntervalMs).toBe(5000);
      expect(state.useSseStreaming).toBe(false);
      expect(state.autoDownloadOnSuccess).toBe(true);
      expect(state.notifyOnTaskComplete).toBe(true);
    });
  });

  describe('persist middleware', () => {
    it('writes settings to localStorage under meshyforge-settings', () => {
      useSettingsStore.getState().setPollIntervalMs(15000);
      const stored = localStorage.getItem('meshyforge-settings');
      expect(stored).not.toBeNull();
      expect(stored).toContain('"state":{');
    });

    it('persists pollIntervalMs across store recreation', () => {
      useSettingsStore.getState().setPollIntervalMs(30000);
      const stored = localStorage.getItem('meshyforge-settings');
      expect(stored).toContain('"pollIntervalMs":30000');
    });
  });
});