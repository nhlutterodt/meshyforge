// src/components/export/ExportProgress.tsx
// Source: FRD FR-EXP-02, CSD §5

import { Progress } from '@components/ui/progress';

interface ExportProgressProps {
  readonly current: number;
  readonly total: number;
  readonly fileName?: string;
}

export function ExportProgress({ current, total, fileName }: ExportProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const isComplete = current >= total;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">
          {isComplete ? 'Export complete' : `Exporting ${fileName ?? 'assets'}...`}
        </span>
        <span className="text-text-muted">
          {current}/{total}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className="text-right text-xs text-text-muted">{percentage}%</p>
    </div>
  );
}
