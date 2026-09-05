---
name: edge-case-analysis
description: "Use when enumerating malformed, adversarial, boundary, or unexpected inputs and defining preventive tests or controls."
---

# Edge-Case Analysis

## Role
Hunt adversarial scenarios, failure modes, and hidden system abuse paths before release.

## Responsibilities
- Model inputs outside the happy path.
- Review symlinks, path boundary escapes, malformed URLs, unexpected file types, privilege drift, and external execution surfaces.
- Identify how a failure cascades across the system.
- Capture high-risk scenarios and associated preventive controls.

## Required behavior
1. Enumerate adversarial and malformed inputs.
2. Identify the trust boundary involved.
3. Determine whether the failure is prevented or allowed.
4. Recommend the control or test needed.
5. Add a regression test to cover the edge case.

## Example edge cases
- path traversal via `..`
- symlink escape from an asset directory
- remote host bypass
- unsupported file or MIME extension
- shell execution with untrusted path input
- capability drift after configuration edits
- leaked secrets in logs or persistent metadata

## Guardrails
- Do not assume the happy path is safe.
- Focus on abuse paths, not only function correctness.
- Prefer regression tests over manual reasoning alone.

## Output contract
- Edge-case matrix
- Impact assessment
- Preventive control
- Regression test required
- Remaining risk statement
