# ADR-0023: User-Confirmed Start-Fresh Recovery with Evidence Quarantine

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-11-24 |
| **Deciders** | Neils (confirmed D1=A after adversarial pass); cline-session-2026-11-24 |
| **Phase** | Phase 5 polish / recovery hardening (TASK-0050 programme) |
| **Related rules/features** | FR-INF-09; ADR-0008 §5; ADR-0009; RST-DB-02/04/05 (proposed); VAL-04, SAN-01, SAN-04 |
| **Supersedes** | None — amends ADR-0008 §5 and ADR-0009's terminal-state clause |

## Context

**Trigger:** the recovery programme's terminal state is a dead-end: with displaced recovery evidence and no restorable backup, every launch shows the recovery screen with no forward path. TASK-0054 (N7/N10) made the dead-end *safe* (doomed restores refused cleanly) but not *escapable*. The owner deferred start-fresh on 2026-10-11 pending an adr-log decision. This satisfies criteria 2 (deviates from ADR-0008 §5 / ADR-0009), 3 (security posture), 5 (resolves the recorded deferral), 6 (data semantics expensive to reverse).

**Constraints found:**
- ADR-0008 §5: "If no backup validates, preserve all evidence and present a sanitized terminal recovery state rather than **silently** creating an empty database." The word *silently* is the hinge: this ADR makes an explicit, consented exception, not a reinterpretation.
- ADR-0009: destructive recovery runs in restart mode with no live SQLite handle (H2/RST-DB-04); one request protocol with bounded attempts; opaque identifiers only (RST-DB-05).
- ADR-0008 §5 last bullet: recovery must not delete or rewrite downloaded asset files.
- LESSONS_LEARNED #3: no server-side workspace-list API — local DB loss is unrecoverable from Meshy's side, so the damaged copy must be preserved, never destroyed.

**Precedent search record:**
- Searched: `terminal recovery state`, `start fresh`, `start-fresh`, `quarantine`, `retention`, `RST-DB`, `empty database`, `RecoveryOperation`, `parse_request`.
- Searched in: `docs/adr/*.md` (through 0022), `docs/governance/task-manifest.yaml`, `docs/security_threat_model.md`, `docs/LESSONS_LEARNED.md`, `src-tauri/src/storage/recovery.rs`, `src-tauri/src/storage/recovery_protocol.rs`, `src-tauri/src/app_state.rs`.
- Result: no prior ADR permits creating a fresh database while recovery evidence exists. Adversarial pass (2026-11-24, brief v0.2.0) found: **D1-F1** — `quarantine_live_database_with_report` (`recovery.rs:115–117`) returns `Ok(None)` before inspecting sidecars when the main DB is absent, so orphaned `-wal`/`-shm` would be replayed onto a fresh DB (M3 class); **D1-F2** — `RecoveryOperation` is `Restore`-only and `parse_request` requires a `backup_id`; **D1-F3** — the only production backup producer is pre-migration (`app_state.rs:47`), so the dead-end is narrower than first drafted but reachable via the N10-class state.

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| A — explicit user-confirmed start-fresh, evidence quarantined first (adopted) | Closes the dead-end class; user agency; evidence preserved; consistent with never-*silently*-replace | Amends two Accepted ADRs; new security-sensitive IPC surface; adversarial tests required | ADR-0008 §5 / ADR-0009 terminal clause — amended explicitly by this ADR |
| B — keep terminal state, document manual file-rename escape | Zero code | Dead-end persists for non-technical users; manual file surgery is what recovery machinery exists to prevent (ENV-01 lesson) | None, but leaves the hazard |
| C — automatic fresh start after N failed attempts | No user action | Reintroduces the exact defect class (M5/N1/N5) the programme removed | ADR-0008 core guarantee — not viable |
## Decision

**Adopt Option A: permit a fresh database over recovery evidence only through an explicit, two-step user-confirmed start-fresh action that quarantines all remaining evidence first, runs in the existing restart-mode protocol, and is never automatic.**

