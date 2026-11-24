# Grounding Memo — Concept 12: Inbound Obligations (Plane 1)

Date: 2026-11-23
Status: **Grounding only — no decision, no implementation, no repo edits.**
Scope: What the project owes *other parties*: dependency licence obligations at
distribution, the provider's output-ownership terms, bundled non-code content,
and the notices a released binary must carry. Consumer of
`2026-11-23-concept-11-legal-metadata-charter.md` (§2 plane 1, §3 control
definition, §5 escalation ladder, §7 inbound seam).

Every finding below is reproducible from a command listed in §2. Claims that
could not be verified are in §10, not in the findings.

---

## 1. The headline

Three findings, in order of severity:

1. **`DEP-06` is not merely unenforced, it is unsatisfiable as written**, and has
   been since it was written. 411 of the 579 Rust packages in the production
   graph declare a multi-licence expression that a literal reading of the rule
   rejects — including Tauri's own crates. Enforcing the rule as written would
   fail the build today. (§4)
2. **The provider's terms make rights a function of plan tier**, and the app
   records neither the tier nor the two other predicates the terms attach
   ownership to. Free-tier output is **CC BY 4.0**, which converts the outbound
   record from an optional nicety into a licence condition. (§5)
3. **A released binary carries no notices at all**, while shipping an OFL-1.1
   font that requires its copyright notice to travel with it. (§6, §7)

Finding 1 means the first control in any baseline is not a new control. It is
making an existing rule *testable*. Finding 2 means the outbound work in
concept-13 is downstream of a schema gap, not a formatting choice.

## 2. Method and reproducibility

All commands run from the repository root on 2026-11-23, Node 26.7.0,
cargo 1.98.0.

| Scan | Command | Result |
|---|---|---|
| npm production licences | `node` walk of `package-lock.json` `packages`, skipping `dev: true` | 434 production packages (§3) |
| npm per-package truth | `require('./node_modules/<pkg>/package.json')` | Confirms the lockfile is not lying about missing fields (§3.2) |
| Rust production licences | `cargo metadata --format-version 1`, then a non-dev reverse-walk from the root package | 579 production packages (§4) |
| Rust chains | reverse-edge walk over non-dev edges, shortest path to `meshyforge` | All 5 `MPL-2.0` packages are transitive through `tauri` itself (§4.3) |

Probe scripts were written to `.claude/state/` (gitignored, disposable) and are
**not** committed: this memo proposes checks, it does not install them. That is
concept-15's remit.

Limitation, recorded because it changes what a future CI check can assume:
`cargo metadata --offline` **fails** in this checkout on an uncached
`core-foundation v0.9.4`. The Rust scan required network access.

## 3. npm production licence distribution

435 production packages (22 devDependencies at `package.json` are excluded).

**Correction, 2026-11-23:** this section originally stated 434. The per-licence
table below was correct; the stated total was a hand-sum error, and it propagated
into three later memos before `TASK-0041`'s generator counted the set directly.
This is exactly what rule **R1** in concept-11 §14 exists to prevent — a
figure must come from a command, never from arithmetic over a table already
pasted. The generator now reports the count as part of its own output.

| Licence declaration | Count |
|---|---|
| `MIT` | 378 |
| `ISC` | 22 |
| `BSD-3-Clause` | 9 |
| `Apache-2.0` | 9 |
| `BSD-2-Clause` | 5 |
| `MIT OR Apache-2.0` | 4 |
| `BlueOak-1.0.0` | 2 |
| `OFL-1.1` | 1 |
| `Apache-2.0 OR MIT` | 1 |
| `Python-2.0` | 1 |
| `CC-BY-4.0` | 1 |
| `0BSD` | 1 |
| **no `license` field at all** | **1** |

### 3.1 The nine entries a literal `DEP-06` read rejects

```
@fontsource-variable/geist   OFL-1.1
@tauri-apps/api              Apache-2.0 OR MIT
@tauri-apps/plugin-dialog    MIT OR Apache-2.0
@tauri-apps/plugin-log       MIT OR Apache-2.0
@tauri-apps/plugin-notification  MIT OR Apache-2.0
@tauri-apps/plugin-shell     MIT OR Apache-2.0
argparse                     Python-2.0
caniuse-lite                 CC-BY-4.0
webgl-constants             (none declared)
```

