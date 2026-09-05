---
name: adr-log
description: >-
  Logs Architecture Decision Records for MeshyForge when an implementation
  question has no clear answer in the planning docs and the answer will
  constrain future code. Applies a needs-an-ADR test (crosses the Rust/TS IPC
  boundary, deviates from a numbered rule, touches the SQLite schema or
  security posture, changes a dependency, resolves a doc contradiction, or is
  expensive to reverse); runs a precedent search across all planning docs and
  prior ADRs; drafts >=2 options with tradeoffs; and pauses to confirm with
  the user before writing any Architectural, Contract, Security, or
  Dependency decision to disk. Use when an implementation question has no
  clear answer in the planning docs and the answer will constrain future
  code — and NOT for questions a doc already answers verbatim.
---

# ADR Log

MeshyForge has no existing ADR process — this skill formalizes one from
scratch. There is currently no `docs/adr/` directory and no `docs/` directory
at all: the 14 planning docs (`technical_design_document.md`,
`coding_standards.md`, `Github_Repository_Expectations.md`, etc.) sit at the
repo root. That placement itself arguably contradicts
`Github_Repository_Expectations.md` §4.3/§14.1 (`DOC-REP-01`, `REP-06`),
which expect `docs/TDD.md`, `docs/CSD.md`, `docs/GREB.md`, etc. under `docs/`.
Resolving that is a decision for the *first* ADR this project logs, whenever
someone runs one — this skill does not create that ADR itself. It only needs
to not choke on `docs/` not existing yet: **create `docs/adr/` (and `docs/`
if absent) the first time an ADR is actually written**, never as a
side-effect of just being invoked.

This skill is a decision-recording tool, not a decision-making one. It never
edits a planning doc — see "Handoff to doc-sync" below.

## Step 1 — Classify the question

| Class | What it covers |
|---|---|
| **Architectural** | Module boundaries, data flow, process/thread model, anything spanning >1 module |
| **Contract** | The Tauri IPC contract (`lib/tauri.ts` <-> `commands/*.rs`, `meshy-types.ts`), SQLite schema |
| **Security** | API key handling, keychain posture, anything in `security_threat_model.md`'s scope |
| **Dependency** | Adding, dropping, or re-pinning an npm or Cargo dependency |
| **Clarification** | Recording a decision the docs *already* make, just not yet logged as an ADR |

## Step 2 — Apply the needs-an-ADR test

Write an ADR if **any one** of these is true. Otherwise answer inline, citing
the doc section (`DOC §x.y`) that already settles it, and stop — do not log
an ADR for a question a doc already answers.

1. **Crosses the Rust<->TS/IPC boundary, or binds >=2 modules or a
   directory-level convention.** E.g. anything touching `lib/tauri.ts`,
   `commands/*.rs`, or a rule like `CTR-07`/`RCT-10` (no direct
   `@tauri-apps/api/core` imports outside `lib/tauri.ts`).
2. **Extends, narrows, or deviates from a numbered rule** in any doc's
   rule-ID namespace. The namespaces below are confirmed from the docs
   themselves (non-exhaustive — see `coding_standards.md` §19.1 for the full
   198-standard cross-reference index):
   - `coding_standards.md` (CSD): `ORG` `EXP` `TYP` `VAR` `RCT` `HOK` `RST`
     `IPC` `STT` `STY` `SUI` `DRK` `SEC` `VAL` `SAN` `PRF` `BPR` `TST` `GIT`
     `PR` `DOC` `DEBT`
   - `UI_UX_Documentation.md` (UI/UX, owns these even though CSD's index
     cites them): `TKN` `LAY` `CMP` `KBD` `SEM` `CLR` `MOT` `RND` `DAT` `BDL`
     `CTR` `VP` `CAM` `3D-A11Y` `RES` `FRM`
   - `Github_Repository_Expectations.md` (GREB): `REP` `BRN` `MRG` `CMT`
     `PR` `ISU` `MLS` `PRJ` `REL` `CI` `REL-CI` `SEC-REP` `DEP` `DBT`
     `DOC-REP` `REV` `TD-REP` `CON` `HLT`
