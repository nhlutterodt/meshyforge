import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the stores BEFORE importing the hook
vi.mock('@stores/taskStore', () => ({
  useTaskStore: vi.fn((selector) =>
    selector({
      addTask: vi.fn(),
    }),
  ),
}));

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@lib/tauri';
import { useCreateTextTo3D } from './useMeshyApi';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return { Wrapper, qc };
}

describe('useCreateTextTo3D', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls create_text_to_3d with the request body', async () => {
    vi.mocked(invoke).mockResolvedValue({ result: 'task-abc' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTextTo3D(), { wrapper: Wrapper });

    result.current.mutate({ mode: 'preview', prompt: 'a dragon' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('create_text_to_3d', {
      body: { mode: 'preview', prompt: 'a dragon' },
    });
  });

  it('does not retry on failure (retry: 0)', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('API error'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateTextTo3D(), { wrapper: Wrapper });

    result.current.mutate({ mode: 'preview', prompt: 'fail' } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.failureCount).toBe(1);
  });
});
