// src/hooks/useViewportControls.ts
// Source: ADR-0006 — local-first, client-side viewport control registry (VP-13)
// Source: ADR-0010 — animation playback is a viewport control (VP-15, VP-16)

import { useCallback, useRef, useState } from 'react';

/** How the active clip repeats. Never inferred — see ADR-0010 decision rule 6. */
export type LoopMode = 'repeat' | 'once';

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
  const [clipNames, setClipNames] = useState<readonly string[]>([]);
  const clipNamesRef = useRef<readonly string[]>([]);
  const [activeClip, setActiveClip] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopMode, setLoopMode] = useState<LoopMode>('repeat');

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

  // Called from inside the Canvas once the GLTF resolves. Compares by value
  // against a ref rather than inside a setState updater: updaters must stay
  // pure, and the caller passes a freshly-mapped array on every load, so an
  // identity-only check would re-enter this forever.
  const registerClips = useCallback((names: readonly string[]) => {
    const previous = clipNamesRef.current;
    if (previous.length === names.length && previous.every((n, i) => n === names[i])) return;

    clipNamesRef.current = [...names];
    setClipNames(clipNamesRef.current);
    setActiveClip(names[0] ?? null);
    setIsPlaying(false);
  }, []);

  const selectClip = useCallback((name: string) => {
    setActiveClip(name);
  }, []);

  const togglePlayback = useCallback(() => {
    setIsPlaying((playing) => !playing);
  }, []);

  const toggleLoopMode = useCallback(() => {
    setLoopMode((mode) => (mode === 'repeat' ? 'once' : 'repeat'));
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
    clipNames,
    activeClip,
    isPlaying,
    loopMode,
    hasClips: clipNames.length > 0,
    registerClips,
    selectClip,
    togglePlayback,
    toggleLoopMode,
    // VP-16: the single derived expression for every continuous-render driver.
    // Pointer interaction is not a term here because drei's OrbitControls
    // already calls invalidate() on change, which drives demand-mode frames.
    frameloop: isPlaying ? ('always' as const) : ('demand' as const),
  };
}
