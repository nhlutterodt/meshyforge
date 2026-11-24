# Grounding Memo — Concept 13: Outbound Provenance Record (Plane 2)

Date: 2026-11-23
Status: **Grounding only — no decision, no implementation, no repo edits.**
Scope: What must travel with an exported asset, and which of the export formats
can physically carry which parts of it. Consumer of
`2026-11-23-concept-11-legal-metadata-charter.md` (§2 plane 2, §7 outbound seam).
Supplies the carrier facts that concept-14 (disclosure) depends on.

Every carrier claim carries its verification status. Claims that were not verified
are in §8 and are **not** used to reach a conclusion.

---

## 1. The seam, stated exactly

```rust
// src-tauri/src/commands/assets.rs:269-282
pub(crate) fn export_asset_inner(
    data_dir: &Path,
    path: &str,
    destination_path: &str,
) -> Result<(), String> {
    let canonical_path = canonical_asset_path(data_dir, path)?;
    std::fs::copy(&canonical_path, destination_path)...
}
```

Three consequences fix the shape of everything below:

1. **Export is a byte copy.** Whatever is not in the file at `path` is not in the
   delivery. There is no second artefact.
2. **The seam has no asset context.** `export_asset_inner` receives a *path*, not
   an asset id, so it cannot look up `prompt`, `ai_model`, or a rights record.
   Any outbound record requires the command signature to gain the asset identity.
   That is a contract change, which is why this is ADR-class and not a patch.
3. **`export_asset` is path-based by design** (ADR-0007, `assets.rs:243-255`),
   and the path is validated as rooted under `data_dir/assets`. Adding asset
   identity must not weaken that containment check.

## 2. What must travel — the field inventory

Derived from concept-11 §8 and concept-12 §5/§8, ordered by the obligation that
forces each field.

| Field | Forced by | Available today | Notes |
|---|---|---|---|
| Asset id / task id | Traceability | `assets.id` | Already the Meshy task UUID |
| Tool + version (`generator`) | Provenance | `src/lib/constants.ts` | glTF has a first-class slot for exactly this |
| Generation timestamp | Provenance | `assets.created_at` | Unix ms in DB → needs ISO 8601 in the record |
| Provider + model | Provenance | `assets.ai_model`, `meshy_type` | |
| Task type | Provenance | `assets.meshy_type` | 30 variants, `provider/types.rs` |
| Rights identifier | O-4, O-7 | **none** | Core value: `LicenseRef-Meshy-Paid-Owned`, `CC-BY-4.0`, … |
| Attribution text | O-4 | **none** | Required for CC BY 4.0 output |
| Plan tier | O-7 | **none** | Determines which rights identifier is correct |
| Third-party-input assertion | O-7 | **none** | A recorded user assertion, not a verified fact |
| Lineage (`parent_task_id`) | Q3 (open) | `assets.parent_task_id` | Emitted or not per concept-11 §9 Q3 |
| Prompt text | Q1 (open) | `assets.prompt` | **Do not emit by default** — see §5 |
| Record schema version | Forward compat | — | e.g. `1` |

Note that the two open questions (Q1, Q3) are **field-population** questions, not
**shape** questions. The record's shape can be settled before they are answered;
only the defaults depend on them. That is what makes it safe to run concept-14
while Q1/Q3 are still with the owner.

## 3. The carrier matrix

**Status**: `VERIFIED` = confirmed in this pass against the cited source;
`HIGH` = format-spec trivial and not re-read in this pass; `UNVERIFIED` = not
confirmed, do not build on it yet.

| Format | Native slot for rights? | Native slot for arbitrary data? | Cost to write | Status |
|---|---|---|---|---|
| **GLB** | `asset.copyright` (string), `asset.generator` (string) | `asset.extras` (any JSON, via `glTFProperty`) | **Low** — JSON chunk rewrite; `serde_json` is already a dependency | **VERIFIED** |
| **.gltf** (JSON) | Same as GLB | Same as GLB | **Trivial** — it is JSON on disk | **VERIFIED** |
| **3MF** | §6.2 "Core Properties"; Appendix B.2 "3MF Metadata Example" | §6.2 metadata elements | **Medium** — ZIP package, needs a ZIP writer | Partly (§3.2) |
| **USDZ** | USD `assetInfo` / layer `customLayerData` | same | **High** — ZIP + alignment constraints | **UNVERIFIED** (§8) |
| **FBX** | None standardised | Not practically | **Not practical** — binary property encoding without the FBX SDK | **HIGH** |
| **OBJ** | None | `#` comment lines only | **Low but not durable** (§3.4) | **HIGH** |
| **STL** | None | 80-byte binary header / `solid` name | **Writable but inadvisable** (§3.4) | **HIGH** |

