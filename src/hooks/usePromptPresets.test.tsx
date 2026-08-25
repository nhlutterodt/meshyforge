import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePromptPresets } from './usePromptPresets';

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

describe('usePromptPresets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty array when get_setting returns null', async () => {
    vi.mocked(invoke).mockResolvedValue(null);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePromptPresets(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.presets).toEqual([]);
  });

  it('parses stored presets from JSON', async () => {
    vi.mocked(invoke).mockResolvedValue(
      JSON.stringify([
        { name: 'Dragon', prompt: 'a fierce dragon' },
        { name: 'Castle', prompt: 'a medieval castle', aiModel: 'meshy-6' },
      ]),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePromptPresets(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.presets).toHaveLength(2);
    expect(result.current.presets[0]?.name).toBe('Dragon');
  });

  it('returns empty array when stored JSON is invalid', async () => {
    vi.mocked(invoke).mockResolvedValue('not valid json');
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePromptPresets(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.presets).toEqual([]);
  });

  it('addPreset saves the new preset via set_setting', async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce(null) // initial query
      .mockResolvedValueOnce(undefined); // save mutation

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePromptPresets(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.addPreset({ name: 'Hero', prompt: 'a hero character' });

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('set_setting', {
        key: 'prompt_presets',
        value: JSON.stringify([{ name: 'Hero', prompt: 'a hero character' }]),
      }),
    );
  });

  it('removePreset filters the preset by name and saves', async () => {
    const initial = [
      { name: 'Keep', prompt: 'keep this' },
      { name: 'Remove', prompt: 'remove this' },
    ];
    vi.mocked(invoke)
      .mockResolvedValueOnce(JSON.stringify(initial))
      .mockResolvedValueOnce(undefined);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePromptPresets(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.removePreset('Remove');

    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith('set_setting', {
        key: 'prompt_presets',
        value: JSON.stringify([{ name: 'Keep', prompt: 'keep this' }]),
      }),
    );
  });
});