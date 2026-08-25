// src/components/tasks/TaskMonitor.tsx
// Source: FRD FR-TASK-06, CSD §5

import { TaskCard } from '@components/tasks/TaskCard';
import { TaskHistory } from '@components/tasks/TaskHistory';
import { Button } from '@components/ui/button';
import { ScrollArea } from '@components/ui/scroll-area';
import { Separator } from '@components/ui/separator';
import { useActiveTaskPolling } from '@hooks/useActiveTaskPolling';
import { useTaskStore } from '@stores/taskStore';
import { Trash2 } from 'lucide-react';

export function TaskMonitor() {
  const activeTasks = useTaskStore((s) => s.activeTasks);
  const clearCompleted = useTaskStore((s) => s.clearCompleted);

  // Start polling all active tasks
  useActiveTaskPolling();

  const tasks = Array.from(activeTasks.values());
  const activeCount = tasks.filter(
    (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS',
  ).length;
  const completedCount = tasks.length - activeCount;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Task Monitor</h2>
        {completedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearCompleted}>
            <Trash2 className="mr-1 h-3 w-3" />
            Clear Finished ({completedCount})
          </Button>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="py-12 text-center text-text-muted">No active tasks</p>
      ) : (
        <ScrollArea className="h-[calc(100vh-16rem)]">
          <div className="space-y-3">
            {activeCount > 0 && (
              <p className="text-sm font-medium text-text-secondary">Active ({activeCount})</p>
            )}
            {tasks
              .filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS')
              .map((task) => (
                <TaskCard key={task.taskId} task={task} />
              ))}

            {completedCount > 0 && (
              <>
                <Separator className="my-4" />
                <TaskHistory />
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
