// @vitest-environment jsdom
//
// TASK-0017: CreativeLabPanel used to fake every product type by
// string-prefixing a generic Text-to-3D prompt (`useCreateTextTo3D`). These
// tests replace the old TC-GEN-02-02/03 (which asserted that string-prefix
// hack as "correct") with assertions on real CreativeLabRequest-shaped
// payloads sent to the real `useCreateCreativeLab` hook, and add coverage
// for the two client-side rules the FRD calls out explicitly: Lamp's
// mutually-exclusive text/image prototype input (FR-CLAB-06-F1) and
// Keycap's dual-required input_task_id + candidate_id build (FR-CLAB-07-F2).

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
  useCreateCreativeLab: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock('@hooks/useMeshyApi', () => ({
  useCreateCreativeLab: mocks.useCreateCreativeLab,
}));

import { CreativeLabPanel } from '@components/generate/CreativeLabPanel';
import { toast } from 'sonner';

/** The real jsdom FileReader can be flaky in test environments, so stub it
 * deterministic and synchronous, matching ImageTo3DPanel.test.tsx. */
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

/**
 * The base-ui Select's exit-transition state briefly leaves a
 * `pointer-events: none` popup in the DOM under jsdom (which never fires the
 * animationend/transitionend events real browsers do), which can make
 * userEvent's strict pointer-events check flake on the next test's Select
 * interaction. This suite exercises the Select several times per test, so
 * the check is disabled here rather than chasing that timing.
 */
function setupUser() {
  return userEvent.setup({ pointerEventsCheck: 0 });
}

async function uploadImage(container: HTMLElement) {
  const file = new File(['pixel data'], 'test.png', { type: 'image/png' });
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(screen.getByAltText('Preview')).toBeInTheDocument());
}

beforeEach(() => {
  vi.clearAllMocks();
  stubFileReader();
  mocks.useCreateCreativeLab.mockReturnValue({
    mutate: mocks.mutate,
    isPending: false,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  });
});

