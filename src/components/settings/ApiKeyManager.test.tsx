// @vitest-environment jsdom
// ApiKeyManager.test.tsx — Covers TC-KEY-01-01 through TC-KEY-01-06

import '@testing-library/jest-dom/vitest';

import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

vi.mock('sonner', () => {
  const toastFn = vi.fn();
  return {
    toast: Object.assign(toastFn, {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    }),
  };
});

import { invoke } from '@lib/tauri';
import { toast } from 'sonner';

import { ApiKeyManager } from './ApiKeyManager';

beforeEach(() => {
  vi.clearAllMocks();
  // Default mock: no stored key, validation succeeds
  vi.mocked(invoke).mockImplementation((cmd: string) => {
    if (cmd === 'get_api_key') return Promise.resolve(false);
    if (cmd === 'validate_api_key') return Promise.resolve(true);
    if (cmd === 'set_api_key') return Promise.resolve(undefined);
    if (cmd === 'delete_api_key') return Promise.resolve(undefined);
    return Promise.resolve(undefined);
  });
});

afterEach(() => {
  cleanup();
});

describe('ApiKeyManager', () => {
  // TC-KEY-01-01 — settings__shows_api_key_input_and_validate_button_on_first_launch
  it('shows API key input and validate button on first launch when no key is stored', async () => {
    render(<ApiKeyManager />);

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('get_api_key'));

    expect(screen.getByLabelText('Enter your Meshy API key')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('msy_...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /validate/i })).toBeInTheDocument();
    expect(screen.queryByText('Configured')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove key/i })).not.toBeInTheDocument();
  });

  // TC-KEY-01-02 — validate__on_success_stores_key_and_shows_balance_success_toast
  // NOTE: The component separates Validate and Save. Validate shows
  // "API key is valid"; Save calls set_api_key and shows "API key saved to keychain".
  // The test plan mentions "toast with balance" but the component does not display
  // balance in the toast — that feature is not implemented.
  it('on validate success, stores key via set_api_key and shows success toast', async () => {
    const user = userEvent.setup();
    render(<ApiKeyManager />);

    const input = screen.getByLabelText('Enter your Meshy API key');
    await user.type(input, 'msy_test_key_12345');

    await user.click(screen.getByRole('button', { name: /validate/i }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('API key is valid'));

    const saveBtn = screen.getByRole('button', { name: /save to keychain/i });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    await user.click(saveBtn);

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('set_api_key', { key: 'msy_test_key_12345' }),
    );
    expect(toast.success).toHaveBeenCalledWith('API key saved to keychain');
  });

  // Regression test: a copy-pasted API key commonly carries a leading or
  // trailing space/newline (e.g. from a terminal `cat` or a triple-click
  // browser selection). Meshy's Bearer-token check treats that as a
  // different, invalid token even though the key itself is correct, so
  // the untrimmed value must never reach invoke('validate_api_key', ...)
  // or invoke('set_api_key', ...).
  it('trims whitespace from a pasted key before validating and saving', async () => {
    const user = userEvent.setup();
    render(<ApiKeyManager />);

    const input = screen.getByLabelText('Enter your Meshy API key');
    await user.click(input);
    await user.paste('  msy_test_key_12345\n');

    await user.click(screen.getByRole('button', { name: /validate/i }));

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('validate_api_key', { key: 'msy_test_key_12345' }),
    );

    const saveBtn = screen.getByRole('button', { name: /save to keychain/i });
    await waitFor(() => expect(saveBtn).not.toBeDisabled());
    await user.click(saveBtn);

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('set_api_key', { key: 'msy_test_key_12345' }),
    );
  });

  // TC-KEY-01-03 — validate__on_failure_shows_invalid_key_error_toast_and_does_not_store
  it('on validate failure, shows error toast and does not store the key', async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === 'get_api_key') return Promise.resolve(false);
      if (cmd === 'validate_api_key') return Promise.reject(new Error('401 Unauthorized'));
      return Promise.resolve(undefined);
    });

    const user = userEvent.setup();
    render(<ApiKeyManager />);

    const input = screen.getByLabelText('Enter your Meshy API key');
    await user.type(input, 'msy_invalid_key');

    await user.click(screen.getByRole('button', { name: /validate/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to validate API key'));

    // set_api_key must never have been called
    const setKeyCalls = vi.mocked(invoke).mock.calls.filter((c) => c[0] === 'set_api_key');
    expect(setKeyCalls).toHaveLength(0);

    // Save button must still be disabled
    expect(screen.getByRole('button', { name: /save to keychain/i })).toBeDisabled();
  });

  // TC-KEY-01-04 — settings__shows_masked_placeholder_and_delete_button_when_key_already_stored
  // NOTE: The component shows a "Configured" badge and "Remove Key" button rather
  // than a masked msy_•••• placeholder — the placeholder text is not implemented.
  it('shows configured badge and remove key button when a key is already stored', async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === 'get_api_key') return Promise.resolve(true);
      return Promise.resolve(undefined);
    });

    render(<ApiKeyManager />);

    await waitFor(() => expect(screen.getByText('Configured')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /remove key/i })).toBeInTheDocument();
  });

  // TC-KEY-01-05 — validate_button__disabled_with_spinner_while_validation_in_flight
  it('disables validate button and shows spinner while validation is in flight', async () => {
    let resolveValidate: (value: boolean) => void = () => {};
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === 'get_api_key') return Promise.resolve(false);
      if (cmd === 'validate_api_key')
        return new Promise<boolean>((resolve) => {
          resolveValidate = resolve;
        });
      return Promise.resolve(undefined);
    });

    const user = userEvent.setup();
    render(<ApiKeyManager />);

    const input = screen.getByLabelText('Enter your Meshy API key');
    await user.type(input, 'msy_pending_key');

    const validateBtn = screen.getByRole('button', { name: /validate/i });
    await user.click(validateBtn);

    await waitFor(() => expect(validateBtn).toBeDisabled());
    expect(validateBtn.querySelector('.animate-spin')).toBeInTheDocument();

    // Resolve the pending promise so the test can clean up
    await act(async () => {
      resolveValidate(true);
    });
  });

  // TC-KEY-01-06 — delete_key__clears_stored_key_via_delete_key_command
  it('clears stored key via delete_api_key command when Remove Key is clicked', async () => {
    vi.mocked(invoke).mockImplementation((cmd: string) => {
      if (cmd === 'get_api_key') return Promise.resolve(true);
      if (cmd === 'delete_api_key') return Promise.resolve(undefined);
      return Promise.resolve(undefined);
    });

    const user = userEvent.setup();
    render(<ApiKeyManager />);

    await waitFor(() => expect(screen.getByText('Configured')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /remove key/i }));

    await waitFor(() => expect(invoke).toHaveBeenCalledWith('delete_api_key'));
    expect(toast.success).toHaveBeenCalledWith('API key removed');
    await waitFor(() => expect(screen.queryByText('Configured')).not.toBeInTheDocument());
  });
});
