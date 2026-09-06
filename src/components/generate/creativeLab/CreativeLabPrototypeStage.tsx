// src/components/generate/creativeLab/CreativeLabPrototypeStage.tsx
// Source: FRD FR-CLAB-01-F1/03-F1/06-F1/07-F1 — the prototype-stage form,
// which varies only for Lamp (mutually-exclusive text/image input).

import { ImageDropzone } from '@components/common/ImageDropzone';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import {
  type CreativeLabLampInputMode,
  CreativeLabLampPrototypeInput,
} from './CreativeLabLampPrototypeInput';
import type { CreativeLabProductConfig } from './creativeLabConfig';

interface CreativeLabPrototypeStageProps {
  readonly config: CreativeLabProductConfig;
  readonly imageUrl: string;
  readonly onImageChange: (dataUri: string) => void;
  readonly onImageCleared: () => void;
  readonly name: string;
  readonly onNameChange: (name: string) => void;
  readonly lampMode: CreativeLabLampInputMode;
  readonly onLampModeChange: (mode: CreativeLabLampInputMode) => void;
  readonly lampText: string;
  readonly onLampTextChange: (text: string) => void;
  readonly imageSubject: 'character' | 'landscape';
  readonly onImageSubjectChange: (subject: 'character' | 'landscape') => void;
  readonly isPending: boolean;
  readonly onGenerate: () => void;
  readonly lastPrototypeTaskId: string | null;
  readonly onBuildClick: () => void;
}

export function CreativeLabPrototypeStage({
  config,
  imageUrl,
  onImageChange,
  onImageCleared,
  name,
  onNameChange,
  lampMode,
  onLampModeChange,
  lampText,
  onLampTextChange,
  imageSubject,
  onImageSubjectChange,
  isPending,
  onGenerate,
  lastPrototypeTaskId,
  onBuildClick,
}: CreativeLabPrototypeStageProps) {
  const isLamp = config.value === 'lamp';

  return (
    <div className="space-y-4">
      {isLamp ? (
        <CreativeLabLampPrototypeInput
          mode={lampMode}
          onModeChange={onLampModeChange}
          text={lampText}
          onTextChange={onLampTextChange}
          imageUrl={imageUrl}
          onImageChange={onImageChange}
          onImageCleared={onImageCleared}
          imageSubject={imageSubject}
          onImageSubjectChange={onImageSubjectChange}
        />
      ) : (
        <>
          <ImageDropzone
            previewUrl={imageUrl || null}
            onImageSelected={(_filename, dataUri) => onImageChange(dataUri)}
            onImageCleared={onImageCleared}
          />
          {config.family === 'badge' && (
            <div className="space-y-2">
              <Label htmlFor="cl-name">Name (optional)</Label>
              <Input id="cl-name" value={name} onChange={(e) => onNameChange(e.target.value)} />
            </div>
          )}
        </>
      )}
      <Button onClick={onGenerate} disabled={isPending} className="w-full">
        {isPending ? 'Generating...' : 'Generate Prototype'}
      </Button>
      {lastPrototypeTaskId && (
        <Button variant="outline" className="w-full" onClick={onBuildClick}>
          Build {config.label}
        </Button>
      )}
    </div>
  );
}
