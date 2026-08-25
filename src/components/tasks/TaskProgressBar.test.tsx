// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

import { TaskProgressBar } from '@components/tasks/TaskProgressBar';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TaskProgressBar', () => {
  it('renders the numeric progress percentage for a given value', () => {
    render(<TaskProgressBar progress={42} status="IN_PROGRESS" />);

    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('shows 0% width when progress is 0', () => {
    render(<TaskProgressBar progress={0} status="PENDING" />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows 100% when progress is 100', () => {
    render(<TaskProgressBar progress={100} status="SUCCEEDED" />);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps display to 100% for terminal statuses regardless of stored progress', () => {
    // A FAILED task may have progress 50 mid-flight, but terminal shows 100%.
    render(<TaskProgressBar progress={50} status="FAILED" />);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps display to 100% for CANCELED terminal status', () => {
    render(<TaskProgressBar progress={30} status="CANCELED" />);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows the raw progress for non-terminal IN_PROGRESS status', () => {
    render(<TaskProgressBar progress={75} status="IN_PROGRESS" />);

    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});