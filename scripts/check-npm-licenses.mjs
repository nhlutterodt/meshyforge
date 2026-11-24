#!/usr/bin/env node
// scripts/check-npm-licenses.mjs — the npm half of DEP-06 (ADR-0017).
//
// The allowlist is READ FROM deny.toml, not duplicated here. Two copies of a
// policy is the drift class this repo keeps paying for (LM-01's identifier,
// DEP-06's two halves); one file means the Rust gate and the npm gate cannot
// disagree about what "allowed" means.
//
// `license-checker --onlyAllow` is deliberately NOT used. It is a fail-fast
// string comparison: two runs over the same tree stopped on different packages
// (TASK-0038), so it can never enumerate offenders. This script reads --json and
// evaluates every package, so one run reports every violation.
//
// Usage: node scripts/check-npm-licenses.mjs    (exit 1 on any violation)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateExpression, identifiersIn } from './lib/spdx.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DENY_TOML = join(ROOT, 'deny.toml');

// A dependency that declares NO licence is a failure (DEP-11). An entry here
// does not make it compliant — it records that the unknown has been looked at
// and could not be resolved, so the gate can run while the unknown stays
// visible. Every entry prints on success and on failure.
const UNDECLARED_EXCEPTIONS = new Map([
  [
    'webgl-constants@1.1.1',
    'license-checker reports MIT* — an INFERENCE from the package contents, not ' +
      'a declared licence field, and the package carries no repository URL, so ' +
      'there is nothing upstream to verify against (npm view: license empty, ' +
      'repository.url empty). Transitive runtime dependency of three. ' +
      'Status is UNKNOWN, not MIT.',
  ],
]);

/** `MIT*` and friends are license-checker inferences, not declarations. */
function isInferred(expression) {
  return typeof expression === 'string' && expression.trim().endsWith('*');
}

function readAllowlist() {
  const source = readFileSync(DENY_TOML, 'utf8');
  const match = source.match(/allow\s*=\s*\[([\s\S]*?)\]/);
  if (!match) {
    throw new Error(`No allowlist found in ${DENY_TOML}`);
  }
  return new Set([...match[1].matchAll(/"([^"]+)"/g)].map((entry) => entry[1]));
}

// The evaluator's own fixtures, run on EVERY invocation. A gate whose parser is
// broken is worse than no gate: it reports compliance it never checked. The
// `MIT AND GPL-3.0` row is the discriminator — a flat split on the operators
// would call it satisfied on the strength of MIT alone.
const FIXTURES = [
  ['MIT OR Apache-2.0', true, 'a disjunct satisfies'],
  ['MIT/Apache-2.0', true, 'npm slash disjunction'],
  ['MIT AND GPL-3.0', false, 'AND requires BOTH, not either'],
  ['(MIT OR Apache-2.0) AND GPL-3.0', false, 'parenthesised AND'],
  ['(MIT OR Apache-2.0) AND Unicode-3.0', true, 'both sides allowed'],
  ['MPL-2.0', false, 'per-crate exception is not a global allowance'],
  ['Apache-2.0 WITH LLVM-exception', true, 'WITH is part of the identifier'],
  ['', false, 'nothing declared'],
  ['MIT OR (', false, 'unparseable is a failure'],
];

function assertEvaluatorFixtures(allowlist) {
  const failed = FIXTURES.filter(
    ([expression, expected]) =>
      evaluateExpression(expression, (id) => allowlist.has(id)).satisfied !== expected,
  );
  if (failed.length > 0) {
    console.error('The SPDX evaluator is broken; refusing to report a verdict.');
    for (const [expression, expected, why] of failed) {
      console.error(`  ${JSON.stringify(expression)}: expected ${expected} (${why})`);
    }
    process.exit(2);
  }
}

function readNpmLicences() {
  const output = execFileSync(
    'npm',
    ['exec', '--yes', '--', 'license-checker', '--production', '--json'],
    { cwd: ROOT, encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(output);
}

const allowlist = readAllowlist();
assertEvaluatorFixtures(allowlist);
const packages = readNpmLicences();
const project = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const SELF = `${project.name}@${project.version}`;

const violations = [];
const exceptionsSeen = [];

for (const [name, metadata] of Object.entries(packages)) {
  // Our own package. `UNLICENSED` is the correct declaration for a private
  // package and says nothing about the licences of the code we ship.
  if (name === SELF) continue;

  const declared = metadata.licenses;

  // license-checker returns an array when it finds several licence files. That
  // means several licences apply, so every one must be allowed — treated as AND
  // rather than guessed as OR.
  const expressions = Array.isArray(declared) ? declared : [declared];
  const declaredText = expressions
    .filter((expression) => typeof expression === 'string' && expression.trim())
    .join(' ');

  // DEP-11: an inference is not a declaration. `MIT*` means license-checker
  // guessed from the package contents — which is precisely the "unknown
  // presented as known" that DEP-11 exists to forbid.
  const hasDeclaration = declaredText.length > 0 && !expressions.some(isInferred);

  if (!hasDeclaration) {
    if (UNDECLARED_EXCEPTIONS.has(name)) {
      exceptionsSeen.push(name);
      continue;
    }
    violations.push({
      name,
      reason: declaredText
        ? `only an inferred licence (${declaredText}), not a declared one (DEP-11)`
        : 'declares no licence (DEP-11) and has no recorded exception',
      declared: declaredText || '(none)',
    });
    continue;
  }

  for (const expression of expressions) {
    const { satisfied, error } = evaluateExpression(expression, (id) => allowlist.has(id));
    if (!satisfied) {
      violations.push({
        name,
        reason: error ?? 'no allowlisted disjunct',
        declared: expression,
        identifiers: identifiersIn(expression),
      });
    }
  }
}

if (exceptionsSeen.length > 0) {
  console.log('Recorded undeclared-licence exceptions (DEP-11):');
  for (const name of exceptionsSeen) {
    console.log(`  - ${name}: ${UNDECLARED_EXCEPTIONS.get(name)}`);
  }
}

if (violations.length === 0) {
  console.log(
    `npm licences OK: ${Object.keys(packages).length} production packages checked against deny.toml.`,
  );
  process.exit(0);
}

console.error(`npm licence violations: ${violations.length}`);
for (const violation of violations) {
  console.error(`\n  ${violation.name}`);
  console.error(`    declared: ${violation.declared}`);
  console.error(`    reason:   ${violation.reason}`);
  if (violation.identifiers?.length) {
    console.error(`    identifiers: ${violation.identifiers.join(', ')}`);
  }
}
console.error(
  '\nFix: replace the dependency, or amend deny.toml together with ADR-0017.\n' +
    'Widening the allowlist is a recorded decision, not a reflex.',
);
process.exit(1);
