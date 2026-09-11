// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import type { AssetRow } from '@lib/meshy-types';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, forwardRef, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeFakeVector3(x: number, y: number, z: number) {
  const v = {
    x,
    y,
    z,
    set(nx: number, ny: number, nz: number) {
      v.x = nx;
      v.y = ny;
      v.z = nz;
    },
  };
  return v;
}

const mocks = vi.hoisted(() => {
  const clear = vi.fn();
  const useGLTF = Object.assign(
    vi.fn(() => ({ scene: { clone: vi.fn(() => ({ name: 'model' })) } })),
    { clear },
  );
  const fit = vi.fn();
  const refresh = vi.fn(() => ({ fit }));
  const useBounds = vi.fn(() => ({ refresh }));
  const orbitReset = vi.fn();
  const orbitUpdate = vi.fn();
  const cloneSkinnedScene = vi.fn(() => ({ name: 'rebound-model' }));
  const actionPlay = vi.fn();
  const actionStop = vi.fn();
  const actionSetLoop = vi.fn();
  const actionReset = vi.fn();
  const useAnimations = vi.fn(() => ({ actions: {} }));
  const invoke = vi.fn();

  return {
    clear,
    useGLTF,
    fit,
    refresh,
    useBounds,
    orbitReset,
    orbitUpdate,
    cloneSkinnedScene,
    actionPlay,
    actionStop,
    actionSetLoop,
    actionReset,
    useAnimations,
    invoke,
  };
});

// Only the loop constants are needed at runtime; everything else this module
// imports from three is type-only and erased at compile time.
vi.mock('three', () => ({ LoopOnce: 2200, LoopRepeat: 2201 }));

vi.mock('three/examples/jsm/utils/SkeletonUtils.js', () => ({
  clone: mocks.cloneSkinnedScene,
}));

vi.mock('@react-three/drei/core/useAnimations.js', () => ({
  useAnimations: mocks.useAnimations,
}));

vi.mock('@lib/tauri', () => ({
  assetUrl: (path: string) => `asset://${path}`,
  invoke: mocks.invoke,
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, frameloop }: { children: ReactNode; frameloop?: string }) => (
    <div data-testid="canvas" data-frameloop={frameloop}>
      {children}
    </div>
  ),
}));

vi.mock('@react-three/drei/core/Bounds.js', () => ({
  Bounds: ({ children }: { children: ReactNode }) => <div data-testid="bounds">{children}</div>,
  useBounds: mocks.useBounds,
}));

vi.mock('@react-three/drei/core/Center.js', () => ({
  Center: ({ children }: { children: ReactNode }) => <div data-testid="center">{children}</div>,
}));

vi.mock('@react-three/drei/core/ContactShadows.js', () => ({
  ContactShadows: () => <div data-testid="contact-shadows" />,
}));

vi.mock('@react-three/drei/core/Gltf.js', () => ({
  useGLTF: mocks.useGLTF,
}));

vi.mock('@react-three/drei/core/OrbitControls.js', () => ({
  OrbitControls: forwardRef<unknown, Record<string, unknown>>((props, ref) => {
    useImperativeHandle(
      ref,
      () => ({
        reset: mocks.orbitReset,
        update: mocks.orbitUpdate,
        object: { position: makeFakeVector3(0, 0, 6) },
        target: makeFakeVector3(0, 0, 0),
      }),
      [],
    );
    return (
      <div
        data-testid="orbit-controls"
        data-min-distance={String(props.minDistance)}
        data-max-distance={String(props.maxDistance)}
      />
    );
  }),
}));

import { AssetPreview3D } from './AssetPreview3D';

const asset: AssetRow = {
  id: 'task-1',
  taskType: 'text-to-3d-preview',
  status: 'SUCCEEDED',
  progress: 100,
  consumedCredits: 20,
  prompt: 'Low-poly farmer',
  thumbnailPath: 'C:\\assets\\task-1\\thumbnail.png',
  filePaths: JSON.stringify({ glb: 'C:\\assets\\task-1\\model.glb' }),
  texturePaths: '[]',
  notes: '',
  tags: '[]',
  createdAt: 1,
  startedAt: 2,
  finishedAt: 3,
  downloadedAt: 4,
  hasTextures: true,
  hasRig: false,
  hasAnimation: false,
  favorite: false,
  lastViewedAt: 0,
};

