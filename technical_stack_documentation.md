# Tech Stack Specification — MeshyForge

## Document Metadata
| Field | Value |
|---|---|
| **Project** | MeshyForge — AI 3D Asset Studio |
| **Document Type** | Tech Stack Specification |
| **Version** | 1.0.0 |
| **Date** | 2025 |
| **Status** | Approved for Implementation |

---

## Table of Contents
1. [Stack Overview](#1-stack-overview)
2. [Desktop Runtime: Tauri 2.x](#2-desktop-runtime-tauri-2x)
3. [Frontend Framework: React 19 + TypeScript](#3-frontend-framework-react-19--typescript)
4. [Build Tooling: Vite 6](#4-build-tooling-vite-6)
5. [Styling: Tailwind CSS 4 + shadcn/ui](#5-styling-tailwind-css-4--shadcnui)
6. [State Management: Zustand + TanStack Query](#6-state-management-zustand--tanstack-query)
7. [3D Rendering: Three.js Ecosystem](#7-3d-rendering-threejs-ecosystem)
8. [Backend Language: Rust](#8-backend-language-rust)
9. [HTTP Client: reqwest](#9-http-client-reqwest)
10. [Database: SQLite via rusqlite](#10-database-sqlite-via-rusqlite)
11. [Secret Storage: OS Keychain via keyring](#11-secret-storage-os-keychain-via-keyring)
12. [Tauri Plugins](#12-tauri-plugins)
13. [Icons: Lucide React](#13-icons-lucide-react)
14. [Testing Stack](#14-testing-stack)
15. [Code Quality & Formatting](#15-code-quality--formatting)
16. [CI/CD Tooling](#16-cicd-tooling)
17. [Dependency Manifest](#17-dependency-manifest)
18. [Alternatives Considered](#18-alternatives-considered)
19. [Version Pinning Strategy](#19-version-pinning-strategy)
20. [Cross-Platform Compatibility Matrix](#20-cross-platform-compatibility-matrix)

---

## 1. Stack Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                        │
│  React 19 · TypeScript 5.7 · Vite 6 · Tailwind CSS 4         │
│  shadcn/ui · Lucide Icons · Zustand · TanStack Query          │
│  @react-three/fiber · @react-three/drei · three.js            │
├──────────────────────────────────────────────────────────────┤
│                     TAURI BRIDGE LAYER                        │
│  Tauri 2.x IPC · Tauri Plugins (dialog, notification, shell) │
├──────────────────────────────────────────────────────────────┤
│                      RUST BACKEND                            │
│  reqwest (HTTP) · rusqlite (SQLite) · keyring (Keychain)     │
│  serde/serde_json · tokio · futures-util · thiserror          │
├──────────────────────────────────────────────────────────────┤
│                      NATIVE OS LAYER                         │
│  WebKit (macOS) · WebView2 (Windows) · WebKitGTK (Linux)     │
│  Keychain (macOS) · Credential Manager (Windows) ·           │
│  Secret Service (Linux)                                      │
└──────────────────────────────────────────────────────────────┘
```

### 1.1 Design Principles

| Principle | Application |
|---|---|
| **Minimal dependencies** | Each dependency must justify its bundle size and maintenance burden. No transitive dependency left uninspected. |
| **Type safety end-to-end** | TypeScript on the frontend, Rust's type system on the backend. Tauri command signatures are the contract boundary. |
| **Security by default** | API keys never touch the webview. All HTTP calls originate from Rust. No CORS, no credential exposure. |
| **Offline-first** | The app is fully functional without network access for browsing, previewing, and exporting previously downloaded assets. Only generation requires connectivity. |
| **Native feel** | Use OS-native webview, OS-native file dialogs, OS-native notifications. No Chromium bundle. |
| **Small bundle** | Target ≤15 MB installer. Tauri's Rust binary + webview frontend should be far smaller than Electron equivalents. |

---

## 2. Desktop Runtime: Tauri 2.x

### 2.1 Selection

| Field | Value |
|---|---|
| **Package** | `tauri` (Rust crate) + `@tauri-apps/cli` (npm) |
| **Version** | `^2` (latest 2.x stable) |
| **License** | Apache 2.0 / MIT |

### 2.2 Why Tauri 2.x

| Factor | Tauri 2.x | Electron | Neutralino.js |
|---|---|---|---|
| Bundle size | ~10–15 MB | ~150–200 MB | ~5–10 MB |
| Memory footprint | ~80–120 MB | ~200–400 MB | ~60–100 MB |
| Backend language | Rust | Node.js | C++ |
| Webview | OS-native (WebKit/WebView2/WebKitGTK) | Bundled Chromium | OS-native |
| Security model | Whitelist IPC commands, no direct network from webview | Full Node.js access in renderer (unless sandboxed) | Limited |
| IPC | Typed commands via `invoke()` | `ipcRenderer` / contextBridge | Custom WebSocket |
| File system access | Rust-side, explicit permission scopes | Full Node.js `fs` | Limited |
| Plugin ecosystem | Growing (dialog, notification, shell, fs, stronghold) | Mature (electron-builder, auto-updater, etc.) | Minimal |
| Maturity | Stable (2.0 released 2024) | Very mature (since 2013) | Experimental |
| Auto-update | `tauri-plugin-updater` | `electron-updater` | None built-in |

**Decision:** Tauri 2.x. The security model (Rust backend handles all network and file I/O, webview is sandboxed) aligns with the requirement to protect API keys. The small bundle size and native webview are significant advantages for a personal-use desktop tool. The Rust backend also gives us strong typing and memory safety for the HTTP client and database layer.

### 2.3 Tauri Configuration

```json
// src-tauri/tauri.conf.json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "MeshyForge",
  "version": "1.0.0",
  "identifier": "com.meshyforge.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "MeshyForge",
        "width": 1400,
        "height": 900,
        "minWidth": 1024,
        "minHeight": 700,
        "resizable": true,
        "fullscreen": false,
        "center": true,
        "decorations": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' asset: https://asset.localhost data:; script-src 'self'; style-src 'self' 'unsafe-inline'",
      "assetProtocol": {
        "enable": true,
        "scope": ["$APPDATA/assets/**"]
      }
    }
  },
  "bundle": {
    "active": true,
    "targets": ["dmg", "msi", "deb", "appimage"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "macOS": {
      "minimumSystemVersion": "11.0"
    },
    "windows": {
      "webviewInstallMode": {
        "type": "downloadBootstrapper"
      }
    }
  },
  "plugins": {
    "dialog": {},
    "notification": {},
    "shell": {
      "open": true
    }
  }
}
```

### 2.4 Tauri Capabilities (Permission Scopes)

```json
// src-tauri/capabilities/default.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default permissions for MeshyForge",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "notification:default",
    "notification:allow-notify",
    "shell:allow-open",
    "core:window:allow-set-title",
    "core:event:default"
  ]
}
```

### 2.5 IPC Communication Pattern

```
Frontend (React)                        Backend (Rust)
     │                                       │
     │  invoke('create_text_to_3d', {body})  │
     ├──────────────────────────────────────►│
     │                                       │── reqwest POST to api.meshy.ai
     │                                       │◄── response from Meshy
     │  Promise<result>                      │
     │◄──────────────────────────────────────┤
     │                                       │
     │  listen('task-progress', callback)   │
     │◄─────────┤  app.emit('task-progress') │
     │         │                             │
     │  listen('task-complete', callback)   │
     │◄─────────┤  app.emit('task-complete') │
```

---

## 3. Frontend Framework: React 19 + TypeScript

### 3.1 Selection

| Field | Value |
|---|---|
| **React** | `^19.0.0` |
| **TypeScript** | `^5.7.0` |
| **License** | MIT (React), Apache 2.0 (TypeScript) |

### 3.2 Why React 19

| Factor | Rationale |
|---|---|
| **Concurrent rendering** | React 19's concurrent features improve perceived performance during long-running task polling and 3D rendering. |
| **`use()` hook** | Simplifies async data access in components without manual `useEffect` + state management. |
| **Actions & form states** | Built-in form action handling reduces boilerplate for generation forms. |
| **Ecosystem** | Largest component ecosystem. shadcn/ui, R3F, TanStack Query all have first-class React support. |
| **TypeScript integration** | React 19 ships improved type definitions. `@types/react` and `@types/react-dom` are maintained by the React team. |
| **Tauri compatibility** | Tauri's `@tauri-apps/api` package works with any frontend framework; React is the most documented. |

### 3.3 TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@lib/*": ["./src/lib/*"],
      "@hooks/*": ["./src/hooks/*"],
      "@stores/*": ["./src/stores/*"]
    }
  },
  "include": ["src", "src-tauri/src/types.ts"],
  "exclude": ["node_modules", "dist", "src-tauri/target"]
}
```

### 3.4 Strict TypeScript Patterns

```typescript
// No `any` allowed. Use `unknown` + type narrowing.
// No non-null assertions (`!`) without justification.
// All API response types are explicitly defined (see meshy-types.ts).
// All Tauri invoke calls are wrapped in typed functions.

// src/lib/tauri.ts
export function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return tauriInvoke<T>(command, args);
}

// Usage — type-safe, no `any`:
const result = await invoke<TaskCreateResponse>('create_text_to_3d', { body });
//    ^? TaskCreateResponse
```

---

## 4. Build Tooling: Vite 6

### 4.1 Selection

| Field | Value |
|---|---|
| **Vite** | `^6.0.0` |
| **@vitejs/plugin-react** | `^4.3.0` |
| **License** | MIT |

### 4.2 Why Vite 6

| Factor | Rationale |
|---|---|
| **Tauri integration** | Tauri's official docs and templates use Vite. `beforeDevCommand` and `beforeBuildCommand` in `tauri.conf.json` hook directly into Vite. |
| **HMR speed** | Sub-100ms hot module replacement during development. Critical for iterating on UI components. |
| **ESBuild transforms** | TypeScript and JSX transpilation via ESBuild is orders of magnitude faster than `tsc`. |
| **Rollup production build** | Tree-shaking, code-splitting, and CSS minification are handled by Rollup under the hood. |
| **Plugin ecosystem** | `@vitejs/plugin-react` provides Fast Refresh. Tailwind CSS 4 has a first-party Vite plugin. |
| **No Babel** | Vite uses ESBuild, eliminating the Babel dependency chain. Smaller `node_modules`, faster builds. |

### 4.3 Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@stores': path.resolve(__dirname, './src/stores'),
    },
  },
  // Tauri expects a fixed port for dev server
  server: {
    port: 1420,
    strictPort: true,
    // Tauri dev server proxy not needed — Rust handles all HTTP
  },
  // Tauri uses CSP; inline styles must be allowed
  css: {
    devSourcemap: true,
  },
  build: {
    target: 'esnext',     // Tauri webview supports modern JS
    sourcemap: false,     // Disable for production (smaller bundle)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },
});
```

---

## 5. Styling: Tailwind CSS 4 + shadcn/ui

### 5.1 Selection

| Field | Value |
|---|---|
| **Tailwind CSS** | `^4.0.0` |
| **@tailwindcss/vite** | `^4.0.0` |
| **shadcn/ui** | Latest (component copy-paste, not a package) |
| **clsx** | `^2.1.1` |
| **tailwind-merge** | `^2.5.0` |
| **License** | MIT (all) |

### 5.2 Why Tailwind CSS 4

| Factor | Rationale |
|---|---|
| **No config file** | Tailwind 4 uses CSS-first configuration via `@theme` directive. No `tailwind.config.js` needed for basic setups. |
| **Vite plugin** | First-party `@tailwindcss/vite` plugin replaces the PostCSS pipeline. Zero-config integration with Vite. |
| **Performance** | Tailwind 4's new engine is written in Rust (Oxide). Build times are significantly faster than v3. |
| **Dark mode** | Built-in `dark:` variant. MeshyForge is dark-only for MVP, but the variant is available for future light mode. |
| **Utility-first** | No runtime CSS-in-JS overhead. All styles are generated at build time. Smaller runtime footprint. |
| **Consistency** | Design tokens (spacing, colors, radii) are defined once in CSS and used everywhere. |

### 5.3 Why shadcn/ui

| Factor | Rationale |
|---|---|
| **Not a library** | Components are copied into the project, not imported from `node_modules`. Full ownership of the code. |
| **No version lock-in** | When shadcn/ui updates a component, you manually pull the changes. No surprise breaking updates. |
| **Radix UI primitives** | shadcn/ui components are built on Radix UI — accessible, keyboard-navigable, ARIA-compliant. |
| **Tailwind-native** | Components use Tailwind classes directly. No separate styling system to learn. |
| **Tree-shakeable** | Only the components you copy are included. No unused component bloat. |
| **Customizable** | Every component is a source file in your project. Modify freely without ejecting or overriding. |

### 5.4 CSS Configuration

```css
/* src/styles/globals.css */
@import "tailwindcss";

@theme {
  /* ── Colors ─────────────────────────────────── */
  --color-bg-primary: #0a0a0b;
  --color-bg-secondary: #18181b;
  --color-bg-tertiary: #27272a;
  --color-border: #3f3f46;
  --color-text-primary: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-text-muted: #71717a;
  --color-accent: #6366f1;
  --color-accent-hover: #4f46e5;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;

  /* ── Radii ───────────────────────────────────── */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* ── Fonts ───────────────────────────────────── */
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "SF Mono", Menlo, monospace;
}

/* ── Base styles ─────────────────────────────────── */
html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;  /* Prevent body scroll — app manages its own scroll areas */
}

/* ── Scrollbar styling (webkit) ──────────────────── */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--color-bg-primary);
}
::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}

/* ── Tauri asset protocol for local file images ────── */
img[src^="asset://"] {
  /* Local asset images from Tauri's asset protocol */
  max-width: 100%;
  height: auto;
}
```

### 5.5 shadcn/ui Components to Include

| Component | Usage in MeshyForge |
|---|---|
| `Button` | Generate, export, delete, save preset actions |
| `Input` | Prompt text, polycount, height meters, API key |
| `Textarea` | Notes, long prompts |
| `Select` | AI model, pose mode, topology, texture resolution |
| `Slider` | Polycount, smoothing, relief height (Creative Lab) |
| `Switch` | Remesh, PBR, remove lighting, auto-size, moderation |
| `Checkbox` | Target formats (GLB, FBX, OBJ, STL, USDZ, 3MF) |
| `Tabs` | Generate sub-panels (Text→3D, Image→3D, etc.) |
| `Dialog` | Export dialog, settings, asset detail |
| `DropdownMenu` | Context menus on asset cards, export format selection |
| `Toast` (Sonner) | Task creation, errors, completions |
| `Tooltip` | Parameter help, credit cost display |
| `Badge` | Tags, task status, asset type |
| `Card` | Asset gallery cards, task monitor cards |
| `Progress` | Task progress bars |
| `Separator` | Section dividers in panels |
| `ScrollArea` | Gallery grid, task list, settings |
| `Skeleton` | Loading states for gallery, task polling |
| `Command` | Search palette (Ctrl+K), animation library search |

### 5.6 Utility Functions

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with conflict resolution.
 * Usage: cn("px-2 py-1", condition && "px-4", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format credit count with locale.
 */
export function formatCredits(credits: number): string {
  return new Intl.NumberFormat('en-US').format(credits);
}

/**
 * Format Unix millisecond timestamp to relative time.
 */
export function formatRelativeTime(ms: number): string {
  if (ms === 0) return '—';
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Format file size in human-readable units.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
```

---

## 6. State Management: Zustand + TanStack Query

### 6.1 Zustand

| Field | Value |
|---|---|
| **Package** | `zustand` |
| **Version** | `^5.0.0` |
| **License** | MIT |

### 6.2 Why Zustand (over Redux, Jotai, Valtio)

| Factor | Zustand | Redux Toolkit | Jotai | Valtio |
|---|---|---|---|---|
| Bundle size | ~1.2 KB | ~16 KB | ~3.4 KB | ~3.7 KB |
| Boilerplate | Minimal (1 function) | Significant (slices, reducers) | Minimal (atoms) | Minimal (proxy) |
| TypeScript | First-class | First-class | First-class | Good |
| DevTools | Via middleware | Built-in | Via extension | Via extension |
| Mental model | Store = hook | Store = reducer | Atom = unit | Proxy = reactive |
| Persistence | `persist` middleware | `redux-persist` | `jotai-utils` | Manual |
| Learning curve | Very low | Moderate | Low | Low |

**Decision:** Zustand. Minimal API surface, tiny bundle, excellent TypeScript support. The `persist` middleware handles saving user preferences to localStorage (which Tauri persists across app restarts). Three small stores (app, task, settings) cover all UI state needs without the overhead of Redux.

### 6.3 Zustand Store Architecture

```
                    Zustand Stores (UI State)
                    ┌──────────────────┐
                    │   appStore.ts    │  ← Navigation, active panel,
                    │                  │     selected asset, sidebar
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │  taskStore.ts     │  ← Active task tracking,
                    │                   │     progress, status
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │ settingsStore.ts │  ← User preferences,
                    │                   │     persisted to localStorage
                    └──────────────────┘

                    TanStack Query (Server State)
                    ┌──────────────────────────────────┐
                    │  Query/Mutation Cache            │
                    │  ┌────────────────────────────┐  │
                    │  │ ['credit-balance']          │  │  ← Refetch every 60s
                    │  │ ['assets', search, tag]      │  │  ← Refetch on invalidate
                    │  │ ['task', taskId]             │  │  ← Poll every 5s
                    │  │ ['api-key']                  │  │  ← One-time fetch
                    │  │ ['animation-library']       │  │  ← Fetch once, cache
                    │  └────────────────────────────┘  │
                    │  ┌────────────────────────────┐  │
                    │  │ Mutations                   │  │
                    │  │ create_text_to_3d           │  │  ← Invalidate balance
                    │  │ create_image_to_3d          │  │
                    │  │ create_remesh               │  │
                    │  │ download_asset              │  │  ← Invalidate assets
                    │  │ set_api_key                 │  │  ← Invalidate api-key
                    │  └────────────────────────────┘  │
                    └──────────────────────────────────┘
```

### 6.4 TanStack Query

| Field | Value |
|---|---|
| **Package** | `@tanstack/react-query` |
| **Version** | `^5.62.0` |
| **License** | MIT |

### 6.5 Why TanStack Query

| Factor | Rationale |
|---|---|
| **Async state** | Handles loading, error, success states for every Tauri `invoke()` call. No manual `useEffect` + `useState` boilerplate. |
| **Polling** | `refetchInterval` option provides built-in task polling. Conditional polling (stop when status is terminal) via function-based interval. |
| **Cache invalidation** | `qc.invalidateQueries()` after mutations automatically refetches dependent queries (e.g., refresh credit balance after creating a task). |
| **Optimistic updates** | Not needed for MVP (Meshy API is async, not instant), but available for future use. |
| **DevTools** | `@tanstack/react-query-devtools` provides a visual cache inspector. |
| **No global state** | TanStack Query manages server state only. Zustand manages UI state. Clean separation. |

### 6.6 Query Client Configuration

```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30 seconds before refetch on focus
      gcTime: 5 * 60 * 1000,      // 5 minutes garbage collection
      retry: 1,                    // Retry failed queries once
      refetchOnWindowFocus: true,  // Refresh balance on focus
    },
    mutations: {
      retry: 0,                    // Don't retry mutations (user action)
    },
  },
});

// Only enable devtools in development
const enableDevtools = import.meta.env.DEV;
```

### 6.7 State Boundary Rules

| State Type | Manager | Examples |
|---|---|---|
| **Server state** (from Meshy API) | TanStack Query | Task status, credit balance, asset list |
| **Local UI state** (ephemeral) | Zustand | Active view, selected asset, sidebar collapsed |
| **User preferences** (persistent) | Zustand + `persist` middleware | Default AI model, poll interval, auto-download |
| **Active task tracking** (ephemeral) | Zustand | In-flight task progress, local error state |
| **Form state** (ephemeral) | React `useState` / `useReducer` | Prompt text, polycount slider, format checkboxes |

**Rule:** If the data comes from or goes to the Meshy API, it's TanStack Query. If it's UI-only, it's Zustand. If it's a form input, it's local React state. No exceptions.

---

## 7. 3D Rendering: Three.js Ecosystem

### 7.1 Selection

| Field | Value |
|---|---|
| **three** | `^0.170.0` |
| **@react-three/fiber** | `^9.0.0` |
| **@react-three/drei** | `^10.0.0` |
| **License** | MIT (all three) |

### 7.2 Why Three.js + R3F

| Factor | Rationale |
|---|---|
| **GLB/GLTF support** | Three.js's `GLTFLoader` is the gold standard for loading GLB files in the browser/webview. Meshy's primary output format is GLB. |
| **React integration** | `@react-three/fiber` provides a declarative React renderer for Three.js. No imperative `WebGLRenderer` setup. |
| **Helper components** | `@react-three/drei` provides `OrbitControls`, `Environment`, `ContactShadows`, `useGLTF`, `Bounds`, `Center` — all essential for a 3D asset viewer. |
| **Performance** | R3F's reconciler batches updates efficiently. The 3D canvas only re-renders when props change. |
| **Community** | Largest 3D-on-web community. Extensive examples and documentation. |
| **No alternative considered** | Babylon.js is the main alternative, but it's heavier and doesn't have a React renderer as mature as R3F. PlayCanvas is too game-engine-focused. |

### 7.3 Three.js Bundle Strategy

```
three.js (~600 KB minified)
├── Core (scene, camera, renderer)     ← Required
├── GLTFLoader + DRACOLoader           ← Required (for GLB loading)
├── OrbitControls                      ← Required (via drei)
├── Environment maps (drei)            ← Required (for studio lighting)
├── ContactShadows (drei)              ← Required (for ground shadow)
└── Postprocessing (EffectComposer)    ← NOT included in MVP (deferred)
```

The `three` package is large (~600 KB). It's split into a separate Vite chunk (`three-vendor`) to avoid blocking the initial app load. The 3D viewer is lazy-loaded only when the user opens an asset detail view.

### 7.4 R3F Canvas Configuration

```typescript
// src/components/gallery/AssetPreview3D.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF, Bounds, Center } from '@react-three/drei';
import { Suspense, useMemo } from 'react';

// ─── Model loader ────────────────────────────────────────────
function Model({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  // Clone scene to avoid mutating cached original
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} />;
}

// ─── Loading fallback ────────────────────────────────────────
function ModelFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#3f3f46" wireframe />
    </mesh>
  );
}

// ─── Main preview component ──────────────────────────────────
export function AssetPreview3D({ glbPath }: { glbPath: string }) {
  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-900">
      <Canvas
        camera={{ position: [3, 2, 5], fov: 45 }}
        shadows
        dpr={[1, 2]}                    // Responsive pixel ratio
        gl={{
          antialias: true,
          preserveDrawingBuffer: true,  // Enable screenshots
          alpha: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#18181b');
        }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-5, 3, -5]} intensity={0.3} />

        <Suspense fallback={<ModelFallback />}>
          <Bounds fit clip observe margin={1.2}>
            <Center>
              <Model path={glbPath} />
            </Center>
          </Bounds>
          <Environment preset="studio" />
          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.5}
            scale={10}
            blur={2}
            far={4}
            resolution={512}
          />
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={15}
          maxPolarAngle={Math.PI * 0.9}
        />
      </Canvas>
    </div>
  );
}
```

### 7.5 Tauri Asset Protocol for Local GLB Files

Tauri's `assetProtocol` allows the webview to load local files via the `asset://` protocol. This is required because the webview cannot directly access `file://` URLs for security reasons.

```json
// tauri.conf.json (already configured in §2.3)
"assetProtocol": {
  "enable": true,
  "scope": ["$APPDATA/assets/**"]
}
```

```typescript
// Convert local file path to asset protocol URL
import { convertFileSrc } from '@tauri-apps/api/core';

// Usage in AssetPreview3D:
const glbUrl = convertFileSrc(glbPath);
// glbUrl → "asset://localhost/Users/.../assets/018a210d/model.glb"
// useGLTF(glbUrl) loads it via Three.js GLTFLoader
```

---

## 8. Backend Language: Rust

### 8.1 Selection

| Field | Value |
|---|---|
| **Rust** | Stable, latest stable (1.83+ as of 2025) |
| **Edition** | 2021 |
| **License** | MIT / Apache 2.0 |

### 8.2 Why Rust

| Factor | Rationale |
|---|---|
| **Tauri requirement** | Tauri's backend is Rust. Using Rust for the backend is not a choice — it's the only option with Tauri. |
| **Memory safety** | No garbage collector. No segfaults. The HTTP client, database, and file system operations are all memory-safe by construction. |
| **Performance** | Comparable to C/C++. No JIT warmup. SQLite queries and HTTP requests are fast. |
| **Error handling** | `Result<T, E>` forces explicit error handling. No silent panics (unless explicitly `unwrap()`-ed, which is banned in production code). |
| **Serde** | `serde` + `serde_json` provide zero-copy deserialization of Meshy API responses. The typed structs match the TypeScript types exactly. |
| **Async runtime** | `tokio` provides a battle-tested async runtime for HTTP requests and SSE stream parsing. |
| **Binary size** | Rust compiles to a single native binary. No runtime to bundle. |

### 8.3 Rust Edition & Toolchain

```toml
# src-tauri/Cargo.toml (excerpt)
[package]
name = "meshyforge"
version = "1.0.0"
edition = "2021"
rust-version = "1.75"

[profile.release]
opt-level = "s"       # Optimize for size
lto = true             # Link-time optimization
codegen-units = 1      # Single codegen unit for better optimization
strip = true           # Strip debug symbols
panic = "abort"        # Abort on panic (smaller binary, no unwinding)
```

### 8.4 Linting Rules (Clippy)

```rust
// src-tauri/clippy.toml
msrv = "1.75"

// .cargo/config.toml
[target.'cfg(not(test))']
rustflags = [
  "-D", "warnings",                          // Deny all warnings
  "-A", "clippy::module_inception",         // Allow nested module names
]
```

```bash
# CI lint command
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

---

## 9. HTTP Client: reqwest

### 9.1 Selection

| Field | Value |
|---|---|
| **Package** | `reqwest` |
| **Version** | `^0.12.0` |
| **Features** | `["json", "stream"]` |
| **License** | MIT |

### 9.2 Why reqwest

| Factor | Rationale |
|---|---|
| **Async-native** | Built on `hyper` + `tokio`. Full async support for HTTP requests and SSE stream parsing. |
| **JSON support** | `serde_json` integration via the `json` feature. `.json::<T>()` deserializes responses directly into typed structs. |
| **Streaming** | The `stream` feature enables `bytes_stream()` for SSE parsing. Essential for `stream_task()`. |
| **TLS** | Uses `rustls` by default on all platforms. No OpenSSL dependency on Linux. |
| **Timeouts** | Configurable per-request and per-client timeouts. 120s for task creation, 30s for balance checks. |
| **No CORS** | `reqwest` is a native HTTP client, not a browser fetch. No CORS restrictions apply. This is a key advantage of the Tauri architecture. |

### 9.3 Client Configuration

```rust
// src-tauri/src/meshy/client.rs
use reqwest::{Client, header::HeaderMap};
use std::time::Duration;

pub fn build_http_client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(120))           // Default timeout
        .connect_timeout(Duration::from_secs(10))    // Connection timeout
        .pool_max_idle_per_host(5)                   // Connection pooling
        .user_agent("MeshyForge/1.0.0")              // Identify ourselves
        .build()
        .expect("Failed to build HTTP client")
}
```

### 9.4 SSE Stream Parsing

```rust
// SSE parsing with reqwest streaming
use futures_util::StreamExt;
use bytes::Bytes;

pub async fn parse_sse_stream(
    response: reqwest::Response,
    on_data: impl Fn(serde_json::Value) + Send + 'static,
) -> Result<(), MeshyError> {
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk: Bytes = chunk_result?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        // Process complete lines
        while let Some(newline_pos) = buffer.find('\n') {
            let line: String = buffer[..newline_pos].to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            // SSE format: "data: {json}"
            if let Some(json_str) = line.strip_prefix("data: ") {
                if let Ok(data) = serde_json::from_str::<serde_json::Value>(json_str.trim()) {
                    on_data(data.clone());

                    // Check for terminal status
                    if let Some(status) = data.get("status").and_then(|s| s.as_str()) {
                        if matches!(status, "SUCCEEDED" | "FAILED" | "CANCELED") {
                            return Ok(());
                        }
                    }
                }
            }

            // SSE error event
            if line.starts_with("event: error") {
                // Next data: line will contain the error
                // The on_data callback will handle it
            }
        }
    }

    Ok(())
}
```

---

## 10. Database: SQLite via rusqlite

### 10.1 Selection

| Field | Value |
|---|---|
| **Package** | `rusqlite` |
| **Version** | `^0.31.0` |
| **Features** | `["bundled"]` |
| **License** | MIT |

### 10.2 Why SQLite + rusqlite

| Factor | Rationale |
|---|---|
| **No external server** | SQLite is a single-file database. No process to start, no port to manage. Perfect for a desktop app. |
| **Bundled feature** | `rusqlite` with `bundled` compiles SQLite from source. No system SQLite dependency. Consistent behavior across platforms. |
| **Performance** | SQLite handles thousands of asset records with sub-millisecond queries. Indexes on `status`, `meshy_type`, `created_at` ensure fast filtering. |
| **Concurrency** | SQLite supports concurrent reads. Writes are serialized via a `Mutex<Connection>` in the Rust backend. |
| **ACID** | Full ACID compliance. No risk of partial writes corrupting the asset database. |
| **Portability** | The database file is a single `.db` file in the app data directory. Easy to back up, move, or reset. |
| **Migration** | Schema versioning via `schema_version` table. Migrations applied on app startup. |

### 10.3 Database File Location

| Platform | Path |
|---|---|
| **macOS** | `~/Library/Application Support/com.meshyforge.app/meshyforge.db` |
| **Windows** | `%APPDATA%\com.meshyforge.app\meshyforge.db` |
| **Linux** | `~/.local/share/com.meshyforge.app/meshyforge.db` |

```rust
// src-tauri/src/storage/database.rs
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

pub fn database_path(app: &AppHandle) -> PathBuf {
    let app_data = app.path().app_data_dir()
        .expect("Failed to get app data directory");
    std::fs::create_dir_all(&app_data)
        .expect("Failed to create app data directory");
    app_data.join("meshyforge.db")
}
```

### 10.4 Connection Management

```rust
// Single connection, guarded by Mutex
// All database operations go through this one connection
// SQLite handles concurrent reads; the Mutex serializes writes

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn open(path: &Path) -> Result<Self, rusqlite::Error> {
        let conn = Connection::open(path)?;

        // Performance pragmas
        conn.pragma_update(None, "journal_mode", "WAL")?;      // Write-Ahead Logging
        conn.pragma_update(None, "synchronous", "NORMAL")?;    // Faster fsync
        conn.pragma_update(None, "foreign_keys", "ON")?;       // Enforce FK constraints
        conn.pragma_update(None, "cache_size", "-64000")?;     // 64MB cache
        conn.pragma_update(None, "temp_store", "MEMORY")?;     // Temp tables in memory

        // Run migrations
        Self::run_migrations(&conn)?;

        Ok(Self { conn: Mutex::new(conn) })
    }
}
```

### 10.5 Migration System

```rust
// src-tauri/src/storage/migrations.rs
const MIGRATIONS: &[(i64, &str)] = &[
    (1, include_str!("../migrations/001_initial.sql")),
    // Future migrations:
    // (2, include_str!("../migrations/002_add_export_presets.sql")),
    // (3, include_str!("../migrations/003_add_prompt_history.sql")),
];

pub fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Create schema_version table if not exists
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at INTEGER NOT NULL
        );"
    )?;

    // Get current version
    let current: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Apply pending migrations
    for (version, sql) in MIGRATIONS {
        if *version > current {
            conn.execute_batch(sql)?;
            conn.execute(
                "INSERT INTO schema_version (version, applied_at) VALUES (?1, ?2)",
                params![version, chrono::Utc::now().timestamp_millis()],
            )?;
            log::info!("Applied migration {}", version);
        }
    }

    Ok(())
}
```

```sql
-- src-tauri/migrations/001_initial.sql
-- Full schema as defined in TDD §6.1
CREATE TABLE assets (
    id              TEXT PRIMARY KEY,
    meshy_type      TEXT NOT NULL,
    parent_task_id  TEXT,
    prompt          TEXT,
    image_url       TEXT,
    ai_model        TEXT,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    progress        INTEGER NOT NULL DEFAULT 0,
    consumed_credits INTEGER DEFAULT 0,
    thumbnail_path  TEXT,
    file_paths      TEXT NOT NULL DEFAULT '{}',
    texture_paths   TEXT NOT NULL DEFAULT '[]',
    notes           TEXT DEFAULT '',
    tags            TEXT DEFAULT '[]',
    created_at      INTEGER NOT NULL,
    started_at      INTEGER DEFAULT 0,
    finished_at     INTEGER DEFAULT 0,
    downloaded_at   INTEGER DEFAULT 0,
    error_message   TEXT,
    has_textures    INTEGER DEFAULT 0,
    has_rig         INTEGER DEFAULT 0,
    has_animation   INTEGER DEFAULT 0,
    favorite        INTEGER DEFAULT 0,
    last_viewed_at  INTEGER DEFAULT 0
);

CREATE TABLE task_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    meshy_task_id   TEXT,
    endpoint        TEXT NOT NULL,
    request_body    TEXT,
    response_status INTEGER,
    response_body   TEXT,
    error           TEXT,
    timestamp       INTEGER NOT NULL,
    credits_before  INTEGER,
    credits_after   INTEGER
);

CREATE TABLE tags (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT UNIQUE NOT NULL,
    color           TEXT DEFAULT '#6b7280',
    created_at      INTEGER NOT NULL
);

CREATE TABLE asset_tags (
    asset_id        TEXT NOT NULL,
    tag_id          INTEGER NOT NULL,
    PRIMARY KEY (asset_id, tag_id),
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE TABLE schema_version (
    version         INTEGER PRIMARY KEY,
    applied_at      INTEGER NOT NULL
);

CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_type ON assets(meshy_type);
CREATE INDEX idx_assets_created ON assets(created_at DESC);
CREATE INDEX idx_assets_favorite ON assets(favorite);
CREATE INDEX idx_task_log_task ON task_log(meshy_task_id);
CREATE INDEX idx_task_log_time ON task_log(timestamp DESC);
```

---

## 11. Secret Storage: OS Keychain via keyring

### 11.1 Selection

| Field | Value |
|---|---|
| **Package** | `keyring` |
| **Version** | `^3.6.0` |
| **License** | MIT / Apache 2.0 |

### 11.2 Why keyring

| Factor | Rationale |
|---|---|
| **Cross-platform** | Uses macOS Keychain, Windows Credential Manager, and Linux Secret Service (via D-Bus). Single API for all platforms. |
| **No plaintext** | API key is stored in the OS secure enclave. Never written to SQLite, never written to config files, never logged. |
| **Simple API** | `keyring::Entry::new(service, user)?.set_password(key)?` — three lines to store, one to retrieve. |
| **Tauri Stronghold alternative** | Tauri offers `tauri-plugin-stronghold` (encrypted vault), but it requires a user password to unlock. For a personal-use app with a single API key, the OS keychain is simpler and unlocks automatically. |

### 11.3 Implementation

```rust
// src-tauri/src/security/keychain.rs
use keyring::Entry;

const SERVICE_NAME: &str = "com.meshyforge.app";
const USERNAME: &str = "meshy_api_key";

pub fn store_key(api_key: &str) -> Result<(), keyring::Error> {
    let entry = Entry::new(SERVICE_NAME, USERNAME)?;
    entry.set_password(api_key)?;
    Ok(())
}

pub fn get_key() -> Result<Option<String>, keyring::Error> {
    let entry = Entry::new(SERVICE_NAME, USERNAME)?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e),
    }
}

