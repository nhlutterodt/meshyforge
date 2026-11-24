# ADR-0018: Per-Asset Rights Record — Predicates Stored, Identifier and Reason Derived

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-23 |
| **Deciders** | Neils (answered §6 Q1, Q2 and Fact A of `docs/legal-metadata-baseline.md`; contract shape confirmed via the adr-log weight gate, 2026-11-23) |
| **Phase** | Phase 4–5 (outbound legal metadata) |
| **Related rules/features** | `LM-01`, `LM-05`; DEP-06 (adjacent), `ND-6`, `ND-8` |
| **Supersedes** | None |

## Context

Nothing in the schema records what rights an asset carries. Rights are a function
of **the Meshy plan tier used at generation**, **whether the asset was published
to the Meshy Community**, and **whether third-party material was used** — and
the schema stores none of the three (`concept-11` §8, `concept-12` §5.3a).

The four combinations resolve to three identifiers, and **two of them have no
answer** in the retrieved provider terms: the operative contract
(`meshy.ai/terms-of-use`) returned HTTP 403, so the table rests on help-centre
articles labelled as secondary sources.

**Owner answers this ADR encodes (2026-11-23):**

| Question | Answer |
|---|---|
| Q1 — prompt in the record? | A **SHA-256 of the prompt travels in the export**; plaintext stays local |
| Q2 — does deleting an asset delete its provenance? | **Yes** — the record dies with the asset row, and the files are deleted too (ADR-0020) |
| Q3 — per-hop rights? | **One statement** for the final asset (`ND-6` closed) |
| Fact A — plan tier | **`unknown`** until stated, so every asset derives `NOASSERTION` |

**Trigger:** needs-an-ADR criteria 3 (touches the SQLite schema) and 6 (a
derived-vs-stored decision constrains every future reader). Classified
**Contract/Data**.

**Constraints found:**
- `docs/legal-metadata-baseline.md` §3 `LM-01` — the identifier is *never the
  stored primary fact*; storing it collapses the two `NOASSERTION` rows into a
  guess and makes the unknown invisible.
- `concept-11` §13.1 — the frozen vocabulary is exactly
  `{LicenseRef-Meshy-Paid-Owned, CC-BY-4.0, NOASSERTION}`.
- **Fact A changes the table's cardinality.** The baseline says "the four
  combinations resolve to three identifiers". With `tier = unknown` that is no
  longer complete: a third tier value has to resolve for every
  published/attested pairing. Hence **five canonical rows**, not four.
- `LM-01`'s honesty note — two of the three predicates are **unobservable by the
  app** (publishing happens on Meshy's website; the provenance of an uploaded
  reference image is known only to the owner). They are user assertions with a
  timestamp, and the UI must say so.
- `LM-05` — the disclosure posture is a fourth predicate with an explicit
  `unknown` default, not a new mechanism.
- `ND-8` — assets created before the baseline are **not** retro-stamped;
  `NULL` means pre-baseline.
- `src-tauri/migrations/001_initial.sql:9` — `assets.prompt TEXT` **already
  exists** and is populated locally, so Q1's answer needs no prompt column.
- `src-tauri/src/storage/database.rs:12-19` — the `MIGRATIONS` const is the
  registry (not a `migrations.rs`, as `technical_stack_documentation.md` §10.5
  and the `new-sqlite-migration` skill imply). Next version is `004`.

**Precedent search record:**
- Searched: `rights`, `licence identifier`, `license`, `CC-BY`, `NOASSERTION`,
  `plan tier`, `attestation`, `derived`, `predicate` across `docs/*.md`,
  `docs/adr/*.md`, `src/`, `src-tauri/src/`, `src-tauri/migrations/`.
- Result: **no precedent.** No ADR addresses rights metadata. A grep for
  `plan_tier`/`planTier` across `src/` and `src-tauri/src/` returns **zero
  hits**, confirming the tier is not observable from the provider response and
  must be a stored assertion.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A — Store the predicates, derive identifier + reason code on read** | The unknown stays visible; a corrected reading of the terms re-derives every asset with **no migration**; satisfies `LM-01`'s "never the primary fact" | Every reader must go through the accessor; the frontend must not recompute (risk of a duplicated rule) | None |
| B — Store a computed identifier column at write time | Fast reads; one field to render | Collapses both `NOASSERTION` states into whatever the write path guessed; a terms correction needs a data migration; the hole becomes invisible | Violates `LM-01`'s core constraint |
| C — Store one free-text "rights note" | Trivial | Unparseable, unverifiable, un-derivable; no test can be written against it | Fails the baseline's admission criterion §1.1 |
| D — Add a separate `asset_rights` table with a non-cascading FK | Retains provenance after deletion | Contradicts the Q2 answer (record dies with the asset); adds a join to every read | Conflicts with Q2 |

## Decision

**Adopt Option A**, in five parts:

