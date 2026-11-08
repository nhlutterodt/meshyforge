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

describe('useAllTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches tags from the dedicated get_all_tags command', async () => {
    vi.mocked(invoke).mockResolvedValue(['dragon', 'fantasy', 'monster']);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAllTags(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(['dragon', 'fantasy', 'monster']);
    expect(invoke).toHaveBeenCalledWith('get_all_tags');
  });

  it('does not fetch whole asset rows over IPC', async () => {
    // Regression guard for the perf slice: deriving tags from
    // `get_all_assets` pulled every asset row (prompts, notes, and the
    // file_paths/texture_paths blobs) across IPC just to build a dropdown of
    // short strings. The dedupe now happens in SQL.
    vi.mocked(invoke).mockResolvedValue(['dragon']);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAllTags(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).not.toHaveBeenCalledWith('get_all_assets');
  });

  it('returns an empty array when no tags exist', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAllTags(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('passes the backend order through verbatim (SQL orders by name)', async () => {
    // The hook no longer sorts client-side — `get_all_tags` is
    // `ORDER BY t.name`, so re-sorting here would mask an unordered query.
    vi.mocked(invoke).mockResolvedValue(['alpha', 'beta', 'gamma']);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAllTags(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('surfaces a query error when the command fails', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('DB_ERROR'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAllTags(), { wrapper: Wrapper });

    // Longer timeout than the default: this query sets `retry: 1`, so the
    // error state only appears after the retry attempt fails too.
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
  });
});
