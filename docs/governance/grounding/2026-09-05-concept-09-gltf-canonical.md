# Grounding Memo — Concept 09: GLTF/GLB Canonical Asset Interchange Architecture

Date: 2026-09-05
Status: Read-only grounding research. No implementation, schema, or doc changes made.

## Current state

### Schema (`src-tauri/migrations/001_initial.sql`)

The only migration file is `src-tauri/migrations/001_initial.sql` (confirmed via
`Glob src-tauri/migrations/*.sql` — one result). It is included at build/runtime
by `src-tauri/src/storage/database.rs:21` (`Database::open`) and `:31`
(`Database::open_in_memory`) via `include_str!("../../migrations/001_initial.sql")`.

The `assets` table (`001_initial.sql:5-32`) already assumes **multiple format
files per asset**, not one:

```
file_paths      TEXT NOT NULL DEFAULT '{}',  -- JSON: { "glb": "...", "fbx": "...", ... }
texture_paths   TEXT NOT NULL DEFAULT '[]',  -- JSON: [{ "base_color": "...", "metallic": "...", ... }]
```
(`001_initial.sql:16-17`)

`file_paths` is a JSON object keyed by format string (`glb`, `fbx`, `obj`,
`stl`, `usdz`, `3mf` per `ExportFormat` in
`docs/technical_design_document.md:439`), not a single-format-path column.
This is identical, verbatim, to `docs/technical_design_document.md:345`
(TDD §6.1) — the migration's header comment (`001_initial.sql:2`, "Source: TDD
§6.1") confirms TDD is upstream of the migration and they have not drifted.

### Download/save pipeline (as-shipped)

Two Rust code paths handle a completed task, both registered in
`src-tauri/src/lib.rs:31-70`'s `generate_handler!` list:

1. **`save_completed_task`** (`src-tauri/src/commands/assets.rs:314-336`,
   inner logic `:247-310`) — called by the frontend when a task reaches
   `SUCCEEDED`. It writes the **remote** Meshy-signed `model_urls` object
   directly into the `file_paths` column as-is (`assets.rs:269-272`,
   `let file_paths_json = model_urls....to_string()`), with `downloaded_at: 0`
   (`assets.rs:297`). At this point nothing has been downloaded — `file_paths`
   temporarily holds remote URLs, not local paths.

2. **`download_asset`** (`src-tauri/src/commands/api.rs:511-524`, inner logic
   `download_asset_inner` `:129-240`) — iterates every key/value pair in the
   `model_urls` JSON object passed to it (`api.rs:148-169`) and downloads
   **each format present** to `asset_dir.join(model_filename(format))`, then
   calls `state.database.mark_downloaded` (`api.rs:222-233`,
   `database.rs:128-155`) which overwrites `file_paths` with the local-path
   JSON object and sets `downloaded_at`. Every URL is validated against the
   `assets.meshy.ai` host allowlist first (`api.rs:152,173,196`, per
   ADR-0002). There is no format selection logic here — whatever formats
   appear as keys in `model_urls` all get downloaded and permanently stored.
   Per ADR-0002's own citation of `Meshy_Documentation/01-quickstart.md:72`,
   Meshy returns "Each format (GLB, FBX, OBJ, USDZ, STL)" as a separate
   signed URL on task completion — i.e., the multi-format download behavior
   is driven by what Meshy's API already hands back, not a MeshyForge design
   choice layered on top.

So: **the current, actually-shipped architecture stores every format Meshy
generated for a task, permanently, at download time** — exactly the
"store every requested format file per asset at generation time" model the
audit describes, confirmed rather than assumed.

### Export flow — confirmed NOT convert-on-demand, and confirmed NOT WIRED UP AT ALL

This is the most important finding. `src/components/export/ExportDialog.tsx:43-55`
(`handleExport`) is a non-functional stub:

```tsx
async function handleExport() {
    setIsExporting(true);
    try {
      // In full implementation, this would call a convert command
      // to re-export the model in the selected format
      toast.success(`Exporting as ${format.toUpperCase()}...`);
      onClose();
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
}
```
(`ExportDialog.tsx:46-47` comment, verbatim)