pub fn delete_key() -> Result<(), keyring::Error> {
    let entry = Entry::new(SERVICE_NAME, USERNAME)?;
    entry.delete_credential()?;
    Ok(())
}
```

### 11.4 Keychain Availability by Platform

| Platform | Backend | Requirements |
|---|---|---|
| **macOS** | Keychain Services | None (built into macOS) |
| **Windows** | Credential Manager | None (built into Windows) |
| **Linux** | Secret Service (D-Bus) | Requires `gnome-keyring` or `kwallet` or `keepassxc` running. Falls back to error if no secret service is available. |

### 11.5 Linux Fallback

If no secret service is available on Linux, the app falls back to storing the API key in a restricted-permission file:

```rust
// Fallback for Linux without secret service
pub fn store_key_fallback(api_key: &str, app_data_dir: &Path) -> Result<(), std::io::Error> {
    let key_file = app_data_dir.join(".api_key");
    std::fs::write(&key_file, api_key)?;
    // Set file permissions to 0600 (owner read/write only)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&key_file, std::fs::Permissions::from_mode(0o600))?;
    }
    Ok(())
}
```

---

## 12. Tauri Plugins

### 12.1 Plugin Summary

| Plugin | Package (npm) | Crate (Rust) | Purpose |
|---|---|---|---|
| **Dialog** | `@tauri-apps/plugin-dialog` | `tauri-plugin-dialog` | OS-native file open/save dialogs for image upload and export |
| **Notification** | `@tauri-apps/plugin-notification` | `tauri-plugin-notification` | OS-native notifications when tasks complete |
| **Shell** | `@tauri-apps/plugin-shell` | `tauri-plugin-shell` | Open files in OS file manager (Reveal in Finder / Explorer) |
| **Log** | `@tauri-apps/plugin-log` | `tauri-plugin-log` | Structured logging (Rust + frontend) to file and console |

### 12.2 Dialog Plugin

```typescript
// File open dialog for image upload
import { open } from '@tauri-apps/plugin-dialog';