1. **Three-state predicate columns**, `TEXT`, nullable, **no `DEFAULT`**, and
   **no SQL `CHECK`** — the domain is enforced in Rust.
   `plan_tier_at_generation` (`'free'|'paid'|'unknown'`), `published_to_community`,
   `third_party_material_attested`, plus `disclosure_posture` (LM-05) and
   `rights_recorded_at` (Unix ms).
   (Corrected during implementation: this ADR originally specified
   `CHECK (col IN ('yes','no','unknown'))`. Two things ruled it out — the repo's
   only `ADD COLUMN` precedent (`002_persistence_integrity.sql:7`) is
   unconstrained, and `ALTER TABLE ... ADD COLUMN` with a `CHECK` is
   version-dependent. The invariant belongs in a Rust enum, where it is
   exhaustively matchable, not in a SQLite constraint that may not even apply.)
   `NULL` is reserved for **pre-baseline** rows (`ND-8`) and is never written
   again; `'unknown'` is a **recorded assertion** that the owner does not know.
   Collapsing the two would turn "nobody ever asked" into "the owner said they
   do not know" — a false statement about the owner.
2. **Five canonical derivation rows**, in precedence order, all tested:

   | Tier | Published | Attested | Identifier | Reason code |
   |---|---|---|---|---|
   | paid | no | yes | `LicenseRef-Meshy-Paid-Owned` | `null` |
   | free | any | any | `CC-BY-4.0` | `null` |
   | paid | yes | any | `NOASSERTION` | `published-to-community` |
   | paid | no | no / unrecorded | `NOASSERTION` | `material-unattested` |
   | unknown (or `NULL`) | any | any | `NOASSERTION` | `tier-unrecorded` |

3. **Derived, in Rust, once.** `rights_identifier()` and `rights_reason()` are
   accessors on the asset read model. The frontend renders them and **never
   recomputes** them — a duplicated four-to-five-row mapping in TypeScript is
   the `LESSONS_LEARNED` #2/#7 drift class.
4. **The reason code exists because "not established" needs a subject.** `LM-01`
   requires `NOASSERTION` to render as "not established", never blank and never
   falling back to "owned"; "not established" is useless without saying *which*
   fact is missing.
5. **Basis travels with the EXPORT record, not the per-asset read model**
   (OW-1; amended during implementation). The source name, its retrieval date
   and the `secondary-source` marker are **constants**, not per-asset facts.
   Exposed per row they would be repeated in every query payload and become N
   places for the retrieval date to drift apart. They belong to `ADR-0019`'s
   sidecar, serialised once. Where the capture UI needs to warn that the terms
   rest on secondary sources, that is static copy — not per-asset data.

**Check:** migration `004_legal_metadata.sql` adds the columns; a Rust test
proves **all five rows** derive their documented identifier **and** reason code;
a test proves `NULL` and `'unknown'` are distinguishable; and no asset may reach
`downloaded_at > 0` with an unrecorded attestation.

## Consequences

**Positive:**
- The unknown stays **visible in the data** instead of being frozen into a
  write-time guess.
- Re-deriving after a terms correction is a code change, not a migration.
- The five-row mapping has exactly one implementation, in Rust, tested.

**Negative:**
- **The control is test-verified but production-inert until Fact A is stated**:
  with tier defaulting to `unknown`, every real asset derives
  `NOASSERTION` / `tier-unrecorded` and `LM-03`'s CC BY credit never fires.
  This is the safe direction (no false ownership claim, no invented credit) but
  it means the rights record is honest and empty until the tier is supplied.
- Every read path gains a small amount of derivation logic; forgetting to use
  the accessor is possible, hence the accessor is the only public surface.
- `CHECK` constraints on `TEXT` columns are weaker than SQLite enums; a bad
  value is only prevented at the application boundary.

**Follow-ups:**
- Docs to update (handoff to `doc-sync`): `docs/legal-metadata-baseline.md` §3
  `LM-01` (four-row → five-row table, reason codes, three-state semantics),
  `ND-6` closed, `ND-8` wording; `technical_design_document.md` §6.1 (schema);
  `rust_type_definitions.md` (read model).
- Tests to add: five-row derivation table; `NULL` vs `'unknown'`; attestation
  required before `downloaded_at > 0`.
- Tech debt to register: none.

## References

- `docs/legal-metadata-baseline.md` §3 (`LM-01`, `LM-05`), §5 (`ND-6`, `ND-8`), §6 (Q1–Q3, Fact A)
- `docs/governance/grounding/2026-11-23-concept-11-legal-metadata-charter.md` §8, §13.1
- `docs/governance/grounding/2026-11-23-concept-12-legal-metadata-inbound-obligations.md` §5.3a, §9
- `src-tauri/migrations/001_initial.sql`, `src-tauri/src/storage/database.rs`
- Related ADRs: ADR-0019 (serialises this record on export), ADR-0020 (deletion), ADR-0021 (prompt digest)
- Tasks: `TASK-0040` (implementation), `TASK-0043` (deletion semantics)