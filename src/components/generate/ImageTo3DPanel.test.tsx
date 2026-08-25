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

vi.mock('@stores/settingsStore', () => ({
  useSettingsStore: vi.fn((selector: (s: { defaultAiModel: string }) => unknown) =>
    selector({ defaultAiModel: 'latest' }),
  ),
}));

const mocks = vi.hoisted(() => ({
  useCreateImageTo3D: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock('@hooks/useMeshyApi', () => ({
  useCreateImageTo3D: mocks.useCreateImageTo3D,
}));

import { ImageTo3DPanel } from '@components/generate/ImageTo3DPanel';

/**
 * Mock FileReader so file-drop/upload tests are deterministic and synchronous.
 * The real jsdom FileReader can be flaky in test environments.
 */
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
  mocks.useCreateImageTo3D.mockReturnValue({
    mutate: mocks.mutate,
    isPending: false,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  });
});

describe('ImageTo3DPanel — TC-GEN-03', () => {
  it('TC-GEN-03-01: dropped image is loaded and shown as preview', async () => {
    render(<ImageTo3DPanel />);

    const file = new File(['pixel data'], 'test.png', { type: 'image/png' });
    const dropArea = screen.getByText(/drop an image/i).closest('button')!;

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } });
    fireEvent(dropArea, dropEvent);

    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });
  });

  it('TC-GEN-03-02: generate converts image to data URI and posts to image-to-3d', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImageTo3DPanel />);

    const file = new File(['pixel data'], 'test.png', { type: 'image/png' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /generate 3d model/i }));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: expect.stringContaining('data:image'),
        aiModel: 'latest',
        shouldTexture: true,
      }),
      expect.any(Object),
    );
  });

  it('TC-GEN-03-03: model selector is visible and offers meshy-7 and latest options', async () => {
    const user = userEvent.setup();
    render(<ImageTo3DPanel />);

    // The model selector should be present (ultra mode is tied to meshy-7/latest)
    expect(screen.getByLabelText('AI Model')).toBeInTheDocument();

    // Open the dropdown and verify meshy-7 and latest are available
    await user.click(screen.getByLabelText('AI Model'));
    expect(await screen.findByText('Meshy 7')).toBeInTheDocument();
    expect(screen.getByText('Latest')).toBeInTheDocument();
  });

  it('TC-GEN-03-04: generate texture toggle is present and reflects shouldTexture in request', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImageTo3DPanel />);

    // The texture toggle should be present (topology options are model-dependent)
    expect(screen.getByRole('switch', { name: /generate texture/i })).toBeInTheDocument();

    // Upload an image so the generate button is enabled
    const file = new File(['pixel data'], 'test.png', { type: 'image/png' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });

    // Toggle texture OFF and verify the request body
    await user.click(screen.getByRole('switch', { name: /generate texture/i }));
    await user.click(screen.getByRole('button', { name: /generate 3d model/i }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ shouldTexture: false }),
      expect.any(Object),
    );
  });
});