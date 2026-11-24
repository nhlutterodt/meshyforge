# ADR-0019: Export Carries a Rights Record — Sidecar Baseline, GLB as a Projection

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-23 |
| **Deciders** | Neils (answered §6 Q1/Q3; export contract confirmed via the adr-log weight gate, 2026-11-23) |
| **Phase** | Phase 4–5 (outbound legal metadata) |
| **Related rules/features** | `LM-02`, `LM-03`, `LM-04`; ADR-0007 (extended, not superseded); `ND-1`, `ND-3`, `ND-4`, `ND-5`, `ND-10` |
| **Supersedes** | None — **extends** ADR-0007 |

## Context

`export_asset(path, destination_path)` (`assets.rs:249-255`) validates that `path`
is rooted under `data_dir/assets` and calls `export_asset_inner`
(`assets.rs:269-282`), which does `std::fs::copy` and nothing else. **No record
travels with the file.** The exported artefact is Meshy's bytes, unmodified,
with no statement of what rights accompany it.

ADR-0007 decided the local-copy-with-on-demand-convert model and recorded the
containment check this ADR must preserve. It did not contemplate metadata.

**Owner answers this ADR encodes (2026-11-23):** Q1 — a **SHA-256 of the prompt**
travels in the record (ADR-0021 supplies the digest); Q3 — **one statement for
the final asset**, discharged by `LM-03`'s `Modified from <parent task id>` line.

**Trigger:** needs-an-ADR criteria 1 (crosses the Rust↔TS IPC boundary — the
`export_asset` signature changes), 3 (changes what an exported GLB *is*), and 6
(will be re-litigated at every new export format).

**Constraints found:**
- `SEC-B` — adding an asset id must not become a way to bypass
  `canonical_asset_path`. The id must be **cross-checked against the row's
  `file_paths`**, never trusted.
- `D-4` / `src/lib/tauri.ts:55-59` — `CommandName` is a contract pinned by a
  guardrail test. **No new command**; the existing `export_asset` gains a
  parameter.
- `D-2` — the sidecar JSON and the IPC read model must be **two serde
  projections of one Rust struct**, so the file format and the contract cannot
  diverge.
- `D-3` — the sidecar **never travels through the frontend**; it is assembled in
  Rust.
- `P-1`/`P-2` — two-pass **streaming** only. Never `fs::read` a whole GLB (files
  run to hundreds of MB); `fs::copy`'s O(1) memory is a property to keep. If
  there is nothing to embed, take the pure-copy path.
- `P-3` — export currently touches **no database**. Reading the row once, up
  front, on a short-lived read; never hold a transaction across file IO.
- `US-1` — the **three-outcome degradation ladder**: full / copy + sidecar /
  copy + visible warning. A record failure must never block delivery of the
  user's file.
- `US-2` — GLB handling validates magic + version + **declared length against
  actual length** and caps the JSON chunk; never allocate from a declared length.
- `SEC-A` — the sidecar is the **first write outside the sandbox**. Derive the
  path by appending a fixed suffix to the canonicalised destination — never by
  replacing the extension, never from a DB value. Refuse an existing non-regular
  target; do not follow symlinks on create; stay inside the destination's own
  directory; do not add the destination to the asset-protocol scope; handle
  Windows reserved device names and `MAX_PATH`.
- `LM-04` — **merge, never replace**. The app currently preserves whatever Meshy
  embedded; adding our record must not regress that.
- `ND-3` — no control may depend on an embedded mark surviving a round-trip.
  The sidecar is the baseline **because** embedding does not survive Blender.

**Precedent search record:**
- Searched: `export`, `sidecar`, `GLB`, `gltf`, `asset.extras`, `copyright`,
  `provenance`, `EXPORT`, `VAL-07`, `FR-EXP` across `docs/*.md`,
  `docs/adr/*.md`, `src-tauri/src/commands/assets.rs`, `src/lib/tauri.ts`.
- Result: **ADR-0007** owns export-as-local-copy; `VAL-07` (proposed) covers
  path validation. Neither addresses metadata carriage. `feature_requirements_documentation.md`
  FR-EXP-01/03 assume bytes only.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A — Sidecar-first (`<exported>.meta.json`), GLB embedding as a projection of the same struct** | Works for **all six formats** at one cost; survives every tool round-trip (unlike embedding); embedding stays an additive one-code-path upgrade | Two artefacts to deliver; a user may send only the model | None |
