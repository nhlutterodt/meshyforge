// src/components/generate/RiggingPanel.tsx
// Source: FRD FR-POST-06, CSD §5

import { AssetTaskPicker, hasDownloadedModel } from '@components/common/AssetTaskPicker';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { useCreateRigging } from '@hooks/useMeshyApi';
import type { RiggingRequest } from '@lib/meshy-types';
import { useState } from 'react';
import { toast } from 'sonner';

export function RiggingPanel() {
  const mutation = useCreateRigging();
  const [inputTaskId, setInputTaskId] = useState('');
  const [heightMeters, setHeightMeters] = useState('');

  function handleGenerate() {
    if (!inputTaskId.trim()) return toast.error('Input task ID required');
    const body: RiggingRequest = {
      inputTaskId: inputTaskId.trim(),
      ...(heightMeters ? { heightMeters: Number(heightMeters) } : {}),
    };
    mutation.mutate(body, {
      onSuccess: () => toast.success('Rigging task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Rigging</h2>
      <AssetTaskPicker
        id="rig-task-id"
        label="Input Task ID"
        value={inputTaskId}
        onChange={setInputTaskId}
        filter={hasDownloadedModel}
        placeholder="Task ID of the model to rig"
      />
      <div className="space-y-2">
        <Label htmlFor="height-meters">Height (meters)</Label>
        <Input
          id="height-meters"
          type="number"
          step="0.01"
          value={heightMeters}
          onChange={(e) => setHeightMeters(e.target.value)}
          placeholder="e.g. 1.75"
        />
      </div>
      <Button
        onClick={handleGenerate}
        disabled={mutation.isPending || !inputTaskId.trim()}
        className="w-full"
      >
        {mutation.isPending ? 'Generating...' : 'Generate Rig'}
      </Button>
    </div>
  );
}
