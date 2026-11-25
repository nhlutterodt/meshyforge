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

- **Medium:** M2 (claim lock), M3 (staging sidecars), M5 (absent DB with quarantine; this includes a partial quarantine failure, which returns raw OS text and therefore starts fresh) — *all three closed 2026-11-24; see §8. This list is the 2026-10-11 record and is left intact.*
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

## 8. Addendum — Medium findings closed (2026-11-24)

All three open Medium findings are now fixed, so §6's closure condition ("M2, M3
and M5 fixed or explicitly accepted in an ADR-0009 amendment") is met **by fixes**,
with no ADR amendment required.

This addendum records the implementation and its evidence. It is **not** a
reviewer verdict: no independent re-review scoped to M2 has been run, and this
programme's own history (N1 and N5 were caught only by the T2 reviewer, not the
T1 builder) is the reason not to self-declare that gate closed.

| Finding | Fix | Evidence |
|---|---|---|
| M3 | `remove_stale_staging_file` removes the whole staging set (db, `-wal`, `-shm`) or fails closed on a non-file. | `stale_staging_sidecars_are_removed_with_the_staging_database` |
| M5 | The quarantine entry and rollback paths return fixed codes (`QUARANTINE_FAILED`, `QUARANTINE_ROLLBACK_FAILED`) instead of raw OS text. The latter is in `LIVE_DATABASE_DISPLACED_CODES`, so a split live set is owned by the recovery UI rather than treated as "no evidence". | `quarantine_failure_returns_a_fixed_code_not_os_text`; the displaced-code matrix test covers the new code by construction |
| M2 | An exclusive lock file (`recovery/restore.lock`, created `O_CREAT\|O_EXCL`) held for the whole attempt makes the claim atomic, and each restore stages under a per-attempt name. | `concurrent_recovery_attempts_produce_exactly_one_winner` — **a revert proof with the lock disabled produced two winners**, reproducing the race §5 listed under "Not performed" |

### M2 design notes worth keeping

- **Loser behaviour.** A process that cannot take the lock exits without writing
  a result, retiring the request, or opening a window. Any of those would clobber
  the winner's outcome.
- **Abandonment.** A killed process cannot run its `Drop`, so a lock older than
  `LOCK_STEAL_AFTER_MILLIS` (60s) is stealable and an unparseable one is treated as
  abandoned rather than permanent. Age falls back to the file's mtime because
  `create_new` and the write are two steps, so a racing process can observe a
  still-empty file; judging that by content alone would steal a live lock.
- **A stale owner must not unlock its replacement.** The guard records an owner
  token and removes only a lock it still owns. Without this, a slow attempt
  judged abandoned would delete the *new* owner's lock on its way out — a defect
  introduced by the fix itself, caught while writing the tests.
- **The sweep is age-gated.** Per-attempt names mean a crashed run's staging file
  is never re-named, so it must be swept; but an unconditional sweep would delete
  a *live* concurrent restore's staging file, introducing a new race. Only the
  legacy fixed name is swept unconditionally, because no current code path can
  produce it.
- **A leak the fixed name used to hide.** `checkpoint_staged_database(...)?`
  returned early without removing the staging file. A `Drop` guard now owns
  cleanup on every exit path, rather than per-branch removal that misses one.

### Still open, deliberately

L1–L8, N2–N4, N7, N9, N10, C2-a, C3-a and I2/I3 are **not** addressed here and
remain under TASK-0050. In particular L1 (14 raw `map_err(|error| error.to_string())`
sites in `recovery.rs`) is a different defect class from M5 and was not swept in.

## 9. Addendum — Independent T2 re-review of M2/M3/M5 (2026-11-24, TASK-0051)

| Field | Value |
|---|---|
| **Reviewer** | Independent T2 session (`cline-session-2026-11-24`), no participation in the fixes |
| **Git HEAD** | `fa89c50` (frontend-only commit after the 2026-11-24 gate run; Rust source identical to `7f1ea99`) |
| **Scope** | M2, M3, M5 only, per §6's closure condition. Full read of `storage/recovery.rs`, `storage/recovery_protocol.rs`, `lib.rs` process modes + tests, `commands/recovery.rs` |
| **Gates re-run** | `cargo fmt --check` exit 0; `cargo clippy --all-targets -D warnings` exit 0; `cargo test --lib` **424 passed, 0 failed, 5 ignored** (includes all 10 M2-batch tests, the M3 sidecar test, the M5 fixed-code test and the displaced-code matrix test) |
| **Verdict** | **PASS, 0 blockers.** §6's closure condition is met by fixes. TASK-0025 may close. Three new non-blocking observations (N11–N13) route to TASK-0050. |

### Per-finding verdicts

