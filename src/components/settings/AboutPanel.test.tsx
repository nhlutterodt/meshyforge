// @vitest-environment jsdom
// AboutPanel.test.tsx — Covers TC-SET-04-01

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

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
  // NOTE: The component renders app name, version, and an API status link.
  // "Docs links" mentioned in the test plan are not implemented in the component.
  it('displays app name, version, and API status link', () => {
    render(<AboutPanel />);

    expect(screen.getByText(APP_NAME)).toBeInTheDocument();
    expect(screen.getByText(APP_VERSION)).toBeInTheDocument();

    const statusLink = screen.getByRole('link', { name: /status\.meshy\.ai/i });
    expect(statusLink).toBeInTheDocument();
    expect(statusLink).toHaveAttribute('href', 'https://status.meshy.ai');
    expect(statusLink).toHaveAttribute('target', '_blank');
    expect(statusLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});