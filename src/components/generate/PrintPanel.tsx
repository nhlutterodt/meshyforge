// src/components/generate/PrintPanel.tsx
// Source: FRD FR-PRINT-01–03, CSD §5

import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Slider } from '@components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import {
  useCreateAnalyzePrintability,
  useCreateMultiColorPrint,
  useCreateRepairPrintability,
} from '@hooks/useMeshyApi';
import type { MultiColorPrintRequest } from '@lib/meshy-types';
import { useState } from 'react';
import { toast } from 'sonner';

export function PrintPanel() {
  const [inputTaskId, setInputTaskId] = useState('');
  const [maxColors, setMaxColors] = useState(4);

  const multiColorMutation = useCreateMultiColorPrint();
  const analyzeMutation = useCreateAnalyzePrintability();
  const repairMutation = useCreateRepairPrintability();

  function handleMultiColor() {
    if (!inputTaskId.trim()) return toast.error('Input task ID required');
    const body: MultiColorPrintRequest = {
      inputTaskId: inputTaskId.trim(),
      maxColors,
    };
    multiColorMutation.mutate(body, {
      onSuccess: () => toast.success('Multi-color print task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  function handleAnalyze() {
    if (!inputTaskId.trim()) return toast.error('Input task ID required');
    analyzeMutation.mutate(
      { inputTaskId: inputTaskId.trim() },
      {
        onSuccess: () => toast.success('Printability analysis started (free)'),
        onError: (e) => toast.error(e.message ?? 'Failed'),
      },
    );
  }

  function handleRepair() {
    if (!inputTaskId.trim()) return toast.error('Input task ID required');
    repairMutation.mutate(
      { inputTaskId: inputTaskId.trim() },
      {
        onSuccess: () => toast.success('Repair task created'),
        onError: (e) => toast.error(e.message ?? 'Failed'),
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">3D Print Tools</h2>
      <div className="space-y-2">
        <Label htmlFor="print-task-id">Input Task ID</Label>
        <Input
          id="print-task-id"
          value={inputTaskId}
          onChange={(e) => setInputTaskId(e.target.value)}
          placeholder="Task ID of the model"
        />
      </div>
      <Tabs defaultValue="multi-color">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="multi-color">Multi-Color</TabsTrigger>
          <TabsTrigger value="analyze">Analyze</TabsTrigger>
          <TabsTrigger value="repair">Repair</TabsTrigger>
        </TabsList>
        <TabsContent value="multi-color" className="space-y-4">
          <div className="space-y-2">
            <Label>Max Colors: {maxColors}</Label>
            <Slider
              min={1}
              max={16}
              step={1}
              value={[maxColors]}
              onValueChange={(v) => {
                if (typeof v === 'number') setMaxColors(v);
                else if (Array.isArray(v) && v.length > 0) setMaxColors(v[0] ?? 4);
              }}
            />
          </div>
          <Button
            onClick={handleMultiColor}
            disabled={multiColorMutation.isPending}
            className="w-full"
          >
            Create Multi-Color Print
          </Button>
        </TabsContent>
        <TabsContent value="analyze" className="space-y-4">
          <p className="text-sm text-text-muted">
            Analyze model for printability issues (free operation).
          </p>
          <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending} className="w-full">
            Analyze Printability
          </Button>
        </TabsContent>
        <TabsContent value="repair" className="space-y-4">
          <Button onClick={handleRepair} disabled={repairMutation.isPending} className="w-full">
            Repair Model
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
