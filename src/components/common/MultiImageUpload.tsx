// src/components/common/MultiImageUpload.tsx
// Source: FRD FR-GEN-04-F1–F4, CSD §5
//
// Multi-image upload component for the Multi-Image to 3D panel.
// Shows a thumbnail grid (1–4 images), per-image remove button,
// "Primary (front view)" label on the first image, and enforces
// the maximum image count.

import { Button } from '@components/ui/button';
import { invoke } from '@lib/tauri';
import { cn } from '@lib/utils';
import { Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface MultiImageUploadProps {
  readonly images: string[];
  readonly onImagesChange: (images: string[]) => void;
  readonly maxImages?: number;
  readonly label?: string;
}

const ACCEPTED_TYPES = ['.png', '.jpg', '.jpeg', '.webp'];

export function MultiImageUpload({
  images,
  onImagesChange,
  maxImages = 4,
  label = 'Upload Images',
}: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function addImage(dataUri: string) {
    if (images.length >= maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }
    onImagesChange([...images, dataUri]);
  }

  function removeImage(index: number) {
    onImagesChange(images.filter((_, i) => i !== index));
  }

  async function handleFileSelected(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      addImage(dataUri);
    };
    reader.readAsDataURL(file);
  }

  async function handleOpenDialog() {
    try {
      const filePath = await invoke<string[]>('open_dialog', {
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
        multiple: false,
      });

      if (filePath && filePath.length > 0) {
        const path = filePath[0];
        if (path) {
          const dataUri = await invoke<string>('read_file_as_data_uri', { path });
          addImage(dataUri);
        }
      }
    } catch {
      inputRef.current?.click();
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) =>
      ACCEPTED_TYPES.some((ext) => f.name.toLowerCase().endsWith(ext)),
    );
    if (imageFile) {
      void handleFileSelected(imageFile);
    } else {
      toast.error('Please drop a valid image file (PNG, JPG, JPEG, WebP)');
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileSelected(file);
    }
  }

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {images.map((image, index) => (
            <div key={image} className="relative">
              <img
                src={image}
                alt={index === 0 ? 'Primary view (front)' : `View ${index + 1}`}
                className="h-32 w-full rounded-lg border border-border object-cover"
              />
              {index === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-accent/80 px-1.5 py-0.5 text-xs text-accent-foreground">
                  Primary (front view)
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={() => removeImage(index)}
                aria-label={`Remove image ${index + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {canAddMore && (
        <button
          type="button"
          className={cn(
            'flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
            isDragging ? 'border-accent bg-accent/10' : 'border-border hover:border-text-muted',
          )}
          onClick={handleOpenDialog}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          aria-label="Drop image here or click to browse"
        >
          <Upload className="mb-1.5 h-5 w-5 text-text-muted" />
          <p className="text-xs text-text-muted">
            {images.length === 0
              ? 'Drop images or click to browse'
              : `Add ${maxImages - images.length} more image${maxImages - images.length > 1 ? 's' : ''}`}
          </p>
          <p className="text-xs text-text-muted">PNG, JPG, JPEG, WebP</p>
        </button>
      )}
      <p className="text-xs text-text-muted">
        {images.length} of {maxImages} images selected
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
