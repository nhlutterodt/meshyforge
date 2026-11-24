# Track 2 Decision Briefs — D1 (start-fresh amendment) & D2 (polling-audit retention)

| Field | Value |
|---|---|
| **Document** | Track 2 decision briefs (D1, D2) |
| **Version** | 0.2.0 |
| **Date** | 2026-11-24 |
| **Status** | **CONFIRMED — owner accepted D1=A and D2=A (2026-11-24), subject to an adversarial pass; pass executed and deltas absorbed below. D1 recorded as ADR-0023; D2 lands as ledger D-023 + the Clarification comment fix.** |
| **Changelog** | 0.1.0 draft → 0.2.0: owner confirmation recorded; adversarial findings D1-F1…F5 / D2-F1…F4 absorbed into the option specs (DOC-10). |
| **Author** | cline-session-2026-11-24 (T2 drafting; T3 confirmation reserved to the owner) |
| **Governed by** | ADR-0005, the adr-log skill, TASK-0050's register |

On confirmation: D1 → a new ADR (next free number 0023) amending ADR-0008/0009, written via adr-log; D2 → a ledger decision (D-022) plus the Clarification-class comment fix if option A, or an ADR amendment if B/C.

## D1 — User-confirmed "start fresh, keep the damaged copy"

### Classification

