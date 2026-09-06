# ADR-0009: Restart-Mode Database Recovery

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-09-05 |
| **Deciders** | Neils (confirmed Path B); GitHub Copilot |
| **Phase** | Phase 1 backend foundation and recovery hardening |
| **Related rules/features** | ADR-0008; FR-INF-03; VAL-04; SAN-01, SAN-04; proposed RST-DB-02 |
| **Supersedes** | None |

## Context

ADR-0008 accepted full backup rotation, quarantine, and restore. Specialist review found that the current `Database` owns an open SQLite connection for the lifetime of `AppState`; replacing the database file from an IPC command is therefore unsafe on Windows. The current `RecoveryManager` is storage-only and is not integrated into startup or Tauri commands.

**Trigger:** Choose a recovery lifecycle that never renames or replaces the live database while an application SQLite handle is open. This is an Architectural/Contract/Security decision under adr-log criteria 1, 3, and 6.

**Constraints found:**

- `src-tauri/src/main.rs` is the process entrypoint and currently invokes normal Tauri startup immediately.
- `src-tauri/src/app_state.rs` opens `meshyforge.db` synchronously before commands are registered.
- Windows file locking makes in-process replacement of an open SQLite database unreliable.
- `VAL-04` requires canonicalized, contained paths; `SAN-01` and `SAN-04` prohibit raw paths and database diagnostics across IPC.
- ADR-0008 requires preserving corrupt database evidence and refusing to create an empty database when no verified backup exists.

**Precedent search record:**

- Searched: `main`, `AppState::new`, `Database::open`, `recovery`, `restart`, `relaunch`, `process::exit`, `restore`, `quarantine`, `VAL-04`, `SAN-01`, `SAN-04`.
- Searched in: `src-tauri/src/**`, `src-tauri/tauri.conf.json`, `docs/**/*.md`, and all ADRs through ADR-0008.
- Result: no existing recovery process mode, restart protocol, or recovery IPC contract exists. ADR-0008 defines the storage behavior but leaves the process lifecycle open.

## Options Considered

| Option | Pros | Cons | Conflicts With |
| --- | --- | --- | --- |
| Option A — controlled in-process close/reopen | Best seamless UX; no second process mode; direct access to existing state | Requires quiescing every database command, replacing `Database` ownership, coordinating polling/downloads, and proving Windows rename behavior | High risk against Windows file-locking constraints; expands ADR-0008 implementation surface |
| Option B — restart-mode recovery in the same executable | Recovery runs with no live SQLite handle; clear process boundary; no separate helper binary | Requires restart UX, command-line recovery validation, crash-loop protection, and preserving a safe recovery request | Extends Tauri startup and release packaging behavior, but preserves VAL/SAN rules |
| Option C — external helper executable | Strongest isolation from the app process | Adds packaging, signing, update, and helper trust-boundary complexity disproportionate to the current desktop app | Dependency/release surface not currently present |

## Decision

**Adopt Option B: perform destructive database recovery in a dedicated restart mode of the existing executable, before normal Tauri startup.**

The normal process must follow this lifecycle:

1. Resolve the application data directory without opening SQLite.
2. If a recovery request is present, validate its schema and contained paths, run recovery mode, write only sanitized result metadata, and relaunch normal mode only after successful verified replacement.
3. Otherwise, open the database and run migrations plus integrity validation.
4. If startup integrity fails, do not register normal application state as usable. Write a sanitized recovery-required state and present recovery UI/status through a non-database path.
5. An explicit user-confirmed restore writes a bounded recovery request and exits. The next process invocation performs quarantine and restore with no live SQLite connection.

Recovery requests and result metadata must use stable enums and backup identifiers, not arbitrary frontend-supplied paths. A backup identifier is accepted only if it resolves beneath the application recovery directory after canonicalization and is a regular file, not a symlink/reparse point. Raw filesystem paths and SQLite errors remain backend logs only.

The recovery mode must:

- Quarantine the database, WAL, and SHM files as one coordinated set before replacement.
- Preserve a safe metadata report containing operation, timestamp, selected backup identifier, integrity outcome, and sanitized failure code.
- Select only backups that pass integrity validation and required migrations in a temporary location.
- Replace the live database only from a validated temporary file, with stale temporary files removed or rejected deterministically.
- Refuse replacement when no candidate validates, preserving quarantine evidence and returning a terminal recovery state.
- Prevent repeated automatic restart loops through a bounded request-attempt marker.

**Newly proposed rule ID(s), if any:**

- `RST-DB-04` (proposed) — Destructive database recovery must run without an open live SQLite connection and must be initiated only by a validated, user-confirmed recovery request.
- `RST-DB-05` (proposed) — Recovery IPC accepts opaque backup identifiers and stable status enums, never arbitrary filesystem paths or raw storage errors.

## Consequences

**Positive:**

- Windows file replacement is performed outside the normal live database process state.
- The normal app never exposes raw recovery paths or SQLite diagnostics to the frontend.
- Recovery failure preserves evidence and does not silently create an empty database.
- The recovery lifecycle is testable as a pure process-mode function before Tauri UI wiring.

**Negative:**

- Restore requires an application restart.
- Startup and recovery state must be designed so repeated failure cannot create a crash loop.
- Recovery status must be available before normal database-backed state exists.
- Release and development launch commands must preserve the executable's recovery arguments.

**Follow-ups:**

- Implement process-mode parsing and a recovery request/result protocol before adding restore IPC.
- Add startup integrity detection and a recovery-required UI/status path.
- Add Windows-specific tests for request validation, quarantine set handling, staged replacement, stale temporary files, and restart-loop prevention.
- Run doc-sync for ADR-0008 and ADR-0009 together after the lifecycle implementation is verified.

## References

- ADR-0008: Persistence Integrity, Audit, and Full Recovery Strategy
- `src-tauri/src/main.rs`
- `src-tauri/src/app_state.rs`
- `src-tauri/src/storage/recovery.rs`
- `docs/security_threat_model.md` §6, §8, §10
- `docs/coding_standards.md` §12
