// src/components/generate/MultiImagePanel.tsx
// Source: FRD FR-GEN-04, CSD §5

import { ImageDropzone } from '@components/common/ImageDropzone';
import { Button } from '@components/ui/button';
import { useCreateMultiImageTo3D } from '@hooks/useMeshyApi';
import type { MultiImageTo3DRequest } from '@lib/meshy-types';
import { useState } from 'react';
import { toast } from 'sonner';

export function MultiImagePanel() {
  const mutation = useCreateMultiImageTo3D();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleGenerate() {
    if (imageUrls.length === 0) {
      toast.error('Please add at least one image');
      return;
    }
    const body: MultiImageTo3DRequest = { imageUrls };
    mutation.mutate(body, {
      onSuccess: () => {
        toast.success('Multi-image-to-3D task created');
        setImageUrls([]);
        setPreviewUrl(null);
      },
      onError: (err) => toast.error(err.message ?? 'Failed to create task'),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Multi-Image to 3D</h2>
      <p className="text-sm text-text-muted">Upload 1–4 images to generate a 3D model.</p>
      <ImageDropzone
        previewUrl={previewUrl}
        onImageSelected={(_filename, dataUri) => {
          if (imageUrls.length >= 4) {
            toast.error('Maximum 4 images allowed');
            return;
          }
          setImageUrls([...imageUrls, dataUri]);
          setPreviewUrl(dataUri);
        }}
        onImageCleared={() => {
          setImageUrls([]);
          setPreviewUrl(null);
        }}
      />
      {imageUrls.length > 0 && (
        <p className="text-sm text-text-secondary">{imageUrls.length} image(s) selected</p>
      )}
      <Button
        onClick={handleGenerate}
        disabled={mutation.isPending || imageUrls.length === 0}
        className="w-full"
      >
        {mutation.isPending ? 'Generating...' : 'Generate 3D Model'}
      </Button>
    </div>
  );
}
