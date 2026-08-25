// src/components/common/Sidebar.tsx
// Source: UI/UX §4, CSD §5, FRD FR-SET-02

import { Button } from '@components/ui/button';
import { cn } from '@lib/utils';
import { useAppStore } from '@stores/appStore';
import { Images, ListTodo, PanelLeft, PanelLeftClose, Settings, Sparkles } from 'lucide-react';

interface NavItem {
  readonly id: 'generate' | 'gallery' | 'tasks' | 'settings';
  readonly label: string;
  readonly icon: typeof Sparkles;
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'generate', label: 'Generate', icon: Sparkles },
  { id: 'gallery', label: 'Gallery', icon: Images },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  return (
    <nav
      className={cn(
        'z-20 flex shrink-0 flex-col border-r border-border bg-bg-secondary transition-all duration-200',
        sidebarCollapsed ? 'w-14' : 'w-56',
      )}
      aria-label="Main navigation"
    >
      {/* Collapse toggle */}
      <div className="flex h-14 items-center justify-end border-b border-border px-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Nav items */}
      <div className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <Button
              key={item.id}
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3',
                sidebarCollapsed && 'justify-center px-0',
              )}
              onClick={() => setActiveView(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
