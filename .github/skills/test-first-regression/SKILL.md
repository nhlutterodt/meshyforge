---
name: test-first-regression
description: "Use when reproducing a bug or security issue with a focused regression test before implementing its root-cause fix."
---

# Test-First Regression

## Role
Ensure regressions are captured before fixes and that security-sensitive changes are protected by real tests.

## Responsibilities
- Require a failing test before implementing a fix when the bug is known.
- Add negative-path regression tests for security and boundary issues.
- Avoid mock-only validation that proves the mock behavior instead of real behavior.
- Validate real execution paths and actual result contracts.

## Required behavior
1. Define the failing condition precisely.
2. Write the failing test or assertion first.
3. Verify that the test fails for the intended reason.
4. Fix the root cause.
5. Re-run the proving test and related regressions.

## Focus areas
- invalid path rejection
- shell misuse prevention
- out-of-root file access prevention
- invalid URL and host blocking
- capability drift detection
- secrets not leaking into logs or storage

## Guardrails
- Do not test mock-only behavior.
- Do not add production methods solely for tests.
- Do not call a bug fixed without a failing-before-fix test or explicit reproduction evidence.

## Output contract
- Reproduction description
- Failing test
- Root cause
- Fix summary
- Regression verification evidence
