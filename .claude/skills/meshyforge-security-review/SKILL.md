---
name: meshyforge-security-review
description: >-
  STRIDE-scoped security audit for MeshyForge covering API key handling
  (SEC-01-08), Tauri command input validation (VAL-01-06), SQL injection
  prevention, path traversal, upload validation, error sanitization
  (SAN-01-04), CSP connect-src scoping, and Tauri capabilities least
  privilege. Cross-checks against security_threat_model.md's residual risks.
  Use when reviewing Rust backend code (src-tauri/src/meshy,
  src-tauri/src/storage, src-tauri/src/commands, src-tauri/src/security),
  tauri.conf.json, capabilities files, or any code that touches the API key,
  SQL queries, file paths, or file uploads. Use before merging security-
  sensitive changes or when asked to audit MeshyForge's security posture.
---

# MeshyForge Security Review

Audits MeshyForge source against the canonical security rule set: **SEC-01–08**
(API key protection, CSD §12.1), **VAL-01–06** (input validation, CSD §12.2),
and **SAN-01–04** (error sanitization, CSD §12.3), read through the STRIDE lens
in `security_threat_model.md`. This is a read-only audit skill — it reports
findings, it does not modify code.

## Before anything else: confirm there is code to review

MeshyForge is greenfield at project start — only planning docs exist until
Phase 1 (Backend Foundation) of `implementation_execution_plan.md` produces
`src-tauri/src/meshy/`, `src-tauri/src/storage/`, `src-tauri/src/commands/`,
and `src-tauri/src/security/`. Before auditing anything:

1. Check whether the relevant source paths exist (`src-tauri/src/`,
   `src-tauri/tauri.conf.json`, `src-tauri/capabilities/`).
2. If none of these exist yet, or the specific file class being asked about
   hasn't been written (e.g., no `commands/` directory yet even though
   `meshy/client.rs` exists), **report that plainly** — e.g. "No Rust backend
   code exists yet (Phase 0/1 not started); nothing to audit against SEC/VAL/SAN
   rules. Re-run this skill once `src-tauri/src/` is populated." Do not
   fabricate findings, do not invent hypothetical violations, and do not treat
   "nothing found" as either a pass or a fail — it's "not yet applicable."
3. If some but not all relevant files exist, audit what exists and explicitly
   list which rule categories had no applicable code to check.

## Rule catalog to check against

Read the exact rule text from source before citing it — don't paraphrase from
memory. Primary source: `coding_standards.md` §12 (all three tables). Cross-
reference: `security_threat_model.md` §3–9 (STRIDE tables map each rule to a
concrete threat scenario, useful for explaining *why* a violation matters).

### SEC-01–08 — API key protection (CSD §12.1)

| Rule | Check |
|---|---|
| SEC-01 | API key stored only via the `keyring` crate (OS keychain). Never written to SQLite, config files, or env vars. Grep for the key variable/field being passed into `rusqlite` params, `serde_json` config writes, or `std::env`. |
| SEC-02 | Per CSD §12.1 (line 1536) verbatim: `get_api_key` legitimately returns `Option<String>` over IPC — the raw key crossing IPC on this one command is **not itself a violation**. The finding is what the frontend does with it afterward: the frontend must persist/expose only a boolean (e.g. `hasApiKey` in Zustand), never store or display the raw string. Flag frontend code that assigns the returned key into any persisted state, renders it, or forwards it elsewhere — not the command's return type itself. |
| SEC-03 | `MeshyClient` holds the key in Rust memory only; never serialized to JSON or sent across IPC. Check `#[derive(Serialize)]` structs don't include a raw key field. |
| SEC-04 | No log statement (`log::`, `tracing::`, `println!`, etc.) references the key variable, directly or interpolated. |
| SEC-05 | The key is sent to Meshy only via the `Authorization: Bearer` header — never in a request body. Check `reqwest` request-builder calls. |
| SEC-06 | Signed download URLs from Meshy responses are not logged. |
| SEC-07 | `tauri.conf.json` CSP `connect-src` is restricted to `self` and `asset:` only — no wildcard, no arbitrary remote origins. **If `connect-src` is absent entirely**, this is compliant only if `default-src` is present and itself restricted to `self` (CSP directives with no explicit `connect-src` fall back to `default-src`) — check `default-src`, don't flag a bare absence as a finding on its own. Only flag an explicit `connect-src` that's wildcarded/permissive, or a missing `connect-src` where `default-src` is also absent or permissive. |
| SEC-08 | The Tauri capabilities file grants only `dialog`, `notification`, `shell:open` **as app-specific scopes**. No `fs:write`, no `http:default`, no broader app-domain scope. This rule is about which app-facing capabilities the project chooses to request — it does **not** cover Tauri's own mandatory `core:*` permissions (e.g. `core:default`, `core:window:allow-set-title`, `core:event:default`), which every Tauri 2.x app requires regardless of this project's choices. Do not flag `core:*` entries; only flag non-`core:*` scopes beyond the three listed. |