Five of those nine are **Tauri's own packages**, which are dual-licensed by
design. A rule that rejects the framework it governs is not a strict rule, it is
a broken test.

### 3.2 The one package that declares nothing

`webgl-constants@1.1.1` ships with **no `license` field** in its
`node_modules/webgl-constants/package.json` — verified directly, not inferred
from the lockfile. It reaches the bundle via
`webgl-constants ← detect-gpu ← @react-three/drei`, and `@react-three/drei` and
`three` are both production dependencies (`package.json`).

This is the single most useful npm finding, because it is the case no allowlist
scan can ever resolve by string matching: the metadata is simply absent. The
project's actual licence position for that package is **unknown from the
artefact it depends on**. A control must therefore distinguish "declared and
disallowed" from "declared nothing", and the second category needs a recorded
decision, not a pass.

## 4. Rust production licence distribution — and why `DEP-06` cannot be enforced

579 packages in the non-dev graph (dev-dependencies excluded).

| Licence expression | Count |
|---|---|
| `MIT OR Apache-2.0` | 276 |
| `MIT` | 132 |
| `Apache-2.0 OR MIT` | 55 |
| `MIT/Apache-2.0` | 23 |
| `Unicode-3.0` | 18 |
| `Zlib OR Apache-2.0 OR MIT` | 17 |
| `Unlicense OR MIT` | 9 |
| `MPL-2.0` | 5 |
| `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT` | 5 |
| `Apache-2.0/MIT` | 4 |
| `BSD-3-Clause` | 3 |
| `Apache-2.0 OR ISC OR MIT` | 3 |
| `ISC` | 3 |
| `MIT OR Apache-2.0 OR Zlib` | 3 |
| *(remaining 18 expressions, 1–2 packages each)* | 23 |

**Total: 579 packages across 32 distinct declarations.**

### 4.1 The measurement that settles the design question

**415 of 579 packages (71.7%) declare a multi-term licence expression** using
`OR`, `/`, or `AND`. Of those, 331 declare a plain two-way
`MIT OR Apache-2.0` / `Apache-2.0 OR MIT` dual licence — which is Tauri's own
licensing. `DEP-06` as written reads as a string comparison against four values:
`MIT`, `Apache-2.0`, `ISC`, `BSD`. A string comparison rejects every one of the
415.

That includes `tauri` itself, which is dual-licensed `MIT OR Apache-2.0`. So does
`@tauri-apps/api` on the npm side (§3.1).

**Conclusion, stated as a finding rather than an opinion:** `DEP-06` has never
been enforceable as written. Nobody noticed because nothing ever checked it
(concept-11 §6, `.github/workflows/audit.yml:16,24`). Restating it as an SPDX
expression policy — "some disjunct of the declared expression is in the
allowlist" — is not a weakening. It is the only formulation that can be
implemented, and it is the formulation `cargo-deny` implements (G2: dominant
implementation, no escalation needed).

**Correction, 2026-11-23, after the tooling trial in concept-15 §2.** Two points in
the paragraph above did not survive contact with the tools:

1. `license-checker` does **not** implement SPDX expression evaluation. Its
   `--onlyAllow` flag is a string comparison and it is **fail-fast**, so it cannot
   even enumerate offenders (concept-15 §2.3).
2. The framing that these 415 expressions are a *policy* problem was wrong. Under a
   correct check, **all 331 dual-licensed crates pass a four-name allowlist
   unchanged.** The decision surface is three licence identifiers, not 415 packages
   (concept-15 §2.4). Proven empirically: `cargo deny` with the intended policy
   exits 0 today.

### 4.2 A false positive that must not become a rule

`target-lexicon@0.12.16` declares `Apache-2.0 WITH LLVM-exception`. A naive
splitter treats "Apache-2.0" as not equal to "Apache-2.0 WITH LLVM-exception" and
flags it. The exception is *additional permission* layered on Apache-2.0, so the
package is strictly more permissive than the allowlist floor.