**Security** (recovery posture; amends two Accepted ADRs). Needs-ADR criteria fired: 2 (deviates from ADR-0008 §5 and ADR-0009's decision), 5 (resolves the contradiction recorded when the owner deferred it 2026-10-11), 6 (data semantics expensive to reverse).

### Precedent-search record

Searched: `terminal recovery state`, `start fresh`, `start-fresh`, `retention`, `rotate`, `quarantine`, `RST-DB`, `empty database`. Files: `docs/adr/0008*`, `docs/adr/0009*`, `docs/governance/task-manifest.yaml`, `src-tauri/src/storage/recovery.rs`, `src-tauri/src/storage/database.rs`, `src-tauri/migrations/001_initial.sql`, `docs/security_threat_model.md`, `docs/LESSONS_LEARNED.md`, `docs/audits/e2e-ui-qa-2026-11-08.md`.

Found:
- **ADR-0008 §5 (line 69), verbatim:** "If no backup validates, preserve all evidence and present a sanitized terminal recovery state rather than silently creating an empty database." Note the word *silently* — the amendment below makes an explicit exception, it does not reinterpret the clause.
- **ADR-0009 decision (line 60):** "Refuse replacement when no candidate validates, preserving quarantine evidence and returning a terminal recovery state."
- **Ledger 2026-10-11 (TASK-0025):** START-FRESH DEFERRED by the owner; reopening requires an adr-log decision amending ADR-0008/0009.
- **TASK-0054 (2026-11-24):** N7/N10 guardrails landed — doomed restarts are now refused cleanly, but the dead-end itself (no live DB + no restorable backup) remains by design.
- **LESSONS_LEARNED #3:** there is no server-side workspace-list API; local DB loss is unrecoverable from Meshy's side. A start-fresh must therefore preserve the damaged copy, not destroy it.
- No prior ADR permits creating a fresh database while recovery evidence exists.

### Context (file:line evidence)

- `lib.rs` `missing_database_has_recovery_evidence` gates a fresh start on displaced-DB failure codes; with no live DB and a displaced result, every launch shows the recovery screen.
- With I1 closed (production pre-migration backups exist since 2026-10-11), a user can reach: corrupt DB → recovery screen → every backup fails validation (or the DB is deleted while the UI is open) → permanent recovery screen. TASK-0054's N10 precheck refuses the doomed restore, but there is no forward path.
- **Reachability, tightened (D1-F3):** the only production backup producer is `app_state.rs:47` — pre-migration only, no schedule. Post-TASK-0054 the dead-end requires *displaced evidence + no restorable backup* (split-quarantine states such as `QUARANTINE_ROLLBACK_FAILED`, deleted backups). Narrower than first drafted, but reachable without any backup failure via the N10-class state; the recommendation stands on that.
- The ENV-01 lesson (e2e QA audit §4): a non-technical user facing a silently dead app has no recourse. A terminal screen with no action is the same trap in a different costume.

### Options

**A — Amend ADR-0008/0009: explicit, user-confirmed start-fresh (recommended).**
A new recovery action, distinct from restore: two-step confirmation in the recovery UI; quarantines whatever remains of the live set (db/`-wal`/`-shm`/`-journal`) with a report BEFORE creating a fresh database; refuses to create if quarantine fails (fixed code, retry-safe); never automatic; downloaded asset files untouched (ADR-0008 §5's last bullet preserved). Amendment teeth: "terminal recovery state" becomes "terminal *unless* the user explicitly confirms start-fresh, which preserves all evidence first". New IPC command registered only in the recovery-UI builder (ADR-0009's H2 invariant preserved), both sides per GREB PR-05.

**Adversarial spec deltas (0.2.0, binding on the implementation):**
- **D1-F1 (defect found):** `quarantine_live_database_with_report` (`recovery.rs:115–117`) returns `Ok(None)` *before* looking at sidecars when the main DB is absent — orphaned `-wal`/`-shm` in exactly the target state would be replayed onto the fresh DB (M3 class). Start-fresh MUST sweep orphaned sidecars (and `-journal`) even when the main DB is absent; regression test required.
- **D1-F2 (protocol fit):** `RecoveryOperation` is `Restore`-only and `parse_request` requires a valid `backup_id` (`recovery_protocol.rs:230–280`). Spec must add `RecoveryOperation::StartFresh` with branched validation (no backup ID), a distinct `RecoveryOutcome::StartedFresh`, and REUSE of the claim/lock/attempt machinery (`MAX_ATTEMPTS=1`, N11 ownership re-check) — one protocol, not a parallel path. `Ok(None)` (nothing to quarantine) = proceed; `Err` = refuse.
- **D1-F4 (named consequence):** start-fresh creates files-without-rows (the inverse of ADR-0008 §5's rows-without-files). Quarantined DB retains the rows; UI copy must say library history is preserved in the quarantine copy and model files are untouched. Re-import is out of scope.
- **D1-F5 (rejected variant):** "A-lite" — clearing displaced-evidence files from the recovery screen and letting normal launch create the DB — bypasses ADR-0009's single-protocol invariant. Rejected; recorded so it is not re-proposed as a simplification.
- Pros: closes the M5/N7/N10 dead-end class; user agency; evidence preserved; consistent with the never-*silently*-replace intent.
- Cons: amends two Accepted ADRs (T3 gate); a new security-sensitive IPC surface; adversarial tests required (quarantine-failure refusal, double-confirm, no automatic path, displaced-evidence preservation).
- Constraints touched: ADR-0008 §5, ADR-0009 decision; proposed RST-DB-02/03; UI/UX recovery-screen spec; FRD FR-INF-09.

**B — Keep the terminal state; document a manual escape.**
Recovery-screen copy + a support doc explain manual file rename/delete.
- Pros: zero code, no amendment.
- Cons: the dead-end persists for non-technical users; manual file surgery is exactly what the recovery machinery exists to prevent; an ENV-01-class support trap.

**C — Automatic fresh start after N failed attempts (rejected; listed for completeness).**
Violates ADR-0008's core guarantee and the M5/N1/N5 remediation history — automatic empty replacement is the defect class this programme removed. Not viable.

### Recommendation

**A.** The guardrails made the dead-end *safe* but not *escapable*; only an explicit, evidence-preserving user action closes it without weakening the never-silently-replace guarantee.

### On acceptance (handoff payload)

ADR-0023 (amends 0008/0009) via adr-log; doc-sync against it: amendment notes in both ADRs, security_threat_model §10 register (N7/N10 closure path), UI/UX recovery-screen spec, FRD FR-INF-09, test plan storage cases; implementation task with T1 build + independent T2 review + revert proofs per the team charter.

## D2 — Polling-audit retention + the 001:34 comment disposition

### Classification

The comment fix is **Clarification** (the code's reality was already decided by D-021: create-only audit). Any choice to audit polling extends ADR-0008's audit-lifecycle decision → **Contract** class, requiring an amendment or new ADR.

### Precedent-search record

Searched: `retention`, `task_log`, `polling`, `MAX_TASK_LOG_RESPONSE_BYTES`, `audit`. Files: `src-tauri/src/storage/database.rs` (lines 212–216, 848–852), `src-tauri/migrations/001_initial.sql:34`, `docs/adr/0008*` (§2/§3 audit lifecycle, proposed RST-DB-03), ledger D-021 notes (2026-11-23).

Found:
- **001_initial.sql:34, verbatim:** "Task log: every API call (successful or not), for audit/debugging" — contradicts the create-only reality.
- **database.rs:212–215:** the 4 KiB response cap "is sized for CREATE… must be revisited if polling is ever audited — that is a retention decision carried by TASK-0050, not a field addition."
- **database.rs:848–851:** `log_task_create` is the sole production `task_log` writer; polling is not audited at all.
- **ADR-0008 §2/§3:** bounded, redacted audit lifecycle; RST-DB-03 (proposed) bounds persisted audit data.

### Options

**A — Keep create-only audit; correct the comment (recommended).**
001:34 becomes: "Task log: successful task-CREATE calls (best-effort; request + HTTP envelope), for audit/debugging. Polling is not audited — see the TASK-0050 retention decision." Comment-only change inside an applied migration file: the SQL is byte-identical, `include_str!` content changes but `run_migrations` never re-applies an applied version (version comparison only, no checksums — verified `database.rs:53–55`), and the C2-a schema check compares structure, not comments. Record the correction in the ledger.
- Pros: honest comment, zero row growth, matches D-021 and the existing cap sizing.
- Cons: no task-lifecycle audit (explicitly accepted).
- **D2-F2 (wording verified):** `api.rs:131` logs only after a successful create, via `let _ =` (best-effort, failures swallowed) — hence "best-effort" in the wording.
- **D2-F4 (rejected alternative):** leaving 001 untouched and adding a correction note elsewhere was considered — rejected: it leaves the false claim at the source. The migration skill's "add a new migration" rule governs *schema* corrections, not comments.

**B — Audit terminal transitions only (SUCCEEDED/FAILED/CANCELED).**
One row per task outcome, bounded by task count rather than poll frequency. Extends ADR-0008's audit contract → amendment; the 4 KiB cap must be revisited for terminal payloads.
- Pros: request-level lifecycle evidence with bounded growth.
- Cons: new writer + retention rule + ADR work; **D2-F3: marginal value is lower than first drafted — the `assets` table already persists the lifecycle** (`update_task_status` writes status/progress/timestamps/credits; `error_message` exists). B would duplicate existing data; `task_log`'s unique value is request-level evidence.

**C — Full polling audit with rotation.** Rejected for now: growth scales with poll frequency × active tasks; needs rotation machinery; little marginal value over B.

### Recommendation

**A now** (Clarification; lands once the owner confirms the wording). B remains available if lifecycle audit is ever wanted. Per the ledger, the 001:34 comment disposition rides with this decision.

## Confirmation record (adr-log Step 5)

- **2026-11-24, owner:** "recommendations accepted" — **D1=A, D2=A** — "but adversarial pass on them as well as evidence based iteration."
- **Adversarial pass executed same day** (read-only, primary-source): findings D1-F1…F5 and D2-F1…F4 above; both recommendations survived, D1's spec tightened (F1 is a real defect the implementation must close). Deltas are spec refinement *within* the confirmed direction, not a new decision.
- **Disposition:** D1 → ADR-0023 (Accepted, amends ADR-0008 §5 / ADR-0009); implementation filed as TASK-0055 (T1 build + independent T2 review + revert proofs; queued after TASK-0050 PR-E). D2 → ledger D-023 + the 001:34 comment fix (Clarification). Numbering note: D-022 was already taken by the C2-a schema-depth decision (2026-11-24T02:20Z), and TASK-0054 is the highest existing task — hence D-023/TASK-0055, not the D-022/TASK-0056 first drafted. W2 (PR-B→C→D→E) proceeds independently.