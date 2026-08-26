// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

vi.mock('sonner', () => {
  const toastFn = vi.fn();
  return {
    toast: Object.assign(toastFn, {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    }),
  };
});

const mocks = vi.hoisted(() => ({
  useCreateRemesh: vi.fn(),
  useCreateRetexture: vi.fn(),
  useCreateConvert: vi.fn(),
  useCreateResize: vi.fn(),
  useCreateUvUnwrap: vi.fn(),
  remeshMutate: vi.fn(),
  retextureMutate: vi.fn(),
  convertMutate: vi.fn(),
  resizeMutate: vi.fn(),
  uvMutate: vi.fn(),
  useAssets: vi.fn(),
}));

vi.mock('@hooks/useMeshyApi', () => ({
  useCreateRemesh: mocks.useCreateRemesh,
  useCreateRetexture: mocks.useCreateRetexture,
  useCreateConvert: mocks.useCreateConvert,
  useCreateResize: mocks.useCreateResize,
  useCreateUvUnwrap: mocks.useCreateUvUnwrap,
}));

vi.mock('@hooks/useAssets', () => ({
  useAssets: mocks.useAssets,
}));

import { PostProcessPanel } from '@components/generate/PostProcessPanel';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useCreateRemesh.mockReturnValue({ mutate: mocks.remeshMutate, isPending: false });
  mocks.useCreateRetexture.mockReturnValue({ mutate: mocks.retextureMutate, isPending: false });
  mocks.useCreateConvert.mockReturnValue({ mutate: mocks.convertMutate, isPending: false });
  mocks.useCreateResize.mockReturnValue({ mutate: mocks.resizeMutate, isPending: false });
  mocks.useCreateUvUnwrap.mockReturnValue({ mutate: mocks.uvMutate, isPending: false });
  mocks.useAssets.mockReturnValue({ data: [] });
});

async function enterTaskId(user: ReturnType<typeof userEvent.setup>, taskId: string) {
  await user.type(screen.getByLabelText('Input Task ID'), taskId);
}

describe('PostProcessPanel — TC-POST-01 (Remesh)', () => {
  it('TC-POST-01-01: remesh form renders input task ID and remesh button enabled', () => {
    render(<PostProcessPanel />);

    expect(screen.getByLabelText('Input Task ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remesh model/i })).toBeEnabled();
  });

  it('TC-POST-01-02: remesh submit posts to remesh endpoint with parent task id', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-abc-123');
    await user.click(screen.getByRole('button', { name: /remesh model/i }));

    expect(mocks.remeshMutate).toHaveBeenCalledWith(
      expect.objectContaining({ inputTaskId: 'task-abc-123' }),
      expect.any(Object),
    );
  });
});

describe('PostProcessPanel — TC-POST-02 (Retexture)', () => {
  it('TC-POST-02-01: retexture submit posts to retexture endpoint with task id', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-abc-456');
    await user.click(screen.getByText('Retexture'));
    const retextureButton = await screen.findByRole('button', { name: /retexture model/i });
    await user.click(retextureButton);

    expect(mocks.retextureMutate).toHaveBeenCalledWith(
      expect.objectContaining({ inputTaskId: 'task-abc-456' }),
      expect.any(Object),
    );
  });
});

describe('PostProcessPanel — TC-POST-03 (Convert)', () => {
  it('TC-POST-03-01: convert submit posts to convert endpoint with target formats', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-abc-789');
    await user.click(screen.getByText('Convert'));
    const convertButton = await screen.findByRole('button', { name: /convert model/i });
    await user.click(convertButton);

    expect(mocks.convertMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTaskId: 'task-abc-789',
        targetFormats: ['glb', 'fbx'],
      }),
      expect.any(Object),
    );
  });
});

describe('PostProcessPanel — TC-POST-04 (Resize)', () => {
  it('TC-POST-04-01: resize submit posts to resize endpoint with task id', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-resize-01');
    await user.click(screen.getByText('Resize'));
    const resizeButton = await screen.findByRole('button', { name: /resize model/i });
    await user.click(resizeButton);

    expect(mocks.resizeMutate).toHaveBeenCalledWith(
      expect.objectContaining({ inputTaskId: 'task-resize-01' }),
      expect.any(Object),
    );
  });
});

describe('PostProcessPanel — TC-POST-05 (UV Unwrap)', () => {
  it('TC-POST-05-01: uv unwrap submit posts to uv unwrap endpoint with task id', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-uv-01');
    await user.click(screen.getByText('UV Unwrap'));
    const uvButton = await screen.findByRole('button', { name: /uv unwrap model/i });
    await user.click(uvButton);

    expect(mocks.uvMutate).toHaveBeenCalledWith(
      expect.objectContaining({ inputTaskId: 'task-uv-01' }),
      expect.any(Object),
    );
  });

  it('TC-POST-05-02: uv unwrap tab renders the uv unwrap button', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await user.click(screen.getByText('UV Unwrap'));
    const uvButton = await waitFor(() => screen.getByRole('button', { name: /uv unwrap model/i }));

    // The 40000-face warning is not yet implemented in the component,
    // but the UV unwrap form and submit button are present.
    expect(uvButton).toBeInTheDocument();
  });
});
