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
  useCreateMultiImageTo3D: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock('@hooks/useMeshyApi', () => ({
  useCreateMultiImageTo3D: mocks.useCreateMultiImageTo3D,
}));

import { MultiImagePanel } from '@components/generate/MultiImagePanel';

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
  mocks.useCreateMultiImageTo3D.mockReturnValue({
    mutate: mocks.mutate,
    isPending: false,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  });
});

describe('MultiImagePanel — TC-GEN-04 (Multi-Image to 3D)', () => {
  it('TC-GEN-04-01: generate is disabled when no images are selected', () => {
    render(<MultiImagePanel />);

    expect(screen.getByRole('button', { name: /generate 3d model/i })).toBeDisabled();
  });

  it('TC-GEN-04-02: dropped image posts request with image URLs', async () => {
    const user = userEvent.setup();
    const { container } = render(<MultiImagePanel />);

    const file = new File(['pixel data'], 'img.png', { type: 'image/png' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /generate 3d model/i }));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrls: ['data:image/png;base64,aGVsbG8='],
      }),
      expect.any(Object),
    );
  });

  it('TC-GEN-04-03: shows selected image count after upload', async () => {
    const { container } = render(<MultiImagePanel />);

    const file = new File(['pixel data'], 'img.png', { type: 'image/png' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('1 image(s) selected')).toBeInTheDocument();
    });
  });
});
