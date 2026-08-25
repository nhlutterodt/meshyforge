import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from './appStore';

function resetStore() {
  useAppStore.getState().setActiveView('generate');
  useAppStore.getState().setActiveGenerateTab('text-to-3d');
  useAppStore.getState().setSelectedAsset(null);
  // Reset sidebar to expanded (false)
  if (useAppStore.getState().sidebarCollapsed) {
    useAppStore.getState().toggleSidebar();
  }
}

describe('appStore', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('initial state', () => {
    it('starts with activeView set to generate', () => {
      expect(useAppStore.getState().activeView).toBe('generate');
    });

    it('starts with activeGenerateTab set to text-to-3d', () => {
      expect(useAppStore.getState().activeGenerateTab).toBe('text-to-3d');
    });

    it('starts with selectedAssetId set to null', () => {
      expect(useAppStore.getState().selectedAssetId).toBeNull();
    });

    it('starts with sidebarCollapsed set to false', () => {
      expect(useAppStore.getState().sidebarCollapsed).toBe(false);
    });
  });

  describe('setActiveView', () => {
    it('switches activeView to gallery', () => {
      useAppStore.getState().setActiveView('gallery');
      expect(useAppStore.getState().activeView).toBe('gallery');
    });

    it('switches activeView to settings', () => {
      useAppStore.getState().setActiveView('settings');
      expect(useAppStore.getState().activeView).toBe('settings');
    });

    it('switches activeView to tasks', () => {
      useAppStore.getState().setActiveView('tasks');
      expect(useAppStore.getState().activeView).toBe('tasks');
    });

    it('switches activeView back to generate', () => {
      useAppStore.getState().setActiveView('gallery');
      useAppStore.getState().setActiveView('generate');
      expect(useAppStore.getState().activeView).toBe('generate');
    });
  });

  describe('setActiveGenerateTab', () => {
    it('switches to image-to-3d tab', () => {
      useAppStore.getState().setActiveGenerateTab('image-to-3d');
      expect(useAppStore.getState().activeGenerateTab).toBe('image-to-3d');
    });

    it('switches to post-process tab', () => {
      useAppStore.getState().setActiveGenerateTab('post-process');
      expect(useAppStore.getState().activeGenerateTab).toBe('post-process');
    });

    it('switches to animation tab', () => {
      useAppStore.getState().setActiveGenerateTab('animation');
      expect(useAppStore.getState().activeGenerateTab).toBe('animation');
    });

    it('switches to creative-lab tab', () => {
      useAppStore.getState().setActiveGenerateTab('creative-lab');
      expect(useAppStore.getState().activeGenerateTab).toBe('creative-lab');
    });
  });

  describe('setSelectedAsset', () => {
    it('sets a selected asset id', () => {
      useAppStore.getState().setSelectedAsset('task-abc-123');
      expect(useAppStore.getState().selectedAssetId).toBe('task-abc-123');
    });

    it('clears selection by setting to null', () => {
      useAppStore.getState().setSelectedAsset('task-abc-123');
      useAppStore.getState().setSelectedAsset(null);
      expect(useAppStore.getState().selectedAssetId).toBeNull();
    });
  });

  describe('toggleSidebar', () => {
    it('collapses the sidebar when expanded', () => {
      expect(useAppStore.getState().sidebarCollapsed).toBe(false);
      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().sidebarCollapsed).toBe(true);
    });

    it('expands the sidebar when collapsed', () => {
      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().sidebarCollapsed).toBe(true);
      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().sidebarCollapsed).toBe(false);
    });
  });

  describe('immutability', () => {
    it('does not mutate the previous state object when setting', () => {
      // Zustand creates new state objects on set(), so previous state is unchanged
      const stateBefore = useAppStore.getState();
      useAppStore.getState().setActiveView('gallery');
      expect(stateBefore.activeView).toBe('generate'); // unchanged
      expect(useAppStore.getState().activeView).toBe('gallery'); // new value
    });
  });
});