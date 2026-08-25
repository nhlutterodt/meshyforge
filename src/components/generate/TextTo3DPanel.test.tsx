// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';
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
  useCreateTextTo3D: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock('@hooks/useMeshyApi', () => ({
  useCreateTextTo3D: mocks.useCreateTextTo3D,
}));

import { TextTo3DPanel } from '@components/generate/TextTo3DPanel';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useCreateTextTo3D.mockReturnValue({
    mutate: mocks.mutate,
    isPending: false,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  });
});

describe('TextTo3DPanel — TC-GEN-01', () => {
  it('TC-GEN-01-01: generate click posts preview mode and creates task', async () => {
    const user = userEvent.setup();
    render(<TextTo3DPanel />);

    await user.type(screen.getByLabelText('Prompt'), 'a fierce dragon');
    await user.click(screen.getByRole('button', { name: /generate preview/i }));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'preview',
        prompt: 'a fierce dragon',
        aiModel: 'latest',
        shouldRemesh: false,
      }),
      expect.any(Object),
    );
  });

  it('TC-GEN-01-02: generate button is disabled when prompt is empty', () => {
    render(<TextTo3DPanel />);

    expect(screen.getByRole('button', { name: /generate preview/i })).toBeDisabled();
  });

  it('TC-GEN-01-03: approaching character limit shows inline length warning', () => {
    render(<TextTo3DPanel />);

    const textarea = screen.getByLabelText('Prompt');
    fireEvent.change(textarea, { target: { value: 'x'.repeat(551) } });

    expect(screen.getByText(/approaching character limit/i)).toBeInTheDocument();
  });

  it('TC-GEN-01-04: renders prompt editor, model selector, and remesh controls', () => {
    render(<TextTo3DPanel />);

    expect(screen.getByLabelText('Prompt')).toBeInTheDocument();
    expect(screen.getByLabelText('AI Model')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /remesh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate preview/i })).toBeInTheDocument();
  });

  it('TC-GEN-01-05: generate button shows generating text and is disabled during mutation', () => {
    mocks.useCreateTextTo3D.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      mutateAsync: vi.fn(),
      reset: vi.fn(),
    });

    render(<TextTo3DPanel />);

    const button = screen.getByRole('button', { name: /generating/i });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Generating...');
  });

  it('TC-GEN-01-06: remesh switch is associated with its label and toggles shouldRemesh in request', async () => {
    const user = userEvent.setup();
    render(<TextTo3DPanel />);

    // Verify the switch is properly labeled (accessibility semantics)
    const remeshSwitch = screen.getByRole('switch', { name: /remesh/i });
    expect(remeshSwitch).toBeInTheDocument();

    // Toggle the switch and verify the request body reflects the change
    await user.click(remeshSwitch);
    await user.type(screen.getByLabelText('Prompt'), 'a castle');
    await user.click(screen.getByRole('button', { name: /generate preview/i }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ shouldRemesh: true }),
      expect.any(Object),
    );
  });
});