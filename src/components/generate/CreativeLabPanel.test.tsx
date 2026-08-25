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
  useCreateTextTo3D: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock('@hooks/useMeshyApi', () => ({
  useCreateTextTo3D: mocks.useCreateTextTo3D,
}));

import { CreativeLabPanel } from '@components/generate/CreativeLabPanel';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useCreateTextTo3D.mockReturnValue({
    mutate: mocks.mutate,
    isPending: false,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  });
});

describe('CreativeLabPanel — TC-GEN-02 (Creative Lab)', () => {
  it('TC-GEN-02-01: renders project type selector and prototype/build stage controls', () => {
    render(<CreativeLabPanel />);

    expect(screen.getByText('Creative Lab')).toBeInTheDocument();
    expect(screen.getByText('Project Type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prototype' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Build' })).toBeInTheDocument();
  });

  it('TC-GEN-02-02: generate posts preview mode with selected type and stage', async () => {
    const user = userEvent.setup();
    render(<CreativeLabPanel />);

    await user.type(screen.getByLabelText('Prompt'), 'a cute astronaut');
    await user.click(screen.getByRole('button', { name: /generate prototype/i }));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'preview',
        prompt: 'creative-lab-keychain-prototype: a cute astronaut',
      }),
      expect.any(Object),
    );
  });

  it('TC-GEN-02-03: switching to build stage updates the request type suffix', async () => {
    const user = userEvent.setup();
    render(<CreativeLabPanel />);

    await user.click(screen.getByRole('button', { name: 'Build' }));
    await user.type(screen.getByLabelText('Prompt'), 'a robot');
    await user.click(screen.getByRole('button', { name: /generate build/i }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'creative-lab-keychain-build: a robot',
      }),
      expect.any(Object),
    );
  });

  it('TC-GEN-02-04: generate button is disabled when prompt is empty', () => {
    render(<CreativeLabPanel />);

    expect(screen.getByRole('button', { name: /generate prototype/i })).toBeDisabled();
  });

  it('TC-GEN-02-05: button shows generating state and is disabled during mutation', () => {
    mocks.useCreateTextTo3D.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
    });

    render(<CreativeLabPanel />);

    const button = screen.getByRole('button', { name: /generating/i });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Generating...');
  });
});
