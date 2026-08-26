# ADR-0002: Signed Download Origin Policy

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-08-26 |
| **Deciders** | Project owner (confirmed Option A — exact host allowlist) |
| **Phase** | Post-MVP (Phase 5 complete; security posture formalization) |
| **Related rules/features** | CSD SEC-06, SEC-09 (proposed), TDD §11, security_threat_model.md §5/§10 |
| **Supersedes** | None |

## Context

The MeshyForge Rust backend downloads model files, thumbnails, and textures
from signed URLs returned by the Meshy API. The implementation at
`src-tauri/src/commands/validation.rs:185–192` restricts all downloads to
`https://assets.meshy.ai` (exact host match, HTTPS scheme). This validator is
called before every `client.download_file()` call in `src-tauri/src/commands/api.rs`
(lines 141, 162, 185) for model files, thumbnails, and textures respectively.

However, this security control is undocumented:

- **No codified rule** in CSD §12 mandates download URL host validation or an
  origin allowlist. SEC-06 (`coding_standards.md:1540`) governs only logging of
  signed URLs, not their origin.
- The **TDD** `download_asset` listing (`technical_design_document.md:947–1001`)
  shows `download_file` called directly with no `validate_download_url` — a
  doc/code drift. The TDD §11 "Signed download URLs" row (line 1770) says only
  "fetched server-side (Rust)" with no mention of the host allowlist.
- The **threat model** (`security_threat_model.md:114`) cites "TDD §11 'Signed
  download URLs' row (fetched server-side over HTTPS)" as the mitigation for
  MITM-on-downloads, but does not reference the host allowlist or frame it as
  an SSRF control.
- All Meshy API docs (`Meshy_Documentation/01-quickstart.md:57–75`,
  `10-text-to-3d.md:153–170`, `17-rigging.md:92–100`, `18-animation.md:99–103`)
  show downloads on `assets.meshy.ai` with signed `Expires` query parameters. No
  documented endpoint returns download URLs on any other host.
- **Residual Risk #1** (`security_threat_model.md:178`) names TLS pinning for
  `api.meshy.ai` (the control-plane host) but not `assets.meshy.ai` (the
  download host).
- **Residual Risk #2** (`security_threat_model.md:180`) flags post-download
  integrity verification as unaddressed — this ADR does not close that risk;
  it is noted as still accepted.

**Needs-an-ADR test satisfied — criteria 3, 5, 6:**
- Criterion 3: Touches security posture (outbound network boundary for
  downloads, SSRF prevention).
- Criterion 5: Resolves a doc contradiction — TDD's `download_asset` listing
  omits the `validate_download_url` calls the code performs; threat model
  doesn't reference the host allowlist.
- Criterion 6: Expensive to reverse — narrowing the outbound boundary
  constrains future Meshy CDN changes.

**Constraints found:**
- `validation.rs:185–192` — existing implementation restricts to
  `https://assets.meshy.ai` with exact host match and HTTPS scheme.
- `api.rs:141, 162, 185` — three call sites: model files, thumbnail, textures.
  Validation runs immediately before each `download_file` call in the same
  scope.
- `coding_standards.md:1540` (SEC-06) — governs logging only, not origin.
- `coding_standards.md:751` (IPC-06) — prohibits logging response bodies
  containing signed URLs.
- `technical_design_document.md:767` — `download_file` method comment: "Signed
  URLs don't need auth headers" — acknowledges signed URLs but no origin check.
- `security_threat_model.md:73` — outbound boundary is the Rust reqwest client
  (boundary 2, internet).
- `security_threat_model.md:114` — Tampering mitigation cites HTTPS only.
- `Meshy_Documentation/01-quickstart.md:72` — "Each format (GLB, FBX, OBJ, USDZ,
  STL) is a signed, time-limited URL" — all on `assets.meshy.ai`.

**Precedent search record:**
- Searched: `SEC-06|download|signed|assets.meshy.ai|SSRF|outbound|origin|validate_download`
  across all `docs/**` and `Meshy_Documentation/**`.
- Searched in: `coding_standards.md`, `technical_design_document.md`,
  `security_threat_model.md`, `Meshy_Documentation/01-quickstart.md`,
  `Meshy_Documentation/10-text-to-3d.md`, `Meshy_Documentation/17-rigging.md`,
  `Meshy_Documentation/18-animation.md`.
- Searched for prior ADRs: `docs/adr/**` — ADR-0001 exists (CI branch-trigger
  reconciliation, unrelated). No prior ADR on download origins.
