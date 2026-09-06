// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// cmdk (used by ui/command.tsx, now backing the searchable animation list)
// calls scrollIntoView while navigating the list, and observes its list
// element with ResizeObserver; jsdom implements neither.
Element.prototype.scrollIntoView = vi.fn();
class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

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
  useCreateAnimation: vi.fn(),
  useAnimationLibrary: vi.fn(),
  animateMutate: vi.fn(),
  useAssets: vi.fn(),
}));

vi.mock('@hooks/useMeshyApi', () => ({
  useCreateAnimation: mocks.useCreateAnimation,
}));

vi.mock('@hooks/useAnimationLibrary', () => ({
  useAnimationLibrary: mocks.useAnimationLibrary,
}));

vi.mock('@hooks/useAssets', () => ({
  useAssets: mocks.useAssets,
}));

import { AnimationPanel } from '@components/generate/AnimationPanel';

const LIBRARY = [
  { id: 1, name: 'Walk', category: 'Locomotion' },
  { id: 2, name: 'Run', category: 'Locomotion' },
  { id: 3, name: 'Wave', category: 'Gesture' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useCreateAnimation.mockReturnValue({
    mutate: mocks.animateMutate,
    isPending: false,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
  });
  mocks.useAnimationLibrary.mockReturnValue({
    data: LIBRARY,
    isLoading: false,
  });
  mocks.useAssets.mockReturnValue({ data: [] });
});

describe('AnimationPanel — TC-POST-07', () => {
  it('TC-POST-07-01: loads animation library and renders items in select dropdown', async () => {
    const user = userEvent.setup();
    render(<AnimationPanel />);

    // The Select trigger should be present (not in loading state)
    expect(screen.getByLabelText('Animation Action')).toBeInTheDocument();

    // Open the dropdown and verify library items are rendered
    await user.click(screen.getByLabelText('Animation Action'));
    expect(await screen.findByText('Walk')).toBeInTheDocument();
    expect(screen.getByText('Run')).toBeInTheDocument();
    expect(screen.getByText('Wave')).toBeInTheDocument();
  });

  it('TC-POST-07-02: selecting an animation from dropdown sets actionId and enables generate', async () => {
    const user = userEvent.setup();
    render(<AnimationPanel />);

    // Initially the generate button is disabled (no rig task ID, no action)
    expect(screen.getByRole('button', { name: /generate animation/i })).toBeDisabled();

    // Enter a rig task ID
    await user.type(screen.getByLabelText('Rig Task ID'), 'task-rig-001');

    // Open the dropdown and select "Walk"
    await user.click(screen.getByLabelText('Animation Action'));
    await user.click(await screen.findByText('Walk'));

    // Now the generate button should be enabled
    expect(screen.getByRole('button', { name: /generate animation/i })).toBeEnabled();

    // Click generate and verify the mutation is called with the action ID
    await user.click(screen.getByRole('button', { name: /generate animation/i }));

    expect(mocks.animateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        rigTaskId: 'task-rig-001',
        actionId: 1,
      }),
      expect.any(Object),
    );
  });

  it('TC-POST-07-03: searching the animation list filters out non-matching items', async () => {
    const user = userEvent.setup();
    render(<AnimationPanel />);

    await user.type(screen.getByLabelText('Animation Action'), 'walk');

    expect(screen.getByText('Walk')).toBeInTheDocument();
    expect(screen.queryByText('Run')).not.toBeInTheDocument();
    expect(screen.queryByText('Wave')).not.toBeInTheDocument();
  });

  it('TC-POST-07-04: displays the credit cost estimate', () => {
    render(<AnimationPanel />);

    expect(screen.getByText('Cost: 3 credits')).toBeInTheDocument();
  });

  it('TC-POST-07-05: selecting a change-fps post-process option includes it in the submitted body', async () => {
    const user = userEvent.setup();
    render(<AnimationPanel />);

    await user.type(screen.getByLabelText('Rig Task ID'), 'task-rig-002');
    await user.click(screen.getByLabelText('Animation Action'));
    await user.click(await screen.findByText('Walk'));

    await user.click(screen.getByLabelText('Post-Process (optional)'));
    await user.click(await screen.findByText('Change FPS'));

    await user.click(screen.getByLabelText('Target FPS'));
    await user.click(await screen.findByText('60'));

    await user.click(screen.getByRole('button', { name: /generate animation/i }));

    expect(mocks.animateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        rigTaskId: 'task-rig-002',
        actionId: 1,
        postProcess: { operationType: 'change_fps', fps: 60 },
      }),
      expect.any(Object),
    );
  });

  it('TC-POST-07-06: leaves postProcess off the body when no option is selected', async () => {
    const user = userEvent.setup();
    render(<AnimationPanel />);

    await user.type(screen.getByLabelText('Rig Task ID'), 'task-rig-003');
    await user.click(screen.getByLabelText('Animation Action'));
    await user.click(await screen.findByText('Walk'));
    await user.click(screen.getByRole('button', { name: /generate animation/i }));

    const [body] = mocks.animateMutate.mock.calls[0] as [Record<string, unknown>, unknown];
    expect(body).not.toHaveProperty('postProcess');
  });
});
