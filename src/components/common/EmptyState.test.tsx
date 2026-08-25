// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Cloud, FolderOpen, Search } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

import { EmptyState } from '@components/common/EmptyState';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EmptyState', () => {
  // TC-GAL-07-01: no API key shows add API key empty state linking to settings
  it('renders the no-API-key empty state with title, description, and an action button', () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        icon={Cloud}
        title="No API Key"
        description="Add your Meshy API key to get started."
        actionLabel="Add API Key"
        onAction={onAction}
      />,
    );

    expect(screen.getByText('No API Key')).toBeInTheDocument();
    expect(screen.getByText('Add your Meshy API key to get started.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add api key/i })).toBeInTheDocument();
  });

  it('calls onAction when the action button is clicked', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <EmptyState
        icon={Cloud}
        title="No API Key"
        description="Add your Meshy API key to get started."
        actionLabel="Add API Key"
        onAction={onAction}
      />,
    );

    await user.click(screen.getByRole('button', { name: /add api key/i }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  // TC-GAL-07-02: no assets shows go-to-generate empty state
  it('renders the no-assets empty state with a go-to-generate action', () => {
    render(
      <EmptyState
        icon={FolderOpen}
        title="No Assets Yet"
        description="Generate your first 3D model to see it here."
        actionLabel="Go to Generate"
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByText('No Assets Yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to generate/i })).toBeInTheDocument();
  });

  // TC-GAL-07-03: empty search results shows clear-filters empty state
  it('renders the empty-search-results state with a clear-filters action', () => {
    render(
      <EmptyState
        icon={Search}
        title="No Results"
        description="Try adjusting or clearing your filters."
        actionLabel="Clear Filters"
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByText('No Results')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('does not render an action button when actionLabel and onAction are omitted', () => {
    render(<EmptyState icon={Search} title="No Results" description="No matching items found." />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the icon element', () => {
    render(<EmptyState icon={Search} title="Empty" description="Nothing here." />);

    // The lucide Search icon renders as an inline svg.
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeInTheDocument();
  });
});