Binding spec (adversarial deltas included):

1. **Protocol extension, not a parallel path.** Add `RecoveryOperation::StartFresh` to the existing request protocol; `parse_request` branches (no backup ID for this operation; attempt ≤ `MAX_ATTEMPTS`). Add a distinct `RecoveryOutcome::StartedFresh` for honest result metadata. Reuse the claim/lock/attempt machinery and the N11 ownership re-check before any destructive step.
2. **Quarantine before create, including orphans (D1-F1).** The quarantine step must sweep orphaned `-wal`, `-shm`, and `-journal` files even when the main database is absent, preserving them with the report. `Ok(None)` (nothing exists to quarantine) means proceed; any `Err` refuses creation with a fixed, retry-safe code. Regression test: absent DB + orphan `-wal` → start-fresh → fresh DB passes `integrity_check`, sidecars preserved in quarantine.
3. **Two-step confirmation, recovery UI only.** The command is registered only in the recovery-UI builder (H2 preserved); the screen requires an explicit second confirmation naming the consequence. No automatic path exists anywhere.
4. **Fresh creation via the normal path.** The fresh database is created through `Database::open` (migrations + integrity validation). Displaced-evidence result/status files are preserved in the quarantine report; result metadata records `StartedFresh`.
5. **Asset files untouched; orphan files are a named consequence.** Downloaded files are never deleted or rewritten (ADR-0008 §5 preserved). Start-fresh produces files-without-rows — the inverse of §5's rows-without-files. The quarantined DB retains the rows, so forensic recovery stays possible. UI copy must state that library history is preserved in the quarantine copy and model files are untouched. Re-import of orphan files is out of scope.
6. **Amendment wording.** ADR-0008 §5's terminal clause and ADR-0009's "terminal recovery state" become: terminal *unless* the user explicitly confirms start-fresh, which preserves all evidence first. The never-*silently*-replace guarantee is unchanged.

**Newly proposed rule ID(s):**
- `RST-DB-06` (proposed) — A fresh database may be created over recovery evidence only via an explicit two-step user confirmation that first quarantines the entire live set, including orphaned sidecars; never automatically.

## Consequences

**Positive:** the M5/N7/N10 dead-end class becomes escapable with user agency; evidence is always preserved; one recovery protocol governs both restore and start-fresh.

**Negative:** a new security-sensitive IPC surface (T2 review mandatory); orphaned asset files consume disk with no rows (existing storage-usage TD applies); the quarantine function — a just-re-reviewed surface — is modified and must re-pass review.

**Follow-ups:**
- Docs to update via doc-sync: amendment notes in ADR-0008/0009; `security_threat_model.md` §10 (N7/N10 closure path); UI/UX recovery-screen spec (start-fresh action + copy); FRD FR-INF-09; test plan storage cases; TDD §6.1/§7.3 (task-log comment + recovery commands).
- Tests to add: D1-F1 orphan-sidecar regression; quarantine-failure refusal (fixed code, retry-safe); double-confirm requirement; no automatic path; `StartFresh` request validation (no backup ID, bounded attempts); `StartedFresh` result metadata; displaced-evidence preservation.
- Implementation: TASK-0055 (T1 build + independent T2 review + revert proofs), queued after TASK-0050 PR-E.
- Tech debt: orphan-file re-import explicitly out of scope; storage-usage byte reporting TD unchanged.

## References

- Related ADRs: ADR-0008 (§5 amended), ADR-0009 (terminal clause amended), ADR-0005
- `docs/governance/grounding/2026-11-24-track2-decision-briefs.md` (v0.2.0, D1 + adversarial pass)
- `src-tauri/src/storage/recovery.rs`, `src-tauri/src/storage/recovery_protocol.rs`, `src-tauri/src/app_state.rs`
- `docs/audits/security-review-task-0025-recovery-2026-10-11.md` (N7/N10/N11; M3/M5 history)
- `docs/security_threat_model.md` §10; `docs/LESSONS_LEARNED.md` #3