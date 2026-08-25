// src/app/layout.tsx
// Source: UI/UX §3, FRD FR-SET-01

import { Sidebar } from '@components/common/Sidebar';
import { StatusBar } from '@components/common/StatusBar';
import { TopBar } from '@components/common/TopBar';
import { TooltipProvider } from '@components/ui/tooltip';

interface LayoutProps {
  readonly children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden">
        {/* Row 1: TopBar (fixed height) */}
        <TopBar />

        {/* Row 2: Sidebar + Content (flex-1) */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar />
          <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
        </div>

        {/* Row 3: StatusBar (fixed height) */}
        <StatusBar />
      </div>
    </TooltipProvider>
  );
}
