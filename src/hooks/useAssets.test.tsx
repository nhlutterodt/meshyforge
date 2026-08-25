import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAssets } from './useAssets';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@lib/tauri';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return { Wrapper, qc };
}

const mockAssets = [
  {
    id: 'task-1',
    meshyType: 'text-to-3d-preview',
    status: 'SUCCEEDED',
    progress: 100,
    consumedCredits: 25,
    prompt: 'a dragon',
    thumbnailPath: '/assets/thumb.png',
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
  },
];

describe('useAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all assets via get_all_assets when no search or tag', async () => {
    vi.mocked(invoke).mockResolvedValue(mockAssets);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAssets(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAssets);
    expect(invoke).toHaveBeenCalledWith('get_all_assets');
  });

  it('calls search_assets when a search query is provided', async () => {
    vi.mocked(invoke).mockResolvedValue(mockAssets);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAssets('dragon'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('search_assets', {
      query: 'dragon',
      tag: undefined,
    });
  });

  it('calls search_assets when a tag filter is provided', async () => {
    vi.mocked(invoke).mockResolvedValue(mockAssets);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAssets('', 'fantasy'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('search_assets', {
      query: '',
      tag: 'fantasy',
    });
  });

  it('calls search_assets when both search and tag are provided', async () => {
    vi.mocked(invoke).mockResolvedValue(mockAssets);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAssets('dragon', 'fantasy'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('search_assets', {
      query: 'dragon',
      tag: 'fantasy',
    });
  });

  it('does not call search_assets for whitespace-only search', async () => {
    vi.mocked(invoke).mockResolvedValue(mockAssets);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAssets('   '), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Whitespace-only query trims to empty, so it should call get_all_assets
    expect(invoke).toHaveBeenCalledWith('get_all_assets');
  });
});
