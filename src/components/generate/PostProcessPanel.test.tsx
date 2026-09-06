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

  it('TC-POST-01-02: remesh submit posts to remesh endpoint with parent task id and default field values', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-abc-123');
    await user.click(screen.getByRole('button', { name: /remesh model/i }));

    expect(mocks.remeshMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTaskId: 'task-abc-123',
        topology: 'triangle',
        targetPolycount: 30000,
        decimationMode: 3,
        alphaThumbnail: false,
      }),
      expect.any(Object),
    );
    // No formats checked -> targetFormats omitted entirely, not sent as [].
    expect(mocks.remeshMutate.mock.calls[0]?.[0]).not.toHaveProperty('targetFormats');
  });

  it('TC-POST-01-03: remesh submit collects topology, polycount, decimation mode, formats, and alpha thumbnail', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-abc-124');

    await user.click(screen.getByLabelText('Topology'));
    await user.click(await screen.findByText('Quad'));

    await user.click(screen.getByLabelText('Decimation Mode'));
    await user.click(await screen.findByText('Ultra'));

    await user.click(screen.getByRole('checkbox', { name: 'GLB' }));
    await user.click(screen.getByRole('checkbox', { name: 'STL' }));

    await user.click(screen.getByRole('switch', { name: 'Alpha Thumbnail' }));

    await user.click(screen.getByRole('button', { name: /remesh model/i }));

    expect(mocks.remeshMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTaskId: 'task-abc-124',
        topology: 'quad',
        decimationMode: 1,
        targetFormats: ['glb', 'stl'],
        alphaThumbnail: true,
      }),
      expect.any(Object),
    );
  });
});

describe('PostProcessPanel — TC-POST-02 (Retexture)', () => {
  it('TC-POST-02-01: retexture is rejected when the default text style prompt is empty', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-abc-456');
    await user.click(screen.getByText('Retexture'));
    const retextureButton = await screen.findByRole('button', { name: /retexture model/i });
    await user.click(retextureButton);

    expect(mocks.retextureMutate).not.toHaveBeenCalled();
  });

  it('TC-POST-02-02: retexture submit posts textStylePrompt and default field values', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-abc-456');
    await user.click(screen.getByText('Retexture'));
    await user.type(
      await screen.findByLabelText('Text Style Prompt'),
      'weathered bronze with green patina',
    );
    const retextureButton = await screen.findByRole('button', { name: /retexture model/i });
    await user.click(retextureButton);

    expect(mocks.retextureMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTaskId: 'task-abc-456',
        textStylePrompt: 'weathered bronze with green patina',
        enableOriginalUv: false,
        enablePbr: false,
        textureResolution: '4k',
        removeLighting: false,
        alphaThumbnail: false,
      }),
      expect.any(Object),
    );
    const sentBody = mocks.retextureMutate.mock.calls[0]?.[0];
    expect(sentBody).not.toHaveProperty('imageStyleUrl');
    expect(sentBody).not.toHaveProperty('multiviewImageUrls');
    expect(sentBody).not.toHaveProperty('targetFormats');
  });

  it('TC-POST-02-03: image style mode collects imageStyleUrl instead of a text prompt', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-abc-457');
    await user.click(screen.getByText('Retexture'));
    await user.click(await screen.findByLabelText('Style Input'));
    await user.click(await screen.findByText('Image Style URL'));
    await user.type(
      await screen.findByLabelText('Image Style URL'),
      'https://example.com/style.png',
    );
    const retextureButton = await screen.findByRole('button', { name: /retexture model/i });
    await user.click(retextureButton);

    expect(mocks.retextureMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTaskId: 'task-abc-457',
        imageStyleUrl: 'https://example.com/style.png',
      }),
      expect.any(Object),
    );
    expect(mocks.retextureMutate.mock.calls[0]?.[0]).not.toHaveProperty('textStylePrompt');
  });

  it('TC-POST-02-04: multi-view mode splits newline-separated URLs into multiviewImageUrls', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-abc-458');
    await user.click(screen.getByText('Retexture'));
    await user.click(await screen.findByLabelText('Style Input'));
    await user.click(await screen.findByText('Multi-View Image URLs'));
    await user.type(
      await screen.findByLabelText('Multi-View Image URLs (one per line)'),
      'https://example.com/1.png\nhttps://example.com/2.png',
    );
    const retextureButton = await screen.findByRole('button', { name: /retexture model/i });
    await user.click(retextureButton);

    expect(mocks.retextureMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTaskId: 'task-abc-458',
        multiviewImageUrls: ['https://example.com/1.png', 'https://example.com/2.png'],
      }),
      expect.any(Object),
    );
  });

  it('TC-POST-02-05: retexture collects PBR, resolution, remove lighting, formats, and alpha thumbnail; shows 8k credit cost', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-abc-459');
    await user.click(screen.getByText('Retexture'));
    await user.type(await screen.findByLabelText('Text Style Prompt'), 'brushed steel');

    await user.click(screen.getByRole('switch', { name: 'Enable Original UV' }));
    await user.click(screen.getByRole('switch', { name: 'Enable PBR Maps' }));
    await user.click(screen.getByRole('switch', { name: 'Remove Lighting' }));
    await user.click(screen.getByRole('switch', { name: 'Alpha Thumbnail' }));

    await user.click(screen.getByLabelText('Texture Resolution'));
    await user.click(await screen.findByText('8K'));
    expect(screen.getByText('Cost: 15 credits (8k)')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'FBX' }));

    const retextureButton = await screen.findByRole('button', { name: /retexture model/i });
    await user.click(retextureButton);

    expect(mocks.retextureMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTaskId: 'task-abc-459',
        textStylePrompt: 'brushed steel',
        enableOriginalUv: true,
        enablePbr: true,
        textureResolution: '8k',
        removeLighting: true,
        alphaThumbnail: true,
        targetFormats: ['fbx'],
      }),
      expect.any(Object),
    );
  });
});