### VAL-01–06 — Input validation (CSD §12.2)

| Rule | Check |
|---|---|
| VAL-01 | Every `#[tauri::command]` that calls the Meshy API validates required fields *before* the HTTP call, returning `INVALID_INPUT` without consuming credits. |
| VAL-02 | String inputs are length-checked (e.g. 600-char prompt limit); task IDs are validated as UUIDs. |
| VAL-03 | Numeric inputs are range-checked (e.g. `target_polycount` 100–300,000). |
| VAL-04 | File paths from the OS file dialog are canonicalized before use; no `..` traversal accepted. |
| VAL-05 | Image uploads are validated both by extension (`.jpg`/`.jpeg`/`.png`/`.webp`) *and* by magic-byte/MIME sniffing in Rust — extension check alone is a finding. |
| VAL-06 | All SQL queries use `params![]`/parameterized statements. Any `format!()` or string concatenation feeding into `conn.execute`/`conn.prepare` is a SQL-injection finding — cite the exact pattern shown in CSD §6.5 as the "BAD" counter-example. |

### SAN-01–04 — Error sanitization (CSD §12.3)

| Rule | Check |
|---|---|
| SAN-01 | Error messages crossing the IPC boundary (`Result<T, String>` command returns) never contain the API key, internal file paths, or stack traces. |
| SAN-02 | HTTP error bodies from Meshy are passed through as-is (they're user-facing, not internal) — this is expected behavior, not a violation. |
| SAN-03 | Rust panics never reach the user; commands return a generic "Internal error" string, not the panic message. Check `catch_unwind` usage or that panics can't occur — the actual mechanism is **RST-01** (`coding_standards.md` §6.1, line 515: "No `unwrap()` or `expect()` in production/non-test code"). Grep production Rust files for `.unwrap()`/`.expect(` outside `#[cfg(test)]` modules; any hit is both an RST-01 and a SAN-03 finding. |
| SAN-04 | Database errors returned to the frontend are generic ("Database error. Try restarting the app."); the specific `rusqlite::Error` is logged, not surfaced. |

## Residual risks — report as informational, not failures

`security_threat_model.md` §10 documents six threats that no existing rule
mitigates. These are **known, accepted gaps** for a single-user desktop app —
do not flag code for lacking a mitigation that doesn't exist as a rule, and do
not invent a new rule ID to cover them. If relevant code touches one of these
areas, mention it as informational context, not a blocking finding:

1. No TLS certificate pinning for the Meshy API client (beyond `reqwest`
   defaults).
2. No integrity/checksum verification of downloaded model files.
3. No specified OS file permissions (e.g., `0600`) on the SQLite DB or asset
   directory.
4. No specified keychain service/account namespacing convention to prevent
   same-machine collision.
5. No required GitHub Actions `permissions:` blocks or SHA-pinning of actions.
6. No code signing on any platform (explicitly accepted, not a gap).

## Output format

For each finding: cite the exact rule ID, the file and line, the concrete
violation, and a one-line fix pointing at the CSD §12 "GOOD" pattern where one
exists. Group findings by SEC / VAL / SAN. End with a short summary noting
(a) which rule categories were checked, (b) which had no applicable code yet,
and (c) any residual-risk items worth a mention. If the codebase is entirely
absent, say so in one line and stop — do not pad the report.