Any check built here must normalise SPDX `WITH` clauses, or it produces a finding
that a human then has to dismiss — which is how checks get disabled.

### 4.3 The five `MPL-2.0` packages — and why they are not a defect

```
cssparser@0.36.0        cssparser <- dom_query <- tauri-utils <- tauri <- meshyforge
cssparser-macros@0.6.1  cssparser-macros <- cssparser <- (as above)
selectors@0.36.1        selectors <- dom_query <- tauri-utils <- tauri <- meshyforge
dtoa-short@0.3.5        dtoa-short <- cssparser <- (as above)
option-ext@0.2.0        option-ext <- dirs-sys <- dirs <- tauri <- meshyforge
```

Every one arrives **through `tauri` itself**, not through a project choice. None
appears in `src-tauri/Cargo.toml`'s dependency list. The project cannot remove
them without removing Tauri.

MPL-2.0 is **file-scoped** copyleft: its obligations attach to MPL-covered
source files that are modified and distributed, not to the larger work they are
linked into. The project does not modify or distribute these crates' sources; it
links compiled artefacts into a binary. That is the standard reading, and it is
why MPL-2.0 dependencies are routine in commercial Rust applications.

Two consequences, and one caution:

- `DEP-06` should distinguish **direct dependencies** (the project's own choice,
  where an allowlist belongs) from **transitive packages pulled by a framework**
  (where the choice is "keep Tauri or not", which is not a licence decision).
- The obligation that *does* survive is **attribution**: `MPL-2.0` §3.1 requires
  making the source available to recipients of the covered files. For unmodified
  crates, the practical discharge is the notice bundle naming them with their
  upstream source location (§7).
- **Caution recorded honestly:** this memo is research, not legal advice, and the
  file-scoping conclusion is the standard industry reading rather than a recited
  statute. It should be re-examined if a commercial distribution ever depends on
  it.

## 5. The provider's output-ownership terms — the decisive finding

### 5.1 What was retrieved, and how to read its status

`https://www.meshy.ai/terms-of-use` returned **HTTP 403** from this environment,
so the operative contract text was **not** retrieved. What follows is quoted from
Meshy's own help-centre articles, which are **secondary** sources: they are
Meshy-authored summaries that cite "our Terms of Use", not the terms themselves.

Per concept-11 §12 item 4, nothing below may be represented to a client as the
contract's wording until the primary text is retrieved directly and dated.
Retrieval date for all quotes: **2026-11-23**, both articles displaying
"Updated over 2 weeks ago".

### 5.2 Verbatim, from "What Is the Ownership of the Generated Models"

> "For those on a paid plan, you retain full private ownership of all assets you
> create with Meshy, provided you do not publish them publicly to the Meshy
> Community and that you have used materials that do not violate the copyrights
> of others in the process of creating your model. This includes any uploaded
> image the model was generated from."

> "If you are on a free plan, we grant you a CC BY 4.0 license instead. We kindly
> ask that you credit Meshy for the tool's use in the description of your
> project. Here is an example attribution format you may use: 'Model created with
> Meshy – CC BY 4.0 License'"

The second article, "Can I Use Meshy Assets Commercially", repeats the same
substance and adds: "Under our Terms of Use, if you are a paid customer, you own
the assets created through our platform, provided that you have used materials
that do not violate the copyrights of others in the process of creating your
model."

### 5.3 Three consequences, each of which is a schema requirement

**(a) Rights are a function of plan tier, and the tier is not recorded.**
`assets` has no tier column, and `consumed_credits` is not a proxy — a paid user's
single generation and a free user's single generation can cost the same credits.
The same prompt, same model, same app produces either owned output or CC BY 4.0
output depending on a fact that exists only in the owner's account. **This is a
blocking schema gap** (concept-11 §8), not a formatting preference.

**(b) Two of the three ownership predicates are unobservable by the app.**
Paid-plan ownership is conditioned on (i) not publishing to the Meshy Community
and (ii) not using third-party material that infringes. The app cannot observe
either: publishing is an action on Meshy's website, and the provenance of an
uploaded reference image is known only to the person who supplied it. The only
honest control is a **recorded user assertion**, timestamped, per asset.

