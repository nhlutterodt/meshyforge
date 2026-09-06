# ADR-0008: Persistence Integrity, Audit, and Full Recovery Strategy

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-09-05 |
| **Deciders** | Neils (confirmed Option A); GitHub Copilot |
| **Phase** | Phase 1 backend foundation, with recovery UX delivered in the next available polish increment |
| **Related rules/features** | FR-INF-03, FR-GAL-01 through FR-GAL-10, FR-EXP-05; VAL-04, VAL-06, SAN-04; security threat model residual risks 2 and 3 |
| **Supersedes** | None |

## Context

**Trigger:** TASK-0010 found that persistence integrity, auditability, and recovery are weaker than the application's local-first asset-history promise. The SQLite schema comments `task_log.meshy_task_id` as a foreign key without declaring one, audit columns are inserted empty and never completed, `assets` has no mutation timestamp, and database startup has no integrity check, backup, quarantine, or restore path. This satisfies adr-log criteria 1, 3, and 6: it crosses the storage/command boundary, changes the SQLite contract, touches documented data-loss residual risk, and is expensive to reverse after more asset history accumulates.

MeshyForge has no server-side workspace or task-list API. A damaged or lost local database can therefore make the user's asset history unrecoverable even when the downloaded files remain on disk. The recovery design must protect both the database and the asset directory without exposing raw API keys, signed URLs, internal paths, or SQLite diagnostics through IPC.

**Constraints found:**

- `technical_design_document.md` §6.1 and `src-tauri/migrations/001_initial.sql` define one local asset row per completed task, JSON file/texture path maps, and a nullable task-log task ID for failures before Meshy returns an ID.
- `coding_standards.md` §12 requires parameterized SQL (`VAL-06`), canonicalized file paths (`VAL-04`), and sanitized database errors (`SAN-04`).
- `security_threat_model.md` §10 identifies downloaded-file integrity and database/asset file permissions as residual risks. This ADR addresses the database recovery portion while preserving the existing file-host allowlist and path-safety controls.
- `docs/test_plan.md` §4 and `coding_standards.md` §11.4 require Rust storage coverage of at least 80% and real migration/backend tests rather than an isolation harness alone.

**Precedent search record:**

- Searched: `task_log`, `foreign key`, `updated_at`, `integrity_check`, `backup`, `restore`, `corrupt`, `recovery`, `audit`, `transaction`, `CASCADE`, `SET NULL`, `DB-`, `RST-`, `VAL-`, `SAN-`.
- Searched in: `docs/**/*.md`, `src-tauri/src/**`, `src-tauri/migrations/*.sql`, and all existing files in `docs/adr/`.
- Result: `asset_tags` is the only declared asset relationship and already uses foreign keys with cascading cleanup. No existing migration runner, backup rotation, database recovery workflow, or audit lifecycle exists. `TASK-0008` and `TASK-0009` provide the relevant persistence findings and transaction precedent. No prior ADR resolves this question.

## Options Considered

| Option | Pros | Cons | Conflicts With |
| --- | --- | --- | --- |
| Option A — full recovery machinery now | Protects the only durable task history; detects corruption early; preserves a quarantined forensic copy; restores only verified snapshots; makes audit behavior explicit before more features depend on the schema | Highest implementation and test surface; requires careful crash-safe backup rotation, restore validation, and user-facing recovery states | Requires new storage/IPC behavior and proposed persistence rules; must preserve `VAL-04`, `VAL-06`, and `SAN-04` |
| Option B — integrity and audit hardening, defer automatic restore | Smaller initial change and lower UI complexity | Leaves users without an automatic recovery path after the exact corruption event the threat model identifies | Leaves residual database-loss risk open |
| Option C — schema-only changes | Lowest cost and fewest files | Does not make audit columns truthful and provides no recovery mechanism | Fails to address the TASK-0008 data-loss finding |

## Decision

**Adopt Option A: implement full SQLite persistence integrity, audit lifecycle, rotating verified backups, quarantine, and restore workflows.**

The implementation must follow these rules:

1. **Schema integrity and migrations**
   - Add a numbered, idempotent migration rather than editing migration 001 in place.
   - Declare `task_log.meshy_task_id` as a nullable foreign key with `ON DELETE SET NULL`. Failed-before-ID rows remain valid, while deleting an asset does not destroy its audit history.
   - Add `assets.updated_at`, initialized from the existing creation timestamp for migrated rows and updated by every asset mutation (`insert_asset`, task status, download completion, tags, favorite, notes, and deletion-related bookkeeping).
   - Add the indexes needed for task-log lookup and update-time ordering, while retaining the current JSON path representation for backward compatibility.