export async function pickImage(): Promise<string | null> {
  const result = await open({
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    multiple: false,
  });
  return typeof result === 'string' ? result : null;
}

// File save dialog for export
import { save } from '@tauri-apps/plugin-dialog';

export async function pickExportPath(defaultName: string): Promise<string | null> {
  return await save({
    defaultPath: defaultName,
    filters: [
      { name: 'GLB', extensions: ['glb'] },
      { name: 'FBX', extensions: ['fbx'] },
      { name: 'OBJ', extensions: ['obj'] },
      { name: 'STL', extensions: ['stl'] },
      { name: 'USDZ', extensions: ['usdz'] },
      { name: '3MF', extensions: ['3mf'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
}
```

### 12.3 Notification Plugin

```rust
// src-tauri/src/commands/notifications.rs
use tauri_plugin_notification::NotificationExt;

pub fn notify_task_complete(app: &tauri::AppHandle, label: &str, success: bool) {
    let title = if success {
        "MeshyForge — Task Complete"
    } else {
        "MeshyForge — Task Failed"
    };
    let body = if success {
        format!("{} is ready to view.", label)
    } else {
        format!("{} failed. Check the task monitor for details.", label)
    };

    let _ = app.notification()
        .builder()
        .title(title)
        .body(&body)
        .show();
}
```

### 12.4 Shell Plugin

```rust
// src-tauri/src/commands/assets.rs
use tauri_plugin_shell::ShellExt;

#[tauri::command]
pub async fn reveal_in_file_manager(path: String) -> Result<(), String> {
    // Opens Finder (macOS), Explorer (Windows), or default file manager (Linux)
    std::process::Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

### 12.5 Log Plugin

```rust
// src-tauri/src/main.rs
use tauri_plugin_log::{Builder as LogBuilder, Target, TargetKind};

fn main() {
    tauri::Builder::default()
        .plugin(
            LogBuilder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: "meshyforge.log" }),
                    Target::new(TargetKind::Webview),
                ])
                .level(log::LevelFilter::Info)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running MeshyForge");
}
```

---

## 13. Icons: Lucide React

### 13.1 Selection

| Field | Value |
|---|---|
| **Package** | `lucide-react` |
| **Version** | `^0.460.0` |
| **License** | ISC |

### 13.2 Why Lucide React

| Factor | Rationale |
|---|---|
| **Tree-shakeable** | Only imported icons are bundled. No icon font. No sprite sheet. |
| **Consistent** | All icons share the same stroke width, line caps, and visual weight. |
| **Open source** | ISC license. No attribution required. |
| **React-native** | Icons are React components. `<Icon size={20} color="currentColor" />`. |
| **shadcn/ui compatible** | shadcn/ui uses Lucide icons by default. No integration friction. |
| **Size** | Each icon is ~1–2 KB. Total icon payload for the app: ~20 KB. |

### 13.3 Icons Used in MeshyForge

| Icon Name | Usage |
|---|---|
| `Sparkles` | Generate panel nav |
| `Images` | Gallery nav |
| `Zap` | Task monitor nav |
| `Settings` | Settings nav |
| `KeyRound` | API key management |
| `Coins` | Credit balance |
| `Download` | Download / export |
| `Upload` | Image upload |
| `Trash2` | Delete asset |
| `Star` | Favorite toggle |
| `RefreshCw` | Refresh / retry |
| `CheckCircle2` | Task succeeded |
| `XCircle` | Task failed |
| `Loader2` | Task in progress (spinner) |
| `Eye` | View asset detail |
| `FolderOpen` | Reveal in file manager |
| `Copy` | Copy task ID |
| `Tag` | Tag management |
| `FileBox` | Export dialog |
| `Cpu` | AI model selector |
| `Cube` | 3D preview / mesh type |
| `Palette` | Texture / retexture |
| `Bone` | Rigging |
| `Play` | Animation |
| `Printer` | 3D printing |
| `ImagePlus` | Image generation |
| `Lightbulb` | Creative Lab |
| `Info` | Tooltips |
| `ExternalLink` | Links to Meshy docs |
| `ChevronDown` | Dropdown / accordion |
| `ChevronRight` | Breadcrumb |
| `PanelLeftClose` | Collapse sidebar |
| `PanelLeftOpen` | Expand sidebar |

---

## 14. Testing Stack

### 14.1 Overview

| Layer | Tool | Version | Purpose |
|---|---|---|---|
| **Rust unit tests** | `cargo test` | Stable | Meshy client, database, file system, error handling |
| **React component tests** | Vitest + Testing Library | `^2.0.0` / `^16.0.0` | Component rendering, user interactions, form validation |
| **API mocking** | MSW (Mock Service Worker) | `^2.6.0` | Intercept `invoke()` calls and return mock Meshy API responses |
| **E2E tests** | Playwright + Tauri WebDriver | `^1.49.0` | Full app flows: launch, API key, generate, gallery, export |
| **Coverage** | `@c89/vite-plugin-coverage` | `^1.0.0` | Istanbul-based coverage for Vitest |

### 14.2 Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/main.tsx',
        'src/components/ui/**',  // shadcn/ui components (tested upstream)
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 14.3 Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Auto-cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Tauri invoke globally
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}));
```

### 14.4 Rust Test Example

```rust
// src-tauri/src/meshy/client.rs
#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::{MockServer, Mock, ResponseTemplate};

    #[tokio::test]
    async fn test_create_task_success() {
        let server = MockServer::start().await;
        Mock::given(wiremock::method("POST"))
            .and(wiremock::path("/v2/text-to-3d"))
            .and(wiremock::header("Authorization", "Bearer msy_test_key"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "result": "test-task-id-123"
            })))
            .mount(&server)
            .await;

        let client = MeshyClient {
            http: reqwest::Client::new(),
            api_key: "msy_test_key".to_string(),
            base_url: server.uri(),
        };

        let response = client
            .create_task("/v2/text-to-3d", &serde_json::json!({
                "mode": "preview",
                "prompt": "test"
            }))
            .await
            .unwrap();

        assert_eq!(response.result, "test-task-id-123");
    }

    #[tokio::test]
    async fn test_create_task_402_payment_required() {
        let server = MockServer::start().await;
        Mock::given(wiremock::method("POST"))
            .and(wiremock::path("/v2/text-to-3d"))
            .respond_with(ResponseTemplate::new(402).set_body_json(serde_json::json!({
                "message": "Insufficient credits"
            })))
            .mount(&server)
            .await;

        let client = MeshyClient {
            http: reqwest::Client::new(),
            api_key: "msy_test_key".to_string(),
            base_url: server.uri(),
        };

        let result = client
            .create_task("/v2/text-to-3d", &serde_json::json!({}))
            .await;

        assert!(result.is_err());
        match result.unwrap_err() {
            MeshyError::ApiError { status, .. } => {
                assert_eq!(status, reqwest::StatusCode::PAYMENT_REQUIRED);
            }
            _ => panic!("Expected ApiError"),
        }
    }
}
```

### 14.5 React Component Test Example

```typescript
// src/components/generate/TextTo3DPanel.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TextTo3DPanel } from './TextTo3DPanel';
import { invoke } from '@tauri-apps/api/core';

