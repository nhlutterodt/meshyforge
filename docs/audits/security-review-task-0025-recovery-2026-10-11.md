# Security Review — TASK-0025 Restart-Mode Database Recovery

## 1. Metadata

| Field | Value |
|---|---|
| **Project** | MeshyForge — AI 3D Asset Studio |
| **Document Type** | Security Review (TASK-0025 evidence gate) |
| **Date** | 2026-10-11 |
| **Git HEAD** | `487bce1` |
| **Scope** | `storage/recovery.rs`, `storage/recovery_protocol.rs`, `storage/database.rs`, `commands/recovery.rs`, `lib.rs` (process modes), `migrations/002_persistence_integrity.sql`, `src/App.tsx`, `src/components/recovery/*`, `tauri.conf.json` CSP, `capabilities/default.json` |
| **Method** | Independent read-only review against `.claude/skills/meshyforge-security-review` criteria, ADR-0008, ADR-0009 and the TASK-0024/0025 ledger entries. Reviewer: a separate agent at tier T2 (opus) with no write tools. Orchestrator re-verified the High and key Medium findings against source (marked ✔ below). |
| **Verdict** | **FAIL.** The TASK-0025 evidence gate is not met. |

## 2. Executive Summary

Backup-ID containment, process-mode argument parsing, child-process spawning,
CSP, and SQL construction are sound.

Three items in the evidence gate are not met:

- **Bounded restart behavior.** An interrupted or exhausted restore leaves a
  request that respawns recovery on every launch, with no UI (H1).
- **No destructive action while a live SQLite handle is open (RST-DB-04).**
  The restore command is reachable from normal mode (H2).
- **Process-mode tests.** There are none for `run_process`,
  `run_recovery_process` or `commands/recovery.rs`.

"No-valid-backup refusal" is only partly met: an empty or foreign `.db` file
is accepted as a backup (M1).

**Practical impact for users today.** `create_backup` has no production caller
(I1), so no real install has backups and H1 cannot be reached. However:

- `file_integrity_check(...).unwrap_or(false)` (`lib.rs:113`) treats *any*
  error as corruption and writes `startup-status.json`.
- That file is deleted only after a successful restore (`lib.rs:170`), which
  cannot happen without a backup.
- `recovery_status_inner` reports `RecoveryRequired` whenever the file exists
  (`commands/recovery.rs`).

**Result: once the integrity check trips, the app shows a "no verified
backup" recovery screen on every launch, with no path back to the library
short of deleting a file by hand.** ✔ (orchestrator-verified chain)

## 3. Findings

