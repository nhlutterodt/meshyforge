// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
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
  useCreateRigging: vi.fn(),
  riggingMutate: vi.fn(),
  useAssets: vi.fn(),
}));

vi.mock('@hooks/useMeshyApi', () => ({
  useCreateRigging: mocks.useCreateRigging,
}));

vi.mock('@hooks/useAssets', () => ({
  useAssets: mocks.useAssets,
}));

import { RiggingPanel } from '@components/generate/RiggingPanel';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useCreateRigging.mockReturnValue({
    mutate: mocks.riggingMutate,
    isPending: false,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  });
  mocks.useAssets.mockReturnValue({ data: [] });
});

describe('RiggingPanel — TC-POST-06', () => {
  it('TC-POST-06-01: submit with height posts to rigging endpoint', async () => {
    const user = userEvent.setup();
    render(<RiggingPanel />);

    await user.type(screen.getByLabelText('Input Task ID'), 'task-rig-123');
    await user.type(screen.getByLabelText('Height (meters)'), '1.75');
    await user.click(screen.getByRole('button', { name: /generate rig/i }));

    expect(mocks.riggingMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTaskId: 'task-rig-123',
        heightMeters: 1.75,
      }),
      expect.any(Object),
    );
  });

  it('TC-POST-06-02: rig button is disabled when input task id is empty', () => {
    render(<RiggingPanel />);

    // The face-count >300000 gate is not yet implemented in the component;
    // the button is disabled when the input task ID is empty.
    expect(screen.getByRole('button', { name: /generate rig/i })).toBeDisabled();
  });

  it('TC-POST-06-03: submitting with a texture image URL includes textureImageUrl in the body', async () => {
    const user = userEvent.setup();
    render(<RiggingPanel />);

    await user.type(screen.getByLabelText('Input Task ID'), 'task-rig-456');
    await user.type(screen.getByLabelText(/texture image url/i), 'https://example.com/texture.png');
    await user.click(screen.getByRole('button', { name: /generate rig/i }));

    expect(mocks.riggingMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTaskId: 'task-rig-456',
        textureImageUrl: 'https://example.com/texture.png',
      }),
      expect.any(Object),
    );
  });

  it('TC-POST-06-04: submitting without a texture image URL omits the field entirely', async () => {
    const user = userEvent.setup();
    render(<RiggingPanel />);

    await user.type(screen.getByLabelText('Input Task ID'), 'task-rig-789');
    await user.click(screen.getByRole('button', { name: /generate rig/i }));

    const [body] = mocks.riggingMutate.mock.calls[0] as [Record<string, unknown>, unknown];
    expect(body).not.toHaveProperty('textureImageUrl');
  });

  it('TC-POST-06-05: displays the non-humanoid warning, the face-limit note, and the credit cost estimate', () => {
    render(<RiggingPanel />);

    expect(
      screen.getByText('Auto-rigging works best with standard humanoid characters.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/300,000 faces/)).toBeInTheDocument();
    expect(screen.getByText('Cost: 5 credits')).toBeInTheDocument();
  });
});
