import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAllTags } from './useAllTags';

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
  { tags: '["fantasy","dragon"]' },
  { tags: '["dragon","monster"]' },
  { tags: '["fantasy"]' },
  { tags: 'invalid_json' },
  { tags: '[]' },
];

describe('useAllTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all assets and extracts unique sorted tags', async () => {
    vi.mocked(invoke).mockResolvedValue(mockAssets);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAllTags(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(['dragon', 'fantasy', 'monster']);
  });

  it('returns an empty array when no assets have tags', async () => {
    vi.mocked(invoke).mockResolvedValue([{ tags: '[]' }, { tags: '[]' }]);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAllTags(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('skips assets with invalid JSON tags without throwing', async () => {
    vi.mocked(invoke).mockResolvedValue([
      { tags: '["valid"]' },
      { tags: 'not_json' },
      { tags: '{also_not: array}' },
    ]);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAllTags(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(['valid']);
  });

  it('deduplicates tags across assets', async () => {
    vi.mocked(invoke).mockResolvedValue([
      { tags: '["dragon"]' },
      { tags: '["dragon"]' },
      { tags: '["dragon"]' },
    ]);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAllTags(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(['dragon']);
  });
});