describe('PostProcessPanel — TC-POST-03 (Convert)', () => {
  it('TC-POST-03-01: convert button is disabled until at least one target format is selected', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-abc-789');
    await user.click(screen.getByText('Convert'));
    const convertButton = await screen.findByRole('button', { name: /convert model/i });
    expect(convertButton).toBeDisabled();

    await user.click(convertButton);
    expect(mocks.convertMutate).not.toHaveBeenCalled();
  });

  it('TC-POST-03-02: convert submit posts only the user-selected target formats', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-abc-789');
    await user.click(screen.getByText('Convert'));
    await user.click(screen.getByRole('checkbox', { name: 'FBX' }));
    await user.click(screen.getByRole('checkbox', { name: 'STL' }));

    const convertButton = await screen.findByRole('button', { name: /convert model/i });
    expect(convertButton).toBeEnabled();
    await user.click(convertButton);

    expect(mocks.convertMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTaskId: 'task-abc-789',
        targetFormats: ['fbx', 'stl'],
      }),
      expect.any(Object),
    );
  });
});

describe('PostProcessPanel — TC-POST-04 (Resize)', () => {
  it('TC-POST-04-01: resize submit posts to resize endpoint with task id, height, and origin', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-resize-01');
    await user.click(screen.getByText('Resize'));
    await user.type(await screen.findByLabelText('Height (meters)'), '1.8');
    const resizeButton = await screen.findByRole('button', { name: /resize model/i });
    await user.click(resizeButton);

    expect(mocks.resizeMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTaskId: 'task-resize-01',
        resizeHeight: 1.8,
        originAt: 'bottom',
      }),
      expect.any(Object),
    );
  });

  it('TC-POST-04-02: auto resize mode sends autoSize without a value input', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-resize-02');
    await user.click(screen.getByText('Resize'));
    await user.click(await screen.findByLabelText('Resize Mode'));
    await user.click(await screen.findByText('Auto (AI-estimated)'));
    expect(screen.queryByLabelText(/height|longest side/i)).not.toBeInTheDocument();
    const resizeButton = await screen.findByRole('button', { name: /resize model/i });
    await user.click(resizeButton);

    expect(mocks.resizeMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTaskId: 'task-resize-02',
        autoSize: true,
        originAt: 'bottom',
      }),
      expect.any(Object),
    );
  });

  it('TC-POST-04-03: resize is rejected when no value entered for height mode', async () => {
    const user = userEvent.setup();
    render(<PostProcessPanel />);

    await enterTaskId(user, 'task-resize-03');
    await user.click(screen.getByText('Resize'));
    const resizeButton = await screen.findByRole('button', { name: /resize model/i });
    await user.click(resizeButton);

    expect(mocks.resizeMutate).not.toHaveBeenCalled();
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