2. **Audit lifecycle**
   - Treat `task_log` as append-only request-attempt history. Each provider call creates or completes one log record with endpoint, sanitized request body, response status, bounded response body, error classification, timestamp, and optional credit before/after values.
   - Redact API keys, signed URLs, authorization headers, local absolute paths, and other credential-bearing values before persistence. Truncation must be deterministic and recorded by metadata, not by leaking the original body.
   - Audit writes must not make a successful user operation fail solely because logging is unavailable; the failure is logged locally and surfaced through the recovery diagnostics path. Operations that would violate the database transaction contract still fail normally.

3. **Backup rotation**
   - Maintain a bounded set of timestamped database backups in a dedicated recovery directory beneath the application data directory, separate from live assets and the live database.
   - Create a consistent SQLite backup through the SQLite online backup API before migrations and at controlled clean checkpoints. Do not copy only the main database file while an uncheckpointed WAL contains committed data.
   - Rotate by retention count and age, never deleting the last known-good backup before a newer backup has passed integrity validation. Backup filenames and metadata must not contain secrets.
   - Verify each newly created backup with `PRAGMA integrity_check` before it becomes eligible for restoration.

4. **Corruption detection and quarantine**
   - Run `PRAGMA integrity_check` during startup and before destructive migration/recovery actions. A non-`ok` result is a recovery state, not a normal database error.
   - Close the live connection before moving the damaged database, WAL, and SHM files into a timestamped quarantine directory. Never overwrite the only damaged copy.
   - Quarantine metadata must contain only safe diagnostic information: timestamps, integrity result, schema version if readable, and file names. It must not include API keys, signed URLs, or raw unbounded database errors in frontend-visible responses.

5. **Restore workflow**
   - Select the newest backup that passes integrity validation, restore it to a temporary database, rerun migrations if required, and validate it again before atomically replacing the live database.
   - Preserve the quarantined files and a recovery report after a successful restore. If no backup validates, preserve all evidence and present a sanitized terminal recovery state rather than silently creating an empty database.
   - Expose recovery status and an explicit restore action through the existing IPC boundary. Restore targets must remain inside the application recovery directory after canonicalization, following `VAL-04`; errors crossing IPC follow `SAN-04`.
   - Recovery must not delete or rewrite downloaded asset files. Any database rows whose local files are missing must be reported as recoverable metadata inconsistencies, not silently fabricated.

6. **Testing and evidence**
   - Test the real Rust crate, migration upgrade path, FK `SET NULL` behavior, audit redaction/truncation, timestamp updates, WAL-aware backup creation, backup rotation, corruption quarantine, newest-valid-backup selection, failed restore atomicity, and the no-valid-backup terminal state.
   - Add adversarial tests for interrupted rotation, corrupted main/WAL/SHM combinations, malicious restore paths, malformed backup metadata, oversized audit payloads, secrets in request/response JSON, and backups that pass file-copy checks but fail `integrity_check`.
   - Keep `Database::open_in_memory` behavior aligned with file-backed startup checks where SQLite permits it, and do not treat an isolation harness as a substitute for `cargo test` on the real crate.

**Newly proposed rule ID(s), if any** (clearly marked as proposed):

- `RST-DB-01` (proposed) — Multi-statement persistence changes must use one SQLite transaction or one SQLite statement with equivalent atomicity.
- `RST-DB-02` (proposed) — A live MeshyForge database must have a verified rotating backup and a tested quarantine/restore path before destructive migration or recovery replacement.
- `RST-DB-03` (proposed) — Persisted API audit data must be bounded and redacted of credentials, signed URLs, and local absolute paths.

## Consequences

**Positive:**

- Local task history has a defined recovery path instead of being a single unverified database file.
- Audit columns become useful operational evidence rather than permanently empty schema decoration.
- Asset deletion preserves API history through `ON DELETE SET NULL`.
- Future canonical-storage, provider, local-execution, and workbench decisions can rely on explicit persistence guarantees.

**Negative:**

- Storage startup and mutation code becomes more complex and must handle recovery states explicitly.
- Backup files consume bounded additional disk space and require retention cleanup.
- The restore UI and IPC contract become security-sensitive surfaces requiring path validation and sanitized diagnostics.
- A valid database restore cannot repair missing or corrupted model files; asset-file integrity remains a separate residual risk.

**Follow-ups:**

- Docs to update via `doc-sync`: TDD §6.1 and §7.3, CSD §11.3/§12 and §19.1, security threat model §10, test plan storage cases, and the changelog. Add the proposed `RST-DB-01` through `RST-DB-03` only after review.
- Tests to add: migration upgrade tests, database recovery service tests, command IPC tests, and adversarial filesystem/SQLite tests listed in the Decision.
- Tech debt to register: storage usage currently reports downloaded asset row count rather than byte usage; this remains outside this ADR.

## References

- `docs/technical_design_document.md` §6.1 and §7.3
- `docs/coding_standards.md` §11.3, §11.4, §12, §19.1
- `docs/security_threat_model.md` §6, §8, §10
- `docs/test_plan.md` §2, §4
- Related ADRs: ADR-0002, ADR-0004, ADR-0005
- Related tasks: TASK-0008, TASK-0009, TASK-0010
