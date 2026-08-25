// src/components/common/TopBar.tsx
// Source: UI/UX §4, CSD §5, FRD FR-SET-01

import { CreditBalance } from '@components/settings/CreditBalance';
import { Boxes } from 'lucide-react';

export function TopBar() {
  return (
    <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg-secondary px-4">
      {/* Logo / App name */}
      <div className="flex items-center gap-2">
        <Boxes className="h-5 w-5 text-accent" />
        <h1 className="text-base font-semibold">MeshyForge</h1>
      </div>

      {/* Credit balance slot */}
      <div className="flex items-center gap-4">
        <CreditBalance />
      </div>
    </header>
  );
}
