// src/hooks/useKeyboardShortcuts.ts
// Source: UI/UX §12.7, KBD-07

import { useAppStore } from '@stores/appStore';
import { useEffect } from 'react';

export function useKeyboardShortcuts() {
  const setActiveView = useAppStore((s) => s.setActiveView);
  const selectedAssetId = useAppStore((s) => s.selectedAssetId);
  const setSelectedAsset = useAppStore((s) => s.setSelectedAsset);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl/Cmd + K → Command palette (navigate to settings for now)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // TODO: Open command palette (search assets, navigate views)
        // For MVP, this is a placeholder that navigates to gallery search
        setActiveView('gallery');
      }

      // Delete → Delete selected asset (with confirmation)
      if (
        e.key === 'Delete' &&
        selectedAssetId &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        // The actual delete is handled in AssetDetail component
        // This just closes the detail view
        setSelectedAsset(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveView, selectedAssetId, setSelectedAsset]);
}