| # | Verdict | Evidence verified against source |
|---|---|---|
| M2 | **PASS** | Lock held for the WHOLE attempt incl. the claim (`lib.rs:218-232`); loser exits without writing a result, retiring the request or opening a window (`lib.rs:225-228`); `O_CREAT\|O_EXCL` creation (`recovery_protocol.rs:106-109`); owner-token Drop releases only a lock it still owns (`63-75`); mtime fallback for the empty-lock race (`118-127`); age-gated steal then re-create (`151-158`); per-attempt staging names (`recovery.rs:374-377`); `concurrent_recovery_attempts_produce_exactly_one_winner` (`lib.rs:725-767`) passes, revert proof recorded in §8 |
| M3 | **PASS** | `remove_stale_staging_file` removes db/`-wal`/`-shm` or fails closed with fixed codes (`recovery.rs:459-478`); sweep is age-gated on the lock window, skips `keep`, legacy fixed name unconditional (`424-457`); `stale_staging_sidecars_are_removed_with_the_staging_database` and `abandoned_staging_sets_are_swept_but_a_live_one_is_not` pass |
| M5 | **PASS** | Quarantine entry failure → `QUARANTINE_FAILED` (`recovery.rs:113`); rollback tracks its own success → `QUARANTINE_FAILED` (intact, retry safe) / `QUARANTINE_ROLLBACK_FAILED` (split set) (`140-161`); the latter is in `LIVE_DATABASE_DISPLACED_CODES` (`lib.rs:270`) and the matrix test iterates the constant (`lib.rs:659-662`), so coverage is by construction; `quarantine_failure_returns_a_fixed_code_not_os_text` passes |

### Adversarial attacks performed

1. **Stale owner unlocks its replacement** — refuted by the owner token (pid, stamp, nonce); test `releasing_a_stolen_lock_does_not_unlock_its_new_owner` passes.
2. **Empty lock stolen as corrupt** — refuted by the mtime fallback; test `a_just_created_empty_lock_is_not_mistaken_for_an_abandoned_one` passes.
3. **Sweep deletes a live concurrent staging file** — refuted by the age gate + `keep` skip; test passes. Residual: the sweep ignores removal errors (`let _`), which only strands a file the next sweep retries — no corruption path.
4. **Drop-guard leak on `?` paths** — refuted: `StagedRestore` is declared before the connection so it drops after the handle closes (Windows-safe), and `a_rejected_restore_leaves_no_staging_set_behind` exercises the checkpoint/schema-mismatch exit.
5. **New displaced code skips behavioural coverage** — refuted by the matrix test iterating `LIVE_DATABASE_DISPLACED_CODES`.
6. **Lock-steal interleaving (>60s attempt)** — **NOT fully refuted → N11 below.**
7. **`write_all` failure after `create_new`** — leaves an empty lock → N12 below (self-healing).
8. **Future-stamped lock** — not stealable until the clock catches up → N13 below.

### New observations (non-blocking; routed to TASK-0050)

| # | Sev | Title | Evidence | Fix direction |
|---|---|---|---|---|
| N11 | Low | A stolen-lock loser does not re-validate ownership before the destructive step | `restore_backup` (`recovery.rs:187-233`) never re-checks the lock after acquisition. If attempt A runs >60s and B steals the lock, A can reach `quarantine_live_database_with_report` AFTER B's rename and quarantine B's restored DB, then restore a second backup — or write a `Failed` result while B is still running. §8's claim "the loser … fails closed with LIVE_DATABASE_MISSING" holds only for interleavings where the loser reaches quarantine after the winner's rename; it is not guaranteed for all. No data loss (quarantine preserves every displaced set), and it requires a >60s attempt plus a concurrent launch — far above a typical sub-second restore | Re-read and compare the owner token immediately before `quarantine_live_database_with_report`; abort with a fixed code (e.g. `RECOVERY_LOCK_LOST`) when ownership was lost. Nothing has moved at that point, so the code is retry-safe and does NOT belong in the displaced set |
| N12 | Info | Failed lock write leaves an empty lock for up to 60s | `write_new_lock` (`recovery_protocol.rs:98-112`): `create_new` succeeds, `write_all` fails → `Err` → no guard constructed, empty file remains. The mtime fallback makes it stealable after the window, so it self-heals | Optional: remove the file on the write-failure path |
| N13 | Info | Parseable lock with a future `acquired_at` is never judged abandoned | `lock_age_millis` prefers the recorded stamp; `saturating_sub` yields age 0 for a future stamp. Staging's `is_older_than` explicitly refuses to judge future stamps ("cannot tell must not delete"); the lock path has no equivalent. Clock rollback or same-user tampering (residual risk 3) strands the lock until the clock catches up | Treat a future stamp like an unparseable lock (mtime fallback), mirroring `is_older_than`'s conservatism |

### Rule categories checked within scope

