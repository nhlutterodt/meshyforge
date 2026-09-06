# ADR-0007: Export Asset — Local Copy, with On-Demand Remote Convert for Missing Formats

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-05 |
| **Deciders** | Project owner (confirmed local-copy-first design, then confirmed adding the on-demand convert enhancement) |
| **Phase** | Phase 4 (Asset Library) |
| **Related rules/features** | FR-EXP-01, FR-EXP-03; CSD VAL-04 (path canonicalization); SEC-09 (ADR-0002, download-host allowlist); dialog:allow-save capability | ADR-0004 (TaskProvider trait) |
| **Supersedes** | None |

## Context

`src/components/export/ExportDialog.tsx`'s `handleExport()` (lines 43-55) is
a non-functional stub: it shows a success toast (`toast.success('Exporting
as ${format}...')`) and closes the dialog, invoking no Tauri command at all.
Confirmed via `src-tauri/src/lib.rs`'s full `generate_handler!` list: no
export, convert-wrapping, or file-copy command is registered anywhere.
Tracked as `TASK-0016` in `docs/governance/task-manifest.yaml`, discovered
during a 2026-09-05 grounding pass
(`docs/governance/grounding/2026-09-05-concept-09-gltf-canonical.md`).

**Trigger:** Criterion 1 (crosses the Rust↔TS/IPC boundary — a new
`#[tauri::command]` binding `ExportDialog.tsx` to backend logic that doesn't
exist yet) and, for the file-path handling specifically, the same class of
concern ADR-0002 already formalized for downloads (validating a path stays
inside the app's own managed storage before an operation touches it).

**What the FRD actually specifies (re-verified in full, not assumed):**
`docs/feature_requirements_documentation.md:3747-3801` (FR-EXP-01, Must Have,
Phase 4) and `:3847-3884` (FR-EXP-03, Must Have, Phase 4) specify Export as a
**pure local file copy** — "the file is copied from local asset storage to
the chosen location" (FR-EXP-01 acceptance criteria, line 3779) — with
formats not already downloaded simply **disabled** in the UI ("Not generated
for this asset," FR-EXP-03-F3, line 3874) or shown a re-generate message
(FR-EXP-01-F4, line 3790). Neither section specifies or implies an on-demand
cloud conversion. This is a smaller, cheaper, zero-Meshy-credit feature than
the audit proposal (`docs/governance/grounding/2026-09-05-concept-09-gltf-
canonical.md`) that originally surfaced this gap had assumed when framing
"convert on demand at export."

**Decision process, in order:** Neils was first asked whether the
conversion mechanism (for the *missing-format* case) should wrap Meshy's
existing remote `TaskType::Convert` task or wait for a fuller local-processing
architecture (`TASK-0014`); he chose the remote wrapper. Once the FRD's actual
local-copy-first design was found and surfaced back to him, he was asked
whether to build strictly to spec (local copy only) or add the on-demand
remote-convert path as an enhancement on top of the spec-compliant core; he
chose to add it. This ADR therefore records **both** the core (local-copy,
per FR-EXP-01/03) and the additive enhancement (on-demand remote convert)
as one design, since they compose into a single command flow.

**Constraints found:**
- `src-tauri/src/commands/assets.rs:17-38` — `canonicalize_existing_path` /
  `canonical_asset_path` already implement exactly the source-path-safety
  pattern this feature needs: canonicalize the path, verify it's rooted
  under `data_dir.join("assets")`, reject otherwise. Already used by
  `reveal_in_file_manager` (`assets.rs:130-134`). Directly reusable, not a
  new pattern to invent.
- `src-tauri/capabilities/default.json:8-9` — `dialog:allow-open` and
  `dialog:allow-save` are **already granted**. No new Tauri capability
  declaration is needed for the save-location file picker.
- `src-tauri/src/commands/api.rs:328-334` — `create_convert` (wrapping
  `TaskType::Convert` via the existing generic `create_task_inner`,
  `api.rs:66-87`) already exists, is already registered, and is already
  exercised by `PostProcessPanel.tsx`'s Convert tab. No new provider method
  or new task-creation command is needed for the on-demand-convert path —
  it reuses the exact same create→poll→download flow already shipped.
- `docs/adr/0002-signed-download-origin-policy.md` — established that
  file-path/origin safety for asset I/O is ADR-worthy and set the precedent
  of citing exact code line numbers and a formal rule ID (`SEC-09`) rather
  than leaving a safety control undocumented. This ADR follows the same
  discipline for the export-side path.
- `docs/feature_requirements_documentation.md:3785-3792` (FR-EXP-01-F1–F6)
  and `:3868-3876` (FR-EXP-03-F1–F5) — the full functional-requirement list
  this command must satisfy on the frontend side.

**Precedent search record:**
- Searched `docs/**` for `export`, `convert`, `TaskType::Convert`, `FR-CONV`
  — confirmed (via the prior concept-09 grounding, re-cited not re-run) that
  `TaskType::Convert` has no FRD feature entry of its own; it is currently a
  raw passthrough command used only by `PostProcessPanel.tsx`'s Convert tab.
- Searched `src-tauri/src/commands/assets.rs` and `api.rs` for existing
  file-copy or export-shaped commands — none exist; `reveal_in_file_manager`
  and `read_file_as_data_uri` are the closest existing file-path-handling
  commands and are the source of the reused `canonical_asset_path` pattern.
- Searched `docs/adr/*.md` — ADR-0002 is the only prior ADR on file/path
  safety (download-side); no prior ADR addresses export or local file copy.
- Result: no prior ADR or planning-doc precedent for export-side path
  handling; the download-side precedent (ADR-0002, `canonical_asset_path`)
  is the closest and most directly reusable analog.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A: Two composable commands — `export_asset` (local copy, using `canonical_asset_path`) as the core path, plus reuse of the existing `create_convert`/`poll_task`/`download_asset` flow for the missing-format case, with the frontend chaining them** | Matches FR-EXP-01/03 exactly for the common case (format already downloaded — instant, free, no network); missing-format case reuses 100% already-shipped backend commands, adding only the one new local-copy command; smallest possible new backend surface; `canonical_asset_path` precedent directly reusable | Frontend must orchestrate two different flows (immediate copy vs. create-then-poll-then-download-then-copy) depending on format availability — more frontend branching than a single command | None — extends existing patterns (ADR-0002's path-safety discipline, ADR-0004's generic task-creation flow) rather than deviating from them |
| **B: One monolithic `export_asset` command that internally decides copy-vs-convert-then-copy** | Single call site on the frontend; hides the branching in Rust | Duplicates the create/poll/download orchestration `useMeshyApi.ts`'s hooks and `TaskMonitor.tsx` already handle generically on the frontend (per FR-TASK-01–07) — the backend would need to re-implement polling/progress reporting that already exists as a reusable frontend pattern; harder to show interim "Converting..." progress in the UI, since the whole multi-step operation is opaque behind one async command | Duplicates existing generic task-polling infrastructure rather than reusing it |
| **C: Always require re-generation via the Convert tab first, never auto-trigger from Export** | No new orchestration complexity in ExportDialog at all | Contradicts Neils' explicit choice to add the on-demand convert enhancement; worse UX than what was confirmed | Neils' stated decision |

## Decision

**Adopt Option A.**

1. **New Tauri command `export_asset(task_id, format, destination_path)`**
   — canonicalizes the asset's stored path for `format` from `file_paths`
   using the existing `canonical_asset_path` pattern (`assets.rs:17-38`),
   verifies it is rooted under `data_dir/assets`, and copies it via
   `std::fs::copy` to `destination_path` (obtained by the frontend from
   Tauri's already-granted `dialog:allow-save` picker). Returns a JSON error
   (`INVALID_PATH`/`FS_ERROR`, matching this file's existing error-code
   conventions) on failure, `Ok(())` on success — triggering FR-EXP-01-F5's
   success toast on the frontend.
2. **`ExportDialog.tsx`'s format list is disabled for any format not present
   in the asset's `file_paths`**, per FR-EXP-03-F2/F3, with the
   "Not generated for this asset" tooltip — no command is invoked for a
   disabled format.
3. **For a missing format, an additional "Generate & Export" action** (kept
   visually distinct from the disabled default state, so it reads as an
   enhancement, not the baseline expectation FR-EXP-01/03 describes) fires
   the **already-existing** `useCreateConvert()` → `create_convert` →
   `TaskType::Convert` flow, lets the frontend's existing generic
   task-polling/download infrastructure (`useActiveTaskPolling.ts`,
   `download_asset`) bring the new format down to `file_paths`, and then
   calls `export_asset` exactly as in step 1. No new provider method, no new
   task-creation command, no new polling logic.

**Newly proposed rule ID(s):**
- `VAL-07` (proposed) — "Any new command copying or reading a file
  referenced by an asset record must canonicalize the path and verify it is
  rooted under the app's managed asset directory before performing the file
  operation, per the pattern in `canonical_asset_path`
  (`commands/assets.rs`). No command may read/copy a path taken directly
  from user or database input without this check."

## Consequences

**Positive:**
- The common case (format already downloaded) requires zero Meshy credits,
  zero network calls, and is instant — consistent with this repo's
  established local-first bias (`VP-14`, ADR-0006).
- No new Tauri capability grant needed (`dialog:allow-save` already exists).
- The missing-format enhancement adds zero new backend commands — it is
  pure reuse of `create_convert`/polling/`download_asset`, already shipped
  and tested for `PostProcessPanel.tsx`.
- `TASK-0016` is unblocked and no longer depends on `TASK-0015`'s broader
  (and still-open) canonical-storage-format question — this decision
  resolves only the export-mechanism fork, not whether MeshyForge should
  eventually store GLB-only.

**Negative:**
- The frontend must handle two distinct code paths (immediate copy vs.
  convert-then-copy) rather than one uniform call — accepted per Option A's
  analysis above.
- The on-demand convert enhancement means a user can incur Meshy credit
  spend from the Export dialog, not just from generation panels — should be
  clearly priced/labeled in the UI (e.g., showing Convert's credit cost)
  so it isn't a surprise charge; this is a UI-copy detail for whoever
  implements TASK-0016, not a further architectural decision.

**Follow-ups:**
- **Docs to update** (handed off to `doc-sync`, not edited by this ADR):
  `feature_requirements_documentation.md` should gain a note under FR-EXP-01
  that the on-demand-convert path is an approved enhancement beyond the
  original Must-Have scope; `coding_standards.md` should add proposed rule
  `VAL-07` to its VAL namespace (after VAL-06); `docs/CHANGELOG.md` gets an
  Unreleased entry once implemented.
- **Code to update:** `TASK-0016` (this repo's ledger) — implement
  `export_asset`, wire `ExportDialog.tsx` to it, add the missing-format
  "Generate & Export" affordance, disable unavailable formats per
  FR-EXP-03-F3.
- **Tests to add:** a Rust test for `export_asset` mirroring
  `canonicalize_existing_path_returns_error_for_missing_file` and the
  path-traversal-rejection test already present for `canonical_asset_path`
  (`assets.rs` tests module); a frontend test asserting the disabled-format
  state and the two distinct button affordances.
- **Tech debt to register:** none.

## References

- `docs/feature_requirements_documentation.md:3747-3801` (FR-EXP-01)
- `docs/feature_requirements_documentation.md:3847-3884` (FR-EXP-03)
- `src-tauri/src/commands/assets.rs:17-38,130-134` (`canonical_asset_path`,
  `reveal_in_file_manager`)
- `src-tauri/src/commands/api.rs:66-87,328-334` (`create_task_inner`,
  `create_convert`)
- `src-tauri/capabilities/default.json:8-9` (`dialog:allow-save`)
- `docs/governance/grounding/2026-09-05-concept-09-gltf-canonical.md`
- `docs/governance/task-manifest.yaml` — `TASK-0016`, `TASK-0015`
- Related ADRs: ADR-0002 (signed download origin policy — the analogous
  path-safety precedent), ADR-0004 (TaskProvider trait — `create_convert`'s
  underlying mechanism), ADR-0006 (viewport control registry — source of the
  local-first principle this decision follows)
