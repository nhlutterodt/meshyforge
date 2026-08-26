import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAnimationLibrary } from './useAnimationLibrary';

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

const mockLibrary = [
  { id: 'walk-001', name: 'Walk', category: 'locomotion' },
  { id: 'run-001', name: 'Run', category: 'locomotion' },
  { id: 'wave-001', name: 'Wave', category: 'gesture' },
];

describe('useAnimationLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the animation library via fetch_animation_library', async () => {
    vi.mocked(invoke).mockResolvedValue(mockLibrary);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAnimationLibrary(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockLibrary);
    expect(invoke).toHaveBeenCalledWith('fetch_animation_library');
  });

  it('returns an empty array when the API returns no presets', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAnimationLibrary(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('retries once on failure', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('Network error'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAnimationLibrary(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('falls back to an empty array instead of crashing on a non-array response', async () => {
    // Regression test: the real backend previously passed through Meshy's
    // `{ animations: [...] }` wrapper object unwrapped, which crashed
    // AnimationPanel's `.map` call and blacked out the whole app. The
    // backend now unwraps it, but this hook defends independently in case a
    // future provider (or API change) reintroduces the mismatch.
    vi.mocked(invoke).mockResolvedValue({ animations: mockLibrary });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAnimationLibrary(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
