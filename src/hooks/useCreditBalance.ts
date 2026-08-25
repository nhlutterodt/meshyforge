// src/hooks/useCreditBalance.ts
// Source: hook_implementations.md §3

import { invoke } from '@lib/tauri';
import { useQuery } from '@tanstack/react-query';

export function useCreditBalance() {
  return useQuery({
    queryKey: ['credit-balance'],

    queryFn: async () => {
      return await invoke<number>('get_credit_balance');
    },

    refetchInterval: 60_000,
    refetchOnWindowFocus: true,

    retry: 1,
  });
}
