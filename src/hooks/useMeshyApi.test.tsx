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
import {
  useCreateAnimation,
  useCreateConvert,
  useCreateImageTo3D,
  useCreateMultiImageTo3D,
  useCreateRemesh,
  useCreateResize,
  useCreateRetexture,
  useCreateRigging,
  useCreateTextTo3D,
} from './useMeshyApi';

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

// ─── Regression tests for all 9 create hooks ──────────────────
//
// These tests verify that each hook:
// 1. Calls the correct Tauri command name (snake_case per IPC contract)
// 2. Passes the body through as-is (camelCase — the Rust side converts)
// 3. Does not retry on failure

describe('useCreateImageTo3D — regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls create_image_to_3d with camelCase body', async () => {
    vi.mocked(invoke).mockResolvedValue({ result: 'task-img-1' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateImageTo3D(), { wrapper: Wrapper });

    result.current.mutate({
      imageUrl: 'data:image/jpeg;base64,abc',
      aiModel: 'meshy-7',
      shouldTexture: true,
    } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('create_image_to_3d', {
      body: {
        imageUrl: 'data:image/jpeg;base64,abc',
        aiModel: 'meshy-7',
        shouldTexture: true,
      },
    });
  });

  it('does not retry on failure', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('API error'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateImageTo3D(), { wrapper: Wrapper });

    result.current.mutate({ imageUrl: 'data:image/png;base64,x' } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.failureCount).toBe(1);
  });
});

describe('useCreateMultiImageTo3D — regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls create_multi_image_to_3d with camelCase body including array', async () => {
    vi.mocked(invoke).mockResolvedValue({ result: 'task-multi-1' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateMultiImageTo3D(), { wrapper: Wrapper });

    result.current.mutate({
      imageUrls: ['data:image/png;base64,a', 'data:image/png;base64,b'],
      aiModel: 'latest',
    } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('create_multi_image_to_3d', {
      body: {
        imageUrls: ['data:image/png;base64,a', 'data:image/png;base64,b'],
        aiModel: 'latest',
      },
    });
  });
});

describe('useCreateRemesh — regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls create_remesh with camelCase body', async () => {
    vi.mocked(invoke).mockResolvedValue({ result: 'task-remesh-1' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateRemesh(), { wrapper: Wrapper });

    result.current.mutate({
      inputTaskId: '01a039b2-b12c-7b56-b955-7fe20515aed0',
      targetPolycount: 10000,
    } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('create_remesh', {
      body: {
        inputTaskId: '01a039b2-b12c-7b56-b955-7fe20515aed0',
        targetPolycount: 10000,
      },
    });
  });
});

describe('useCreateRetexture — regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls create_retexture with camelCase body', async () => {
    vi.mocked(invoke).mockResolvedValue({ result: 'task-tex-1' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateRetexture(), { wrapper: Wrapper });

    result.current.mutate({
      inputTaskId: '01a039b2-b12c-7b56-b955-7fe20515aed0',
      texturePrompt: 'leather',
      enablePbr: true,
    } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('create_retexture', {
      body: {
        inputTaskId: '01a039b2-b12c-7b56-b955-7fe20515aed0',
        texturePrompt: 'leather',
        enablePbr: true,
      },
    });
  });
});

describe('useCreateConvert — regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls create_convert with camelCase body including targetFormats array', async () => {
    vi.mocked(invoke).mockResolvedValue({ result: 'task-conv-1' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateConvert(), { wrapper: Wrapper });

    result.current.mutate({
      inputTaskId: '01a039b2-b12c-7b56-b955-7fe20515aed0',
      targetFormats: ['glb', 'fbx'],
    } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('create_convert', {
      body: {
        inputTaskId: '01a039b2-b12c-7b56-b955-7fe20515aed0',
        targetFormats: ['glb', 'fbx'],
      },
    });
  });
});

describe('useCreateResize — regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls create_resize with camelCase body', async () => {
    vi.mocked(invoke).mockResolvedValue({ result: 'task-resize-1' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateResize(), { wrapper: Wrapper });

    result.current.mutate({
      inputTaskId: '01a039b2-b12c-7b56-b955-7fe20515aed0',
      targetPolycount: 5000,
    } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('create_resize', {
      body: {
        inputTaskId: '01a039b2-b12c-7b56-b955-7fe20515aed0',
        targetPolycount: 5000,
      },
    });
  });
});

describe('useCreateRigging — regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls create_rigging with camelCase body including optional heightMeters', async () => {
    vi.mocked(invoke).mockResolvedValue({ result: 'task-rig-1' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateRigging(), { wrapper: Wrapper });

    result.current.mutate({
      inputTaskId: '01a039b2-b12c-7b56-b955-7fe20515aed0',
      heightMeters: 1.75,
    } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('create_rigging', {
      body: {
        inputTaskId: '01a039b2-b12c-7b56-b955-7fe20515aed0',
        heightMeters: 1.75,
      },
    });
  });
});

describe('useCreateAnimation — regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls create_animation with camelCase body', async () => {
    vi.mocked(invoke).mockResolvedValue({ result: 'task-anim-1' });
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateAnimation(), { wrapper: Wrapper });

    result.current.mutate({
      rigTaskId: '01a039b2-b12c-7b56-b955-7fe20515aed0',
      actionId: 5,
    } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invoke).toHaveBeenCalledWith('create_animation', {
      body: {
        rigTaskId: '01a039b2-b12c-7b56-b955-7fe20515aed0',
        actionId: 5,
      },
    });
  });
});