This is the charter's §8 point made concrete: a control that records "the owner
asserted X on date D" is a real control; one that claims to verify X is theatre.

**(c) Free-tier output is CC BY 4.0, and attribution is a licence *condition*,
not a courtesy.** The help-centre wording is polite ("We kindly ask"), but
CC BY 4.0 §3(a) makes attribution a condition of exercising the licensed rights —
satisfy it or you are outside the licence. The requirement is broader than the
suggested string: identification of the creator, any supplied copyright notice,
a licence notice with a link to the licence, a disclaimer notice if supplied, and
an indication of modifications, in a reasonable manner.

Practical reading for this project, stated conservatively:

- Meshy's suggested format (`Model created with Meshy – CC BY 4.0 License`) is
  Meshy's own preferred form. It is the safest thing to emit because it is what
  the licensor asked for.
- A technically safer emission is that string **plus** the licence URL, since
  §3(a)(1)(C) calls for a link to the licence. Adding the URL cannot make the
  credit less compliant, only more.
- **Material consequence for client work:** on the free tier the owner receives a
  *licence*, not ownership. Delivering such an asset to a client transfers a
  CC BY 4.0 work — the owner cannot grant exclusive rights, and the client
  inherits the attribution obligation. The app can record this fact; it cannot
  prevent it. Surfacing it at export is the cheapest useful control in the whole
  program.

**(d) The app currently strips the credit line on export, every time.**
`export_asset_inner` is `std::fs::copy` (`assets.rs:269-282`). For a free-tier
asset, that means the delivered file has no attribution and no licence notice. If
the owner's usage is entirely paid-tier, the exposure is nil; if any real project
ever ships free-tier output, the current export path produces a non-compliant
delivery by construction. Concept-11 §9 escalation **Q1** does not change this;
this consequence exists regardless of what Q1 decides.

## 6. Bundled non-code content

### 6.1 The Geist font — a real, quotable obligation

| Fact | Evidence |
|---|---|
| `@fontsource-variable/geist@^5.3.0` is a **production** dependency | `package.json` `dependencies` |
| It is imported into the shipped stylesheet | `src/styles/globals.css:4` — `@import "@fontsource-variable/geist";` |
| Its licence is `OFL-1.1` | `node_modules/@fontsource-variable/geist/package.json` |
| It ships its own notice | `node_modules/@fontsource-variable/geist/LICENSE`, first lines: *"Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font)"* and *"This Font Software is licensed under the SIL Open Font License, Version 1.1."* |

The bundled `.woff2` files are redistributions of Font Software, and OFL 1.1
permits bundling and embedding without fee **provided the copyright notice and
licence travel with it**. The notice exists in `node_modules` and in the built
bundle's assets, but nothing in the app or the release artefact surfaces it to a
recipient, and `node_modules` is not part of what a user receives.

This is the cleanest worked example of a control the program should produce: the
obligation is unambiguous (G1), the required text is already on disk, and the
check is "does the notice bundle contain this string".

### 6.2 The vendored provider documentation — a live, unresolved exposure

`Meshy_Documentation/` is **tracked in git** (19 files confirmed via
`git ls-files`) inside a public repository whose `LICENSE` is MIT. Its own README
ends with:

> `Meshy_Documentation/README.md:66` — "Documentation fetched from
> https://docs.meshy.ai — © 2026 Meshy LLC. All rights reserved."

The MIT `LICENSE` grants rights in "the Software". It does not, on its face,
grant rights in third-party documentation that carries an express
all-rights-reserved notice. The directory also contains the trace of an
automated fetch — it is a vendored copy, not an original work.

Three candidate dispositions, with the trade-offs recorded for concept-15:

| Option | Cost | Risk |
|---|---|---|
| **A. Keep, with the notice intact, plus an explicit provenance note in the repo** | One paragraph | Relies on the notice being a sufficient frame; still a public redistribution of unlicensed text |
| **B. Keep, and link instead of vendoring** | Delete the directory, add links to docs.meshy.ai; grounding memos that cite it must cite the URL instead | Loses offline reference; costs a small rewrite of citations |
| **C. Remove entirely** | Largest edit | Loses the evidence base several grounding memos cite |

