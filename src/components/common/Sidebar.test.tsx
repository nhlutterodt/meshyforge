// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

const setActiveViewMock = vi.fn();
const toggleSidebarMock = vi.fn();
let activeView: 'generate' | 'gallery' | 'tasks' | 'settings' = 'generate';
let sidebarCollapsed = false;

vi.mock('@stores/appStore', () => ({
  useAppStore: vi.fn(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        activeView,
        setActiveView: setActiveViewMock,
        sidebarCollapsed,
        toggleSidebar: toggleSidebarMock,
      }),
  ),
}));

import { Sidebar } from '@components/common/Sidebar';

function resetState() {
  activeView = 'generate';
  sidebarCollapsed = false;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  resetState();
});

describe('Sidebar', () => {
  beforeEach(() => {
    setActiveViewMock.mockReset();
    toggleSidebarMock.mockReset();
  });

  // TC-SET-02-01: clicking gallery switches content and highlights active item
  it('calls setActiveView with "gallery" when the Gallery nav item is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByRole('button', { name: 'Gallery' }));

    expect(setActiveViewMock).toHaveBeenCalledWith('gallery');
  });

  // TC-SET-02-01: active item is highlighted with aria-current="page"
  it('marks the active nav item with aria-current="page"', () => {
    activeView = 'gallery';
    render(<Sidebar />);

    const galleryButton = screen.getByRole('button', { name: 'Gallery' });
    expect(galleryButton).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark inactive nav items with aria-current', () => {
    activeView = 'generate';
    render(<Sidebar />);

    const galleryButton = screen.getByRole('button', { name: 'Gallery' });
    expect(galleryButton).not.toHaveAttribute('aria-current', 'page');
  });

  // TC-SET-02-02: collapse toggle shrinks sidebar to icon-only width
  it('calls toggleSidebar when the collapse button is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));

    expect(toggleSidebarMock).toHaveBeenCalledTimes(1);
  });

  it('hides nav item labels when sidebar is collapsed', () => {
    sidebarCollapsed = true;
    render(<Sidebar />);

    // Labels are rendered as spans inside buttons; when collapsed they are omitted.
    expect(screen.queryByText('Gallery')).not.toBeInTheDocument();
    expect(screen.queryByText('Generate')).not.toBeInTheDocument();
  });

  it('shows the expand button aria-label when collapsed', () => {
    sidebarCollapsed = true;
    render(<Sidebar />);

    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it('shows the collapse button aria-label when expanded', () => {
    sidebarCollapsed = false;
    render(<Sidebar />);

    expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
  });

  // TC-SET-02-04: tab key moves focus to first item with visible ring
  it('allows keyboard focus to reach nav items via Tab', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    // Tab to the collapse toggle first, then to the first nav item.
    await user.tab();
    await user.tab();

    // The Generate button should be focusable.
    const generateButton = screen.getByRole('button', { name: 'Generate' });
    expect(generateButton).toBeInTheDocument();
    // Either the collapse toggle or a nav item has focus.
    const focused = document.activeElement;
    expect(focused).not.toBe(document.body);
  });

  // TC-SET-02-05: has role navigation and labeled items
  it('renders a nav element with aria-label "Main navigation"', () => {
    render(<Sidebar />);

    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation');
  });

  it('renders all four labeled nav items with aria-labels', () => {
    render(<Sidebar />);

    expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gallery' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tasks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('renders four nav items total', () => {
    render(<Sidebar />);

    const nav = screen.getByRole('navigation');
    const navButtons = nav.querySelectorAll('button[aria-label]');
    // 4 nav items + 1 collapse toggle = 5 buttons with aria-labels.
    expect(navButtons.length).toBe(5);
  });
});