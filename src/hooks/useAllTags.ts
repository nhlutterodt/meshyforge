// src/hooks/useAllTags.ts
// Fetches all unique tags from the database for the TagFilter dropdown.

import { invoke } from '@lib/tauri';
import { useQuery } from '@tanstack/react-query';

export function useAllTags() {
  return useQuery({
    queryKey: ['all-tags'],
    queryFn: async () => {
      // `get_all_tags` returns the tag names directly. This previously
      // fetched EVERY asset row via `get_all_assets` and reduced them here,
      // which meant the whole asset table crossed IPC — including prompts,
      // notes, and the `file_paths`/`texture_paths` blobs — just to build a
      // dropdown of short strings. The dedupe now happens in SQL.
      return await invoke<string[]>('get_all_tags');
    },
    staleTime: 10_000,
    retry: 1,
  });
}
