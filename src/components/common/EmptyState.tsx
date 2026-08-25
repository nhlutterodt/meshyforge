// src/components/common/EmptyState.tsx
// Source: UI/UX §9.2

import { Button } from '@components/ui/button';
import type { ComponentType } from 'react';

interface EmptyStateProps {
  readonly icon: ComponentType<{ className?: string }>;
  readonly title: string;
  readonly description: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="mb-4 h-12 w-12 text-text-muted" />
      <h3 className="text-base font-medium text-text-secondary">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
