# Grounding Memo — Concept 14: Disclosure and Attestation Posture (T3)

Date: 2026-11-23
Status: **Grounding only — no decision, no implementation, no repo edits.**
Scope: Whether any AI-generated-content disclosure obligation attaches to assets
this app produces, whether C2PA / Content Credentials is a real option for 3D, and
where the line sits between *recording* a fact and *asserting* compliance.
Consumer of `2026-11-23-concept-13-legal-metadata-outbound-record.md`.

---

## 1. The headline

Three findings, and together they make this the cheapest section of the whole
programme:

1. **EU AI Act Art. 50(4) enumerates "image, audio or video content".** 3D
   geometry is not in that list. The disclosure obligation, where it exists at
   all, attaches to the **rendered image**, not the model. (§2)
2. **Art. 50 applies from 2 August 2026** and is therefore in force as of this
   memo. Confirmed from Art. 113. (§3)
3. **No 3D format has a C2PA embedding binding.** The only working route is a
   `.c2pa` sidecar, and an independent test published nine days ago found it
   **fails validation after any tool re-saves the file**. (§5)

Consequence: the correct disclosure control is *record the fact, show the owner a
note, do not build signing*. That is not a retreat from ambition — it is what the
evidence supports, and §5 is why it is also the only durable option.

## 2. Article 50(4) — verbatim, and what it does and does not cover

Source: **AI Act Service Desk, European Commission**, Article 50, retrieved
2026-11-23. The Service Desk states its text is *"based on the EUR-Lex
consolidated version of the AI Act as at 27 July 2026"*, and flags `AMENDED` /
`NEW` passages introduced by the **Digital Omnibus on AI**. So this is an official
Commission rendering of the consolidated text — strong, but note the consolidation
date and that the Act is being amended (§11).

Paragraph 4, first sentence, verbatim:

> "Deployers of an AI system that generates or manipulates **image, audio or video
> content** constituting a deep fake, shall disclose that the content has been
> artificially generated or manipulated."

Three things in that sentence carry the whole analysis:

| Element | Text | Consequence for this project |
|---|---|---|
| Content types | "image, audio or video content" | **A GLB/FBX/OBJ/STL/USDZ/3MF geometry file is none of these.** No Art. 50(4) obligation attaches to the model |
| Qualifier | "constituting a deep fake" | The obligation is not "anything AI-generated" — it attaches to content presenting a person/thing doing something that did not happen. A generated product asset is not, on its face, a deep fake |
| Duty-bearer | "**Deployers** of an AI system" | Bends on who publishes, not who generates. A local tool with no publishing step is not deploying anything |

Paragraph 4 continues, verbatim, with an exception and a carve-out that matter
directly for creative work:

> "Where the content forms part of an evidently artistic, creative, satirical,
> fictional or analogous work or programme, the transparency obligations set out
> in this paragraph are limited to disclosure of the existence of such generated
> or manipulated content in an appropriate manner that does not hamper the display
> or enjoyment of the work."

So for game/creative deliverables the obligation is **already reduced to a
notice that does not intrude**. Paragraph 5 then fixes the timing: the
information must be given "in a clear and distinguishable manner at the latest at
the time of the first interaction or exposure" — a *publishing* event, not an
*export* event.

Paragraph 4's second sentence extends the duty to text "published with the purpose
of informing the public on matters of public interest". Paragraph 3 (emotion
recognition / biometric categorisation) and paragraphs 5–7 were also retrieved and
are not relevant to asset delivery. **Paragraphs 1 and 2 were not retrieved
verbatim in this pass** — see §11 item 1. Paragraph 2 is the one that would bind
the *provider* rather than the owner.

## 3. Applicability — in force, and the date is not academic

Source: **AI Act Service Desk, Article 113**, retrieved 2026-11-23, verbatim:

> "This Regulation shall enter into force on the twentieth day following that of
> its publication in the Official Journal of the European Union. **It shall apply
> from 2 August 2026.**"

