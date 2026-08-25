// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  useCreateTextToImage: vi.fn(),
  useCreateImageToImage: vi.fn(),
  textMutate: vi.fn(),
  imageMutate: vi.fn(),
}));

vi.mock('@hooks/useMeshyApi', () => ({
  useCreateTextToImage: mocks.useCreateTextToImage,
  useCreateImageToImage: mocks.useCreateImageToImage,
}));

import { ImageGenPanel } from '@components/generate/ImageGenPanel';

function stubFileReader() {
  vi.stubGlobal(
    'FileReader',
    vi.fn().mockImplementation(() => {
      const reader = {
        onload: null as (() => void) | null,
        result: 'data:image/png;base64,aGVsbG8=' as string,
        readAsDataURL() {
          reader.result = 'data:image/png;base64,aGVsbG8=';
          reader.onload?.();
        },
      };
      return reader;
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  stubFileReader();
  mocks.useCreateTextToImage.mockReturnValue({
    mutate: mocks.textMutate,
    isPending: false,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  });
  mocks.useCreateImageToImage.mockReturnValue({
    mutate: mocks.imageMutate,
    isPending: false,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  });
});

describe('ImageGenPanel — TC-GEN-05 (Image Generation)', () => {
  it('TC-GEN-05-01: text-to-image tab posts request with selected model', async () => {
    const user = userEvent.setup();
    render(<ImageGenPanel />);

    await user.type(screen.getByLabelText('Prompt'), 'a sunset over the ocean');
    await user.click(screen.getByRole('button', { name: /generate image/i }));

    expect(mocks.textMutate).toHaveBeenCalledTimes(1);
    expect(mocks.textMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        aiModel: 'nano-banana',
        prompt: 'a sunset over the ocean',
      }),
      expect.any(Object),
    );
    expect(mocks.imageMutate).not.toHaveBeenCalled();
  });

  it('TC-GEN-05-02: image-to-image tab requires a reference image before posting', async () => {
    const user = userEvent.setup();
    render(<ImageGenPanel />);

    await user.click(screen.getByRole('tab', { name: /image to image/i }));
    await user.type(screen.getByLabelText('Prompt'), 'recolor this');

    const button = screen.getByRole('button', { name: /generate image/i });
    expect(button).toBeDisabled();
  });

  it('TC-GEN-05-03: image-to-image posts request with reference image URLs after drop', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImageGenPanel />);

    await user.click(screen.getByRole('tab', { name: /image to image/i }));

    const file = new File(['pixel data'], 'ref.png', { type: 'image/png' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Prompt'), 'recolor this');
    await user.click(screen.getByRole('button', { name: /generate image/i }));

    expect(mocks.imageMutate).toHaveBeenCalledTimes(1);
    expect(mocks.imageMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        aiModel: 'nano-banana',
        prompt: 'recolor this',
        referenceImageUrls: ['data:image/png;base64,aGVsbG8='],
      }),
      expect.any(Object),
    );
  });

  it('TC-GEN-05-04: text-to-image button is disabled when prompt is empty', () => {
    render(<ImageGenPanel />);

    expect(screen.getByRole('button', { name: /generate image/i })).toBeDisabled();
  });
});