**This is not escalated to the owner**, on the charter's G4 test: the choice does
not change what the *baseline* claims, all three options are cheap and
reversible, and the conservative default (B) is available without any judgement
call. concept-15 should pick B or A and record why. What would make it
load-bearing — and therefore an escalation — is if the repository's visibility
ever changed from personal to promotional.

### 6.3 Icons

`lucide-react@^0.460.0` is ISC. `docs/technical_stack_documentation.md:1362`
states *"ISC license. No attribution required."* — which is true as a statement
about **displayed** attribution and imprecise as a statement about licence
obligations: ISC, like MIT, requires the copyright and permission notice to be
preserved in redistributions. The practical effect is identical (the notice
belongs in the bundle generated in §7), but the doc line should not be read as
"nothing is owed here".

## 7. Distribution notices — the gap in the release path

`.github/workflows/release.yml` builds `.dmg`, `.msi`, `.deb`, `.AppImage` and
`.exe`, then uploads those five artefact types to a GitHub Release. There is **no
step** that copies `LICENSE`, no `NOTICE`, no generated attribution file, and no
in-app licences surface (`AboutPanel.tsx:8-37` shows name, version, status link).

Both licence families in use attach obligations to exactly that event:

- **Apache-2.0 §4(d)** — if the work includes a `NOTICE` file, redistributions
  must include a readable copy of its attribution notices. Tauri and several
  dependencies are Apache-2.0-or-dual.
- **MIT / ISC / BSD** — the copyright notice and permission notice must be
  included in copies or substantial portions. The released binary contains
  hundreds of such portions.

Neither obligation is discharged by the repository containing `LICENSE`, because
the recipient receives a `.msi`, not a clone.