describe('TextTo3DPanel', () => {
  function renderWithProviders() {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
      <QueryClientProvider client={qc}>
        <TextTo3DPanel />
      </QueryClientProvider>
    );
  }

  it('renders prompt input and generate button', () => {
    renderWithProviders();
    expect(screen.getByPlaceholderText(/describe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('disables generate button when prompt is empty', () => {
    renderWithProviders();
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled();
  });

  it('calls invoke with correct payload on generate', async () => {
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockResolvedValueOnce({ result: 'task-123' });

    renderWithProviders();
    const input = screen.getByPlaceholderText(/describe/i);
    const button = screen.getByRole('button', { name: /generate/i });

    fireEvent.change(input, { target: { value: 'a monster mask' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('create_text_to_3d', {
        body: expect.objectContaining({
          mode: 'preview',
          prompt: 'a monster mask',
        }),
      });
    });
  });

  it('shows error toast on 402 payment required', async () => {
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockRejectedValueOnce('API error 402: Insufficient credits');

    renderWithProviders();
    fireEvent.change(screen.getByPlaceholderText(/describe/i), {
      target: { value: 'test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByText(/insufficient credits/i)).toBeInTheDocument();
    });
  });
});
```

---

## 15. Code Quality & Formatting

### 15.1 Tool Selection

| Tool | Package | Version | Purpose |
|---|---|---|---|
| **Biome** | `@biomejs/biome` | `^1.9.0` | Linting + formatting (Rust-speed, single tool) |
| **ESLint** (supplementary) | `eslint` | `^9.0.0` | React-specific lint rules not covered by Biome |
| **clippy** | (Rust built-in) | Stable | Rust linting |

### 15.2 Why Biome over Prettier + ESLint

| Factor | Biome | Prettier + ESLint |
|---|---|---|
| Speed | 10–25x faster (Rust) | Slower (JavaScript) |
| Tool count | 1 (lint + format) | 2 separate tools |
| Configuration | Single `biome.json` | `.eslintrc` + `.prettierrc` |
| Import sorting | Built-in | Requires `eslint-plugin-import` |
| Coverage | Growing | Comprehensive |

**Decision:** Biome as primary linter/formatter. ESLint for React-specific rules (hooks, accessibility) as a supplementary check in CI.

### 15.3 Biome Configuration

```json
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": true,
    "ignore": ["dist", "src-tauri/target", "node_modules", "coverage"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error",
        "useExhaustiveDependencies": "warn"
      },
      "style": {
        "useImportType": "error",
        "useExportType": "error",
        "noNonNullAssertion": "warn"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noConsole": "warn"
      },
      "complexity": {
        "noBoundedTypes": "off"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all",
      "arrowParentheses": "always"
    },
    "organizeImports": {
      "enabled": true
    }
  }
}
```

### 15.4 ESLint Configuration (Supplementary)

```javascript
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
    },
    settings: {
      react: { version: '19' },
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'src-tauri/', 'coverage/'],
  },
];
```

### 15.5 Pre-commit Hook

```bash
# .husky/pre-commit
#!/usr/bin/env sh

