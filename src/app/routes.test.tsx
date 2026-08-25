// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock the store so we can drive activeView / activeGenerateTab ──
const mocks = vi.hoisted(() => ({
  useAppStore: vi.fn(),
  useAllTags: vi.fn(),
}));

vi.mock('@stores/appStore', () => ({
  useAppStore: mocks.useAppStore,
}));

// ── Mock hooks that fire on mount so they are no-ops ──
vi.mock('@hooks/useActiveTaskPolling', () => ({
  useActiveTaskPolling: vi.fn(),
}));
vi.mock('@hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
}));
vi.mock('@hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));
vi.mock('@hooks/useAllTags', () => ({
  useAllTags: mocks.useAllTags,
}));

// ── Mock every leaf component so we test routing wiring, not internals ──
vi.mock('@components/generate/TextTo3DPanel', () => ({
  TextTo3DPanel: () => <div data-testid="text-to-3d">TextTo3DPanel</div>,
}));
vi.mock('@components/generate/ImageTo3DPanel', () => ({
  ImageTo3DPanel: () => <div data-testid="image-to-3d">ImageTo3DPanel</div>,
}));
vi.mock('@components/generate/MultiImagePanel', () => ({
  MultiImagePanel: () => <div data-testid="multi-image">MultiImagePanel</div>,
}));
vi.mock('@components/generate/PostProcessPanel', () => ({
  PostProcessPanel: () => <div data-testid="post-process">PostProcessPanel</div>,
}));
vi.mock('@components/generate/RiggingPanel', () => ({
  RiggingPanel: () => <div data-testid="rigging">RiggingPanel</div>,
}));
vi.mock('@components/generate/AnimationPanel', () => ({
  AnimationPanel: () => <div data-testid="animation">AnimationPanel</div>,
}));
vi.mock('@components/generate/ImageGenPanel', () => ({
  ImageGenPanel: () => <div data-testid="image-gen">ImageGenPanel</div>,
}));
vi.mock('@components/generate/PrintPanel', () => ({
  PrintPanel: () => <div data-testid="print">PrintPanel</div>,
}));
vi.mock('@components/generate/CreativeLabPanel', () => ({
  CreativeLabPanel: () => <div data-testid="creative-lab">CreativeLabPanel</div>,
}));
vi.mock('@components/gallery/AssetGrid', () => ({
  AssetGrid: (props: {
    searchQuery: string;
    activeTag: string | null;
    onSelectAsset: (id: string) => void;
  }) => (
    <div data-testid="asset-grid">
      <span data-testid="grid-search">{props.searchQuery}</span>
      <span data-testid="grid-tag">{props.activeTag ?? 'null'}</span>
    </div>
  ),
}));
vi.mock('@components/gallery/AssetDetail', () => ({
  AssetDetail: (props: { assetId: string; onBack: () => void }) => (
    <div data-testid="asset-detail">
      <span data-testid="detail-id">{props.assetId}</span>
      <button type="button" onClick={props.onBack}>
        back
      </button>
    </div>
  ),
}));
vi.mock('@components/gallery/SearchBar', () => ({
  SearchBar: (props: { onSearch: (q: string) => void }) => (
    <input
      data-testid="search-bar"
      onChange={(e) => props.onSearch(e.target.value)}
      placeholder="Search"
    />
  ),
}));
vi.mock('@components/gallery/TagFilter', () => ({
  TagFilter: (props: {
    tags: string[];
    selectedTag: string | null;
    onTagChange: (t: string | null) => void;
  }) => (
    <div data-testid="tag-filter">
      <span data-testid="tf-selected">{props.selectedTag ?? 'null'}</span>
      {props.tags.map((t) => (
        <button type="button" key={t} onClick={() => props.onTagChange(t)}>
          {t}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('@components/tasks/TaskMonitor', () => ({
  TaskMonitor: () => <div data-testid="task-monitor">TaskMonitor</div>,
}));
vi.mock('@components/settings/ApiKeyManager', () => ({
  ApiKeyManager: () => <div data-testid="api-key-manager">ApiKeyManager</div>,
}));
vi.mock('@components/settings/PreferencesPanel', () => ({
  PreferencesPanel: () => <div data-testid="preferences-panel">PreferencesPanel</div>,
}));
vi.mock('@components/settings/AboutPanel', () => ({
  AboutPanel: () => <div data-testid="about-panel">AboutPanel</div>,
}));

import { Routes } from '@app/routes';

interface StoreState {
  activeView: 'generate' | 'gallery' | 'tasks' | 'settings';
  activeGenerateTab: string;
  selectedAssetId: string | null;
  setActiveGenerateTab: ReturnType<typeof vi.fn>;
  setSelectedAsset: ReturnType<typeof vi.fn>;
}

function mockStore(overrides: Partial<StoreState> = {}): StoreState {
  const state: StoreState = {
    activeView: 'generate',
    activeGenerateTab: 'text-to-3d',
    selectedAssetId: null,
    setActiveGenerateTab: vi.fn(),
    setSelectedAsset: vi.fn(),
    ...overrides,
  };
  mocks.useAppStore.mockImplementation((selector: (s: StoreState) => unknown) => selector(state));
  return state;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useAllTags.mockReturnValue({ data: ['fantasy', 'creature'] });
  mockStore();
});

describe('Routes', () => {
  describe('generate view', () => {
    it('renders the 9-tab list and the active panel', () => {
      mockStore({ activeView: 'generate', activeGenerateTab: 'text-to-3d' });

      render(<Routes />);

      expect(screen.getByText('Text→3D')).toBeInTheDocument();
      expect(screen.getByTestId('text-to-3d')).toBeInTheDocument();
    });

    it('renders the creative-lab panel when that tab is active', () => {
      mockStore({ activeView: 'generate', activeGenerateTab: 'creative-lab' });

      render(<Routes />);

      expect(screen.getByTestId('creative-lab')).toBeInTheDocument();
      expect(screen.queryByTestId('text-to-3d')).not.toBeInTheDocument();
    });

    it('calls setActiveGenerateTab when a tab is clicked', async () => {
      const user = userEvent.setup();
      const state = mockStore({ activeView: 'generate', activeGenerateTab: 'text-to-3d' });

      render(<Routes />);

      await user.click(screen.getByText('Rig'));

      expect(state.setActiveGenerateTab).toHaveBeenCalledWith('rigging');
    });
  });

  describe('gallery view', () => {
    it('renders search bar, tag filter, and grid when no asset is selected', () => {
      mockStore({ activeView: 'gallery', selectedAssetId: null });

      render(<Routes />);

      expect(screen.getByText('Gallery')).toBeInTheDocument();
      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
      expect(screen.getByTestId('tag-filter')).toBeInTheDocument();
      expect(screen.getByTestId('asset-grid')).toBeInTheDocument();
    });

    it('renders AssetDetail when an asset is selected', () => {
      mockStore({ activeView: 'gallery', selectedAssetId: 'task-42' });

      render(<Routes />);

      expect(screen.getByTestId('asset-detail')).toBeInTheDocument();
      expect(screen.getByTestId('detail-id')).toHaveTextContent('task-42');
    });

    it('calls setSelectedAsset(null) when AssetDetail back is clicked', async () => {
      const user = userEvent.setup();
      const state = mockStore({ activeView: 'gallery', selectedAssetId: 'task-42' });

      render(<Routes />);

      await user.click(screen.getByText('back'));

      expect(state.setSelectedAsset).toHaveBeenCalledWith(null);
    });

    it('updates search query and passes it to the grid', async () => {
      const user = userEvent.setup();
      mockStore({ activeView: 'gallery', selectedAssetId: null });

      render(<Routes />);

      await user.type(screen.getByTestId('search-bar'), 'dragon');

      expect(screen.getByTestId('grid-search')).toHaveTextContent('dragon');
    });

    it('passes selected tag to the grid when a tag is chosen', async () => {
      const user = userEvent.setup();
      mockStore({ activeView: 'gallery', selectedAssetId: null });

      render(<Routes />);

      await user.click(screen.getByText('fantasy'));

      expect(screen.getByTestId('grid-tag')).toHaveTextContent('fantasy');
    });
  });

  describe('tasks view', () => {
    it('renders the TaskMonitor', () => {
      mockStore({ activeView: 'tasks' });

      render(<Routes />);

      expect(screen.getByTestId('task-monitor')).toBeInTheDocument();
    });
  });

  describe('settings view', () => {
    it('renders ApiKeyManager, PreferencesPanel, and AboutPanel', () => {
      mockStore({ activeView: 'settings' });

      render(<Routes />);

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByTestId('api-key-manager')).toBeInTheDocument();
      expect(screen.getByTestId('preferences-panel')).toBeInTheDocument();
      expect(screen.getByTestId('about-panel')).toBeInTheDocument();
    });
  });

  describe('default', () => {
    it('renders nothing for an unknown view', () => {
      mockStore({ activeView: 'settings' });
      // Force an unknown view by overriding the selector result
      mocks.useAppStore.mockImplementation((selector: (s: { activeView: string }) => unknown) =>
        selector({ activeView: 'unknown' } as { activeView: string }),
      );

      const { container } = render(<Routes />);

      expect(container).toBeEmptyDOMElement();
    });
  });
});