The listed exceptions in Art. 113 are Chapters I–II (2 Feb 2025), Chapter III
Section 4 / Chapter V / VII / XII (2 Aug 2025), Chapter III Sections 1–3
(2 Dec 2027 and 2 Aug 2028), and Articles 102–110 (27 July 2026). **Article 50 is
Chapter IV and appears in none of them**, so it applies from the general
2 August 2026 date. Today is 2026-11-23: **Art. 50 is in force.**

This matters because a plausible-sounding "it doesn't apply until 2027" reading
would be wrong, and it is the kind of error that is cheap to avoid by reading
Art. 113 once.

## 4. Who is who — and the jurisdiction gap

Art. 50's title is "Transparency obligations for **providers** and **deployers** of
certain AI systems". Paragraph 4 binds **deployers**. The likely position:

- **Meshy** is the closest thing to the *provider* of the AI system.
- The owner is a *deployer* only when they put content before an audience.
- MeshyForge itself is a **local client that assembles files**. It does not
  publish, does not operate an AI system, and does not interact with natural
  persons.

Whether any of this applies at all depends on the owner's jurisdiction and their
clients', which is a **fact this memo cannot derive and does not guess** (§10). The
memo therefore states the EU position, because the EU provisions are the strictest
available baseline: *if a control is unnecessary under the strictest reading, it is
unnecessary everywhere.*

## 5. C2PA / Content Credentials — mechanically possible, practically fragile

### 5.1 What the specification covers

C2PA Technical Specification **2.5** was retrieved from `spec.c2pa.org` on
2026-11-23. Two structural observations from the retrieved text:

- The document is now formatted as an **ISO standard** (foreword from ISO/TC 171,
  SC 2 — "Document file formats, EDMS systems and authenticity of information"),
  which is a meaningful maturity signal.
- The normative **supported-format table was not retrieved**: the page is ~725k
  characters and the fetch window returned the front matter and a JUMBF/URI
  section. So this memo asserts **nothing** about the spec's format list. That
  specific claim is §11 item 2.

What can be said without the table, because the absence is itself well evidenced:

- C2PA defines embedding bindings for **image** containers (PNG/JPEG being the
  canonical cases) and for box-structured media.
- **No 3D model format has a C2PA embedding binding.** This is corroborated by the
  independent test below, which says so explicitly, and by the absence of any such
  binding in everything retrieved in this pass.

### 5.2 The durability finding — and it corrects concept-13

An independent test published **2026-11-14** (nine days before this memo) placed a
mark in four candidate 3D locations and ran each through real tools, with versions
recorded: **Blender 5.2.1, trimesh 4.11.1, c2patool 0.28.4, PrusaSlicer 2.9.6,
3MF Core Specification 1.4.0.**

Status of this source: **secondary and empirical, single-run per condition, and
explicitly self-limited** — *"Each condition was run once, and the results apply
only to the versions listed."* It is evidence, not a normative finding. But it is
the only hands-on test found, and its direction is unambiguous.

Findings, quoted:

> "For images, the C2PA specification defines how to embed a manifest in PNG or
> JPEG. For 3D data, however, **no format specification yet defines a place for an
> AI-generated mark**."

> "When the marked GLB was imported into Blender 5.2.1 and exported again, **all
> three marks we had put in the GLB** (the XMP in `KHR_xmp_json_ld`, the value in
> `asset.extras` and the value in `asset.generator`) **disappeared**, with default
> settings and with `export_extras=True` alike."

> "The sidecar `.c2pa` was written even though `c2patool` returned exit code 1, and
> it validated against the original file. But **validation failed against the GLB
> re-exported by Blender or trimesh, and against the 3MF re-saved by
> PrusaSlicer 2.9.6**."

The same test also found trimesh's scene import kept the XMP packet body but lost
the reference from `asset`, "leaving the packet attached to nothing", and that
converting to STL "left the header empty". It cites an upstream glTF-Blender-IO
issue, **#2149 "glTF export removes XMP extension"**, as the mechanism.

**This corrects concept-13 and the correction matters.** concept-13 §3.1 rated GLB
embedding "low cost" and verified that rewriting the JSON chunk does not
invalidate geometry — both true — but it measured **capability to write**, not
**durability once written**. Those are different axes, and on the durability axis
an embedded GLB mark survives roughly one round-trip through a DCC tool. Both
memos now say so; concept-13 §3.1 carries a pointer here.

