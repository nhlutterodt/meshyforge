// src/components/export/ExportDialog.tsx
// Source: FRD FR-EXP-01/03, CSD §5

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
import type { ExportFormat } from '@lib/meshy-types';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ExportDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'glb', label: 'GLB' },
  { value: 'fbx', label: 'FBX' },
  { value: 'obj', label: 'OBJ' },
  { value: 'stl', label: 'STL' },
  { value: 'usdz', label: 'USDZ' },
  { value: '3mf', label: '3MF' },
];

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('glb');
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      // In full implementation, this would call a convert command
      // to re-export the model in the selected format
      toast.success(`Exporting as ${format.toUpperCase()}...`);
      onClose();
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  }

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
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-text-muted">
            The model will be converted to {format.toUpperCase()} and saved to your chosen
            destination.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="mr-1 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
