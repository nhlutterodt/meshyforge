// src/components/generate/ImageGenPanel.tsx
// Source: FRD FR-IMG-01/02, CSD §5

import { ImageDropzone } from '@components/common/ImageDropzone';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { useCreateImageToImage, useCreateTextToImage } from '@hooks/useMeshyApi';
import type { ImageToImageRequest, TextToImageRequest } from '@lib/meshy-types';
import { useState } from 'react';
import { toast } from 'sonner';

const IMAGE_MODELS = ['nano-banana', 'nano-banana-2', 'nano-banana-pro', 'gpt-image-2'] as const;
type ImageModel = (typeof IMAGE_MODELS)[number];

export function ImageGenPanel() {
  const textMutation = useCreateTextToImage();
  const imageMutation = useCreateImageToImage();
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<ImageModel>('nano-banana');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [refImageUrl, setRefImageUrl] = useState<string[]>([]);

  function handleTextToImage() {
    if (!prompt.trim()) return toast.error('Prompt is required');
    const body: TextToImageRequest = { aiModel: model, prompt: prompt.trim() };
    textMutation.mutate(body, {
      onSuccess: () => toast.success('Text-to-image task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  function handleImageToImage() {
    if (!prompt.trim()) return toast.error('Prompt is required');
    if (refImageUrl.length === 0) return toast.error('Reference image required');
    const body: ImageToImageRequest = {
      aiModel: model,
      prompt: prompt.trim(),
      referenceImageUrls: refImageUrl,
    };
    imageMutation.mutate(body, {
      onSuccess: () => toast.success('Image-to-image task created'),
      onError: (e) => toast.error(e.message ?? 'Failed'),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Image Generation</h2>
      <div className="space-y-2">
        <Label htmlFor="img-model">AI Model</Label>
        <Select value={model} onValueChange={(v) => setModel(v as ImageModel)}>
          <SelectTrigger id="img-model" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_MODELS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Tabs defaultValue="text">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="text">Text to Image</TabsTrigger>
          <TabsTrigger value="image">Image to Image</TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="space-y-4">
          <PromptEditor value={prompt} onChange={setPrompt} />
          <Button
            onClick={handleTextToImage}
            disabled={textMutation.isPending || !prompt.trim()}
            className="w-full"
          >
            {textMutation.isPending ? 'Generating...' : 'Generate Image'}
          </Button>
        </TabsContent>
        <TabsContent value="image" className="space-y-4">
          <ImageDropzone
            previewUrl={previewUrl}
            onImageSelected={(_f, dataUri) => {
              setRefImageUrl([dataUri]);
              setPreviewUrl(dataUri);
            }}
            onImageCleared={() => {
              setRefImageUrl([]);
              setPreviewUrl(null);
            }}
          />
          <PromptEditor value={prompt} onChange={setPrompt} />
          <Button
            onClick={handleImageToImage}
            disabled={imageMutation.isPending || !prompt.trim() || refImageUrl.length === 0}
            className="w-full"
          >
            {imageMutation.isPending ? 'Generating...' : 'Generate Image'}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