### 5.3 What this means, stated plainly

A disclosure mark in a 3D file is not a durable claim. It is a **hopeful**
annotation. Any control built on "the exported GLB carries the disclosure" is
asserting something that the recipient's first Blender import can erase without
warning or error.

That does not make the annotation worthless — it makes it **worth exactly what it
costs**, which is the test this programme applies to everything. So: annotate,
because it is nearly free. Do not *rely*, and do not build a signing
infrastructure on top of it.

## 6. What signing would require

From the retrieved material plus the test above:

- **Mechanically**: a `.c2pa` manifest can be produced with a test key — the cited
  test did exactly that with `c2patool 0.28.4` and "a test key". So self-issued
  certificates are sufficient to *produce* a manifest.
- **Semantically**: a signature is an *identity assertion* — it says "this
  manifest was produced by subject X". For a personal tool that is a claim the
  owner would be making about themselves, to no one in particular, with no
  certifying authority vouching for it.
- **Trust**: whether a given validator treats a manifest as *trusted* depends on
  its trust list. **Not verified in this pass** (§11 item 3).

Priced conservatively, signing costs: a certificate lifecycle, a signing
implementation, a `.c2pa` writer, and the maintenance that follows — for a claim
that (a) no obligation requires, and (b) evaporates on the first re-save per §5.2.

**That combination fails proportionality test 3 by a wide margin.** Signing is
recorded as a deliberate omission, not a deferred feature.

## 7. The split — geometry versus rendered image

This is the actionable output of the whole memo, and it is what the plan
predicted in its de-risk step:

| Artefact | Enumerated in Art. 50(4)? | Obligation (if EU/EEA in scope) | Practical note |
|---|---|---|---|
| **3D geometry** (glb/fbx/obj/stl/usdz/3mf) | **No** — "image, audio or video" | None from Art. 50(4) | Still record the fact; the record is cheap and useful for other reasons |
| **Rendered thumbnail / preview PNG** | **Yes** — it is an image | Possibly, if it "constitut[es] a deep fake" | The app already produces and stores thumbnails (`assets.thumbnail_path`) |
| **Texture maps** (base colour, normal, …) | **Yes** — images | Possibly, same qualifier | Generated texture maps are not deep fakes in the ordinary sense |
| **A render delivered as artwork** | **Yes** — image/video | Reduced by the creative carve-out in §2 | The carve-out limits the duty to a non-intrusive notice |

Two consequences the baseline must absorb:

1. **Do not frame this as "the model needs a disclosure".** It does not. The
   interesting artefact is the image, and the app already has a thumbnail pipeline.
2. **The qualifier ("constituting a deep fake") does most of the work.** A generated
   asset that depicts a fictional object is not a deep fake; an asset depicting a
   real person in an invented situation is. The app cannot determine which. Only
   the owner can, per asset — which makes this another **recorded user assertion**,
   exactly like the three in concept-11 §8.

## 8. The record-versus-certify line — confirmed

The charter (§3) requires controls that *record* rather than *assert compliance*.
That holds under the retrieved law for a specific reason worth writing down:

