// src/components/common/ErrorToast.tsx
// Source: UI/UX §9.3
// Toast helpers for standardized error display

import type { FrontendError } from '@lib/tauri';
import { toast } from 'sonner';

export function showErrorToast(error: unknown) {
  const err = error as FrontendError;
  const code = err?.code ?? 'UNKNOWN';
  const message = err?.message ?? 'An error occurred';

  switch (code) {
    case 'API_ERROR_402':
      toast.error('Insufficient credits', {
        description: 'Visit meshy.ai to purchase more credits.',
        duration: Number.POSITIVE_INFINITY,
      });
      break;

    case 'API_ERROR_401':
      toast.error('API key invalid or expired', {
        description: 'Update your API key in Settings.',
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: 'Update Key',
          onClick: () => {
            /* Navigate to settings */
          },
        },
      });
      break;

    case 'API_ERROR_429':
      toast.warning('Rate limit reached. Waiting before retry...');
      break;

    case 'NETWORK_ERROR':
      toast.error('Network error', {
        description: 'Check your connection and try again.',
        duration: Number.POSITIVE_INFINITY,
      });
      break;

    default:
      if (code.startsWith('API_ERROR_5')) {
        toast.error('Server error. Retrying...');
      } else {
        toast.error(message);
      }
  }
}
