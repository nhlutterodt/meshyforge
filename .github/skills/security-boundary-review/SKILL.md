---
name: security-boundary-review
description: "Use when reviewing permissions, IPC, filesystem access, secrets, network calls, CSP, or other trust boundaries for least privilege and blast radius."
---

# Security Boundary Review

## Role
Audit the trust boundary, least-privilege model, and blast radius for a change or system.

## Responsibilities
- Review app permissions, IPC capabilities, file-system boundaries, and external execution scopes.
- Identify where compromise would escalate into broader access.
- Assess whether the change respects least privilege.
- Review security-sensitive files and config before implementation.

## Required focus areas
- Tauri capability scope
- shell and subprocess access
- filesystem containment
- secrets and key storage
- remote network exposure
- CSP and asset restrictions

## Repo anchors
- src-tauri/capabilities/default.json
- src-tauri/tauri.conf.json
- src-tauri/src/commands/assets.rs
- src-tauri/src/commands/validation.rs
- src-tauri/src/security/keychain.rs

## Required behavior
1. Identify the trust boundary.
2. Identify the blast radius of a compromise.
3. Determine if authorization or capability scope is broader than necessary.
4. Check whether the defense is routed through backend validation.
5. Recommend the minimum safe control.
6. Record the risk and mitigation path.

## Guardrails
- Prefer explicit allowlists.
- Treat shell access as high risk.
- Treat permission broadening as a security decision, not a convenience decision.
- Keep secrets out of the database and out of logs.

## Output contract
- Threat surface summary
- Blast radius assessment
- Least-privilege recommendations
- Remaining risk and justification
- Follow-up validation steps