- Result: No prior precedent on download origin policy. The host allowlist
  exists in code but is undocumented in any planning doc or rule.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| **A: Exact host allowlist (`assets.meshy.ai` only)** | Lowest SSRF exposure; grounded in all documented Meshy endpoints; simplest to audit; already implemented and tested (`validation.rs:453–457`); no code change needed | A future Meshy CDN migration requires an application update + ADR; no flexibility for alternate hosts | None — aligns with existing code; promotes an undocumented implementation to formal policy |
| **B: Explicit Meshy host set** | Supports documented CDN evolution; more flexible than single-host; still bounded | Broadens outbound boundary; requires list ownership and maintenance; no Meshy docs identify a second host | Would require a new rule defining the host set; weakens the current single-host restriction |
| **C: Any HTTPS signed URL returned by Meshy API** | Maximizes API compatibility; zero maintenance for CDN changes | A compromised or malformed API response can direct the privileged Rust client to any public host — full SSRF; highest risk | Contradicts the implemented `validate_download_url`; weakens security posture; reverses an existing protection |

## Decision

**Adopt Option A: Exact host allowlist (`assets.meshy.ai` only).**

All file downloads must be restricted to HTTPS URLs whose exact host is
`assets.meshy.ai`. The `validate_download_url` validator must be called before
every `download_file` call. No wildcard or alternate hosts are permitted
without a new ADR. The existing implementation already enforces this; this
ADR promotes it from an undocumented implementation detail to a formal security
policy with a codified rule.

Rationale: Every documented Meshy task-type endpoint returns download URLs on
`assets.meshy.ai` with signed `Expires` query parameters. No endpoint is
documented to return URLs on any other host. The single-host allowlist
provides the lowest SSRF exposure — a compromised or malformed API response
cannot redirect the privileged Rust client to an arbitrary host. The cost
(future CDN migration requires an app update) is acceptable for a desktop
app with a single API vendor, and is mitigated by the ADR process itself.

**Newly proposed rule ID(s)** (proposed — do not imply they exist until CSD is
actually updated):
- `SEC-09` (proposed) — "All file downloads must be restricted to HTTPS URLs
  whose exact host is `assets.meshy.ai`. The `validate_download_url` validator
  must be called before every `download_file` call. No wildcard or alternate
  hosts are permitted without an ADR."

## Consequences

**Positive:**
- SSRF boundary formally documented and testable as SEC-09
- TDD and threat model reconciled with implementation
- Residual risk for download-host SSRF explicitly closed (not just accepted)
- Code review can cite SEC-09 to reject changes that bypass
  `validate_download_url`

**Negative:**
- Future Meshy CDN migration requires an app update + new ADR
- No support for alternate asset hosts if Meshy introduces them
- Does not close Residual Risk #2 (post-download integrity verification) —
  that risk remains accepted

**Follow-ups:**
- **Docs to update** (handed off to doc-sync — this ADR does not edit them):
  - `coding_standards.md` §12: add SEC-09 rule after SEC-08 (line ~1541);
    bump to v1.0.1, date 2026-08-26
  - `technical_design_document.md` §11 (lines 947–1001): add
    `validate_download_url` calls to `download_asset` listing to match actual
    code; update "Signed download URLs" row (line 1770) to cite host allowlist
    and SEC-09; bump to v1.0.1
  - `security_threat_model.md` §5 Tampering row (line 114): add host allowlist
    to mitigation; §10 Residual Risk #1 (line 178): note `assets.meshy.ai` TLS
    covered by `reqwest` defaults same as `api.meshy.ai`; add SEC-09 to
    applicable mitigations; bump to v1.0.1
  - `docs/CHANGELOG.md`: add doc-version-bump entries
- **Code to update:** None — implementation already matches the decision
- **Tests to add:** None — `validate_download_url_rejects_http_and_non_meshy_hosts`
  already exists at `validation.rs:453–457`
- **Tech debt to register:** None — Residual Risk #2 (post-download integrity)
  remains an accepted gap; closing it would require a separate ADR

## References

- `validation.rs:185–192` — `validate_download_url` implementation
- `api.rs:141, 162, 185` — call sites for model, thumbnail, texture downloads
- `coding_standards.md:1540` — SEC-06 (signed URL logging)
- `technical_design_document.md:947–1001` — `download_asset` command (drifted)
- `technical_design_document.md:1770` — "Signed download URLs" security row
- `security_threat_model.md:114` — Tampering mitigation (incomplete)
- `security_threat_model.md:178–180` — Residual Risks #1 (TLS) and #2 (integrity)
- `Meshy_Documentation/01-quickstart.md:57–75` — canonical download URL format
- Related ADRs: None (first ADR on security posture)
- Related audit: `docs/audits/validation-33d1e43-2026-08-25.md` F-SEC-06, F-RISK-01–02
- Related sync plan: `docs/doc-sync/2026-08-25-consolidated-sync-plan.md` Part A.4