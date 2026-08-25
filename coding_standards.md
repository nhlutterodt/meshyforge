# Coding Standards Document — MeshyForge

## Document Metadata
| Field | Value |
|---|---|
| **Project** | MeshyForge — AI 3D Asset Studio |
| **Document Type** | Coding Standards Document |
| **Version** | 1.0.0 |
| **Date** | 2025 |
| **Status** | Approved for Implementation |
| **Dependencies** | Technical Design Document v1.0.0 (TDD), Tech Stack Specification v1.0.0 (TSS), UI/UX Guardrails and Build Document v1.0.0 (UI/UX) |

---

## Table of Contents
1. [Document Scope and Authority](#1-document-scope-and-authority)
2. [Source Alignment Matrix](#2-source-alignment-matrix)
3. [Code Organization Standards](#3-code-organization-standards)
4. [TypeScript Coding Standards](#4-typescript-coding-standards)
5. [React Coding Standards](#5-react-coding-standards)
6. [Rust Coding Standards](#6-rust-coding-standards)
7. [Tauri IPC Coding Standards](#7-tauri-ipc-coding-standards)
8. [State Management Coding Standards](#8-state-management-coding-standards)
9. [Styling Coding Standards](#9-styling-coding-standards)
10. [Error Handling Strategy](#10-error-handling-strategy)
11. [Testing Coding Standards](#11-testing-coding-standards)
12. [Security Coding Standards](#12-security-coding-standards)
13. [Performance Coding Standards](#13-performance-coding-standards)
14. [Git and Version Control Standards](#14-git-and-version-control-standards)
15. [Code Review Standards](#15-code-review-standards)
16. [Documentation Standards](#16-documentation-standards)
17. [Technical Debt Management](#17-technical-debt-management)
18. [Enforcement Mechanisms](#18-enforcement-mechanisms)

---

## 1. Document Scope and Authority

### 1.1 Purpose

This document defines the mandatory coding standards for all source code in the MeshyForge project. Every line of code committed to the repository must conform to these standards. This document has equal authority to the TDD, TSS, and UI/UX documents. Where any document appears to conflict, the more specific document prevails.

### 1.2 Hierarchy

```
TDD  ── What to build (architecture, data model, endpoints)
TSS  ── What tools to use (versions, dependencies, platform support)
UI/UX ── How the UI must behave (tokens, a11y, layout, build phases)
CSD  ── How the code must be written (THIS DOCUMENT)
  │
  └── Implementation (code)
```

### 1.3 Applicability

| Codebase Area | Standards Apply |
|---|---|
| `src/` (TypeScript/React frontend) | §3–5, §8–11, §13 |
| `src-tauri/src/` (Rust backend) | §3, §6–7, §10–12 |
| `src/lib/tauri.ts` (IPC contract layer) | §4, §7, §10 |
| `src/stores/` (Zustand) | §8 |
| `src/hooks/` (TanStack Query) | §5, §8 |
| `src/components/` (React components) | §5, §9 |
| `src-tauri/src/meshy/` (API client) | §6, §10, §12 |
| `src-tauri/src/storage/` (database) | §6, §12 |
| `src-tauri/src/commands/` (Tauri commands) | §7, §10 |
| `src-tauri/src/security/` (keychain) | §6, §12 |
| `.github/workflows/` (CI/CD) | §14 |
| `docs/` (documentation) | §16 |

---

## 2. Source Alignment Matrix

Every standard in this document is traceable to an upstream requirement. This matrix proves no deviation exists.

### 2.1 TDD Alignment

| TDD Section | TDD Requirement | CSD Section | Conformance |
|---|---|---|---|
| §3.1 — Tauri 2.x | Desktop runtime is Tauri; Rust backend handles HTTP, DB, keychain | §6, §7 | Rust owns all I/O; frontend never touches network/filesystem/DB |
| §3.1 — React 19 + TS | Frontend is React 19 with TypeScript 5.7 strict mode | §4, §5 | `strict: true`, `exactOptionalPropertyTypes: true` in tsconfig |
| §3.1 — Zustand + TanStack Query | Zustand for UI state, TanStack Query for server state | §8 | State boundary rules enforced; no cross-contamination |
| §3.1 — R3F + drei | 3D rendering via React Three Fiber | §5, §13 | Canvas lifecycle, memoization, cleanup rules |
| §4.2 — Task lifecycle | Create → poll/stream → download → store | §7, §8 | Hook→command mapping; polling stops on terminal status |
| §6.1 — SQLite schema | 6 tables with indexes and FK constraints | §6, §12 | Parameterized queries only; WAL mode; migration system |
| §7.1 — MeshyClient | reqwest-based HTTP client with typed responses | §6, §10 | All API calls through client; errors mapped to MeshyError |
| §11 — Security | API key in OS keychain; no plaintext; no CORS | §7, §12 | Key never in frontend; Rust mediates all secrets |
| §16.1 — User preferences | 16 settings keys with defaults | §8 | settingsStore with persist middleware; SQLite settings table |

### 2.2 TSS Alignment

| TSS Section | TSS Requirement | CSD Section | Conformance |
|---|---|---|---|
| §2 — Tauri 2.x | `tauri.conf.json` with asset protocol, CSP, capabilities | §7 | Asset protocol scope enforced; CSP allows `asset://` |
| §3 — TypeScript 5.7 | `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | §4 | All flags enforced; no `any`; no unchecked indexing |
| §4 — Vite 6 | Manual chunks for react-vendor, three-vendor, query-vendor | §13 | Lazy loading for 3D; code-splitting for Creative Lab |
| §5 — Tailwind 4 + shadcn/ui | `@theme` tokens; shadcn/ui copy-paste components | §9 | No raw hex; no inline styles for colors; token usage only |
| §6 — Zustand 5 + TanStack Query 5 | State boundary: server=Query, UI=Zustand, form=useState | §8 | Enforced per TSS §6.7; selector functions required |
| §7 — R3F 9 + drei 10 | `dpr={[1,2]}`, `frameloop="demand"`, `useGLTF.clear()` | §5, §13 | Canvas lifecycle rules; memory cleanup on unmount |
| §8 — Rust | Edition 2021; `panic = "abort"` in release; clippy `-D warnings` | §6 | No `unwrap()` in production code; clippy enforced in CI |
| §9 — reqwest | `json` + `stream` features; rustls TLS; 120s timeout | §6, §10 | Client builder config; SSE parsing via `bytes_stream()` |
| §10 — rusqlite | `bundled` feature; WAL mode; `Mutex<Connection>` | §6, §12 | Single connection; parameterized queries; pragmas set |
| §11 — keyring | OS keychain; Linux fallback to file with 0600 | §6, §12 | Key never serialized to SQLite or logged |
| §15 — Biome | `biome.json` with lint rules; `noExplicitAny: error` | §4, §18 | Biome runs in CI; pre-commit hook |
| §17 — Dependencies | Exact versions in package.json and Cargo.toml | §14 | Lock files committed; `npm audit` + `cargo audit` weekly |

### 2.3 UI/UX Alignment

| UI/UX Section | UI/UX Requirement | CSD Section | Conformance |
|---|---|---|---|
| §2 — Design tokens | 11 color tokens, 3 radii, 2 fonts; no raw hex in components | §9 | TKN-01–08 enforced via Biome + code review |
| §4 — Component taxonomy | 5 categories with state access matrix | §5 | CMP-01–07; state access matrix enforced |
| §5 — Accessibility | WCAG 2.1 AA; 15 semantic rules, 10 keyboard rules | §5, §12 | KBD-01–10, SEM-01–15 enforced |
| §6 — Performance | 10 rendering rules, 8 data rules, 6 bundle rules | §13 | RND-01–10, DAT-01–08, BDL-01–06 enforced |
| §7 — Decoupling contract | `lib/tauri.ts` is sole IPC import point; 10 contract rules | §7 | CTR-01–10 enforced; no file imports `@tauri-apps/api/core` except `lib/tauri.ts` |
| §12 — Build phases | 6 phases with dependencies and quality gates | §14, §18 | Phases sequential; quality gates must pass before proceeding |

---

## 3. Code Organization Standards

### 3.1 Directory Structure

The project structure is defined in TDD §5. The following rules govern how code is placed within that structure.

| Rule ID | Rule | Rationale |
|---|---|---|
| **ORG-01** | A file may contain at most one exported React component. Utility functions, types, and constants may be co-located if they are used only by that component. | Simplifies imports, testing, and code review |
| **ORG-02** | A file may contain at most one exported Rust struct, enum, or trait. Helper functions and impl blocks for that type may be co-located. | Matches Rust module conventions |
| **ORG-03** | Test files are co-located with the source file: `Foo.tsx` + `Foo.test.tsx` in the same directory. Rust tests are in `#[cfg(test)] mod tests` within the same file. | Reduces navigation distance between code and tests |
| **ORG-04** | Cross-feature imports are prohibited. `src/components/generate/` may not import from `src/components/gallery/`. Shared logic must be extracted to `src/lib/` or `src/hooks/`. | Prevents feature coupling; enables independent build phases |
| **ORG-05** | No circular imports. If module A imports from module B, module B must not import from module A. Use dependency inversion (shared interface in `src/lib/`) if needed. | Prevents runtime initialization errors |
| **ORG-06** | The `src/lib/` directory contains only framework-agnostic utilities, types, and constants. No React imports in `src/lib/`. | Separation of concerns; `lib/` is reusable |
| **ORG-07** | The `src/hooks/` directory contains only custom hooks that call TanStack Query or Tauri commands. No presentation logic in hooks. | Hooks are data-fetching, not rendering |
| **ORG-08** | The `src/stores/` directory contains only Zustand store definitions. No React imports, no TanStack Query imports, no Tauri imports. | Stores are pure state containers |
| **ORG-09** | The `src-tauri/src/commands/` directory contains only `#[tauri::command]` functions. Business logic lives in `src-tauri/src/meshy/`, `src-tauri/src/storage/`, or `src-tauri/src/security/`. | Commands are thin dispatchers; logic is testable in isolation |
| **ORG-10** | No file may exceed 300 lines. If a file exceeds 300 lines, split it into smaller modules. The only exception is auto-generated files (e.g., `schema.sql` embedded via `include_str!`). | Readability, reviewability |

### 3.2 Import Order

All files must organize imports in the following order, separated by blank lines:

```typescript
// 1. Node.js built-in modules
import path from 'node:path';

// 2. External packages (npm)
import { useMutation } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';

// 3. Internal absolute imports (@ alias)
import { invoke } from '@lib/tauri';
import { useAppStore } from '@stores/appStore';
import { useCreateTextTo3D } from '@hooks/useMeshyApi';

// 4. Relative imports (same directory or parent)
import { AssetCard } from './AssetCard';
import { cn } from '../utils';

// 5. Type-only imports (last)
import type { Asset, TaskStatus } from '@lib/meshy-types';
```

```rust
// Rust import order (use statements):

// 1. Standard library
use std::path::PathBuf;
use std::sync::Mutex;

// 2. External crates
use reqwest::Client;
use serde::{Deserialize, Serialize};

// 3. Internal crate modules
use crate::meshy::client::MeshyClient;
use crate::storage::database::Database;

// 4. Tauri
use tauri::{AppHandle, State, Manager};
```

**Enforcement:** Biome's `organizeImports` feature handles frontend automatically. Rust imports are enforced by `cargo fmt` + code review.

### 3.3 Naming Conventions

| Element | Convention | Example | Source |
|---|---|---|---|
| React component files | PascalCase | `TextTo3DPanel.tsx` | UI/UX §4.3 |
| React component names | PascalCase | `export function TextTo3DPanel()` | React convention |
| Custom hook files | camelCase with `use` prefix | `useMeshyApi.ts` | UI/UX §4.3 |
| Custom hook names | camelCase with `use` prefix | `export function useCreateTextTo3D()` | React convention |
| Utility/lib files | kebab-case | `meshy-types.ts` | UI/UX §4.3 |
| Test files | `{ComponentName}.test.tsx` | `TextTo3DPanel.test.tsx` | UI/UX §4.3 |
| Rust module files | snake_case | `client.rs`, `database.rs` | Rust convention |
| Rust struct names | PascalCase | `pub struct MeshyClient` | Rust convention |
| Rust enum names | PascalCase | `pub enum MeshyError` | Rust convention |
| Rust function names | snake_case | `pub async fn create_task()` | Rust convention |
| Rust constant names | SCREAMING_SNAKE_CASE | `const BASE_URL: &str` | Rust convention |
| TypeScript interfaces | PascalCase | `interface AssetRecord` | TS convention |
| TypeScript types | PascalCase | `type TaskStatus = ...` | TS convention |
| TypeScript enums | PascalCase | `enum ExportFormat` | TS convention |
| TypeScript variables | camelCase | `const taskStatus = ...` | TS convention |
| TypeScript constants | SCREAMING_SNAKE_CASE | `const API_BASE_URL = ...` | TS convention |
| CSS custom properties | kebab-case | `--color-bg-primary` | CSS convention |
| Database tables | snake_case | `assets`, `task_log`, `asset_tags` | SQL convention |
| Database columns | snake_case | `created_at`, `meshy_type` | SQL convention |
| Git branches | kebab-case with prefix | `feat/text-to-3d-panel`, `fix/polling-leak` | §14 |
| Git tags | `v` + semver | `v1.0.0`, `v1.1.0-beta` | §14 |

### 3.4 Export Standards

| Rule ID | Rule | Rationale |
|---|---|---|
| **EXP-01** | Use named exports exclusively. No default exports. | Named exports enable refactoring, auto-completion, and consistent import syntax |
| **EXP-02** | Every exported function, type, and constant must have a JSDoc comment (TypeScript) or doc comment (Rust). | Documentation at the export point; see §16 |
| **EXP-03** | Group related exports in a barrel file (`mod.rs` for Rust, `index.ts` for TypeScript) only for `lib/` utilities. Never barrel-export components. | Components should be imported by their file path for clarity |
| **EXP-04** | Re-exports (`export { Foo } from './Foo'`) are prohibited except in `index.ts` barrel files in `src/lib/`. | Explicit import paths are more readable and refactorable |

---

## 4. TypeScript Coding Standards

### 4.1 Compiler Configuration

The TypeScript configuration is defined in TSS §3.3. The following compiler flags are mandatory and must not be relaxed:

| Flag | Value | Rationale |
|---|---|---|
| `strict` | `true` | Enables all strict type checks |
| `noUnusedLocals` | `true` | No unused variables |
| `noUnusedParameters` | `true` | No unused function parameters |
| `noFallthroughCasesInSwitch` | `true` | Every switch case must break or return |
| `noUncheckedIndexedAccess` | `true` | Array/object access returns `T \| undefined` |
| `exactOptionalPropertyTypes` | `true` | `?:` means optional, not `| undefined` |
| `forceConsistentCasingInFileNames` | `true` | Case-sensitive imports |
| `skipLibCheck` | `true` | Skip type checking of `.d.ts` files (performance) |

### 4.2 Type Usage Rules

| Rule ID | Rule | Rationale | Enforcement |
|---|---|---|---|
| **TYP-01** | No `any` type. Use `unknown` with type narrowing, or define a proper type. | `any` disables type checking | Biome: `noExplicitAny: error` |
| **TYP-02** | No `as` type assertions unless narrowing from `unknown` after a runtime check. Example: `const value = JSON.parse(str) as unknown; if (typeof value === 'string') { ... }`. | Type assertions bypass the type system | Code review |
| **TYP-03** | No non-null assertion (`!`) except in test files or when preceded by an explicit null check on the same line. | `!` suppresses null safety | Biome: `noNonNullAssertion: warn` |
| **TYP-04** | Use `interface` for object shapes that may be extended. Use `type` for unions, intersections, and utility types. | Interfaces support declaration merging; types are more flexible | Code review |
| **TYP-05** | Every function parameter and return type must be explicitly typed. No inferred return types for exported functions. | Explicit types are documentation | Code review |
| **TYP-06** | Use `readonly` for all array and object properties that are not mutated after creation. | Prevents accidental mutation | Code review |
| **TYP-07** | Use `as const` for literal arrays and objects that should have literal types. Example: `const FORMATS = ['glb', 'fbx'] as const`. | Enables narrow literal types | Code review |
| **TYP-08** | No `enum` — use union types or `as const` objects instead. Enums have runtime overhead and don't tree-shake. | Union types are zero-cost | Code review |
| **TYP-09** | Generic type parameters must be prefixed with `T` (single letter) for simple cases or descriptive names (`TRequest`, `TResponse`) for complex cases. | Readability | Code review |
| **TYP-10** | Use `satisfies` operator when you want type checking without widening the literal type. Example: `const config = { model: 'meshy-7' } satisfies GenerationConfig`. | Preserves literal types while validating shape | Code review |

### 4.3 Type Definition Patterns

```typescript
// ─── Pattern: Request/Response type pairs ─────────────────────
// Every API request has a corresponding Request type and Response type.
// They are defined in src/lib/meshy-types.ts and imported by hooks.

// GOOD:
export interface TextTo3DPreviewRequest {
  readonly mode: 'preview';
  readonly prompt: string;
  readonly modelType?: 'standard' | 'lowpoly' | 'smart-topology';
  readonly aiModel?: AiModel;
  readonly shouldRemesh?: boolean;
  readonly targetPolycount?: number;
  readonly targetFormats?: readonly ExportFormat[];
}

export interface TaskCreateResponse {
  readonly result: string;
}

// BAD (no types, uses any):
async function createTask(body: any): Promise<any> { ... }
```

```typescript
// ─── Pattern: Discriminated unions for state ───────────────────
// Use discriminated unions for state machines, not boolean flags.

// GOOD:
type TaskState =
  | { status: 'idle' }
  | { status: 'loading'; taskId: string }
  | { status: 'success'; taskId: string; asset: Asset }
  | { status: 'error'; taskId: string; error: MeshyFrontendError };

// BAD (boolean flags):
interface TaskState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  taskId?: string;
  asset?: Asset;
  error?: MeshyFrontendError;
}
```

```typescript
// ─── Pattern: Branded types for IDs ────────────────────────────
// Prevent mixing up a task ID with an asset ID at the type level.

export type TaskId = string & { readonly __brand: 'TaskId' };
export type AssetId = string & { readonly __brand: 'AssetId' };

export function asTaskId(id: string): TaskId {
  return id as TaskId;
}

// Usage:
function pollTask(taskId: TaskId): void { ... }
// Calling pollTask(assetId) is a type error
```

### 4.4 Variable and Function Standards

| Rule ID | Rule | Rationale |
|---|---|---|
| **VAR-01** | Use `const` by default. Use `let` only when reassignment is required. Never use `var`. | Immutability by default |
| **VAR-02** | Variable names must be descriptive. No single-letter names except loop indices (`i`, `j`) or coordinates (`x`, `y`, `z`). | Readability |
| **VAR-03** | Boolean variables must be prefixed with `is`, `has`, `should`, `can`, or `will`: `isLoading`, `hasTextures`, `shouldRemesh`. | Self-documenting |
| **VAR-04** | Function names must be verbs: `createTask`, `downloadAsset`, `formatCredits`. Boolean-returning functions must be prefixed with `is`, `has`, `can`: `isTaskActive`, `hasApiKey`. | Self-documenting |
| **VAR-05** | No magic numbers. Extract to a named constant: `const POLL_INTERVAL_MS = 5000;` not `setTimeout(fn, 5000)`. | Readability, maintainability |
| **VAR-06** | Use template literals for string interpolation: `` `Task ${taskId} failed` `` not `'Task ' + taskId + ' failed'`. | Readability |
| **VAR-07** | Use optional chaining (`?.`) and nullish coalescing (`??`) for safe property access: `task.taskError?.message ?? 'Unknown error'`. | Concise null handling |
| **VAR-08** | No `console.log` in production code. Use the Tauri log plugin for structured logging. `console.log` is permitted in test files only. | Biome: `noConsole: warn` |

---

## 5. React Coding Standards

### 5.1 Component Definition

All React components must be defined as named function declarations, not arrow functions or default exports.

```typescript
// GOOD:
interface TextTo3DPanelProps {
  readonly onGenerated: (taskId: string) => void;
  readonly isGenerating: boolean;
}

export function TextTo3DPanel({ onGenerated, isGenerating }: TextTo3DPanelProps) {
  return ( ... );
}

// BAD (arrow function, default export):
const TextTo3DPanel = ({ onGenerated, isGenerating }: TextTo3DPanelProps) => { ... };
export default TextTo3DPanel;
```

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **RCT-01** | Components are function declarations, not arrow functions. | Function declarations are hoisted; consistent with React docs | — |
| **RCT-02** | No default exports. Named exports only. | ORG-04, EXP-01 | — |
| **RCT-03** | Every component has a named `Props` interface. | CMP-01 | UI/UX §4.4 |
| **RCT-04** | Props are destructured in the function signature, not accessed via `props.xxx`. | Readability | — |
| **RCT-05** | Optional props use `?:` syntax, not `| undefined`. | TYP compliance; `exactOptionalPropertyTypes: true` | TSS §3.3 |
| **RCT-06** | Boolean props are prefixed with `is`, `has`, `should`, `can`. | CMP-06 | UI/UX §4.4 |
| **RCT-07** | Event handler props are prefixed with `on`. | CMP-05 | UI/UX §4.4 |
| **RCT-08** | No component may exceed 200 lines. Extract sub-components if it does. | CMP-07 | UI/UX §4.4 |
| **RCT-09** | Components must not call Tauri `invoke()` directly. They use hooks from `src/hooks/`. | CTR-07 | UI/UX §7.2 |
| **RCT-10** | Components must not import from `@tauri-apps/api/core`. Only `src/lib/tauri.ts` may. | CTR-07 | UI/UX §7.2 |

### 5.2 Hook Rules

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **HOK-01** | Custom hooks must start with `use`. | React convention; linter requires it | — |
| **HOK-02** | Custom hooks in `src/hooks/` must only contain data-fetching logic (TanStack Query, Tauri invoke). No JSX, no rendering logic. | ORG-07 | — |
| **HOK-03** | Hooks must not call other hooks conditionally. All hooks must run on every render. | React Rules of Hooks | — |
| **HOK-04** | `useEffect` must have a dependency array. No `useEffect` without the second argument. | Prevents infinite loops | — |
| **HOK-05** | `useEffect` cleanup functions must be returned for any effect that creates a subscription, event listener, timer, or reference. | Prevents memory leaks | — |
| **HOK-06** | `useMemo` must only be used for expensive computations (> 1ms) or referential equality of objects passed to memoized children. Do not use `useMemo` for primitive values. | RND-05 | UI/UX §6.1 |
| **HOK-07** | `useCallback` must only be used for functions passed as props to memoized children. Do not use `useCallback` for functions used only within the component. | RND-05 | UI/UX §6.1 |
| **HOK-08** | Zustand selectors must use the selector function form: `useAppStore((s) => s.activeView)`, not `useAppStore()` with destructuring. | RND-05 | UI/UX §6.1 |
| **HOK-09** | TanStack Query keys must be stable arrays. Use `useMemo` for keys that depend on state if the key construction is non-trivial. | RND-06 | UI/UX §6.1 |
| **HOK-10** | Hooks must not call Zustand `set()` directly. State mutations happen in the store's action functions, not in hooks. | State ownership clarity | §8 |

### 5.3 Render Optimization Patterns

```typescript
// ─── Pattern: React.memo for 3D viewport wrapper ──────────────
// The 3D Canvas must be memoized so that parent re-renders
// (e.g., sidebar toggle) do not trigger Canvas re-mount.

import { memo } from 'react';

const AssetPreview3DBase = ({ glbPath }: AssetPreview3DProps) => {
  // ... Canvas setup ...
};

export const AssetPreview3D = memo(AssetPreview3DBase);
// Only re-renders when glbPath changes
```

```typescript
// ─── Pattern: Selector functions for Zustand ──────────────────
// Select only the slice of state the component needs.

// GOOD:
const activeView = useAppStore((s) => s.activeView);
const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);

// BAD (subscribes to entire store, re-renders on any change):
const { activeView, sidebarCollapsed } = useAppStore();
```

```typescript
// ─── Pattern: Stable list keys ────────────────────────────────
// Use the Meshy task ID as the key, never the array index.

// GOOD:
{assets.map((asset) => (
  <AssetCard key={asset.id} asset={asset} />
))}

// BAD (index as key — breaks reconciliation on reorder/filter):
{assets.map((asset, index) => (
  <AssetCard key={index} asset={asset} />
))}
```

```typescript
// ─── Pattern: Conditional rendering without && ────────────────
// Use ternary or early return for boolean-based rendering.
// && can render `0` or `""` if the left operand is falsy but not boolean.

// GOOD:
{hasError ? <ErrorBanner error={error} /> : null}
{isLoading && <Spinner />}  // OK here because isLoading is boolean

// BAD (count is number, renders "0" if count is 0):
{assetCount && <span>{assetCount} assets</span>}

// FIX:
{assetCount > 0 && <span>{assetCount} assets</span>}
```

### 5.4 Effect Patterns

```typescript
// ─── Pattern: SSE listener setup and cleanup ───────────────────
// The SSE hook must set up the listener and clean it up on unmount.

export function useTaskStream(taskId: string | null, endpoint: string) {
  const updateTask = useTaskStore((s) => s.updateTask);

  useEffect(() => {
    if (!taskId) return;

    let unlisten: (() => void) | undefined;

    const setup = async () => {
      unlisten = await onEvent<TaskObject>('task-progress', (data) => {
        updateTask(taskId, {
          status: data.status,
          progress: data.progress,
          error: data.taskError?.message ?? null,
        });
      });
      await invoke('stream_task', { endpoint, taskId });
    };

    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, [taskId, endpoint, updateTask]);
}
```

```typescript
// ─── Pattern: Debounced search input ───────────────────────────
// Search queries are debounced to avoid excessive SQLite queries.

export function SearchBar() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: results } = useQuery({
    queryKey: ['assets', debouncedQuery],
    queryFn: () => invoke<Asset[]>('search_assets', { query: debouncedQuery }),
    enabled: debouncedQuery.length > 0,
  });

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

---

## 6. Rust Coding Standards

### 6.1 General Rules

| Rule ID | Rule | Rationale | Enforcement |
|---|---|---|---|
| **RST-01** | No `unwrap()` or `expect()` in production code (non-test). Use `?` operator or explicit `match`. | Panics crash the app | Code review + clippy |
| **RST-02** | No `.clone()` on large structures (`Vec`, `HashMap`, `serde_json::Value`) without a comment explaining why the clone is necessary. | Clones are expensive | Code review |
| **RST-03** | Use `&str` for string parameters, not `&String` or `String`. | `&str` is more general; avoids unnecessary allocation | Clippy |
| **RST-04** | Use `&[T]` for slice parameters, not `&Vec<T>`. | `&[T]` accepts vectors, arrays, and slices | Clippy |
| **RST-05** | Use `String` for owned strings, `&str` for borrowed. Never use `Box<str>`. | Convention | Clippy |
| **RST-06** | All public functions must have doc comments (`///`). | Documentation | Code review |
| **RST-07** | All public structs and enums must derive `Debug`. | Error reporting, logging | Code review |
| **RST-08** | All structs that cross the Tauri IPC boundary must derive `Serialize` and `Deserialize`. | IPC requires serde | Code review |
| **RST-09** | No `unsafe` code. If `unsafe` is required, it must be isolated in a dedicated module with a safety comment. | Memory safety | Code review |
| **RST-10** | No `mut` that is not actually mutated. Clippy catches this. | Correctness | Clippy |
| **RST-11** | Prefer `if let` / `while let` over `match` when only one arm is interesting. | Readability | Clippy |
| **RST-12** | Use `thiserror::Error` derive for all error enums. No manual `impl Error`. | Consistent error handling | Code review |
| **RST-13** | Use `anyhow` only in `main.rs` for top-level error handling. Library code uses `thiserror`. | Library errors are typed; application errors are contextual | Code review |
| **RST-14** | All async functions must be `async fn` with `tokio` runtime. No manual `Future` implementations. | Tokio is the runtime; manual futures are error-prone | Code review |
| **RST-15** | Database access must go through the `Database` struct. No direct `Connection` access outside `storage/database.rs`. | Centralized connection management; WAL mode | ORG-09 |

### 6.2 Error Handling Pattern

```rust
// ─── Pattern: Error enum with thiserror ───────────────────────
// Every module defines its own error enum.
// Errors are converted at module boundaries using `From`.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum MeshyError {
    #[error("API error {status}: {body}")]
    ApiError {
        status: reqwest::StatusCode,
        body: String,
    },

    #[error("Download failed: {0}")]
    DownloadFailed(#[from] reqwest::StatusCode),

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("Filesystem error: {0}")]
    Filesystem(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Missing API key")]
    MissingApiKey,

    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

// ─── Pattern: Error conversion at Tauri boundary ──────────────
// Tauri commands convert MeshyError to a structured JSON string.
// The frontend's parseError() function decodes this.

#[tauri::command]
async fn create_text_to_3d(
    state: State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let client = state.meshy_client().ok_or_else(|| {
        serde_json::to_string(&serde_json::json!({
            "code": "MISSING_API_KEY",
            "message": "No API key configured. Add your key in Settings."
        })).unwrap()
    })?;

    let response = client
        .create_task("/v2/text-to-3d", &body)
        .await
        .map_err(|e| {
            let (code, message) = match &e {
                MeshyError::ApiError { status, body } => {
                    let code = format!("API_ERROR_{}", status.as_u16());
                    let msg = serde_json::from_str::<serde_json::Value>(body)
                        .ok()
                        .and_then(|v| v.get("message").and_then(|m| m.as_str()).map(String::from))
                        .unwrap_or_else(|| body.clone());
                    (code, msg)
                }
                MeshyError::Network(_) => {
                    ("NETWORK_ERROR".to_string(), "Network error. Check your connection.".to_string())
                }
                MeshyError::MissingApiKey => {
                    ("MISSING_API_KEY".to_string(), "No API key configured.".to_string())
                }
                _ => ("UNKNOWN".to_string(), e.to_string()),
            };
            serde_json::to_string(&serde_json::json!({
                "code": code,
                "message": message,
            })).unwrap()
        })?;

    Ok(serde_json::to_value(response).map_err(|e| {
        serde_json::to_string(&serde_json::json!({
            "code": "SERIALIZATION_ERROR",
            "message": e.to_string(),
        })).unwrap()
    })?)
}
```

### 6.3 Struct Design Pattern

```rust
// ─── Pattern: Serde structs with rename_all ───────────────────
// Rust uses snake_case; the frontend uses camelCase.
// serde's rename_all = "camelCase" bridges this automatically.

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskObject {
    pub id: String,
    pub meshy_type: String,        // → meshyType in JSON
    pub status: String,
    pub progress: i64,
    pub created_at: i64,            // → createdAt in JSON
    pub started_at: i64,            // → startedAt in JSON
    pub finished_at: i64,           // → finishedAt in JSON
    pub consumed_credits: i64,      // → consumedCredits in JSON
    pub model_urls: Option<serde_json::Value>,  // → modelUrls
    pub thumbnail_url: Option<String>,          // → thumbnailUrl
    pub texture_urls: Option<serde_json::Value>, // → textureUrls
    pub task_error: Option<serde_json::Value>,  // → taskError
    pub preceding_tasks: i64,      // → precedingTasks
}

// ─── Pattern: Optional fields with skip_serializing_if ────────
// Omit null fields from JSON responses to reduce payload size.

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetRow {
    pub id: String,
    pub meshy_type: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_path: Option<String>,
    // ...
}
```

### 6.4 Async Pattern

```rust
// ─── Pattern: Async function with context propagation ─────────
// All async functions return Result<T, MeshyError>.
// The ? operator propagates errors up the call stack.

pub async fn create_and_wait_for_task(
    &self,
    endpoint: &str,
    body: &serde_json::Value,
    poll_interval: Duration,
) -> Result<serde_json::Value, MeshyError> {
    // Step 1: Create task
    let create_response: TaskCreateResponse = self.create_task(endpoint, body).await?;
    let task_id = &create_response.result;

    // Step 2: Poll until terminal
    loop {
        let task = self.get_task(endpoint, task_id).await?;

        let status = task.get("status")
            .and_then(|s| s.as_str())
            .unwrap_or("PENDING");

        match status {
            "SUCCEEDED" => return Ok(task),
            "FAILED" | "CANCELED" => {
                let error_msg = task.get("taskError")
                    .and_then(|e| e.get("message"))
                    .and_then(|m| m.as_str())
                    .unwrap_or("Task failed without error message");
                return Err(MeshyError::ApiError {
                    status: reqwest::StatusCode::OK,
                    body: error_msg.to_string(),
                });
            }
            _ => {
                tokio::time::sleep(poll_interval).await;
            }
        }
    }
}
```

### 6.5 Database Query Pattern

```rust
// ─── Pattern: Parameterized queries ────────────────────────────
// All queries use params![] macro. No string interpolation in SQL.

// GOOD:
pub fn search_assets(&self, query: &str, tag: Option<&str>) -> Result<Vec<AssetRow>, rusqlite::Error> {
    let conn = self.conn.lock().unwrap();
    let pattern = format!("%{}%", query);

    let mut stmt = conn.prepare(
        "SELECT * FROM assets
         WHERE prompt LIKE ?1 OR notes LIKE ?1
         ORDER BY created_at DESC"
    )?;

    let rows = stmt.query_map(params![pattern], |row| {
        Ok(AssetRow::from_row(row))
    })?;

    rows.collect()
}

// BAD (SQL injection risk):
let sql = format!("SELECT * FROM assets WHERE prompt LIKE '%{}%'", query);
conn.execute(&sql, []);
```

---

## 7. Tauri IPC Coding Standards

### 7.1 Command Definition Rules

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **IPC-01** | Every `#[tauri::command]` function must return `Result<T, String>` where `T: Serialize` and `String` is a JSON-encoded error object. | Consistent error handling on the frontend | UI/UX §7.2 CTR-10 |
| **IPC-02** | Command function parameters must be primitive types (`String`, `i64`, `bool`, `serde_json::Value`) or structs that derive `Deserialize`. No raw `&str` — Tauri requires owned types. | Tauri serialization requirement | — |
| **IPC-03** | Command names must be snake_case: `create_text_to_3d`, not `createTextTo3D`. | Tauri convention; matches Rust function names | — |
| **IPC-04** | Every command must validate its inputs before calling the Meshy API. Missing required fields return an error without consuming API credits. | CTR-09; prevents wasted credits | UI/UX §7.2 |
| **IPC-05** | Commands that call the Meshy API must access the `MeshyClient` via `State<'_, AppState>`, not by constructing a new client. | Single client instance; connection pooling | TDD §7.2 |
| **IPC-06** | Commands must not log the API key, request bodies containing the API key, or response bodies containing signed URLs. | Security; PII protection | §12 |
| **IPC-07** | Commands must emit events via `app.emit()` for long-running operations (SSE streaming, batch downloads). The frontend listens via `onEvent()`. | CTR-06 | UI/UX §7.2 |
| **IPC-08** | No command may block the main thread. All commands are `async fn` and use `tokio` for I/O. | UI responsiveness | — |
| **IPC-09** | Every command must be registered in `main.rs` via `tauri::generate_handler![...]`. Unregistered commands are not callable from the frontend. | Tauri requirement | — |
| **IPC-10** | The frontend calls commands only through `src/lib/tauri.ts`'s `invoke<T>()` wrapper. No direct `@tauri-apps/api/core` imports outside this file. | CTR-07 | UI/UX §7.2 |

### 7.2 Command Signature Pattern

```rust
// ─── Pattern: Standard command signature ─────────────────────
// 1. Access shared state
// 2. Validate inputs
// 3. Call business logic
// 4. Map errors to JSON strings
// 5. Return serializable result

#[tauri::command]
async fn create_image_to_3d(
    state: State<'_, AppState>,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    // 1. Get client (validates API key exists)
    let client = state.meshy_client().ok_or_else(|| {
        error_json("MISSING_API_KEY", "No API key configured. Add your key in Settings.")
    })?;

    // 2. Validate input
    let image_url = body.get("imageUrl")
        .and_then(|v| v.as_str())
        .or_else(|| body.get("inputTaskId").and_then(|v| v.as_str()));

    if image_url.is_none() {
        return Err(error_json(
            "INVALID_INPUT",
            "Either imageUrl or inputTaskId is required.",
        ));
    }

    // 3. Call API
    let response: TaskCreateResponse = client
        .create_task("/v1/image-to-3d", &body)
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;

    // 4. Log to database
    if let Some(db) = state.database() {
        let _ = db.log_task_create(
            &response.result,
            "/v1/image-to-3d",
            &body,
        );
    }

    // 5. Return result
    Ok(serde_json::to_value(response)
        .map_err(|e| error_json("SERIALIZATION_ERROR", &e.to_string()))?)
}

// ─── Helper: JSON error string ────────────────────────────────
fn error_json(code: &str, message: &str) -> String {
    serde_json::to_string(&serde_json::json!({
        "code": code,
        "message": message,
    })).unwrap_or_else(|_| format!("{{\"code\":\"{}\",\"message\":\"{}\"}}", code, message))
}

fn error_json_from_meshy_error(e: &MeshyError) -> String {
    let (code, message) = match e {
        MeshyError::ApiError { status, body } => {
            let code = format!("API_ERROR_{}", status.as_u16());
            let msg = serde_json::from_str::<serde_json::Value>(body)
                .ok()
                .and_then(|v| v.get("message").and_then(|m| m.as_str()).map(String::from))
                .unwrap_or_else(|| body.clone());
            (code, msg)
        }
        MeshyError::Network(_) => ("NETWORK_ERROR".to_string(), "Network error.".to_string()),
        MeshyError::MissingApiKey => ("MISSING_API_KEY".to_string(), "No API key.".to_string()),
        _ => ("UNKNOWN".to_string(), e.to_string()),
    };
    error_json(&code, &message)
}
```

### 7.3 Event Emission Pattern

```rust
// ─── Pattern: SSE streaming with event emission ───────────────
// The Rust backend opens the SSE connection and emits events
// to the frontend. The frontend never opens a network connection.

#[tauri::command]
async fn stream_task(
    state: State<'_, AppState>,
    endpoint: String,
    task_id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let client = state.meshy_client().ok_or_else(|| {
        error_json("MISSING_API_KEY", "No API key configured.")
    })?;

    // Clone app handle for the async closure
    let app_handle = app.clone();

    client
        .stream_task(&endpoint, &task_id, move |data| {
            // Emit to frontend — all listeners receive this event
            let _ = app_handle.emit("task-progress", &data);

            // Check for terminal status
            if let Some(status) = data.get("status").and_then(|s| s.as_str()) {
                if matches!(status, "SUCCEEDED" | "FAILED" | "CANCELED") {
                    let _ = app_handle.emit("task-complete", &serde_json::json!({
                        "taskId": task_id,
                        "status": status,
                    }));
                }
            }
        })
        .await
        .map_err(|e| error_json_from_meshy_error(&e))?;

    Ok(())
}
```

---

## 8. State Management Coding Standards

### 8.1 State Boundary Enforcement

The state boundary is defined in TSS §6.7 and UI/UX §4.2. The following rules are mandatory:

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **STT-01** | Data from the Meshy API or SQLite is managed by TanStack Query. Never store API response data in Zustand. | Server state has its own lifecycle (cache, refetch, invalidation) | TSS §6.7 |
| **STT-02** | UI state (navigation, selection, sidebar, active task tracking) is managed by Zustand. Never use TanStack Query for UI-only state. | UI state is ephemeral and synchronous | TSS §6.7 |
| **STT-03** | User preferences (default AI model, poll interval, auto-download) are managed by Zustand with `persist` middleware. Persisted to localStorage, which Tauri maps to the app data directory. | Preferences survive app restarts | TSS §6.3 |
| **STT-04** | Form state (prompt text, polycount slider, format checkboxes) is managed by React `useState`. Never store form state in Zustand or TanStack Query. | Form state is local and ephemeral; no need for global access | TSS §6.7 |
| **STT-05** | Zustand stores must not import from `@tanstack/react-query` or `@tauri-apps/api`. Stores are pure state containers. | ORG-08 | §3.1 |
| **STT-06** | TanStack Query hooks must not call Zustand `set()`. They may read Zustand state via selectors. | State mutations belong to the store that owns the state | HOK-10 |
| **STT-07** | Components may read from both Zustand and TanStack Query, but mutations to Zustand go through store action functions, and mutations to server state go through TanStack Query mutations. | Clear ownership | — |

### 8.2 Zustand Store Pattern

```typescript
// ─── Pattern: Zustand store with typed actions ────────────────
// The store interface defines both state and actions.
// Actions are the only way to mutate state.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // ── State ──────────────────────────────────────
  readonly defaultAiModel: AiModel;
  readonly defaultTextureResolution: '2k' | '4k' | '8k';
  readonly defaultShouldRemesh: boolean;
  readonly defaultTargetPolycount: number;
  readonly defaultTargetFormats: readonly ExportFormat[];
  readonly defaultEnablePbr: boolean;
  readonly defaultRemoveLighting: boolean;
  readonly defaultPoseMode: string;
  readonly pollIntervalMs: number;
  readonly useSseStreaming: boolean;
  readonly maxConcurrentTasks: number;
  readonly autoDownloadOnSuccess: boolean;
  readonly notifyOnTaskComplete: boolean;

  // ── Actions ────────────────────────────────────
  setDefaultAiModel: (model: AiModel) => void;
  setDefaultTextureResolution: (res: '2k' | '4k' | '8k') => void;
  setPollIntervalMs: (ms: number) => void;
  setUseSseStreaming: (enabled: boolean) => void;
  setAutoDownloadOnSuccess: (enabled: boolean) => void;
  setNotifyOnTaskComplete: (enabled: boolean) => void;
  resetToDefaults: () => void;
}

const DEFAULTS = {
  defaultAiModel: 'latest' as AiModel,
  defaultTextureResolution: '2k' as const,
  defaultShouldRemesh: false,
  defaultTargetPolycount: 30000,
  defaultTargetFormats: ['glb', 'fbx'] as const,
  defaultEnablePbr: true,
  defaultRemoveLighting: true,
  defaultPoseMode: '',
  pollIntervalMs: 5000,
  useSseStreaming: false,
  maxConcurrentTasks: 5,
  autoDownloadOnSuccess: true,
  notifyOnTaskComplete: true,
} satisfies Omit<SettingsState, 'setDefaultAiModel' | 'setDefaultTextureResolution' | 'setPollIntervalMs' | 'setUseSseStreaming' | 'setAutoDownloadOnSuccess' | 'setNotifyOnTaskComplete' | 'resetToDefaults'>;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setDefaultAiModel: (model) =>
        set({ defaultAiModel: model }),

      setDefaultTextureResolution: (res) =>
        set({ defaultTextureResolution: res }),

      setPollIntervalMs: (ms) =>
        set({ pollIntervalMs: Math.max(1000, Math.min(60000, ms)) }),

      setUseSseStreaming: (enabled) =>
        set({ useSseStreaming: enabled }),

      setAutoDownloadOnSuccess: (enabled) =>
        set({ autoDownloadOnSuccess: enabled }),

      setNotifyOnTaskComplete: (enabled) =>
        set({ notifyOnTaskComplete: enabled }),

      resetToDefaults: () =>
        set(DEFAULTS),
    }),
    {
      name: 'meshyforge-settings',
      version: 1,
      // Only persist user-modifiable settings, not computed defaults
      partialize: (state) => ({
        defaultAiModel: state.defaultAiModel,
        defaultTextureResolution: state.defaultTextureResolution,
        defaultShouldRemesh: state.defaultShouldRemesh,
        defaultTargetPolycount: state.defaultTargetPolycount,
        defaultTargetFormats: state.defaultTargetFormats,
        defaultEnablePbr: state.defaultEnablePbr,
        defaultRemoveLighting: state.defaultRemoveLighting,
        defaultPoseMode: state.defaultPoseMode,
        pollIntervalMs: state.pollIntervalMs,
        useSseStreaming: state.useSseStreaming,
        maxConcurrentTasks: state.maxConcurrentTasks,
        autoDownloadOnSuccess: state.autoDownloadOnSuccess,
        notifyOnTaskComplete: state.notifyOnTaskComplete,
      }),
    },
  ),
);
```

### 8.3 TanStack Query Hook Pattern

```typescript
// ─── Pattern: Mutation hook with cache invalidation ───────────
// Every mutation that changes server state must invalidate
// dependent queries so the UI stays in sync.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { TextTo3DPreviewRequest, TaskCreateResponse } from '@lib/meshy-types';

export function useCreateTextTo3D() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (body: TextTo3DPreviewRequest) => {
      return await invoke<TaskCreateResponse>('create_text_to_3d', { body });
    },

    onSuccess: (_data, _variables) => {
      // Credit balance changes after every task creation
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
    },

    onError: (error) => {
      // Error is already typed as MeshyFrontendError by lib/tauri.ts
      // The component's onError handler will display the toast
      console.error('Failed to create text-to-3D task:', error);
    },

    retry: 0,  // Never retry mutations (user action)
  });
}
```

```typescript
// ─── Pattern: Query hook with conditional polling ─────────────
// Polling stops when the task reaches a terminal status.

import { useQuery } from '@tanstack/react-query';
import { invoke } from '@lib/tauri';
import type { TaskObject } from '@lib/meshy-types';

export function usePollTask(taskId: string | null, endpoint: string) {
  return useQuery({
    queryKey: ['task', taskId],

    queryFn: async () => {
      return await invoke<TaskObject>('poll_task', { endpoint, taskId });
    },

    enabled: taskId !== null,

    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELED') {
        return false;  // Stop polling
      }
      return 5000;  // Poll every 5 seconds
    },

    refetchIntervalInBackground: true,  // Continue polling when window is not focused
  });
}
```

### 8.4 Store-to-Component Data Flow

```
User clicks "Generate"
    │
    ▼
TextTo3DPanel (Feature component)
    │
    ├── reads form state from useState
    ├── reads defaultAiModel from useSettingsStore((s) => s.defaultAiModel)
    ├── calls useCreateTextTo3D().mutate(body)
    │       │
    │       ▼
    │   lib/tauri.ts: invoke<TaskCreateResponse>('create_text_to_3d', { body })
    │       │
    │       ▼
    │   Tauri IPC → Rust command → MeshyClient → reqwest POST
    │       │
    │       ▼
    │   Response: { result: "task-123" }
    │       │
    │       ▼
    │   TanStack Query mutation onSuccess:
    │     - qc.invalidateQueries(['credit-balance'])
    │     - useTaskStore.getState().addTask({ taskId: "task-123", ... })
    │       │
    │       ▼
    │   TaskMonitor (Composite component) re-renders
    │   because it subscribes to useTaskStore
    │
    ├── calls usePollTask("task-123", "/v2/text-to-3d")
    │       │
    │       ▼
    │   lib/tauri.ts: invoke<TaskObject>('poll_task', { endpoint, taskId })
    │       │
    │       ▼
    │   Tauri IPC → Rust command → MeshyClient → reqwest GET
    │       │
    │       ▼
    │   Response: { status: "SUCCEEDED", modelUrls: { glb: "..." } }
    │       │
    │       ▼
    │   usePollTask's refetchInterval returns false (terminal status)
    │       │
    │       ▼
    │   Component reads query.data, calls useDownloadAsset().mutate()
    │       │
    │       ▼
    │   lib/tauri.ts: invoke('download_asset', { taskId, modelUrls, ... })
    │       │
    │       ▼
    │   Tauri IPC → Rust command → reqwest download → save to disk
    │       │
    │       ▼
    │   Response: { filePaths: { glb: "/path/..." }, thumbnailPath: "..." }
    │       │
    │       ▼
    │   TanStack Query mutation onSuccess:
    │     - qc.invalidateQueries(['assets'])
    │     - useTaskStore.getState().updateTask("task-123", { status: "SUCCEEDED" })
    │       │
    │       ▼
    │   AssetGrid re-renders (subscribes to useAssets query)
    │   TaskMonitor updates (subscribes to useTaskStore)
    │   Toast appears (Sonner)
```

---

## 9. Styling Coding Standards

### 9.1 Tailwind Usage Rules

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **STY-01** | No raw hex color values in `className` strings. Use Tailwind color utilities (`bg-zinc-900`, `text-indigo-500`) or `var(--color-*)` references. | TKN-01 | UI/UX §2.2 |
| **STY-02** | No inline `style={{ color: "#..." }}` for colors. Inline styles only for dynamic values (progress width, tag color from user input). | TKN-02 | UI/UX §2.2 |
| **STY-03** | Font sizes use Tailwind's type scale (`text-xs` through `text-2xl`). No `text-[14px]`. | TKN-03 | UI/UX §2.2 |
| **STY-04** | Spacing uses Tailwind's spacing scale (`p-1` through `p-12`, `gap-1` through `gap-8`). No `p-[12px]`. | TKN-04 | UI/UX §2.2 |
| **STY-05** | Border radius uses Tailwind's radius scale (`rounded-sm`, `rounded-md`, `rounded-lg`). Maps to `--radius-sm/md/lg`. | TKN-05 | UI/UX §2.2 |
| **STY-06** | Shadows use Tailwind's shadow scale (`shadow-sm`, `shadow-md`, `shadow-lg`). No custom shadow definitions. | TKN-06 | UI/UX §2.2 |
| **STY-07** | Transitions use Tailwind's duration scale (`duration-150`, `duration-200`, `duration-300`). No `duration-[250ms]`. | TKN-08 | UI/UX §2.2 |
| **STY-08** | Use `cn()` utility (from `src/lib/utils.ts`) for conditional class merging. Never use template literals for class composition. | Consistent class merging; tailwind-merge resolves conflicts | TSS §5.6 |
| **STY-09** | No `!important` in Tailwind classes. If specificity is an issue, restructure the component, not the CSS. | Specificity wars | Code review |
| **STY-10** | No `@apply` in component CSS files. `@apply` is only permitted in `globals.css` for base element styling. | `@apply` breaks tree-shaking; Tailwind 4 prefers direct utility usage | Code review |

### 9.2 Class Composition Pattern

```typescript
// ─── Pattern: cn() for conditional classes ─────────────────────

import { cn } from '@lib/utils';

// GOOD:
<Button
  className={cn(
    'w-full',
    isGenerating && 'opacity-50 cursor-not-allowed',
  )}
>

// BAD (template literal — no conflict resolution):
<Button
  className={`w-full ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
>

// BAD (array join — no conflict resolution):
<Button
  className={['w-full', isGenerating && 'opacity-50 cursor-not-allowed'].filter(Boolean).join(' ')}
>
```

### 9.3 shadcn/ui Modification Rules

| Rule ID | Rule | Rationale |
|---|---|---|
| **SUI-01** | shadcn/ui components are owned source files. Modify them freely, but document the changes in a comment at the top of the file. | Traceability of deviations from upstream |
| **SUI-02** | Do not update shadcn/ui components via `npx shadcn@latest add` after initial installation unless intentionally pulling an upstream fix. | Prevents surprise overwrites of custom modifications |
| **SUI-03** | When modifying a shadcn/ui component, change only the Tailwind classes. Do not change the component's structural JSX or Radix integration. | Preserves accessibility and behavior guarantees |
| **SUI-04** | Every shadcn/ui component must use the `cn()` utility for class merging. The default shadcn/ui template already does this. | STY-08 |
| **SUI-05** | The `variant` prop on shadcn/ui components must use the `cva` (class-variance-authority) pattern already present in the template. Do not replace `cva` with conditional logic. | Consistent variant system |

### 9.4 Dark Theme Only

The app is dark-theme only for MVP (TDD §9.5, TSS §5.4). The following rules apply:

| Rule ID | Rule | Rationale |
|---|---|---|
| **DRK-01** | No `dark:` Tailwind prefix in any component. The app is always dark. | No light mode exists; prefix is dead code |
| **DRK-02** | No `prefers-color-scheme: light` media queries. | No light mode |
| **DRK-03** | All colors are from the dark palette defined in `@theme`. No light-mode color values. | Consistency |
| **DRK-04** | Future light mode support (post-MVP) will require adding `dark:` prefixes retroactively. This is documented as technical debt. | §17 |

---

## 10. Error Handling Strategy

### 10.1 Error Flow (End-to-End)

The error flow is defined in UI/UX §7.5. This section codifies the implementation.

```
Layer 1: Meshy API
    ↓ HTTP 4xx/5xx response
Layer 2: Rust reqwest
    ↓ reqwest::Response with non-success status
Layer 3: Rust MeshyClient
    ↓ MeshyError::ApiError { status, body }
Layer 4: Rust Tauri command
    ↓ Err(String) — JSON-encoded error: {"code":"API_ERROR_402","message":"..."}
Layer 5: TypeScript lib/tauri.ts
    ↓ parseError() converts to MeshyFrontendError: { code, message, details? }
Layer 6: TanStack Query mutation
    ↓ onError callback receives MeshyFrontendError
Layer 7: React component
    ↓ onError handler displays toast (Sonner) or inline error
Layer 8: User
    ↓ sees actionable error message
```

### 10.2 Error Code Catalog

Every error has a stable code. The frontend uses these codes to display specific messages and actions.

| Code | Source | User Message | User Action |
|---|---|---|---|
| `MISSING_API_KEY` | Rust: keychain empty | "No API key configured. Add your key in Settings." | Button: "Open Settings" |
| `API_ERROR_400` | Meshy: 400 Bad Request | "Invalid request: {message}" | None (user fixes form) |
| `API_ERROR_401` | Meshy: 401 Unauthorized | "API key invalid or expired." | Button: "Update API Key" |
| `API_ERROR_402` | Meshy: 402 Payment Required | "Insufficient credits. Purchase credits at meshy.ai." | Link: meshy.ai/settings/subscription |
| `API_ERROR_404` | Meshy: 404 Not Found | "Task not found. It may have been deleted." | None |
| `API_ERROR_429` | Meshy: 429 Too Many Requests | "Rate limit reached. Retrying in {seconds}s..." | Auto-retry with backoff |
| `API_ERROR_500` | Meshy: 500+ Server Error | "Server error. Retrying..." | Auto-retry (max 2) |
| `NETWORK_ERROR` | Rust: reqwest error | "Network error. Check your connection." | Button: "Retry" |
| `SERIALIZATION_ERROR` | Rust: serde error | "Internal error: failed to parse response." | None (report bug) |
| `DATABASE_ERROR` | Rust: rusqlite error | "Database error. Try restarting the app." | None |
| `FILESYSTEM_ERROR` | Rust: io::Error | "File system error: {message}" | None |
| `INVALID_INPUT` | Rust: validation | "Invalid input: {message}" | None (user fixes form) |
| `UNKNOWN` | Any unhandled error | "An unexpected error occurred." | None |

### 10.3 Frontend Error Handling Pattern

```typescript
// ─── Pattern: Component error handler ─────────────────────────
// Every mutation has an onError handler that displays a toast
// with the appropriate message and action based on the error code.

import { toast } from 'sonner';
import type { MeshyFrontendError } from '@lib/tauri';

function handleMutationError(error: MeshyFrontendError): void {
  switch (error.code) {
    case 'MISSING_API_KEY':
      toast.error('No API Key', {
        description: 'Add your Meshy API key in Settings to start generating.',
        action: {
          label: 'Open Settings',
          onClick: () => useAppStore.getState().setActiveView('settings'),
        },
      });
      break;

    case 'API_ERROR_401':
      toast.error('Invalid API Key', {
        description: 'Your API key is invalid or expired.',
        action: {
          label: 'Update Key',
          onClick: () => useAppStore.getState().setActiveView('settings'),
        },
      });
      break;

    case 'API_ERROR_402':
      toast.error('Insufficient Credits', {
        description: 'Purchase more credits at meshy.ai to continue.',
        action: {
          label: 'Buy Credits',
          onClick: () => openUrl('https://www.meshy.ai/settings/subscription'),
        },
      });
      break;

    case 'API_ERROR_429':
      toast.warning('Rate Limited', {
        description: 'Too many requests. The app will retry automatically.',
      });
      break;

    case 'NETWORK_ERROR':
      toast.error('Network Error', {
        description: 'Check your internet connection and try again.',
        action: {
          label: 'Retry',
          onClick: () => window.location.reload(),
        },
      });
      break;

    default:
      toast.error('Error', {
        description: error.message,
      });
  }
}

// Usage in component:
const mutation = useCreateTextTo3D();

const handleGenerate = () => {
  mutation.mutate(body, {
    onError: handleMutationError,
    onSuccess: (data) => {
      toast.success('Task Created', {
        description: 'Your 3D model is being generated.',
      });
    },
  });
};
```

### 10.4 React Error Boundary

```typescript
// ─── Pattern: Error boundary for 3D viewport ──────────────────
// The 3D Canvas may crash if WebGL is unavailable or the GLB
// file is corrupted. An error boundary catches this and shows
// the thumbnail image instead.

import { Component, type ReactNode } from 'react';

interface Props {
  readonly fallback: ReactNode;
  readonly children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.error('3D Canvas error:', error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Usage:
<CanvasErrorBoundary fallback={<ThumbnailImage path={thumbnailPath} />}>
  <AssetPreview3D glbPath={glbPath} />
</CanvasErrorBoundary>
```

---

## 11. Testing Coding Standards

### 11.1 Test File Structure

```typescript
// ─── Pattern: Component test file structure ───────────────────
// Each test file follows the same structure:
// 1. Imports
// 2. Test setup (mocks, providers)
// 3. Describe blocks grouped by behavior
// 4. Each test has: arrange → act → assert

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TextTo3DPanel } from './TextTo3DPanel';
import { invoke } from '@tauri-apps/api/core';

// ─── Test setup ───────────────────────────────────────────────
function renderWithProviders() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={qc}>
      <TextTo3DPanel />
    </QueryClientProvider>,
  );
}

// ─── Tests grouped by behavior ────────────────────────────────
describe('TextTo3DPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders prompt input', () => { ... });
    it('renders generate button', () => { ... });
    it('renders AI model selector with default "latest"', () => { ... });
  });

  describe('validation', () => {
    it('disables generate button when prompt is empty', () => { ... });
    it('shows error when prompt exceeds 600 characters', () => { ... });
  });

  describe('generation', () => {
    it('calls invoke with correct payload on generate', async () => { ... });
    it('shows loading state during mutation', async () => { ... });
    it('shows success toast on completion', async () => { ... });
  });

  describe('error handling', () => {
    it('shows insufficient credits toast on 402', async () => { ... });
    it('shows invalid API key toast on 401', async () => { ... });
  });

  describe('accessibility', () => {
    it('supports keyboard navigation to all controls', async () => { ... });
    it('has aria-label on icon-only buttons', () => { ... });
    it('associates labels with inputs', () => { ... });
  });
});
```

### 11.2 Test Naming Convention

| Rule ID | Rule | Rationale |
|---|---|---|
| **TST-01** | Test names start with a verb: "renders", "disables", "calls", "shows", "supports". | Describes behavior, not implementation |
| **TST-02** | Test names describe the expected behavior, not the implementation: "disables generate button when prompt is empty", not "test button disabled state". | Tests should survive refactoring |
| **TST-03** | Use `describe` blocks to group tests by behavior category: "rendering", "validation", "generation", "error handling", "accessibility". | Organized test output |
| **TST-04** | Each test must have exactly one `expect` that is the primary assertion. Additional `expect` calls for preconditions are allowed. | Single responsibility per test |
| **TST-05** | Use `userEvent` over `fireEvent` for user interactions. `userEvent` simulates real user behavior (focus, typing, clicking). | More realistic testing |
| **TST-06** | No `console.log` in tests. Use `vi.fn()` and `expect(fn).toHaveBeenCalledWith(...)` to verify side effects. | Tests should be quiet |
| **TST-07** | Mock Tauri `invoke` at the module level in `src/test/setup.ts`. Individual tests override the mock return value. | Consistent mocking |
| **TST-08** | No snapshot tests. Snapshot tests are brittle and don't test behavior. | Brittle tests |
| **TST-09** | Every `useEffect` cleanup must be tested. If a hook sets up a listener, the test must verify the listener is removed on unmount. | HOK-05 |
| **TST-10** | Rust tests use `#[tokio::test]` for async functions. No `block_on()` calls. | Tokio runtime management |

### 11.3 Rust Test Pattern

```rust
// ─── Pattern: Rust unit test with wiremock ─────────────────────
use wiremock::{MockServer, Mock, ResponseTemplate};
use super::*;

#[tokio::test]
async fn test_get_balance_success() {
    // Arrange
    let server = MockServer::start().await;
    Mock::given(wiremock::method("GET"))
        .and(wiremock::path("/v1/balance"))
        .and(wiremock::header("Authorization", "Bearer msy_test_key"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "balance": 500
        })))
        .mount(&server)
        .await;

    let client = MeshyClient::new("msy_test_key".to_string(), server.uri());

    // Act
    let result = client.get_balance().await;

    // Assert
    assert!(result.is_ok());
    assert_eq!(result.unwrap().balance, 500);
}

#[tokio::test]
async fn test_get_balance_401_unauthorized() {
    // Arrange
    let server = MockServer::start().await;
    Mock::given(wiremock::method("GET"))
        .and(wiremock::path("/v1/balance"))
        .respond_with(ResponseTemplate::new(401).set_body_json(serde_json::json!({
            "message": "Invalid API key"
        })))
        .mount(&server)
        .await;

    let client = MeshyClient::new("msy_invalid_key".to_string(), server.uri());

    // Act
    let result = client.get_balance().await;

    // Assert
    assert!(result.is_err());
    match result.unwrap_err() {
        MeshyError::ApiError { status, .. } => {
            assert_eq!(status, reqwest::StatusCode::UNAUTHORIZED);
        }
        _ => panic!("Expected ApiError"),
    }
}
```

### 11.4 Test Coverage Requirements

| Module | Coverage Target | Source |
|---|---|---|
| `src/components/` (all components) | ≥ 70% lines | UI/UX §13.1 |
| `src/hooks/` (all hooks) | ≥ 80% lines | — |
| `src/lib/` (utilities) | ≥ 90% lines | — |
| `src/stores/` (Zustand stores) | ≥ 80% lines | — |
| `src-tauri/src/meshy/` (API client) | ≥ 80% lines | — |
| `src-tauri/src/storage/` (database) | ≥ 80% lines | — |
| `src-tauri/src/commands/` (Tauri commands) | ≥ 60% lines | — |
| `src-tauri/src/security/` (keychain) | ≥ 50% lines (platform-dependent) | — |

---

## 12. Security Coding Standards

### 12.1 API Key Protection

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **SEC-01** | The API key is stored in the OS keychain via the `keyring` crate. It is never written to SQLite, config files, or environment variables. | TSS §11 | TDD §11 |
| **SEC-02** | The frontend never receives the raw API key. The `get_api_key` Tauri command returns `Option<String>`, but the frontend stores only a boolean `hasApiKey` in Zustand. | CTR-03 | UI/UX §7.2 |
| **SEC-03** | The `MeshyClient` is constructed with the API key read from the keychain. The key lives in Rust memory for the app's lifetime. It is never serialized to JSON or passed to the frontend. | TDD §7.1 | — |
| **SEC-04** | No log statement may include the API key. The `log` crate calls must not reference the key variable. | PII protection | — |
| **SEC-05** | No request body sent to the Meshy API may contain the API key in the body. The key is sent only in the `Authorization: Bearer` header. | Meshy API requirement | — |
| **SEC-06** | Signed download URLs from Meshy responses are not logged. They may contain temporary credentials. | Temporary credential protection | — |
| **SEC-07** | The `tauri.conf.json` CSP must not allow `connect-src` to arbitrary origins. Only `self` and `asset:` are permitted. | Prevents data exfiltration | TSS §2.3 |
| **SEC-08** | The Tauri capabilities file must only grant permissions to the `dialog`, `notification`, and `shell:open` scopes. No `fs:write` or `http:default` permissions. | Least privilege | TSS §2.4 |

### 12.2 Input Validation

| Rule ID | Rule | Rationale |
|---|---|---|
| **VAL-01** | All Tauri command inputs must be validated in Rust before calling the Meshy API. Missing required fields return `INVALID_INPUT` error without consuming credits. | CTR-09; prevents wasted credits |
| **VAL-02** | String inputs must be length-checked. Prompts must not exceed 600 characters (Meshy limit). Task IDs must be valid UUIDs. | Prevents API errors |
| **VAL-03** | Numeric inputs must be range-checked. `target_polycount` must be 100–300,000. `height_meters` must be positive. | Prevents API errors |
| **VAL-04** | File paths from the OS file dialog must be canonicalized before use. No `..` traversal. | Path traversal prevention |
| **VAL-05** | Image file uploads must be validated by extension (`.jpg`, `.jpeg`, `.png`, `.webp`) and by MIME type (via file magic bytes in Rust). | Prevents non-image uploads |
| **VAL-06** | All SQL queries must use parameterized statements (`params![]`). No string interpolation in SQL. | SQL injection prevention | RST pattern §6.5 |

### 12.3 Error Sanitization

| Rule ID | Rule | Rationale |
|---|---|---|
| **SAN-01** | Error messages sent to the frontend must not contain the API key, internal file paths, or stack traces. | Information disclosure prevention |
| **SAN-02** | HTTP error bodies from the Meshy API are passed through to the frontend as-is (they are Meshy's messages, not internal system messages). | Meshy error messages are user-facing |
| **SAN-03** | Rust panic messages must not be displayed to the user. The Tauri command returns a generic "Internal error" message instead. | Panic messages may contain sensitive info |
| **SAN-04** | Database error messages must be generic: "Database error. Try restarting the app." The specific SQLite error is logged via the log plugin, not shown to the user. | SQLite errors may contain schema info |

---

## 13. Performance Coding Standards

### 13.1 Frontend Performance

| Rule ID | Rule | Rationale | Source |
|---|---|---|---|
| **PRF-01** | The R3F Canvas must use `frameloop="demand"` when idle and `frameloop="always"` during user interaction (pointer down). | VP-02 | UI/UX §10.1 |
| **PRF-02** | The R3F Canvas must use `dpr={[1, 2]}`. No `window.devicePixelRatio`. | VP-03 | UI/UX §10.1 |
| **PRF-03** | `useGLTF.clear(path)` must be called on 3D preview unmount. | VP-07 | UI/UX §10.1 |
| **PRF-04** | The 3D preview component must be wrapped in `React.memo`. | RND-01 | UI/UX §6.1 |
| **PRF-05** | Gallery lists must use stable keys (Meshy task ID). Never use array index as key. | RND-02 | UI/UX §6.1 |
| **PRF-06** | Gallery must virtualize when asset count exceeds 100. Use `@tanstack/react-virtual`. | RND-03 | UI/UX §6.1 |
| **PRF-07** | No `useEffect` may perform synchronous computation > 5ms. Heavy work goes to Rust. | RND-04 | UI/UX §6.1 |
| **PRF-08** | Zustand selectors must use the function form: `useStore((s) => s.field)`. | RND-05 | UI/UX §6.1 |
| **PRF-09** | TanStack Query keys must be stable. Use `useMemo` for complex keys. | RND-06 | UI/UX §6.1 |
| **PRF-10** | The `three-vendor` chunk is lazy-loaded via `React.lazy()`. | BDL-02 | UI/UX §6.3 |
| **PRF-11** | No component may import from `three` directly. All Three.js access via R3F/drei. | BDL-04 | UI/UX §6.3 |
| **PRF-12** | Lucide icons must use named imports, not barrel imports. | BDL-05 | UI/UX §6.3 |
| **PRF-13** | TanStack Query DevTools are gated behind `import.meta.env.DEV`. | BDL-06 | UI/UX §6.3 |
| **PRF-14** | Task polling stops on terminal status (`refetchInterval` returns `false`). | DAT-02 | UI/UX §6.2 |
| **PRF-15** | Credit balance refetches at most every 60 seconds. | DAT-04 | UI/UX §6.2 |
| **PRF-16** | Thumbnails load from local filesystem via `asset://` protocol, not remote URLs. | DAT-05 | UI/UX §6.2 |
| **PRF-17** | Search is debounced (300ms minimum). | FRM pattern | UI/UX §8.2 |
| **PRF-18** | Initial JS bundle ≤ 300 KB gzipped. | BDL-01 | UI/UX §6.3 |

### 13.2 Backend Performance

| Rule ID | Rule | Rationale |
|---|---|---|
| **BPR-01** | SQLite must use WAL mode (`journal_mode = WAL`) and `synchronous = NORMAL`. | Write performance; concurrent reads |
| **BPR-02** | SQLite cache size must be set to 64MB (`cache_size = -64000`). | Reduces disk I/O for frequent queries |
| **BPR-03** | HTTP client must use connection pooling (`pool_max_idle_per_host = 5`). | Reduces TLS handshake overhead |
| **BPR-04** | File downloads must stream to disk, not buffer in memory. The `download_file` function writes chunks as they arrive. | MEM-05; prevents memory spikes on large models |
| **BPR-05** | SSE stream parsing must process lines incrementally, not buffer the entire response. | Memory efficiency for long-running streams |
| **BPR-06** | The SQLite connection is guarded by a `Mutex`. Reads are concurrent (WAL mode); writes are serialized. | Prevents database corruption |
| **BPR-07** | Max 3 concurrent file downloads (semaphore in Rust). | Prevents network saturation |
| **BPR-08** | Orphaned asset directories (deleted from DB but files remain) are cleaned up on app startup. | Disk space management |

### 13.3 Memory Management Pattern

```rust
// ─── Pattern: Streaming file download ─────────────────────────
// Download files in chunks, writing to disk as data arrives.
// Never buffer the entire file in memory.

use tokio::io::AsyncWriteExt;

pub async fn download_file_streaming(
    &self,
    url: &str,
    dest_path: &std::path::Path,
) -> Result<u64, MeshyError> {
    let response = self.http.get(url).send().await?;

    if !response.status().is_success() {
        return Err(MeshyError::DownloadFailed(response.status()));
    }

    let mut file = tokio::fs::File::create(dest_path).await
        .map_err(|e| MeshyError::Filesystem(e))?;

    let mut stream = response.bytes_stream();
    let mut total_bytes: u64 = 0;

    use futures_util::StreamExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        file.write_all(&chunk).await
            .map_err(|e| MeshyError::Filesystem(e))?;
        total_bytes += chunk.len() as u64;
    }

    file.flush().await.map_err(|e| MeshyError::Filesystem(e))?;

    Ok(total_bytes)
}
```

---

## 14. Git and Version Control Standards

### 14.1 Branch Strategy

MeshyForge uses a simple branching model appropriate for a personal project:

```
main          ← Stable, releasable code. Every commit on main passes CI.
  │
  ├── feat/*  ← Feature branches (merged to main via PR or fast-forward)
  ├── fix/*   ← Bug fix branches
  ├── chore/* ← Maintenance (deps, config, refactoring)
  └── docs/*  ← Documentation changes
```

| Rule ID | Rule | Rationale |
|---|---|---|
| **GIT-01** | `main` is always green. CI must pass before merge. | Releasable main |
| **GIT-02** | Branch names follow `{type}/{kebab-case-description}`: `feat/text-to-3d-panel`, `fix/polling-memory-leak`, `chore/update-deps`. | Consistency |
| **GIT-03** | Branches are short-lived (max 1 week). Long-lived branches cause merge conflicts. | Integration frequency |
| **GIT-04** | Squash merge to `main`. One commit per PR. Clean history. | Readable git log |
| **GIT-05** | No direct commits to `main`. All changes go through a branch. | Audit trail |
| **GIT-06** | Tag releases with `v{major}.{minor}.{patch}`: `v1.0.0`, `v1.1.0`. | Semantic versioning |
| **GIT-07** | `package-lock.json` and `Cargo.lock` are committed. | Reproducible builds |
| **GIT-08** | `.env` files, API keys, and `src-tauri/target/` are in `.gitignore`. | No secrets in git |

### 14.2 Commit Message Convention

```
{type}({scope}): {description}

{optional body}

{optional footer}
```

| Type | Meaning | Example |
|---|---|---|
| `feat` | New feature | `feat(generate): add text-to-3D panel with form validation` |
| `fix` | Bug fix | `fix(tasks): stop polling when task reaches terminal status` |
| `refactor` | Code restructuring (no behavior change) | `refactor(tauri): extract error_json helper to shared module` |
| `perf` | Performance improvement | `perf(gallery): virtualize asset grid above 100 items` |
| `test` | Test addition or fix | `test(client): add wiremock tests for 402 and 429 errors` |
| `docs` | Documentation | `docs(tdd): update endpoint coverage matrix` |
| `chore` | Maintenance, deps, config | `chore(deps): bump three.js to 0.170.0` |
| `style` | Formatting, linting (no logic change) | `style(biome): apply biome format to all source files` |
| `ci` | CI/CD changes | `ci: add Linux build to release workflow` |

**Scope** is the module or component affected: `generate`, `gallery`, `tasks`, `settings`, `tauri`, `client`, `database`, `keychain`, `export`, `3d`.

**Rules:**
- Description is lowercase, imperative mood: "add", "fix", "update", not "added", "fixed".
- Description is ≤ 72 characters.
- Body explains why, not what (the diff shows what).
- Footer references issues: `Closes #42`, `Refs #17`.

### 14.3 Pull Request Standards

| Rule ID | Rule |
|---|---|
| **PR-01** | Every PR must have a description explaining the change and linking to the relevant build phase. |
| **PR-02** | Every PR must pass all CI checks before merge. |
| **PR-03** | PRs that add new Tauri commands must include Rust tests for those commands. |
| **PR-04** | PRs that add new React components must include component tests. |
| **PR-05** | PRs that modify the IPC contract (`lib/tauri.ts` or `commands/*.rs`) must update `meshy-types.ts` on both sides. |
| **PR-06** | No PR may introduce a new dependency without justification in the PR description. |
| **PR-07** | PRs are squash-merged. The squash commit message follows the commit convention from §14.2. |

### 14.4 `.gitignore` Standard

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
src-tauri/target/
src-tauri/gen/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*

# Test outputs
coverage/
test-results/
playwright-report/

# Tauri
src-tauri/target/
src-tauri/gen/schemas/

# Database (never commit local DB)
*.db
*.db-journal
*.db-wal
*.db-shm

# API keys (never commit secrets)
*.key
secrets.json
```

---

## 15. Code Review Standards

### 15.1 Review Checklist

Every code review must verify the following:

#### TypeScript / React

- [ ] No `any` types (TYP-01)
- [ ] No non-null assertions without justification (TYP-03)
- [ ] All exported functions have explicit return types (TYP-05)
- [ ] Components are function declarations with named exports (RCT-01, RCT-02)
- [ ] Props interface is named and exported (RCT-03, CMP-01)
- [ ] No component exceeds 200 lines (RCT-08, CMP-07)
- [ ] No direct `@tauri-apps/api/core` imports outside `lib/tauri.ts` (RCT-10, CTR-07)
- [ ] Zustand selectors use function form (HOK-08, RND-05)
- [ ] TanStack Query keys are stable (HOK-09, RND-06)
- [ ] `useEffect` has dependency array and cleanup (HOK-04, HOK-05)
- [ ] No `console.log` in production code (VAR-08)
- [ ] `cn()` used for class merging (STY-08)
- [ ] No raw hex colors in className (STY-01, TKN-01)
- [ ] No `dark:` prefix (DRK-01)
- [ ] List items have stable keys (RND-02)
- [ ] Accessibility: labels, aria-labels, focus-visible (KBD-03, SEM-02, SEM-03)

#### Rust

- [ ] No `unwrap()` or `expect()` in non-test code (RST-01)
- [ ] All errors use `?` operator or explicit match (RST-01)
- [ ] Error enum derives `thiserror::Error` (RST-12)
- [ ] All public items have doc comments (RST-06)
- [ ] All IPC structs derive `Serialize`/`Deserialize` with `rename_all = "camelCase"` (RST-08)
- [ ] All SQL queries use `params![]` (VAL-06, RST pattern §6.5)
- [ ] No `unsafe` code (RST-09)
- [ ] Async functions use `async fn` with tokio (RST-14)
- [ ] Database access via `Database` struct only (RST-15)
- [ ] Command inputs validated before API call (VAL-01, IPC-04)
- [ ] No API key in log statements (SEC-04)

#### Testing

- [ ] New components have test files (TST co-location)
- [ ] Tests follow naming convention (TST-01, TST-02)
- [ ] Tests use `userEvent` over `fireEvent` (TST-05)
- [ ] No snapshot tests (TST-08)
- [ ] Rust tests use `#[tokio::test]` for async (TST-10)
- [ ] Coverage thresholds met (§11.4)

#### Security

- [ ] API key not exposed to frontend (SEC-02, CTR-03)
- [ ] No secrets in log statements (SEC-04, SEC-06)
- [ ] File paths canonicalized (VAL-04)
- [ ] Error messages sanitized (SAN-01, SAN-03, SAN-04)

#### Performance

- [ ] 3D Canvas uses `frameloop="demand"` (PRF-01)
- [ ] `useGLTF.clear()` on unmount (PRF-03)
- [ ] Gallery virtualizes above 100 items (PRF-06)
- [ ] No synchronous heavy computation in `useEffect` (PRF-07)
- [ ] Lazy loading for 3D and Creative Lab (PRF-10)
- [ ] File downloads stream to disk (BPR-04)

### 15.2 Review Process

1. **Self-review**: Author reviews their own diff before requesting review.
2. **Automated checks**: CI must pass (lint, type-check, test, clippy).
3. **Manual review**: Reviewer walks through the checklist above.
4. **Approval**: Reviewer approves with "LGTM" or requests changes with specific feedback.
5. **Merge**: Author squash-merges after approval.

---

## 16. Documentation Standards

### 16.1 Inline Documentation

#### TypeScript (JSDoc)

```typescript
/**
 * Creates a Text to 3D task via the Meshy API.
 *
 * The task goes through two stages: preview (mesh only) and
 * refine (texture application). This hook creates the preview
 * stage. The refine stage is triggered separately after the
 * preview succeeds.
 *
 * @param body - The preview request payload. Must include `mode: "preview"` and `prompt`.
 * @returns TanStack Query mutation result.
 *
 * @example
 * ```ts
 * const mutation = useCreateTextTo3D();
 * mutation.mutate({ mode: 'preview', prompt: 'a monster mask' });
 * ```
 */
export function useCreateTextTo3D() {
  // ...
}
```

#### Rust (doc comments)

```rust
/// Creates a new task on the Meshy API.
///
/// Sends a POST request to the specified endpoint with the given
/// request body. The API returns a task ID immediately; the caller
/// must poll or stream to track progress.
///
/// # Arguments
///
/// * `endpoint` - The API path, e.g. `/v2/text-to-3d`
/// * `body` - The JSON request body
///
/// # Returns
///
/// A `TaskCreateResponse` containing the task ID.
///
/// # Errors
///
/// Returns `MeshyError::ApiError` if the API returns a non-success
/// status code. Returns `MeshyError::Network` on connection failure.
pub async fn create_task(
    &self,
    endpoint: &str,
    body: &serde_json::Value,
) -> Result<TaskCreateResponse, MeshyError> {
    // ...
}
```

### 16.2 Documentation Rules

| Rule ID | Rule | Rationale |
|---|---|---|
| **DOC-01** | Every exported function, type, and constant must have a JSDoc comment (TS) or doc comment (Rust). | EXP-02 |
| **DOC-02** | JSDoc must include `@param` for each parameter and `@returns` for the return value. | Completeness |
| **DOC-03** | Rust doc comments must include `# Arguments`, `# Returns`, and `# Errors` sections. | Rust convention |
| **DOC-04** | Every JSDoc must include an `@example` block showing typical usage. | Discoverability |
| **DOC-05** | Inline comments explain *why*, not *what*. The code shows what; the comment explains the reasoning. | Avoid noise |
| **DOC-06** | No commented-out code in the repository. Delete it. Git history preserves it. | Clean codebase |
| **DOC-07** | `README.md` must include: project description, prerequisites, setup instructions, development commands, build instructions, and links to design documents. | Onboarding |
| **DOC-08** | `docs/CONTRIBUTING.md` must include: development setup, code conventions summary, testing instructions, and PR process. | Onboarding |
| **DOC-09** | `docs/CHANGELOG.md` must follow the [Keep a Changelog](https://keepachangelog.com/) format. | Standardized changelog |
| **DOC-10** | Design documents (TDD, TSS, UI/UX, CSD) are versioned. Changes require a new version number and a changelog entry at the top of the document. | Document traceability |

---

## 17. Technical Debt Management

### 17.1 Technical Debt Register

All technical debt must be tracked in a dedicated section of the project's GitHub Issues, labeled `tech-debt`. Each debt item includes:

| Field | Description |
|---|---|
| **Title** | Short description |
| **Description** | What was deferred and why |
| **Impact** | What happens if this is not addressed |
| **Effort** | Estimated effort (S/M/L) |
| **Phase** | When it was introduced (build phase) |
| **Resolution** | When it was resolved (version or date) |

### 17.2 Known Technical Debt (MVP)

| ID | Title | Description | Impact | Effort | Phase |
|---|---|---|---|---|---|
| **TD-01** | Dark theme only | No light mode. `dark:` Tailwind prefixes not used. Adding light mode requires retroactive prefixes on every component. | No light mode for users who prefer it | L | Phase 5 |
| **TD-02** | No auto-update | Tauri's `updater` plugin not configured. Users must manually download new releases. | Users run stale versions | M | Post-MVP |
| **TD-03** | No i18n | All UI text is hardcoded in English. No internationalization framework. | Non-English users | L | Post-MVP |
| **TD-04** | No prompt preset persistence | Presets are planned for Phase 5 but may be deferred if time-constrained. | Users re-enter common settings each session | S | Phase 5 |
| **TD-05** | Linux keychain fallback | If no secret service daemon is running, API key is stored in a file with 0600 permissions. Less secure than keychain. | Key exposed to processes running as the same user | S | Phase 1 |
| **TD-06** | No batch generation queue | Multiple prompts/images cannot be queued in a single batch. Each generation is manual. | Power users must generate one at a time | M | Post-MVP |
| **TD-07** | SSE streaming is opt-in | Default is polling (5s interval). SSE is more efficient but adds complexity. | Slightly higher API request count with polling | S | Phase 3 |

### 17.3 Debt Management Rules

| Rule ID | Rule |
|---|---|
| **DEBT-01** | Every PR that introduces technical debt must create a `tech-debt` issue with the debt details. |
| **DEBT-02** | Every PR that resolves technical debt must close the corresponding issue and update the debt register. |
| **DEBT-03** | Technical debt items must be reviewed at the end of each build phase. Items older than 2 phases must be addressed or explicitly deferred with justification. |
| **DEBT-04** | No PR may introduce more than 2 new technical debt items without explicit approval. |
| **DEBT-05** | The `tech-debt` label in GitHub Issues is the single source of truth for all deferred work. No debt is tracked in spreadsheets, external docs, or memory. |

---

## 18. Enforcement Mechanisms

### 18.1 Automated Enforcement

| Standard Category | Tool | CI Step | Blocks Merge? |
|---|---|---|---|
| TypeScript lint (no `any`, no console) | Biome | `npx biome check src/` | ✅ Yes |
| TypeScript types | `tsc --noEmit` | Type check | ✅ Yes |
| React hooks rules | ESLint plugin | `npx eslint src/` | ✅ Yes |
| Import order | Biome `organizeImports` | `npx biome check --write src/` (auto-fix) | ❌ Auto-fixed |
| Rust lint | Clippy | `cargo clippy -- -D warnings` | ✅ Yes |
| Rust format | rustfmt | `cargo fmt -- --check` | ✅ Yes |
| Rust tests | cargo test | `cargo test` | ✅ Yes |
| Frontend tests | Vitest | `npm run test -- --coverage` | ✅ Yes (threshold) |
| Build smoke test | Tauri build | `npm run tauri build` | ✅ Yes |
| Dependency audit | npm audit + cargo audit | Weekly schedule | ❌ Warning only |

### 18.2 Pre-commit Hook

```bash
# .husky/pre-commit
#!/usr/bin/env sh

# Run Biome lint + format (auto-fix)
npx biome check --write src/ 2>/dev/null

# Stage auto-fixed files
git add src/

# Type check (fast, no emit)
npx tsc --noEmit

# Rust format check
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check

# Rust clippy
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

### 18.3 Manual Enforcement

| Standard Category | Method | Frequency |
|---|---|---|
| Accessibility (KBD, SEM, CLR, MOT) | Manual test per UI/UX §13.2 | End of each build phase |
| Performance (RND, DAT, BDL, MEM) | React DevTools Profiler + memory audit | End of Phase 3 and Phase 5 |
| Cross-platform compatibility | Full workflow test on macOS, Windows, Linux | End of Phase 5 |
| Code review checklist | §15.1 | Every PR |
| Technical debt review | §17.3 | End of each build phase |

### 18.4 Standard Violation Severity

| Severity | Meaning | Action |
|---|---|---|
| **Block** | Standard violation prevents merge. CI fails. | Fix before merge. |
| **Warn** | Standard violation is flagged but does not prevent merge. | Fix in a follow-up PR. |
| **Info** | Standard is not met but is a recommendation, not a requirement. | Consider fixing. |

### 18.5 Severity Assignment

| Standard Prefix | Default Severity | Notes |
|---|---|---|
| TYP-01 (no `any`) | Block | Biome enforces |
| TYP-03 (no `!`) | Warn | Biome warns |
| TYP-08 (no `enum`) | Warn | Code review |
| RCT-08 (200 line limit) | Warn | First violation is a warning; repeated violations block |
| HOK-04 (useEffect deps) | Block | ESLint enforces |
| STY-01 (no raw hex) | Block | Biome enforces |
| SEC-01–08 (security) | Block | All security standards are blocking |
| VAL-06 (SQL injection) | Block | No exceptions |
| PRF-18 (bundle size) | Block | Build fails if exceeded |
| All accessibility (KBD, SEM, CLR, MOT) | Block | WCAG AA is mandatory |
| All contract (CTR) | Block | Decoupling is mandatory |
| All Rust (RST) | Block | Clippy enforces most; code review enforces rest |

---

## 19. Standard Cross-Reference Index

### 19.1 All Standards by ID

| ID | Category | Description | Source |
|---|---|---|---|
| ORG-01–10 | Organization | File structure, import rules, naming | This document §3 |
| EXP-01–04 | Exports | Named exports, JSDoc, barrel files | This document §3.4 |
| TYP-01–10 | TypeScript | Type usage, no any, discriminated unions | This document §4.2 |
| VAR-01–08 | Variables | const, naming, no magic numbers | This document §4.4 |
| RCT-01–10 | React | Function declarations, props, line limit | This document §5.1 |
| HOK-01–10 | Hooks | Custom hook rules, useEffect, useMemo | This document §5.2 |
| RST-01–15 | Rust | No unwrap, thiserror, async, DB access | This document §6.1 |
| IPC-01–10 | Tauri IPC | Command signatures, validation, events | This document §7.1 |
| STT-01–07 | State | Zustand/Query boundary, store patterns | This document §8.1 |
| STY-01–10 | Styling | Tailwind tokens, cn(), no dark: prefix | This document §9.1 |
| SUI-01–05 | shadcn/ui | Component ownership, modification rules | This document §9.3 |
| DRK-01–04 | Dark theme | Dark-only rules | This document §9.4 |
| SEC-01–08 | Security | API key, CSP, keychain | This document §12.1 |
| VAL-01–06 | Validation | Input validation, SQL injection | This document §12.2 |
| SAN-01–04 | Sanitization | Error message sanitization | This document §12.3 |
| PRF-01–18 | Performance (frontend) | R3F, virtualization, lazy loading, polling | This document §13.1 |
| BPR-01–08 | Performance (backend) | SQLite, HTTP pooling, streaming | This document §13.2 |
| TST-01–10 | Testing | Naming, userEvent, no snapshots | This document §11.2 |
| GIT-01–08 | Git | Branch naming, commit convention, lock files | This document §14.1 |
| PR-01–07 | Pull requests | CI, tests, squash merge | This document §14.3 |
| DOC-01–10 | Documentation | JSDoc, Rust docs, README, changelog | This document §16.2 |
| DEBT-01–05 | Tech debt | Register, review, label | This document §17.3 |
| TKN-01–08 | Design tokens | No raw hex, no inline styles | UI/UX §2.2 |
| LAY-01–08 | Layout | Grid, scroll areas, z-index | UI/UX §3.2 |
| CMP-01–07 | Components | Props interface, prop drilling, line limit | UI/UX §4.4 |
| KBD-01–10 | Keyboard | Tab order, focus visible, Escape | UI/UX §5.2 |
| SEM-01–15 | Semantic HTML | Labels, ARIA, roles, live regions | UI/UX §5.3 |
| CLR-01–07 | Color contrast | 4.5:1 minimum, non-color indicators | UI/UX §5.4 |
| MOT-01–04 | Motion | Reduced motion, no auto-scroll | UI/UX §5.6 |
| RND-01–10 | Rendering | Re-renders, keys, virtualization | UI/UX §6.1 |
| DAT-01–08 | Data loading | Polling, thumbnails, staleTime | UI/UX §6.2 |
| BDL-01–06 | Bundle | Chunk splitting, lazy loading, tree-shaking | UI/UX §6.3 |
| MEM-01–05 | Memory | Canvas unmount, GLTF clear, gcTime | UI/UX §6.4 |
| CTR-01–10 | Decoupling | lib/tauri.ts sole import, no direct HTTP | UI/UX §7.2 |
| VP-01–08 | 3D viewport | Canvas lifecycle, dpr, frameloop | UI/UX §10.1 |
| CAM-01–06 | Camera | Position, damping, bounds | UI/UX §10.2 |
| 3D-A11Y-01–04 | 3D accessibility | aria-label, role=img, text description | UI/UX §10.4 |
| RES-01–06 | Responsive | Sidebar collapse, grid columns, breakpoints | UI/UX §11.2 |
| FRM-01–10 | Forms | Labels, validation, fieldset, keyboard | UI/UX §8.2 |
| **Total** | **126 + 72 = 198** | | |

---