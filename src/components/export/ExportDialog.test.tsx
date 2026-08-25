// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

import { toast } from 'sonner';

import { ExportDialog } from './ExportDialog';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ExportDialog', () => {
  it('opens with format selection dropdown and Export button visible', () => {
    render(<ExportDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Export Asset')).toBeInTheDocument();
    expect(screen.getByLabelText('Format')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('shows the current target format in the description text', () => {
    render(<ExportDialog isOpen={true} onClose={vi.fn()} />);

    // Default format is 'glb'
    expect(screen.getByText(/converted to GLB/i)).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<ExportDialog isOpen={true} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a success toast and closes the dialog on Export click', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<ExportDialog isOpen={true} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /export/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Exporting as GLB...');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('renders all six format options in the select content', async () => {
    const user = userEvent.setup();

    render(<ExportDialog isOpen={true} onClose={vi.fn()} />);

    // Open the select dropdown
    await user.click(screen.getByLabelText('Format'));

    expect(await screen.findByText('GLB')).toBeInTheDocument();
    expect(screen.getByText('FBX')).toBeInTheDocument();
    expect(screen.getByText('OBJ')).toBeInTheDocument();
    expect(screen.getByText('STL')).toBeInTheDocument();
    expect(screen.getByText('USDZ')).toBeInTheDocument();
    expect(screen.getByText('3MF')).toBeInTheDocument();
  });

  it('updates the description when a different format is selected', async () => {
    const user = userEvent.setup();

    render(<ExportDialog isOpen={true} onClose={vi.fn()} />);

    // Open the select dropdown and pick FBX
    await user.click(screen.getByLabelText('Format'));
    await user.click(await screen.findByText('FBX'));

    await waitFor(() => {
      expect(screen.getByText(/converted to FBX/i)).toBeInTheDocument();
    });
  });

  it('does not show an error toast when export succeeds', async () => {
    const user = userEvent.setup();

    render(<ExportDialog isOpen={true} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /export/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
    expect(toast.error).not.toHaveBeenCalled();
  });
});
