// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

import { ExportProgress } from './ExportProgress';

afterEach(() => {
  cleanup();
});

describe('ExportProgress', () => {
  it('shows the file name and current/total count while exporting', () => {
    render(<ExportProgress current={2} total={5} fileName="model.glb" />);

    expect(screen.getByText('Exporting model.glb...')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('renders the percentage derived from current/total', () => {
    render(<ExportProgress current={3} total={4} fileName="asset.fbx" />);

    // 3/4 = 75%
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows 0% when total is zero', () => {
    render(<ExportProgress current={0} total={0} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows the completion state when current reaches total', () => {
    render(<ExportProgress current={5} total={5} fileName="model.glb" />);

    expect(screen.getByText('Export complete')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('uses the generic "assets" label when no file name is provided', () => {
    render(<ExportProgress current={1} total={3} />);

    expect(screen.getByText('Exporting assets...')).toBeInTheDocument();
  });

  it('renders the progress bar element', () => {
    render(<ExportProgress current={1} total={4} fileName="model.obj" />);

    expect(screen.getByText('25%')).toBeInTheDocument();
  });
});