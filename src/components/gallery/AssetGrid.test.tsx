// AssetGrid.test.tsx — Covers TC-GAL-01-01 through TC-GAL-01-04, TC-GAL-06-01
import { renderWithProviders } from '@/test-utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  useInfiniteAssets: vi.fn(),
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

import { useInfiniteAssets } from '@hooks/useAssets';

// The grid reads `data.pages[].assets`; this builds that shape from a flat
// list so each test can state its assets directly.
function infiniteReturn(
  assets: AssetRow[],
  overrides: Partial<{
    total: number;
    isLoading: boolean;
    isError: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
  }> = {},
) {
  return {
    data: { pages: [{ assets, total: overrides.total ?? assets.length, limit: 50, offset: 0 }] },
    isLoading: overrides.isLoading ?? false,
    isError: overrides.isError ?? false,
    hasNextPage: overrides.hasNextPage ?? false,
    isFetchingNextPage: overrides.isFetchingNextPage ?? false,
    fetchNextPage: vi.fn(),
  };
}

// ── Fixtures ──────────────────────────────────────────────────────
function makeAsset(overrides: Partial<AssetRow> = {}): AssetRow {
  return {
    id: `task-${Math.random().toString(36).slice(2)}`,
    taskType: 'text-to-3d-preview',
    status: 'SUCCEEDED',
    progress: 100,
    consumedCredits: 25,
    prompt: 'a dragon',
    thumbnailPath: `/assets/thumb-${Math.random()}.png`,
    filePaths: {},
    texturePaths: [],
    notes: '',
    tags: ['fantasy'],
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
      tags: i % 2 === 0 ? ['fantasy'] : ['creature'],
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
    vi.mocked(useInfiniteAssets).mockReturnValue(infiniteReturn(assets) as never);

    renderWithProviders(<AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />);

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
      tags: ['medieval', 'stone'],
      favorite: true,
      thumbnailPath: '/assets/castle.png',
    });
    vi.mocked(useInfiniteAssets).mockReturnValue(infiniteReturn([asset]) as never);

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
    expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument();
  });

  // TC-GAL-01-04 — assets ordered newest first by created_at
  it('renders assets in the order provided (newest first by created_at)', async () => {
    const newest = makeAsset({ id: 'newest', prompt: 'newest model', createdAt: 5000 });
    const middle = makeAsset({ id: 'middle', prompt: 'middle model', createdAt: 3000 });
    const oldest = makeAsset({ id: 'oldest', prompt: 'oldest model', createdAt: 1000 });

    // The page arrives newest-first (as the backend orders it)
    vi.mocked(useInfiniteAssets).mockReturnValue(infiniteReturn([newest, middle, oldest]) as never);

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
    vi.mocked(useInfiniteAssets).mockReturnValue(infiniteReturn(assets) as never);

    const { container } = renderWithProviders(
      <AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(50);
    });

    // No virtualization sentinel / wrapper should be present
    expect(container.querySelector('[data-virtual]')).toBeNull();
  });

  // TC-GAL-01-03 — loading state shows skeleton placeholders
  it('shows skeleton placeholders while loading', () => {
    vi.mocked(useInfiniteAssets).mockReturnValue(infiniteReturn([], { isLoading: true }) as never);

    const { container } = renderWithProviders(
      <AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />,
    );

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(8);
  });

  // TC-GAL-07 — error state renders failure message
  it('shows failure message when assets fail to load', () => {
    vi.mocked(useInfiniteAssets).mockReturnValue(infiniteReturn([], { isError: true }) as never);

    renderWithProviders(<AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />);

    expect(screen.getByText('Failed to load assets')).toBeInTheDocument();
  });

  // TC-GAL-07 — empty state with no assets
  it('shows empty-state message when there are no assets', () => {
    vi.mocked(useInfiniteAssets).mockReturnValue(infiniteReturn([]) as never);

    renderWithProviders(<AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />);

    expect(screen.getByText('No assets yet. Generate a model to get started.')).toBeInTheDocument();
  });

  // TC-GAL-07 — empty state when filters are active
  it('shows filter-specific message when search/tag filters match nothing', () => {
    vi.mocked(useInfiniteAssets).mockReturnValue(infiniteReturn([]) as never);

    renderWithProviders(
      <AssetGrid searchQuery="dragon" activeTag="fantasy" onSelectAsset={vi.fn()} />,
    );

    expect(screen.getByText('No assets match your filters')).toBeInTheDocument();
  });

  // ── DAT-01 pagination ─────────────────────────────────────────
  it('offers Load More only when the backend reports more matches', () => {
    const assets = makeAssets(50);
    vi.mocked(useInfiniteAssets).mockReturnValue(
      infiniteReturn(assets, { total: 120, hasNextPage: true }) as never,
    );

    renderWithProviders(<AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Load More' })).toBeInTheDocument();
  });

  it('hides Load More once every match has been loaded', () => {
    vi.mocked(useInfiniteAssets).mockReturnValue(
      infiniteReturn(makeAssets(3), { total: 3, hasNextPage: false }) as never,
    );

    renderWithProviders(<AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Load More' })).not.toBeInTheDocument();
  });

  it('requests the next page when Load More is clicked', async () => {
    const fetchNextPage = vi.fn();
    vi.mocked(useInfiniteAssets).mockReturnValue({
      ...infiniteReturn(makeAssets(50), { total: 120, hasNextPage: true }),
      fetchNextPage,
    } as never);

    renderWithProviders(<AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Load More' }));

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('disables Load More while the next page is in flight', () => {
    vi.mocked(useInfiniteAssets).mockReturnValue(
      infiniteReturn(makeAssets(50), {
        total: 120,
        hasNextPage: true,
        isFetchingNextPage: true,
      }) as never,
    );

    renderWithProviders(<AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Loading…' })).toBeDisabled();
  });

  it('flattens assets across multiple loaded pages', () => {
    // The grid must render every page it has accumulated, not just the last.
    vi.mocked(useInfiniteAssets).mockReturnValue({
      data: {
        pages: [
          { assets: makeAssets(2), total: 3, limit: 2, offset: 0 },
          {
            assets: [makeAsset({ id: 'page-2', prompt: 'second page model' })],
            total: 3,
            limit: 2,
            offset: 2,
          },
        ],
      },
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    } as never);

    const { container } = renderWithProviders(
      <AssetGrid searchQuery="" activeTag={null} onSelectAsset={vi.fn()} />,
    );

    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(3);
    expect(screen.getByLabelText('Asset: second page model')).toBeInTheDocument();
  });
});
