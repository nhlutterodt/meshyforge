// SearchBar.test.tsx — Covers TC-GAL-03-01 through TC-GAL-03-03
import { fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchBar } from '@components/gallery/SearchBar';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  // TC-GAL-03-01 — typed query filters after 300ms debounce
  it('calls onSearch with the typed query after the 300ms debounce', () => {
    const onSearch = vi.fn();

    const { container } = renderWithProviders(<SearchBar onSearch={onSearch} />);

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    act(() => {
      fireEvent.change(input, { target: { value: 'dragon' } });
    });

    // Before the debounce elapses, onSearch should not have been called
    expect(onSearch).not.toHaveBeenCalledWith('dragon');

    // Advance past the 300ms debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledWith('dragon');
  });

  // TC-GAL-03-02 — empty query restores full asset list
  it('restores the full asset list by calling onSearch with empty string after debounce', () => {
    const onSearch = vi.fn();

    const { container } = renderWithProviders(<SearchBar onSearch={onSearch} />);

    const input = container.querySelector('input') as HTMLInputElement;

    // Type a query
    act(() => {
      fireEvent.change(input, { target: { value: 'castle' } });
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearch).toHaveBeenLastCalledWith('castle');

    // Clear the input
    act(() => {
      fireEvent.change(input, { target: { value: '' } });
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenLastCalledWith('');
  });

  // TC-GAL-03-03 — no matches shows "No assets match search" empty state
  // NOTE: SearchBar itself is a controlled input that delegates filtering to
  // the parent via onSearch. The empty-state text is rendered by AssetGrid,
  // not SearchBar. Here we verify that a no-match query passes through
  // onSearch so the parent can show the empty state.
  it('passes a no-match query through onSearch so the parent can show the empty state', () => {
    const onSearch = vi.fn();

    const { container } = renderWithProviders(<SearchBar onSearch={onSearch} />);

    const input = container.querySelector('input') as HTMLInputElement;

    act(() => {
      fireEvent.change(input, { target: { value: 'zzzznomatch' } });
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledWith('zzzznomatch');
  });
});