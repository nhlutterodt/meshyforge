// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

vi.mock('sonner', () => {
  const fn = vi.fn();
  return {
    toast: Object.assign(fn, {
      error: vi.fn(),
      warning: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
    }),
  };
});

import { showErrorToast } from '@components/common/ErrorToast';
import type { FrontendError } from '@lib/tauri';
import { toast } from 'sonner';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('showErrorToast', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.warning).mockReset();
  });

  // TC-NOTIF-03-01: 402 shows insufficient credits with buy credits action
  it('shows an insufficient credits error toast for API_ERROR_402', () => {
    const error: FrontendError = {
      code: 'API_ERROR_402',
      message: 'Insufficient credits',
    };

    showErrorToast(error);

    expect(toast.error).toHaveBeenCalledWith(
      'Insufficient credits',
      expect.objectContaining({
        description: 'Visit meshy.ai to purchase more credits.',
      }),
    );
  });

  // TC-NOTIF-03-02: 401 shows invalid API key with update key action to settings
  it('shows an invalid API key error toast with an Update Key action for API_ERROR_401', () => {
    const error: FrontendError = {
      code: 'API_ERROR_401',
      message: 'Unauthorized',
    };

    showErrorToast(error);

    expect(toast.error).toHaveBeenCalledWith(
      'API key invalid or expired',
      expect.objectContaining({
        description: 'Update your API key in Settings.',
        action: expect.objectContaining({
          label: 'Update Key',
        }),
      }),
    );
  });

  // TC-NOTIF-03-03: network error shows retry action
  it('shows a network error toast for NETWORK_ERROR', () => {
    const error: FrontendError = {
      code: 'NETWORK_ERROR',
      message: 'Failed to fetch',
    };

    showErrorToast(error);

    expect(toast.error).toHaveBeenCalledWith(
      'Network error',
      expect.objectContaining({
        description: 'Check your connection and try again.',
      }),
    );
  });

  // TC-NOTIF-03-04: 429 shows rate limited
  it('shows a rate-limited warning toast for API_ERROR_429', () => {
    const error: FrontendError = {
      code: 'API_ERROR_429',
      message: 'Too many requests',
    };

    showErrorToast(error);

    expect(toast.warning).toHaveBeenCalledWith('Rate limit reached. Waiting before retry...');
  });

  it('shows a server error toast for 5xx API errors', () => {
    const error: FrontendError = {
      code: 'API_ERROR_500',
      message: 'Internal server error',
    };

    showErrorToast(error);

    expect(toast.error).toHaveBeenCalledWith('Server error. Retrying...');
  });

  it('shows the error message for unknown error codes', () => {
    const error: FrontendError = {
      code: 'UNKNOWN',
      message: 'Something went wrong',
    };

    showErrorToast(error);

    expect(toast.error).toHaveBeenCalledWith('Something went wrong');
  });

  it('shows a generic message when the error has no code or message', () => {
    const error = {} as FrontendError;

    showErrorToast(error);

    expect(toast.error).toHaveBeenCalledWith('An error occurred');
  });
});
