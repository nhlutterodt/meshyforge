// @vitest-environment jsdom
// AboutPanel.test.tsx — Covers TC-SET-04-01

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const openExternalUrl = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const toastError = vi.hoisted(() => vi.fn());

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
  openExternalUrl,
}));
vi.mock('sonner', () => ({ toast: { error: toastError } }));

import { APP_NAME, APP_VERSION } from '@lib/constants';

import { AboutPanel } from './AboutPanel';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('AboutPanel', () => {
  // TC-SET-04-01 — about_panel__displays_app_name_version_and_status_and_docs_links
  // NOTE: The component renders app name, version, and an API status control.
  // "Docs links" mentioned in the test plan are not implemented in the component.
  // TASK-0053: the status control opens via the shell-plugin helper, not an
  // anchor — wry swallows NewWindowRequested with no handler registered, so a
  // target=_blank anchor was a silent no-op in WebView2.
  it('displays app name, version, and opens the API status page via the shell helper', async () => {
    const user = userEvent.setup();
    render(<AboutPanel />);

    expect(screen.getByText(APP_NAME)).toBeInTheDocument();
    expect(screen.getByText(APP_VERSION)).toBeInTheDocument();

    const statusLink = screen.getByRole('button', { name: /status\.meshy\.ai/i });
    await user.click(statusLink);
    expect(openExternalUrl).toHaveBeenCalledWith('https://status.meshy.ai');
  });

  // TASK-0053: a failed shell open must surface, not recreate the silent
  // no-op the anchor had.
  it('shows a toast when the status page cannot be opened', async () => {
    openExternalUrl.mockRejectedValueOnce(new Error('shell open failed'));
    const user = userEvent.setup();
    render(<AboutPanel />);

    await user.click(screen.getByRole('button', { name: /status\.meshy\.ai/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Could not open the status page in your browser.');
    });
  });

  // TC-SET-04-02 — the notice bundle must be lazy. Loading ~280 KB of licence
  // text at startup would be a real regression, and TASK-0041's evidence gate
  // requires the panel to load it on open only.
  it('loads the third-party notice bundle on demand, never at startup', async () => {
    const user = userEvent.setup();
    render(<AboutPanel />);

    expect(document.querySelector('pre')).toBeNull();
    expect(screen.getByText('Third-party licences')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show licence notices/i }));

    const pre = await waitFor(() => {
      const element = document.querySelector('pre');
      expect(element).not.toBeNull();
      return element;
    });

    expect(pre?.textContent).toContain('# Third-Party Notices');
    // The Geist font's OFL notice is the O-3 obligation; assert it is genuinely
    // present in the bundle the user is shown.
    expect(pre?.textContent).toContain('SIL OPEN FONT LICENSE');
    expect(screen.queryByRole('button', { name: /show licence notices/i })).toBeNull();
  });
});
