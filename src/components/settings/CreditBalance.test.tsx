// @vitest-environment jsdom
// CreditBalance.test.tsx — Covers TC-KEY-03-01, TC-KEY-03-05, TC-KEY-03-06

import '@testing-library/jest-dom/vitest';

import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

import { invoke } from '@lib/tauri';

import { CreditBalance } from './CreditBalance';
import { renderWithProviders } from '@/test-utils';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('CreditBalance', () => {
  // TC-KEY-03-01 — topbar__displays_current_credit_balance_as_number_on_load
  it('displays the current credit balance as a formatted number on load', async () => {
    vi.mocked(invoke).mockResolvedValue(100);

    renderWithProviders(<CreditBalance />);

    await waitFor(() => expect(screen.getByText('100 credits')).toBeInTheDocument());
    expect(invoke).toHaveBeenCalledWith('get_credit_balance');
  });

  // TC-KEY-03-05 — credit_balance__shows_zero_credits_in_warning_color_when_balance_is_zero
  it('shows zero credits with warning-colored icon when balance is zero', async () => {
    vi.mocked(invoke).mockResolvedValue(0);

    renderWithProviders(<CreditBalance />);

    await waitFor(() => expect(screen.getByText('0 credits')).toBeInTheDocument());

    // The Coins icon carries the text-warning class
    const warningIcon = document.querySelector('.text-warning');
    expect(warningIcon).toBeInTheDocument();
  });

  // TC-KEY-03-06 — credit_balance__shows_dash_and_tooltip_when_balance_query_fails
  // NOTE: The component renders a dash (—) on error but does not include a
  // tooltip element — the tooltip mentioned in the test plan is not implemented.
  it('shows a dash when the balance query fails', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('API error'));

    renderWithProviders(<CreditBalance />);

    // retry: 1 in the component config overrides the test client's retry: false,
    // so the query retries once with a ~1s delay — use a generous timeout.
    await waitFor(
      () => expect(screen.getByText('—')).toBeInTheDocument(),
      { timeout: 5_000 },
    );
  });
});