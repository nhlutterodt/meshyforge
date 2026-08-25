// src/components/generate/CreativeLabPanel.tsx
// Source: FRD FR-CLAB-01–07, CSD §5

import { PromptEditor } from '@components/common/PromptEditor';
import { Button } from '@components/ui/button';
import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { useCreateTextTo3D } from '@hooks/useMeshyApi';
import type { TextTo3DPreviewRequest } from '@lib/meshy-types';
import { useState } from 'react';
import { toast } from 'sonner';

const CREATIVE_LAB_TYPES = [
  { value: 'creative-lab-keychain', label: 'Keychain' },
  { value: 'creative-lab-fridge-magnet', label: 'Fridge Magnet' },
  { value: 'creative-lab-figure', label: 'Figure' },
  { value: 'creative-lab-vinyl-figure', label: 'Vinyl Figure' },
  { value: 'creative-lab-brick-figure', label: 'Brick Figure' },
  { value: 'creative-lab-lamp', label: 'Lamp' },
  { value: 'creative-lab-keycap', label: 'Keycap' },
] as const;

export function CreativeLabPanel() {
  const mutation = useCreateTextTo3D();
  const [selectedType, setSelectedType] = useState<string>(CREATIVE_LAB_TYPES[0].value);
  const [mode, setMode] = useState<'prototype' | 'build'>('prototype');
  const [prompt, setPrompt] = useState('');

  function handleGenerate() {
    if (!prompt.trim()) return toast.error('Prompt is required');
    const fullType = `${selectedType}-${mode}`;
    const body: TextTo3DPreviewRequest = {
      mode: 'preview',
      prompt: `${fullType}: ${prompt.trim()}`,
    };
    mutation.mutate(body, {
      onSuccess: () => {
        toast.success(`${mode === 'prototype' ? 'Prototype' : 'Build'} task created`);
        setPrompt('');
      },
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Creative Lab</h2>
      <div className="space-y-2">
        <Label htmlFor="cl-type">Project Type</Label>
        <Select value={selectedType} onValueChange={(v) => setSelectedType(v ?? '')}>
          <SelectTrigger id="cl-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CREATIVE_LAB_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Stage</Label>
        <div className="flex gap-2">
          <Button
            variant={mode === 'prototype' ? 'secondary' : 'ghost'}
            onClick={() => setMode('prototype')}
            className="flex-1"
          >
            Prototype
          </Button>
          <Button
            variant={mode === 'build' ? 'secondary' : 'ghost'}
            onClick={() => setMode('build')}
            className="flex-1"
          >
            Build
          </Button>
        </div>
      </div>
      <PromptEditor value={prompt} onChange={setPrompt} />
      <Button
        onClick={handleGenerate}
        disabled={mutation.isPending || !prompt.trim()}
        className="w-full"
      >
        {mutation.isPending
          ? 'Generating...'
          : `Generate ${mode === 'prototype' ? 'Prototype' : 'Build'}`}
      </Button>
    </div>
  );
}
