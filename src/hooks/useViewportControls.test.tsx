// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useViewportControls } from './useViewportControls';

interface FakeVector3 {
  x: number;
  y: number;
  z: number;
  set: (x: number, y: number, z: number) => void;
}

function makeVector3(x: number, y: number, z: number): FakeVector3 {
  const v: FakeVector3 = {
    x,
    y,
    z,
    set(nx, ny, nz) {
      v.x = nx;
      v.y = ny;
      v.z = nz;
    },
  };
  return v;
}

function makeControls(distanceFromTarget: number) {
  return {
    reset: vi.fn(),
    update: vi.fn(),
    object: { position: makeVector3(0, 0, distanceFromTarget) },
    target: makeVector3(0, 0, 0),
  };
}

describe('useViewportControls', () => {
  it('starts with an unknown distance (buttons enabled) before any dolly', () => {
    const { result } = renderHook(() => useViewportControls());
    expect(result.current.distance).toBeNull();
  });

  it('zoomIn dollies the camera toward the target and clamps to minDistance', () => {
    const { result } = renderHook(() => useViewportControls());
    const controls = makeControls(10);

    act(() => {
      result.current.controlsRef.current = controls;
      result.current.zoomIn();
    });

    expect(result.current.distance).toBeCloseTo(8);
    expect(controls.object.position.z).toBeCloseTo(8);
    expect(controls.update).toHaveBeenCalledTimes(1);
  });

  it('zoomOut dollies the camera away from the target and clamps to maxDistance', () => {
    const { result } = renderHook(() => useViewportControls());
    const controls = makeControls(10);

    act(() => {
      result.current.controlsRef.current = controls;
      result.current.zoomOut();
    });

    expect(result.current.distance).toBeCloseTo(12.5);
    expect(controls.object.position.z).toBeCloseTo(12.5);
  });

  it('zoomIn clamps at minDistance (2) and further clicks are no-ops on distance', () => {
    const { result } = renderHook(() => useViewportControls());
    const controls = makeControls(3);

    act(() => {
      result.current.controlsRef.current = controls;
      result.current.zoomIn();
      result.current.zoomIn();
      result.current.zoomIn();
    });

    expect(result.current.distance).toBe(result.current.minDistance);
  });

  it('zoomOut clamps at maxDistance (15)', () => {
    const { result } = renderHook(() => useViewportControls());
    const controls = makeControls(14);

    act(() => {
      result.current.controlsRef.current = controls;
      result.current.zoomOut();
      result.current.zoomOut();
      result.current.zoomOut();
    });

    expect(result.current.distance).toBe(result.current.maxDistance);
  });

  it('zoomIn/zoomOut are safe no-ops before any OrbitControls instance is registered', () => {
    const { result } = renderHook(() => useViewportControls());

    expect(() => act(() => result.current.zoomIn())).not.toThrow();
    expect(result.current.distance).toBeNull();
  });

  it('dolly is a safe no-op when the camera is already at the target (zero distance)', () => {
    const { result } = renderHook(() => useViewportControls());
    const controls = makeControls(0);

    act(() => {
      result.current.controlsRef.current = controls;
      result.current.zoomIn();
    });

    expect(result.current.distance).toBeNull();
    expect(controls.update).not.toHaveBeenCalled();
  });

  it('resetView prefers the Bounds refit API over OrbitControls.reset() when both are registered', () => {
    const { result } = renderHook(() => useViewportControls());
    const controls = makeControls(10);
    const fit = vi.fn();
    const refresh = vi.fn(() => ({ fit }));

    act(() => {
      result.current.controlsRef.current = controls;
      result.current.boundsApiRef.current = { refresh };
      result.current.zoomIn();
    });
    expect(result.current.distance).toBeCloseTo(8);

    act(() => result.current.resetView());

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fit).toHaveBeenCalledTimes(1);
    expect(controls.reset).not.toHaveBeenCalled();
    expect(result.current.distance).toBeNull();
  });

  it('resetView falls back to OrbitControls.reset() when no Bounds API is registered', () => {
    const { result } = renderHook(() => useViewportControls());
    const controls = makeControls(10);

    act(() => {
      result.current.controlsRef.current = controls;
      result.current.zoomIn();
    });

    act(() => result.current.resetView());

    expect(controls.reset).toHaveBeenCalledTimes(1);
    expect(result.current.distance).toBeNull();
  });

  it('resetView is safe to call before any OrbitControls or Bounds API is registered', () => {
    const { result } = renderHook(() => useViewportControls());

    expect(() => act(() => result.current.resetView())).not.toThrow();
    expect(result.current.distance).toBeNull();
  });
});
