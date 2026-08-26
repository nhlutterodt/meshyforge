// src/stores/settingsStore.ts
// Source: CSD §8.2, zustand_store_implementations.md §4

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExportFormat, ModelId } from '../lib/meshy-types';

interface SettingsState {
  // ── State ──────────────────────────────────────
  readonly defaultAiModel: ModelId;
  readonly defaultTextureResolution: '2k' | '4k' | '8k';
  readonly defaultShouldRemesh: boolean;
  readonly defaultTargetPolycount: number;
  readonly defaultTargetFormats: readonly ExportFormat[];
  readonly defaultEnablePbr: boolean;
  readonly defaultRemoveLighting: boolean;
  readonly defaultPoseMode: string;
  readonly pollIntervalMs: number;
  readonly useSseStreaming: boolean;
  readonly maxConcurrentTasks: number;
  readonly autoDownloadOnSuccess: boolean;
  readonly notifyOnTaskComplete: boolean;

  // ── Actions ────────────────────────────────────
  setDefaultAiModel: (model: ModelId) => void;
  setDefaultTextureResolution: (res: '2k' | '4k' | '8k') => void;
  setPollIntervalMs: (ms: number) => void;
  setUseSseStreaming: (enabled: boolean) => void;
  setAutoDownloadOnSuccess: (enabled: boolean) => void;
  setNotifyOnTaskComplete: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

const DEFAULTS = {
  defaultAiModel: 'latest' as ModelId,
  defaultTextureResolution: '2k' as const,
  defaultShouldRemesh: false,
  defaultTargetPolycount: 30000,
  defaultTargetFormats: ['glb', 'fbx'] as const,
  defaultEnablePbr: true,
  defaultRemoveLighting: true,
  defaultPoseMode: '',
  pollIntervalMs: 5000,
  useSseStreaming: false,
  maxConcurrentTasks: 5,
  autoDownloadOnSuccess: true,
  notifyOnTaskComplete: true,
} satisfies Omit<
  SettingsState,
  | 'setDefaultAiModel'
  | 'setDefaultTextureResolution'
  | 'setPollIntervalMs'
  | 'setUseSseStreaming'
  | 'setAutoDownloadOnSuccess'
  | 'setNotifyOnTaskComplete'
  | 'resetToDefaults'
>;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setDefaultAiModel: (model) => set({ defaultAiModel: model }),

      setDefaultTextureResolution: (res) => set({ defaultTextureResolution: res }),

      setPollIntervalMs: (ms) => set({ pollIntervalMs: Math.max(1000, Math.min(60000, ms)) }),

      setUseSseStreaming: (enabled) => set({ useSseStreaming: enabled }),

      setAutoDownloadOnSuccess: (enabled) => set({ autoDownloadOnSuccess: enabled }),

      setNotifyOnTaskComplete: (enabled) => set({ notifyOnTaskComplete: enabled }),

      resetToDefaults: () => set(DEFAULTS),
    }),
    {
      name: 'meshyforge-settings',
      version: 1,
      partialize: (state) => ({
        defaultAiModel: state.defaultAiModel,
        defaultTextureResolution: state.defaultTextureResolution,
        defaultShouldRemesh: state.defaultShouldRemesh,
        defaultTargetPolycount: state.defaultTargetPolycount,
        defaultTargetFormats: state.defaultTargetFormats,
        defaultEnablePbr: state.defaultEnablePbr,
        defaultRemoveLighting: state.defaultRemoveLighting,
        defaultPoseMode: state.defaultPoseMode,
        pollIntervalMs: state.pollIntervalMs,
        useSseStreaming: state.useSseStreaming,
        maxConcurrentTasks: state.maxConcurrentTasks,
        autoDownloadOnSuccess: state.autoDownloadOnSuccess,
        notifyOnTaskComplete: state.notifyOnTaskComplete,
      }),
    },
  ),
);