# Frontend lint + format
npx biome check --write src/

# Rust lint
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings

# Type check
npx tsc --noEmit
```

---

## 16. CI/CD Tooling

### 16.1 GitHub Actions Workflows

| Workflow | File | Triggers | Purpose |
|---|---|---|---|
| **CI** | `.github/workflows/ci.yml` | push, PR | Lint, type-check, test (frontend + Rust) |
| **Release** | `.github/workflows/release.yml` | tag `v*` | Build per-platform installers, create GitHub release |
| **Dependency audit** | `.github/workflows/audit.yml` | weekly schedule | `npm audit` + `cargo audit` for vulnerabilities |

### 16.2 CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  CARGO_TERM_COLOR: always

jobs:
  # ─── Frontend Lint + Type Check ──────────────────────────
  frontend-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npx biome check src/
      - run: npx tsc --noEmit

  # ─── Frontend Tests ──────────────────────────────────────
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

  # ─── Rust Checks ────────────────────────────────────────
  rust-checks:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy, rustfmt
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: "src-tauri -> target"
      - run: cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
      - run: cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
      - run: cargo test --manifest-path src-tauri/Cargo.toml

  # ─── Build (smoke test) ──────────────────────────────────
  build-smoke:
    needs: [frontend-checks, frontend-tests, rust-checks]
    strategy:
      matrix:
        include:
          - os: macos-latest
            target: aarch64-apple-darwin
          - os: ubuntu-22.04
            target: x86_64-unknown-linux-gnu
          - os: windows-latest
            target: x86_64-pc-windows-msvc
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: "src-tauri -> target"
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run tauri build -- --target ${{ matrix.target }}
```

