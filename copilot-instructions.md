# Copilot Instructions for Secure, Evidence-Driven Delivery

## Mission
Apply a security-first, evidence-first, test-first engineering workflow across all work. This repo is a Tauri desktop app with Rust and TypeScript layers, so all decisions must respect least privilege, trust boundaries, and verification before completion.

## Operating principles
- Security before speed.
- Evidence before completion.
- Least privilege by default.
- Fail before fix when a regression or exploit path is identified.
- Verify with explicit commands and recorded output.
- Treat capability scope, file access, and shell access as security boundaries.
- Convert lessons into reusable guardrails and skills.

## Mandatory workflow for every task
1. Identify the trust boundary and blast radius.
2. Check the official docs for the relevant platform or framework behavior before implementation.
3. Identify the exact files, commands, and dependencies affected.
4. Write the failing test or regression check before the fix.
5. Apply the smallest root-cause fix.
6. Re-run the explicit verification commands and confirm evidence.
7. Record the lesson and update the relevant skill or checklist.

## Repo-specific must-haves
- Tauri capabilities are permissions boundaries; reduce them to the minimum required.
- Treat shell access as high risk and narrow it aggressively.
- Treat file and asset access as containment-sensitive; reject paths outside the asset root.
- Keep secrets in the OS keychain and never in SQLite or logs.
- Respect the official Tauri configuration and capability model. Do not disable CSP protections without a documented and justified reason.

## Security and design guardrails
- Prefer least privilege over convenience.
- Prefer explicit allowlists over broad access.
- Prefer canonical paths and validation over raw user input.
- Prefer negative tests for adversarial failure modes.
- Prefer evidence-backed design decisions over assumptions.

## Required output standard
When executing work, provide:
- scope and risk assessment
- affected files
- dependency map
- validation criteria
- exact proving commands
- evidence summary
- lessons captured for future reuse

## Reusable AI skill framing
This repo is a model for a reusable multi-agent security and delivery workflow:
- Orchestrator: sequencing, dependency awareness, risk prioritization
- Security: blast radius, least privilege, trust boundaries
- Validation: evidence, proof, gatekeeping
- Test-first: failing regression before fix
- Edge-case: adversarial scenarios and failure modes
- Feedback and hardening: convert lessons into durable guardrails
