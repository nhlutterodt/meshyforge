# ADR-0017: DEP-06 as an SPDX-Expression Policy

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-23 |
| **Deciders** | Neils (confirmed the SPDX-policy option via the adr-log weight gate, 2026-11-23) |
| **Phase** | Phase 4–5 (governance hardening; applies to every dependency addition) |
| **Related rules/features** | DEP-06, DEP-11 (proposed), DEP-12 (proposed) |
| **Supersedes** | None (restates DEP-06; does not supersede an ADR) |

## Context

`Github_Repository_Expectations.md:1027` states: *"No dependency may be added with
a license other than MIT, Apache-2.0, ISC, or BSD."* The rule has been **unenforced
since it was written** — no `deny.toml` exists, no workflow runs a licence check —
and, as written, it is **unsatisfiable**.

Measurements from `TASK-0035` and `TASK-0038` (recorded in
`docs/governance/task-manifest.yaml`):

1. **415 of 579 Rust packages declare a multi-term SPDX expression** (`MIT OR
   Apache-2.0` being the overwhelming majority). Under a literal reading — "a
   license other than …" — every one of them is a violation.
2. **Under a real SPDX check, all 331 `MIT OR Apache-2.0` crates pass a four-name
   allowlist unchanged.** One disjunct is allowlisted, so the expression is
   satisfied. The decision surface is therefore **3 identifiers, not 415**.
3. A strict policy run (`cargo deny --exclude-dev check licenses`) exits **4 with
   25 rejections**: 18 `Unicode-3.0`, 5 `MPL-2.0`, 1
   `(MIT OR Apache-2.0) AND Unicode-3.0`, and 1 `Apache-2.0 WITH LLVM-exception`.
4. All 5 `MPL-2.0` packages (`cssparser`, `cssparser-macros`, `dtoa-short`,
   `option-ext`, `selectors`) arrive **transitively through `tauri` itself**, as
   do the `Unicode-3.0` crates.
5. `license-checker --onlyAllow` is **unusable as a gate**: it is a fail-fast
   string comparison, and two runs over the same tree stopped on different
   packages, so it can never enumerate offenders.

**Trigger:** needs-an-ADR criteria 2 (extends a numbered rule in the `DEP`
namespace) and 4 (dependency policy). Criterion 6 also applies — dependency
policy is expensive to re-litigate on every new crate.

**Constraints found:**
- `Github_Repository_Expectations.md` §13.1 DEP-06 — the rule this ADR
  restates; §13.1 also hosts DEP-01–DEP-10, so the replacement lives there
  rather than in a new document.
- `docs/legal-metadata-baseline.md` §1.1 — the admission criterion: *no rule
  enters the baseline without a named check that can be run.* A restatement
  without a gate would repeat the defect.
- `concept-15` §2.3 — a fail-fast check is not a gate.
- `tauri` cannot be forked or vendored to remove the `MPL-2.0` transitives
  without abandoning the framework.

**Precedent search record:**
- Searched: `DEP-06`, `DEP-11`, `DEP-12`, `license allowlist`, `SPDX`,
  `cargo deny`, `deny.toml`, `MPL-2.0`, `Unicode-3.0`, `license-checker`
  across `docs/*.md`, `docs/adr/*.md`, `.github/workflows/`, `package.json`,
  `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`.
- Result: **no precedent.** DEP-06 is the only licence rule in any namespace;
  no ADR addresses licence policy; no `deny.toml` and no licence job exist in
  any workflow (re-verified 2026-11-23: `ci.yml` jobs are `security-checks`,
  `notices-check`, `layout-check`, `frontend-checks`, `frontend-tests`,
  `rust-checks`, `build-smoke`).

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A — Restate DEP-06 as an SPDX-expression policy** (satisfied when **some disjunct** of the declared expression is allowlisted), add `Unicode-3.0` and `Apache-2.0 WITH LLVM-exception` to the allowlist, allow `MPL-2.0` **per-crate only** on the five `tauri` transitives; gate on `cargo deny` with a committed `deny.toml` | Enforceable today (exit 0 against the current graph); states what the rule always meant; per-crate `MPL-2.0` keeps the allowance bounded so a *new* MPL crate still fails | The rule text becomes longer; requires maintaining `deny.toml` alongside GREB | None — extends the `DEP` namespace deliberately |
| B — Keep the four-name list, add a blanket exception file for the 24 offenders | Minimal text change | The exception file grows silently and is unbounded; "unknown" and "excepted" become indistinguishable; the 25th offender is invisible | Fails the `LM` admission criterion (a rule must be checkable to mean anything) |
| C — Fork/vendor `tauri` to remove the MPL/Unicode transitives | Purist compliance | Abandons the framework; unbounded maintenance; for a one-person asset manager, fails proportionality test 3 | GREB DEP-10 class of pinning decisions; unsustainable |
| D — Delete DEP-06 | Honest (nothing is claimed) | Loses the only licence control; discretionary choice returns silently | Contradicts O-1/O-2/O-3/O-5 obligations already identified |

## Decision

**Adopt Option A.** `DEP-06` becomes an SPDX-expression policy:

> A dependency is compliant when **at least one disjunct** of its declared SPDX
> licence expression appears in the allowlist: `MIT`, `Apache-2.0`, `ISC`,
> `BSD-2-Clause`, `BSD-3-Clause`, `Unicode-3.0`,
> `Apache-2.0 WITH LLVM-exception`, `Zlib`. `MPL-2.0` is allowed **only** for the five
> crates that arrive transitively through `tauri`
> (`cssparser`, `cssparser-macros`, `dtoa-short`, `option-ext`, `selectors`),
> named individually. A dependency declaring **no** licence is a **failure**.