### 16.3 Release Workflow

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: macos-latest
            target: aarch64-apple-darwin
            label: macOS-ARM64
          - os: macos-latest
            target: x86_64-apple-darwin
            label: macOS-Intel
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            label: Windows-x64
          - os: ubuntu-22.04
            target: x86_64-unknown-linux-gnu
            label: Linux-x64
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - name: Install Linux dependencies
        if: runner.os == 'Linux'
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            libappindicator3-dev \
            librsvg2-dev \
            patchelf \
            libssl-dev \
            libgtk-3-dev

      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: "src-tauri -> target"

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci
      - run: npm run tauri build -- --target ${{ matrix.target }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: MeshyForge-${{ matrix.label }}
          path: |
            src-tauri/target/*/release/bundle/dmg/*.dmg
            src-tauri/target/*/release/bundle/msi/*.msi
            src-tauri/target/*/release/bundle/deb/*.deb
            src-tauri/target/*/release/bundle/appimage/*.AppImage
            src-tauri/target/*/release/bundle/nsis/*.exe

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          path: artifacts
          merge-multiple: true

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          files: |
            artifacts/**/*.dmg
            artifacts/**/*.msi
            artifacts/**/*.deb
            artifacts/**/*.AppImage
            artifacts/**/*.exe
```

### 16.4 Dependency Audit

```yaml
# .github/workflows/audit.yml
name: Dependency Audit
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 09:00 UTC

jobs:
  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm audit --audit-level=moderate
        continue-on-error: true

  cargo-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cargo install cargo-audit
      - run: cargo audit --manifest-path src-tauri/Cargo.toml
        continue-on-error: true
```

---

## 17. Dependency Manifest

### 17.1 npm Dependencies (package.json)

```json
{
  "name": "meshyforge",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "lint": "biome check src/",
    "lint:fix": "biome check --write src/",
    "type-check": "tsc --noEmit",
    "format": "biome format --write src/"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.1.1",
    "@tauri-apps/plugin-dialog": "^2.0.1",
    "@tauri-apps/plugin-notification": "^2.0.0",
    "@tauri-apps/plugin-shell": "^2.0.1",
    "@tauri-apps/plugin-log": "^2.0.0",
    "@tanstack/react-query": "^5.62.0",
    "@tanstack/react-query-devtools": "^5.62.0",
    "@react-three/fiber": "^9.0.0",
    "@react-three/drei": "^10.0.0",
    "three": "^0.170.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.2",
    "lucide-react": "^0.460.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.5",
    "sonner": "^1.7.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.1.0",
    "@vitejs/plugin-react": "^4.3.4",
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "vite": "^6.0.0",
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^25.0.1",
    "@playwright/test": "^1.49.0",
    "@biomejs/biome": "^1.9.4",
    "eslint": "^9.16.0",
    "typescript-eslint": "^8.18.0",
    "eslint-plugin-react": "^7.37.2",
    "eslint-plugin-react-hooks": "^5.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/three": "^0.170.0"
  }
}
```

### 17.2 Cargo Dependencies (Cargo.toml)

```toml
[package]
name = "meshyforge"
version = "1.0.0"
edition = "2021"
rust-version = "1.75"

