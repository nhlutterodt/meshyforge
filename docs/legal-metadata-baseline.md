# Legal-Metadata Control Baseline — MeshyForge

| Field | Value |
|---|---|
| **Document** | Legal-Metadata Control Baseline |
| **Version** | 1.0 |
| **Status** | **Decisions recorded** — §6 answered 2026-11-23; ADRs 0017–0021 accepted. Implementation: `TASK-0040`, `TASK-0042`, `TASK-0043`, `TASK-0045`–`0047` |
| **Date** | 2026-11-23 |
| **Derived from** | `docs/governance/grounding/2026-11-23-concept-11…15` (five grounding memos) |
| **Scope** | One person's use, supporting real client work. Not a compliance certification |

---

## 1. What this document is

A baseline of **controls** governing the legal metadata around AI-generated assets:
what the project owes others (**inbound**), what travels with a delivered asset
(**outbound**), and what it can prove later (**internal**).

A control, here, is a numbered rule **plus a named check** **plus** an evidence gate.
That definition is not stylistic. The project's only pre-existing legal control,
`DEP-06`, has been unenforced since it was written and **unsatisfiable as written**;
nothing noticed because nothing checked it (`concept-12` §4, `concept-15` §2). The
admission criterion below exists to prevent a repeat.

### 1.1 Admission criterion

> **No rule enters this baseline without a named check that can be run.**
> A rule that cannot be checked goes to §5 (deliberately not done) with its reason,
> not into §3.

### 1.2 Rule identity — no parallel ID systems

Two namespaces, and the split is deliberate:

- **`LM-*` (this document)** for the *outbound and disclosure plane only* — the
  "asset leaves the app" and "what may be owed on publication" obligations, which
  have **no home** in any existing document.
- **Existing namespaces** for everything that already has one. The dependency-licence
  work edits `DEP-06` and adds rules beside it in `Github_Repository_Expectations.md`;
  it does **not** get new `LM-` IDs. Two IDs for one rule is worse than one slightly
  awkward home.

Rule: **an `LM-` rule must not restate a `DEP`, `SEC`, `REL` or `VP` rule.** If a home
exists, edit the home.

## 2. Status and what blocks what

| Part | Status |
|---|---|
| §3 control register | **Adopted as proposed**, with one amendment: `LM-01`'s table is **five rows**, not four (see §3) |
| §4 inbound controls | **Unblocked** — ADR-0017 accepted. Edits owned by `TASK-0046` (rule text), `TASK-0045` (Rust gate), `TASK-0047` (npm gate) |
| §5 not-done register | Final — seven cuts, each with its reason; `ND-1`'s stated reason corrected, `ND-6` closed |
| §6 decision brief | **Answered by the owner, 2026-11-23** — decisions recorded in §6 |
| §7 ADR candidates | **Accepted as ADR-0017–0021**, including a fourth candidate (§7) that this document had missed |

Every control is now either implemented, owned by a task, or recorded in §5 with
its reason. Nothing in this baseline is waiting on the owner except **Fact A**,
whose absence is itself a recorded, visible state (`NOASSERTION` / `tier-unrecorded`).

## 3. Control register — outbound and disclosure plane

### LM-01 — Every asset carries a recorded rights position

**Rule.** Each asset record stores three independent facts — **plan tier at
generation**, **whether it was published to the Meshy Community**, and **a
third-party-material attestation** — and derives its rights identifier from them. The
identifier is **never stored as the primary fact**.

**Why derived, not stored.** The combinations resolve to three identifiers, and
**two of them have no answer** in the retrieved provider terms
(`concept-11` §13.1). The table has **five** rows, not four: `Fact A`'s answer is
`unknown` until stated, and an unrecorded tier has to resolve for every
published/attested pairing.

| Tier | Published | Attested clear | Identifier | Reason code | Credit required |
|---|---|---|---|---|---|
| Paid | No | Yes | `LicenseRef-Meshy-Paid-Owned` | — | None — ownership, not licence |
| Free | any | any | `CC-BY-4.0` | — | Yes (`LM-03`) |
| Paid | **Yes** | any | `NOASSERTION` | `published-to-community` | Not established |
| Paid | No | **No / unrecorded** | `NOASSERTION` | `material-unattested` | Not established |
| **Unknown / `NULL`** | any | any | `NOASSERTION` | `tier-unrecorded` | Not established |

