---
name: new-rust-ts-type-pair
description: >-
  Scaffolds one new serde struct/enum in src-tauri/src/meshy/models.rs
  together with its matching TypeScript interface/type in
  src/lib/meshy-types.ts, applying rust_type_definitions.md's field-by-field
  conventions verbatim (Option<T> with vs. without skip_serializing_if,
  shared-enum promotion for repeated inline unions, numeric-literal
  comments, r#type, camelCase-except-wire-format-enums). Use when adding or
  extending a single request/response/domain type pair. Do NOT use for
  scaffolding a whole new Meshy endpoint (command + hooks + store wiring —
  use new-meshy-endpoint) or for adding a query/mutation hook (use
  new-query-hook).
---

# New Rust/TS Type Pair

Adds one Rust struct or enum to `src-tauri/src/meshy/models.rs` and its matching TypeScript type to `src/lib/meshy-types.ts`, following the conventions rust_type_definitions.md establishes by example across all ~20 existing types.

## 0. Source of truth — read this before writing either side

> **"TDD §6.2's TypeScript type definitions remain the single source of truth for the MeshyForge data model. This document [rust_type_definitions.md] is a derived artifact. If the two ever diverge, TDD §6.2 wins, and this file must be regenerated from it."** (rust_type_definitions.md §1)

Concretely: design the field list against `technical_design_document.md` §6.2 (`src/lib/meshy-types.ts`) first, or against the matching `Meshy_Documentation/*.md` API doc if the field doesn't exist in TS yet. The Rust struct is a translation of that, not an independent design. If you're adding a field Meshy's API has but TDD §6.2 doesn't list yet, add it to the **TypeScript** interface first, then mirror to Rust — never the reverse.

## 1. Required imports

Every new code in `models.rs` assumes these are already at the top of the file (rust_type_definitions.md §1.1):
```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
```

## 2. The Option<T> split — the rule most likely to get conflated

This is **two different rules that produce the same Rust type with a different attribute**, per rust_type_definitions.md §6 row 1:

| TS source shape | Rust type | Attribute |
|---|---|---|
| **Required-but-nullable**: `field: T \| null` (no `?:`) — field always present on the wire, value may be `null` | `Option<T>` | **without** `#[serde(skip_serializing_if = "Option::is_none")]` |
| **Truly optional**: `field?: T` — field may be absent entirely | `Option<T>` | **with** `#[serde(skip_serializing_if = "Option::is_none")]` |

Verified examples already in the codebase: `Asset.prompt: string \| null` and all five `TextureUrl` fields → `Option<T>` with no skip attribute (`Asset`, `TextureUrl` structs). Every optional field on every `*Request` struct (e.g. `ImageTo3DRequest.enable_pbr`) → `Option<T>` **with** the skip attribute. Get this backwards and a required-nullable field silently disappears from the JSON instead of serializing as `null`, or an optional field starts always appearing as `null` instead of being omitted.

## 3. Repeated inline TS unions → one shared named enum, not a redefinition per struct

TDD §6.2 uses anonymous inline string-literal unions (e.g. `topology?: 'quad' | 'triangle'`) at multiple call sites because TypeScript allows that; Rust struct fields need a named type. **Before defining a new enum, check whether one of these nine already-promoted shared enums covers your field** (rust_type_definitions.md §2.5):

| Enum | Wire values | Serde | Used by |
|---|---|---|---|
| `TextTo3DMode` | `preview` / `refine` | `rename_all = "lowercase"` | `TextTo3D{Preview,Refine}Request.mode` |
| `ModelType` | `standard` / `lowpoly` / `smart-topology` | `rename_all = "kebab-case"` | `TextTo3DPreviewRequest`, `ImageTo3DRequest` |
| `Topology` | `quad` / `triangle` | `rename_all = "lowercase"` | 4 request structs |
| `PoseMode` | `a-pose` / `t-pose` / `''` | per-variant `rename` | `TextTo3DPreviewRequest`, `ImageTo3DRequest`, `MultiImageTo3DRequest`, and (narrower — see below) `TextToImageRequest` |
| `OriginAt` | `bottom` / `center` | `rename_all = "lowercase"` | 5 request structs |
| `TextureResolution` | `2k`/`4k`/`8k` | per-variant `rename` (digit-leading) | 4 request structs |
| `ImageAiModel` | `nano-banana`/`nano-banana-2`/`nano-banana-pro`/`gpt-image-2` | per-variant `rename` | `TextToImageRequest`, `ImageToImageRequest` |
| `AspectRatio` | `1:1`…`2:3` | per-variant `rename` (colon) | `TextToImageRequest`, `ImageToImageRequest` |
| `PostProcessOperationType` | `change_fps`/`fbx2usdz`/`extract_armature` | per-variant `rename` | `AnimationRequest.postProcess` |

If a TS union at your new field's call site is a **strict subset** of one of these (e.g. `TextToImageRequest.poseMode` omits the empty-string case `PoseMode` otherwise has), reuse the same enum with a doc comment noting the narrower usage — don't fork a near-duplicate enum (rust_type_definitions.md §6 row 3). Only define a genuinely new shared enum if none of the nine fit and the union repeats (or is likely to repeat) across more than one struct.

## 4. Numeric literal unions → `Option<uN>` with a doc comment, not a numeric enum

`decimationMode?: 1 | 2 | 3 | 4` and `fps?: 24 | 25 | 30 | 60` are modeled as plain `Option<u8>` with a `///` doc comment listing the valid values — **not** a numeric-discriminant Rust enum, because serde round-trips those awkwardly (needs custom impls to serialize as bare integers rather than objects). Example:
```rust
/// Valid values: `1` (ultra), `2` (high), `3` (medium), `4` (low).
#[serde(skip_serializing_if = "Option::is_none")]
pub decimation_mode: Option<u8>,
```

## 5. `type` as a field/struct name → `r#type`

`TaskObject.type: MeshyType` (TS, unchanged name) becomes `pub r#type: MeshyType` in Rust — `type` is a reserved word. No explicit `#[serde(rename)]` is needed on the field: `rename_all = "camelCase")]` on the container maps the identifier `type` to the wire name `"type"` unchanged (camelCase of a single lowercase word is itself). Same pattern for `taskError.type?: string` → `TaskError.r#type: Option<String>`.

## 6. Casing — camelCase is a *struct field-name* rule, not an *enum-value* rule

These are two separate concerns; do not apply one where the other belongs:

- **Struct field names**: every struct gets `#[serde(rename_all = "camelCase")]` (bridges Rust `snake_case` fields ↔ MeshyForge's own IPC/wire convention). This applies uniformly — `Asset`, `TextureUrl`, every `*Request`, `TaskObject`, `TaskError`, `TaskCreateResponse`, `BalanceResponse`, `AnimationPostProcess`. **There is no struct exception to this** in the current type set.
- **Enum wire *values*** must match **Meshy's own API string literals**, which are never camelCase — they're whatever Meshy's API actually sends/expects: `TaskStatus` uses `rename_all = "SCREAMING_SNAKE_CASE"` (`PENDING`, `IN_PROGRESS`, …) because that's Meshy's own convention; `ExportFormat`/`Topology`/`OriginAt`/`TextTo3DMode` use `rename_all = "lowercase"`; `ModelType` uses `"kebab-case"`; `AiModel`/`MeshyType`/`TextureResolution`/`ImageAiModel`/`AspectRatio`/`PostProcessOperationType` use explicit per-variant `#[serde(rename = "...")]` where case-conversion can't reproduce the wire string (digits, colons, mixed prefixes like `meshy-7`).

> **Precision note on the brief that seeded this skill**: the "camelCase on every struct except the status enum" framing conflates these two rules. It is more accurate as: *field names are always camelCase (no exception)*; *enum values always match Meshy's wire format and are never camelCase (nine different enums, several different serde strategies, picked per how well `rename_all` reproduces the actual wire string)*. `TaskStatus`'s `SCREAMING_SNAKE_CASE` is simply the most visually distinct example of the second rule, not a one-off exception to the first.

## 7. Other established conventions, apply as they come up

- **`Record<string, string>` → `HashMap<String, String>`** (or `Option<HashMap<...>>` if the field is also optional) — `Asset.filePaths`, `TaskObject.modelUrls`/`thumbnailUrls`.
- **Anonymous inline TS object types → named nested Rust structs** — Rust has no inline struct-field syntax. `AnimationRequest.postProcess?: {...}` → `AnimationPostProcess`; `TaskObject.taskError: {...} | null` → `TaskError`.
- **Physical/fractional measurements → `f64`; counts/timestamps/credits → `i64`.** `resizeHeight`, `resizeLongestSide`, `heightMeters` are `f64` (fractional real-world values); `progress`, `createdAt`/`startedAt`/`finishedAt`, `consumedCredits`, `targetPolycount` stay `i64`.
- **Derives**: `Debug` on every public struct/enum (RST-07); `Serialize, Deserialize` on anything crossing the Tauri IPC boundary (RST-08) — which is everything in `models.rs`. Small fieldless string-backed enums additionally get `Copy, PartialEq, Eq` (idiomatic, no RST rule caps additional derives) — request/response structs get `Clone` but not `Copy` (they own `String`/`Vec`/`HashMap` fields).

## 8. TypeScript-side rules (coding_standards.md §4)

- **TYP-08: no `enum`.** Every Meshy-facing union on the TS side is a string-literal union type, matching `models.rs`'s enums as unions, not TS `enum` (enums have runtime overhead and don't tree-shake).
- **TYP-04**: `interface` for object shapes that may be extended (requests, `Asset`, `TaskObject`); `type` for unions (`TaskStatus`, `AiModel`, `MeshyType`, `ExportFormat`).
- **CTR-01**: the Rust struct and TS interface must have identical field names modulo the snake_case/camelCase serde conversion — same field, same optionality (TS `?:` ↔ Rust `Option<T>` + skip_serializing_if; TS `T | null` ↔ Rust `Option<T>` without it).

## 9. Before finishing

Cross-check every field of the new struct against its TDD §6.2 TypeScript source line-by-line — don't invent a field that isn't in TDD §6.2, and don't drop one that is. This is the standard rust_type_definitions.md itself was held to (its closing line references validating against "technical_design_document.md lines 416–661").