| # | Sev | Title | Key evidence | Fix direction | Verified |
|---|---|---|---|---|---|
| H1 | High | Exhausted or interrupted restore bricks startup | `lib.rs:144` `next_attempt(&request)?` returns early; `request.json` is kept; `lib.rs:102` respawns recovery each launch; `main.rs:2` `windows_subsystem` hides stderr | Every terminal path writes a sanitized `Failed` result, dead-letters the request, and falls through to the recovery UI. Add process-level tests | ✔ |
| H2 | High | Destructive restore reachable from normal mode with the live DB open (RST-DB-04) | `lib.rs:45` registers `request_recovery_restore` in `run()`; `commands/recovery.rs` spawns the child then `exit(0)`; `result.json` is never removed; `startup-status.json` is removed only on success | Register only `recovery_status` in normal mode. Clear stale status/result files after a passing normal-start integrity check. The recovery child waits for the parent to exit | ✔ |
| M1 | Medium | A zero-byte or foreign `.db` file counts as a verified backup | `recovery_protocol.rs` `is_valid_backup_id` checks only the charset and `.db` suffix; staging runs migrations, then `integrity_check` returns `ok` on an empty schema | Require the `backup-<digits>.db` pattern, the SQLite header, non-zero size, and existing schema tables, probed read-only before migrating | ✔ (pattern) |
| M2 | Medium | Request claim not atomic; concurrent recoveries share one staging path | `lib.rs:127-150` read → claim → write with no lock; fixed `restore.tmp` | Exclusive lock file for the whole recovery; per-process staging name | Plausible |
| M3 | Medium | Stale staging `-wal`/`-shm` replayed onto the next staged copy | `recovery.rs` removes only the staging DB file | Remove staging sidecars; fail closed | Plausible |
| M4 | Medium | Preflight integrity check opens the live DB read-write; any error counts as corruption | `database.rs:59-63` `Connection::open`; `lib.rs:113` `unwrap_or(false)` | Open read-only (`SQLITE_OPEN_READ_ONLY`); treat only CORRUPT/NOTADB or a non-`ok` result as corruption; BUSY/IO is retryable | ✔ |
| M5 | Medium | Missing live DB plus an existing quarantine leads normal start to create a fresh empty DB | `lib.rs:112` skips the check when the DB is absent; rollback errors are ignored (`recovery.rs:98-100`) | Route to recovery UI when the DB is absent and a quarantine or failed result exists | Reviewer-confirmed |
| L1 | Low | Raw OS error text in `failure_code` crosses IPC | `recovery.rs:41,72,102` `to_string()` | Fixed code enum | Reviewer-confirmed |
| L2 | Low | No fsync before atomic renames | `write_atomic`, `recovery.rs:53,129,151` | `sync_all()` + dir sync (Unix) | Plausible |
| L3 | Low | Failed quarantine leaves a misleading directory and `report.json` | `recovery.rs:90,101` | Write the report after the moves, or clean up fully | Reviewer-confirmed |
| L4 | Low | Preflight data dir from the `APPDATA` env var vs Tauri known-folder API | `recovery_protocol.rs:32` vs `lib.rs:30` | One resolver for both | Plausible |
| L5 | Low | Recovery-mode webview keeps plugins/capabilities beyond the two commands; `recovery_status` error fails open to the full app | `lib.rs:203-207`; `capabilities/default.json`; `App.tsx:14-21` | Separate window label and capability; fail closed | ✔ (`App.tsx`) |
| L6 | Low | `-journal` sidecar is not quarantined | `recovery.rs:74` | Add to quarantine/rollback | Plausible |
| L7 | Low | Symlinks/junctions in `backups` not rejected (same-user attacker; residual risk #3) | `recovery_protocol.rs:149-158` | `symlink_metadata` checks; copy from one opened handle | Reviewer-confirmed |
| L8 | Low | Request parsed leniently and without a size bound | no `deny_unknown_fields`; unbounded `read_to_string` | Strict serde + 1 KiB cap | Reviewer-confirmed |
| I1 | Info | Backups are never created in production | `create_backup` callers are tests only (`recovery.rs:305,373`) | Wire scheduled/pre-migration backups (TASK-0024) | ✔ |
| I2 | Info | Oldest backup preselected; list labelled "verified" without validation | `commands/recovery.rs` ascending sort; `RecoveryScreen.tsx:18` | Newest first; validate or relabel | Reviewer-confirmed |
| I3 | Info | Legacy `restore_latest_valid`/`recover` lack staging/rollback; ms-timestamp quarantine IDs can collide | `recovery.rs:109-122,158-161` | Remove or harden; unique IDs | Reviewer-confirmed |

## 4. Verified Safe

- **Backup-ID containment:** charset, length, separators, drive letters, UNC paths, ADS and leading dot are rejected; the path is canonicalized and the parent must equal the root.
- **Invalid or missing backup:** fails before quarantine; the recovery process never creates a DB.
- **Happy path and rename-failure rollback:** handles are closed before quarantine; DB, WAL and SHM are restored together on failure.
- **Normal-mode ordering:** the request check and integrity check run before `AppState` and `Database::open`.
- **Recovery UI handler:** registers exactly two commands, with validated input and fixed error codes.
- **Process spawning:** uses `current_exe()` with the constant `--recovery-mode` argument and exact argv parsing.
- **Result and status files:** written temp-then-rename, with no secrets or paths.
- **CSP:** `script-src 'self'`; `connect-src` limited to self, ipc and asset.
- **SQL:** constant PRAGMAs and `include_str!` migrations only.

## 5. Not Reviewed

- Empirical Windows lock behavior.
- Reproductions of the M2 and M3 races.
- The frontend recovery tests and the full Rust suite. The reviewer ran `cargo test --lib recovery`: 9 passed.
- Installer and relaunch behavior.

## 6. Gate Disposition

TASK-0025 stays `in_progress`. Closure requires:

- H1 and H2 fixed with process-level tests.
- M1 and M4 fixed.
- M2, M3 and M5 fixed or explicitly accepted in an ADR-0009 amendment.
- A re-review.

## 7. Addendum — Remediation and Re-review (2026-10-11)

Fixes are on branch `fix/task-0025-recovery-hardening`, written by a T1
builder (sonnet) in an isolated worktree. Re-review was done by the original
read-only T2 reviewer (opus) over three narrow cycles. The orchestrator
checked every builder report against the diff and re-ran the gates itself:

- `cargo fmt --check` clean
- `cargo clippy --all-targets -- -D warnings` exit 0
- `cargo test` 284 passed, 5 ignored on Windows (main had 258); the Linux-only non-UTF-8 test runs in CI

### Closed

| # | Fix | Test evidence |
|---|---|---|
| H1 | `run_recovery_process_inner` retires `request.json` on every terminal path, writing a sanitized `Failed` result and a dead-letter file. Normal mode is relaunched only after a verified `Restored` outcome with the request gone; otherwise the recovery UI runs in-process. | 7 process-level tests. A revert proof (retirement disabled) turned 6 of them red. |
| H2 | `request_recovery_restore` is registered only in the recovery-UI builder. A healthy normal launch clears the stale `startup-status.json`/`result.json`. | `include_str!` handler guard plus stale-state tests |
| M1 | Backup IDs must match `backup-<digits>.db`. Candidates must be at least 100 bytes, carry the SQLite header, and already contain `schema_version` and `assets`; this is checked through an `immutable=1` read-only open before staging or quarantine. | Zero-byte, foreign and no-schema tests. A revert proof turned the zero-byte test red. |
| M4 | The preflight opens read-only and returns `Ok`, `Corrupt` or `Unavailable`. Only CORRUPT/NOTADB or a non-`ok` result counts as `Corrupt`. `Unavailable` is retried 3×200 ms, then the app starts normally. | WAL-preservation, garbage-file, missing-file and error-mapping tests (the WAL test is weak; see the reviewer note) |
| N1 | (Regression found in cycle 1) A failed restore no longer relaunches normal mode. A missing DB plus a failure code that means the DB was displaced routes to the recovery UI rather than creating an empty DB. | Relaunch-decision tests |
| N5 | (Regression found in cycle 2) Only a `Failed` result whose code is in `LIVE_DATABASE_DISPLACED_CODES` (`RECOVERY_ATTEMPTS_EXHAUSTED`, `DATABASE_ROLLBACK_FAILED`, `DATABASE_PATH_INVALID`) blocks a fresh start. Deleting the DB deliberately still resets. The dead-letter file is archived on a healthy launch. | Evidence-matrix test. A revert proof turned it red. |
| N6 | No window-less `?` exit in the missing-DB branch | Code review |
| N8 | (Raised as P1 by the Codex PR review; same as the cycle-3 N8) A restore attempted from the displaced-DB screen returned `LIVE_DATABASE_MISSING`, which overwrote the displaced code, so the next launch created an empty DB. `LIVE_DATABASE_MISSING` is now a displaced code: with no live DB, the recovery UI is only reachable when displaced evidence already exists. Not reachable in 1.1.0, because there are no production backups (I1). | `restore_attempt_with_absent_live_database_keeps_displaced_evidence` (end-to-end). A revert proof turned it red. |
| C2 | (Raised as High by the Copilot PR review) `assets` and `schema_version` tables plus a high or current `schema_version` made `run_migrations` skip everything, so a crafted partial database passed validation and replaced the live one. The staged copy must now be at exactly the latest version, with every migrated table's column set equal to a reference schema built from `MIGRATIONS` (`Database::matches_current_schema`); otherwise `BACKUP_SCHEMA_MISMATCH`, before quarantine. | `restore_rejects_spoofed_schema_that_skips_migrations` (versions 99 and 2). A revert proof (check disabled) restored the spoof. |
| C3 | (Copilot, Medium) `to_string_lossy` mangled non-UTF-8 Unix paths in the immutable backup URI. The raw OS bytes are now percent-encoded on Unix. | `validation_accepts_backup_under_non_utf8_directory` (Linux only; APFS and NTFS reject such names) |

### Open (documented, non-blocking)

- **Medium:** M2 (claim lock), M3 (staging sidecars), M5 (absent DB with quarantine; this includes a partial quarantine failure, which returns raw OS text and therefore starts fresh)
- **Low:** L1–L8 from the original review, plus:
  - N2: normal-mode RecoveryScreen when the preflight is `Unavailable` and stale state exists
  - N3: `RecoveryInProgress` is not handled in `App.tsx`
  - N4: backups on UNC paths fail closed
  - N7: the evidence screen lists backups that `restore_backup` rejects with `LIVE_DATABASE_MISSING`
  - N9: archiving the dead-letter file creates `quarantine/`, so `quarantine_exists` is true with no preserved copy
  - N10: if the user deletes the DB while the recovery UI is open and then clicks Restore, the result is `LIVE_DATABASE_MISSING` (now a displaced code), so every launch shows the recovery UI. `request_recovery_restore_inner` does not check that the live DB exists. Needs backups (I1); same root cause as N7
  - C2-a: `matches_current_schema` compares column names only. Types, constraints, indexes, and extra triggers/views/tables are not compared, so a crafted backup with matching names can still carry hostile triggers or weaker constraints. Needs a same-user attacker (residual risk #3)
  - C3-a (Info): the `//?/` strip in `immutable_read_only_uri` should apply only under `cfg(windows)`
- **Info:** I1 (no production backups), I2, I3

### Gate disposition (revised)

Cycle 4 (N8, C2, C3) verdict: PASS, 0 blockers. The TASK-0025 security gate **passes for H1, H2, M1, M4, N1, N5, N8, C2 and C3**: cycle 3 verdict PASS, 0 blockers. TASK-0025 itself stays `in_progress` until the open Medium findings are fixed or accepted in an ADR-0009 amendment.
