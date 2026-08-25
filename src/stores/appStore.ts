// src/stores/appStore.ts
// Source: TDD §8.1, zustand_store_implementations.md §2

import { create } from 'zustand';

interface AppState {
  // ── Navigation ──────────────────────
  activeView: 'generate' | 'gallery' | 'tasks' | 'settings';
  setActiveView: (view: AppState['activeView']) => void;

  // ── Generate sub-panel ───────────────
  activeGenerateTab:
    | 'text-to-3d'
    | 'image-to-3d'
    | 'multi-image'
    | 'post-process'
    | 'rigging'
    | 'animation'
    | 'image-gen'
    | 'print'
    | 'creative-lab';
  setActiveGenerateTab: (tab: AppState['activeGenerateTab']) => void;

  // ── Selected asset (for detail view) ─
  selectedAssetId: string | null;
  setSelectedAsset: (id: string | null) => void;

  // ── Sidebar collapsed ────────────────
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'generate',
  setActiveView: (view) => set({ activeView: view }),
  activeGenerateTab: 'text-to-3d',
  setActiveGenerateTab: (tab) => set({ activeGenerateTab: tab }),
  selectedAssetId: null,
  setSelectedAsset: (id) => set({ selectedAssetId: id }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