The **reason code** is a second derived accessor, not decoration: `NOASSERTION`
must render as "not established", and that is useless without stating *which*
fact is missing.

The predicate columns are **three-state**, not two: `TEXT` with
`CHECK (col IN ('yes','no','unknown'))` and no default. `NULL` means
**pre-baseline** (`ND-8`) and is never written again; `'unknown'` is a
**recorded assertion** that the owner does not know. Collapsing the two would
turn "nobody ever asked" into "the owner said they do not know" — a false
statement about the owner.

Storing the identifier would collapse the `NOASSERTION` rows into whatever the
write-time logic guessed, and the unknown would become invisible. Deriving it keeps
the hole visible and lets a corrected reading of the terms re-derive every asset with
no migration.

**Production-inert until Fact A is stated.** With the tier defaulting to
`unknown`, every real asset derives `NOASSERTION` / `tier-unrecorded`, so `LM-03`
never fires outside its fixtures. That is the safe direction — no false ownership
claim, no invented credit — but a green test suite must not be read as "rights
are established".

**Check.** A numbered migration (`004_legal_metadata.sql`) adds the predicate
columns; a Rust test asserts **each of the five rows** above derives its
documented identifier **and** reason code; a test proves `NULL` and `'unknown'`
are distinguishable; the identifier and reason are **derived accessors only**
(no stored column); and no asset may reach `downloaded_at > 0` with an
unrecorded attestation.

**Capture.** `update_asset_rights` (`ADR-0022`) writes the four predicates and the
recording timestamp. Four **enum** arguments, no path and no free text, and
deliberately **no way to write `NULL` back** — a mis-set value can be corrected
but not un-recorded, because `NULL` means pre-baseline. The command returns the
refreshed record, so the frontend renders what Rust derived and never recomputes
it (`ADR-0018` `D-1`).

**Seam.** Internal. **Owner:** `TASK-0040`.

**Honesty note.** Two of the three predicates are **unobservable by the app** —
publishing happens on Meshy's website, and the provenance of an uploaded reference
image is known only to the owner. They are recorded **user assertions with a
timestamp**, and the UI must say so. A control claiming to *verify* them would fail
proportionality test 2.

### LM-02 — Exports carry a versioned provenance record

**Rule.** Every export writes a sibling `<exported>.meta.json` with a
`schema_version` field first. Embedded metadata may be added later; the sidecar is the
baseline, because it is the only carrier that works for all six formats.

**Why sidecar-first** (`concept-13` §4, shape A → B). Sidecar-only is the cheapest
*correct* option; GLB embedding differs by one code path and can be added without a
rewrite, provided the sidecar schema exists first and the embedded form is a
**projection of it**, not a second source of truth.

**Check.** A Rust test asserts a schema-versioned sidecar is written for every export
in every format; the reader refuses an unknown `schema_version` rather than misreading.

The sidecar is a **field allowlist**: identifier, reason code, credit text, the
predicates, `prompt_sha256`, `schema_version`, generation timestamp, parent task
id — and no absolute paths, no signed URLs, no error text. `prompt_sha256` is the
Q1 answer: a digest, never the brief (`ADR-0021`).

**Seam.** Outbound — `export_asset_inner`. **Owner:** `TASK-0042`.

### LM-03 — CC BY 4.0 output carries the attribution it is conditioned on

**Rule.** When the derived identifier is `CC-BY-4.0`, the exported record and any
embedded credit carry this template:

```
Model created with Meshy – CC BY 4.0 License
https://creativecommons.org/licenses/by/4.0/
[if parent_task_id is set] Modified from <parent task id>
```

**Why this and not Meshy's suggested string.** CC BY 4.0 §3(a) makes attribution a
**condition of the licence**, not a courtesy — the provider's polite "we kindly ask"
is the licence term in polite clothing. The required elements include a link to the
licence and an indication of modifications, which the suggested string omits. Adding
them cannot reduce compliance (`concept-11` §13.2).

**Check.** A unit test on the export path with a `CC-BY-4.0` fixture asserts all three
lines; a second fixture with `parent_task_id` set asserts the modification line
appears.

**Seam.** Outbound. **Owner:** `TASK-0042`.

### LM-04 — Rewriting a third-party container must merge, never replace

**Rule.** When export modifies a provider-owned container (a GLB JSON chunk), it
**merges** into the existing structure and preserves unknown keys and extensions.

