# Security Threat Model — MeshyForge

## Document Metadata

| Field | Value |
|---|---|
| **Project** | MeshyForge — AI 3D Asset Studio |
| **Document Type** | Security Threat Model (STRIDE) |
| **Version** | 1.0.1 |
| **Date** | 2026-08-26 |
| **Status** | Reference (produced per project decision, overriding Documentation Gap Assessment v1.0.0 Gap 8) |
| **Dependencies** | TDD v1.0.0 §11, CSD v1.0.0 §12 (canonical rule set: SEC/VAL/SAN), GREB v1.0.0 §12 |

---

## 1. Purpose and Scope

The Documentation Gap Assessment (§6.6, Gap 8) evaluated a formal STRIDE threat model and recommended against generating one, on the grounds that MeshyForge's security posture is already fully specified by numbered, testable rules in three existing documents:

- **TDD §11 "Security Considerations"** — a concern/mitigation table covering API key storage, CORS, signed URLs, SQL injection, error sanitization, filesystem access, and input validation.
- **CSD §12 "Security Coding Standards"** — the canonical rule set: **SEC-01–08** (API key protection), **VAL-01–06** (input validation), **SAN-01–04** (error sanitization).
- **GREB §12 "Repository Secrets and Security"** — **SEC-REP-01–06** (CI/CD secrets hygiene, scanning, code signing) plus §13 **DEP-01–08** (dependency/supply-chain rules).

That assessment's conclusion was correct as far as it went: for a personal-use desktop app, a from-scratch threat model would mostly restate rules that already exist. The project owner has explicitly overridden the "do not generate" recommendation and requested the analysis anyway.

Accordingly, **this document is a STRIDE-vocabulary restatement and structured analysis of the existing security rules, not a new source of security requirements.** Every threat identified below is cross-referenced to the exact rule ID(s) in TDD §11 / CSD §12 / GREB §12 / §13 that already mitigate it. No new rule IDs are invented. Where the analysis surfaces a threat that no existing rule actually covers, it is called out explicitly in §10 "Residual Risks" as a gap — not silently patched with an implied mitigation.

This document supersedes nothing; it is a cross-cutting lens applied on top of TDD, CSD, and GREB. If a discrepancy is ever found between this document and the rule tables in those three documents, the rule tables are authoritative.

---

## 2. System Components and Trust Boundaries

MeshyForge is a single-user Tauri 2.x desktop application. There is no server component and no multi-tenant data — the trust boundaries are therefore between *processes and privilege levels on one machine*, plus one external network boundary to the Meshy API.

```
                                    Trust Boundary 1
                                    (webview sandbox ↔ OS-privileged host process)
┌───────────────────────────────────────────┐         ┌─────────────────────────────────────┐
│      (a) Tauri Webview / Frontend           │  IPC    │   Rust Backend (Tauri Core, OS-      │
│      React 19, untrusted-input surface,     │◄───────►│   privileged: file I/O, network,     │
│      renders remote-influenced content      │  (b)    │   process control)                   │
│      (prompts, thumbnails, error text)      │         │                                       │
└───────────────────────────────────────────┘         │  ┌─────────────┐  ┌────────────────┐  │
                                                          │  │ (c) HTTP    │  │ (d) SQLite DB   │  │
     Trust Boundary 2 (Rust backend ↔ internet) ─────────┼─►│ Client      │  │ (rusqlite)      │  │
                                                          │  │ (reqwest)   │  └────────────────┘  │
                                                          │  └─────────────┘                       │
                                                          │  ┌─────────────┐  ┌────────────────┐  │
     Trust Boundary 3 (Rust backend ↔ OS secret store) ──┼─►│ (e) OS       │  │ (f) Local File  │  │
                                                          │  │ Keychain    │  │ System (assets) │  │
                                                          │  └─────────────┘  └────────────────┘  │
                                                          └─────────────────────────────────────┘
                                                                          │
                                                                          ▼ HTTPS (Trust Boundary 2)
                                                                 ┌─────────────────────┐
                                                                 │  Meshy AI API        │
                                                                 │  api.meshy.ai        │
                                                                 │  (external, trusted  │
                                                                 │  third party)        │
                                                                 └─────────────────────┘

     Trust Boundary 4 (developer machine / CI ↔ public internet — supply chain)
     (g) GitHub Actions CI/CD, npm/crates.io dependency graph, GitHub repo itself
```

**Components analyzed (§3–§9):**

