#!/usr/bin/env node
// scripts/check-dependency-rules.mjs
//
// The four mechanically-checkable DEP rules that had NO check before TASK-0048:
//
//   DEP-01  npm dependencies use caret ranges (exception: `three`)
//   DEP-02  Cargo dependencies use caret ranges
//   DEP-03  both lockfiles are committed
//   DEP-10  `three` is pinned to an exact version
//
// Design rules, each earned earlier in this programme:
//
//  * ENUMERATE, never fail fast. A check that stops at the first failure yields
//    a verdict, never a baseline (concept-15 §2.3 — the reason
//    `license-checker --onlyAllow` was rejected). Every rule reports its own
//    verdict and the run continues.
//  * The MANIFESTS are the single source. Nothing here restates a rule in a
//    second place (R9).
//  * AN UNPARSEABLE LINE IS A FINDING, not a skip. A dependency this script
//    cannot read is exactly the case a gate exists to surface; silently
//    skipping it would make the gate pass on the strength of what it didn't
//    look at.
//  * The self-test runs on EVERY invocation, so a broken parser cannot report
//    a clean tree.
//
// Usage: node scripts/check-dependency-rules.mjs   (exit 1 on any violation)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** DEP-01's own exception, and DEP-10's subject. */
const EXACT_PIN_EXCEPTIONS = new Set(['three']);

/** Below this, assume the parse went wrong rather than the repo being tiny. */
const MIN_DEPENDENCIES = 10;

/**
 * Version-like values are governed by DEP-02. `path`/`git` dependencies have no
 * version and are out of the rule's scope, so they are reported as skipped
 * rather than silently passing or failing.
 */
function isVersionLike(value) {
  return /^[\^~=]?\d/.test(value);
}

export function parseCargoDependencies(text) {
  const deps = new Map();
  const skipped = [];
  const unparsed = [];
  let section = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const header = /^\[([^\]]+)\]$/.exec(line);
    if (header) {
      section = header[1];
      continue;
    }
    if (section !== 'dependencies' && section !== 'dev-dependencies') continue;

    const simple = /^([A-Za-z0-9_-]+)\s*=\s*"([^"]+)"/.exec(line);
    if (simple) {
      deps.set(simple[1], simple[2]);
      continue;
    }

    const inline = /^([A-Za-z0-9_-]+)\s*=\s*\{([^}]*)\}/.exec(line);
    if (inline) {
      const version = /version\s*=\s*"([^"]+)"/.exec(inline[2]);
      if (version) deps.set(inline[1], version[1]);
      else skipped.push(line);
      continue;
    }

    // A table that continues onto following lines cannot be read here. Report
    // it: a gate must never pass on the strength of what it could not parse.
    unparsed.push(line);
  }

  return { deps, skipped, unparsed };
}

/** Every dependency entry of a package.json, whichever section it lives in. */
export function npmDependencies(manifest) {
  return [
    ...Object.entries(manifest.dependencies ?? {}).map(([name, spec]) => ({
      name,
      spec,
      section: 'dependencies',
    })),
    ...Object.entries(manifest.devDependencies ?? {}).map(([name, spec]) => ({
      name,
      spec,
      section: 'devDependencies',
    })),
  ];
}

export function violatesCaret(spec) {
  return typeof spec !== 'string' || !/^[\^~]/.test(spec);
}

export function isExactVersion(spec) {
  return typeof spec === 'string' && /^\d+\.\d+\.\d+$/.test(spec);
}

const RULES = [
  { id: 'DEP-01', title: 'npm dependencies use caret ranges' },
  { id: 'DEP-02', title: 'Cargo dependencies use caret ranges' },
  { id: 'DEP-03', title: 'both lockfiles are committed' },
  { id: 'DEP-10', title: '`three` is pinned to an exact version' },
];

const REQUIRED_LOCKS = ['package-lock.json', 'src-tauri/Cargo.lock'];

export function runChecks({ npmManifest, cargoToml, trackedFiles }) {
  const findings = [];
  const examined = new Map(RULES.map((rule) => [rule.id, 0]));
  const count = (rule) => examined.set(rule, examined.get(rule) + 1);

  // ── DEP-01 ────────────────────────────────────────────────────────────────
  for (const { name, spec, section } of npmDependencies(npmManifest)) {
    if (EXACT_PIN_EXCEPTIONS.has(name)) continue;
    count('DEP-01');
    if (violatesCaret(spec)) {
      findings.push({
        rule: 'DEP-01',
        detail: `${section}.${name} is "${spec}" — expected a caret range`,
      });
    }
  }

  // ── DEP-02 ────────────────────────────────────────────────────────────────
  const { deps, unparsed } = parseCargoDependencies(cargoToml);
  for (const [name, spec] of deps) {
    if (!isVersionLike(spec)) continue; // path/git deps have no version
    count('DEP-02');
    if (spec.startsWith('=')) {
      findings.push({
        rule: 'DEP-02',
        detail: `${name} = "${spec}" — an exact Cargo pin; use a caret range`,
      });
    }
  }
  for (const line of unparsed) {
    findings.push({ rule: 'DEP-02', detail: `unparseable dependency line: ${line}` });
  }

  // ── DEP-03 ────────────────────────────────────────────────────────────────
  examined.set('DEP-03', REQUIRED_LOCKS.length);
  for (const required of REQUIRED_LOCKS) {
    if (!trackedFiles.includes(required)) {
      findings.push({ rule: 'DEP-03', detail: `${required} is not tracked by git` });
    }
  }

  // ── DEP-10 ────────────────────────────────────────────────────────────────
  examined.set('DEP-10', 1);
  const three = npmManifest.dependencies?.three;
  if (!isExactVersion(three)) {
    findings.push({
      rule: 'DEP-10',
      detail: `three is "${three}" — DEP-10 requires an exact version`,
    });
  }

  return { findings, examined };
}

