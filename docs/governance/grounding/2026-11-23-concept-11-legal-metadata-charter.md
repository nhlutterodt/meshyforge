# Grounding Memo — Concept 11: Legal-Metadata Control Baseline (Charter)

Date: 2026-11-23
Status: **Grounding only — no decision, no implementation, no doc edits.**
Scope: Define what a "baseline of controls that support legal metadata" means
for this project, what counts as a control, when a question is allowed to reach
the project owner, and the sequence in which the remaining research is done.
This memo is the charter for concepts 12–15.

Read-only research. The only files this produced are this memo and its two
Wave-1 siblings. Nothing in `src/`, `src-tauri/`, CI, or the planning docs was
modified.

---

## 1. The question this program answers

> Which legal-metadata facts must MeshyForge capture, keep honest, and hand back
> to its owner — and what is the smallest set of *enforced* controls that makes
> that true, given one-person use supporting real client work?

Three constraints shape every answer below, and each one deletes work:

1. **Single user.** There is no multi-tenancy, no second account, no party to
   serve but the person at the keyboard. Controls that exist to reconcile
   competing interests have no interest to reconcile.
2. **Real projects.** Assets produced here get delivered. So the test is not
   "would this satisfy an auditor" but "would this let the owner answer a
   client's question 18 months from now, or defend a delivery if challenged."
3. **No knowledge theatre.** The owner has explicitly declined to supply legal
   judgement. That is a constraint on the *design*, not a gap in it: it means
   the program must prefer recorded facts and cited precedent over stated
   opinions, and must escalate only where no precedent exists (§5).

## 2. What "legal metadata" means here — three planes

The phrase collapses if the planes are merged. They have different owners,
different triggers, and different failure modes.

| Plane | Question | Obligation runs | Trigger event | Seam in this repo |
|---|---|---|---|---|
| **Inbound** | What do I owe others? | Owner → third parties | *Shipping* the app (a binary leaves the machine) | `.github/workflows/audit.yml`, `release.yml`, `package.json`, `src-tauri/Cargo.toml` |
| **Outbound** | What travels with the asset? | Owner → client / audience | *Exporting* an asset (a file leaves the app) | `src-tauri/src/commands/assets.rs:269-282` |
| **Internal** | What can I prove later? | Owner → owner | Nothing; it accumulates | `src-tauri/migrations/001_initial.sql`, `task_log` |

Inbound and internal are already *partly* solved by accident. Outbound is
entirely unsolved — and outbound is the one that fails hardest, because the
asset is the thing the client receives and the thing the owner may be asked
about.

See `2026-11-23-concept-12-legal-metadata-inbound-obligations.md` (plane 1) and
`2026-11-23-concept-13-legal-metadata-outbound-record.md` (plane 2).

## 3. What counts as a "control" in this program

Definition, chosen to match this repo's existing rule discipline (`GREB DEP-*`,
CSD namespaces, `SECURITY.md` bullets, `security_threat_model.md` residual list):

> A **control** is a numbered rule **+ a named check** **+ an evidence gate**,
> attached to one of the three seams.

A rule without a check is not a control. This is not a rhetorical point:

- `DEP-06` — *"No dependency may be added with a license other than MIT,
  Apache-2.0, ISC, or BSD."* — has existed since the dependency rules were
  written and has **never been checked by anything**. `.github/workflows/audit.yml`
  runs exactly two things — `npm audit --audit-level=moderate` (line 16) and
  `cargo audit` (line 24). Neither reads a license.
- The consequence is measured in `concept-12` §4: the rule is not merely
  unenforced, it is **unsatisfiable as written**, and has been the whole time.
  Nobody noticed because nothing checked.

That is the failure mode this program exists to avoid repeating. Enforced-and-
narrow beats documented-and-broad, permanently, at this scale.

## 4. The proportionality test — this is what "where practical" resolves to

Applied at synthesis (concept 15), not at proposal time. A proposed control must
pass all three, with the reasoning written down:

1. **Survival** — does it produce an artifact that still means something after
   the file or binary leaves the machine?