| # | Component | Privilege level | Primary boundary crossed |
|---|---|---|---|
| (a) | Tauri webview / frontend (React 19) | Sandboxed, no direct OS access | Boundary 1 (IPC to backend) |
| (b) | Tauri IPC (`invoke` commands) | N/A — the boundary itself | Boundary 1 |
| (c) | Rust backend's Meshy API HTTP client (`reqwest`) | OS-privileged process, outbound network | Boundary 2 (internet) |
| (d) | Local SQLite database (`rusqlite`) | OS-privileged process, local disk | Within backend (no boundary crossing, but a data-at-rest asset) |
| (e) | OS keychain / API key storage (`keyring`/`keytar`) | OS-privileged process, OS secret store | Boundary 3 |
| (f) | Local file system (asset storage) | OS-privileged process, local disk | Within backend; also crosses to OS file picker on export |
| (g) | CI/CD supply chain (dependencies, GitHub Actions) | Build-time, not runtime | Boundary 4 |

The frontend (a) is the only component that renders content and is therefore the primary XSS/injection concern, but per TDD §4.1 and CSD RCT-10/CTR-07, it has **no direct network, filesystem, or database access** — everything is mediated through the Rust backend via Tauri IPC (b). This single mediation point is the architectural reason the STRIDE analysis below is short relative to a typical client-server web app: most STRIDE categories that would apply to a browser frontend with direct backend/DB access are structurally foreclosed by the IPC boundary, not merely policy-mitigated.

---

## 3. Component (a) — Tauri Webview / Frontend