### 3.1 GLB — verified, and cheaper than it looks

The `asset` object's normative schema
(`KhronosGroup/glTF` → `specification/2.0/schema/asset.schema.json`, retrieved
2026-11-23) declares exactly:

- `copyright` — **string** — *"The copyright message suitable for display to
  credit the content creator."*
- `generator` — **string** — *"The tool used to generate the asset."*
- `version` — **string**, required, pattern `^(0|[1-9][0-9]{0,8})\.(0|[1-9][0-9]{0,8})$`
- `minVersion` — **string**, same pattern

plus `"$ref": "glTFProperty.schema.json"`, which is where `extensions` and
`extras` come from. So `asset.copyright` is not a workaround: the specification
reserves a string for precisely "credit the content creator". `asset.extras`
carries the structured record, since it accepts arbitrary JSON.

Cost: a GLB is a 12-byte header followed by length-prefixed chunks. Rewriting the
JSON chunk means reading the chunk table, replacing chunk 0, re-padding it, and
rewriting the total length — tens of lines over `serde_json` plus byte slicing.
**No new dependency.** Because `bufferView` offsets are relative to the BIN
chunk, and the BIN chunk carries its own length in its header, replacing the JSON
chunk does not invalidate geometry.

Two caveats worth recording:

- **Padding is spec-defined and easy to get wrong.** The JSON chunk is padded to
  a 4-byte boundary with trailing spaces and the BIN chunk with zeros (glTF 2.0
  §4.4.3). Getting it wrong produces a file some loaders accept and others reject
  — the worst failure mode. Verify against §4.4.3 at implementation time.
