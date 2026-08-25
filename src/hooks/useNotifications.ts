// src/hooks/useNotifications.ts
// Source: FRD FR-NOTIF-01, UI/UX §12.5

import { onEvent } from '@lib/tauri';
import { useSettingsStore } from '@stores/settingsStore';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useNotifications() {
  const notifyOnTaskComplete = useSettingsStore((s) => s.notifyOnTaskComplete);

  useEffect(() => {
    if (!notifyOnTaskComplete) {
      return;
    }

    let unlisten: (() => void) | undefined;

    async function setup() {
      unlisten = await onEvent<{ taskId: string; status: string }>('task-complete', (data) => {
        // Show OS notification
        const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window;
        if (isNotificationSupported && Notification.permission === 'granted') {
          const statusLabel = data.status.toLowerCase();
          const body =
            data.status === 'SUCCEEDED' ? 'Your 3D asset is ready.' : `Task ${statusLabel}.`;
          new Notification('MeshyForge', { body });
        }

        // Show toast
        if (data.status === 'SUCCEEDED') {
          toast.success('Task completed successfully');
        } else if (data.status === 'FAILED') {
          toast.error('Task failed');
        } else {
          toast(`Task ${data.status.toLowerCase()}`);
        }
      });
    }

    void setup();

    return () => {
      unlisten?.();
    };
  }, [notifyOnTaskComplete]);
}