It calls **no Tauri command at all** — no `invoke()`, no file copy, no format
check against `file_paths`. It shows a success toast and closes regardless of
whether the asset actually has that format downloaded. Confirmed by grepping
the full `generate_handler!` list (`lib.rs:31-70`): there is no
`export_asset`, `copy_asset_file`, or any export/convert-related Tauri
command registered anywhere in the backend — the only asset-adjacent commands
are `get_all_assets`, `search_assets`, `update_tags`, `toggle_favorite`,
`update_notes`, `delete_asset`, `get_storage_usage`,
`reveal_in_file_manager`, `read_file_as_data_uri`, `save_completed_task`
(`lib.rs:41-50`), plus the task/download commands (`lib.rs:52-70`). None of
FR-EXP-01-F3 (copy from local asset directory), FR-EXP-01-F4 (format-missing
message), or FR-EXP-03-F2 (availability from `file_paths`) are implemented in
code — they exist only as FRD prose (`docs/feature_requirements_documentation.md:3789-3790,3873`).

`src/components/export/ExportProgress.tsx` (full file read) is a pure
presentational progress-bar component (`current`/`total`/`fileName` props,
no logic tying it to a real export operation) — consistent with the rest of
export being unimplemented.

As an aside relevant to blast-radius accuracy: `get_storage_usage`
(`src-tauri/src/commands/assets.rs:124-126,239-244` →
`database.rs:339-350`) returns `COUNT(*) FROM assets WHERE downloaded_at > 0`
— a row count, not a byte total — which already contradicts
FR-EXP-05-F1's "calculates total size of the assets directory"
(`feature_requirements_documentation.md:3952`). Pre-existing drift,
unrelated to this proposal, but relevant to "how much of Export is actually
real" context.

## Gap vs. proposal

**This is a real architecture proposal, not a small delta** — but not for the
reason the audit's framing implies. The audit frames it as "stop storing
every format at generation time; convert on demand at export time instead of
the current approach." Grounding shows:

- The "store every format at generation time" half is **accurate** — confirmed
  above.
- The "convert on demand at export" half of the *current* system **does not
  exist to be replaced**. There is no export-time conversion logic, on-demand
  or otherwise — Export is an unwired UI stub. So the proposal isn't
  "swap an existing convert-on-demand step for pre-fetching" or vice versa;
  it is asking MeshyForge to **build export-time conversion from scratch**
  (something that must happen either way, stub or not) **and additionally**
  decide whether to (a) keep downloading/storing every Meshy-provided format
  up front as today, or (b) download only GLB and add a new
  local-or-remote conversion step that does not exist anywhere in the
  codebase today, triggered at export time.
- Concretely, "GLB-only canonical storage + convert-on-demand" requires new
  code in a location that currently has zero logic: something has to call
  either Meshy's `convert` task endpoint (`TaskType::Convert`,
  `src-tauri/src/commands/api.rs:328-334`, `create_convert`) or a local
  conversion library, at export time, write the result to a temp/export
  location, and only then satisfy `FR-EXP-01-F3`. `TaskType::Convert` exists
  in the Rust command surface but has **no FRD feature entry** — searched
  `docs/feature_requirements_documentation.md` for `FR-CONV`, `Convert Task`,
  `TaskType::Convert` case-insensitively: no matches. It is wired as a raw
  Meshy API passthrough command with no documented feature or UI consumer.
  Whether "convert on demand" in the proposal means calling this existing
  remote endpoint (costs Meshy credits, requires network, per-call latency)
  or a new local GLTF-to-X conversion library is an open question the
  proposal doesn't resolve (see Open Questions).

So: small in the sense that the schema arguably needs no shape change
(`file_paths` is already a flexible JSON map — see Blast Radius); large in
the sense that it requires net-new conversion logic and a real export
pipeline that today is 100% absent, plus a decision on remote-vs-local
conversion with real cost/latency/offline-capability tradeoffs.

## Precedent search record

Per the audit's required term list, searched `docs/**` (all files) for each
term individually, case-insensitive:

