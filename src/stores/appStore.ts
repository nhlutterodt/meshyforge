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
  // Navigating anywhere dismisses an open asset detail. The gallery renders the
  // detail panel whenever `selectedAssetId` is set, so changing only `activeView`
  // cannot leave that panel: re-selecting the already-active 'gallery' view is a
  // no-op and the grid would be unreachable, and a later return to 'gallery'
  // would silently re-open the previously selected asset.
  setActiveView: (view) => set({ activeView: view, selectedAssetId: null }),
  activeGenerateTab: 'text-to-3d',
  setActiveGenerateTab: (tab) => set({ activeGenerateTab: tab }),
  selectedAssetId: null,
  setSelectedAsset: (id) => set({ selectedAssetId: id }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
