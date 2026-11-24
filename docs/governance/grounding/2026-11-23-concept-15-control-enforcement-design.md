# Grounding Memo — Concept 15: Control Enforcement Design (T4)

Date: 2026-11-23
Status: **Grounding only — no decision adopted, no policy committed, no repo edits.**
Scope: Convert concepts 12–14's obligations and candidates into priced, seam-
attached checks, and cut what cannot be checked cheaply. Consumer of
`concept-12` §8/§9, `concept-13` §4, `concept-11` §13 and `concept-14` §9.

Every check below was **actually run**, with versions and results recorded. Probe
configs live in `.claude/state/` and are deliberately **not committed**: this memo
proposes a policy, it does not adopt one.

---

## 1. The headline

1. **`DEP-06`'s intent is sound and its implementation is the only defect.** Under
   a real SPDX-expression check, **all 331 dual-licensed crates pass with no policy
   change at all.** Only **three** licence items in the entire graph need a
   decision. (§2.1)
2. **`cargo deny` works, and the narrow policy works.** Two candidate policies both
   pass at exit 0; the narrower one names exactly five tolerated crates instead of
   blanket-allowing MPL-2.0. (§2.2)
3. **`license-checker --onlyAllow` cannot be the npm gate.** It is string-based and
   **fail-fast**: two runs on identical input stopped on *different* packages, so
   it can never enumerate offenders. (§2.3)

This is also a **self-correction to concept-12 §4.1**, and the correction makes the
baseline smaller. (§2.4)

## 2. Trial runs — what was installed, and what happened

### 2.1 Setup

`cargo-deny` was **not** installed (`error: no such command: deny`). Rather than a
from-source build, the prebuilt release binary was used:

| Item | Value |
|---|---|
| Release | `cargo-deny 0.22.0`, `x86_64-pc-windows-msvc` |
| Artifact | `cargo-deny-0.22.0-x86_64-pc-windows-msvc.tar.gz` (4,885,641 bytes) |
| Integrity | SHA-256 verified against the published `.sha256` — **match** |
| Location | `%TEMP%\cdy\...\cargo-deny.exe`, invoked directly (nothing added to PATH) |

`npx license-checker@25` was run ephemerally; nothing was added to the project.

### 2.2 Rust — three policies, one graph

All three runs used `--manifest-path src-tauri/Cargo.toml --config <probe>` from the
repo root. Probes: `.claude/state/deny-probe-{a-strict,b-broad,c-narrow}.toml`.

| Probe | Policy | Exit | Rejections |
|---|---|---|---|
| **A — strict** | The four names `DEP-06` lists, plus the obviously-permissive set already in use (10 entries) | **4** | **25** |
| **B — broad** | A + `Unicode-3.0`, `MPL-2.0`, `Apache-2.0 WITH LLVM-exception` | **0** | **0** |
| **C — narrow** | A + `Unicode-3.0`, `Apache-2.0 WITH LLVM-exception`, and `MPL-2.0` granted **per-crate** to the five tauri transitives | **0** | **0** |

The 25 strict rejections, grouped by declared expression:

```
18 x Unicode-3.0
 5 x MPL-2.0
 1 x (MIT OR Apache-2.0) AND Unicode-3.0
 1 x Apache-2.0 WITH LLVM-exception
```

Three observations that matter more than the counts:

1. **Zero rejections were `MIT OR Apache-2.0`.** All 331 dual-licensed crates
   passed a ten-name allowlist. cargo-deny evaluates the SPDX expression, so a
   disjunction is satisfied by one allowed term.
2. **`AND` behaves differently from `OR`, correctly.** `(MIT OR Apache-2.0) AND
   Unicode-3.0` failed because the crate genuinely requires *both*: allowing MIT is
   not enough. Any policy must allow `Unicode-3.0`, not merely tolerate it.
3. **The `WITH` clause is a real, separate licence identifier.** `Apache-2.0 WITH
   LLVM-exception` failed until named explicitly — concept-12 §4.2 predicted this
   false positive and the prediction was correct.

**Config C is the stronger policy**, and not for pedantic reasons: allowing
`MPL-2.0` globally would silently permit a future *direct* dependency under a
file-scoped copyleft licence, whereas C requires that to be an explicit, reviewable
edit. The five exceptions are the exact set concept-12 §4.3 traced to `tauri`.

### 2.3 npm — the built-in flag fails as a gate, on two counts

Two runs, identical dependency tree, `--production`, different allow lists:

