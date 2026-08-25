// src/components/common/ImageDropzone.tsx
// Source: FRD FR-GEN-05, CSD §5

import { Button } from '@components/ui/button';
import { invoke } from '@lib/tauri';
import { cn } from '@lib/utils';
import { Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface ImageDropzoneProps {
  readonly onImageSelected: (filePath: string, dataUri: string) => void;
  readonly onImageCleared?: () => void;
  readonly previewUrl?: string | null;
  readonly label?: string;
  readonly isDisabled?: boolean;
}

const ACCEPTED_TYPES = ['.png', '.jpg', '.jpeg', '.webp'];

export function ImageDropzone({
  onImageSelected,
  onImageCleared,
  previewUrl = null,
  label = 'Upload Image',
  isDisabled = false,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function handleFileSelected(file: File) {
    // Read the file as data URI for preview
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      onImageSelected(file.name, dataUri);
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
          const filename = path.split(/[/\\]/).pop() ?? 'image';
          onImageSelected(filename, dataUri);
        }
      }
    } catch {
      // Fallback to native file input
      inputRef.current?.click();
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (isDisabled) return;

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

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Preview"
            className="h-48 w-full rounded-lg border border-border object-cover"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={() => {
              onImageCleared?.();
            }}
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            'flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
            isDragging ? 'border-accent bg-accent/10' : 'border-border hover:border-text-muted',
            isDisabled && 'pointer-events-none opacity-50',
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
          <Upload className="mb-2 h-6 w-6 text-text-muted" />
          <p className="text-sm text-text-muted">Drop an image or click to browse</p>
          <p className="text-xs text-text-muted">PNG, JPG, JPEG, WebP</p>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={isDisabled}
      />
    </div>
  );
}
