// src/components/tasks/TaskProgressBar.tsx
// Source: UI/UX §9, CSD §5

import { Progress } from '@components/ui/progress';
import { cn } from '@lib/utils';

interface TaskProgressBarProps {
  readonly progress: number;
  readonly status: string;
}

export function TaskProgressBar({ progress, status }: TaskProgressBarProps) {
  const isTerminal = status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELED';
  const displayProgress = isTerminal ? 100 : progress;

  return (
    <div className="space-y-1">
      <Progress
        value={displayProgress}
        className={cn(
          'h-2',
          status === 'FAILED' && '[&>div]:bg-danger',
          status === 'SUCCEEDED' && '[&>div]:bg-success',
          status === 'CANCELED' && '[&>div]:bg-text-muted',
        )}
      />
      <div className="flex justify-end">
        <span className="text-xs text-text-muted">{displayProgress}%</span>
      </div>
    </div>
  );
}