2. **Checkability** — can a test, a command, or a ceremony under five minutes
   verify it? If verification requires recall, it is not a control.
3. **Cost < exposure** — is the check cheaper than the thing it protects?

Fails any one → the control goes into an explicit **"deliberately not done"**
register, in the register format `security_threat_model.md` already uses for
residual risk. Recording a refusal is a successful outcome of this program, not
a failure of it.


## 5. The escalation ladder — when a question is allowed to reach the owner

The owner's instruction was specific: only surface questions that have **no
proper standing best-practice precedent that aligns with this personal project**.
That needs an operational test, or it degrades into either silence or noise.

A question reaches the owner **only if all four gates fail**:

| Gate | Test | If it passes |
|---|---|---|
| **G1 — Standard** | Does a published standard or statute settle it? (glTF 2.0 `asset` schema, 3MF Core §6.2, USD `assetInfo`, SPDX, Apache-2.0 §4, OFL 1.1, CC BY 4.0 §3(a), C2PA) | Research team decides and cites the clause |
| **G2 — Dominant implementation** | Does the ecosystem have one obvious de facto answer? (`cargo-deny` for Rust license policy, `license-checker` for npm) | Adopt it, cite it |
| **G3 — Project precedent** | Does an existing ADR or GREB/CSD rule already cover the shape? | Extend it, don't invent a parallel one |
| **G4 — Load-bearing** | Does the choice change what the baseline *claims*, and is that claim load-bearing for real client work? | — |

G1–G3 pass → **no question**, just a cited decision. Only G4-only survivors are
escalated.

**Obligation that comes with the ladder:** any team forwarding a question must
attach a **negative search record** — exact terms, where searched, zero-result —
in the format established at
`2026-09-05-concept-08-hybrid-local-execution.md:107-118`. "I couldn't find
precedent" without a search record is not a finding, it is a shrug, and it will
be sent back.

## 6. Existing-state inventory (verified, with citations)

| Fact | Evidence |
|---|---|
| Export is a raw byte copy. No metadata is written at export, ever. | `src-tauri/src/commands/assets.rs:269-282` — `export_asset_inner` = `canonical_asset_path()` + `std::fs::copy()` |
| `export_asset` is the only export command; ADR-0007 scoped it as a local copy with no network and no credits. | `src-tauri/src/commands/assets.rs:243-255`; `src/hooks/useExportAsset.ts:1-24` |
| The `assets` table already holds substantial provenance. | `src-tauri/migrations/001_initial.sql:5-32` — `meshy_type`, `parent_task_id`, `prompt`, `image_url`, `ai_model`, `consumed_credits`, `file_paths`, `texture_paths`, `created_at`, `started_at`, `finished_at`, `downloaded_at` |
| The richest provenance source in the app is labelled as debug telemetry, not rights evidence. | `001_initial.sql` `task_log` — `endpoint`, `request_body` (the full generation payload), `response_*`, `credits_*`; table comment: "for audit/debugging" |
| Lineage is already modelled. | `assets.parent_task_id` — refine→preview, retexture→source, rig, animate |
| No provenance/rights/attribution/sidecar/SPDX/C2PA/NOTICE code exists anywhere. | Repo-wide search: 15 hits, all false positives (LICENSE text, `package-lock.json` `"license"` fields, CSS strings containing "rights", doc prose). Zero implementation. |
| No third-party notice surface exists. | Root has `LICENSE` (MIT) only. No `NOTICE`, no generated attribution file. `src/components/settings/AboutPanel.tsx:8-37` shows name, version, status link — no licenses. |
| Release artifacts carry no notices. | `.github/workflows/release.yml` — uploads `.dmg/.msi/.deb/.AppImage/.exe` only; no LICENSE/NOTICE copy step |
| License rules are unenforced. | `.github/workflows/audit.yml:16,24` — `npm audit`, `cargo audit` only |
| Meshy's operational docs make **no** claim about output ownership. | Search across `Meshy_Documentation/*.md` for license/ownership/commercial/copyright/terms → 1 hit, about API-key visibility (`02-authentication.md:23`) |

## 7. The three seams — and the scope limiter they create

