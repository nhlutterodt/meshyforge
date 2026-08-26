// src/hooks/useAnimationLibrary.ts
// Source: hook_implementations.md §3

import type { AnimationLibraryItem } from '@lib/meshy-types';
import { invoke } from '@lib/tauri';
import { useQuery } from '@tanstack/react-query';

export function useAnimationLibrary() {
  return useQuery({
    queryKey: ['animation-library'],

    queryFn: async () => {
      const data = await invoke<AnimationLibraryItem[]>('fetch_animation_library');
      // Defensive: the backend unwraps Meshy's `{ animations: [...] }` response
      // into a bare array, but guard here too in case a future provider (or
      // API change) reintroduces a shape mismatch — a crash here previously
      // took down the whole app (see docs/LESSONS_LEARNED.md).
      if (!Array.isArray(data)) {
        console.error('fetch_animation_library returned a non-array response:', data);
        return [];
      }
      return data;
    },

    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });
}