- **Durable once written? No.** This section measures the capability to *write*,
  not survival. concept-14 §5.2 documents an independent 2026-11-14 test in which
  all three embedded GLB marks — `KHR_xmp_json_ld`, `asset.extras` and
  `asset.generator` — **disappeared on a single Blender 5.2.1 import/export
  round-trip**, with `export_extras=True` making no difference (upstream
  glTF-Blender-IO issue #2149). Embedding is still worth doing because it is
  nearly free, but no control may be written that *depends* on the mark surviving
  the recipient's first tool.
- **GLB is currently produced by Meshy and downloaded verbatim**
  (`download_asset_inner`, per concept-09's grounding). Editing it at export means
  MeshyForge no longer ships the provider's bytes unmodified. That is a real change
  in what the file *is* and belongs in the ADR, not in a commit message.

### 3.2 3MF — verified to have a home, unverified as to its contents

The 3MF Core Specification **v1.4.0** table of contents was retrieved 2026-11-23
and confirms the document contains §6.2 "Core Properties", §6.3 "Digital
Signatures", and Appendix B.2 "3MF Metadata Example".

That is enough to state that 3MF **has a first-class metadata mechanism and a
signature mechanism** — structurally a stronger position than GLB.

What is **not** verified is the reserved metadata `name` vocabulary. The markdown
exceeded the fetch window and the v1.3.0 PDF returned as undecoded binary.
**Do not cite a specific reserved name** (including any name resembling
"LicenseTerms") until it is confirmed against the specification text.

Cost: a 3MF file is a ZIP package. Writing metadata means opening and rewriting
the package, which needs a ZIP dependency. The `zip` crate is MIT, so it clears
`DEP-06` as restated in concept-12 §4.1 — but it is still a new dependency
subject to `DEP-04` justification and `DEP-05` download floors.

### 3.3 USDZ — unverified, and the most expensive of the six

USD is widely documented to carry `assetInfo` (with a `copyright` field) and
per-layer `customLayerData`; USDZ is widely documented to require uncompressed,
aligned ZIP entries. **Neither was verified in this pass**, and the alignment
requirement is exactly the kind of detail that produces files which load in one
viewer and fail in another.

Flagged `UNVERIFIED` deliberately. concept-14 must not assume USDZ can carry a
disclosure manifest until this is checked against the USD documentation.

### 3.4 OBJ and STL — the honest answer is "sidecar"

- **OBJ** has no metadata container. `#` comment lines are legal and tolerated,
  so a rights line *can* be appended cheaply — but almost every tool that
  re-exports an OBJ discards comments, so the record does not survive the first
  round-trip through a DCC tool. Writing it is cheap; trusting it is not.
- **STL** has no metadata container. Binary STL begins with an 80-byte header
  whose contents are unspecified, so a string *can* be placed there — and some
  parsers tolerate it while others (and the common "header must not begin with
  `solid`" heuristic used to distinguish binary from ASCII) do not. Writable but
  inadvisable: it buys nothing a sidecar does not, at the cost of a new
  interoperability failure mode.

**Verdict for both: sidecar file, not embedded.** This is the clearest "where
practical" answer in the matrix and it costs nothing to adopt.

### 3.5 FBX

No standardised rights container, and writing arbitrary properties into binary
FBX requires property-encoding work that exists practically only in the FBX SDK.
The FBX SDK is Autodesk-licensed and would fail `DEP-06` outright, which closes
the embedded route for a reason that has nothing to do with effort.

**Verdict: sidecar.**

## 4. Record shapes — three candidates

The matrix resolves into three coherent architectures. Cost column is the
*marginal* cost over the last shipped export, which is zero metadata.

| | Shape | Covers | Cost | Fails when |
|---|---|---|---|---|
| **A** | **Sidecar only** — one `.meta.json` written next to the exported file | All six formats equally | **Lowest.** One writer, one schema, format-agnostic. No format-specific code at all. | The recipient shares or uploads only the model file. Most upload flows strip siblings, so the record detaches at the first hop |
| **B** | **Embedded where cheap + sidecar always** — GLB/glTF embedded via `asset.copyright`/`extras`; 3MF later; sidecar for fbx/obj/stl/usdz | Everything, with redundancy | **Low** for GLB (no new dependency), **medium** for 3MF (ZIP crate) | Nothing structural. Cost is that two write paths must stay in sync with one schema |
| **C** | **Embedded only** | GLB, glTF, 3MF | Medium-to-high, and *rising* per format | Four of six formats cannot participate. Any "embed only" decision silently means "no record" for FBX, OBJ, STL, USDZ |

**Recommendation-shaped finding (not a decision):** Shape B, sequenced so GLB
embedding lands first. The reasons are asymmetric and all point the same way:

- A GLB-only embedded record is a real improvement at near-zero dependency cost,
  and GLB is the canonical interchange format for the formats Meshy returns
  (concept-09's grounding: the app stores every format Meshy generates, keyed by
  `file_paths`).
- Embedded-only (C) is the only genuinely wrong option, because it converts a
  coverage gap into a silent absence for four formats.
- Sidecar-only (A) is the cheapest *correct* option and is a legitimate v1 if the
  owner wants the record to exist before any format-specific work. It is a real
  choice, not a compromise.

That last point matters for proportionality: **A and B differ by one GLB code
path, not by a program.** The baseline can adopt A now and extend to B later
without rewriting anything, provided the sidecar schema is defined first and the
embedded form is a projection of it rather than a second source of truth.

## 5. The prompt question (Q1) — what the record should do while it is open

concept-11 §9 Q1 asks whether the prompt belongs in the exported record. The
carrier work does not depend on the answer, but the **default** does, and the
default has to exist before any code is written.

Recorded for concept-15, without choosing:

- **For emitting:** the prompt is the single most informative provenance fact.
  Without it, "where did this come from" is answered with a model name and a
  timestamp, which distinguishes nothing when the owner has generated 200 assets.
- **For omitting:** on client work the prompt can contain a brief, a product
  codename, a competitor reference, or a strategy. Embedding it in a GLB sends it
  to the client, and via the client to their pipeline. A hash preserves
  verifiability (the owner can prove which prompt produced the asset by revealing
  pre-images on demand) without disclosure.
- **The asymmetry that decides the default:** a hash is sufficient for
  *verification*, and disclosure is irreversible. Where an irreversible action
  competes with a reversible one that achieves the same verification goal, the
  reversible one is the defensible default even before anyone picks a side.

That reasoning is G1/G2-sufficient for the *default* (hash, not plaintext). It is
**not** sufficient to close Q1, because the owner may legitimately want plaintext
for non-client work — which is a per-asset or per-tag policy question, not a
format question. Q1 therefore stays open, narrowed to: *"should the record's
default be a prompt hash, with plaintext available per asset?"*

## 6. Integrity, integrity-costs, and one trap

A rights record is worthless if the asset it describes can be swapped. Two
additions that look free:

- **Content hash of the exported bytes.** Turns the sidecar from a claim into a
  verifiable pairing.
- **The hash must be computed *after* embedding, not before.** If the GLB is
  modified at export, a hash taken from the stored file describes a file that no
  longer exists. This is a one-line ordering bug with a total loss of value, and
  it is the single most likely defect in this whole program. It belongs in the
  test list explicitly.

**Cost correction, found by checking rather than assuming:** it is *not* free.
`src-tauri/Cargo.toml` has `serde_json` but **no `sha2`, no `blake3`, no `hex`**,
and the Rust standard library ships no cryptographic hash. So a content hash means
either a new dependency (both `sha2` and `blake3` are MIT/Apache-2.0, so they clear
`DEP-06` as restated, but they still carry `DEP-04` justification) or dropping the
hash from v1.

Proportionality test 3 applies cleanly here: the hash protects against
post-export tampering, which for a personal tool serving a trusting client is a
threat that barely exists. **The defensible v1 is a record without a content
hash**, with the hash named as a deliberate omission in the not-done register and
a one-dependency upgrade path recorded. That is a better outcome than either
silently including it or silently not mentioning it.

## 7. Sidecar naming and placement

Practical constraints, since this decides whether the record survives:

- **Placement:** next to the exported file, name-derived (`<exported>.meta.json`),
  so any tool that copies a folder keeps the pair together.
- **No hidden-dot prefix.** Many upload and archive flows drop dotfiles.
- **ASCII-only keys, UTF-8 values**, so a filename written on Windows resolves on
  Linux CI (`release.yml` builds on `ubuntu-22.04`).
- **The sidecar must be valid JSON with a `schema_version` first field**, so a
  future reader can refuse rather than misread.

## 8. Verification backlog — claims this memo does NOT assert

1. **USD `assetInfo` field names, `customLayerData`, and USDZ's alignment
   requirement.** Not verified. §3.3 is a flagged assumption, not a finding.
2. **3MF reserved metadata `name` values.** §6.2 exists (TOC verified); its
   contents were not retrieved. Do not name a metadata key.
3. **GLB chunk padding byte values** (§4.4.3). Stated from the specification's
   structure, not re-read this pass. Verify before implementing.
4. **Whether `serde_json` round-tripping a GLB JSON chunk preserves key order.**
   glTF does not require key order, but some third-party loaders are sloppy.
   `serde_json` with `preserve_order` may be needed; not investigated.
5. **Whether any existing asset file is byte-identical to what Meshy served.**
   Not checked. If the owner has already been relying on that identity (e.g. by
   checksum), embedding changes an existing property.

## 9. Negative search record

| Term(s) | Where searched | Result |
|---|---|---|
| `asset.extras`, `asset.copyright`, `copyright`, `sidecar`, `.meta.json`, `glb chunk` | `src/**/*.ts`, `src/**/*.tsx`, `src/**/*.css`, `src-tauri/src/**/*.rs` | **Zero matches for any of them.** The only `glb` hits are the format string itself — e.g. `ExportFormat = 'glb' \| 'fbx' \| 'obj' \| 'stl' \| 'usdz' \| '3mf'` (`src/lib/meshy-types.ts:42`, which also confirms the six-format table above is exhaustive). No GLB parsing, no chunk handling, no sidecar writing anywhere. |
| `serde_json`, `zip`, `flate2`, `usdz`, `3mf`, `sha2`, `hex` | `src-tauri/Cargo.toml` | **Only `serde_json` (line 29).** No ZIP or compression crate, and no hashing crate. 3MF/USDZ package rewriting and content hashing would each be the first of their kind here (§3.2, §6). |
| `export_` | `src-tauri/src/`, `src/` | Only `export_asset` / `export_asset_inner` / `ExportFormat`. Confirms §1: one exit path, no metadata. |

---

**Status of this memo: grounding only.** No decision is recorded. The carrier
matrix is the deliverable concept-14 consumes; the three record shapes are the
options concept-15 must choose between with the owner's Q1/Q3 answers in hand.