Every control this program can produce must land on one of these:

1. **Inbound seam** — `.github/workflows/audit.yml`, `release.yml`, `package.json`,
   `src-tauri/Cargo.toml`. Where a check or a notice artifact can be attached.
2. **Outbound seam** — `export_asset_inner` (`assets.rs:269-282`), the single
   function through which every delivered file passes.
3. **Surface seam** — `AboutPanel.tsx`, or release packaging. Where a
   user-visible notice can live.

Anything that lands on none of the three is, by definition, documentation of an
intention. It goes in the not-done register. This is the structural reason this
program cannot balloon: there are only three places to put a control.

## 8. Field inventory — already captured vs. net-new

Derived from `001_initial.sql` and `task_log`. "Net-new" means the fact is
required by an obligation found in concept-12/13 but has no column today.

| Needed fact | Status | Where it comes from |
|---|---|---|
| Task type, model, prompt, source image, credits | **Captured** | `assets.meshy_type`, `.ai_model`, `.prompt`, `.image_url`, `.consumed_credits` |
| Generation parameters (all of them) | **Captured, unlinked** | `task_log.request_body` — keyed by `meshy_task_id`, not joined to any asset view |
| Creation/completion timestamps | **Captured** | `assets.created_at`, `.finished_at` |
| Lineage | **Captured** | `assets.parent_task_id` |
| Which local files exist per format | **Captured** | `assets.file_paths` (JSON, keyed `glb`/`fbx`/`obj`/`stl`/`usdz`/`3mf`) |
| **Plan tier at generation time** | **Net-new — blocking** | Rights differ by tier (concept-12 §5). No column exists and it is not derivable from `consumed_credits` |
| **Published-to-Community flag** | **Net-new — blocking** | A stated predicate of the paid-plan ownership grant (concept-12 §5). An out-of-band action, so only a user-recorded fact can carry it |
| **Third-party input attestation** | **Net-new — blocking** | The terms condition ownership on using "materials that do not violate the copyrights of others… including any uploaded image". Not machine-verifiable |
| **Rights statement / license identifier** | **Net-new** | The outbound record's core value (`LicenseRef-…`, `CC-BY-4.0`, …) |
| **Attribution text** | **Net-new** | Required for CC BY 4.0 output; Meshy supplies exact wording (concept-12 §5) |
| **Record schema version** | **Net-new** | Forward compatibility of the outbound record |

Note the shape of the three blocking rows: **all three are user assertions the
app cannot verify.** That is not a defect to engineer around — it is the honest
design. A control that records "the owner asserted X" is a real control; a
control that pretends to verify X is theatre, and fails proportionality test 2.

## 9. First-pass question triage

Three questions are predicted to survive the ladder. They are **not** being
asked now; concept-15 asks them, with concepts 12–14 attached as evidence.

| # | Question | Gates that fail | Why precedent does not resolve it |
|---|---|---|---|
| **Q1** | Does the exported provenance record include the prompt text itself? | G1, G3, G4 | The prompt is simultaneously the strongest provenance fact and the most confidential artefact in the file. C2PA's ingredient model strips private data — adjacent precedent, not a rule for a one-user tool whose prompts contain client briefs |
| **Q2** | Does deleting an asset delete its provenance record? | G1, G3, G4 | Erasure norms belong to regulated processors; archival-audit norms belong to firms. A single-user desktop tool is neither, and retaining client-confidential prompts indefinitely is the opposite of the tool's purpose |
| **Q3** | Does a lineage chain need per-hop rights, or one statement for the final asset? | G1, G4 | `parent_task_id` means one delivered file can be several provider operations with differing terms. Derivation vocabularies (`prov:wasDerivedFrom`, schema.org `isBasedOn`) describe the link, not the rights at each hop |

### 9.1 Candidates expected to dissolve — do not spend the owner's attention yet

| # | Question | Why it probably resolves |
|---|---|---|
| **Q4** | How far does AI-disclosure go in the UI? | Record-and-inform, not certify, unless concept-14 finds otherwise |
| **Q5** | Retro-stamp assets created before the control existed? | Low stakes and reversible, so it becomes a recorded default |