| STRIDE | Threat | Mitigating Rule(s) |
|---|---|---|
| **Spoofing** | A malicious or compromised web dependency injects script that impersonates the app UI (e.g., a fake "enter your API key" dialog) to phish the key from the user. | SEC-02 (frontend never receives raw key, so a phished "key" typed into a fake dialog is worthless to the attacker unless the user re-enters real key material) SEC-07 (CSP `connect-src` restricted to `self`/`asset:`, limiting where injected script could exfiltrate to) |
| **Tampering** | XSS via unsanitized rendering of API-influenced content (e.g., a Meshy error body or asset prompt text rendered as HTML) alters DOM/state or triggers unintended IPC calls. | SAN-02 (Meshy error bodies are passed through as-is but are treated as *user-facing text*, not executed — React's default text-node escaping applies; no rule permits `dangerouslySetInnerHTML` of remote content) SEC-07 (CSP restricts `connect-src`, limiting exfiltration even if a render-time injection succeeded) |
| **Repudiation** | N/A — single-user local app; no multi-user action attribution is in scope. | — (out of scope; no rule needed) |
| **Information Disclosure** | Frontend state (Zustand/TanStack Query cache) is inspected via webview devtools to look for the API key. | SEC-02 (frontend Zustand store holds only a boolean `hasApiKey`, never the raw key — so this is a structural mitigation, not just policy) |
| **Denial of Service** | A pathological gallery size or unbounded render loop freezes the UI thread. | PRF-06 (virtualization above 100 items, TDD §13/CSD §13.1) — performance rule, cited for completeness though not a CSD §12 security rule |
| **Elevation of Privilege** | Frontend code attempts to call a Tauri command/capability it should not have access to (e.g., direct filesystem write) to escape the webview sandbox. | SEC-08 (Tauri capabilities file grants only `dialog`, `notification`, `shell:open` — no `fs:write` or `http:default`, so no such command exists to call) |

---

## 4. Component (b) — Tauri IPC Boundary (Frontend ↔ Rust Backend)

| STRIDE | Threat | Mitigating Rule(s) |
|---|---|---|
| **Spoofing** | Frontend sends a crafted IPC payload claiming to be a different command or with forged parameters to trigger unintended backend behavior. | VAL-01 (all Tauri command inputs validated in Rust before any Meshy API call; malformed/missing fields return `INVALID_INPUT` without side effects) |
| **Tampering** | Oversized or malformed prompt/numeric parameters sent over IPC to cause backend misbehavior or wasted API credits. | VAL-02 (string length checks, e.g. 600-char prompt limit; UUID validation for task IDs) VAL-03 (numeric range checks, e.g. `target_polycount` 100–300,000) |
| **Repudiation** | N/A — single local user, no multi-actor audit requirement. | — (out of scope) |
| **Information Disclosure** | IPC response payloads (Rust → frontend) leak internal file paths, stack traces, or the API key back across the boundary. | SAN-01 (error messages to frontend must not contain API key, internal file paths, or stack traces) SAN-03 (Rust panics return generic "Internal error", never the panic message) SAN-04 (DB errors are generalized before crossing the IPC boundary) |
| **Denial of Service** | Frontend issues a flood of IPC calls (e.g., rapid duplicate task-creation clicks) exhausting backend resources or Meshy credits. | VAL-01 (validation happens before any credit-consuming API call) BPR-07 (max 3 concurrent downloads via semaphore — bounds one class of resource exhaustion; cited for completeness, a CSD §13 performance rule rather than §12 security rule) |
| **Elevation of Privilege** | Frontend attempts to invoke a command outside its declared capability scope to gain filesystem/network access beyond what's granted. | SEC-08 (capabilities file least-privilege: only `dialog`, `notification`, `shell:open`) |

---

## 5. Component (c) — Rust Backend's Meshy API HTTP Client (`reqwest`)

| STRIDE | Threat | Mitigating Rule(s) |
|---|---|---|
| **Spoofing** | A network attacker (e.g., on public Wi-Fi) or DNS hijack impersonates `api.meshy.ai` to harvest the API key or return malicious task/model data. | SEC-05 (key sent only via `Authorization: Bearer` header over what TDD §4.1 specifies as HTTPS) — *Residual: no rule explicitly mandates TLS certificate validation/pinning beyond `reqwest`'s defaults; see §10.* |
| **Tampering** | A man-in-the-middle modifies signed download URLs or model file bytes in transit. | TDD §11 "Signed download URLs" row (fetched server-side over HTTPS); SEC-09 (download host allowlist restricts all downloads to `https://assets.meshy.ai`, preventing SSRF via malformed API responses) — *Residual: no rule mandates integrity verification (checksum/hash) of downloaded model files after transfer; see §10.* |
| **Repudiation** | N/A — no multi-party transaction ledger is in scope for a single-user client. | — (out of scope) |
| **Information Disclosure** | The API key or signed URLs leak via logs, crash reports, or verbose error output. | SEC-04 (no log statement may include the API key) SEC-06 (signed download URLs are not logged) SAN-01 (error messages to frontend sanitized of secrets) |
| **Denial of Service** | Meshy API rate-limits (429) or errors (5xx) are mishandled, causing retry storms that exhaust the user's credits or hang the app. | TDD §12.2 Retry Strategy (exponential backoff on 429, fixed delay + capped retries on 5xx/timeout/network errors) — a TDD §12 rule, not a CSD §12 rule, cited because it is the actual mitigation for this threat |
| **Elevation of Privilege** | N/A — the HTTP client only ever talks to one fixed external host; there is no privilege tier to escalate into from this component. | — (out of scope; foreclosed by SEC-07's CSP scoping at the frontend layer and by the client only targeting `api.meshy.ai`) |

---

## 6. Component (d) — Local SQLite Database

| STRIDE | Threat | Mitigating Rule(s) |
|---|---|---|
| **Spoofing** | N/A — single local file, no network-facing identity to spoof. | — (out of scope) |
| **Tampering** | SQL injection via unsanitized input (prompt text, tags, notes) altering or corrupting query logic. | VAL-06 (all SQL queries use parameterized statements `params![]`; no string interpolation) TDD §11 "SQLite injection" row (same rule, restated) |
| **Repudiation** | N/A — no multi-user audit trail is in scope. | — (out of scope) |
| **Information Disclosure** | Verbose SQLite error messages (e.g., referencing schema/table names) are surfaced to the user or logs in a way that aids further attack, or the raw `.db` file is read by another local process/user. | SAN-04 (DB error messages are generic — "Database error. Try restarting the app." — specific SQLite error is logged, not shown) — *Residual: no rule addresses OS-level file permissions on the `.db` file itself (i.e., whether it's readable by other local OS user accounts); see §10.* |
| **Denial of Service** | Concurrent write contention corrupts the database or blocks the UI. | BPR-06 (SQLite connection guarded by `Mutex`; WAL mode allows concurrent reads, writes serialized) — a CSD §13 performance rule, cited because it is the actual corruption-prevention mitigation |
| **Elevation of Privilege** | N/A — SQLite has no privilege model; access is entirely gated by OS file permissions on the process account, already the same account running the whole app. | — (out of scope) |

---

## 7. Component (e) — OS Keychain / API Key Storage

| STRIDE | Threat | Mitigating Rule(s) |
|---|---|---|
| **Spoofing** | A malicious process on the same machine registers itself under the app's keychain service name to intercept key reads/writes. | SEC-01 (key stored via the `keyring` crate using OS-native secure storage: macOS Keychain, Windows Credential Manager, Linux secret service) — *Residual: no rule specifies the exact keychain service/account identifier namespacing to prevent same-machine collision; see §10.* |
| **Tampering** | The stored key is overwritten or deleted by another local process, causing silent auth failures. | TDD §12.2 (401 Unauthorized → "prompt user to re-enter API key") — detection/recovery path exists even though prevention is an OS-level guarantee outside app control |
| **Repudiation** | N/A — not applicable to a local secret store. | — (out of scope) |
| **Information Disclosure** | The API key is exposed via memory dump, swap file, or is written to disk in plaintext outside the OS-managed secure store. | SEC-01 (never written to SQLite, config files, or environment variables) SEC-03 (key lives only in Rust process memory for app lifetime; never serialized to JSON or sent to frontend) SEC-02 (frontend never receives raw key) |
| **Denial of Service** | Keychain access failure (e.g., locked keychain, permission denied) is unhandled and crashes the app instead of degrading gracefully. | TDD Error Hierarchy `MissingApiKey` variant (TDD §12.1) — modeled as a distinct, handled error case |
| **Elevation of Privilege** | N/A — the keychain enforces OS-level access control (same user account); MeshyForge does not run with elevated privileges to bypass this. | — (out of scope) |

---

## 8. Component (f) — Local File System (Asset Storage)

| STRIDE | Threat | Mitigating Rule(s) |
|---|---|---|
| **Spoofing** | N/A — not applicable to local file storage with no network identity. | — (out of scope) |
| **Tampering** | Path traversal via a crafted file path (from OS file dialog input or export target) writes/reads outside the intended app data directory. | VAL-04 (file paths from OS file dialog must be canonicalized before use; no `..` traversal) TDD §11 "File system access" row (assets stored under app data directory; app never writes outside it) |
| **Repudiation** | N/A — no multi-user audit trail is in scope. | — (out of scope) |
| **Information Disclosure** | A malicious or malformed "image" upload (for image-to-3D) is actually a different file type that, when later read/rendered, discloses unintended data or exploits a parser. | VAL-05 (image uploads validated both by extension and by MIME/magic bytes in Rust) |
| **Denial of Service** | Unbounded orphaned asset directories or unbounded concurrent downloads exhaust disk space or I/O. | BPR-08 (orphaned asset directories cleaned up on app startup) BPR-07 (max 3 concurrent downloads via semaphore) BPR-04 (downloads stream to disk rather than buffering in memory, preventing memory-based DoS on large models) |
| **Elevation of Privilege** | N/A — file operations run under the same OS user account as the rest of the app; no privilege boundary to cross. | — (out of scope; also structurally limited by SEC-08's capability scoping, which grants no `fs:write` beyond what the backend itself performs) |

---

## 9. Component (g) — CI/CD Supply Chain (Dependencies, GitHub Actions)

| STRIDE | Threat | Mitigating Rule(s) |
|---|---|---|
| **Spoofing** | A typosquatted or maliciously named npm/crates.io package is added as a dependency, impersonating a legitimate popular package. | DEP-05 (GREB §13.1 — no dependency below 1,000 weekly npm downloads / 100 crates.io downloads without justification) DEP-04 (no new dependency without PR justification) |
| **Tampering** | A compromised upstream dependency version introduces malicious code at build or runtime (supply-chain attack). | DEP-03 (`package-lock.json`/`Cargo.lock` committed — pins exact resolved versions, preventing silent upstream substitution) DEP-07 (dependencies reviewed monthly; major updates require a dedicated migration branch rather than silent auto-update) GIT-07 (CSD — lockfiles committed, same control restated) |
| **Repudiation** | Secrets or credentials are pasted into workflow files, issue comments, or commit messages without traceability of who/why. | SEC-REP-03 (no secret values may appear in workflow files, issue comments, PR descriptions, or commit messages) |
| **Information Disclosure** | A GitHub Actions workflow leaks a secret (if any are later added post-MVP) via logs, or a compromised Action exfiltrates repo contents. | SEC-REP-01 (no repository secrets configured for MVP — eliminates this threat entirely at present) SEC-REP-02 (if added post-MVP, secrets must be scoped to minimum required workflows) SEC-REP-04 (GitHub secret scanning enabled) |
| **Denial of Service** | A known-vulnerable dependency with a DoS-class CVE goes unnoticed and ships in a release. | SEC-REP-05 (GitHub dependency alerts enabled) GREB §12.2 (`npm audit` + `cargo audit` run weekly via `audit.yml`, alert-only) |
| **Elevation of Privilege** | A compromised GitHub Action or overly-broad workflow permission allows write access to the repository or release artifacts beyond what's needed. | SEC-REP-02 (secrets — and by the same least-privilege principle, workflow scope — must be minimum required) — *Residual: no rule explicitly caps GitHub Actions workflow `permissions:` blocks (e.g., `contents: read` by default) or requires pinning Actions to commit SHAs rather than tags; see §10.* |

---

## 10. Residual Risks

The following threats surfaced during this analysis are **not** fully covered by any existing rule in TDD §11, CSD §12, or GREB §12/§13. Per the task constraint, no new rule IDs are invented here — these are flagged as gaps for the project owner to consciously accept or address in a future revision of CSD/TDD/GREB.

1. **TLS certificate validation / pinning for the Meshy API client.** SEC-05 governs *where* the API key is sent (header, not body) but no rule explicitly mandates certificate validation behavior for `reqwest` (e.g., rejecting invalid certs, or pinning `api.meshy.ai`'s certificate). `reqwest`'s secure defaults likely cover this in practice, but it is not a documented, testable rule. Note: `assets.meshy.ai` (download host) TLS validation is covered by `reqwest`'s secure defaults, same as `api.meshy.ai`. (Relates to §5, Spoofing.)

2. **Integrity verification of downloaded model/texture files.** No rule requires checksum or hash verification of files downloaded from Meshy's signed URLs after transfer completes, beyond HTTP status success. A corrupted or tampered-in-transit file (short of a full MITM defeating TLS) could be silently stored and later loaded into the 3D viewer. (Relates to §5, Tampering.)

3. **OS-level file permissions on the SQLite database file and asset directory.** No rule specifies that the `.db` file or `/assets/` directory should be created with restrictive permissions (e.g., `0600`/user-only) versus relying entirely on OS default umask. On a shared/multi-user machine this could allow another local OS account to read stored prompts, tags, and metadata. (Relates to §6 and §8, Information Disclosure.)

4. **Keychain entry namespacing collision.** SEC-01 mandates OS keychain storage but does not specify a unique service/account identifier convention (e.g., a reverse-DNS bundle ID) to prevent another locally-installed app from accidentally reading or overwriting MeshyForge's keychain entry. (Relates to §7, Spoofing/Tampering.)

5. **GitHub Actions workflow permission scoping and Action pinning.** GREB §12/§13 covers secrets hygiene and dependency vetting thoroughly, but no rule requires (a) explicit minimal `permissions:` blocks in workflow YAML, or (b) pinning third-party GitHub Actions to a full commit SHA rather than a mutable tag (e.g., `actions/checkout@v4` vs. a pinned SHA), which is a known supply-chain hardening practice. (Relates to §9, Elevation of Privilege.)

6. **No code signing on any platform (documented, not a gap, but worth restating as accepted risk).** GREB §12.3 explicitly documents that macOS, Windows, and Linux builds are unsigned for the MVP, with the associated UX friction (Gatekeeper/SmartScreen warnings) as a known, accepted tradeoff rather than an oversight. This is *not* a new residual risk — it is already an explicitly accepted one — but is restated here because unsigned binaries are also a supply-chain integrity concern (a user cannot cryptographically verify a downloaded release actually came from the project maintainer).

None of these six items are severe enough, in the context of a personal-use, single-user desktop app with no server-side attack surface and no multi-tenant data, to justify overriding the gap assessment's original "low value, do not generate" judgment about the exercise as a whole — the STRIDE pass mostly confirmed existing coverage rather than discovering high-impact gaps. They are recorded here as candidate line items for a future CSD/TDD revision, should the project's risk profile change (e.g., moving to a signed/distributed release, a multi-user context, or handling other users' data).

---

## Summary

This analysis catalogued threats across 7 components using the applicable STRIDE categories per component (several categories were marked out-of-scope per component where structurally inapplicable to a single-user local desktop app — e.g., Repudiation almost everywhere, Elevation of Privilege where no privilege tier exists to escalate into). The large majority of identified threats map cleanly onto existing SEC-xx, VAL-xx, SAN-xx, SEC-REP-xx, DEP-xx, BPR-xx, and PRF-xx rules already codified in TDD §11/§12, CSD §12/§13, and GREB §12/§13. Six threats were found to lack a documented existing mitigation and are recorded as residual risks in §10 rather than answered with an invented rule.

---

*End of Security Threat Model — MeshyForge v1.0.0*
