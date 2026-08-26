// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// cmdk (used by ui/command.tsx) calls scrollIntoView while navigating the
// list, and observes its list element with ResizeObserver; jsdom implements
// neither.
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

const mocks = vi.hoisted(() => ({
  useAssets: vi.fn(),
}));

vi.mock('@hooks/useAssets', () => ({
  useAssets: mocks.useAssets,
}));

import type { AssetRow } from '@lib/meshy-types';
import { AssetTaskPicker, hasDownloadedModel, isCompletedRig } from './AssetTaskPicker';

function makeAsset(overrides: Partial<AssetRow> = {}): AssetRow {
  return {
    id: '018a210d-8ba4-705c-b111-1f1776f7f578',
    taskType: 'text-to-3d-preview',
    status: 'SUCCEEDED',
    progress: 100,
    consumedCredits: 5,
    prompt: 'a red teapot',
    filePaths: '{"glb":"assets/018a210d/model.glb"}',
    texturePaths: '{}',
    notes: '',
    tags: '[]',
    createdAt: 0,
    startedAt: 0,
    finishedAt: 0,
    downloadedAt: 0,
    hasTextures: false,
    hasRig: false,
    hasAnimation: false,
    favorite: false,
    lastViewedAt: 0,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AssetTaskPicker', () => {
  it('renders the manual fallback input with the given label, and typing calls onChange', async () => {
    mocks.useAssets.mockReturnValue({ data: [] });
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AssetTaskPicker
        id="test-task-id"
        label="Input Task ID"
        value=""
        onChange={onChange}
        filter={hasDownloadedModel}
      />,
    );

    await user.type(screen.getByLabelText('Input Task ID'), 'x');
    expect(onChange).toHaveBeenCalledWith('x');
  });

  it('does not render a picker list when no assets match the filter', () => {
    mocks.useAssets.mockReturnValue({ data: [makeAsset({ status: 'PENDING' })] });

    render(
      <AssetTaskPicker
        id="test-task-id"
        label="Input Task ID"
        value=""
        onChange={vi.fn()}
        filter={hasDownloadedModel}
      />,
    );

    expect(screen.queryByPlaceholderText(/search your assets/i)).not.toBeInTheDocument();
  });

  it('shows eligible assets in the picker and selecting one calls onChange with its task ID', async () => {
    const asset = makeAsset();
    mocks.useAssets.mockReturnValue({ data: [asset] });
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AssetTaskPicker
        id="test-task-id"
        label="Input Task ID"
        value=""
        onChange={onChange}
        filter={hasDownloadedModel}
      />,
    );

    expect(screen.getByText('a red teapot')).toBeInTheDocument();
    await user.click(screen.getByText('a red teapot'));
    expect(onChange).toHaveBeenCalledWith(asset.id);
  });

  it('excludes assets that fail the eligibility filter', () => {
    mocks.useAssets.mockReturnValue({
      data: [makeAsset({ prompt: 'not downloaded yet', filePaths: '{}' })],
    });

    render(
      <AssetTaskPicker
        id="test-task-id"
        label="Input Task ID"
        value=""
        onChange={vi.fn()}
        filter={hasDownloadedModel}
      />,
    );

    expect(screen.queryByText('not downloaded yet')).not.toBeInTheDocument();
  });
});

describe('hasDownloadedModel', () => {
  it('requires SUCCEEDED status and at least one downloaded file', () => {
    expect(hasDownloadedModel(makeAsset())).toBe(true);
    expect(hasDownloadedModel(makeAsset({ status: 'PENDING' }))).toBe(false);
    expect(hasDownloadedModel(makeAsset({ filePaths: '{}' }))).toBe(false);
    expect(hasDownloadedModel(makeAsset({ filePaths: 'not json' }))).toBe(false);
  });
});

describe('isCompletedRig', () => {
  it('requires taskType "rig" and SUCCEEDED status', () => {
    expect(isCompletedRig(makeAsset({ taskType: 'rig' }))).toBe(true);
    expect(isCompletedRig(makeAsset({ taskType: 'rig', status: 'PENDING' }))).toBe(false);
    expect(isCompletedRig(makeAsset({ taskType: 'text-to-3d-preview' }))).toBe(false);
  });
});
