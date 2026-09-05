// src/hooks/useViewportControls.ts
// Source: ADR-0006 — local-first, client-side viewport control registry (VP-13)

import { useCallback, useRef, useState } from 'react';

// Must match the camera's real dolly-zoom bounds (OrbitControls minDistance/
// maxDistance) — a single source of truth shared with the component so the
// zoom buttons and scroll-wheel/pinch zoom clamp to the same real distance
// instead of drifting into two disconnected "zoom" concepts (TASK-0012).
const MIN_DISTANCE = 2;
const MAX_DISTANCE = 15;
const ZOOM_IN_FACTOR = 0.8;
const ZOOM_OUT_FACTOR = 1.25;

interface Vector3Like {
  x: number;
  y: number;
  z: number;
  set: (x: number, y: number, z: number) => void;
}

interface OrbitControlsLike {
  reset: () => void;
  update: () => void;
  object: { position: Vector3Like };
  target: Vector3Like;
}

// Minimal shape of drei's BoundsApi we rely on — re-fitting is the source of
// truth for "reset view" (it re-derives the framing from the live model's
// bounding box), unlike OrbitControls.reset() which only replays the camera
// pose captured at construction time, before the model has even loaded.
interface BoundsApiLike {
  refresh: () => { fit: () => unknown };
}

export function useViewportControls() {
  const [distance, setDistance] = useState<number | null>(null);
  const controlsRef = useRef<OrbitControlsLike | null>(null);
  const boundsApiRef = useRef<BoundsApiLike | null>(null);

  // Stable identity across renders — an inline ref callback would get a new
  // identity every render, causing needless detach/reattach churn on every
  // state change (this hook updates `distance` on every dolly).
  const setControlsRef = useCallback((instance: OrbitControlsLike | null) => {
    controlsRef.current = instance;
  }, []);

  // Moves the camera along the target->camera vector by `factor`, clamped to
  // the real OrbitControls distance bounds — a genuine camera dolly, not a
  // CSS scale of the rendered canvas (which was blurry on zoom-in and
  // disconnected from the existing scroll-wheel/pinch zoom).
  const dolly = useCallback((factor: number) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const { position } = controls.object;
    const { target } = controls;
    const dx = position.x - target.x;
    const dy = position.y - target.y;
    const dz = position.z - target.z;
    const currentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (currentDistance === 0) return;

    const nextDistance = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, currentDistance * factor));
    const scale = nextDistance / currentDistance;
    position.set(target.x + dx * scale, target.y + dy * scale, target.z + dz * scale);
    controls.update();
    setDistance(nextDistance);
  }, []);

  const zoomIn = useCallback(() => dolly(ZOOM_IN_FACTOR), [dolly]);
  const zoomOut = useCallback(() => dolly(ZOOM_OUT_FACTOR), [dolly]);

  const resetView = useCallback(() => {
    if (boundsApiRef.current) {
      boundsApiRef.current.refresh().fit();
    } else {
      // Fallback only — see BoundsApiLike comment above for why this isn't
      // the primary path.
      controlsRef.current?.reset();
    }
    // The re-fit distance is animated and model-dependent — rather than
    // guess it, mark distance unknown so the zoom buttons re-enable until
    // the user dollies again.
    setDistance(null);
  }, []);

  return {
    distance,
    zoomIn,
    zoomOut,
    resetView,
    controlsRef,
    setControlsRef,
    boundsApiRef,
    minDistance: MIN_DISTANCE,
    maxDistance: MAX_DISTANCE,
  };
}
