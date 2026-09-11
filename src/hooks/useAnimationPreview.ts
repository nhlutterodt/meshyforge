// src/hooks/useAnimationPreview.ts
// Source: ADR-0011 — local-first animation preview cache

import { invoke } from '@lib/tauri';
import { useQuery } from '@tanstack/react-query';

/**
 * Resolve an animation preview to a locally cached file path.
 *
 * The local cache is the primary render source; the provider CDN is only a
 * fallback for the caller to use while this resolves, or if it fails. Retry is
 * disabled so a failed cache attempt falls back immediately rather than
 * stalling the picker.
 */
export function useAnimationPreview(key: string | undefined, previewUrl: string | undefined) {
  return useQuery({
    queryKey: ['animation-preview', key],
    enabled: Boolean(key) && Boolean(previewUrl),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    queryFn: () => invoke<string>('cache_animation_preview', { key, previewUrl }),
  });
}
