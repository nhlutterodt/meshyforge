// src/components/common/PromptEditor.tsx
// Source: UI/UX §8, CSD §5

import { Label } from '@components/ui/label';
import { Textarea } from '@components/ui/textarea';

interface PromptEditorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly maxLength?: number;
  readonly label?: string;
  readonly isDisabled?: boolean;
}

export function PromptEditor({
  value,
  onChange,
  placeholder = 'Describe what you want to generate...',
  maxLength = 600,
  label = 'Prompt',
  isDisabled = false,
}: PromptEditorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="prompt">{label}</Label>
        <span className="text-xs text-text-muted">
          {value.length}/{maxLength}
        </span>
      </div>
      <Textarea
        id="prompt"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={isDisabled}
        className="min-h-24 resize-none"
        aria-label={label}
      />
      {value.length > maxLength - 50 && (
        <p className="text-xs text-warning">Approaching character limit</p>
      )}
    </div>
  );
}
