// src/components/common/ModelSelector.tsx
// Source: UI/UX §4, CSD §5

import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import type { ModelId } from '@lib/meshy-types';

interface ModelSelectorProps {
  readonly value: ModelId;
  readonly onChange: (model: ModelId) => void;
  readonly isDisabled?: boolean;
  readonly label?: string;
}

const MODELS: readonly { value: ModelId; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'meshy-7', label: 'Meshy 7' },
  { value: 'meshy-6', label: 'Meshy 6' },
  { value: 'meshy-5', label: 'Meshy 5' },
];

export function ModelSelector({
  value,
  onChange,
  isDisabled = false,
  label = 'AI Model',
}: ModelSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="ai-model">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as ModelId)} disabled={isDisabled}>
        <SelectTrigger id="ai-model" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODELS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
