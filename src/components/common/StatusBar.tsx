// src/components/common/StatusBar.tsx
// Source: UI/UX §4, CSD §5

import { useCreditBalance } from '@hooks/useCreditBalance';
import { cn } from '@lib/utils';
import { useTaskStore } from '@stores/taskStore';
import { Activity, HardDrive, Wifi, WifiOff } from 'lucide-react';

export function StatusBar() {
  const activeTasks = useTaskStore((s) => s.activeTasks);
  const activeCount = Array.from(activeTasks.values()).filter(
    (t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS',
  ).length;

  // API connection status from credit balance query
  const { isSuccess: isApiConnected } = useCreditBalance();
  const storageUsage = 0;

  return (
    <footer className="z-30 flex h-8 shrink-0 items-center justify-between border-t border-border bg-bg-secondary px-4 text-xs text-text-muted">
      {/* Left: Active tasks */}
      <div className="flex items-center gap-2">
        <Activity className="h-3 w-3" />
        <span>
          {activeCount > 0
            ? `${activeCount} active task${activeCount > 1 ? 's' : ''}`
            : 'No active tasks'}
        </span>
      </div>

      {/* Right: Storage + API status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <HardDrive className="h-3 w-3" />
          <span>{storageUsage} assets</span>
        </div>
        <div className="flex items-center gap-1">
          {isApiConnected ? (
            <>
              <Wifi className="h-3 w-3 text-success" />
              <span className="text-success">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className={cn('h-3 w-3 text-text-muted')} />
              <span>Not connected</span>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