describe('CreativeLabPanel — TC-GEN-02 (Creative Lab)', () => {
  it('TC-GEN-02-01: renders all 7 project types and prototype/build stage controls', async () => {
    const user = setupUser();
    render(<CreativeLabPanel />);

    expect(screen.getByText('Creative Lab')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prototype' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Build' })).toBeInTheDocument();

    await user.click(screen.getByLabelText('Project Type'));
    for (const label of [
      'Keychain',
      'Fridge Magnet',
      'Figure',
      'Vinyl Figure',
      'Brick Figure',
      'Lamp',
      'Keycap',
    ]) {
      // 'Keychain' (the default selection) appears twice — once in the
      // closed trigger's current-value display, once in the open list.
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('TC-GEN-02-02: Keychain prototype posts a real CreativeLabRequest with the real TaskType and image_url (not a string-prefixed prompt)', async () => {
    const { container } = render(<CreativeLabPanel />);

    await uploadImage(container);
    await setupUser().click(screen.getByRole('button', { name: /generate prototype/i }));

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'creative-lab-keychain-prototype',
        imageUrl: expect.stringContaining('data:image'),
      }),
      expect.any(Object),
    );
    // The old bug string-prefixed a generic Text-to-3D prompt; that must be gone.
    expect(mocks.mutate.mock.calls[0]?.[0]).not.toHaveProperty('prompt');
  });

  it('TC-GEN-02-03: a succeeded prototype chains its task ID into the Build stage, which posts the 14 badge build options', async () => {
    const user = setupUser();
    mocks.mutate.mockImplementation(
      (_body: unknown, options: { onSuccess: (data: { result: string }) => void }) => {
        options.onSuccess({ result: 'proto-task-1' });
      },
    );
    const { container } = render(<CreativeLabPanel />);

    await uploadImage(container);
    await user.click(screen.getByRole('button', { name: /generate prototype/i }));

    const buildButton = await screen.findByRole('button', { name: 'Build Keychain' });
    await user.click(buildButton);

    expect(screen.getByLabelText('Input Task ID')).toHaveValue('proto-task-1');

    await user.click(screen.getByRole('button', { name: /generate build/i }));

    expect(mocks.mutate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'creative-lab-keychain-build',
        inputTaskId: 'proto-task-1',
        options: expect.any(Object),
        targetFormat: 'glb',
      }),
      expect.any(Object),
    );
  });

  it('TC-GEN-02-04: Figure build stage sends only the input task ID — no build options object (FR-CLAB-03-F2)', async () => {
    const user = setupUser();
    render(<CreativeLabPanel />);

    await user.click(screen.getByLabelText('Project Type'));
    await user.click(screen.getByText('Figure'));
    await user.click(screen.getByRole('button', { name: 'Build' }));
    await user.type(screen.getByLabelText('Input Task ID'), 'proto-figure-1');
    await user.click(screen.getByRole('button', { name: /generate build/i }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      { type: 'creative-lab-figure-build', inputTaskId: 'proto-figure-1' },
      expect.any(Object),
    );
  });

  it('TC-GEN-02-05: Lamp prototype rejects submission when neither text nor an image is provided', async () => {
    const user = setupUser();
    render(<CreativeLabPanel />);

    await user.click(screen.getByLabelText('Project Type'));
    await user.click(screen.getByText('Lamp'));
    await user.click(screen.getByRole('button', { name: /generate prototype/i }));

    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Enter a text prompt');
  });

  it('TC-GEN-02-05b: Lamp prototype in text mode sends `text` only, never `imageUrl`', async () => {
    const user = setupUser();
    render(<CreativeLabPanel />);

    await user.click(screen.getByLabelText('Project Type'));
    await user.click(screen.getByText('Lamp'));
    await user.type(screen.getByLabelText('Prompt'), 'a moon lamp');
    await user.click(screen.getByRole('button', { name: /generate prototype/i }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      { type: 'creative-lab-lamp-prototype', text: 'a moon lamp' },
      expect.any(Object),
    );
  });

  it('TC-GEN-02-05c: Lamp prototype in image mode sends `imageUrl` + `imageSubject` only, never `text`', async () => {
    const user = setupUser();
    const { container } = render(<CreativeLabPanel />);

    await user.click(screen.getByLabelText('Project Type'));
    await user.click(screen.getByText('Lamp'));
    await user.click(screen.getByRole('button', { name: 'Image' }));
    await uploadImage(container);
    await user.click(screen.getByRole('button', { name: /generate prototype/i }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      {
        type: 'creative-lab-lamp-prototype',
        imageUrl: expect.stringContaining('data:image'),
        imageSubject: 'character',
      },
      expect.any(Object),
    );
    expect(mocks.mutate.mock.calls[0]?.[0]).not.toHaveProperty('text');
  });

  it('TC-GEN-02-06: Keycap build is rejected client-side when candidate ID is missing, even with an input task ID', async () => {
    const user = setupUser();
    render(<CreativeLabPanel />);

    await user.click(screen.getByLabelText('Project Type'));
    await user.click(screen.getByText('Keycap'));
    await user.click(screen.getByRole('button', { name: 'Build' }));
    await user.type(screen.getByLabelText('Input Task ID'), 'proto-keycap-1');
    await user.click(screen.getByRole('button', { name: /generate build/i }));

    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Candidate ID required');
  });

  it('TC-GEN-02-06b: Keycap build posts both input_task_id and candidate_id once both are provided', async () => {
    const user = setupUser();
    render(<CreativeLabPanel />);

    await user.click(screen.getByLabelText('Project Type'));
    await user.click(screen.getByText('Keycap'));
    await user.click(screen.getByRole('button', { name: 'Build' }));
    await user.type(screen.getByLabelText('Input Task ID'), 'proto-keycap-1');
    await user.type(screen.getByLabelText('Candidate ID'), 'candidate-9');
    await user.click(screen.getByRole('button', { name: /generate build/i }));

    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'creative-lab-keycap-build',
        inputTaskId: 'proto-keycap-1',
        candidateId: 'candidate-9',
      }),
      expect.any(Object),
    );
  });

  it('TC-GEN-02-07: credit cost line reflects the selected product and stage (FR-CLAB-0X-F4/F5)', async () => {
    const user = setupUser();
    render(<CreativeLabPanel />);

    expect(screen.getByText('Cost: 6 credits')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Project Type'));
    await user.click(screen.getByText('Keycap'));
    expect(screen.getByText('Cost: 12 credits')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Build' }));
    expect(screen.getByText('Cost: 50 credits')).toBeInTheDocument();
  });

  it('TC-GEN-02-08: Brick Figure prototype shows a distinct IP-violation message on a 403 (FR-CLAB-05-F2)', async () => {
    const user = setupUser();
    mocks.mutate.mockImplementation(
      (_body: unknown, options: { onError: (error: unknown) => void }) => {
        options.onError({ code: 'API_ERROR_403', message: 'Forbidden' });
      },
    );
    const { container } = render(<CreativeLabPanel />);

    await user.click(screen.getByLabelText('Project Type'));
    await user.click(screen.getByText('Brick Figure'));
    await uploadImage(container);
    await user.click(screen.getByRole('button', { name: /generate prototype/i }));

    expect(toast.error).toHaveBeenCalledWith(
      'Image flagged for IP violation',
      expect.objectContaining({ description: expect.stringContaining('IP violation') }),
    );
  });

  it('TC-GEN-02-09: Keycap shows a distinct free-plan message on a 402 (FR-CLAB-07-F3)', async () => {
    const user = setupUser();
    mocks.mutate.mockImplementation(
      (_body: unknown, options: { onError: (error: unknown) => void }) => {
        options.onError({ code: 'API_ERROR_402', message: 'Payment required' });
      },
    );
    const { container } = render(<CreativeLabPanel />);

    await user.click(screen.getByLabelText('Project Type'));
    await user.click(screen.getByText('Keycap'));
    await uploadImage(container);
    await user.click(screen.getByRole('button', { name: /generate prototype/i }));

    expect(toast.error).toHaveBeenCalledWith(
      'Keycap requires a paid Meshy plan',
      expect.objectContaining({ description: expect.stringContaining('Upgrade') }),
    );
  });

  it('TC-GEN-02-10: generate button shows generating state and is disabled during a pending mutation', () => {
    mocks.useCreateCreativeLab.mockReturnValue({
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