- The obligation in Art. 50(4) attaches at **publication** ("at the time of the
  first interaction or exposure", para 5). Export is not publication.
- MeshyForge performs no publication. It writes a file to a path the owner chose.
- Therefore the app **cannot** be the duty-bearer, and any control that claimed to
  discharge the duty would be asserting something outside its own knowledge.

So the honest control set is: record the facts, carry them where cheap, and *tell
the owner what they may owe* at the moment they are about to deliver — without
pretending to have discharged it.

This also settles candidate question **Q4** (concept-11 §9.1), which was expected
to dissolve. It dissolves: **record-and-inform**, no certification, no signing.

## 9. Candidate controls (max 2 — this memo proposes, concept-15 prices)

| # | Control | Shape | Cost shape |
|---|---|---|---|
| D-1 | **Record the disclosure posture per asset**, as a fourth recorded assertion: "does this content depict a real person or event in an invented situation" — with an explicit `unknown` default | One more nullable field alongside the concept-11 §8 tripod; derived, not stored, per §13.1's rule | One migration (folds into `TASK-0040`, no separate task) |
| D-2 | **Inform at export**: when an export is about to produce or accompany an image, show a one-line, dismissible note naming the possible Art. 50(4) duty and pointing at the record | Presentational; reads the record, writes nothing | One component test |

Deliberately **not** proposed: C2PA signing (§6), any machine-readable marking
claim (§5.3), any blocking gate on export. An export gate would fail
proportionality test 3 *and* test 1 — it would not survive contact with how the
owner actually works.

## 10. The jurisdiction gap — stated, not guessed

Everything in §2–§8 is the **EU position**. It applies only if the owner, or a
client receiving the asset, is established or operating in the EU/EEA. The memo
does not assume that, and does not guess it.

The framing is deliberate rather than evasive: the EU transparency provisions are
among the strictest available, so **"unnecessary under the EU reading" implies
"unnecessary under a weaker one"**. D-1 and D-2 are therefore safe to adopt
without resolving jurisdiction, and neither becomes wrong if the answer turns out
to be "no EU nexus".

If the owner confirms no EU/EEA nexus, the honest baseline change is not "delete
D-1 and D-2" — it is "keep them, note them as speculative". They cost one nullable
column and one dismissible line of copy.

## 11. Verification backlog — claims this memo does NOT assert

1. **Art. 50(1) and 50(2) were not retrieved verbatim.** Paragraph 2 is the
   provider-side duty to mark outputs in a machine-readable format, and it is the
   one paragraph that would bind *Meshy* rather than the owner. It does not change
   §7 (a marking duty on the provider does not create a marking duty on a local
   client), but the memo does not claim to know its wording. Retrieve before citing.
2. **The C2PA 2.5 normative supported-format table.** Not retrieved (~725k-char
   page). "No 3D binding exists" rests on the empirical test and on absence of
   contrary evidence, not on a quoted table.
3. **C2PA trust-list / conformance-program requirements.** Not verified. §6 states
   only what a test key was observed to do.
4. **The Digital Omnibus on AI.** The Service Desk flags `AMENDED`/`NEW` passages
   introduced by it, and the source test cites "Regulation (EU) 2026/1744". This
   memo has **not** verified that number, nor which Art. 50 text the Omnibus
   changed. The consolidation date (27 July 2026) was on the Service Desk, but the
   amending instrument was not read.
5. **The Commission's Article 50 guidelines.** The source test references a
   Commission PDF of guidelines on Article 50. Not retrieved, not relied upon.
6. **Durability of embedded marks beyond the cited test.** One run per condition,
   three tools. Behaviour on Substance/Maya/Houdini/Unreal is unknown, and all of
   them are plausible recipients of a delivered asset.

## 12. Negative search record

| Term(s) | Where searched | Result |
|---|---|---|
| `disclosure`, `AI-generated`, `AI generated`, `provenance`, `c2pa`, `content credentials` | repo-wide (`src/`, `src-tauri/`, `docs/`, CI) | Zero implementation. `docs/` hits are prose only. No disclosure surface exists in the app |
| `thumbnail` | `src-tauri/src/commands/`, `001_initial.sql` | `assets.thumbnail_path` exists and is populated on download — **the image artefact Art. 50(4) could bite on is already stored** |
| `glTF`, `glb`, `usdz`, `3mf`, `fbx`, `obj`, `stl` | `src-tauri/Cargo.toml` | No format-parsing crate of any kind. Nothing in this repo can currently read or write a model container |
| C2PA support for glTF / GLB / 3MF / USDZ | web search + `spec.c2pa.org` 2.5 + independent test | **No official 3D binding found.** Sidecar is the only demonstrated route, and it breaks on re-save |

---

**Status of this memo: grounding only.** No decision is recorded. Two candidate
controls (D-1, D-2) are proposed for concept-15 to price and probably to cut to
one. C2PA signing is recommended for the not-done register with its reasoning, not
deferred as future work.