### 9.2 Explicitly **not** escalated

Listed so the owner can see nothing is being offloaded. Each has a citable
answer (G1/G2) and is resolved in concept-12 or concept-13: Apache-2.0 NOTICE
and MIT/OFL notice-retention obligations; whether `DEP-06` needs an automated
gate; whether the vendored `Meshy_Documentation/` notice needs handling; whether
GLB can carry `asset.copyright`; whether STL can carry anything; whether to
certify compliance.

## 10. Program structure and sequencing

Six teams, four waves. Each team = one primary researcher plus one independent
verifier — the pattern already used for TASK-0008 and TASK-0025, where
independent review caught regressions the primary missed. Each team produces one
grounding memo, at T2 tier per `docs/governance/model-routing.md`'s
"cross-doc/cross-code precedent grounding" row.

| Wave | Team | Output | Depends on |
|---|---|---|---|
| 0 | T0 Charter | concept-11 (this memo) | — |
| 1 | T1 Inbound obligations | concept-12 | concept-11 |
| 1 | T2 Outbound record | concept-13 | concept-11 |
| **1.5** | **T6 Reconciliation — freezes the rights vocabulary** | **§13 of this memo** | **concept-12, concept-13** |
| 2 | T3 Disclosure & attestation | concept-14 | concept-13 |
| 2 | T4 Control enforcement design | concept-15 | concept-12, concept-13, §13 |
| 3 | T5 Synthesis → baseline v1 | `docs/legal-metadata-baseline.md` | concept-14, concept-15 |
| 4 | Adoption (**not research**) | TASK-0040, TASK-0041, TASK-0042 | baseline v1 |

**Wave 2 sequencing amendment (2026-11-23).** This table initially listed T3 and T4
as parallel. They were run **serially, T3 then T4**, because T3's output is a
candidate control that T4 exists to *price* — running them together would have given
T4 an unpriced entry and forced synthesis to reopen it. The cost was one step; the
saving was a complete register on the first pass. Recorded here so the deviation
from the written sequence is visible rather than silent.

**Why this order — each line is a dependency, not a preference:**

- **Charter first.** Otherwise four incompatible definitions of "legal metadata"
  collide at synthesis and the merge is the whole project.
- **Inbound parallel with outbound.** No blocking edge exists between them, but
  they must *reconcile* before Wave 2, because T1 supplies the rights vocabulary
  that T2 writes into fields. The reconciliation is one table, not one memo —
  §13 is that table.
- **Reconciliation before enforcement design.** T4 prices checks; a check written
  against an unfrozen vocabulary encodes a guess as a gate. §13 is cheap
  precisely because it adds no research: every cell cites concept-12 or
  concept-13.
- **Enforcement before synthesis.** The proportionality test needs real check
  costs to bite. A baseline written before knowing each check's price is
  aspirational by construction. `DEP-06` is the worked example of that failure.
- **Synthesis stops at ADR candidates.** `adr-log` owns ADR authoring and its
  confirm-before-write gate; `doc-sync` owns planning-doc edits. Research must
  not route around either, or the one gate that reliably stops unreviewed
  decisions becoming contract is bypassed by the process built to respect it.
- **Adoption is scheduled, not implied.** Wave 4 carries ledger IDs because the
  two largest pieces of implementation the research implies — the rights-record
  schema and the notice bundle — had no owner when §10 was first drafted. An
  unowned obligation is the exact failure mode this charter exists to prevent.

## 11. Evidence gates per team

| Team | Gate |
|---|---|
| T0 | Every file:line claim independently reproducible; no proposed control without a named plane and a named seam |
| T1 | Every obligation cites a clause or license section; every proposed check names its exact command; retrieved terms carry retrieval dates and are labelled primary vs secondary |
| T2 | Every carrier claim verified against a spec or a prototype probe, never recalled; unverified claims recorded as unverified |
| T3 | Any C2PA/3D support claim carries a spec version and date, or is recorded as unverified |
| T4 | No rule without a check; no check without a seam; every manual ceremony justified against an automated alternative |
| T5 | Every surviving control passes all three proportionality tests in writing; every cut control appears in the not-done register with its reason |

