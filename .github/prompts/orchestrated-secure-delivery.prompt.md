---
name: orchestrated-secure-delivery
description: "Run a multi-stage, evidence-first secure delivery workflow for a security-sensitive implementation or remediation task."
agent: secure-delivery-agent
---

# Orchestrated Secure Delivery Prompt

Use this workflow for security-sensitive or high-trust-boundary engineering work.

## Required sequence
1. Orchestrator: identify objective, affected files, dependencies, and blast radius.
2. Security Boundary Review: classify trust boundaries, permissions, network and file exposure.
3. Validation Gate: define the exact proving commands and evidence needed.
4. Test-First Regression: create or identify the failing regression before implementing a fix.
5. Edge-Case Analysis: enumerate adversarial and malformed inputs.
6. Implement the minimal root-cause fix.
7. Re-run proving commands and regression tests.
8. Feedback and Hardening: capture lessons and fold them into updated guardrails and skill definitions.

## Required outputs
- risk summary
- affected files
- dependency map
- failing test or repro
- minimal fix summary
- verification evidence
- lessons learned

## Reject conditions
- No evidence before completion
- No fail-before-fix test for a known bug
- No least-privilege review for privileged paths
- No recorded learning update after the fix
