// src/components/export/ExportDialog.tsx
// Source: FRD FR-EXP-01/03, CSD §5, ADR-0007

import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { useExportAsset } from '@hooks/useExportAsset';
import { useCreateConvert } from '@hooks/useMeshyApi';
import type { AssetRow, ExportFormat } from '@lib/meshy-types';
import { save } from '@tauri-apps/plugin-dialog';
import { Download, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ExportDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly asset: AssetRow;
}

interface PendingExport {
  readonly format: ExportFormat;
  readonly destinationPath: string;
}

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'glb', label: 'GLB' },
  { value: 'fbx', label: 'FBX' },
  { value: 'obj', label: 'OBJ' },
  { value: 'stl', label: 'STL' },
  { value: 'usdz', label: 'USDZ' },
  { value: '3mf', label: '3MF' },
];

function parseFilePaths(filePathsJson: string): Record<string, string> {
  try {
    const parsed = JSON.parse(filePathsJson) as unknown;
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

// Remote Meshy URLs (not yet downloaded to disk) can't be exported directly —
// mirrors the same http(s)/data: discrimination `assetUrl()` (lib/tauri.ts)
// already uses to tell a local file path from a remote one.
function isLocalPath(path: string): boolean {
  return !path.startsWith('http://') && !path.startsWith('https://') && !path.startsWith('data:');
}

export function ExportDialog({ isOpen, onClose, asset }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('glb');
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);
  const exportAsset = useExportAsset();
  const convertMutation = useCreateConvert();

  const filePaths = parseFilePaths(asset.filePaths);
  const isFormatAvailable = (value: ExportFormat) => {
    const path = filePaths[value];
    return typeof path === 'string' && path.length > 0 && isLocalPath(path);
  };
  const pendingExportPath = pendingExport ? filePaths[pendingExport.format] : undefined;

  // Once the on-demand-convert task (fired by "Generate & Export") completes
  // and useActiveTaskPolling downloads the new format, the parent's
  // useAssets() query is invalidated and this component receives a fresh
  // `asset` prop whose file_paths carries the new local path — no separate
  // polling here, this effect just reacts to that prop update.
  useEffect(() => {
    if (!pendingExport || !pendingExportPath || !isLocalPath(pendingExportPath)) return;
    const { destinationPath, format: targetFormat } = pendingExport;
    setPendingExport(null);
    void runExport(pendingExportPath, destinationPath, targetFormat);
  }, [pendingExport, pendingExportPath]);

  async function runExport(path: string, destinationPath: string, targetFormat: ExportFormat) {
    try {
      await exportAsset.mutateAsync({ path, destinationPath });
      toast.success(`Exported ${targetFormat.toUpperCase()} to ${destinationPath}`);
      onClose();
    } catch {
      toast.error('Export failed');
    }
  }

  async function pickDestination(targetFormat: ExportFormat): Promise<string | null> {
    return await save({
      defaultPath: `${asset.id}.${targetFormat}`,
      filters: [{ name: targetFormat.toUpperCase(), extensions: [targetFormat] }],
    });
  }

  async function handleExport() {
    const path = filePaths[format];
    if (!path || !isLocalPath(path)) return;
    const destinationPath = await pickDestination(format);
    if (!destinationPath) return;
    await runExport(path, destinationPath, format);
  }

  async function handleGenerateAndExport() {
    const destinationPath = await pickDestination(format);
    if (!destinationPath) return;

    convertMutation.mutate(
      { inputTaskId: asset.id, targetFormats: [format] },
      {
        onSuccess: () => {
          setPendingExport({ format, destinationPath });
          toast.info(
            `Generating ${format.toUpperCase()}... it will export automatically when ready.`,
          );
        },
        onError: () => toast.error('Failed to start conversion'),
      },
    );
  }

  const formatIsAvailable = isFormatAvailable(format);
  const isBusy = exportAsset.isPending || convertMutation.isPending || pendingExport !== null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Asset</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="export-format">Format</Label>
            <Select value={format} onValueChange={(v) => setFormat((v ?? 'glb') as ExportFormat)}>
              <SelectTrigger id="export-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMATS.map((f) => (
                  <SelectItem
                    key={f.value}
                    value={f.value}
                    disabled={!isFormatAvailable(f.value)}
                    title={isFormatAvailable(f.value) ? undefined : 'Not generated for this asset'}
                  >
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {formatIsAvailable ? (
            <p className="text-sm text-text-muted">
              The local {format.toUpperCase()} file will be copied to your chosen destination.
            </p>
          ) : (
            <p className="text-sm text-text-muted">
              Not generated for this asset. Generating {format.toUpperCase()} uses a Meshy Convert
              credit and will export automatically once ready.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {formatIsAvailable ? (
            <Button onClick={handleExport} disabled={isBusy}>
              <Download className="mr-1 h-4 w-4" />
              {exportAsset.isPending ? 'Exporting...' : 'Export'}
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="border border-dashed border-primary text-primary"
              onClick={handleGenerateAndExport}
              disabled={isBusy}
            >
              <Sparkles className="mr-1 h-4 w-4" />
              {convertMutation.isPending ? 'Starting...' : 'Generate & Export'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
