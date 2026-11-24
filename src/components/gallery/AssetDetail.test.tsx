// AssetDetail.test.tsx — ADR-0020 / OW-3: deletion now destroys files on disk,
// so the confirmation must enumerate exactly what it is about to remove, and the
// mutation must not fire from the first click.
import { renderWithProviders } from '@/test-utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AssetDetail } from '@components/gallery/AssetDetail';

const mocks = vi.hoisted(() => {
  const asset = {
    id: 'task-abc-123',
    // Inline rather than imported: this fixture lives in `vi.hoisted`, which
    // runs BEFORE module imports are initialised, so an imported value would be
    // a temporal-dead-zone ReferenceError.
    rights: {
      planTierAtGeneration: null,
      publishedToCommunity: null,
      thirdPartyMaterialAttested: null,
      disclosurePosture: null,
      recordedAt: null,
      identifier: 'IDENTIFIER-FROM-RUST',
      reason: 'tier-unrecorded',
    },
    taskType: 'text-to-3d',
    status: 'SUCCEEDED',
    progress: 100,
    consumedCredits: 25,
    prompt: 'a dragon',
    thumbnailPath: null,
    filePaths: {
      glb: '/data/assets/dragon.glb',
      fbx: '/data/assets/dragon.fbx',
    },
    texturePaths: [],
    notes: '',
    tags: [],
    createdAt: 1000,
    startedAt: 1010,
    finishedAt: 1100,
    downloadedAt: 1100,
    hasTextures: false,
    hasRig: false,
    hasAnimation: false,
    favorite: false,
    lastViewedAt: 0,
  };
  return { asset, mutate: vi.fn(), onBack: vi.fn(), noop: vi.fn() };
});

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: (path: string) => path,
}));

// The 3D preview is lazy-loaded and needs WebGL; the export dialog is unrelated
// to this behaviour. Both are stubbed so the test is about the confirmation only.
vi.mock('@components/gallery/AssetPreview3D', () => ({ AssetPreview3D: () => null }));
vi.mock('@components/export/ExportDialog', () => ({ ExportDialog: () => null }));

vi.mock('@hooks/useAssets', () => ({ useAssets: () => ({ data: [mocks.asset] }) }));
vi.mock('@hooks/useDeleteAsset', () => ({
  useDeleteAsset: () => ({ mutate: mocks.mutate, isPending: false }),
}));
vi.mock('@hooks/useUpdateTags', () => ({ useUpdateTags: () => ({ mutate: mocks.noop }) }));
vi.mock('@hooks/useUpdateNotes', () => ({ useUpdateNotes: () => ({ mutate: mocks.noop }) }));
vi.mock('@hooks/useToggleFavorite', () => ({
  useToggleFavorite: () => ({ mutate: mocks.noop }),
}));

describe('AssetDetail delete confirmation (ADR-0020 / OW-3)', () => {
  beforeEach(() => {
    mocks.mutate.mockClear();
    mocks.onBack.mockClear();
  });

  it('enumerates the managed files and does not delete on the first click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AssetDetail assetId="task-abc-123" onBack={mocks.onBack} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Delete this asset?')).toBeInTheDocument();
    expect(screen.getByText('dragon.glb')).toBeInTheDocument();
    expect(screen.getByText('dragon.fbx')).toBeInTheDocument();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('deletes only after the destructive confirmation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AssetDetail assetId="task-abc-123" onBack={mocks.onBack} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: 'Delete permanently' }));

    expect(mocks.mutate).toHaveBeenCalledWith('task-abc-123', expect.anything());
  });
});
