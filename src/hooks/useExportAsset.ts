// src/hooks/useExportAsset.ts
// Source: ADR-0007 (export-asset-local-copy-with-on-demand-convert), FR-EXP-01/03

import { invoke } from '@lib/tauri';
import { useMutation } from '@tanstack/react-query';

/** Arguments for exporting a downloaded asset file to a local destination. */
export interface ExportAssetArgs {
  readonly path: string;
  readonly destinationPath: string;
  /**
   * The asset identity. The command cross-checks it against that row's
   * `file_paths` before copying (`SEC-B`), so an id cannot be used to export a
   * different asset's file.
   */
  readonly assetId: string;
}

/**
 * Copies an already-downloaded asset file to a user-chosen destination on
 * disk, writing a rights sidecar beside it (`ADR-0019`, `LM-02`). Wraps the
 * `export_asset` Tauri command — no network calls, no Meshy credits consumed.
 *
 * Resolves to `null` when the full record was written, or to a warning string
 * when the copy succeeded but the record could not be produced. That is the
 * degradation ladder: a record failure never blocks delivery of the file.
 */
export function useExportAsset() {
  return useMutation({
    mutationFn: async ({ path, destinationPath, assetId }: ExportAssetArgs) => {
      return await invoke<string | null>('export_asset', {
        path,
        destinationPath,
        assetId,
      });
    },
    retry: 0,
  });
}
