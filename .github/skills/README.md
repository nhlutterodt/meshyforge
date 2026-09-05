# AI Skills Pack

This directory contains a reusable multi-agent skill set for secure, evidence-driven engineering.

## Included skills
- orchestrator
- security-boundary-review
- verification-gate
- test-first-regression
- edge-case-analysis
- feedback-hardening

## Use
Each skill is a specialized responsibility. The orchestrator coordinates them. Security, validation, and testing work as gates before completion.

## Quality bar
- Evidence before completion
- Fail before fix for security and regression cases
- Keep blast radius small
- Prefer least privilege and explicit validation
- Convert failures into reusable guardrails

## Proven example
The signed-download origin boundary exercises the full workflow. The provider
allowlist accepts only HTTPS URLs for `assets.meshy.ai`; tests cover normal
URLs, deceptive hostnames, and redirect refusal. Validate it with:

```powershell
Set-Location src-tauri
cargo test download -- --nocapture
```
