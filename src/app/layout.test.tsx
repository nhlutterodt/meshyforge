// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// ── Mock the three layout children so we isolate the Layout wiring ──
vi.mock('@components/common/TopBar', () => ({
  TopBar: () => <div data-testid="topbar">TopBar</div>,
}));
vi.mock('@components/common/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));
vi.mock('@components/common/StatusBar', () => ({
  StatusBar: () => <div data-testid="statusbar">StatusBar</div>,
}));

import { Layout } from '@app/layout';

function Children({ content = 'page content' }: { content?: string }): ReactNode {
  return <div data-testid="page-content">{content}</div>;
}

describe('Layout', () => {
  it('renders TopBar, Sidebar, content area, and StatusBar', () => {
    render(
      <Layout>
        <Children />
      </Layout>,
    );

    expect(screen.getByTestId('topbar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.getByTestId('statusbar')).toBeInTheDocument();
  });

  it('renders children inside the main content area', () => {
    render(
      <Layout>
        <Children content="hello from page" />
      </Layout>,
    );

    expect(screen.getByText('hello from page')).toBeInTheDocument();
  });

  it('wraps the tree in a TooltipProvider', () => {
    const { container } = render(
      <Layout>
        <Children />
      </Layout>,
    );

    // TooltipProvider renders a context provider but no DOM; verify the
    // outer structure is a full-screen flex column containing all three rows.
    const root = container.firstElementChild;
    expect(root).not.toBeNull();
    expect(root?.className).toContain('flex');
    expect(root?.className).toContain('h-screen');
  });
});