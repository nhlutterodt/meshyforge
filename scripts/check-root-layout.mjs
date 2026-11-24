#!/usr/bin/env node
// scripts/check-root-layout.mjs
//
// Verifies that `Github_Repository_Expectations.md` §4.1 ("Root Directory
// Contents") still describes reality.
//
// Why this exists: §4.1 states the root "must contain exactly the following
// files and directories", and by the time TASK-0044 was filed it had drifted by
// TEN entries — `.claude/`, `.gitattributes`, `app-icon.png`, `CLAUDE.md`,
// `components.json`, `copilot-instructions.md`, `index.html`,
// `Meshy_Documentation/`, `scripts/`, `vitest.config.ts`. A rule that nothing
// checks is documentation of an intention, not a control; that is the same
// failure class as DEP-06. This converts §4.1 into a control.
//
// Scope: §4.1 governs TRACKED content. Root artefacts that are gitignored
// (`.env.local`, `*.log`, `coverage-output.txt`) are deliberately absent from the
// document, so this check reads `git ls-files` rather than the filesystem —
// otherwise the check would demand that ephemeral logs be documented.
//
// A documented entry may be exempted from the existence check by including the
// word `optional` in its line comment (used by `tailwind.config.ts`, which does
// not exist because Tailwind v4 uses `@theme` in CSS).
//
// Usage: node scripts/check-root-layout.mjs   (exit 1 on drift)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GREB = join(ROOT, 'docs', 'Github_Repository_Expectations.md');
const HEADING = '### 4.1 Root Directory Contents';

function trackedTopLevel() {
  const out = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
  const entries = new Set();
  for (const line of out.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    entries.add(trimmed.split('/')[0]);
  }
  return entries;
}

function documentedTopLevel() {
  const source = readFileSync(GREB, 'utf8');
  const headingAt = source.indexOf(HEADING);
  if (headingAt === -1) {
    throw new Error(`Could not find "${HEADING}" in ${GREB}`);
  }
  const fenceStart = source.indexOf('```', headingAt);
  const fenceEnd = source.indexOf('```', fenceStart + 3);
  if (fenceStart === -1 || fenceEnd === -1) {
    throw new Error(`Could not find the fenced tree block under ${HEADING}`);
  }

  const documented = new Map();
  for (const raw of source.slice(fenceStart + 3, fenceEnd).split('\n')) {
    // Strip the tree glyphs, then read `<name>` and the trailing comment.
    const match = raw.match(/^[\s├└│─]*(?<name>[^\s#]+)(?<comment>.*)$/);
    if (!match?.groups) continue;
    const name = match.groups.name.replace(/\/$/, '');
    // The first line of the block is the repository root itself.
    if (name === 'meshyforge' || name === '') continue;
    documented.set(name, { optional: /\boptional\b/i.test(match.groups.comment) });
  }
  return documented;
}

const tracked = trackedTopLevel();
const documented = documentedTopLevel();

const undocumented = [...tracked].filter((name) => !documented.has(name)).sort();
const phantom = [...documented.entries()]
  .filter(([name, meta]) => !meta.optional && !tracked.has(name))
  .map(([name]) => name)
  .sort();

if (undocumented.length === 0 && phantom.length === 0) {
  console.log(
    `Root layout is documented: ${tracked.size} tracked top-level entries match GREB §4.1.`,
  );
  process.exit(0);
}

console.error('GREB §4.1 (Root Directory Contents) does not match the repository.');
if (undocumented.length > 0) {
  console.error('\nTracked but NOT documented in §4.1:');
  for (const name of undocumented) console.error(`  - ${name}`);
}
if (phantom.length > 0) {
  console.error('\nDocumented in §4.1 but NOT tracked (not marked optional):');
  for (const name of phantom) console.error(`  - ${name}`);
}
console.error(
  '\nFix: update §4.1 in docs/Github_Repository_Expectations.md so the tree matches\n' +
    '`git ls-files`. §4.1 sanctions its own update ("without updating this document").\n' +
    'Ignore gitignored root artefacts — §4.1 governs tracked content only.',
);
process.exit(1);
