# ADR Template

Copy this structure exactly for every ADR written by the `adr-log` skill.
Replace `NNNN` with the zero-padded 4-digit ADR number and `Title` with the
kebab-case-derived title used in the filename.

```markdown
# ADR-NNNN: Title

| Field | Value |
|---|---|
| **Status** | Proposed \| Accepted \| Superseded by NNNN \| Deprecated |
| **Date** | YYYY-MM-DD |
| **Deciders** | Who confirmed this decision (per the Step 5 weight gate) |
| **Phase** | Which IEP build phase (Phase 0–5) this decision applies to |
| **Related rules/features** | Rule IDs and/or FR-xxx feature IDs this touches |
| **Supersedes** | ADR-NNNN, or "None" |

## Context

<!-- The question that triggered this ADR. State which needs-an-ADR
     criterion (1–6) it satisfied. -->

**Trigger:** <!-- e.g. "Extends CSD RST-15 (DB access must go through the
Database struct) to cover a new connection-pooling requirement." -->

**Constraints found:**
- `DOC §x.y` — <!-- what this section says and why it constrains the options -->
- `DOC §x.y` — <!-- ... -->

**Precedent search record:**
- Searched: <!-- exact terms/rule namespaces searched -->
- Searched in: <!-- which docs, and docs/adr/*.md if it existed -->
- Result: <!-- "no precedent found" or a link to the prior ADR(s) found -->

## Options Considered

| Option | Pros | Cons | Conflicts With |
|---|---|---|---|
| Option A | ... | ... | <!-- rule ID / doc section, or "None" --> |
| Option B | ... | ... | ... |
| Option C (optional) | ... | ... | ... |

## Decision

<!-- One imperative statement: "Use X." / "Adopt Y for Z." -->

**Newly proposed rule ID(s), if any** (clearly marked as proposed — do not
imply they already exist in CSD/UI-UX/GREB until those docs are actually
updated):
- `XXX-NN` (proposed) — <!-- rule text -->

## Consequences

**Positive:**
- ...

**Negative:**
- ...

**Follow-ups:**
- Docs to update: <!-- list, handed off to doc-sync — adr-log does not edit these itself -->
- Tests to add: <!-- if any -->
- Tech debt to register: <!-- TD ID / GREB tech-debt issue, if applicable -->

## References

- `DOC §x.y`
- Related ADRs: ADR-NNNN
- Related issues/PRs: <!-- if applicable -->
```
