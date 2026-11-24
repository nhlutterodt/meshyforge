// src/lib/errors.ts
// CSD §10.3 — the single place a stable error code becomes a user-facing action.
//
// Why this exists: `invoke()` already types its rejections as `FrontendError`
// and the Rust command layer already emits stable CSD §10.2 codes, but nothing
// consumed the code. Every failure therefore surfaced as the same generic
// toast, which made the codes decorative and let the emitted vocabulary drift
// unnoticed (the `DB_ERROR`/`DATABASE_ERROR` split is what that cost).
//
// Every mutation's `onError` routes through `handleMutationError`. The switch is
// keyed on the documented catalog codes only; an uncatalogued code falls to
// `default`, which still shows the backend's sanitized message rather than
// swallowing it.

import { type FrontendError, openExternalUrl } from '@lib/tauri';
import { useAppStore } from '@stores/appStore';
import { toast } from 'sonner';

/** CSD §10.2 `API_ERROR_402` user action. */
const SUBSCRIPTION_URL = 'https://www.meshy.ai/settings/subscription';

function openSettings(): void {
  useAppStore.getState().setActiveView('settings');
}

/**
 * Normalize an unknown rejection into the typed shape.
 *
 * `invoke()` throws a plain `{ code, message }` object rather than an `Error`,
 * so a mutation's `onError` argument (typed `Error` by TanStack Query) is not
 * what actually arrives. Mirrors `useReadImageFile`'s helper, which established
 * this normalization.
 */
export function toFrontendError(caught: unknown): FrontendError {
  const fallback = 'An unexpected error occurred.';
  if (caught && typeof caught === 'object') {
    const candidate = caught as { code?: unknown; message?: unknown };
    return {
      code: typeof candidate.code === 'string' ? candidate.code : 'UNKNOWN',
      message: typeof candidate.message === 'string' ? candidate.message : fallback,
    };
  }
  if (typeof caught === 'string' && caught.length > 0) {
    return { code: 'UNKNOWN', message: caught };
  }
  return { code: 'UNKNOWN', message: fallback };
}

/**
 * CSD §10.3: map a mutation failure to the toast and action the catalog
 * prescribes.
 *
 * `context` feeds the console line only — it never reaches the toast, so an
 * internal label cannot leak into user-facing copy.
 *
 * Two deliberate departures from the §10.3 sample code, both because the
 * sample's copy would be false here:
 * - `API_ERROR_429` does not promise an automatic retry — every mutation is
 *   created with `retry: 0`, so the honest description is to wait and retry.
 * - `NETWORK_ERROR` omits the sample's `window.location.reload()` action —
 *   reloading the webview discards in-progress form state, and a generic
 *   handler has no mutation handle to re-run.
 * Both are catalog/doc follow-ups, not silent behavior changes.
 */
export function handleMutationError(caught: unknown, context?: string): void {
  const error = toFrontendError(caught);
  if (context) {
    console.error(`${context} failed:`, error);
  }

  switch (error.code) {
    case 'MISSING_API_KEY':
      toast.error('No API Key', {
        description: 'Add your Meshy API key in Settings to start generating.',
        action: { label: 'Open Settings', onClick: openSettings },
      });
      break;

    case 'API_ERROR_401':
      toast.error('Invalid API Key', {
        description: 'Your API key is invalid or expired.',
        action: { label: 'Update Key', onClick: openSettings },
      });
      break;

    case 'API_ERROR_402':
      toast.error('Insufficient Credits', {
        description: 'Purchase more credits at meshy.ai to continue.',
        action: {
          label: 'Buy Credits',
          onClick: () => {
            void openExternalUrl(SUBSCRIPTION_URL);
          },
        },
      });
      break;

    case 'API_ERROR_429':
      toast.warning('Rate Limited', {
        description: 'Too many requests. Wait a moment and try again.',
      });
      break;

    case 'NETWORK_ERROR':
      toast.error('Network Error', {
        description: 'Check your internet connection and try again.',
      });
      break;

    case 'INVALID_INPUT':
      toast.error('Invalid Input', { description: error.message });
      break;

    default:
      toast.error('Error', { description: error.message });
  }
}
