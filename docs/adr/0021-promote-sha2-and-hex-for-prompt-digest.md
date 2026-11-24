# ADR-0021: Promote `sha2` and `hex` to Direct Dependencies for the Prompt Digest

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-23 |
| **Deciders** | Neils (answered §6 Q1 — prompt travels as a hash — 2026-11-23) |
| **Phase** | Phase 4–5 |
| **Related rules/features** | `LM-02` (record fields), DEP-06 (ADR-0017), `ND-1` |
| **Supersedes** | None |

## Context

Q1's answer is that the export carries a **SHA-256 of the prompt** rather than its
plaintext. Without a digest, the record cannot distinguish two assets generated
from the same model at the same time, and provenance becomes unverifiable.

`ND-1` cut a *content* hash of exported bytes, and gave as its reason:
*"No `sha2`/`blake3`/`hex` in `Cargo.toml`; std has no crypto hash."*

That reason is **inaccurate about the cost**. The first clause is true of
`Cargo.toml`; the crates are already in the built graph:

```
src-tauri/Cargo.lock:  name = "sha2"   name = "hex"   name = "digest"
                       (also ring, sha-1, sha1)
```

So promoting `sha2` and `hex` to direct dependencies adds **zero new crates** —
no new code, no new licence surface, no new CVE surface, no new compile time.

**Trigger:** needs-an-ADR criterion 4 (adds a dependency, even one already
present transitively).

**Constraints found:**
- `src-tauri/Cargo.toml` declares 11 direct dependencies; `base64 = "0.22"` is
  precedent for promoting a small utility crate the same way.
- ADR-0017 — `sha2` and `hex` are both `MIT OR Apache-2.0`, so each passes the
  SPDX policy on a disjunct; no allowlist change is required.
- `D-3` — the sidecar is assembled in **Rust**, never in the frontend, so the
  digest cannot be computed in TypeScript.
- `assets.prompt` is `TEXT` and nullable (`001_initial.sql:9`), so the digest is
  `null` when there is no prompt (image/video tasks).
- `THIRD_PARTY_NOTICES.md` is generated from the dependency graph
  (`TASK-0041`); the two crates are already listed as transitive, so the bundle
  does not change, but `notices:write` must be re-run to prove it.

**Precedent search record:**
- Searched: `sha2`, `blake3`, `hex`, `digest`, `hash`, `checksum`, `Cargo.lock`
  across `src-tauri/Cargo.{toml,lock}`, `docs/*.md`, `docs/adr/*.md`.
- Result: **`ND-1`** is the only prior decision touching hashing, and it declines
  one. No ADR authorises a hash dependency.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A — Promote `sha2` + `hex` to direct deps** | Zero graph delta (both already compiled in); standard, audited implementations; one-line declaration each; also clears `ND-1`'s *technical* blocker | Two entries in `Cargo.toml` to justify | None |
| B — Omit the prompt from the record entirely | No dependency | The record cannot distinguish same-model assets; loses the verification path Q1 asked for | Fails the purpose of Q1 |
| C — Vendor a small SHA-256 implementation | No dependency declaration | Hand-rolled crypto adjacent code to review and maintain; strictly worse than an audited crate already in the graph | Violates "prefer the audited implementation" |
| D — Hash in the frontend and pass it down | No Rust change | Violates `D-3` (the record must not be assembled in the frontend); the digest would not be recomputable server-side | Conflicts with ADR-0019 |

## Decision

**Adopt Option A.** Add to `src-tauri/Cargo.toml`:

```toml
sha2 = "0.10"
hex = "0.4"
```

The prompt digest is `hex::encode(Sha256::digest(prompt.as_bytes()))`,
lowercase, emitted as `prompt_sha256` in the export record, and **`null`** when
`assets.prompt` is `NULL`. It is computed at export time in Rust from the stored
prompt, so it is always consistent with the record it accompanies.

**Check:** a unit test pins a known vector (`"abc"` →
`ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`); a test
proves `prompt_sha256` is `null` when the prompt is absent; `cargo deny` remains
at exit 0 (no allowlist change); `npm run notices:check` remains clean.

## Consequences

**Positive:**
- The digest costs **nothing** in build time, binary size, licence surface, or
  vulnerability surface — the crates were already there.
- Q1's verification goal is met without shipping the brief to the client.
- The record distinguishes same-model, same-time assets.

**Negative:**
- **A digest is not confidentiality.** A short or guessable prompt can be
  confirmed by hashing candidates; the field protects against casual disclosure
  and gives verifiability, and must not be described as protecting a secret.
  The UI and documentation must not overclaim it.
- Two more direct dependencies to keep updated under DEP-07.
- `ND-1`'s *stated reason* was wrong and is corrected here; `ND-1`'s
  **decision** stands unchanged, because its proportionality argument
  (post-export tampering barely exists for this use case) is independent of the
  dependency cost.

**Follow-ups:**
- Docs to update (handoff to `doc-sync`): `docs/legal-metadata-baseline.md`
  `ND-1` (correct the stated reason), `LM-02` (the `prompt_sha256` field).
- Code: `Cargo.toml`; the digest helper in the export path.
- Tests to add: the known vector, the `null` case, and a same-model two-asset
  fixture proving the digests differ.
- Tech debt to register: none; `ND-1` stays cut, with an accurate reason.

## References

- `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`
- `docs/legal-metadata-baseline.md` §3 `LM-02`, §5 `ND-1`, §6 Q1
- `src-tauri/migrations/001_initial.sql:9` (`assets.prompt`)
- Related ADRs: ADR-0017 (licence policy), ADR-0019 (the record that carries it)
- Tasks: `TASK-0042`