| Run | Allow list | Result |
|---|---|---|
| 1 | 11 permissive names | Exit **1** — `Package "@fontsource-variable/geist@5.3.0" is licensed under "OFL-1.1" which is not permitted by the --onlyAllow flag. Exiting.` |
| 2 | Same + `OFL-1.1;Python-2.0;CC-BY-4.0` | Exit **1** — `Package "isexe@3.1.5" is licensed under "BlueOak-1.0.0" which is not permitted by the --onlyAllow flag. Exiting.` |

Two independent defects, both demonstrated rather than assumed:

1. **String-based, not SPDX-aware.** Run 1 rejected the OFL font on a literal string
   comparison. Whether `MIT OR Apache-2.0` would also be rejected cannot be observed
   directly because the tool never gets that far — which is defect 2.
2. **Fail-fast.** It exits on the **first** offending package, and the traversal
   order is not stable: two runs over the same tree stopped on *different*
   packages. **The flag can never enumerate what is wrong.** A CI gate built on it
   produces "something is wrong" and nothing actionable.

Note also that run 2's failure on `BlueOak-1.0.0` is a package the earlier
`package-lock.json` scan did flag (2 occurrences) — so both approaches agree on
the facts; they differ only in whether you learn all of them at once.

**Conclusion:** the npm gate must be `license-checker --json` piped into an
SPDX-aware evaluator, **not** `--onlyAllow`. The evaluator already exists as a
proven prototype (concept-12 §2's scan), so this is a wrapper, not new work.

### 2.4 Self-correction to concept-12 §4.1

concept-12 §4.1 reads: *"**415 of 579 packages (71.7%) declare a multi-term licence
expression** using `OR`, `/`, or `AND`… A string comparison rejects every one of
the 415."* That framing implied the dual licences were **a policy problem**. They
are not.

What the trial shows: a **correct** implementation admits all 331 dual-licensed
crates with no change to the four intended names. The defect was never the graph —
it was that `DEP-06` was written as a string comparison *and* shipped with no check.
Restating it as an expression policy is therefore **not a weakening of the rule**;
it is the rule finally doing what it says.

This shrinks the decision surface from "reconcile 415 packages" to **three licence
identifiers**: `Unicode-3.0`, `MPL-2.0` (per-crate), `Apache-2.0 WITH
LLVM-exception`. concept-12's conclusion stands; its framing was too pessimistic.

### 2.5 Dev-dependency check, because the first runs were ambiguous

The three runs above did not pass `--exclude-dev`, so their counts could have
included dev-only crates. Re-running both ends of the range with
`--exclude-dev` gives **identical** results:

```
a-strict  --exclude-dev -> EXIT=4  rejected=25   (same breakdown)
c-narrow  --exclude-dev -> EXIT=0  rejected=0
```

**So none of the 25 offenders is dev-only** — all sit in the production graph, which
is what actually ships. The adopted check should still pass `--exclude-dev`, because
the graph will change and the intent is to gate what ships.

*(Placement note for whoever wires CI: `--exclude-dev` is a **top-level** argument
and must precede `check`. Passing it after `check licenses` fails with
`unexpected argument`, exit 2 — which is how that was discovered.)*

## 3. The register — priced, seam-attached, and fate-assigned

Verdicts: **ADOPT** (ships in baseline v1), **CUT** (goes to the not-done register),
**DEFER** (blocked on a named verification).

| # | Control | Seam | Exact check | Measured cost | Verdict |
|---|---|---|---|---|---|
| **E-1** | `DEP-06` restated as an SPDX-expression policy using config **C** | Inbound | `cargo deny --manifest-path src-tauri/Cargo.toml check licenses` with a committed `deny.toml` | ~40-line config; binary install in CI; run takes seconds | **ADOPT** |
| **E-2** | `NOASSERTION` is a failure, never a pass | Inbound | Rust: covered by E-1. npm: `license-checker --json` → evaluator rejects missing/empty `license` | Reuses E-1 config; one branch in the evaluator | **ADOPT** — catches `webgl-constants@1.1.1` |
| **E-3** | npm licence gate | Inbound | `npx license-checker@25 --production --json` → SPDX-aware evaluator → non-zero on any unsatisfied package | ~60-line wrapper over the proven prototype | **ADOPT** (explicitly **not** `--onlyAllow`, §2.3) |
| **E-4** | Generated `THIRD_PARTY_NOTICES.md` attached to every release | Inbound + Surface | Build step writes it; test asserts the Geist OFL string and non-zero Apache/MPL entries; `release.yml` attaches it | One generator + one test + one workflow step | **ADOPT → `TASK-0041`** |
| **E-5** | Licences view in `AboutPanel` | Surface | Component test asserting the bundle is reachable | One presentational component | **ADOPT → `TASK-0041`** |
| **E-6** | Rights record: tier, publication state, attestation, derived identifier | Internal | Migration + Rust test over the four states in concept-11 §13.1 | Already scheduled | **ADOPT → `TASK-0040`** |
| **E-7** | CC BY 4.0 credit emitted on export | Outbound | Unit test on the export path with a `CC-BY-4.0` fixture | Inside `TASK-0042` | **ADOPT → `TASK-0042`** |
| **E-8** | `D-1` disclosure assertion (concept-14 §9) | Internal | Folds into `TASK-0040`'s migration; one predicate, derived | One nullable column, no new task | **ADOPT**, folded |
| **E-9** | `D-2` dismissible disclosure note at export | Surface | One component test | One line of copy | **DEFER** — value depends on jurisdiction (concept-14 §10); revisit at synthesis |

## 4. The cuts — with reasons, because a register without cuts is a wish list

| # | Cut | Reason |
|---|---|---|
| **C-1** | Content hash of exported bytes | No `sha2`/`blake3`/`hex` in `Cargo.toml`; std has no crypto hash. Protects against post-export tampering, which barely exists for a personal tool serving a trusting client. **Fails proportionality test 3.** Recorded as a one-dependency upgrade path |
| **C-2** | C2PA signing | concept-14 §6: no obligation requires it, and the manifest fails validation after any tool re-save (§5.2 there). Fails test 3 by a wide margin |
| **C-3** | **Any** control that depends on an embedded mark surviving a round-trip | concept-14 §5.2: all three GLB marks vanish on one Blender import/export. A control here would assert something the recipient's first tool erases. **Fails test 1 (survival)** |
| **C-4** | 3MF and USDZ embedding | Carrier rows still `UNVERIFIED` (concept-13 §8). Cannot price what has not been verified |
| **C-5** | STL and OBJ embedding | concept-13 §3.4: no container; OBJ comments are dropped on re-export, STL's 80-byte header trips the binary/ASCII heuristic. Sidecar covers both at zero cost |
| **C-6** | Per-hop rights on a lineage chain | Q3 is still the owner's. And concept-11 §13.2's "Modified from `<parent id>`" line discharges the CC BY modification notice either way, so nothing is blocked by deferring it |
| **C-7** | Any **blocking** gate on export | Fails test 1 (the obligation attaches at publication, not export — concept-14 §8) *and* test 3 (it would obstruct the owner's actual workflow). Inform, never block |

Seven cuts, seven reasons. Notably **four of the seven** were already named as likely
cuts in `concept-12` §9 and §13 before any tooling ran, which is the evidence that the
proportionality test is doing work rather than being applied post-hoc.

## 5. `O-6` disposition — the vendored provider documentation

concept-12 §6.2 costed three options and handed the choice here. **Recommendation:
a modified Option A.**

`Meshy_Documentation/` is tracked in a public repository whose `LICENSE` is MIT,
while its own `README.md:66` says *"© 2026 Meshy LLC. All rights reserved."* Keeping
the files and keeping their notice **intact** is the cheapest honest position, but it
needs one addition the original Option A lacked:

- **State the exclusion explicitly** — a short notice beside the directory recording
  that these are third-party documents, redistributed unmodified with their own
  notice, and **not** covered by the repository's MIT `LICENSE`.

Why this over Option B (delete and link):

1. **The citation base.** Historical grounding memos and ADR-0002 cite
   `Meshy_Documentation/...` paths. Deleting the directory silently orphans those
   citations in immutable documents.
2. **The residual risk is small and bounded.** It is a redistribution of published
   product documentation, with its notice preserved, in a personal repository. The
   worst realistic outcome is a request to remove it.
3. **Explicitness is the entire point of this programme.** The current state is an
   *accidental* claim (MIT covers everything, apparently). The fix is not to shrink
   the content; it is to stop making a claim the project cannot support.

Fallback: if Meshy ever objects, Option B becomes immediate and cheap. Recorded, not
pre-emptive.

**Routing:** this is a repo-content and `LICENSE`/`NOTICE` edit. It is **not** an ADR
and **not** this programme's to execute — it belongs in baseline v1's action list and
then a normal task.

## 6. Routing — what needs an ADR, and what does not

Per the charter's §10 boundary, this memo **routes**; it does not decide. Three ADR
candidates, and the classification reasoning is adr-log's to confirm.

| ADR candidate | Class | Why it is not a plain doc edit |
|---|---|---|
| **ADR-A — `DEP-06` as an SPDX-expression policy**, including the three extra identifiers and the per-crate MPL allowance | **Dependency** | It changes what the rule *means*, not just how it reads. `DEP-06` is Dependency-class and per `model-routing.md` that is T3 for `adr-log`, with its confirm-before-write gate intact |
| **ADR-B — the per-asset rights record** (predicates stored, identifier derived) | **Contract / Data** | A schema change plus a write-path change plus a derived-vs-stored decision that constrains every future reader. Same shape as ADR-0015's boundary decision |
| **ADR-C — export contract change and GLB embedding** | **Contract / Architecture** | `export_asset` gains an identifier (an IPC contract change), and an exported GLB stops being Meshy's bytes unmodified. Both are things consumers can observe |

**No ADR needed:** E-3 (the npm wrapper — an implementation detail of an existing
rule), E-4/E-5 (notice bundle and licences view — additive, no contract change;
`adr-log` may disagree on the `release.yml` step and should be allowed to), E-8
(folds into ADR-B), the `O-6` notice edit (a content and `LICENSE` edit).

## 7. Handoff to baseline v1 — ranked by value per unit of cost

This is the ordering `TASK-0039` should consider, cheapest-highest-value first:

| Rank | What | Why here | Owner input needed |
|---|---|---|---|
| 1 | **E-4 + E-5** notice bundle, release step, `AboutPanel` | Discharges four obligations (O-1/O-2/O-3/O-5) that are **unmet today**; needs no answer to Q1/Q2/Q3; already scheduled as `TASK-0041`, blocked only on this memo | None |
| 2 | **E-1 + E-2 + E-3** licence gate | Turns a rule that has never been checked into a check that passes today (config C, exit 0). Needs ADR-A first | None |
| 3 | **E-6 + E-8** rights record | Highest intrinsic value, but blocked on Q1/Q2 and on the plan-tier fact | Q1, Q2, **tier** |
| 4 | **E-7** CC BY credit on export | Depends on E-6 and on ADR-C | Q1 |
| 5 | **E-9** disclosure note | Cheap but speculative until jurisdiction is known | **jurisdiction** |

The shape of that table is the programme's own conclusion: **the two unblocked items
are inbound**, and every outbound control waits on the owner. That is not a
coincidence — inbound obligations were always the ones the app could discharge on its
own.

## 8. Verification backlog — what this memo does NOT assert

1. **CI installation strategy for `cargo-deny`.** The trial used a manually verified
   prebuilt binary. Whether CI should use a pinned download, a marketplace action, or
   a build from source is **undecided and unpriced** (cold-cache build time unmeasured).
2. **`cargo deny` runtime on a cold cache in CI.** The local runs used a warm krates
   cache; the first CI run will be slower. Not measured.
3. **`cargo-deny` 0.22 config schema stability.** `[licenses] version = 2` and
   `[[licenses.exceptions]] crate = "…"` worked. Not checked against other versions.
4. **Exact `license-checker` version resolved.** `npx license-checker@25` resolved to
   a specific minor that was not recorded, and its output shape was not diffed against
   the local prototype.
5. **Whether `license-checker --json` reports missing licences at all.** Untested. E-2
   depends on it reporting `webgl-constants` rather than omitting it — if it omits,
   the evaluator must diff against the lockfile instead.
6. **The count of npm offenders under a correct evaluator.** Only two individual
   packages were observed (geist, isexe); the full list under SPDX-aware evaluation was
   never enumerated, because the tool cannot do it (§2.3).

## 9. Negative search record

| Term(s) | Where searched | Result |
|---|---|---|
| `deny.toml`, `cargo-deny`, `license-checker`, `license-checker-config`, `THIRD_PARTY` | repo root, `.github/workflows/`, `scripts/`, `src-tauri/` | **Zero matches.** No licence tooling, no config, no notice generator exists anywhere in the repo |
| `licen`, `deny`, `sbom`, `notice`, `audit` | `.github/workflows/*.yml` | Only `audit.yml`'s `npm audit` and `cargo audit`. No licence gate, no SBOM, no notice step (confirmed again this pass) |
| `exclude-dev`, `--config`, `--manifest-path` | `cargo-deny --help` / `check --help` | `--config` and `--manifest-path` are global; **`--exclude-dev` is global, not per-check** (§2.5) |

---

**Status of this memo: grounding only.** No policy is adopted, no config is
committed, and no dependency was added to the project — `cargo-deny` was run from a
verified binary in `%TEMP%`, and the three probe configs are gitignored probe files in
`.claude/state/`. Nine measures, seven cuts, three ADR candidates and a ranked
handoff are the deliverable; `TASK-0039` decides among them.