The gap is total but the fix is cheap and mechanical, which is the best kind of
control: generate one notice bundle from the dependency graph at build time,
attach it to the release, and expose it in `AboutPanel`. G2 applies
(`cargo-about`, `license-checker --json`, or a small script over the same data
this memo's scans already read): **no escalation**.

## 8. Obligation register

One row per obligation, with the trigger that creates it. This is the artefact
concept-15 turns into numbered controls; concept-15 also costs the checks.

| # | Obligation | Owed to | Trigger | Current state |
|---|---|---|---|---|
| O-1 | Reproduce Apache-2.0 attribution notices from any dependency `NOTICE` files | Each Apache-2.0 licensor | Distributing a binary | **Not met** — no `NOTICE`, no release step |
| O-2 | Include MIT / ISC / BSD copyright + permission notices in redistributions | Each licensor | Distributing a binary | **Not met** — see §7 |
| O-3 | Include the Geist OFL-1.1 copyright notice + licence text | The Geist Project Authors | Distributing a binary containing the font | **Not met** — notice exists in `node_modules` only (§6.1) |
| O-4 | Credit Meshy and reproduce the CC BY 4.0 notice on free-tier output | Meshy LLC | Delivering a free-tier asset to a third party | **Not met** — export strips everything (§5.3d) |
| O-5 | Identify MPL-2.0 covered files and their source location | Each MPL-2.0 licensor | Distributing a binary containing them | **Not met** (§4.3) |
| O-6 | Do not redistribute `Meshy_Documentation/` under an all-rights-reserved notice without a basis | Meshy LLC | Publishing the repository | **Unresolved** (§6.2) |
| O-7 | Record the plan tier, the Community-publication state, and the third-party-material assertion that the ownership grant depends on | The owner, for later defensibility | Every generation | **Not captured** (§5.3a/b) |

O-1 through O-5 share one discharge mechanism (a generated notice bundle), and
O-7 shares one mechanism with concept-13 (a rights-record schema). That
convergence is why this program is small: seven obligations, two mechanisms, both
landing on existing seams.

## 9. Proposed controls (for concept-15 to cost, not to decide)

Candidates with their cheapest sufficient check. **This memo adopts nothing**;
adoption is concept-15's remit and it is expected to cut some of these.

| Candidate | Cheapest sufficient check | Seam |
|---|---|---|
| `DEP-06` restated as an SPDX expression policy, with documented handling of SPDX `WITH` clauses and of framework-transitive packages | `cargo deny check licenses` + `license-checker --failOn`, each with a committed allowlist config | Inbound |
| Fail on any production dependency that declares **no** licence | Same scan, separate rule: `NOASSERTION` is a failure, not a pass | Inbound |
| Generated third-party notice bundle, committed and attached to every release | Build step writes `THIRD_PARTY_NOTICES.md`; a test asserts it contains the OFL notice string | Inbound + Surface |
| Licences view in `AboutPanel` | Component test asserting the bundle is reachable | Surface |
| Per-asset rights record: tier, publication state, third-party assertion, rights identifier, attribution text | Migration + a Rust test asserting population at `save_completed_task` | Internal + Outbound |
| Emit the attribution string in the export path when the rights identifier is `CC-BY-4.0` | Unit test on the export function with a CC BY 4.0 fixture | Outbound |

Note the fifth row: it **would fail today** for every existing asset, which is
exactly the retro-stamp question (concept-11 §9.1 Q5). Its formulation must choose
"null means pre-baseline" or "backfill from `task_log`" before it can be written
as a check.

## 10. Verification backlog — claims this memo does NOT assert

1. **The operative Meshy terms.** HTTP 403; §5.2 quotes are secondary sources.
   Re-retrieve the primary text before any client-facing use.
2. **Whether the free/paid distinction is stable.** The help-centre articles read
   "Updated over 2 weeks ago" as of 2026-11-23. Terms change. Any control that
   encodes the tier distinction should record the retrieval date it relied on, or
   a later change silently invalidates it.
3. **Whether `webgl-constants@1.1.1` has a licence on its upstream repository.**
   The npm artefact declares none. Its repository may; that was not checked.
   Until checked, the correct status is **unknown**, not MIT.
4. **`cargo deny` behaviour against this exact graph** was not run — it is not
   installed. The §9 proposal needs a trial run before adoption, and it will
   surface findings this memo's simpler scan did not.
5. **Apache-2.0 `NOTICE` file presence per dependency** was not checked. O-1 is
   conditional on a dependency actually shipping one.

## 11. Negative search record

Recorded per concept-11 §5 so a later team need not repeat it.

| Term(s) | Where searched | Result |
|---|---|---|
| `provenance`, `attribution`, `rights`, `sidecar`, `spdx`, `c2pa`, `notices`, `third party`, `THIRD-PARTY` | whole repo | 15 hits, **all false positives**: `LICENSE` prose, `package-lock.json` `"license"` fields, CSS strings, doc prose. **Zero implementation.** |
| `license`, `licence`, `LICENSE` | whole repo | Hits only in `LICENSE`, `README.md:164` ("MIT"), `package-lock.json`, `Meshy_Documentation`, and prose in `docs/`. No licence-handling code. |
| `license`, `deny`, `audit`, `sbom`, `notice` | `.github/workflows/*.yml` | Only `audit.yml` (`npm audit`, `cargo audit`). **No licence gate, no SBOM step, no notice step.** |
| `license`, `ownership`, `own the`, `commercial`, `attribution`, `copyright`, `terms` | `Meshy_Documentation/*.md` | **1 hit**, `02-authentication.md:23`, about API-key visibility. The vendored provider docs make no ownership claim. |
| `third-party`, `Licenses`, `About` | `src/**/*.ts` + `src/**/*.tsx` | `AboutPanel.tsx` exists (name/version/status only); no licences surface. |
| `license`, `License` | `docs/technical_stack_documentation.md` | 12 hits, all per-technology licence rows in stack tables. `:1362` adds "ISC license. No attribution required." (§6.3). |

---

**Status of this memo: grounding only.** No decision is recorded. O-1…O-5 and O-7
are owed today; O-6 is unresolved and cheap to resolve. Nothing here is asserted
against the primary Meshy contract, because that document was not retrievable from
this environment.