## 12. Verification backlog — claims this charter does NOT assert

Recorded so no later team inherits a false premise:

1. **3MF reserved metadata names.** The 3MF Core v1.4.0 table of contents was
   retrieved and confirms §6.2 "Core Properties", §6.3 "Digital Signatures" and
   Appendix B.2 "3MF Metadata Example" exist. The *specific reserved `name`
   values* were **not** retrieved: the markdown exceeded the fetch window and the
   v1.3.0 PDF returned as undecoded binary. **Unverified — do not cite a
   metadata name until confirmed.**
2. **USD `assetInfo` / `customLayerData` property names, and USDZ's 64-byte
   alignment constraint.** Widely repeated, not verified in this pass.
   concept-13 must verify or mark unverified.
3. **C2PA support for 3D asset types.** Out of scope for Wave 1 by design.
   concept-14's job. Do not assert either way in the meantime.
4. **The operative Meshy contract text.** `https://www.meshy.ai/terms-of-use`
   returned **HTTP 403** from this environment. concept-12 §5 quotes help-centre
   articles as **secondary** sources. Nothing derived from them may be
   represented to a client as the contract's wording until the primary text is
   retrieved directly and dated.
5. **`cargo metadata --offline` is unusable in this checkout** — it fails on an
   uncached `core-foundation v0.9.4`. concept-12's Rust scan therefore ran
   online. Any CI check built on `cargo metadata` must assume network access at
   install time.

## 13. Wave 1.5 — reconciliation of the rights vocabulary (T6)

Added 2026-11-23, after concepts 12 and 13 landed. §10 promised this
reconciliation as "one table, not one memo"; this section is that table. It adds
**no new research** — every cell cites concept-12 or concept-13 — and it freezes
nothing beyond the vocabulary, so Q1/Q2/Q3 (§9) remain open.

**Why it exists.** concept-12 §5 established that rights depend on plan tier;
concept-13 §2 named a field `rights identifier` without defining its value space.
Left unreconciled, T4 would price checks against an unfrozen vocabulary and T5
would invent it under synthesis pressure.

### 13.1 The value space — three values, one of which is an admission

The sources give a clean three-value vocabulary, and it is only three values
because two combinations have **no answer** in the retrieved material.

| Plan tier | Published to Community | Third-party material attested clear | Rights identifier | Required credit |
|---|---|---|---|---|
| Paid | No | Yes | `LicenseRef-Meshy-Paid-Owned` | None — this is ownership, not a licence |
| Free | any | any | `CC-BY-4.0` | Yes — §13.2 |
| Paid | **Yes** | any | `NOASSERTION` | Not established |
| Paid | No | **No / unrecorded** | `NOASSERTION` | Not established |

concept-12 §5.2 states the paid-plan grant is *"provided you do not publish them
publicly to the Meshy Community and that you have used materials that do not
violate the copyrights of others"*. It does **not** say what the position becomes
when either condition fails — only that the ownership grant is conditioned on
them. So the last two rows are recorded as `NOASSERTION` (SPDX: no assertion is
made) rather than guessed. **This is a finding, not a gap to paper over**, and it
goes to the verification backlog (§13.5).

`LicenseRef-…` is used rather than an invented short name because SPDX reserves
that prefix for licence references not on the SPDX list; it is the correct
construct for a private, provider-specific rights position.

**Design consequence that this table forces, and that would otherwise be missed:**
the record **cannot** store the identifier as the primary fact. It must store the
**three predicates** and derive the identifier on read. If the identifier is
computed at write time and stored, the two `NOASSERTION` states collapse into
whatever the write-time logic guessed — and the hole becomes invisible. Storing
the tripod keeps the unknown visible, and lets a later correction to the terms
re-derive every asset without a migration.

### 13.2 The CC BY 4.0 attribution template

`CC-BY-4.0` is not a label, it is an obligation. CC BY 4.0 §3(a) requires
identification of the creator, any supplied copyright notice, a licence notice
**with a link**, any supplied disclaimer, and an indication of modifications, in a
reasonable manner.

