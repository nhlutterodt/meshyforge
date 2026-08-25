import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Ensure localStorage exists before any module (e.g. Zustand persist middleware)
// tries to access it. In some vitest+jsdom configurations, localStorage is not
// initialized until after module evaluation, causing "Cannot read properties of
// undefined (reading 'setItem')" errors in the persist middleware.
if (!globalThis.localStorage) {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const key of Object.keys(store)) delete store[key];
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
    },
    writable: true,
    configurable: true,
  });
}

// Polyfill PointerEvent for jsdom — Base UI's Switch dispatches PointerEvent
// on click, and jsdom does not provide a PointerEvent constructor by default.
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = (params.pointerId as number) ?? 0;
      this.pointerType = (params.pointerType as string) ?? '';
      this.isPrimary = (params.isPrimary as boolean) ?? false;
    }
  }
  globalThis.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

// Auto-cleanup after each test to prevent DOM leakage between tests
afterEach(() => {
  cleanup();
});
