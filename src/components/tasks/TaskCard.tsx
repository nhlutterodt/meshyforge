// src/components/tasks/TaskCard.tsx
// Source: UI/UX §4, CSD §5

import { TaskProgressBar } from '@components/tasks/TaskProgressBar';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import type { ActiveTask } from '@lib/meshy-types';
import { cn } from '@lib/utils';
import { formatRelativeTime } from '@lib/utils';
import { useTaskStore } from '@stores/taskStore';
import { X } from 'lucide-react';

interface TaskCardProps {
  readonly task: ActiveTask;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning',
  IN_PROGRESS: 'bg-accent/10 text-accent',
  SUCCEEDED: 'bg-success/10 text-success',
  FAILED: 'bg-danger/10 text-danger',
  CANCELED: 'bg-text-muted/10 text-text-muted',
};

export function TaskCard({ task }: TaskCardProps) {
  const removeTask = useTaskStore((s) => s.removeTask);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{task.label}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn('text-xs', STATUS_COLORS[task.status] ?? '')}>
              {task.status}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => removeTask(task.taskId)}
              aria-label="Remove task from monitor"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <TaskProgressBar progress={task.progress} status={task.status} />
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{formatRelativeTime(task.startedAt)}</span>
          {task.error && <span className="text-danger">{task.error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
