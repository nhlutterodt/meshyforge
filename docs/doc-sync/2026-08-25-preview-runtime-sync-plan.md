# Preview Runtime Documentation Sync Plan

## Status

Draft for human review. This plan does not modify versioned planning documents.

## Trigger

Real Tauri runtime validation on 2026-08-25 resolved task-to-gallery and 3D-preview failures. The implementation now uses direct Drei helper modules, local-only CSP fetch origins, and two failure-containment boundaries. Existing planning examples still show the Drei root barrel import that caused the WebView failure and do not require lazy-module rejection containment.

## Evidence

- `src/components/gallery/AssetPreview3D.tsx` imports only `@react-three/drei/core/*.js` helpers.
- `src/components/gallery/AssetDetail.tsx` catches lazy preview import rejection.
- `src-tauri/tauri.conf.json` scopes model fetches to Tauri IPC and local asset origins.
- `src/lib/runtime-guardrails.test.ts` enforces these invariants.
- A real downloaded GLB rendered successfully in the Tauri WebView after the root barrel was removed.

## Proposed Update: Tech Stack Specification

File: `technical_stack_documentation.md`

Version: `1.0.0` -> `1.0.1`

Date: `2025` -> `2026-08-25`

Proposed changelog line:

> 1.0.1 (2026-08-25): Clarified antivirus-safe Drei module imports, Tauri asset fetch CSP, and lazy preview failure containment following Windows runtime validation.

### Section 7.3

Current claim:

> OrbitControls, Environment maps, and ContactShadows are required through Drei.

Proposed clarification:

> Import required Drei helpers from their typed `@react-three/drei/core/<Helper>.js` modules. Do not import the `@react-three/drei` root barrel in the lazy preview while root prebundling is excluded, because it evaluates unrelated helpers and can introduce development-only CommonJS interop failures.

### Section 7.4 import example

Current:

```typescript
import { OrbitControls, Environment, ContactShadows, useGLTF, Bounds, Center } from '@react-three/drei';
```

Proposed:

```typescript
import { Bounds } from '@react-three/drei/core/Bounds.js';
import { Center } from '@react-three/drei/core/Center.js';
import { ContactShadows } from '@react-three/drei/core/ContactShadows.js';
import { useGLTF } from '@react-three/drei/core/Gltf.js';
import { OrbitControls } from '@react-three/drei/core/OrbitControls.js';
```

Add after the lazy-loading example:

> The component that owns `React.lazy` must contain module-load rejection and render an in-panel fallback. The preview's internal error boundary handles GLTF and rendering failures only; it cannot catch failure of the preview module itself.

Add to the Tauri asset-loading note:

> Three.js loads GLB data through fetch. Tauri's local asset origins therefore belong in CSP `connect-src` as well as `img-src`; remote Meshy origins are not required in `connect-src` after files are downloaded locally.

## Proposed Update: UI/UX Guardrails

File: `UI_UX_Documentation.md`

Version: `1.0.0` -> `1.0.1`

Date: `2025` -> `2026-08-25`

Proposed changelog line:

> 1.0.1 (2026-08-25): Added enforceable preview module-import, CSP, and lazy-failure containment guardrails from Windows Tauri runtime findings.

### Section 10.1

Add:

| Rule ID | Rule | Category |
|---|---|---|
| **VP-09** | The lazy preview must import required Drei helpers from `@react-three/drei/core/<Helper>.js`; importing the `@react-three/drei` root barrel is prohibited while the package is excluded from Vite dependency prebundling. | [PERF] [BUILD] |
| **VP-10** | The component that calls `React.lazy` for the preview must catch module-load rejection and render an error state inside the viewport. The preview's internal error boundary remains responsible for GLTF, WebGL, and render failures. | [BUILD] [A11Y] |
| **VP-11** | Tauri CSP `connect-src` must allow only self, IPC, and local asset-protocol origins required by GLTFLoader. Wildcards and Meshy remote hosts are prohibited for downloaded model fetches. | [DECOUPLE] [BUILD] |

Update the 3D Viewport enforcement summary:

- Count: `8` -> `11`
- Enforcement: `Vitest runtime guardrails + component tests + Tauri smoke test + memory leak test`

Update total guardrail count:

- Total: `126` -> `129`

## Contradiction Requiring ADR

The current Tech Stack Specification and UI/UX lighting table require `<Environment preset="studio" />`, while the validated implementation uses deterministic local lights and no environment preset. This is not a documentation clarification; it is a direct policy/implementation contradiction and changes preview rendering behavior and dependency loading.

Per the repository's ADR policy, do not resolve this item through doc sync. Create an ADR comparing at least:

1. Restore the studio environment through a direct, runtime-safe helper import and confirm all environment assets work offline under CSP.
2. Adopt deterministic local lighting as the MVP standard and update the stack and UI/UX lighting requirements.

The ADR must address visual consistency, offline behavior, CSP, bundle/runtime risk, and PBR material quality.

## Review Checklist

- Confirm the direct helper modules are treated as supported project-level imports.
- Confirm VP-09 through VP-11 identifiers and guardrail counts.
- Decide whether the lighting contradiction should enter ADR review now or remain explicitly open.
- Apply approved planning-document hunks in one commit with metadata and changelog updates.
