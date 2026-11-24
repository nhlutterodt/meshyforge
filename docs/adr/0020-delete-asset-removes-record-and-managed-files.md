# ADR-0020: Deleting an Asset Removes Its Record and Its Managed Files

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-23 |
| **Deciders** | Neils (answered §6 Q2 — the irreversible item — 2026-11-23) |
| **Phase** | Phase 4–5 |
| **Related rules/features** | `LM-01` (record lifetime), ADR-0007 (containment), `SEC-C`, `OW-3` |
| **Supersedes** | None (resolves a documentation contradiction, not an ADR) |

## Context

Two documents and one code comment disagree about what "delete" means:

| Source | Claim |
|---|---|
| `docs/SECURITY.md:26` | "Deleting an asset from MeshyForge removes its managed local files." |
| `docs/gap_assessment_documentation.md:371` | Original build step 4.5: "Delete removes record + files" |
| `src-tauri/src/commands/assets.rs:194` | "*Delete an asset record (and its tag links). **Does not delete files on disk.***" |

The implementation follows the comment: `delete_asset` → `delete_asset_inner`
(`assets.rs:393-398`) → `database.delete_asset`, which runs a single
`DELETE FROM assets WHERE id = ?1`; `asset_tags` rows go with it via
`ON DELETE CASCADE`. The only `remove_file` calls in the backend are
`client.rs:199` (download temp cleanup) and `recovery.rs` (recovery staging) —
neither is tied to asset deletion.

For legal metadata this is the **worst** combination: the record is destroyed
while the asset survives on disk, so a retained or delivered file is left with
nothing recording what produced it, and orphans accumulate untracked.

**Trigger:** needs-an-ADR criteria 5 (resolves a known doc contradiction) and 6
(expensive to reverse). Classified **Contract/Security**.

**Constraints found:**
- `SEC-C` — containment must be enforced **per file at deletion time** by
  canonicalising, never by trusting the stored `file_paths` JSON; directories
  and symlinks are refused.
- `OW-3` — the UI must **enumerate what will be deleted** before it happens.
- `assets.file_paths` is `TEXT NOT NULL DEFAULT '{}'`, a JSON map of
  `{"glb": "...", "fbx": "..."}` (`001_initial.sql:16`), so deletion must
  iterate **every value**, not one path.
- `canonical_asset_path` (`assets.rs:64-79`) **requires the file to exist** —
  `canonicalize()` fails on a missing path — so it cannot distinguish
  "already deleted" from "outside the root". Treating both as an error would
  make a half-deleted asset permanently undeletable; treating both as success
  would silently follow a poisoned path. The algorithm below separates them
  structurally.
- The repo's rule: when code and a document disagree, **report the discrepancy
  and change neither silently**. The direction is chosen here, in writing.

**Precedent search record:**
- Searched: `delete`, `delete_asset`, `remove_file`, `orphan`, `cascade`,
  `retention`, `audit ledger` across `docs/*.md`, `docs/adr/*.md`,
  `src/`, `src-tauri/src/`, `src-tauri/migrations/`.
- Result: **no precedent.** ADR-0008/0009 govern persistence integrity and
  recovery, not user-initiated deletion; no rule in any namespace defines
  deletion semantics. `TASK-0009` made the delete atomic; it did not decide what
  is deleted.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A — Delete the record *and* the managed files** | Makes two existing documents true; removes the orphan class; "delete" means what a user expects | **Irreversible**; a mis-click loses the asset; needs fail-closed containment | None |
| B — Keep the files; correct `SECURITY.md` and the code comment | Reversible; nothing is destroyed | Leaves orphans accumulating with nothing tracking them; weakens two documents to match an implementation that never did what its own plan specified | Contradicts the original build step (`gap_assessment:371`) |
| C — Retain provenance in a separate non-cascading table ("audit ledger") | Can answer "what did I deliver in March" | Retains client briefs indefinitely; contradicts the Q2 answer; forks ADR-0018's schema | Conflicts with Q2 |
| D — Ask per deletion (checkbox "also delete files") | Explicit | Two mechanisms, two test surfaces, and the SECURITY.md sentence becomes conditionally true — i.e. still wrong | Adds a decision to a place the user expects none |

## Decision

**Adopt Option A.** `delete_asset` removes the record **and** every managed file
listed in the row's `file_paths`, **files first, then the row**, in this order:

1. Load the row. Absent → **no-op success**, nothing happens. (Amended during
   implementation: the draft said "absent → error". Erroring would surface a
   spurious failure toast on a double-click or a stale card, for an operation
   that already reached the requested end state — the row and its files are both
   gone. Idempotent success also preserves the previous behaviour, so the change
   adds no contract regression.)
2. Parse `file_paths`; collect every value, deduplicated. Reject any value that
   is not an absolute path.
3. **Validate all paths before deleting any.** For each:
   - `symlink_metadata`: `NotFound` → treat as **already deleted** (tolerate);
   - `is_dir()` or `is_symlink()` → **refuse** (`SEC-C`);
   - otherwise canonicalise and require `starts_with(canonical asset root)` →
     **refuse** if not.
   A refusal aborts the whole deletion **with the row intact**, so the user can
   repair the row. Nothing is removed.
4. Delete the files. A file-deletion failure aborts and reports, leaving the row
   intact and the operation retryable (already-deleted files are skipped as
   above, so a retry converges).
5. Delete the row (tags cascade as today).

**Why files first.** The two failures are not symmetric. A *record without
files* is repairable — re-download, or delete again — because the record still
identifies the asset. *Files without a record* is exactly the provenance loss
this ADR exists to prevent, and it is unrecoverable. Ordering the destructive
steps so the recoverable failure comes first is the whole point.

**Also required:** the `assets.rs:194` comment is rewritten to match, and the UI
lists the files to be deleted before the confirmation (`OW-3`).

**Check:** a test proves a path outside `data_dir/assets` is refused **and that
the row survives**; a test proves a directory or symlink target is refused; a
test proves deleting an asset whose files are already gone still removes the
row; a test proves a `file_paths` entry for a non-existent file does not make
the asset undeletable.

## Consequences

**Positive:**
- `SECURITY.md:26` and `gap_assessment:371` become **true**, and the code
  comment stops being the only accurate description.
- The orphan class disappears, so nothing accumulates untracked.
- Fail-closed containment means a poisoned `file_paths` value cannot be turned
  into an arbitrary-file delete.

**Negative:**
- **Deletion is irreversible.** Recoverable only by re-downloading from Meshy,
  which may not be possible for an old task.
- A crash between file deletion and row deletion leaves a record whose files are
  gone — the recoverable direction, but still a repair case.
- Path validation is per file, so a `file_paths` map with many formats is a loop
  rather than a single call.

**Follow-ups:**
- Docs to update (handoff to `doc-sync`): `docs/SECURITY.md:26` needs no change
  (it becomes true); `docs/legal-metadata-baseline.md` §6 Q2 gains the recorded
  answer; `feature_requirements_documentation.md` delete semantics if stated.
- Tests to add: the four cases in **Check**, plus a multi-format `file_paths`
  map.
- Tech debt to register: none.

## References

- `docs/SECURITY.md:26`; `docs/gap_assessment_documentation.md:371`;
  `src-tauri/src/commands/assets.rs:194`, `:393-398`;
  `src-tauri/src/storage/database.rs` (`delete_asset`)
- `docs/legal-metadata-baseline.md` §6 (Q2)
- Related ADRs: ADR-0018 (record lifetime), ADR-0007 (containment pattern)
- Tasks: `TASK-0043`