3. **Touches the SQLite schema, the IPC contract, keychain/security
   posture, or a documented residual risk.** `security_threat_model.md` §10
   lists six accepted residual risks (TLS pinning, downloaded-file integrity,
   DB/asset file permissions, keychain namespacing, Actions permission
   scoping, no code signing) — deciding to actually close one of these is
   always an ADR.
4. **Adds/drops a dependency or changes a pinned version.** Per
   `Github_Repository_Expectations.md` §13.1 (`DEP-01`–`DEP-10`), especially
   `DEP-06` (license allowlist), `DEP-09` (transitive CVE risk), and `DEP-10`
   (the `three` package's exact-version pin, called out as a special case).
5. **Resolves a known doc contradiction.** Worked examples of this pattern
   already resolved in this repo (useful as a template, not as a currently-
   live search target — re-check before citing either as still open): the
   FRD's §4.2/§4.3 summary tables once said "65 features" while §4.1/§5
   specified 76, since corrected to 76 throughout; and
   `gap_assessment_documentation.md` §6.4/§10 corrected CSD §8.3 from 3
   fully-coded hook patterns to 2. A new contradiction discovered during
   implementation follows the same path — search for it fresh, don't assume
   these two are the only ones or that they're still open.
6. **Expensive to reverse, or will likely be re-litigated later.**

**Inline-only cases (do not log an ADR):** the answer is quotable verbatim
from a doc section; the choice is local to one file and cheaply reversible;
or it is already covered by an existing rule ID (cite it and move on).

## Step 3 — Precedent search

Before drafting, search and **record what was searched**, even when the
result is "no precedent found":

1. Grep the question's keywords across all 14 root-level planning docs.
2. Grep the relevant rule-ID namespace(s) from Step 2.2 across the same
   docs.
3. Grep `docs/adr/*.md` for prior ADRs touching the same area (skip if
   `docs/adr/` doesn't exist yet — that itself is worth noting as "no prior
   ADRs exist").

Record the exact search terms and files checked in the ADR's Context section
— this is what makes the "no precedent" claim auditable later.

## Step 4 — Draft >=2 options

For each option, name it, list pros/cons, and annotate it against any
constraint found in Step 3 (a rule ID it would violate or extend, a doc
section it would need to update). An option that silently violates an
existing `Block`-severity rule (CSD §18.5) needs that called out explicitly,
not glossed over.

## Step 5 — Weight gate: confirm before writing, except for Clarification

- **Architectural / Contract / Security / Dependency** — ALWAYS pause and
  present the classification, the options, and the recommended option to the
  user for confirmation before writing the ADR file. Never unilaterally
  commit the project to an architectural, contract, security, or dependency
  choice.
- **Clarification** — recording a decision the docs already make may be
  logged without confirmation, since nothing new is being decided.

## Step 6 — Number and file the ADR

- Number = (max existing ADR number in `docs/adr/`) + 1, zero-padded to 4
  digits. First ADR is `0001`.
- Slug = kebab-case of the title.
- Path: `docs/adr/NNNN-slug-title.md`. Create `docs/adr/` (and `docs/` if
  absent) at this point if it doesn't exist yet.
- Use the template in `references/adr-template.md` — do not freehand the
  structure.

## Step 7 — Update the ADR index

Maintain `docs/adr/README.md` as a table with columns: **ID, Title, Status,
Date, Area, Docs Affected, Related Rules**. Regenerating this index from the
ADR files is also one of the operations `doc-sync` is allowed to auto-apply
under its `--apply` allowlist — either tool may perform it, but `adr-log`
must do it immediately after writing a new ADR so the index never drifts
from the files it lists.

## Step 8 — Hand off downstream doc edits

List, in the ADR's Consequences section, which planning docs this decision
implies edits to (e.g., a new rule ID proposed in the Decision, a schema
change that TDD §6.1 needs to reflect, a dependency change TSS needs to
record). **`adr-log` never edits a planning doc itself** — that list is the
handoff payload for `doc-sync` to turn into a draft sync plan. Once the ADR
is written and its status is `Accepted`, tell the user `doc-sync` should now
be run against this ADR's ID so the downstream doc edits actually get
drafted — don't just leave the Consequences list sitting unactioned.

## Template

Full ADR structure — metadata table, Context, Options Considered, Decision,
Consequences, References — is in `references/adr-template.md`. Read it
before drafting; don't improvise the section order.
