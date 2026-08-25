// src/components/tasks/TaskHistory.tsx
// Source: FRD FR-TASK-06, CSD §5

import { Badge } from '@components/ui/badge';
import { cn } from '@lib/utils';
import { formatRelativeTime } from '@lib/utils';
import { useTaskStore } from '@stores/taskStore';

const TERMINAL_STATUSES = ['SUCCEEDED', 'FAILED', 'CANCELED'];

export function TaskHistory() {
  const activeTasks = useTaskStore((s) => s.activeTasks);
  const completed = Array.from(activeTasks.values()).filter((t) =>
    TERMINAL_STATUSES.includes(t.status),
  );

  if (completed.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text-muted">Recent</p>
      {completed.map((task) => (
        <div
          key={task.taskId}
          className="flex items-center justify-between rounded-lg border border-border bg-bg-tertiary px-3 py-2"
        >
          <span className="text-sm text-text-secondary">{task.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">{formatRelativeTime(task.startedAt)}</span>
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                task.status === 'SUCCEEDED' && 'text-success',
                task.status === 'FAILED' && 'text-danger',
                task.status === 'CANCELED' && 'text-text-muted',
              )}
            >
              {task.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
