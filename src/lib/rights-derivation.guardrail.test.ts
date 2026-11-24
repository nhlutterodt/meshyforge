// src/lib/rights-derivation.guardrail.test.ts
//
// D-1 / ADR-0018: the rights identifier is derived ONCE, in Rust. The frontend
// renders it and must never recompute it.
//
// This is enforced mechanically rather than by review, because "don't duplicate
// this rule" is precisely the instruction that gets forgotten under deadline.
// The programme has already paid for that lesson twice: the four-vs-five-row
// table drift, and the allowlist nearly being copied into GREB prose. A rule
// protected only by review is protected only until someone is in a hurry.
import { describe, expect, it } from 'vitest';

const SOURCES = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** The one file allowed to name the vocabulary: the type plus the honest default. */
const ALLOWED = 'src/lib/meshy-types.ts';

/** This file must name the identifiers in order to forbid them. */
const SELF = 'src/lib/rights-derivation.guardrail.test.ts';

const IDENTIFIERS = ['LicenseRef-Meshy-Paid-Owned', 'CC-BY-4.0', 'NOASSERTION'];

// `import.meta.glob` keys are relative to THIS file's directory (src/lib), so a
// sibling is `./meshy-types.ts` and everything else is `../…`. Normalising both
// cases explicitly is what makes the path comparisons below trustworthy; the
// first version of this guard silently mapped siblings to `src/…` and would
// have "detected" the one allowed file as an offender.
const SOURCE_DIR = 'src/lib';

const asSourcePath = (globKey: string): string => {
  const slashed = globKey.replace(/\\/g, '/');
  if (slashed.startsWith('../')) return `src/${slashed.slice(3)}`;
  if (slashed.startsWith('./')) return `${SOURCE_DIR}/${slashed.slice(2)}`;
  return slashed.startsWith('src/') ? slashed : `src/${slashed}`;
};

describe('rights derivation lives in Rust only (D-1)', () => {
  it('no file outside meshy-types.ts names a rights identifier', () => {
    const offenders: string[] = [];
    for (const [globKey, content] of Object.entries(SOURCES)) {
      const path = asSourcePath(globKey);
      if (path === ALLOWED || path === SELF) continue;
      for (const identifier of IDENTIFIERS) {
        if (content.includes(identifier)) {
          offenders.push(`${path} mentions ${identifier}`);
        }
      }
    }
    expect(
      offenders,
      `Rights identifiers are derived in Rust (ADR-0018). Recomputation belongs in models.rs, not here: ${offenders.join('; ')}`,
    ).toEqual([]);
  });

  it('actually scanned the tree, rather than passing vacuously', () => {
    // A glob that matches nothing would make the assertion above pass for the
    // wrong reason — the same defect class as a negative test that exits 0.
    const paths = Object.keys(SOURCES).map(asSourcePath);
    expect(paths.length).toBeGreaterThan(100);
    expect(paths).toContain(ALLOWED);
  });
});
