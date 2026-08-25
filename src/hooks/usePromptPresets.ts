// src/hooks/usePromptPresets.ts
// Source: FRD FR-SET-05, UI/UX §12.7

import { invoke } from '@lib/tauri';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface PromptPreset {
  name: string;
  prompt: string;
  aiModel?: string;
  shouldRemesh?: boolean;
}

export function usePromptPresets() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['prompt-presets'],
    queryFn: async () => {
      const raw = await invoke<string | null>('get_setting', { key: 'prompt_presets' });
      if (!raw) return [];
      try {
        return JSON.parse(raw) as PromptPreset[];
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
    retry: 1,
  });

  const saveMutation = useMutation({
    mutationFn: async (presets: PromptPreset[]) => {
      await invoke('set_setting', {
        key: 'prompt_presets',
        value: JSON.stringify(presets),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompt-presets'] });
    },
    retry: 0,
  });

  function addPreset(preset: PromptPreset) {
    const current = query.data ?? [];
    saveMutation.mutate([...current, preset]);
  }

  function removePreset(name: string) {
    const current = query.data ?? [];
    saveMutation.mutate(current.filter((p) => p.name !== name));
  }

  return {
    presets: query.data ?? [],
    isLoading: query.isLoading,
    addPreset,
    removePreset,
  };
}
