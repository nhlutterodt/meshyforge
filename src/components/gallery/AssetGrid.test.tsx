// AssetGrid.test.tsx — Covers TC-GAL-01-01 through TC-GAL-01-04, TC-GAL-06-01
import { renderWithProviders } from '@/test-utils';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AssetGrid } from '@components/gallery/AssetGrid';
import type { AssetRow } from '@lib/meshy-types';

// ── Module-level mocks ────────────────────────────────────────────
vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

vi.mock('@hooks/useAssets', () => ({
  useAssets: vi.fn(),
}));

vi.mock('@hooks/useToggleFavorite', () => ({
  useToggleFavorite: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    isIdle: true,
    isSuccess: false,
  }),
}));

import { useAssets } from '@hooks/useAssets';

// ── Fixtures ──────────────────────────────────────────────────────
function makeAsset(overrides: Partial<AssetRow> = {}): AssetRow {
  return {
    id: `task-${Math.random().toString(36).slice(2)}`,
    meshyType: 'text-to-3d-preview',
    status: 'SUCCEEDED',
    progress: 100,
    consumedCredits: 25,
    prompt: 'a dragon',
    thumbnailPath: `/assets/thumb-${Math.random()}.png`,
    filePaths: '{}',
    texturePaths: '[]',
    notes: '',
    tags: '["fantasy"]',
    createdAt: 1000,
    startedAt: 1100,
    finishedAt: 1200,
    downloadedAt: 1300,
    hasTextures: true,
    hasRig: false,
    hasAnimation: false,
    favorite: false,
    lastViewedAt: 0,
    ...overrides,
  };
}

function makeAssets(count: number): AssetRow[] {
  return Array.from({ length: count }, (_, i) =>
    makeAsset({
      id: `task-${i + 1}`,
      prompt: `model-${i + 1}`,
      createdAt: 1000 + i * 100,
      tags: i % 2 === 0 ? '["fantasy"]' : '["creature"]',
      favorite: i % 3 === 0,
    }),
  );
}

describe('AssetGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-GAL-01-01 — loads all downloaded assets as thumbnail cards in responsive grid
  it('renders all downloaded assets as thumbnail cards in a responsive grid', async () => {
    const assets = makeAssets(3);
    vi.mocked(useAssets).mockReturnValue({
      data: assets,
      isLoading: false,
      isError: false,
    } as never);

    renderWithProviders(
      <AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />,
    );

    // Each asset renders a card identified by its aria-label
    await waitFor(() => {
      expect(screen.getByLabelText('Asset: model-1')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Asset: model-2')).toBeInTheDocument();
    expect(screen.getByLabelText('Asset: model-3')).toBeInTheDocument();
  });

  // TC-GAL-01-02 — gallery card shows thumbnail, title, tags, credits, favorite, and status badge
  it('shows thumbnail, title, tags, favorite, and status badge on each card', async () => {
    const asset = makeAsset({
      prompt: 'a majestic castle',
      status: 'SUCCEEDED',
      tags: '["medieval","stone"]',
      favorite: true,
      thumbnailPath: '/assets/castle.png',
    });
    vi.mocked(useAssets).mockReturnValue({
      data: [asset],
      isLoading: false,
      isError: false,
    } as never);

    const { container } = renderWithProviders(
      <AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />,
    );

    // Thumbnail image
    const img = container.querySelector('img') as HTMLImageElement;
    await waitFor(() => {
      expect(img).toBeInTheDocument();
    });
    expect(img).toHaveAttribute('src', '/assets/castle.png');
    expect(img).toHaveAttribute('alt', 'a majestic castle');

    // Title (prompt)
    expect(screen.getByText('a majestic castle')).toBeInTheDocument();

    // Status badge
    expect(screen.getByText('SUCCEEDED')).toBeInTheDocument();

    // Tags rendered
    expect(screen.getByText('medieval')).toBeInTheDocument();
    expect(screen.getByText('stone')).toBeInTheDocument();

    // Favorite star button present with aria-label reflecting favorite state
    expect(
      screen.getByLabelText('Remove from favorites'),
    ).toBeInTheDocument();
  });

  // TC-GAL-01-04 — assets ordered newest first by created_at
  it('renders assets in the order provided (newest first by created_at)', async () => {
    const newest = makeAsset({ id: 'newest', prompt: 'newest model', createdAt: 5000 });
    const middle = makeAsset({ id: 'middle', prompt: 'middle model', createdAt: 3000 });
    const oldest = makeAsset({ id: 'oldest', prompt: 'oldest model', createdAt: 1000 });

    // useAssets returns them sorted newest-first (as the hook/data layer would)
    vi.mocked(useAssets).mockReturnValue({
      data: [newest, middle, oldest],
      isLoading: false,
      isError: false,
    } as never);

    const { container } = renderWithProviders(
      <AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />,
    );

    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards).toHaveLength(3);

    // The first card should correspond to the newest asset
    expect(cards[0]).toHaveTextContent('newest model');
    expect(cards[1]).toHaveTextContent('middle model');
    expect(cards[2]).toHaveTextContent('oldest model');
  });

  // TC-GAL-06-01 — 50 assets render without virtualization
  it('renders all 50 assets without virtualization (no windowing)', async () => {
    const assets = makeAssets(50);
    vi.mocked(useAssets).mockReturnValue({
      data: assets,
      isLoading: false,
      isError: false,
    } as never);

    const { container } = renderWithProviders(
      <AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />,
    );

    await waitFor(() => {
      expect(
        container.querySelectorAll('[data-slot="card"]'),
      ).toHaveLength(50);
    });

    // No virtualization sentinel / wrapper should be present
    expect(container.querySelector('[data-virtual]')).toBeNull();
  });

  // TC-GAL-01-03 — loading state shows skeleton placeholders
  it('shows skeleton placeholders while loading', () => {
    vi.mocked(useAssets).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never);

    const { container } = renderWithProviders(
      <AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />,
    );

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(8);
  });

  // TC-GAL-07 — error state renders failure message
  it('shows failure message when assets fail to load', () => {
    vi.mocked(useAssets).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);

    renderWithProviders(
      <AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />,
    );

    expect(screen.getByText('Failed to load assets')).toBeInTheDocument();
  });

  // TC-GAL-07 — empty state with no assets
  it('shows empty-state message when there are no assets', () => {
    vi.mocked(useAssets).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    renderWithProviders(
      <AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />,
    );

    expect(
      screen.getByText('No assets yet. Generate a model to get started.'),
    ).toBeInTheDocument();
  });

  // TC-GAL-07 — empty state when filters are active
  it('shows filter-specific message when search/tag filters match nothing', () => {
    vi.mocked(useAssets).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    renderWithProviders(
      <AssetGrid searchQuery="dragon" activeTag="fantasy" onSelectAsset={vi.fn()} />,
    );

    expect(screen.getByText('No assets match your filters')).toBeInTheDocument();
  });
});