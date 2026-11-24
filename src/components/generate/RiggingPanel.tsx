// src/components/generate/RiggingPanel.tsx
// Source: FRD FR-POST-06, CSD §5

import { AssetTaskPicker, hasDownloadedModel } from '@components/common/AssetTaskPicker';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { useAssets } from '@hooks/useAssets';
import { useCreateRigging } from '@hooks/useMeshyApi';
import type { RiggingRequest } from '@lib/meshy-types';
import { useState } from 'react';
import { toast } from 'sonner';

// FR-POST-06-F6: static credit-cost estimate from the FRD.
const RIGGING_CREDIT_COST = 5;
// FR-POST-06-F5: face-count limit. TASK-0032: AssetRow.faceCount (migration
// 005) is extracted from the primary GLB at download time. A KNOWN count over
// the limit disables submission with the FRD's tooltip wording; an unknown
// count (absent faceCount) keeps the static informational note — never a guess.
const RIGGING_FACE_LIMIT = 300_000;

export function RiggingPanel() {
  const mutation = useCreateRigging();
  const { data: assets } = useAssets();
  const [inputTaskId, setInputTaskId] = useState('');
  const [heightMeters, setHeightMeters] = useState('');
  const [textureImageUrl, setTextureImageUrl] = useState('');

  const selectedAsset = (assets ?? []).find((asset) => asset.id === inputTaskId.trim());
  const faceCount = selectedAsset?.faceCount;
  const overFaceLimit = faceCount !== undefined && faceCount > RIGGING_FACE_LIMIT;
  const faceLimitMessage = `Model exceeds ${RIGGING_FACE_LIMIT.toLocaleString()} face limit. Run Remesh first.`;

  function handleGenerate() {
    if (!inputTaskId.trim()) return toast.error('Input task ID required');
    if (overFaceLimit) return;
    const body: RiggingRequest = {
      inputTaskId: inputTaskId.trim(),
      ...(heightMeters ? { heightMeters: Number(heightMeters) } : {}),
      ...(textureImageUrl.trim() ? { textureImageUrl: textureImageUrl.trim() } : {}),
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
      <div className="space-y-2">
        <Label htmlFor="texture-image-url">Texture Image URL (optional)</Label>
        <Input
          id="texture-image-url"
          type="url"
          value={textureImageUrl}
          onChange={(e) => setTextureImageUrl(e.target.value)}
          placeholder="https://example.com/texture.png"
        />
      </div>
      <div className="space-y-1 rounded-lg border bg-warning/10 p-3 text-xs text-warning">
        <p>Auto-rigging works best with standard humanoid characters.</p>
        {overFaceLimit ? (
          <p className="text-destructive">{faceLimitMessage}</p>
        ) : (
          <p>
            Models exceeding {RIGGING_FACE_LIMIT.toLocaleString()} faces are not supported. Run
            Remesh first if your model is over the limit.
          </p>
        )}
      </div>
      <p className="text-sm text-text-muted">Cost: {RIGGING_CREDIT_COST} credits</p>
      <Button
        onClick={handleGenerate}
        disabled={mutation.isPending || !inputTaskId.trim() || overFaceLimit}
        title={overFaceLimit ? faceLimitMessage : undefined}
        className="w-full"
      >
        {mutation.isPending ? 'Generating...' : 'Generate Rig'}
      </Button>
    </div>
  );
}