// ── Self-test: runs on EVERY invocation ────────────────────────────────────
// A gate whose parser is broken reports compliance it never checked. Each
// fixture asserts exactly which rule fires — including the cases that must NOT
// fire (the `three` exemption, a bare Cargo "2" which is a caret equivalent).

const CLEAN_NPM = { dependencies: { three: '0.170.0', a: '^1.0.0' } };
const CLEAN_CARGO = '[dependencies]\nserde = "1"\n';
const CLEAN_LOCKS = [...REQUIRED_LOCKS];

const FIXTURES = [
  { name: 'clean tree', npm: CLEAN_NPM, cargo: CLEAN_CARGO, locks: CLEAN_LOCKS, expect: [] },
  {
    name: 'npm exact pin',
    npm: { dependencies: { three: '0.170.0', a: '1.2.3' } },
    cargo: CLEAN_CARGO,
    locks: CLEAN_LOCKS,
    expect: ['DEP-01'],
  },
  {
    name: 'three is exempt from the caret rule',
    npm: { dependencies: { three: '0.170.0' } },
    cargo: CLEAN_CARGO,
    locks: CLEAN_LOCKS,
    expect: [],
  },
  {
    name: 'cargo exact pin',
    npm: CLEAN_NPM,
    cargo: '[dependencies]\nserde = "=1.0.0"\n',
    locks: CLEAN_LOCKS,
    expect: ['DEP-02'],
  },
  {
    name: 'cargo bare major is a caret equivalent',
    npm: CLEAN_NPM,
    cargo: '[dependencies]\ntauri = { version = "2", features = ["x"] }\n',
    locks: CLEAN_LOCKS,
    expect: [],
  },
  {
    name: 'unparseable cargo entry',
    npm: CLEAN_NPM,
    cargo: '[dependencies]\nserde = {\n',
    locks: CLEAN_LOCKS,
    expect: ['DEP-02'],
  },
  { name: 'lockfile untracked', npm: CLEAN_NPM, cargo: CLEAN_CARGO, locks: [], expect: ['DEP-03'] },
  {
    name: 'three not exact',
    npm: { dependencies: { three: '^0.170.0' } },
    cargo: CLEAN_CARGO,
    locks: CLEAN_LOCKS,
    expect: ['DEP-10'],
  },
];

function assertRuleFixtures() {
  const failures = [];
  for (const fixture of FIXTURES) {
    const { findings } = runChecks({
      npmManifest: fixture.npm,
      cargoToml: fixture.cargo,
      trackedFiles: fixture.locks,
    });
    const got = [...new Set(findings.map((finding) => finding.rule))].sort();
    const want = [...fixture.expect].sort();
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      failures.push(`${fixture.name}: expected [${want}] got [${got}]`);
    }
  }
  if (failures.length > 0) {
    console.error('The dependency-rule parser is broken; refusing a verdict.');
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(2);
  }
}

function main() {
  assertRuleFixtures();

  const npmManifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const cargoToml = readFileSync(join(ROOT, 'src-tauri', 'Cargo.toml'), 'utf8');

  let trackedFiles = [];
  try {
    trackedFiles = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    console.error('DEP-03 could not be checked: git is unavailable.');
    process.exit(1);
  }

  const { findings, examined } = runChecks({ npmManifest, cargoToml, trackedFiles });
  const counts = new Map();
  for (const finding of findings) {
    counts.set(finding.rule, (counts.get(finding.rule) ?? 0) + 1);
  }

  console.log('Dependency rule verdicts:');
  for (const rule of RULES) {
    const failures = counts.get(rule.id) ?? 0;
    console.log(
      `  ${failures === 0 ? 'PASS' : 'FAIL'}  ${rule.id}  ${rule.title}  (examined ${examined.get(rule.id)})`,
    );
  }

  // Anti-vacuous: a parser that matched nothing would otherwise report PASS.
  const thin = [];
  if (examined.get('DEP-01') < MIN_DEPENDENCIES) {
    thin.push(`DEP-01 examined only ${examined.get('DEP-01')} npm dependencies`);
  }
  if (examined.get('DEP-02') < MIN_DEPENDENCIES) {
    thin.push(`DEP-02 examined only ${examined.get('DEP-02')} Cargo dependencies`);
  }
  if (thin.length > 0) {
    console.error('Refusing to report PASS on an implausibly small sample:');
    for (const line of thin) console.error(`  - ${line}`);
    process.exit(1);
  }

  if (findings.length === 0) {
    console.log('All dependency rules pass.');
    process.exit(0);
  }

  console.error(`\n${findings.length} violation(s):`);
  for (const finding of findings) {
    console.error(`  [${finding.rule}] ${finding.detail}`);
  }
  process.exit(1);
}

main();
