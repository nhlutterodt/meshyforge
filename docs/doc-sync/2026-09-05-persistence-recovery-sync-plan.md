# ADR-0008 Documentation Sync Plan

**Trigger:** ADR-0008 accepted on 2026-09-05; TASK-0024 Packages A-C implemented and validated.

**Mode:** Draft-only. No planning document prose is changed by this file.

## `technical_design_document.md`

**Proposed hunk:** Update the SQLite schema section to describe migration 002, `task_log.meshy_task_id` as a nullable foreign key with `ON DELETE SET NULL`, `assets.updated_at`, the sequential migration runner, and the recovery directory containing rotating verified backups and quarantined database artifacts.

**Version bump:** 1.0.0 -> 1.0.1.

**Changelog line:** `Added ADR-0008 persistence integrity, audit, backup rotation, quarantine, and restore architecture.`

**Rationale:** ADR-0008 Consequences; `src-tauri/migrations/002_persistence_integrity.sql`; `src-tauri/src/storage/database.rs`; `src-tauri/src/storage/recovery.rs`.

## `technical_stack_documentation.md`

**Proposed hunk:** Record that rusqlite uses the `backup` feature in addition to `bundled`, and that the SQLite online backup API is the required mechanism for consistent snapshots while WAL is enabled.

**Version bump:** 1.0.0 -> 1.0.1.

**Changelog line:** `Documented the rusqlite online-backup feature required by ADR-0008.`

**Rationale:** `src-tauri/Cargo.toml`; ADR-0008 Decision section, backup rotation rule.

## `coding_standards.md`

**Proposed hunk:** Add the proposed `RST-DB-01` through `RST-DB-03` rules to the storage/database rule index only after review: atomic multi-statement writes, verified rotating recovery backups, and bounded/redacted audit data. Update the migration/testing guidance to require real-crate tests for recovery behavior.

**Version bump:** 1.0.1 -> 1.0.2.

**Changelog line:** `Proposed storage integrity and recovery rules for transactional writes, verified backups, and redacted audit data.`

**Rationale:** ADR-0008 proposed rules and evidence gate; current `TASK-0009` transaction implementation and `TASK-0024` recovery tests.

## `security_threat_model.md`

**Proposed hunk:** Update residual risk 3 to distinguish the accepted OS-permission gap from the newly implemented database integrity/backup/quarantine/restore controls. Keep downloaded model-file integrity as a separate residual risk.

**Version bump:** 1.0.1 -> 1.0.2.

**Changelog line:** `Refined the database residual-risk entry after ADR-0008 recovery controls were accepted.`

**Rationale:** ADR-0008 explicitly addresses database loss but does not claim model-file checksum verification or OS permission hardening.

## `test_plan.md`

**Proposed hunk:** Add storage test cases for migration upgrades, `ON DELETE SET NULL`, updated_at mutation coverage, WAL-aware backup creation, rotation retention, corruption quarantine, newest-valid restore, failed restore atomicity, malformed backup metadata, and the no-valid-backup terminal state.

**Version bump:** 1.0.1 -> 1.0.2.

**Changelog line:** `Added recovery and persistence-integrity test traceability for ADR-0008.`

**Rationale:** ADR-0008 Decision section, testing and evidence; current real-crate results are 226 passed and 5 ignored before the remaining audit/IPC packages.

## `docs/CHANGELOG.md`

**Proposed hunk:** Add an Unreleased entry for ADR-0008 and TASK-0024's validated migration/recovery foundations. Do not describe audit completion or recovery IPC as shipped until those implementation packages pass their gates.

**Version bump:** Changelog format unchanged.

**Changelog line:** `Added persistence migration, integrity-checked SQLite backups, quarantine, and verified restore primitives under ADR-0008.`

**Rationale:** Prevents the documentation from claiming the still-open audit completion and IPC work is complete.

## Open sync decisions

- Confirm whether proposed `RST-DB-01` through `RST-DB-03` belong in the canonical coding-standard namespace or should receive a dedicated storage namespace before applying prose changes.
- Add final audit lifecycle and recovery IPC details only after TASK-0024 Packages D-E are implemented and security-reviewed.
