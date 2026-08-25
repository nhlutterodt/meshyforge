// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

// Mock CreditBalance so TopBar can render in isolation without a QueryClient.
vi.mock('@components/settings/CreditBalance', () => ({
  CreditBalance: () => <div data-testid="credit-balance">Credits</div>,
}));

import { TopBar } from '@components/common/TopBar';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TopBar', () => {
  it('renders a header element with the app name MeshyForge', () => {
    render(<TopBar />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('MeshyForge')).toBeInTheDocument();
  });

  it('applies the h-14 height class to the header', () => {
    render(<TopBar />);

    expect(screen.getByRole('banner')).toHaveClass('h-14');
  });

  it('renders the CreditBalance slot', () => {
    render(<TopBar />);

    expect(screen.getByTestId('credit-balance')).toBeInTheDocument();
  });
});