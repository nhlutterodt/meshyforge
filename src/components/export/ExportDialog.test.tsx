// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AssetRow } from '@lib/meshy-types';

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

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  useCreateConvert: vi.fn(),
  convertMutate: vi.fn(),
  useExportAsset: vi.fn(),
  exportMutateAsync: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: mocks.save,
}));

vi.mock('@hooks/useMeshyApi', () => ({
  useCreateConvert: mocks.useCreateConvert,
}));

vi.mock('@hooks/useExportAsset', () => ({
  useExportAsset: mocks.useExportAsset,
}));

import { toast } from 'sonner';
import { ExportDialog } from './ExportDialog';

function makeAsset(overrides: Partial<AssetRow> = {}): AssetRow {
  return {
    id: 'task-abc',
    taskType: 'text-to-3d',
    status: 'SUCCEEDED',
    progress: 100,
    consumedCredits: 5,
    filePaths: JSON.stringify({ glb: '/data/assets/task-abc/model.glb' }),
    texturePaths: '[]',
    notes: '',
    tags: '[]',
    createdAt: 1000,
    startedAt: 1000,
    finishedAt: 1000,
    downloadedAt: 1000,
    hasTextures: false,
    hasRig: false,
    hasAnimation: false,
    favorite: false,
    lastViewedAt: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useCreateConvert.mockReturnValue({ mutate: mocks.convertMutate, isPending: false });
  mocks.useExportAsset.mockReturnValue({
    mutateAsync: mocks.exportMutateAsync,
    isPending: false,
  });
});

afterEach(() => {
  cleanup();
});

describe('ExportDialog', () => {
  it('opens with format selection dropdown and Export button visible', () => {
    render(<ExportDialog isOpen={true} onClose={vi.fn()} asset={makeAsset()} />);

    expect(screen.getByText('Export Asset')).toBeInTheDocument();
    expect(screen.getByLabelText('Format')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^export$/i })).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<ExportDialog isOpen={true} onClose={onClose} asset={makeAsset()} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables a format not present in the asset file_paths and shows the tooltip', async () => {
    const user = userEvent.setup();
    render(<ExportDialog isOpen={true} onClose={vi.fn()} asset={makeAsset()} />);

    await user.click(screen.getByLabelText('Format'));

    const fbxOption = await screen.findByRole('option', { name: 'FBX' });
    expect(fbxOption).toHaveAttribute('aria-disabled', 'true');
    expect(fbxOption).toHaveAttribute('title', 'Not generated for this asset');
  });

  it('does not disable a format present in the asset file_paths', async () => {
    const user = userEvent.setup();
    render(<ExportDialog isOpen={true} onClose={vi.fn()} asset={makeAsset()} />);

    await user.click(screen.getByLabelText('Format'));

    const glbOption = await screen.findByRole('option', { name: 'GLB' });
    expect(glbOption).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('shows the "Generate & Export" affordance instead of Export when the selected format is missing', () => {
    render(
      <ExportDialog
        isOpen={true}
        onClose={vi.fn()}
        asset={makeAsset({ filePaths: JSON.stringify({}) })}
      />,
    );

    expect(screen.queryByRole('button', { name: /^export$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate & export/i })).toBeInTheDocument();
  });

  it('exports the already-downloaded format directly: picks a destination and calls export_asset', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mocks.save.mockResolvedValue('/home/user/model.glb');
    mocks.exportMutateAsync.mockResolvedValue(undefined);

    render(<ExportDialog isOpen={true} onClose={onClose} asset={makeAsset()} />);

    await user.click(screen.getByRole('button', { name: /^export$/i }));

    await waitFor(() => {
      expect(mocks.exportMutateAsync).toHaveBeenCalledWith({
        path: '/data/assets/task-abc/model.glb',
        destinationPath: '/home/user/model.glb',
      });
    });
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Exported GLB to /home/user/model.glb');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows an error toast when export_asset fails', async () => {
    const user = userEvent.setup();
    mocks.save.mockResolvedValue('/home/user/model.glb');
    mocks.exportMutateAsync.mockRejectedValue(new Error('copy failed'));

    render(<ExportDialog isOpen={true} onClose={vi.fn()} asset={makeAsset()} />);

    await user.click(screen.getByRole('button', { name: /^export$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Export failed');
    });
  });

  it('does not call export_asset when the user cancels the save dialog', async () => {
    const user = userEvent.setup();
    mocks.save.mockResolvedValue(null);

    render(<ExportDialog isOpen={true} onClose={vi.fn()} asset={makeAsset()} />);

    await user.click(screen.getByRole('button', { name: /^export$/i }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.exportMutateAsync).not.toHaveBeenCalled();
  });

  it('fires useCreateConvert with the input task id and target format on "Generate & Export"', async () => {
    const user = userEvent.setup();
    mocks.save.mockResolvedValue('/home/user/model.fbx');

    render(
      <ExportDialog
        isOpen={true}
        onClose={vi.fn()}
        asset={makeAsset({ filePaths: JSON.stringify({}) })}
      />,
    );

    await user.click(screen.getByRole('button', { name: /generate & export/i }));

    await waitFor(() => {
      expect(mocks.convertMutate).toHaveBeenCalledWith(
        { inputTaskId: 'task-abc', targetFormats: ['glb'] },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
      );
    });
  });

  it('automatically exports once the generated format appears as a local path in file_paths', async () => {
    mocks.save.mockResolvedValue('/home/user/model.glb');
    mocks.exportMutateAsync.mockResolvedValue(undefined);
    mocks.convertMutate.mockImplementation((_body, { onSuccess }) => onSuccess());

    const onClose = vi.fn();
    const { rerender } = render(
      <ExportDialog
        isOpen={true}
        onClose={onClose}
        asset={makeAsset({ filePaths: JSON.stringify({}) })}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /generate & export/i }));

    // Simulate useActiveTaskPolling downloading the new format and the
    // parent's useAssets() query handing ExportDialog a fresh asset prop.
    rerender(
      <ExportDialog
        isOpen={true}
        onClose={onClose}
        asset={makeAsset({
          filePaths: JSON.stringify({ glb: '/data/assets/task-abc/model.glb' }),
        })}
      />,
    );

    await waitFor(() => {
      expect(mocks.exportMutateAsync).toHaveBeenCalledWith({
        path: '/data/assets/task-abc/model.glb',
        destinationPath: '/home/user/model.glb',
      });
    });
  });
});