beforeEach(() => {
  mocks.useGLTF.mockImplementation(() => ({
    scene: { clone: vi.fn(() => ({ name: 'model' })) },
  }));
  mocks.useAnimations.mockImplementation(() => ({ actions: {} }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('3D preview rendering', () => {
  it('loads the downloaded GLB with framing, shadows, and orbit controls', () => {
    render(<AssetPreview3D asset={asset} />);

    expect(mocks.useGLTF).toHaveBeenCalledWith('asset://C:\\assets\\task-1\\model.glb');
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.getByTestId('bounds')).toBeInTheDocument();
    expect(screen.getByTestId('center')).toBeInTheDocument();
    expect(screen.getByTestId('contact-shadows')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'Interactive 3D preview of Low-poly farmer',
    );
  });

  it('clamps camera zoom between distances 2 and 15', () => {
    render(<AssetPreview3D asset={asset} />);

    expect(screen.getByTestId('orbit-controls')).toHaveAttribute('data-min-distance', '2');
    expect(screen.getByTestId('orbit-controls')).toHaveAttribute('data-max-distance', '15');
  });

  it('shows a thumbnail fallback when no GLB path is available', () => {
    render(<AssetPreview3D asset={{ ...asset, filePaths: '{}' }} />);

    expect(screen.getByText('No downloaded 3D model is available.')).toBeInTheDocument();
    expect(screen.getByAltText('Thumbnail of Low-poly farmer')).toHaveAttribute(
      'src',
      'asset://C:\\assets\\task-1\\thumbnail.png',
    );
  });

  it('contains GLB loader failures and shows the thumbnail fallback', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.useGLTF.mockImplementation(() => {
      throw new Error('corrupted GLB');
    });

    render(<AssetPreview3D asset={asset} />);

    expect(screen.getByText('3D preview unavailable.')).toBeInTheDocument();
  });

  it('clears the GLTF cache when the preview unmounts', () => {
    const view = render(<AssetPreview3D asset={asset} />);

    view.unmount();

    expect(mocks.clear).toHaveBeenCalledWith('asset://C:\\assets\\task-1\\model.glb');
  });
});

describe('3D preview viewport controls (ADR-0006, TASK-0012)', () => {
  it('renders reset-view and dolly-zoom controls', () => {
    render(<AssetPreview3D asset={asset} />);

    expect(screen.getByRole('button', { name: 'Reset view' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom in preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out preview' })).toBeInTheDocument();
  });

  it('zoom in dollies the real camera toward the target, not a CSS transform', async () => {
    const user = userEvent.setup();
    render(<AssetPreview3D asset={asset} />);

    await user.click(screen.getByRole('button', { name: 'Zoom in preview' }));

    expect(mocks.orbitUpdate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('img')).not.toHaveAttribute('style');
  });

  it('zoom out is disabled once the camera dollies out to maxDistance (15)', async () => {
    const user = userEvent.setup();
    render(<AssetPreview3D asset={asset} />);

    const zoomOut = screen.getByRole('button', { name: 'Zoom out preview' });
    for (let i = 0; i < 10; i++) {
      await user.click(zoomOut);
    }

    expect(zoomOut).toBeDisabled();
  });

  it('zoom in is disabled once the camera dollies in to minDistance (2)', async () => {
    const user = userEvent.setup();
    render(<AssetPreview3D asset={asset} />);

    const zoomIn = screen.getByRole('button', { name: 'Zoom in preview' });
    for (let i = 0; i < 10; i++) {
      await user.click(zoomIn);
    }

    expect(zoomIn).toBeDisabled();
  });

  it('reset view re-enables zoom controls after dollying to a bound', async () => {
    const user = userEvent.setup();
    render(<AssetPreview3D asset={asset} />);

    const zoomOut = screen.getByRole('button', { name: 'Zoom out preview' });
    const reset = screen.getByRole('button', { name: 'Reset view' });
    for (let i = 0; i < 10; i++) {
      await user.click(zoomOut);
    }
    expect(zoomOut).toBeDisabled();

    await user.click(reset);

    expect(zoomOut).not.toBeDisabled();
  });

  it('reset view re-fits via the Bounds API rather than replaying a stale OrbitControls snapshot', async () => {
    const user = userEvent.setup();
    render(<AssetPreview3D asset={asset} />);

    await user.click(screen.getByRole('button', { name: 'Reset view' }));

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.fit).toHaveBeenCalledTimes(1);
  });
});

describe('3D preview animation playback (ADR-0010, TASK-0027/TASK-0028)', () => {
  function withClips(names: readonly string[]) {
    const action = {
      play: mocks.actionPlay,
      stop: mocks.actionStop,
      setLoop: mocks.actionSetLoop,
      reset: mocks.actionReset,
      clampWhenFinished: false,
    };
    mocks.actionReset.mockReturnValue(action);
    mocks.useGLTF.mockImplementation(() => ({
      scene: { clone: vi.fn(() => ({ name: 'model' })) },
      animations: names.map((name) => ({ name })),
    }));
    mocks.useAnimations.mockImplementation(() => ({
      actions: Object.fromEntries(names.map((name) => [name, action])),
    }));
    return action;
  }

  it('rebinds the scene with SkeletonUtils.clone, not Object3D.clone (VP-17)', () => {
    render(<AssetPreview3D asset={asset} />);

    expect(mocks.cloneSkinnedScene).toHaveBeenCalledTimes(1);
  });

  it('hides playback controls when the GLB carries no clips', () => {
    render(<AssetPreview3D asset={asset} />);

    expect(screen.queryByRole('button', { name: 'Play animation' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Animation clip')).not.toBeInTheDocument();
  });

  it('shows playback controls when the GLB carries clips', () => {
    withClips(['Walking']);

    render(<AssetPreview3D asset={asset} />);

    expect(screen.getByRole('button', { name: 'Play animation' })).toBeInTheDocument();
  });

  it('omits the clip selector for a single clip and shows it for several', () => {
    withClips(['Walking']);
    const single = render(<AssetPreview3D asset={asset} />);
    expect(screen.queryByLabelText('Animation clip')).not.toBeInTheDocument();
    single.unmount();

    withClips(['Walking', 'Running']);
    render(<AssetPreview3D asset={asset} />);
    expect(screen.getByLabelText('Animation clip')).toBeInTheDocument();
  });

  it('holds frameloop on demand until playback starts, then switches to always (VP-16)', async () => {
    const user = userEvent.setup();
    withClips(['Walking']);

    render(<AssetPreview3D asset={asset} />);
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-frameloop', 'demand');

    await user.click(screen.getByRole('button', { name: 'Play animation' }));

    expect(screen.getByTestId('canvas')).toHaveAttribute('data-frameloop', 'always');
  });

  it('plays the active clip on demand and stops it again when paused', async () => {
    const user = userEvent.setup();
    withClips(['Walking']);

    render(<AssetPreview3D asset={asset} />);
    expect(mocks.actionPlay).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Play animation' }));
    expect(mocks.actionPlay).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Pause animation' }));
    expect(mocks.actionStop).toHaveBeenCalled();
  });

  it('defaults to looping and can be switched to a single play-through', async () => {
    const user = userEvent.setup();
    withClips(['Walking']);

    render(<AssetPreview3D asset={asset} />);
    await user.click(screen.getByRole('button', { name: 'Play animation' }));
    expect(mocks.actionSetLoop).toHaveBeenLastCalledWith(2201, Number.POSITIVE_INFINITY);

    await user.click(screen.getByRole('button', { name: 'Play clip once' }));
    expect(mocks.actionSetLoop).toHaveBeenLastCalledWith(2200, Number.POSITIVE_INFINITY);
  });

  it('drives playback locally without issuing any Tauri command (VP-14)', async () => {
    const user = userEvent.setup();
    withClips(['Walking', 'Running']);

    render(<AssetPreview3D asset={asset} />);
    await user.click(screen.getByRole('button', { name: 'Play animation' }));
    await user.selectOptions(screen.getByLabelText('Animation clip'), 'Running');
    await user.click(screen.getByRole('button', { name: 'Play clip once' }));

    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