Meshy supplies a preferred form: *"Model created with Meshy – CC BY 4.0 License"*.
Emitted with the licence URL and, for chained assets, a modification note:

```
Model created with Meshy – CC BY 4.0 License
https://creativecommons.org/licenses/by/4.0/
[if parent_task_id is set] Modified from <parent task id>
```

Adding the URL cannot reduce compliance, only increase it (concept-12 §5.3c).
The `parent_task_id` line discharges the "indicate modifications" element for
refine / retexture / rig / animate chains, which is the one element Meshy's
suggested string does not address.

### 13.3 Binding to carrier slots

By reference to concept-13 §3 — not duplicated here, because the carrier matrix is
that memo's deliverable and a second copy would drift.

| Carrier | Identifier goes in | Credit goes in | Status |
|---|---|---|---|
| GLB | `asset.extras.meshyforge.rights.identifier` | `asset.copyright` | verified (concept-13 §3.1) |
| .gltf | same | same | verified |
| 3MF | §6.2 metadata — **key unverified** | same | blocked on 3MF name verification |
| USDZ | unverified | unverified | blocked on USD verification |
| FBX / OBJ / STL | sidecar `rights.identifier` | sidecar `rights.credit` | no native slot (concept-13 §3.4/§3.5) |

The `asset.copyright` mapping is deliberate: the glTF schema describes that field
as *"suitable for display to credit the content creator"*, which is exactly the
CC BY 4.0 credit's job. The structured record lives in `extras`, so the two never
compete for the same field.

### 13.4 What this section freezes, and what it deliberately does not

**Frozen** (T4 may now write checks against these):

1. The identifier value space is exactly `{LicenseRef-Meshy-Paid-Owned, CC-BY-4.0, NOASSERTION}`.
2. The record stores the three predicates; the identifier is derived, not stored
   as primary fact (§13.1).
3. CC BY 4.0 credit is the three-element template in §13.2, not Meshy's bare
   suggested string.

**Not frozen** — still owner questions at T5:

1. **Q1** whether the prompt (or only its hash) enters the record — concept-13 §5.
2. **Q2** whether deleting an asset deletes its provenance record.
3. **Q3** whether a lineage chain needs per-hop rights or one statement for the
   final asset. §13.2's modification line works for either answer, which is why
   Q3 does not block this reconciliation.

### 13.5 Added to the verification backlog (§12)

6. **What the rights position becomes when a paid-plan ownership condition
   fails.** Neither retrieved article states it. Two `NOASSERTION` rows in §13.1
   depend on this. Resolve by retrieving the primary terms, not by inference.

### 13.6 Adoption work this reconciliation schedules

Recorded as ledger entries so the implementation is owned rather than implied:
`TASK-0040` (rights-record schema + migration), `TASK-0041` (third-party notice
bundle + release step + `AboutPanel`), `TASK-0042` (export contract change and
GLB embedding). Their `blocked_by` edges are set individually rather than
blanket-downstream, because `TASK-0041` is inbound-only and needs no answer to
Q1/Q2/Q3.

## 14. Grounding discipline — eight rules earned by running the programme

Added 2026-11-23, after the programme produced its own corrections. These are
process rules, and they are placed here rather than in
`docs/LESSONS_LEARNED.md` **deliberately**: that file's stated purpose is
"production-relevant failures discovered while validating MeshyForge against real
Meshy tasks", and its Resolution Summary is a table of runtime areas. Adding
grounding discipline there would be the same category error this programme keeps
catching — putting an artifact where it does not belong because it was convenient.

Every rule below is traceable to a specific mistake made in this programme.