**Why this is a rule and not a style note.** The app currently ships Meshy's bytes
unmodified, so it already preserves anything embedded. Adding our record is one
careless line away from destroying provenance instead of adding it: serialising a
fresh `asset` object drops provider fields; a `serde_json` round-trip without
unknown-field preservation can drop extensions; and if Meshy ever satisfies a
provider-side marking duty by embedding provenance, this path becomes the thing that
strips it (`concept-14` §11 item 1).

**Check.** A fixture GLB carrying a **foreign `asset.extras` key** and an **unknown
`extensions` entry** round-trips through export with both intact, and the BIN chunk
byte-identical.

**Seam.** Outbound. **Owner:** `TASK-0042`.

### LM-05 — Disclosure is recorded and surfaced, never certified

**Rule.** The record captures a disclosure posture — *does this content depict a real
person or event in an invented situation* — with an explicit **`unknown`** default.
The app informs; it does not block an export and does not assert compliance.

**Why "never certified".** The EU AI Act Art. 50(4) obligation attaches to
**deployers**, at **publication**, and enumerates only "image, audio or video content"
(`concept-14` §2–§3). A 3D geometry file is not enumerated. MeshyForge publishes
nothing, so it cannot be the duty-bearer, and a control claiming to discharge the duty
would assert something outside its own knowledge.

**Check.** The posture field is covered by `LM-01`'s migration and test; it is a
fourth predicate, not a new mechanism.

**Seam.** Internal. **Owner:** `TASK-0040`.

## 4. Inbound controls — the `DEP` plane

These do **not** get `LM-` IDs. They edit existing rules in
`docs/Github_Repository_Expectations.md` after **ADR-0017** is accepted.

| Target | Change | Check | Status |
|---|---|---|---|
| **`DEP-06`** | Restated as an **SPDX-expression policy**: satisfied when some disjunct of the declared expression is allowlisted. Adds `Unicode-3.0`, `Apache-2.0 WITH LLVM-exception`, and `MPL-2.0` **per-crate only** on the five crates proven to arrive through `tauri` | `cargo deny --manifest-path src-tauri/Cargo.toml --exclude-dev check licenses` with a committed `deny.toml` | **Verified this pass** — exit 0 against the current graph. Rule text: `TASK-0046`; the gate itself: `TASK-0045` (neither existed before — no `deny.toml`, no CI job) |
| **`DEP-11`** (new) | A dependency declaring **no licence** is a **failure**, never a pass | Same check for Rust; for npm, `license-checker --json` → SPDX-aware evaluator | Catches `webgl-constants@1.1.1`, which declares nothing. **`TASK-0047`** — the npm half cannot start green |
| **`DEP-12`** (new) | A generated third-party notice bundle ships with every release and is reachable in-app | Build step writes `THIRD_PARTY_NOTICES.md`; test asserts the Geist OFL string and non-zero Apache/MPL entries; `release.yml` attaches it; `AboutPanel` renders it | **Shipped** (`TASK-0041`); the rule text lands with `TASK-0046` |

**Explicitly not `license-checker --onlyAllow`.** It is a string comparison and
fail-fast: two runs over the same tree stopped on different packages, so it can never
enumerate offenders. A fail-fast check is not a gate (`concept-15` §2.3).

**What these discharge.** O-1 (Apache-2.0 §4(d) NOTICE), O-2 (MIT/ISC/BSD notice
retention), O-3 (Geist OFL-1.1, "Copyright 2024 The Geist Project Authors"), O-5
(MPL-2.0 attribution for the five tauri transitives). **All four are unmet today.**

## 5. Deliberately not done

Recorded so these are decisions rather than omissions. Mirrors
`security_threat_model.md`'s residual-risk practice.

