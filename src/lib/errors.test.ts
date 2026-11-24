// src/lib/errors.test.ts
// CSD §10.2/§10.3: the error-code → user-action mapping.
//
// These assertions are what make the codes load-bearing. Without them the
// guardrail in ipc-contract.guardrail.test.ts would only prove that the
// vocabulary is stable, not that any code reaches a user action.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastError = vi.hoisted(() => vi.fn());
const toastWarning = vi.hoisted(() => vi.fn());
const openExternalUrl = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: { error: toastError, warning: toastWarning } }));
vi.mock('@lib/tauri', () => ({ openExternalUrl }));

import { useAppStore } from '@stores/appStore';
import { handleMutationError, toFrontendError } from './errors';

interface ToastOptions {
  description?: string;
  action?: { onClick: () => void };
}

function firstToastCall(): [string, ToastOptions] {
  const call = toastError.mock.calls[0];
  expect(call, 'expected an error toast').toBeDefined();
  return call as unknown as [string, ToastOptions];
}

describe('toFrontendError', () => {
  it('passes a typed envelope through unchanged', () => {
    expect(toFrontendError({ code: 'MISSING_API_KEY', message: 'No key' })).toEqual({
      code: 'MISSING_API_KEY',
      message: 'No key',
    });
  });

  it('falls back to UNKNOWN for a bare string rejection', () => {
    expect(toFrontendError('boom')).toEqual({ code: 'UNKNOWN', message: 'boom' });
  });

  it('keeps an Error message but has no code for it', () => {
    expect(toFrontendError(new Error('kaboom'))).toEqual({
      code: 'UNKNOWN',
      message: 'kaboom',
    });
  });

  it('never throws on null or undefined', () => {
    expect(toFrontendError(null).code).toBe('UNKNOWN');
    expect(toFrontendError(undefined).message.length).toBeGreaterThan(0);
  });
});

describe('handleMutationError (CSD §10.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().setActiveView('generate');
  });

  it('sends MISSING_API_KEY to the Open Settings action', () => {
    handleMutationError({ code: 'MISSING_API_KEY', message: 'no key' });

    expect(toastError).toHaveBeenCalledTimes(1);
    const [title, options] = firstToastCall();
    expect(title).toBe('No API Key');
    options.action?.onClick();
    expect(useAppStore.getState().activeView).toBe('settings');
  });

  it('sends API_ERROR_401 to Update Key', () => {
    handleMutationError({ code: 'API_ERROR_401', message: 'expired' });

    const [title, options] = firstToastCall();
    expect(title).toBe('Invalid API Key');
    options.action?.onClick();
    expect(useAppStore.getState().activeView).toBe('settings');
  });

  it('opens the subscription page for API_ERROR_402', () => {
    handleMutationError({ code: 'API_ERROR_402', message: 'no credits' });

    const [title, options] = firstToastCall();
    expect(title).toBe('Insufficient Credits');
    options.action?.onClick();
    expect(openExternalUrl).toHaveBeenCalledWith('https://www.meshy.ai/settings/subscription');
  });

  it('uses a warning toast for API_ERROR_429 and does not promise an auto-retry', () => {
    handleMutationError({ code: 'API_ERROR_429', message: 'slow down' });

    expect(toastWarning).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
    const [title, options] = toastWarning.mock.calls[0] as unknown as [string, ToastOptions];
    expect(title).toBe('Rate Limited');
    expect(options.description).not.toMatch(/retr(y|ies) automatically/i);
  });

  it('shows the backend message for a code outside the catalog', () => {
    handleMutationError({ code: 'SNAPSHOT_ERROR', message: 'could not read the response' });

    const [title, options] = firstToastCall();
    expect(title).toBe('Error');
    expect(options.description).toBe('could not read the response');
  });

  it('logs the caller context without leaking it into the toast', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    handleMutationError({ code: 'INVALID_INPUT', message: 'prompt required' }, 'Text to 3D task');

    expect(consoleError).toHaveBeenCalledTimes(1);
    const [title, options] = firstToastCall();
    expect(title).toBe('Invalid Input');
    expect(options.description).toBe('prompt required');
    expect(JSON.stringify(options)).not.toContain('Text to 3D task');
    consoleError.mockRestore();
  });
});