| # | Rule | Earned by |
|---|---|---|
| **R1** | **Numbers rule.** Every figure in a memo is pasted from a command run *in that task*, with the counting command recorded in the methodology section. Never hand-sum a previously pasted table | concept-12 §4 stated 411 of 579 (correct: 415) and a breakdown row of "22 expressions / 42 packages" (correct: 18 / 23) |
| **R2** | **Reference-implementation rule.** If a memo concludes "rule X is unenforceable", the task must **run** the dominant implementation of X before concluding — never reason about a hypothetical one | concept-12 §4.1 framed 415 multi-term expressions as a policy problem; `cargo deny` showed all 331 dual-licensed crates pass unchanged |
| **R3** | **Naming-a-tool rule.** Naming a tool as the solution obligates executing it in the same task, or writing `NOT RUN` beside the claim | concept-12 §4.1 asserted `license-checker` implements SPDX evaluation. It does not: `--onlyAllow` is a string comparison and fail-fast |
| **R4** | **Three-axis rule.** Any "can we carry X" analysis reports **write / survive / read** as separate axes. A carrier matrix without a survival column is half a matrix | concept-13 rated GLB embedding by write-cost; an independent 2026-11-14 test showed all three embedded marks vanish on one Blender round-trip (concept-14 §5.2) |
| **R5** | **Search-for-tests rule.** For *practical* questions ("does this survive a round-trip"), search empirical tests alongside specifications. Specs describe intent; tests describe behaviour | The durability answer was in nobody's specification. It was in a nine-day-old hands-on test, found only by searching for it |
| **R7** | **Freshness rule.** A "verified — exit 0" claim has a scope: a commit, a dependency graph, a working tree. When the inputs move the claim **expires** — re-run it, never cite it. Corollary: a verifier must be shown to fail for the **right** reason. A negative test that exits 0, or a guard that breaks on line endings, has proven nothing | `ADR-0017` recorded "verified this pass — exit 0 against the current graph"; the first real run exited **4** (`foldhash` declaring `Zlib`, a crate added after the trial). Separately, a stricter `deny.toml` passed *falsely* because `--config` merges rather than replaces |
| **R8** | **Read-before-gate rule.** Before an evidence gate refers to a document's *structure* (columns, sections, field names), read that structure and quote it | `TASK-0046`'s gate demanded a "Check column" in `GREB` §13.1, which has none — the author had conflated it with the baseline's own §4 table. An unachievable gate, discovered only at execution |
| **R9** | **Single-source rule.** When a policy or identifier exists in executable form, prose **cites** it and never restates it. A second copy is a divergence scheduled for later | Caught at review: the plan had `GREB` listing all thirteen allowlist identifiers beside `deny.toml`. Also why the npm checker reads `deny.toml` instead of owning a list, and why `LM-01` derives the identifier rather than storing it |

**R1 amendment (2026-11-23).** Counts stated in prose rot. "Seven allowlisted
identifiers" became thirteen within a single task; "nine of eleven DEP rules"
should have read twelve. Either re-derive a count immediately before repeating
it, or drop the number and let a test assert it.

**Numbering note.** R6 is the prose rule immediately following this table
(merge, never replace); it was never tabled. R7–R9 were earned during
*execution* rather than during grounding, which is the point: the programme's
own process produced corrections after the memos were finished.

Two structural observations, offered as guidance rather than rules:

- **The reconciliation table is an instrument, not a summary.** concept-11 §13 was
  framed as bookkeeping and produced two findings neither source memo contained:
  that two predicate combinations have *no answer*, and that the identifier must be
  **derived rather than stored**. Build the table early; it is not admin.
- **A fail-fast check is not a gate.** Discovered twice on npm (`--onlyAllow`). A
  check that stops at the first failure yields a verdict, never a baseline. Any
  proposed gate must be able to enumerate.

**A sixth, narrower rule with a concrete downstream consequence.** Any future task
that rewrites a container owned by a third party must **merge, never replace**, and
must prove unknown fields survive. This is why `TASK-0042`'s evidence gate now
requires a foreign `asset.extras` key and an unknown `extensions` entry to round-trip
intact: the export path currently preserves whatever Meshy embeds, and adding our
record must not regress the one property it already gets right.

---

**Status of this memo: grounding only.** No decision is recorded here. The owner of
each decision is named in §10. The owner of the three surviving questions in §9 is
the project owner, at concept-15. §13 freezes a vocabulary for T4's use; it adopts no
control. §14 records process rules earned by the programme's own corrections.





