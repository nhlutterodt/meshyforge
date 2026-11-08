// src/hooks/useApiKey.ts
// Source: FRD FR-KEY-01/02, CSD §5
//
// Owns every keychain IPC call the settings UI needs. Components call this
// hook, never `invoke` directly (frontend.md: "Components call application
// hooks, not Tauri commands directly").
//
// `get_api_key` reports existence only — it returns a boolean, never the
// secret, so the key itself cannot reach frontend state (SEC-01/SEC-04).

import { invoke } from '@lib/tauri';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** Cached existence of a stored API key. `data` is `true` / `false`.
 * Key name per UI_UX_Documentation.md §IPC hook table. */
export const API_KEY_EXISTENCE_QUERY_KEY = ['api-key'] as const;

export interface UseApiKeyResult {
  /** Whether a key is stored in the OS keychain (false until the check resolves). */
  readonly hasKey: boolean;
  /** The existence check has not produced a result yet. */
  readonly isChecking: boolean;
  /** Test a candidate key against the provider. Resolves false when invalid. */
  readonly validate: (key: string) => Promise<boolean>;
  /** Store a key in the OS keychain. */
  readonly save: (key: string) => Promise<void>;
  /** Remove the stored key. */
  readonly remove: () => Promise<void>;
}

export function useApiKey(): UseApiKeyResult {
  const qc = useQueryClient();

  const existenceQuery = useQuery({
    queryKey: API_KEY_EXISTENCE_QUERY_KEY,
    queryFn: () => invoke<boolean>('get_api_key'),
    retry: 0,
    staleTime: 30_000,
  });

  const validateMutation = useMutation({
    mutationFn: async (rawKey: string) => {
      // Send the trimmed key, not the raw input — a copy-pasted key
      // commonly carries a leading/trailing space or newline, which
      // Meshy's Bearer-token check rejects even though the key itself
      // is correct.
      const trimmedKey = rawKey.trim();
      return await invoke<boolean>('validate_api_key', { key: trimmedKey });
    },
    retry: 0,
  });

  const saveMutation = useMutation({
    mutationFn: async (rawKey: string) => {
      const trimmedKey = rawKey.trim();
      await invoke<void>('set_api_key', { key: trimmedKey });
    },
    onSuccess: () => {
      // The existence check is authoritative only for the keychain, and the
      // keychain cannot be read back here, so seed the cache with the result
      // we just produced instead of refetching.
      qc.setQueryData(API_KEY_EXISTENCE_QUERY_KEY, true);
      // Provider availability changed — the balance is now fetchable.
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },
    retry: 0,
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      await invoke<void>('delete_api_key');
    },
    onSuccess: () => {
      qc.setQueryData(API_KEY_EXISTENCE_QUERY_KEY, false);
      // Provider availability changed — the balance is no longer fetchable.
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },
    retry: 0,
  });

  return {
    hasKey: existenceQuery.data ?? false,
    isChecking: existenceQuery.isPending,
    validate: (key: string) => validateMutation.mutateAsync(key),
    save: (key: string) => saveMutation.mutateAsync(key),
    remove: () => removeMutation.mutateAsync(),
  };
}