[dependencies]
# ─── Tauri Core ──────────────────────────────────────────────
tauri = { version = "2", features = ["protocol-asset"] }
tauri-plugin-dialog = "2"
tauri-plugin-notification = "2"
tauri-plugin-shell = "2"
tauri-plugin-log = "2"

# ─── HTTP Client ─────────────────────────────────────────────
reqwest = { version = "0.12", features = ["json", "stream", "rustls-tls"], default-features = false }

# ─── Serialization ────────────────────────────────────────────
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# ─── Database ─────────────────────────────────────────────────
rusqlite = { version = "0.31", features = ["bundled"] }

# ─── Secret Storage ───────────────────────────────────────────
keyring = "3"

# ─── Async Runtime ───────────────────────────────────────────
tokio = { version = "1", features = ["full"] }
futures-util = "0.3"

# ─── Error Handling ───────────────────────────────────────────
thiserror = "2"
anyhow = "1"          # For application-level error context (not in library code)

# ─── Utilities ───────────────────────────────────────────────
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4"] }
log = "0.4"

# ─── Tauri Build ─────────────────────────────────────────────
[build-dependencies]
tauri-build = { version = "2", features = [] }

# ─── Test Dependencies ───────────────────────────────────────
[dev-dependencies]
wiremock = "0.6"
tempfile = "3"
tokio-test = "0.4"

# ─── Release Profile ─────────────────────────────────────────
[profile.release]
opt-level = "s"
lto = true
codegen-units = 1
strip = true
panic = "abort"
```

### 17.3 Dependency Graph (Key Chains)

```
Frontend:
  react ──► react-dom
  @tanstack/react-query (independent)
  @react-three/fiber ──► three ──► (no deps)
  @react-three/drei ──► @react-three/fiber ──► three
  zustand (independent)
  lucide-react (independent)
  tailwind-merge ──► (no deps)
  clsx (independent)
  sonner (independent)
  @tauri-apps/api (independent)

Backend:
  tauri ──► tauri-utils, tauri-runtime, tauri-macros
  reqwest ──► hyper, tokio, rustls
  rusqlite ──► libsqlite3-sys (bundled)
  keyring ──► platform-specific (security-framework | windows-sys | dbus)
  serde ──► serde_derive
  tokio ──► mio, slab