| # | Not done | Reason |
|---|---|---|
| ND-1 | Content hash of exported bytes | **Stated reason corrected 2026-11-23.** Originally cut because "no `sha2`/`blake3`/`hex` in `Cargo.toml`" — but all three are already in `Cargo.lock` as transitives, so a direct declaration adds **zero graph delta** (`ADR-0021` now promotes them for the prompt digest). The **decision still stands** on proportionality: the hash protects against post-export tampering, which barely exists for a personal tool serving a trusting client. **Fails test 3**, not test 4. Ordering trap if ever added: compute it **after** embedding, never from the stored file |
| ND-2 | C2PA / Content Credentials signing | No obligation requires it, and the manifest fails validation after any tool re-save. Fails test 3 by a wide margin |
| ND-3 | **Any** control **depending on** an embedded mark surviving a round-trip | An independent 2026-11-14 test: all three embedded GLB marks vanish on one Blender import/export, even with `export_extras=True` (glTF-Blender-IO #2149). **Fails test 1 (survival)**. **Status 2026-11-23: embedding now exists** (`TASK-0042` part B, `src-tauri/src/glb.rs`), but **this cut is unchanged and still correct** — it forbids *relying* on an embedded mark, not *writing* one. The embedded record buys exactly one hop: the file is self-describing at the moment of delivery, before any tool touches it. The sidecar remains the durable carrier |
| ND-4 | 3MF and USDZ embedding | Carrier rows still `UNVERIFIED` — the 3MF reserved metadata names were not retrievable, and USDZ's alignment constraints were never verified. Cannot price what has not been verified |
| ND-5 | STL and OBJ embedding | No container. OBJ comments are dropped on re-export; STL's 80-byte header trips the binary/ASCII heuristic. The sidecar covers both at zero cost |
| ND-6 | ~~Per-hop rights on a lineage chain~~ | **Closed 2026-11-23** — Q3 answered: **one statement for the final asset**. `LM-03`'s `Modified from <parent task id>` line discharges the CC BY modification notice, and `parent_task_id` + `task_log.request_body` already preserve the full chain, so nothing is lost by recording it flat |
| ND-7 | Any **blocking** gate on export | Fails test 1 (the obligation attaches at publication, not export) *and* test 3 (it would obstruct the owner's actual workflow). Inform, never block |
| ND-8 | Retro-stamping assets created before this baseline | Low stakes and reversible; recorded default is **`null` means pre-baseline**, not backfill |
| ND-9 | `E-9` — the dismissible disclosure note at export | Cheap, but speculative until jurisdiction is known. Revisit after §6 |
| ND-10 | ~~Atomic pairing of the exported file and its sidecar~~ | **Closed 2026-11-23 — by ordering, not by staging.** The sidecar is written **after** the copy and committed atomically (sibling `.tmp` + rename in the destination's own directory). The asymmetry decides it: a crash between the two writes leaves a file with **no** record, which is recoverable by exporting again; the reverse order could leave a record describing a file that was never finished — a document asserting provenance that does not exist. The model file itself is still a plain copy: staging it would double peak disk use at the user's destination for no safety gain, because the hazard was always the sidecar lying, and writing it last removes that |

## 6. Decision brief — three questions, two facts (answered 2026-11-23)

**Decisions of record.** Answered by the owner on 2026-11-23; each is written up in
an accepted ADR, and the ADR — not this table — is the authoritative text.

| # | Decision | ADR | Consequence |
|---|---|---|---|
| Q1 | Export carries a **SHA-256 of the prompt**; plaintext stays local | `ADR-0019`, `ADR-0021` | No new prompt column — `assets.prompt` already exists |
| Q2 | Delete removes the **record and the managed files** | `ADR-0020` | Irreversible; `SECURITY.md:26` becomes true |
| Q3 | **One statement** for the final asset | `ADR-0019` | `ND-6` closed |
| Fact A | **`unknown`** until stated | `ADR-0018` | Every asset derives `NOASSERTION` / `tier-unrecorded` |
| Fact B | **No EU/EEA nexus** | — | `ND-9` stays cut; `LM-05` recorded but not surfaced |

Three of the five were reversible and were taken on their recommended defaults.
Q2 was not reversible, which is why it was asked rather than defaulted. Fact A's
answer is a **deferral, not a decision** — and its absence is visible in the data
by design.

Each item carries a **recommended default** and whether the choice is reversible.
Nothing here is a design opinion: each default follows from the memos cited. Answering
these unblocks `TASK-0040`, `TASK-0042` and `TASK-0043`.

### Q1 — Does the provenance record include the prompt text?

**Recommended default: a hash of the prompt, with plaintext available per asset by
explicit opt-in.**

A hash is sufficient for *verification* — you can prove which prompt produced an asset
by revealing the pre-image on demand. Disclosure is irreversible; a hash is not. Where
an irreversible action competes with a reversible one that achieves the same
verification goal, the reversible one is the defensible default (`concept-13` §5). On
client work the prompt can contain a brief, a codename, or a competitor reference, and
embedding it ships it to the client and onward.

| If you choose otherwise | Consequence |
|---|---|
| Plaintext by default | Record is far more useful for provenance; every exported asset carries your brief |
| Omit the prompt entirely | The record cannot distinguish two assets built from the same model at the same time |

**Reversible?** Adding plaintext later is additive. *Removing* plaintext from files
already delivered is impossible.

**Answered (2026-11-23): the hash.** Recorded as `prompt_sha256` in the sidecar,
computed in Rust at export from the existing `assets.prompt` column, `null` when
there is no prompt (`ADR-0021`). One caveat that must not be lost: **a digest is
not confidentiality** — a short or guessable brief can be confirmed by hashing
candidates. It buys verifiability and avoids shipping the brief onward; it must
never be described as protecting a secret.

### Q2 — Does deleting an asset delete its provenance record?

**This question changed shape while planning, and could not have been asked honestly
before.** Current behaviour: `delete_asset` removes the **database row** (and cascades
tags) but **leaves the files on disk** — while `docs/SECURITY.md:26` states that
deleting an asset removes its managed local files. That contradiction is `TASK-0043`.

**Recommended default: provenance is deleted with the asset, and deletion also removes
the managed files** — i.e. make the code match what the documentation already
promises, rather than weakening the documentation to match the code.

Rationale: the present behaviour is the worst combination — the record is destroyed
while the asset survives, so a retained file has no record of what produced it, and
orphans accumulate with nothing tracking them. "Delete" meaning "delete" is also the
least surprising behaviour for a personal asset manager.

| If you choose otherwise | Consequence |
|---|---|
| Retain provenance as an audit ledger | You can answer "what did I deliver in March" — and you retain client briefs indefinitely |
| Correct `SECURITY.md` instead of the code | Less destructive, but orphaned files accumulate and the app contradicts what it told you |

**Reversible?** **No.** Deleting files is irreversible. This is why it is a question
and not a default.

**Answered (2026-11-23): delete the record and the files** (`ADR-0020`). The
implementation is not "call `canonical_asset_path` and remove" — that helper
requires the file to exist, so it cannot tell "already deleted" from "outside the
root". `ADR-0020` separates them structurally and deletes **files first, then the
row**, because a record without files is repairable and files without a record is
the exact loss this baseline exists to prevent.

A third witness surfaced while planning this: `assets.rs:194` carries a doc
comment, *"Does not delete files on disk."* So the contradiction was **two
documents against one code comment**, not two documents against silent code — and
that comment must be rewritten whichever direction won.

### Q3 — Per-hop rights, or one statement for the final asset?

**Recommended default: one statement for the final asset**, with `LM-03`'s
`Modified from <parent id>` line naming the immediate parent.

The only actual obligation here — CC BY 4.0 attribution plus a modification notice —
is discharged either way. Per-hop rights are un-precedented in any practical form, and
`parent_task_id` plus `task_log.request_body` already preserve the full chain, so
nothing is lost by recording it flat.

**Reversible?** Yes. Emitting the chain later is additive; the hops are already stored.

**Answered (2026-11-23): one statement** (`ADR-0019`). `ND-6` is closed.

### Fact A — Which Meshy plan tier do you generate under for real projects?

Feeds `LM-01`'s four-row table directly. Without it, every asset derives
`NOASSERTION` — honest, but useless.

| Answer | Effect |
|---|---|
| Paid only | Assets derive `LicenseRef-Meshy-Paid-Owned` (no credit needed) |
| Free anywhere | Those assets are `CC-BY-4.0`, and `LM-03`'s credit becomes mandatory on delivery — **the current export path would ship them non-compliant** |
| Mixed / varies | The tier must be recorded per asset, which is the design `LM-01` already assumes |
| Prefer not to say | Default the field to `unknown`; every asset records `NOASSERTION` |

**Answered (2026-11-23): `unknown` until stated.** The migration therefore ships
with a fifth derivation row (`tier-unrecorded`) that this table originally lacked,
and the control is **production-inert** until the tier is supplied: every real
asset derives `NOASSERTION` and `LM-03`'s CC BY credit never fires. That is the
safe failure direction. Supplying the tier later needs **no migration** — the
identifier re-derives on read.

### Fact B — Are you, or any client, in the EU/EEA?

Decides whether `ND-9`'s disclosure note is live or speculative, and whether EU AI Act
Art. 50 is in scope at all. Everything in concept-14 is stated as the EU position
because it is the strictest available baseline — so "unnecessary under the EU reading"
implies "unnecessary under a weaker one".

| Answer | Effect |
|---|---|
| Yes | `ND-9` becomes live; `LM-05`'s posture field is worth surfacing |
| No | `ND-9` stays cut. `LM-05` is still recorded, as a cheap habit rather than a duty |

**Answered (2026-11-23): no EU/EEA nexus.** `ND-9` stays cut and the posture field
is recorded but not surfaced. This is reversible in one direction only: if a client
turns out to be in the EU/EEA, surfacing the posture note is additive — the data is
already being captured.

## 7. ADR candidates — three proposed, five accepted

Two of the three were accepted as written; the check surfaced **two more**, one of
which this document should have proposed and did not.

| ADR | Class | Why an ADR | Origin |
|---|---|---|---|
| **ADR-0017** — `DEP-06` as an SPDX-expression policy, three extra identifiers, per-crate `MPL-2.0` | Dependency | Changes what the rule *means*, not just how it reads | Was ADR-A |
| **ADR-0018** — the per-asset rights record: predicates stored, identifier **and reason** derived | Contract / Data | Schema change plus write-path change plus a derived-vs-stored decision that constrains every future reader | Was ADR-B, **amended to five rows** by Fact A |
| **ADR-0019** — export contract change and GLB embedding as a projection | Contract / Architecture | `export_asset` gains an identifier (IPC contract change), and an exported GLB stops being Meshy's bytes unmodified | Was ADR-C |
| **ADR-0020** — deleting an asset removes the record **and** the managed files | Contract / Security | Resolves a documented contradiction and is expensive to reverse | **New — this section missed it** |
| **ADR-0021** — promote `sha2`/`hex` to direct dependencies | Dependency | Adds a dependency (transitively present), authorising the Q1 digest | **New — created by the Q1 answer** |

`ADR-0020` was not in the original list because §7 was written before `TASK-0043`
surfaced the `delete_asset` contradiction; a decision that resolves a doc
contradiction and destroys data on a mis-click met two of `adr-log`'s criteria.
`ADR-0021` did not exist as a candidate because Q1's answer created it, and its
cost turned out to be **zero new crates**.

No ADR needed: the npm evaluator wrapper (an implementation detail of an existing
rule), the notice bundle (additive), the `O-6` notice edit, and `LM-05` (folds into
`ADR-0018`). `adr-log` may disagree about the `release.yml` step and should be
allowed to.

## 8. Action items outside this programme's rules

| Item | Detail |
|---|---|
| **`O-6`** | `Meshy_Documentation/` is tracked in a public MIT repo while its own `README.md:66` says "© 2026 Meshy LLC. All rights reserved." **Recommended:** keep the files with the notice intact **and** add an explicit exclusion stating they are not covered by the repository's MIT `LICENSE`. Rejected deleting them, because historical memos and ADR-0002 cite those paths and the defect is an *accidental* claim rather than the content |
| **`TASK-0043`** | The `delete_asset` / `SECURITY.md` contradiction (§6 Q2) |

## 9. What this baseline does not claim

Inherited from the memos and deliberately not resolved here:

- **The operative Meshy contract was never retrieved.** `meshy.ai/terms-of-use`
  returned HTTP 403; `LM-01`'s table rests on help-centre articles labelled as
  **secondary** sources, retrieved 2026-11-23. Do not represent these to a client as
  the contract's wording.
- **3MF and USDZ carriers are unverified** (ND-4).
- **C2PA 2.5's supported-format table was not retrieved**; ND-2 and ND-3 rest on an
  empirical test plus absence of contrary evidence.
- **EU AI Act Art. 50(1)–(2) were not retrieved verbatim.** Paragraph 2 is the
  provider-side marking duty and is the one provision that would bind Meshy rather
  than the owner — which is why `LM-04` protects provider metadata it cannot yet see.
- **The Digital Omnibus on AI** amends the Act; the amending instrument was not read.
- **`webgl-constants@1.1.1` declares no licence anywhere in its published artefact.**
  Its status is `unknown`, not MIT, until its upstream repository is checked.

---

**Status: Decisions recorded; implementation in flight.** §3 and §5 are settled
(`LM-01` amended to five rows). §4's rules are unblocked by `ADR-0017` and owned by
`TASK-0045`–`0047`. §6 is answered. §7 resolved to five accepted ADRs. What remains
is implementation: `TASK-0043` (deletion), `TASK-0040` (the rights record),
`TASK-0042` (the export record), and the three inbound tasks. `TASK-0041` is done.

