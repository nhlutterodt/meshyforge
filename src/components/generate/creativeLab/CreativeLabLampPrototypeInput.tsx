// src/components/generate/creativeLab/CreativeLabLampPrototypeInput.tsx
// Source: FRD FR-CLAB-06-F1/F2 — Lamp's prototype input is exactly one of
// `text` or `image_url` (mutually exclusive), plus an image-subject
// selector shown only when the image input mode is active.

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

export type CreativeLabLampInputMode = 'text' | 'image';

interface CreativeLabLampPrototypeInputProps {
  readonly mode: CreativeLabLampInputMode;
  readonly onModeChange: (mode: CreativeLabLampInputMode) => void;
  readonly text: string;
  readonly onTextChange: (text: string) => void;
  readonly imageUrl: string;
  readonly onImageChange: (dataUri: string) => void;
  readonly onImageCleared: () => void;
  readonly imageSubject: 'character' | 'landscape';
  readonly onImageSubjectChange: (subject: 'character' | 'landscape') => void;
}

/** FR-CLAB-06-F1: exactly one of `text` or `image_url` is required. Modeled
 * as a mode toggle rather than two simultaneous fields, so only one input
 * can ever be populated at a time. */
export function CreativeLabLampPrototypeInput({
  mode,
  onModeChange,
  text,
  onTextChange,
  imageUrl,
  onImageChange,
  onImageCleared,
  imageSubject,
  onImageSubjectChange,
}: CreativeLabLampPrototypeInputProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Input Mode</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'text' ? 'secondary' : 'ghost'}
            onClick={() => onModeChange('text')}
            className="flex-1"
          >
            Text
          </Button>
          <Button
            type="button"
            variant={mode === 'image' ? 'secondary' : 'ghost'}
            onClick={() => onModeChange('image')}
            className="flex-1"
          >
            Image
          </Button>
        </div>
      </div>

      {mode === 'text' ? (
        <PromptEditor value={text} onChange={onTextChange} />
      ) : (
        <>
          <ImageDropzone
            previewUrl={imageUrl || null}
            onImageSelected={(_filename, dataUri) => onImageChange(dataUri)}
            onImageCleared={onImageCleared}
          />
          <div className="space-y-2">
            <Label htmlFor="cl-lamp-image-subject">Image Subject</Label>
            <Select
              value={imageSubject}
              onValueChange={(v) =>
                onImageSubjectChange((v ?? 'character') as 'character' | 'landscape')
              }
            >
              <SelectTrigger id="cl-lamp-image-subject" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="character">Character</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