| B — Embed in the GLB only | Single self-describing file | Dies on first Blender round-trip (`ND-3`); unavailable for STL/OBJ/FBX; a fixture suite can never make it reliable | Violates `ND-3`'s survival requirement |
| C — A new `export_asset_with_record` command | Keeps the old signature untouched | Widens the `CommandName` union and the permission review for zero benefit; a second export path to keep in sync | Violates `D-4`; the guardrail test pins the union deliberately |
| D — Status quo (bytes only) | No risk | Delivers assets with no rights statement, while `LM-03`'s CC BY duty is a **licence condition** when it applies | Fails `LM-02`/`LM-03` |

## Decision

**Adopt Option A**, in five parts:

1. **`export_asset` gains an asset identity** (`asset_id: String`) alongside
   `path` and `destination_path`. Before writing anything, the id must resolve to
   a row whose `file_paths` **contains the given path**; a mismatch is refused.
   The containment check itself is unchanged.
2. **The sidecar is the baseline carrier.** Path =
   canonicalised destination + a fixed `.meta.json` suffix, with
   `schema_version` as the **first field**. The reader **refuses an unknown
   `schema_version`** rather than misreading it.
3. **One struct, two projections.** `ExportRecord` (Rust) serialises to the
   sidecar and to the IPC read model via serde. The GLB's `asset.copyright` /
   `asset.extras` are a **projection of that struct**, not a second source of
   truth.
4. **GLB handling merges, never replaces.** Parse magic + version + declared
   length (validated against actual length), cap the JSON chunk, merge into the
   existing `asset` object, preserve unknown keys and unknown `extensions`, and
   stream the BIN range unchanged. If nothing is to be embedded, take the pure
   copy path.
5. **The degradation ladder is mandatory.** Full → copy + sidecar → copy +
   visible warning. A parser failure, a DB failure, or a sidecar write failure
   degrades the **record**, never the delivery.

**Field allowlist** (SEC-F): identifier, reason code, credit text, plan tier,
published/attested/disclosure predicates, prompt digest, `schema_version`,
generation timestamp, parent task id. **No** absolute paths, no signed URLs, no
`error_message`.

**Check:** a schema-versioned sidecar is written for every export in every
format; the reader refuses an unknown version; a GLB fixture carrying a
**foreign `asset.extras` key** and an **unknown `extensions` entry** round-trips
with both intact and the BIN chunk byte-identical; a `CC-BY-4.0` fixture emits
the three-element credit; the ladder is tested at each rung.

## Consequences

**Positive:**
- One carrier covers GLB, glTF, FBX, OBJ, STL and 3MF, so no format is a
  second-class citizen for rights metadata.
- Embedding remains available later **without a rewrite**, because it projects an
  existing schema rather than defining one.
- A record failure can never cost the user their file (`US-1`).

**Negative:**
- Two artefacts to keep together (`ND-10`). The atomicity answer is recorded
  either way: implement staging + rename inside the destination directory
  (the pattern `recovery.rs` already uses, and `lib.rs:391`'s `.tmp` helper), or
  accept non-atomicity explicitly.
- `export_asset`'s signature change touches `src/lib/tauri.ts` and its guardrail
  test, and every caller.
- Export gains a database read on a path that previously had none (`P-3`); the
  ladder is what keeps that from becoming an availability regression.
- The sidecar is user-visible state that a user can delete or edit; it is not
  authoritative, the database is.

**Follow-ups:**
- Docs to update (handoff to `doc-sync`): `feature_requirements_documentation.md`
  FR-EXP-01/03; `technical_design_document.md` §7 (export path);
  `rust_type_definitions.md`; `docs/legal-metadata-baseline.md` `ND-10`.
- Tests to add: per-format sidecar; unknown `schema_version` refusal; GLB
  foreign-extras/unknown-extensions round-trip; three-element CC BY credit;
  ladder rungs; id/path mismatch refusal; path traversal refusal.
- Tech debt to register: `ND-1` (content hash of exported bytes) remains cut —
  see ADR-0021 for the correction to its stated reason.

## References

- `docs/legal-metadata-baseline.md` §3 (`LM-02`–`LM-04`), §5 (`ND-1`, `ND-3`–`ND-5`, `ND-10`), §6 (Q1, Q3)
- `docs/governance/grounding/2026-11-23-concept-13-legal-metadata-outbound-record.md` §3.1, §4, §5, §6, §8
- `docs/governance/grounding/2026-11-23-concept-14-disclosure-and-attestation.md` §11
- `src-tauri/src/commands/assets.rs`, `src/lib/tauri.ts`
- Related ADRs: ADR-0007 (extended), ADR-0018 (the record), ADR-0021 (prompt digest)
- Tasks: `TASK-0042`