| Term | Result |
|---|---|
| `GLTF` | Hits only in the existing 3D-preview/viewer context — `useGLTF`/`GLTFLoader` (drei/three.js runtime loader), never in a storage/schema/canonical-format sense. Representative files: `coding_standards.md:100,1575,1827,2073`, `UI_UX_Documentation.md:384,416,730,732,735,736,1050,1052`, `technical_design_document.md:59,1543,1548`, `technical_stack_documentation.md:676,678,688,704,710,798`, `feature_requirements_documentation.md:3418,3432,3515,3553,3561`, `hook_implementations.md:67,72`, `LESSONS_LEARNED.md:98,148,151`, `test_plan.md:640`, plus three `doc-sync/*.md` plans. **No occurrence discusses GLTF/GLB as the canonical storage/interchange format** — only as the in-app preview render path. |
| `GLB` | Same set as above (GLB is Meshy's primary output format per `technical_stack_documentation.md:676`); no architectural/canonical usage found beyond preview rendering and the `file_paths.glb` key already in the schema. |
| `canonical` | 20+ hits, none about asset file format. All are either (a) "canonical TypeScript/Rust type source" (`rust_type_definitions.md:11`, `gap_assessment_documentation.md:136,138,222,292,445`, `zustand_store_implementations.md:11,17,150`), (b) "canonical rule set" for security/testing standards (`security_threat_model.md:12,21`, `test_plan.md:11`), (c) "canonical endpoint list" for the provider/meshy dedup fix (`LESSONS_LEARNED.md:260,267`, `CHANGELOG.md:28`), or (d) **file-path canonicalization for traversal prevention** (VAL-04: `coding_standards.md:1552,1821`, `security_threat_model.md:153`, `feature_requirements_documentation.md:637`, `doc-sync/*:129`, `adr/0002-signed-download-origin-policy.md:160` re: canonical download URL format). None concern a canonical *asset* format. |
| `single format` | One hit, `feature_requirements_documentation.md:3813` — "export them all in a **single format** to a chosen directory" (batch export, i.e. one format for a batch, unrelated to canonical-storage-format). Not a precedent for the proposal. |
| `convert on demand` | No matches anywhere in `docs/`. |
| `interchange format` | No matches anywhere in `docs/`. |
| `FR-CONV` / `Convert Task` / `TaskType::Convert` | No matches in `feature_requirements_documentation.md` (checked separately since `TaskType::Convert` exists in code but not FRD prose). |

**Conclusion: no prior ADR, rule, or planning-doc discussion of a canonical
single-storage-format policy exists anywhere in `docs/`.** This would be a
first-of-its-kind architectural decision for the project, not a
clarification of an existing (even if undocumented) position — unlike
ADR-0002, which found the policy already implemented in code and only
undocumented.

Also checked `docs/adr/*.md` (per the adr-log Step 3 requirement) — two ADRs
exist (`0002-signed-download-origin-policy.md`,
`0003-preview-lighting-environment-preset.md`); neither touches asset storage
format policy.

## Blast radius

**(a) SQLite schema/migration.** Read `001_initial.sql` in full (87 lines).
The `assets` table's `file_paths TEXT ... DEFAULT '{}'` column
(`001_initial.sql:16`) is already a flexible JSON map — moving to
"GLB-only-stored" does **not** strictly require a column/type change; a
GLB-only asset's `file_paths` would just be `{"glb": "..."}`, which the
column already accepts. A migration would only be needed if the proposal
also wants to (i) rename/repurpose the column semantically (e.g. rename to
`glb_path TEXT` for clarity — a real schema change, per
`new-sqlite-migration` skill's remit), or (ii) add new columns for
conversion-cache metadata (e.g. a `converted_formats_cache` table/column to
avoid re-converting on every export of the same format). Neither is forced
by the JSON-map shape itself. Confirm-don't-assume: the schema is more
forward-compatible with this proposal than a naive reading suggests.

**(b) Download/save pipeline for a newly-completed task.** Would change
substantially. `download_asset_inner` (`api.rs:129-240`) currently loops over
*all* keys in `model_urls` and downloads each (`api.rs:148-169`). Under the
proposal, this loop would need to filter to only the `glb` key (or whatever
Meshy's canonical/GLB URL field is called) and skip downloading the other
signed URLs entirely — a straightforward filter change at that call site,
but it changes what `mark_downloaded`/`file_paths` ever contains for new
assets going forward (`database.rs:128-155`).

**(c) ExportDialog/ExportProgress and their backend commands.** Since Export
is currently unimplemented (see Current State), this is where the real work
concentrates: `ExportDialog.tsx:43-55` needs an actual `handleExport` that
invokes a new Tauri command; that command does not exist today and must be
created (net-new, not a modification) — either wrapping `TaskType::Convert`
(`api.rs:328-334`, remote, costs credits, needs network) or a new local
conversion path (new Rust dependency, new ADR-worthy Cargo dependency
decision per adr-log criterion 4). `ExportProgress.tsx` (already
presentational/prop-driven) would likely need no change, but whatever wires
it up (currently nothing does) would.

**(d) Existing asset records with multiple format files already stored.**
This is the sharpest fork in the proposal and the audit's framing undersells
it. Because `save_completed_task`/`download_asset` are the only write paths
and there is no prior "GLB-only" mode, **every asset ever downloaded through
the shipped app has whatever formats Meshy returned for that task already
present in its `file_paths` JSON** (multi-format is the only mode that has
ever existed). Going GLB-only for *new* assets is forward-only and needs no
data migration — old rows are simply read as-is (`file_paths` with multiple
keys still parses fine under the existing JSON-map schema). But if the
proposal's endgame is "the local repository holds only GLB, period," then
existing non-GLB files on disk for already-downloaded assets become orphaned
extra storage unless a cleanup/backfill migration is deliberately run — that
would be a data migration (delete non-GLB files, rewrite `file_paths` to
GLB-only), and it is optional/deferred rather than forced by the schema.
No code currently performs or references any such cleanup — searched
`src-tauri/src/storage` and `src-tauri/src/commands/assets.rs` for
delete/format-pruning logic beyond `delete_asset` (whole-row deletion only,
`database.rs:320-337`); found none.

## Preliminary needs-an-ADR classification

Trips the `.claude/skills/adr-log/SKILL.md` Step 2 test on **at least
criterion 3** ("Touches the SQLite schema, the IPC contract, keychain/security
posture, or a documented residual risk" — `SKILL.md:68-73`), and arguably two
more:

- **Criterion 3 (SQLite schema).** Even though the JSON-map shape absorbs a
  GLB-only convention without a forced column change (see Blast Radius (a)),
  the *decision* of what gets written into `file_paths` at download time —
  and whether a companion conversion-cache table is added — is a schema-
  policy decision about the `assets` table's content contract, which is
  exactly what `new-sqlite-migration`'s remit and adr-log criterion 3 cover
  ("any table, column, index, or constraint" per that skill's description,
  and criterion 3 here names "the SQLite schema" outright without qualifying
  it to DDL-only changes).
- **Criterion 1 (crosses IPC boundary / binds >=2 modules).** A new export
  Tauri command binds `src/components/export/ExportDialog.tsx` (frontend) to
  a new `#[tauri::command]` (backend) — the canonical IPC-crossing case per
  `SKILL.md:51-54`.
- **Criterion 4 (dependency)**, conditionally — only if the proposal resolves
  to local (non-Meshy-API) conversion, which would add a new Cargo crate
  (e.g. a GLTF/FBX/OBJ/USDZ/3MF conversion library) subject to
  `Github_Repository_Expectations.md` §13.1 DEP rules. Not triggered if the
  resolution is "call Meshy's existing `convert` endpoint" (no new
  dependency, just a new command wrapping an existing provider call).

Per adr-log's own classification table (`SKILL.md:39-44`), this question is
**Architectural** (spans storage, download pipeline, and export UI — more
than one module) with a **Contract** sub-component (new IPC command) and a
possible **Dependency** sub-component. Per Step 5 (`SKILL.md:116-122`), an
Architectural/Contract/Dependency question must pause for user confirmation
before any ADR is written — consistent with this memo's read-only, no-file-
touched scope; adr-log itself, if invoked next, would need to stop and
present options rather than writing anything unilaterally.

## Open questions

1. **Remote vs. local conversion.** Does "convert on demand" mean calling
   Meshy's existing `TaskType::Convert` / `create_convert` endpoint
   (`api.rs:328-334` — remote, consumes credits, requires network, adds
   latency, but zero new dependencies) or a new local conversion library
   bundled into the Rust binary (offline-capable, no per-export credit cost,
   but a new pinned dependency subject to DEP-06/DEP-09 license/CVE review)?
   The audit's proposal text doesn't specify, and no code or doc precedent
   picks one.
2. **What happens to already-downloaded non-GLB files for existing users?**
   Left as-is (accepted, growing "legacy" multi-format storage) or actively
   pruned via a one-time cleanup migration? This is a product/UX decision
   (silently deleting a user's already-exported FBX file path reference
   could break an external reference they've kept) as much as a technical
   one.
3. **Does "canonical GLB-only" apply retroactively to `save_completed_task`
   too**, i.e. should the temporary remote-URL bookkeeping in
   `file_paths_json` (`assets.rs:269-272`) also be filtered to GLB-only
   before `download_asset` even runs, or only at the download step? Two
   plausible integration points, not one.
4. **Conversion fidelity/feature loss.** Rigging/animation data
   (`has_rig`/`has_animation` columns, `001_initial.sql:27-28`) and texture
   maps (`texture_paths`, tracked separately from `file_paths`,
   `001_initial.sql:17`) may not round-trip losslessly through every target
   format (e.g. STL has no rig/animation/texture support at all). The
   proposal doesn't address whether export-time conversion is expected to
   degrade gracefully per format or block/warn — this is squarely a design
   question for whichever ADR follows, not something this grounding pass
   resolves.
5. **FR-EXP-05's pre-existing drift** (byte-size display vs. row-count
   implementation, `database.rs:339-350` vs.
   `feature_requirements_documentation.md:3952`) is orthogonal to this
   proposal but sits in the same feature area — worth flagging to whoever
   scopes the eventual work package so it isn't silently conflated with the
   canonical-format decision.
