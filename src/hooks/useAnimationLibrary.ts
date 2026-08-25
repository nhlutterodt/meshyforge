// src/hooks/useAnimationLibrary.ts
// Source: hook_implementations.md §3

import type { AnimationLibraryItem } from '@lib/meshy-types';
import { invoke } from '@lib/tauri';
import { useQuery } from '@tanstack/react-query';

export function useAnimationLibrary() {
  return useQuery({
    queryKey: ['animation-library'],

    queryFn: async () => {
      return await invoke<AnimationLibraryItem[]>('fetch_animation_library');
    },

    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });
}