```

---

## 18. Alternatives Considered

### 18.1 Desktop Runtime

| Alternative | Verdict | Reason |
|---|---|---|
| **Electron** | ❌ Rejected | 150+ MB bundle, bundles Chromium, Node.js backend has weaker security model for API key handling |
| **Neutralino.js** | ❌ Rejected | Immature, small community, limited plugin ecosystem, C++ backend adds complexity |
| **Wails (Go)** | ❌ Rejected | Go backend is less type-safe than Rust for serde deserialization. Smaller ecosystem than Tauri |
| **Flutter Desktop** | ❌ Rejected | Dart language requirement. Three.js/R3F ecosystem unavailable. Would need custom 3D viewer |
| **Qt (Python/C++)** | ❌ Rejected | No web technology stack. Would require building entire UI from scratch without React ecosystem |
| **Tauri 1.x** | ❌ Rejected | Superseded by 2.x. 1.x has weaker plugin system, no capabilities/permissions model |

### 18.2 Frontend Framework

| Alternative | Verdict | Reason |
|---|---|---|
| **Vue 3** | ❌ Rejected | Excellent framework, but React's ecosystem for 3D (R3F, drei) is significantly stronger. TanStack Query and shadcn/ui have better React support |
| **Svelte 5** | ❌ Rejected | Great DX, but smaller ecosystem for 3D rendering. R3F is React-only. Would need raw Three.js |
| **SolidJS** | ❌ Rejected | Best performance, but smallest ecosystem. Same 3D limitation as Svelte |
| **Angular** | ❌ Rejected | Too heavyweight for a personal-use desktop app. Angular's opinionated structure adds unnecessary complexity |

### 18.3 State Management

| Alternative | Verdict | Reason |
|---|---|---|
| **Redux Toolkit** | ❌ Rejected | Too much boilerplate for 3 small stores. Overkill for a personal app |
| **Jotai** | ❌ Rejected | Atomic state model is elegant but harder to reason about for app-level state (navigation, selection) |
| **Valtio** | ❌ Rejected | Proxy-based reactivity is magical but harder to debug. Zustand's explicit model is clearer |
| **Nanostores** | ❌ Rejected | Excellent for micro-frontends, but Zustand's middleware ecosystem (persist, devtools) is more mature |
| **React Context only** | ❌ Rejected | No middleware, no selectors, causes unnecessary re-renders. Insufficient for task tracking with frequent updates |

### 18.4 3D Rendering

| Alternative | Verdict | Reason |
|---|---|---|
| **Babylon.js** | ❌ Rejected | Excellent engine, but heavier than Three.js. No React renderer as mature as R3F. Would need imperative API |
| **PlayCanvas** | ❌ Rejected | Game engine, not a 3D viewer. Overkill for asset preview |
| **model-viewer (Google)** | ⚠️ Considered | Web component for GLB viewing. Very simple. But limited customization (lighting, controls). Can't integrate with React state. Defer as a fallback if R3F proves too heavy |
| **CSS 3D transforms** | ❌ Rejected | Not suitable for complex 3D models. Only for simple card flips |

### 18.5 Database

| Alternative | Verdict | Reason |
|---|---|---|
| **DuckDB** | ❌ Rejected | Analytical database, overkill for simple asset records. No `INSERT OR REPLACE` |
| **PostgreSQL** | ❌ Rejected | Requires a server process. Unacceptable for a desktop app |
| **Realm / MongoDB Local** | ❌ Rejected | NoSQL, less query flexibility for tag filtering and search |
| **Sled (Rust embedded)** | ❌ Rejected | Key-value store, not relational. Can't do `JOIN` for asset_tags |
| **Plain JSON files** | ❌ Rejected | No indexing, no concurrent access, no query language. Corruption risk on crash |

### 18.6 HTTP Client (Rust)

| Alternative | Verdict | Reason |
|---|---|---|
| **ureq** | ❌ Rejected | Synchronous only. Can't handle SSE streaming |
| **hyper** (raw) | ❌ Rejected | Too low-level. reqwest wraps hyper with ergonomics |
| **isahc** | ❌ Rejected | Wraps libcurl. Adds C dependency. reqwest with rustls is pure Rust |
| **attohttpc** | ❌ Rejected | Synchronous, no streaming support |

### 18.7 Secret Storage

| Alternative | Verdict | Reason |
|---|---|---|
| **tauri-plugin-stronghold** | ⚠️ Considered | Encrypted vault, but requires user password to unlock. For a single API key, OS keychain is simpler. Consider for future multi-credential support |
| **Plaintext config file** | ❌ Rejected | Security risk. API key in plaintext on disk |
| **Environment variable** | ❌ Rejected | Not persistent across app restarts. User would need to set it manually |
| **SQLite settings table** | ❌ Rejected | API key in database is plaintext. SQLite files are not encrypted |

---

## 19. Version Pinning Strategy

### 19.1 Philosophy

- **Caret ranges (`^`)** for all npm packages. Allows minor + patch updates, prevents breaking major updates.
- **Tilde ranges (`~`)** for Rust crates where patch-level stability is critical (rusqlite, keyring).
- **Exact pins** for packages with a history of breaking changes in minor versions (three.js).

### 19.2 Pinning Rules

| Package Category | Pin Strategy | Rationale |
|---|---|---|
| **React / React DOM** | `^19.0.0` | React follows semver strictly |
| **Three.js** | `^0.170.0` | Three.js uses `0.x` versioning; `^` allows `0.170.x` but not `0.171.0`. Acceptable since R3F tracks three.js releases |
| **R3F / drei** | `^9.0.0` / `^10.0.0` | Track three.js major versions. Test before upgrading |
| **TanStack Query** | `^5.62.0` | Stable API. Safe to auto-update |
| **Zustand** | `^5.0.0` | Stable API. Minimal surface |
| **Tauri** | `^2` (Cargo) / `^2.1.0` (npm) | Track Tauri 2.x releases. Major version pin |
| **reqwest** | `^0.12.0` | Track latest 0.12.x. Breaking changes at 0.13 |
| **rusqlite** | `^0.31.0` | `bundled` feature means SQLite is compiled in. Pin minor for ABI stability |
| **keyring** | `^3.6.0` | OS-specific backends. Minor pin for platform stability |
| **shadcn/ui** | N/A (copy-paste) | No version to pin. Components are owned source files |

### 19.3 Update Cadence

| Frequency | Action |
|---|---|
| **Weekly** | `npm audit` + `cargo audit` (automated via CI) |
| **Monthly** | Review and apply patch updates (`npm update`) |
| **Quarterly** | Review minor version updates. Test in a branch before merging |
| **As needed** | Major version updates require a dedicated migration branch + full test run |

### 19.4 Lock Files

| File | Purpose | Committed |
|---|---|---|
| `package-lock.json` | npm dependency tree | ✅ Yes |
| `Cargo.lock` | Rust dependency tree | ✅ Yes (binary crate, not library) |

---

## 20. Cross-Platform Compatibility Matrix

### 20.1 Supported Platforms

| Platform | Version | Architecture | Status |
|---|---|---|---|
| **macOS** | 11.0 (Big Sur) and later | Apple Silicon (arm64) | ✅ Primary |
| **macOS** | 11.0 and later | Intel (x86_64) | ✅ Supported |
| **Windows** | 10 (build 1809+) and later | x86_64 | ✅ Supported |
| **Windows** | 11 | x86_64 | ✅ Supported |
| **Linux** | Ubuntu 22.04+ | x86_64 | ✅ Supported |
| **Linux** | Fedora 39+ | x86_64 | ⚠️ Best-effort |
| **Linux** | Arch Linux | x86_64 | ⚠️ Best-effort |

### 20.2 Platform-Specific Dependencies

| Dependency | macOS | Windows | Linux |
|---|---|---|---|
| **Webview** | WebKit (built-in) | WebView2 (auto-install via bootstrapper) | WebKitGTK (`libwebkit2gtk-4.1-dev`) |
| **Keychain** | Keychain Services (built-in) | Credential Manager (built-in) | Secret Service / D-Bus (`gnome-keyring` or `kwallet`) |
| **Notifications** | UserNotifications framework | Windows Notification System | libnotify |
| **File manager** | Finder (`open`) | Explorer (`explorer.exe`) | `xdg-open` |
| **TLS** | rustls (pure Rust) | rustls (pure Rust) | rustls (pure Rust) |

### 20.3 Linux System Dependencies (Build Time)

```bash
# Ubuntu / Debian
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev

# Fedora
sudo dnf install -y \
  webkit2gtk4.1-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel \
  patchelf \
  openssl-devel \
  gtk3-devel

# Arch
sudo pacman -S \
  webkit2gtk-4.1 \
  libappindicator-gtk3 \
  librsvg \
  patchelf \
  openssl \
  gtk3
```

### 20.4 Runtime Requirements

| Resource | Minimum | Recommended |
|---|---|---|
| **RAM** | 512 MB free | 2 GB free |
| **Disk (app)** | 50 MB | 50 MB |
| **Disk (assets)** | 1 GB | 50+ GB (depends on usage) |
| **CPU** | Any 64-bit | Multi-core for 3D rendering |
| **GPU** | Any (software rendering works) | Dedicated GPU for smooth 3D preview |
| **Network** | Broadband (for API calls) | — |

### 20.5 Known Platform Limitations

| Platform | Limitation | Mitigation |
|---|---|---|
| **Linux** | Keychain requires a running secret service daemon | Fall back to file-based storage with `0600` permissions |
| **Windows** | WebView2 may not be pre-installed on older Windows 10 | Tauri's `downloadBootstrapper` auto-installs WebView2 on first launch |
| **macOS** | App not notarized (personal use, not App Store) | User must right-click → Open on first launch to bypass Gatekeeper |
| **All** | Three.js uses WebGL, which requires GPU drivers | Fallback: show thumbnail image instead of 3D preview if WebGL context fails |

---