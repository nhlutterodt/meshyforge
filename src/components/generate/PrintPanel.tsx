// src/components/generate/PrintPanel.tsx
// Source: FRD FR-PRINT-01–03, CSD §5

import { AssetTaskPicker, hasDownloadedModel } from '@components/common/AssetTaskPicker';
import {
  PrintabilityReportCard,
  type RawPrintabilityTask,
  parsePrintabilityReport,
} from '@components/generate/PrintabilityReportCard';
import { Button } from '@components/ui/button';
import { Label } from '@components/ui/label';
import { Slider } from '@components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import {
  useCreateAnalyzePrintability,
  useCreateMultiColorPrint,
  useCreateRepairPrintability,
} from '@hooks/useMeshyApi';
import { useTaskPolling } from '@hooks/useTaskPolling';
import type { MultiColorPrintRequest } from '@lib/meshy-types';
import { useState } from 'react';
import { toast } from 'sonner';

// FR-PRINT-02-F3 / FR-PRINT-03-F4: static credit-cost estimates from the FRD.
const REPAIR_CREDIT_COST = 10;
const ANALYZE_ENDPOINT = '/v1/print/analyze';

export function PrintPanel() {
  const [inputTaskId, setInputTaskId] = useState('');
  const [maxColors, setMaxColors] = useState(4);
  const [analyzeTaskId, setAnalyzeTaskId] = useState<string | null>(null);

  const multiColorMutation = useCreateMultiColorPrint();
  const analyzeMutation = useCreateAnalyzePrintability();
  const repairMutation = useCreateRepairPrintability();
  const analyzePoll = useTaskPolling<RawPrintabilityTask>(analyzeTaskId, ANALYZE_ENDPOINT);

  const analyzeReport =
    analyzePoll.data?.status === 'SUCCEEDED' ? parsePrintabilityReport(analyzePoll.data) : null;
  const analyzeFailed = analyzePoll.data?.status === 'FAILED';

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
        onSuccess: (data) => {
          setAnalyzeTaskId(data.result);
          toast.success('Printability analysis started (free)');
        },
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
      <AssetTaskPicker
        id="print-task-id"
        label="Input Task ID"
        value={inputTaskId}
        onChange={setInputTaskId}
        filter={hasDownloadedModel}
        placeholder="Task ID of the model"
      />
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
          <p className="text-xs text-text-muted">Cost: Free — no credits consumed</p>
          <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending} className="w-full">
            Analyze Printability
          </Button>
          {analyzeTaskId && !analyzeReport && !analyzeFailed && (
            <p className="text-xs text-text-muted">Analyzing… this can take a few seconds.</p>
          )}
          {analyzeFailed && (
            <p className="text-xs text-danger">
              Analysis failed: {analyzePoll.data?.task_error?.message ?? 'Unknown error'}
            </p>
          )}
          {analyzeReport && <PrintabilityReportCard report={analyzeReport} />}
        </TabsContent>
        <TabsContent value="repair" className="space-y-4">
          <p className="rounded-lg border bg-warning/10 p-3 text-xs text-warning">
            Existing textures are removed during repair. Use Retexture to add them back.
          </p>
          <p className="text-xs text-text-muted">Cost: {REPAIR_CREDIT_COST} credits</p>
          <Button onClick={handleRepair} disabled={repairMutation.isPending} className="w-full">
            Repair Model
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
