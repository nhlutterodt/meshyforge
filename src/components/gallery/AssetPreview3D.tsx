// src/components/gallery/AssetPreview3D.tsx
// Source: FRD FR-PREV-01–04, TSS §7.4
// Lazy-loaded for code-splitting (three-vendor chunk)

import { ErrorBoundary } from '@components/common/ErrorBoundary';
import { Button } from '@components/ui/button';
import { useViewportControls } from '@hooks/useViewportControls';
import type { AssetRow } from '@lib/meshy-types';
import { assetUrl } from '@lib/tauri';
import { Bounds, useBounds } from '@react-three/drei/core/Bounds.js';
import { Center } from '@react-three/drei/core/Center.js';
import { ContactShadows } from '@react-three/drei/core/ContactShadows.js';
import { useGLTF } from '@react-three/drei/core/Gltf.js';
import { OrbitControls } from '@react-three/drei/core/OrbitControls.js';
import { Canvas } from '@react-three/fiber';
import { type MutableRefObject, Suspense, memo, useEffect, useMemo } from 'react';

interface AssetPreview3DProps {
  readonly asset: AssetRow;
}

interface ModelProps {
  readonly glbPath: string;
}

// Bounds exposes its imperative refit/reset API only via context (useBounds),
// not a component ref — this bridges it out to the reset-view control.
function BoundsApiCapture({
  apiRef,
}: {
  apiRef: MutableRefObject<{ refresh: () => { fit: () => unknown } } | null>;
}) {
  const api = useBounds();

  useEffect(() => {
    apiRef.current = api;
    return () => {
      apiRef.current = null;
    };
  }, [api, apiRef]);

  return null;
}

function Model({ glbPath }: ModelProps) {
  const { scene } = useGLTF(glbPath);
  const model = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    return () => {
      useGLTF.clear(glbPath);
    };
  }, [glbPath]);

  return <primitive object={model} />;
}

function PreviewFallback({ asset, message }: { asset: AssetRow; message: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {asset.thumbnailPath && (
        <img
          src={assetUrl(asset.thumbnailPath)}
          alt={`Thumbnail of ${asset.prompt ?? asset.taskType}`}
          className="absolute inset-0 h-full w-full object-contain opacity-40"
        />
      )}
      <p className="relative rounded bg-bg-primary/80 px-3 py-2 text-sm text-text-secondary">
        {message}
      </p>
    </div>
  );
}

function AssetPreview3DBase({ asset }: AssetPreview3DProps) {
  const {
    distance,
    zoomIn,
    zoomOut,
    resetView,
    setControlsRef,
    boundsApiRef,
    minDistance,
    maxDistance,
  } = useViewportControls();

  // Parse file_paths to find GLB path
  let glbPath: string | null = null;
  try {
    const paths = JSON.parse(asset.filePaths) as Record<string, string>;
    glbPath = paths.glb ?? null;
  } catch {
    // No file paths
  }

  if (!glbPath) {
    return <PreviewFallback asset={asset} message="No downloaded 3D model is available." />;
  }

  const modelUrl = assetUrl(glbPath);

  return (
    <ErrorBoundary
      key={modelUrl}
      fallback={<PreviewFallback asset={asset} message="3D preview unavailable." />}
    >
      <div className="relative h-full w-full overflow-hidden bg-[#171717]">
        <div
          className="h-full w-full"
          role="img"
          aria-label={`Interactive 3D preview of ${asset.prompt ?? asset.taskType}`}
        >
          <Canvas
            camera={{ position: [3, 2, 5], fov: 45 }}
            dpr={[1, 2]}
            frameloop="demand"
            gl={{ antialias: true, alpha: false }}
            shadows
          >
            <color attach="background" args={['#171717']} />
            <ambientLight intensity={1.2} />
            <directionalLight position={[5, 8, 5]} intensity={2.5} castShadow />
            <Suspense fallback={null}>
              <Bounds fit clip observe margin={1.2}>
                <BoundsApiCapture apiRef={boundsApiRef} />
                <Center>
                  <Model glbPath={modelUrl} />
                </Center>
              </Bounds>
              <ContactShadows position={[0, -1.2, 0]} opacity={0.35} scale={10} blur={2} far={4} />
            </Suspense>
            <OrbitControls
              ref={setControlsRef}
              makeDefault
              enableDamping
              dampingFactor={0.05}
              enablePan
              enableZoom
              enableRotate
              minDistance={minDistance}
              maxDistance={maxDistance}
            />
          </Canvas>
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-bg-primary/80 p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={zoomOut}
            disabled={distance !== null && distance >= maxDistance}
            aria-label="Zoom out preview"
          >
            −
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetView}
            aria-label="Reset view"
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={zoomIn}
            disabled={distance !== null && distance <= minDistance}
            aria-label="Zoom in preview"
          >
            +
          </Button>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export const AssetPreview3D = memo(AssetPreview3DBase);
