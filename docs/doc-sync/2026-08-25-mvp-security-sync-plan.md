# MVP Security Documentation Sync Plan

## Status

Draft for human review. This plan does not modify versioned planning documents. The signed-download origin policy is pending a Security ADR and must not be applied until that decision is accepted.

## Trigger

The MeshyForge MVP security pass completed on 2026-08-25. The implementation now enforces Rust-side request validation, endpoint and task-ID allowlists, managed-path confinement, image signature checks, sanitized IPC errors, fallible startup and lock handling, keychain-only setup, reproducible Rust dependency locking, and a filename-only tracked-secret CI check.

## Evidence

- `src-tauri/src/commands/validation.rs` centralizes pre-network request, endpoint, UUID, numeric, download-origin, and filename validation.
- `src-tauri/src/commands/assets.rs` canonicalizes reveal paths and validates PNG, JPEG, and WebP signatures.
- `src-tauri/src/commands/api.rs` rejects invalid requests before client acquisition and propagates sanitized persistence failures.
- `src-tauri/src/commands/keychain.rs` validates key input and keeps credential-store details behind generic IPC errors.
- `src-tauri/src/app_state.rs`, `src-tauri/src/storage/database.rs`, `src-tauri/src/meshy/client.rs`, and `src-tauri/src/lib.rs` remove production panic paths from the hardened boundaries.
- `.github/workflows/ci.yml` rejects realistic tracked Meshy API-key patterns while printing filenames only.
- `.gitignore` no longer excludes `src-tauri/Cargo.lock`; the lockfile is present.
- `env.example` was removed because CSD SEC-01 prohibits environment-variable key storage.
- Focused command tests and strict Clippy passed after these changes.

## Proposed Update: Coding Standards

File: `coding_standards.md`

Version: `1.0.0` -> `1.0.1`

Date: `2025` -> `2026-08-25`

Proposed changelog line:

> 1.0.1 (2026-08-25): Corrected the API-key presence contract and clarified that secret scanning must not echo matched credential content.

### SEC-02 Contract Correction

Current claim:

> The `get_api_key` Tauri command returns `Option<String>`, but the frontend stores only a boolean `hasApiKey` in Zustand.

Proposed replacement:

> The `get_api_key` Tauri command returns only a boolean indicating whether a key exists. The raw key never crosses IPC or enters frontend state.

Rationale: the current implementation returns `Result<bool, String>` and therefore provides a stronger boundary than the stale planning example.

### Repository Secret Scan Clarification

Add to GIT-08 or its enforcement note:

> Automated credential scans must report filenames only. They must not print matching lines because a failed scan must not copy a secret into CI logs.

## Proposed Update: Technical Design Document

File: `technical_design_document.md`

Version: `1.0.0 (MVP)` -> `1.0.1 (MVP)`

Date: existing metadata date -> `2026-08-25`

Proposed changelog line:

> 1.0.1 (2026-08-25): Aligned the API-key presence command and Rust input-validation design with the completed MVP security boundary.

### Key Presence Command

Current signature:

```rust
async fn get_api_key() -> Result<Option<String>, String>
```

Proposed replacement:

```rust
async fn get_api_key() -> Result<bool, String>
```

Add:

> This command reveals presence only. Reading the raw credential over IPC is prohibited.

### Input Validation Row

Current claim:

> All form inputs are validated client-side (TypeScript types) and server-side (Rust struct deserialization). Invalid requests are rejected before hitting the API.

Proposed replacement:

> Frontend validation provides immediate feedback, but every Tauri command treats its payload as untrusted. Shared Rust validators enforce required sources, the 600-character prompt limit, UUID task IDs, numeric ranges, supported endpoint paths, and safe filename components before client acquisition or network access. Invalid requests return `INVALID_INPUT` without consuming credits.

Rationale: the commands receive JSON values and use explicit validators; Rust struct deserialization alone is not the controlling security mechanism.

## Proposed Update: Security Threat Model

File: `security_threat_model.md`

Version: `1.0.0` -> `1.0.1`

Date: `2026` -> `2026-08-25`

Proposed changelog line:

> 1.0.1 (2026-08-25): Recorded implemented IPC, filesystem, credential, and error-boundary controls; reserved signed-download origin policy for ADR approval.

Add implementation-status notes to the existing threats without creating new rule IDs:

- VAL-01 through VAL-03 are enforced by shared command validators before network access.
- VAL-04 is enforced by canonical managed-root confinement for reveal operations.
- VAL-05 is enforced by extension and magic-byte checks.
- SAN-01, SAN-03, and SAN-04 are enforced at command boundaries while detailed failures remain local.
- DEP-03 and GIT-07 are satisfied by committing both application lockfiles.
- SEC-REP-04 is supplemented by a blocking, filename-only CI pattern scan.

## Security ADR Required: Signed Download Origins

The implementation restricts downloads to HTTPS URLs whose exact host is `assets.meshy.ai`. Existing documents say only that Meshy signed URLs are fetched server-side over HTTPS; they do not choose an origin policy. This narrows outbound behavior, changes security posture, and constrains future Meshy CDN changes, so the ADR needs-an-ADR test applies.

Options to present for confirmation:

1. **Exact host allowlist (implemented, recommended for MVP):** permit only `https://assets.meshy.ai`. Lowest SSRF exposure and directly grounded in the bundled Meshy examples; a future host migration requires an application update.
2. **Explicit Meshy host set:** permit a reviewed list of exact Meshy asset hosts. Supports documented CDN evolution but broadens the outbound boundary and requires list ownership.
3. **Any HTTPS signed URL returned by Meshy:** maximizes API compatibility but leaves a compromised or malformed API response able to direct the privileged Rust client to an arbitrary public host.

Recommendation: accept option 1 for the MVP and revisit only when official Meshy documentation identifies another required asset host. After acceptance, update the TDD signed-download row and the Security Threat Model's backend/filesystem threat tables through a follow-up doc-sync plan.

## Phase Completion Markers

Do not flip implementation-plan, feature-status, gap-assessment, or repository milestone rows solely from the MVP declaration. Run the formal phase-gate check first and apply only the status changes supported by that report.

## Review Checklist

- Approve the `get_api_key` contract corrections.
- Approve the explicit-validator wording.
- Confirm whether secret scans should be required both locally and in CI.
- Choose a signed-download origin option before creating the Security ADR.
- Run the phase-gate check before changing MVP completion markers in planning documents.
- Apply approved planning-document hunks in one commit with metadata and changelog updates.
