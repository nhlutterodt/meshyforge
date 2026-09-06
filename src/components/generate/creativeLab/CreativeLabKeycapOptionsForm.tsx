// src/components/generate/creativeLab/CreativeLabKeycapOptionsForm.tsx
// Source: FRD FR-CLAB-07-F2 — Keycap build requires input_task_id +
// candidate_id (both required) plus 3 geometry options.

import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import type { CreativeLabKeycapOptions } from '@lib/meshy-types';

interface CreativeLabKeycapOptionsFormProps {
  readonly value: CreativeLabKeycapOptions;
  readonly onChange: (value: CreativeLabKeycapOptions) => void;
  readonly candidateId: string;
  readonly onCandidateIdChange: (candidateId: string) => void;
}

/** FR-CLAB-07-F2: base_model, head_size_mm (10-40), vertical_offset_mm
 * (-5 to 5), plus the required candidate_id.
 *
 * TODO(FR-CLAB-07-F1): the real Keycap prototype endpoint returns
 * `image_urls`/`candidate_ids` arrays to pick from. The Rust command layer
 * today still returns the generic `{ result: taskId }` shape shared by every
 * other create_* command (see src-tauri/src/commands/api.rs), so there is no
 * candidate array to render a picker from yet. Once the backend surfaces the
 * real prototype response shape, replace this manual text entry with an
 * actual candidate picker (e.g. a thumbnail grid keyed by candidate_id). */
export function CreativeLabKeycapOptionsForm({
  value,
  onChange,
  candidateId,
  onCandidateIdChange,
}: CreativeLabKeycapOptionsFormProps) {
  function setField<K extends keyof CreativeLabKeycapOptions>(
    key: K,
    fieldValue: CreativeLabKeycapOptions[K],
  ) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cl-keycap-candidate-id">Candidate ID</Label>
        <Input
          id="cl-keycap-candidate-id"
          value={candidateId}
          onChange={(e) => onCandidateIdChange(e.target.value)}
          placeholder="Candidate ID from the prototype result"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cl-keycap-base-model">Base Model</Label>
        <Select
          value={value.baseModel ?? 'cherry-mx-1x1-r1'}
          onValueChange={(v) =>
            setField('baseModel', (v ?? 'cherry-mx-1x1-r1') as 'cherry-mx-1x1-r1')
          }
        >
          <SelectTrigger id="cl-keycap-base-model" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cherry-mx-1x1-r1">Cherry MX 1x1 (R1)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cl-keycap-head-size">Head Size (mm, 10–40)</Label>
        <Input
          id="cl-keycap-head-size"
          type="number"
          min={10}
          max={40}
          value={value.headSizeMm ?? ''}
          onChange={(e) =>
            setField('headSizeMm', e.target.value === '' ? undefined : Number(e.target.value))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cl-keycap-vertical-offset">Vertical Offset (mm, -5–5)</Label>
        <Input
          id="cl-keycap-vertical-offset"
          type="number"
          step="0.1"
          min={-5}
          max={5}
          value={value.verticalOffsetMm ?? ''}
          onChange={(e) =>
            setField('verticalOffsetMm', e.target.value === '' ? undefined : Number(e.target.value))
          }
        />
      </div>
    </div>
  );
}