- **SAN-01**: the M5 paths return fixed codes; the remaining raw `to_string()` sites in `recovery.rs` are L1's documented scope (TASK-0050), not M5 regressions. `retire_request`/`write_atomic`/result writes carry no paths or secrets.
- **VAL-04**: backup-ID containment (`is_valid_backup_id` + canonicalized parent check) unchanged and sound; traversal/ADS/UNC cases covered by existing tests.
- **SEC / VAL-06 / CSP**: no applicable change in this scope (no key handling, SQL, or capability edits since §7's review).

### Gate disposition (final)

§6's closure condition — "M2, M3 and M5 fixed or explicitly accepted in an
ADR-0009 amendment" — is met **by fixes**, verified independently. **TASK-0025
closes.** N11–N13 join the TASK-0050 register alongside the still-open
L1–L8, N2–N4, N7, N9, N10, C3-a, I2, I3 items; none blocks this verdict.

## 10. W1/W2 wave-gate audit (2026-11-24)

**Scope:** W1 recovery guardrails (TASK-0054: N7/N10/N11/N12/N13) and the W2 serial
PRs B (I3), C (L1/L8/C3-a), D (L2/L6/L7) — commits `de5460f`..`cb40586`.

**Independence limitation (charter):** conducted by the same session that built
B/C/D, so this is a rigorous self-audit, not an independent one. A fresh-session
confirmation remains the recommended gate before merge to main.

### Attacks refuted by primary source — PASS

1. **I3 removal clean:** zero production references to `recover` /
   `restore_latest_valid` / `valid_backups` (grep); `restore_backup` is the sole
   restore path.
2. **Unique quarantine IDs:** `ts + pid + per-call seq`; no numeric parser of the
   ID exists; clock rollback is safe because the sequence is monotonic.
3. **L1 classification sound:** `LIVE_DATABASE_DISPLACED_CODES` (`lib.rs:256`)
   unchanged; all 12 new codes are backup/rotation/validation/clock paths that run
   BEFORE any quarantine, so all are retry-safe and none is displaced.
   `BACKUP_INTEGRITY_CHECK_FAILED` reused in restore staging is pre-quarantine.
4. **L8 safe for legit and future requests:** a normal request is ~70 bytes ≪ the
   1 KiB cap; `deny_unknown_fields` rejects unknown *fields*, not enum variants, so
   ADR-0023's `StartFresh` is not pre-broken.
5. **C3-a no Windows regression:** the `cfg(windows)` strip is identical to the
   prior behavior; Unix no longer strips a real `//?/` directory.
6. **L6 symmetric:** quarantine, rollback, and staging sweep all include
   `-journal`; the orphan mode (`include_main=false`) is unit-tested; the
   absent-main early return is preserved (restore semantics unchanged).
7. **L2 does not truncate:** `OpenOptions.write(true)` has no `.truncate(true)`,
   so the staged content is preserved; the Windows write-handle fix is correct
   (FlushFileBuffers needs write access). This was the sharpest attack.
8. **L7 symlink/junction rejected** via `symlink_metadata` before `canonicalize`.
9. **W1 wiring intact:** `ownership_checker` / `with_lock_check` (N11) and the N7
   flag survive W2 unchanged.

### New observations (non-blocking; routed to TASK-0050)

| # | Sev | Title | Evidence | Disposition |
|---|---|---|---|---|
| A1-O1 | Info | L2 flushes file content but not directory-entry durability | `sync_file_contents` fsyncs the file before rename; ext4 rename durability also needs a dir fsync (NTFS journals metadata) | Primary torn-file hole closed; accept as residual or follow-up |
| A1-O2 | Info | L7 does not reject hard links | only symlinks/reparse points flagged; a same-user hard link to a crafted valid-schema DB inside `backups/` equals writing the file directly (residual risk 3) | No threat expansion; accepted residual |
| A1-O3 | Info | I2 listing still unvalidated | `commands/recovery.rs:80` filters via `backup_path` (now symlink-safe) but not `validate_backup_candidate`; a non-SQLite `backup-N.db` still lists | Fixed in PR-E |
| A1-O4 | Limitation | L7/L2 proof coverage | L7 behavioral revert proof runs on Unix CI (this Windows host lacks symlink privilege); L2 durability not crash-injection-tested | Recorded |
| A1-O5 | Info | New codes vs frontend IPC guardrail | PR-C/D added `BACKUP_*`/`RECOVERY_*` codes and ran only Rust gates; the IPC-contract guardrail exempts that family but must be re-run | PR-E full frontend battery confirms |

### Verdict

**PASS, 0 blockers.** W1 recovery guardrails and W2 B/C/D withstand the attacks;
the displaced-code set is unchanged and no new data-loss or dead-end path was
found. A1-O1/O2 join the register as accepted residuals, A1-O3/O5 are closed by
PR-E, A1-O4 is recorded. The quarantine function was modified (L6) and must be
re-reviewed alongside TASK-0055. Fresh-session confirmation still recommended
before merge to main.
