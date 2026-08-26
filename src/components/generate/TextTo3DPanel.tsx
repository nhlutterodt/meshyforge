// src/components/generate/TextTo3DPanel.tsx
// Source: FRD FR-GEN-01/02, CSD §5

import { ModelSelector } from '@components/common/ModelSelector';
import { PromptEditor } from '@components/common/PromptEditor';
import { Button } from '@components/ui/button';
import { Label } from '@components/ui/label';
import { Switch } from '@components/ui/switch';
import { useCreateTextTo3D } from '@hooks/useMeshyApi';
import type { ModelId, TextTo3DPreviewRequest } from '@lib/meshy-types';
import { useSettingsStore } from '@stores/settingsStore';
import { useState } from 'react';
import { toast } from 'sonner';

export function TextTo3DPanel() {
  const defaultAiModel = useSettingsStore((s) => s.defaultAiModel);
  const mutation = useCreateTextTo3D();

  const [prompt, setPrompt] = useState('');
  const [aiModel, setAiModel] = useState<ModelId>(defaultAiModel);
  const [shouldRemesh, setShouldRemesh] = useState(false);

  function handleGenerate() {
    if (!prompt.trim()) {
      toast.error('Prompt is required');
      return;
    }
    const body: TextTo3DPreviewRequest = {
      mode: 'preview',
      prompt: prompt.trim(),
      aiModel,
      shouldRemesh,
    };
    mutation.mutate(body, {
      onSuccess: () => {
        toast.success('Text-to-3D task created');
        setPrompt('');
      },
      onError: (err) => {
        toast.error(err.message ?? 'Failed to create task');
      },
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Text to 3D</h2>
      <PromptEditor value={prompt} onChange={setPrompt} />

      <div className="grid grid-cols-2 gap-4">
        <ModelSelector value={aiModel} onChange={setAiModel} />
        <div className="flex items-center justify-end gap-2 pt-6">
          <Label htmlFor="remesh">Remesh</Label>
          <Switch id="remesh" checked={shouldRemesh} onCheckedChange={setShouldRemesh} />
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={mutation.isPending || !prompt.trim()}
        className="w-full"
      >
        {mutation.isPending ? 'Generating...' : 'Generate Preview'}
      </Button>
    </div>
  );
}
