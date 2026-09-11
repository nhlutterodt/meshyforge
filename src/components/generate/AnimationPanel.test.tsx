// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/react';
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
  useAnimationPreview: vi.fn(),
  animateMutate: vi.fn(),
  useAssets: vi.fn(),
}));

vi.mock('@hooks/useMeshyApi', () => ({
  useCreateAnimation: mocks.useCreateAnimation,
}));

vi.mock('@hooks/useAnimationLibrary', () => ({
  useAnimationLibrary: mocks.useAnimationLibrary,
}));

vi.mock('@hooks/useAnimationPreview', () => ({
  useAnimationPreview: mocks.useAnimationPreview,
}));

vi.mock('@hooks/useAssets', () => ({
  useAssets: mocks.useAssets,
}));

import { AnimationPanel } from '@components/generate/AnimationPanel';

const LIBRARY = [
  {
    id: 1,
    key: 'Walk',
    name: 'Walk',
    category: 'Locomotion',
    subCategory: 'Ground',
    previewUrl: 'https://cdn.meshy.ai/Walk.gif',
  },
  { id: 2, key: 'Run', name: 'Run', category: 'Locomotion' },
  { id: 3, key: 'Wave', name: 'Wave', category: 'Gesture' },
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
  mocks.useAnimationPreview.mockReturnValue({ data: undefined });
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

describe('AnimationPanel — preview images (ADR-0011)', () => {
  async function selectWalk() {
    const user = userEvent.setup();
    render(<AnimationPanel />);
    await user.click(screen.getByLabelText('Animation Action'));
    await user.click(await screen.findByText('Walk'));
    return user;
  }

  it('prefers the locally cached file over the provider CDN', async () => {
    mocks.useAnimationPreview.mockReturnValue({ data: 'C:/data/previews/Walk.gif' });
    await selectWalk();

    const image = await screen.findByAltText('Preview of Walk');
    // assetUrl is mocked to identity, so a local path proves the cache won.
    expect(image).toHaveAttribute('src', 'C:/data/previews/Walk.gif');
    expect(screen.getByTestId('preview-source')).toHaveTextContent('Cached locally');
  });

  it('falls back to the provider CDN only while no local copy exists', async () => {
    mocks.useAnimationPreview.mockReturnValue({ data: undefined });
    await selectWalk();

    const image = await screen.findByAltText('Preview of Walk');
    expect(image).toHaveAttribute('src', 'https://cdn.meshy.ai/Walk.gif');
    expect(screen.getByTestId('preview-source')).toHaveTextContent('Loading from provider');
  });

  it('passes the stable key, not the action id, to the preview cache', async () => {
    await selectWalk();

    expect(mocks.useAnimationPreview).toHaveBeenCalledWith('Walk', 'https://cdn.meshy.ai/Walk.gif');
  });

  it('degrades to a placeholder when the image cannot be rendered', async () => {
    mocks.useAnimationPreview.mockReturnValue({ data: undefined });
    await selectWalk();

    const image = await screen.findByAltText('Preview of Walk');
    fireEvent.error(image);

    expect(screen.queryByAltText('Preview of Walk')).not.toBeInTheDocument();
    expect(screen.getByText('No preview')).toBeInTheDocument();
    // The picker itself must remain usable with no image at all.
    expect(screen.getByRole('button', { name: /generate animation/i })).toBeInTheDocument();
  });

  it('falls through to the CDN when a cached file exists but will not render', async () => {
    // A cached file can be deleted, truncated or half-written. That is exactly
    // when the fallback matters, so it must not dead-end on the placeholder.
    mocks.useAnimationPreview.mockReturnValue({ data: 'C:/data/previews/Walk.gif' });
    await selectWalk();

    const cached = await screen.findByAltText('Preview of Walk');
    expect(cached).toHaveAttribute('src', 'C:/data/previews/Walk.gif');

    fireEvent.error(cached);

    const remote = await screen.findByAltText('Preview of Walk');
    expect(remote).toHaveAttribute('src', 'https://cdn.meshy.ai/Walk.gif');
    expect(screen.getByTestId('preview-source')).toHaveTextContent('Loading from provider');

    // Only once the CDN also fails do we give up.
    fireEvent.error(remote);
    expect(screen.getByText('No preview')).toBeInTheDocument();
  });

  it('renders a text-only selection for an action with no preview', async () => {
    const user = userEvent.setup();
    render(<AnimationPanel />);
    await user.click(screen.getByLabelText('Animation Action'));
    await user.click(await screen.findByText('Wave'));

    expect(screen.queryByAltText('Preview of Wave')).not.toBeInTheDocument();
    expect(screen.getByText('Selected: Wave')).toBeInTheDocument();
  });
});
