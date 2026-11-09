// src/components/settings/CreditBalance.tsx
// Source: FRD FR-KEY-03/04, CSD §5

import { Button } from '@components/ui/button';
import { Skeleton } from '@components/ui/skeleton';
import { useCreditBalance } from '@hooks/useCreditBalance';
import { formatCredits } from '@lib/utils';
import { Coins, RefreshCw } from 'lucide-react';

export function CreditBalance() {
  const { data, isLoading, isError, refetch } = useCreditBalance();

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Coins className="h-4 w-4" />
        <span>—</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Coins className="h-4 w-4 text-warning" />
      {isLoading ? (
        <Skeleton className="h-4 w-16" />
      ) : (
        <span className="text-sm font-medium" aria-live="polite">
          {formatCredits(data ?? 0)} credits
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => refetch()}
        aria-label="Refresh credit balance"
        disabled={isLoading}
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
}
