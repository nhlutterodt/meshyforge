// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import type { AssetRow } from '@lib/meshy-types';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const clear = vi.fn();
  const useGLTF = Object.assign(
    vi.fn(() => ({ scene: { clone: vi.fn(() => ({ name: 'model' })) } })),
    { clear },
  );

  return { clear, useGLTF };
});

vi.mock('@lib/tauri', () => ({
  assetUrl: (path: string) => `asset://${path}`,
}));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: ReactNode }) => <div data-testid="canvas">{children}</div>,
}));

vi.mock('@react-three/drei/core/Bounds.js', () => ({
  Bounds: ({ children }: { children: ReactNode }) => <div data-testid="bounds">{children}</div>,
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
  OrbitControls: (props: Record<string, unknown>) => (
    <div
      data-testid="orbit-controls"
      data-min-distance={String(props.minDistance)}
      data-max-distance={String(props.maxDistance)}
    />
  ),
}));

import { AssetPreview3D } from './AssetPreview3D';

const asset: AssetRow = {
  id: 'task-1',
  meshyType: 'text-to-3d-preview',
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
