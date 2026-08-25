import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDownloadAsset } from './useDownloadAsset';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@lib/tauri';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return { Wrapper, qc };
}

const sampleDownloadRequest = {
  taskId: 'task-001',
  modelUrls: { glb: 'https://assets.meshy.ai/model.glb' },
  thumbnailUrl: 'https://assets.meshy.ai/thumb.png',
  textureUrls: [] as { baseColor: string | null; metallic: string | null; normal: string | null; roughness: string | null; emission: string | null }[],
};

describe('useDownloadAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls download_asset with the correct args mapping', async () => {
    vi.mocked(invoke).mockResolvedValue({ success: true, paths: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDownloadAsset(), { wrapper: Wrapper });

    result.current.mutate(sampleDownloadRequest);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('download_asset', {
      taskId: 'task-001',
      modelUrls: { glb: 'https://assets.meshy.ai/model.glb' },
      thumbnailUrl: 'https://assets.meshy.ai/thumb.png',
      textureUrls: [],
    });
  });

  it('passes thumbnailUrl as empty string when not provided', async () => {
    vi.mocked(invoke).mockResolvedValue({ success: true, paths: {} });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDownloadAsset(), { wrapper: Wrapper });

    result.current.mutate({ ...sampleDownloadRequest, thumbnailUrl: '' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('download_asset', {
      taskId: 'task-001',
      modelUrls: { glb: 'https://assets.meshy.ai/model.glb' },
      thumbnailUrl: '',
      textureUrls: [],
    });
  });

  it('does not retry on failure', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('Download failed'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDownloadAsset(), { wrapper: Wrapper });

    result.current.mutate(sampleDownloadRequest);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.failureCount).toBe(1);
  });
});