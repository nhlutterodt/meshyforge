// src/components/generate/creativeLab/CreativeLabBuildStage.tsx
// Source: FRD FR-CLAB-01-F2/02-F2/03-F2/06-F3/07-F2 — the build-stage form:
// the chained input_task_id plus whichever family-specific options apply.

import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import type {
  CreativeLabBadgeOptions,
  CreativeLabKeycapOptions,
  CreativeLabLampOptions,
  CreativeLabOutputFormat,
} from '@lib/meshy-types';
import { CreativeLabBadgeOptionsForm } from './CreativeLabBadgeOptionsForm';
import { CreativeLabKeycapOptionsForm } from './CreativeLabKeycapOptionsForm';
import { CreativeLabLampOptionsForm } from './CreativeLabLampOptionsForm';
import type { CreativeLabProductConfig } from './creativeLabConfig';

interface CreativeLabBuildStageProps {
  readonly config: CreativeLabProductConfig;
  readonly inputTaskId: string;
  readonly onInputTaskIdChange: (taskId: string) => void;
  readonly badgeOptions: CreativeLabBadgeOptions;
  readonly onBadgeOptionsChange: (value: CreativeLabBadgeOptions) => void;
  readonly lampOptions: CreativeLabLampOptions;
  readonly onLampOptionsChange: (value: CreativeLabLampOptions) => void;
  readonly keycapOptions: CreativeLabKeycapOptions;
  readonly onKeycapOptionsChange: (value: CreativeLabKeycapOptions) => void;
  readonly candidateId: string;
  readonly onCandidateIdChange: (candidateId: string) => void;
  readonly outputFormat: CreativeLabOutputFormat;
  readonly onOutputFormatChange: (value: CreativeLabOutputFormat) => void;
  readonly isPending: boolean;
  readonly onGenerate: () => void;
}

export function CreativeLabBuildStage({
  config,
  inputTaskId,
  onInputTaskIdChange,
  badgeOptions,
  onBadgeOptionsChange,
  lampOptions,
  onLampOptionsChange,
  keycapOptions,
  onKeycapOptionsChange,
  candidateId,
  onCandidateIdChange,
  outputFormat,
  onOutputFormatChange,
  isPending,
  onGenerate,
}: CreativeLabBuildStageProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cl-input-task-id">Input Task ID</Label>
        <Input
          id="cl-input-task-id"
          value={inputTaskId}
          onChange={(e) => onInputTaskIdChange(e.target.value)}
          placeholder="Task ID of the succeeded prototype"
        />
      </div>
      {config.family === 'badge' && (
        <CreativeLabBadgeOptionsForm
          value={badgeOptions}
          onChange={onBadgeOptionsChange}
          outputFormat={outputFormat}
          onOutputFormatChange={onOutputFormatChange}
        />
      )}
      {config.family === 'lamp' && (
        <CreativeLabLampOptionsForm
          value={lampOptions}
          onChange={onLampOptionsChange}
          outputFormat={outputFormat}
          onOutputFormatChange={onOutputFormatChange}
        />
      )}
      {config.family === 'keycap' && (
        <CreativeLabKeycapOptionsForm
          value={keycapOptions}
          onChange={onKeycapOptionsChange}
          candidateId={candidateId}
          onCandidateIdChange={onCandidateIdChange}
        />
      )}
      <Button onClick={onGenerate} disabled={isPending} className="w-full">
        {isPending ? 'Generating...' : 'Generate Build'}
      </Button>
    </div>
  );
}
