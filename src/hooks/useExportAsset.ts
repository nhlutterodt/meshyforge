// src/hooks/useExportAsset.ts
// Source: ADR-0007 (export-asset-local-copy-with-on-demand-convert), FR-EXP-01/03

import { invoke } from '@lib/tauri';
import { useMutation } from '@tanstack/react-query';

/** Arguments for exporting a downloaded asset file to a local destination. */
export interface ExportAssetArgs {
  readonly path: string;
  readonly destinationPath: string;
}

/**
 * Copies an already-downloaded asset file to a user-chosen destination on
 * disk. Wraps the `export_asset` Tauri command — a pure local file copy,
 * no network calls, no Meshy credits consumed.
 */
export function useExportAsset() {
  return useMutation({
    mutationFn: async ({ path, destinationPath }: ExportAssetArgs) => {
      return await invoke<void>('export_asset', { path, destinationPath });
    },
    retry: 0,
  });
}
