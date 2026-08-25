// src/components/settings/AboutPanel.tsx
// Source: FRD FR-SET-04, CSD §5

import { Separator } from '@components/ui/separator';
import { APP_NAME, APP_VERSION } from '@lib/constants';
import { ExternalLink } from 'lucide-react';

export function AboutPanel() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">About</h3>
      <Separator />
      <div className="space-y-2 text-sm text-text-secondary">
        <div className="flex justify-between">
          <span>Application</span>
          <span className="font-medium text-text-primary">{APP_NAME}</span>
        </div>
        <div className="flex justify-between">
          <span>Version</span>
          <span className="font-mono text-text-primary">{APP_VERSION}</span>
        </div>
        <div className="flex justify-between">
          <span>API Status</span>
          <a
            href="https://status.meshy.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-accent hover:text-accent-hover"
          >
            status.meshy.ai
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