**Amendment, 2026-11-23 (during implementation).** `Zlib` was added after the
**first real run** of the gate rejected `foldhash v0.2.0` (via
`foldhash → dom_query → tauri-utils → tauri`). The TASK-0038 trial's tally
(18 `Unicode-3.0` + 5 `MPL-2.0` + 1 combined + 1 `LLVM-exception` = 25) left no
room for it, so **the dependency graph moved between the trial and the gate** —
a transitive crate was added or bumped. `Zlib` is OSI-approved, FSF Free/Libre
and permissive, so the policy is unchanged in spirit; the allowlist was one
identifier short. This is the strongest possible argument for the gate existing:
the rule that was going to be declared "verified" had already gone stale, and
only running it revealed that.

**Amendment 2, 2026-11-23 (npm half).** The npm graph uses a **different licence
vocabulary** from Rust, and DEP-06 had only ever been reasoned about as a Rust
rule. The first run of the npm gate produced **8** violations, each needing a
different disposition:

| Package | Declared | Disposition |
|---|---|---|
| `tslib` | `0BSD` | **allow** — public-domain-equivalent |
| `isexe`, `minimatch` | `BlueOak-1.0.0` | **allow** — OSI-approved, permissive |
| `argparse` | `Python-2.0` | **allow** — OSI-approved, permissive |
| `@fontsource-variable/geist` | `OFL-1.1` | **allow** — attribution, discharged by DEP-12's notice bundle (O-3) |
| `caniuse-lite` | `CC-BY-4.0` | **allow** — data licence, attribution, discharged by DEP-12 |
| `meshyforge` | `UNLICENSED` | **skip the root package** — "unlicensed" is correct for a private package and says nothing about what we ship |
| `webgl-constants` | `MIT*` | **recorded exception** — an asterisked identifier is license-checker's *inference*, not a declaration, so DEP-11 applies |

Two consequences worth stating plainly. First, `MIT*` is not `MIT`: DEP-11 says
an *unknown* licence is a failure, and an inference is not a declaration — so
the checker treats any `*`-suffixed identifier as undeclared and requires a
recorded exception. Second, the allowlist is now **one list serving both
graphs** (read from `deny.toml` by the npm checker), which widens the Rust gate
slightly: a future Rust crate declaring `OFL-1.1` would also pass. That is
accepted deliberately — the alternative is two allowlists that drift, and the
attribution duties behind `OFL-1.1` and `CC-BY-4.0` are already discharged by
the notice bundle.

**Check:** `cargo deny --manifest-path src-tauri/Cargo.toml --exclude-dev check
licenses` against a committed `deny.toml`; for npm, `license-checker --json`
piped to an SPDX-aware evaluator (never `--onlyAllow`).

**Newly proposed rule ID(s):**
- `DEP-11` (proposed) — A dependency declaring **no licence** is a failure,
  never a pass. Catches `webgl-constants@1.1.1`, which declares nothing in its
  published artefact.
- `DEP-12` (proposed) — A generated third-party notice bundle ships with every
  release and is reachable in-app. Discharged by `TASK-0041`'s mechanism;
  the rule text lands with this ADR.

## Consequences

**Positive:**
- The rule becomes **true**, **checkable**, and true *today* — `cargo deny`
  exits 0 against the current graph, so the gate starts green rather than
  arriving pre-broken.
- The decision surface is **3 identifiers**, not 415 expressions; reviewers no
  longer have to adjudicate SPDX syntax by eye.
- `MPL-2.0`'s file-level copyleft is handled honestly (per-crate allowance
  rather than a blanket "MPL is fine"), and O-5's attribution duty is discharged
  by the notice bundle that DEP-12 names.
- `webgl-constants@1.1.1`'s undeclared status becomes visible under DEP-11
  instead of being assumed to be MIT.

**Negative:**
- Two sources of truth for the allowlist (GREB prose and `deny.toml`) that can
  drift. Mitigation: `deny.toml` carries a comment naming this ADR, and the
  check's failure message names the five permitted `MPL-2.0` crates.
- The npm evaluator is bespoke code, so it needs its own tests to be trusted.
- A future `MPL-2.0` crate added directly still fails, which is intended but
  will surprise someone once.

**Follow-ups:**
- Docs to update (handoff to `doc-sync`): `Github_Repository_Expectations.md`
  §13.1 — rewrite DEP-06, insert DEP-11 and DEP-12.
- Code: `deny.toml` at repo root; a `license-check` CI job in `ci.yml`;
  `scripts/check-npm-licenses.mjs` for the SPDX-aware npm evaluator.
- Tests to add: a fixture expression table proving `MIT OR Apache-2.0` passes,
  `MPL-2.0` fails unless the crate is one of the five, and an undeclared licence
  fails.

## References

- `Github_Repository_Expectations.md` §13.1 (DEP-06 at line 1027)
- `docs/legal-metadata-baseline.md` §4 (the DEP-plane table), §5 (ND register)
- `docs/governance/grounding/2026-11-23-concept-12-legal-metadata-inbound-obligations.md` §4
- `docs/governance/grounding/2026-11-23-concept-15-control-enforcement-design.md` §2, §2.3
- Related ADRs: ADR-0021 (the one dependency this programme promotes)
- Tasks: `TASK-0035`, `TASK-0038` (measurements), `TASK-0045` (the gate),
  `TASK-0046` (the rule text)