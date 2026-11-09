// src/hooks/useRecovery.ts
// Source: FRD FR-INF-09 (database recovery), CSD §5
//
// Owns the recovery IPC surface: the startup status read used by `App` and the
// restore request used by `RecoveryScreen`. Components call this hook instead
// of invoking commands directly.

import { invoke } from '@lib/tauri';
import { useMutation, useQuery } from '@tanstack/react-query';

export interface RecoveryStatus {
  readonly state: 'Normal' | 'RecoveryRequired' | 'RecoveryInProgress' | 'RecoveryFailed';
  readonly backupIds: readonly string[];
  readonly quarantineExists: boolean;
  readonly failureCode: string | null;
}

export const RECOVERY_STATUS_QUERY_KEY = ['recovery-status'] as const;

/** Fallback used when the status cannot be read, so the app shell still renders. */
const NORMAL_STATUS: RecoveryStatus = {
  state: 'Normal',
  backupIds: [],
  quarantineExists: false,
  failureCode: null,
};

export interface UseRecoveryResult {
  /** `null` while the status is unknown; Normal fallback when the read failed. */
  readonly status: RecoveryStatus | null;
  readonly isChecking: boolean;
  readonly isError: boolean;
  /** Ask the app to restore the selected backup and restart into recovery mode. */
  readonly requestRecoveryRestore: (backupId: string) => Promise<void>;
  readonly isRestoring: boolean;
}

/** Startup read of the recovery state. Cached forever: it only changes on restart. */
export function useRecoveryStatus() {
  return useQuery({
    queryKey: RECOVERY_STATUS_QUERY_KEY,
    queryFn: () => invoke<RecoveryStatus>('recovery_status'),
    retry: 0,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** Request a restore from a verified backup; the command restarts the app on success. */
export function useRecoveryRestore() {
  return useMutation({
    mutationFn: async (backupId: string) => {
      await invoke<void>('request_recovery_restore', { backupId });
    },
    retry: 0,
  });
}

export function useRecovery(): UseRecoveryResult {
  const statusQuery = useRecoveryStatus();
  const restoreMutation = useRecoveryRestore();

  return {
    // The previous inline effect fell back to the Normal state when the read
    // failed, so the app shell still renders; `null` means "not known yet".
    status: statusQuery.data ?? (statusQuery.isError ? NORMAL_STATUS : null),
    isChecking: statusQuery.isPending,
    isError: statusQuery.isError,
    requestRecoveryRestore: (backupId: string) => restoreMutation.mutateAsync(backupId),
    isRestoring: restoreMutation.isPending,
  };
}
