// src/components/generate/ImageTo3DPanel.tsx
// Source: FRD FR-GEN-03, CSD §5

import { ImageDropzone } from '@components/common/ImageDropzone';
import { ModelSelector } from '@components/common/ModelSelector';
import { Button } from '@components/ui/button';
import { Label } from '@components/ui/label';
import { Switch } from '@components/ui/switch';
import { useCreateImageTo3D } from '@hooks/useMeshyApi';
import type { ImageTo3DRequest, ModelId } from '@lib/meshy-types';
import { useSettingsStore } from '@stores/settingsStore';
import { useState } from 'react';
import { toast } from 'sonner';

export function ImageTo3DPanel() {
  const defaultAiModel = useSettingsStore((s) => s.defaultAiModel);
  const mutation = useCreateImageTo3D();

  const [imageUrl, setImageUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<ModelId>(defaultAiModel);
  const [shouldTexture, setShouldTexture] = useState(true);

  function handleGenerate() {
    if (!imageUrl) {
      toast.error('Please upload an image first');
      return;
    }
    const body: ImageTo3DRequest = {
      imageUrl,
      aiModel,
      shouldTexture,
    };
    mutation.mutate(body, {
      onSuccess: () => {
        toast.success('Image-to-3D task created');
        setImageUrl('');
        setPreviewUrl(null);
      },
      onError: (err) => toast.error(err.message ?? 'Failed to create task'),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Image to 3D</h2>
      <ImageDropzone
        previewUrl={previewUrl}
        onImageSelected={(_filename, dataUri) => {
          setImageUrl(dataUri);
          setPreviewUrl(dataUri);
        }}
        onImageCleared={() => {
          setImageUrl('');
          setPreviewUrl(null);
        }}
      />
      <ModelSelector value={aiModel} onChange={setAiModel} />
      <div className="flex items-center justify-between">
        <Label htmlFor="texture">Generate Texture</Label>
        <Switch id="texture" checked={shouldTexture} onCheckedChange={setShouldTexture} />
      </div>
      <Button
        onClick={handleGenerate}
        disabled={mutation.isPending || !imageUrl}
        className="w-full"
      >
        {mutation.isPending ? 'Generating...' : 'Generate 3D Model'}
      </Button>
    </div>
  );
}
