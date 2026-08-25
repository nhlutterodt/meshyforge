import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@stores/appStore', () => ({
  useAppStore: vi.fn((selector: any) => {
    const state = {
      activeView: 'generate',
      setActiveView: vi.fn(),
      selectedAssetId: null,
      setSelectedAsset: vi.fn(),
    };
    return selector(state);
  }),
}));

import { useAppStore } from '@stores/appStore';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a keydown event listener on mount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useKeyboardShortcuts());
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    addSpy.mockRestore();
  });

  it('removes the keydown listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardShortcuts());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('navigates to gallery on Ctrl+K', () => {
    const setActiveView = vi.fn();
    // biome-ignore lint/suspicious/noExplicitAny: mock type flexibility
    vi.mocked(useAppStore).mockImplementation((selector: any) =>
      selector({
        activeView: 'generate',
        setActiveView,
        selectedAssetId: null,
        setSelectedAsset: vi.fn(),
      }),
    );

    renderHook(() => useKeyboardShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(setActiveView).toHaveBeenCalledWith('gallery');
  });

  it('navigates to gallery on Cmd+K (macOS)', () => {
    const setActiveView = vi.fn();
    // biome-ignore lint/suspicious/noExplicitAny: mock type flexibility
    vi.mocked(useAppStore).mockImplementation((selector: any) =>
      selector({
        activeView: 'generate',
        setActiveView,
        selectedAssetId: null,
        setSelectedAsset: vi.fn(),
      }),
    );

    renderHook(() => useKeyboardShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(setActiveView).toHaveBeenCalledWith('gallery');
  });

  it('clears selected asset on Delete key when an asset is selected', () => {
    const setSelectedAsset = vi.fn();
    // biome-ignore lint/suspicious/noExplicitAny: mock type flexibility
    vi.mocked(useAppStore).mockImplementation((selector: any) =>
      selector({
        activeView: 'generate',
        setActiveView: vi.fn(),
        selectedAssetId: 'task-abc',
        setSelectedAsset,
      }),
    );

    renderHook(() => useKeyboardShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(setSelectedAsset).toHaveBeenCalledWith(null);
  });

  it('does not clear selection on Delete when no asset is selected', () => {
    const setSelectedAsset = vi.fn();
    // biome-ignore lint/suspicious/noExplicitAny: mock type flexibility
    vi.mocked(useAppStore).mockImplementation((selector: any) =>
      selector({
        activeView: 'generate',
        setActiveView: vi.fn(),
        selectedAssetId: null,
        setSelectedAsset,
      }),
    );

    renderHook(() => useKeyboardShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(setSelectedAsset).not.toHaveBeenCalled();
  });

  it('does not trigger Delete when focus is in an input element', () => {
    const setSelectedAsset = vi.fn();
    // biome-ignore lint/suspicious/noExplicitAny: mock type flexibility
    vi.mocked(useAppStore).mockImplementation((selector: any) =>
      selector({
        activeView: 'generate',
        setActiveView: vi.fn(),
        selectedAssetId: 'task-abc',
        setSelectedAsset,
      }),
    );

    renderHook(() => useKeyboardShortcuts());

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'Delete',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input });
    window.dispatchEvent(event);

    expect(setSelectedAsset).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('ignores unrelated key presses', () => {
    const setActiveView = vi.fn();
    // biome-ignore lint/suspicious/noExplicitAny: mock type flexibility
    vi.mocked(useAppStore).mockImplementation((selector: any) =>
      selector({
        activeView: 'generate',
        setActiveView,
        selectedAssetId: null,
        setSelectedAsset: vi.fn(),
      }),
    );

    renderHook(() => useKeyboardShortcuts());

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(setActiveView).not.toHaveBeenCalled();
  });
});
