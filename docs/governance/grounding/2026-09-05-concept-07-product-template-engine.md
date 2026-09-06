# Grounding: Concept #7 — "Modular Product Template Engine"

**Status:** Grounding complete. **The audit's premise is wrong, and the real
finding is more urgent than the proposal it was attached to.**

## Audit's stated premise (from the source document)

> Current Implementation: Hardcoded panel forms for keychains, magnets,
> keycaps, and lamps.
> Design Concept: An extensible product template schema where new product
> types define bounding volumes, connector geometry, and parameter schemas
> independently of the underlying AI provider.

This assumes today's Creative Lab feature *works*, just isn't modular. It
doesn't work as specified. See below.

## Current state (file:line evidence)

**FRD spec (`docs/feature_requirements_documentation.md`):** FR-CLAB-01
through FR-CLAB-07 are all **Must**-priority, Phase-3 features (lines
246-252). Each names a distinct Meshy Creative Lab product type (Keychain,
Fridge Magnet, Figure, Vinyl Figure, Brick Figure, Lamp, Keycap) with its own
two-stage prototype→build flow, a per-type build-options schema (14 fields
for Keychain/Fridge Magnet — FR-CLAB-01-F2/02-F2 — 10 for Lamp, 3 for
Keycap), distinct output-format selectors, distinct credit costs (6/30
prototype/build for most, 12/50 for Keycap), and per-type validation rules
(FR-CLAB-06-F1: text/image_url mutually exclusive; FR-CLAB-07-F2:
input_task_id + candidate_id both required; FR-CLAB-05-F2: 403 on IP-flagged
images).

**Backend has real, distinct infrastructure for every one of these**, already
shipped: `src-tauri/src/provider/types.rs:62-165` defines all 14 `TaskType`
variants (`CreativeLabKeychainPrototype`, `CreativeLabKeychainBuild`, ... down
to `CreativeLabKeycapBuild`) each mapped to its own real Meshy endpoint
string. `src-tauri/src/provider/meshy.rs` and `src-tauri/src/meshy/models.rs`
also reference `CreativeLab` types. ADR-0004's Context section itself already
counted "the 14 Creative Lab variants" as part of the preserved `TaskType`
taxonomy.

**Frontend even has a typed request shape for this**, unused:
`src/lib/meshy-types.ts:359-364` defines `CreativeLabRequest { type, mode,
prompt, inputTaskId }`.

**But `CreativeLabPanel.tsx` (100 lines, the entire panel) never uses any of
it.** `handleGenerate()` (lines 35-49) calls `useCreateTextTo3D()` — the
generic Text-to-3D preview hook — and builds the request as:
```
const fullType = `${selectedType}-${mode}`;
const body: TextTo3DPreviewRequest = {
  mode: 'preview',
  prompt: `${fullType}: ${prompt.trim()}`,
};
```
That is, it fakes the product type by **string-prefixing it onto the prompt
of a generic Text-to-3D call**. No build-options object is ever collected or
sent (none of the 14/10/3 fields per type). No `input_task_id` chaining from
a succeeded prototype to a build call. No output-format selector. No
mutually-exclusive text/image input. No mm-scale geometry options. No
`useCreateCreativeLab`-shaped hook exists in `src/hooks/useMeshyApi.ts` at
all (grepped — only generic/other-endpoint hooks are defined there, e.g.
`useCreateRigging`, `useCreateRemesh`, etc., lines 72-171).

**The test suite locks the bug in as expected behavior.**
`CreativeLabPanel.test.tsx` TC-GEN-02-02/03 explicitly assert `mutate` is
called with `prompt: 'creative-lab-keychain-prototype: a cute astronaut'` —
i.e. the tests verify the string-hack, not real Creative Lab behavior. A
green test suite here gives false confidence.

## What this actually means

Every "Creative Lab" generation today fires a generic Text-to-3D preview task
with a decorative, meaningless prompt prefix — not a real Meshy Creative Lab
prototype/build call. It almost certainly does not produce the FRD-specified
outputs (correct real-world millimeter dimensions, correct output format
bundles, correct credit costs) since Meshy's real Creative Lab endpoints are
never invoked. This is a **functional correctness bug spanning all 7
product types**, not an architecture/modularity gap.

## Reframing Concept #7

The audit's proposal (decouple product templates from the provider,
extensible schema for new product types) is a reasonable *future* idea, but
it is not this repo's actual problem right now. The actual problem is one
tier below it: **the already-designed, already-typed, already-backend-wired
Creative Lab contract has never been connected on the frontend.** Building a
generic template-engine abstraction on top of a feature that doesn't call
real endpoints yet would compound the gap, not close it (same caution ADR-0004
raised about deepening coupling before fixing what exists).

## Precedent search record

- Searched `docs/` for "template engine", "product template", "modular
  product" — zero results outside the audit source itself.
- This matches an already-known pattern in this repo: **TASK-0011** (Resize
  panel bug) was the identical shape — types and backend contract already
  correct on both sides, frontend simply never wired to them. TASK-0011 was
  classified T1, no ADR needed, because "this fits inside the already-accepted
  TaskProvider/ResizeRequest contract (ADR-0004), no new architecture, no
  schema/IPC-boundary shape change, just a missing UI input." The same
  reasoning applies here, at larger scope (7 product types instead of 1
  resize mode).

## Recommended classification (not an ADR)

Per `.claude/skills/adr-log/SKILL.md` Step 2: **no criterion fires.** This is
inline-covered — the contract already exists on both sides per ADR-0004; no
IPC/schema/dependency change; cheaply reversible; matches an already-settled
precedent (TASK-0011). This should be logged as its own ledger task,
**separate from and prior to** any "modular template engine" architectural
work, classified the same way TASK-0011 was: risk_level 1, capability_tier
T1. The template-engine idea (Concept #7 as originally stated) should be
deferred as a distinct, later, lower-priority backlog item — it has no
urgency until the underlying feature actually works.

## Open questions

- Does Meshy's real Creative Lab API silently accept and "succeed" on a
  generic Text-to-3D call with a decorative prompt prefix (producing a
  plausible-looking but wrong asset), or does it produce an obviously
  wrong/generic result a user would immediately notice? Not verifiable
  without a live API key — worth an explicit manual smoke test before/after
  the fix lands, since this bug may have been silently producing wrong
  outputs for every Creative Lab use to date.
- Whether `CreativeLabRequest` (meshy-types.ts:359) is referenced anywhere
  else (e.g. a half-finished hook) was not exhaustively checked beyond
  `useMeshyApi.ts` and `CreativeLabPanel.tsx` — worth a repo-wide grep before
  implementation starts.
