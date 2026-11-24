#!/usr/bin/env node
// scripts/generate-third-party-notices.mjs
//
// Generates THIRD_PARTY_NOTICES.md at the repository root.
//
// Why this exists: O-1/O-2/O-3/O-5 in docs/legal-metadata-baseline.md are owed
// the moment a release artifact is published, and were unmet until this shipped.
// Apache-2.0 §4 requires giving recipients a copy of the License; MIT/ISC/BSD
// require the copyright and permission notice; OFL 1.1 requires the font's
// copyright notice and licence text. A list of package names discharges none of
// those, so this emits an index AND the full text of every licence family.
//
// Deliberate design decisions (see TASK-0041 in docs/governance/task-manifest.yaml):
//   * The Rust graph is read WITHOUT target filtering, so the output is a
//     superset covering every platform release.yml builds. Generating from a
//     host-filtered graph would make the CI drift check fail on a different OS,
//     and over-attribution is not a violation while under-attribution is.
//   * No generation date is written. A volatile timestamp would make --check
//     fail every day and turn the drift gate into noise.
//   * Licence texts are harvested from artefacts already on disk (the cargo
//     registry cache and node_modules), matched by content signature, never
//     hand-transcribed. Missing texts are reported explicitly.
//
// Usage:
//   node scripts/generate-third-party-notices.mjs            # write
//   node scripts/generate-third-party-notices.mjs --check    # verify, exit 1 on drift
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = join(ROOT, 'THIRD_PARTY_NOTICES.md');
const CARGO_REGISTRY_SRC = join(homedir(), '.cargo', 'registry', 'src');
const CARGO_REGISTRY_CACHE = join(homedir(), '.cargo', 'registry', 'cache');

// Signature phrases identify a licence text by CONTENT, not filename.
// Filename hints alone are unreliable: dual-licensed crates ship several files
// and some name them inconsistently.
const SIGNATURES = {
  MIT: ['Permission is hereby granted, free of charge'],
  'Apache-2.0': ['Apache License', 'Version 2.0, January 2004'],
  'Apache-2.0 WITH LLVM-exception': ['LLVM Exception'],
  ISC: ['Permission to use, copy, modify, and/or distribute this software'],
  'BSD-2-Clause': ['Redistribution and use in source and binary forms'],
  'BSD-3-Clause': ['Redistribution and use in source and binary forms', 'Neither the name'],
  'MPL-2.0': ['Mozilla Public License Version 2.0'],
  'OFL-1.1': ['SIL OPEN FONT LICENSE Version 1.1'],
  'Unicode-3.0': ['UNICODE LICENSE V3'],
  Zlib: ["This software is provided 'as-is'"],
  Unlicense: ['This is free and unencumbered software released into the public domain'],
  'CC0-1.0': ['CC0 1.0 Universal'],
  '0BSD': ['Zero-Clause BSD'],
  'BSL-1.0': ['Boost Software License - Version 1.0'],
  'BlueOak-1.0.0': ['Blue Oak Model License'],
  'CC-BY-4.0': ['Creative Commons Attribution 4.0 International'],
  'MIT-0': ['MIT No Attribution'],
};

// A declared expression may contain several identifiers; each one present in the
// graph gets its own appendix entry.
//
// Parentheses MUST be stripped before splitting: splitting
// `(MIT OR Apache-2.0) AND Unicode-3.0` on the operators alone yields the bogus
// identifiers `(MIT` and `Apache-2.0)`, which then create junk appendix
// sections and mis-state what a package declares. Caught by inspecting the first
// generated file, not by reasoning about the regex.
function expandExpression(expression) {
  if (!expression) return ['NOASSERTION'];
  const parts = expression
    .replace(/[()]/g, ' ')
    .split(/\s+OR\s+|\s+AND\s+|\/|,/i)
    .map((part) => part.trim())
    .filter(Boolean);
  return [...new Set(parts)];
}

function readIfExists(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

function licenceFilesIn(dir) {
  if (!existsSync(dir)) return [];
  let names;
  try {
    // Sorted: readdirSync order is not stable across filesystems, and an
    // unsorted pick would make the appendix depend on the generating machine.
    names = readdirSync(dir).sort();
  } catch {
    return [];
  }
  return names
    .filter((name) => /^(LICEN[CS]E|COPYING|NOTICE)/i.test(name))
    .map((name) => join(dir, name))
    .filter((path) => {
      try {
        return statSync(path).isFile();
      } catch {
        return false;
      }
    });
}

function matchesLicence(text, id) {
  const signatures = SIGNATURES[id];
  if (!signatures) return false;
  // A BSD-2 text must not satisfy BSD-3-Clause or vice versa.
  if (id === 'BSD-2-Clause' && /Neither the name/i.test(text)) return false;
  return signatures.every((needle) => text.includes(needle));
}

function harvestFrom(candidateDirs, ids) {
  const found = new Map();
  for (const id of ids) {
    if (!SIGNATURES[id]) continue;
    for (const dir of candidateDirs) {
      for (const file of licenceFilesIn(dir)) {
        const text = readIfExists(file);
        if (!text || !matchesLicence(text, id)) continue;
        found.set(id, text.replace(/\r\n/g, '\n').trimEnd());
        break;
      }
      if (found.has(id)) break;
    }
  }
  return found;
}

function normalise(text) {
  return text.replace(/\r\n/g, '\n').trimEnd();
}

// A `.crate` is a gzipped tar. Reading it directly is what makes this generator
// reproducible: `cargo metadata` DOWNLOADS these archives but does not EXTRACT
// them, so `registry/src` is empty on a fresh CI runner and full on a developer
// machine. Harvesting only from `registry/src` therefore produced a different
// "licence text not found" list per machine, while the header claimed the file
// was identical whichever OS regenerated it. That claim was false.
function licenceTextsInCrate(path) {
  let tar;
  try {
    tar = gunzipSync(readFileSync(path));
  } catch {
    return [];
  }
  const texts = [];
  for (let offset = 0; offset + 512 <= tar.length; ) {
    const header = tar.subarray(offset, offset + 512);
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    if (!name) break;
    const sizeField = header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim();
    const size = Number.parseInt(sizeField || '0', 8) || 0;
    const type = header[156];
    // Strip the leading `<name>-<version>/` component; top-level files only,
    // matching licenceFilesIn's behaviour on an extracted directory.
    const base = name.slice(name.indexOf('/') + 1);
    const regular = type === 0 || type === 48;
    if (regular && !base.includes('/') && /^(LICEN[CS]E|COPYING|NOTICE)/i.test(base)) {
      texts.push(tar.subarray(offset + 512, offset + 512 + size).toString('utf8'));
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return texts;
}

// Harvests Rust licence texts package-by-package in a fixed order. The
// extracted directory is only a fast path for the SAME package's archive, so
// whether cargo happened to extract it locally cannot change the result.
function harvestRust(sources) {
  const found = new Map();
  for (const source of sources) {
    const wanted = source.ids.filter((id) => SIGNATURES[id] && !found.has(id));
    if (wanted.length === 0) continue;
    const extracted = licenceFilesIn(source.dir).map(readIfExists).filter(Boolean);
    const texts = extracted.length > 0 ? extracted : licenceTextsInCrate(source.crate);
    for (const text of texts) {
      for (const id of wanted) {
        if (!found.has(id) && matchesLicence(text, id)) found.set(id, normalise(text));
      }
    }
  }
  return found;
}

// ─── Rust graph ──────────────────────────────────────────────────────────────

function readRustPackages() {
  // No --filter-platform: deliberately includes every target so the output is
  // stable regardless of which OS regenerates it.
  const raw = execFileSync(
    'cargo',
    ['metadata', '--manifest-path', join(ROOT, 'src-tauri', 'Cargo.toml'), '--format-version', '1'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const meta = JSON.parse(raw);
  const byId = new Map(meta.packages.map((pkg) => [pkg.id, pkg]));
  const nodes = new Map(meta.resolve.nodes.map((node) => [node.id, node]));
  const root = meta.resolve.nodes.find((node) => node.id === meta.resolve.root);

  // Walk non-dev edges only: dev-dependencies never ship.
  const shipped = new Map();
  const walk = (id) => {
    const node = nodes.get(id);
    if (!node) return;
    for (const dep of node.deps ?? []) {
      const kinds = dep.dep_kinds ?? [];
      if (kinds.length > 0 && kinds.every((kind) => kind.kind === 'dev')) continue;
      const pkg = byId.get(dep.pkg);
      if (!pkg) continue;
      const key = `${pkg.name}@${pkg.version}`;
      if (shipped.has(key)) continue;
      shipped.set(key, pkg);
      walk(dep.pkg);
    }
  };
  for (const dep of root.deps ?? []) {
    const kinds = dep.dep_kinds ?? [];
    if (kinds.length > 0 && kinds.every((kind) => kind.kind === 'dev')) continue;
    const pkg = byId.get(dep.pkg);
    if (!pkg) continue;
    shipped.set(`${pkg.name}@${pkg.version}`, pkg);
    walk(dep.pkg);
  }

  const packages = [...shipped.values()].map((pkg) => ({
    ecosystem: 'crates.io',
    name: pkg.name,
    version: pkg.version,
    licence: pkg.license ?? (pkg.license_file ? 'SEE LICENCE FILE' : 'NOASSERTION'),
    url: pkg.repository ?? pkg.homepage ?? `https://crates.io/crates/${pkg.name}`,
  }));

  // Harvest sources, restricted to the SHIPPED graph and in a fixed order.
  // Scanning every extracted crate in the registry (the previous behaviour)
  // could reproduce a licence text belonging to an unrelated project, and let
  // filesystem enumeration order decide which one.
  const indexesOf = (root) => {
    if (!existsSync(root)) return [];
    try {
      return readdirSync(root).sort();
    } catch {
      return [];
    }
  };
  const srcIndexes = indexesOf(CARGO_REGISTRY_SRC);
  const cacheIndexes = indexesOf(CARGO_REGISTRY_CACHE);
  const ordered = [...shipped.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
  );
  const sources = [];
  for (const pkg of ordered) {
    const folder = `${pkg.name}-${pkg.version}`;
    const ids = expandExpression(pkg.license);
    for (const index of cacheIndexes) {
      sources.push({
        ids,
        dir: join(CARGO_REGISTRY_SRC, index, folder),
        crate: join(CARGO_REGISTRY_CACHE, index, `${folder}.crate`),
      });
    }
    // No cache entry (a path/git dependency, or an unpopulated registry): still
    // offer the extracted directory so the source list never silently shrinks.
    if (cacheIndexes.length === 0) {
      for (const index of srcIndexes) {
        sources.push({ ids, dir: join(CARGO_REGISTRY_SRC, index, folder), crate: '' });
      }
    }
  }

  return { packages, harvestSources: sources };
}

// ─── npm graph ───────────────────────────────────────────────────────────────

function readNpmPackages() {
  const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'));
  const entries = lock.packages ?? {};
  const packages = [];
  const harvestDirs = [];

  for (const [key, value] of Object.entries(entries)) {
    if (!key.includes('node_modules/')) continue;
    if (value.dev) continue;
    const name = key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);
    harvestDirs.push(join(ROOT, key));
    packages.push({
      ecosystem: 'npm',
      name,
      version: value.version ?? 'unknown',
      licence: typeof value.license === 'string' ? value.license : 'NOASSERTION',
      url: `https://www.npmjs.com/package/${name}`,
    });
  }

  return { packages, harvestDirs };
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function render({ rust, npm }) {
  const all = [...rust.packages, ...npm.packages];
  const ids = [...new Set(all.flatMap((pkg) => expandExpression(pkg.licence)))].sort();

  const texts = new Map([
    ...harvestRust(rust.harvestSources),
    ...harvestFrom(npm.harvestDirs, ids),
  ]);
  const missing = ids.filter((id) => SIGNATURES[id] && !texts.has(id));
  const unknown = ids.filter((id) => !SIGNATURES[id]);

  const lines = [];
  lines.push('# Third-Party Notices');
  lines.push('');
  lines.push('**Generated file — do not edit by hand.** Regenerate with');
  lines.push('`npm run notices:write`; verify with `npm run notices:check`. CI runs the');
  lines.push('same check and fails on drift.');
  lines.push('');
  lines.push('This file discharges obligations O-1, O-2, O-3 and O-5 recorded in');
  lines.push('[`docs/legal-metadata-baseline.md`](docs/legal-metadata-baseline.md) §4.');
  lines.push('');
  lines.push('## Scope and known limitations');
  lines.push('');
  lines.push(
    `- **Rust graph: ${rust.packages.length} packages**, read from \`cargo metadata\` **without platform filtering**.`,
  );
  lines.push('  That is deliberate: the output is a superset covering every target');
  lines.push('  `release.yml` builds, so the file is identical whichever OS regenerates it.');
  lines.push('  Over-attribution is not a licence violation; under-attribution is.');
  lines.push(
    `- **npm graph: ${npm.packages.length} packages**, production only (\`dev\` entries excluded).`,
  );
  lines.push('  This is the lockfile production set, a superset of what the bundler imports.');
  lines.push('- Licence texts are harvested from the pinned dependency graph only: the');
  lines.push('  `.crate` archives in the Cargo registry cache (read directly, so it does');
  lines.push('  not matter whether cargo extracted them locally) and `node_modules`.');
  lines.push('  Texts are matched by content signature rather than filename, and never');
  lines.push('  transcribed by hand.');
  if (missing.length > 0) {
    lines.push(
      `- **Licence text not found on the generating machine for:** ${missing
        .map((id) => `\`${id}\``)
        .join(', ')}. These still appear in the index with their upstream URL, and`,
    );
    lines.push('  the appendix says so explicitly rather than omitting them.');
  }
  if (unknown.length > 0) {
    lines.push(
      `- **Identifiers with no known signature** (listed with URL only): ${unknown
        .map((id) => `\`${id}\``)
        .join(', ')}.`,
    );
  }
  lines.push('');

  const groups = [
    [
      'Rust packages (crates.io)',
      rust.packages,
      'Runtime and build dependencies of the Rust backend.',
    ],
    ['npm packages', npm.packages, 'Production dependencies of the frontend.'],
  ];
  for (const [title, group, note] of groups) {
    lines.push(`## ${title}`);
    lines.push('');
    lines.push(note);
    lines.push('');
    lines.push('| Package | Version | Licence | Source |');
    lines.push('|---|---|---|---|');
    const sorted = [...group].sort(
      (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
    );
    for (const pkg of sorted) {
      lines.push(`| \`${pkg.name}\` | ${pkg.version} | ${pkg.licence} | ${pkg.url} |`);
    }
    lines.push('');
  }

  lines.push('## Licence texts');
  lines.push('');
  lines.push('Each licence family appearing above, reproduced once, with the packages that');
  lines.push('declare it.');
  lines.push('');
  for (const id of ids) {
    lines.push(`### ${id}`);
    lines.push('');
    const users = all.filter((pkg) => expandExpression(pkg.licence).includes(id));
    lines.push(`Declared by ${users.length} package(s):`);
    lines.push('');
    for (const pkg of users) {
      lines.push(`- \`${pkg.name}@${pkg.version}\` (${pkg.ecosystem}) — ${pkg.url}`);
    }
    lines.push('');
    const text = texts.get(id);
    if (text) {
      lines.push('```text');
      lines.push(text);
      lines.push('```');
    } else {
      lines.push('> **Licence text not bundled.** This identifier appears in the dependency');
      lines.push('> graph, but no matching licence file was available on the machine that');
      lines.push('> generated this file. See the upstream sources above for the authoritative');
      lines.push('> text. This is a recorded limitation, not an omission.');
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('MeshyForge itself is licensed under the MIT License — see `LICENSE`.');
  lines.push('Documents under `Meshy_Documentation/` are third-party material and are');
  lines.push('**not** covered by that license; see the notice in that directory.');
  lines.push('');

  return `${lines.join('\n')}\n`;
}

// ─── Entrypoint ──────────────────────────────────────────────────────────────

const rust = readRustPackages();
const npm = readNpmPackages();
const content = render({ rust, npm });

if (process.argv.includes('--check')) {
  const existing = readIfExists(OUTPUT);
  if (existing === content) {
    console.log('THIRD_PARTY_NOTICES.md is up to date.');
    process.exit(0);
  }
  console.error(
    'THIRD_PARTY_NOTICES.md is STALE. Run `npm run notices:write` and commit the result.',
  );
  process.exit(1);
}

writeFileSync(OUTPUT, content, 'utf8');
console.log(
  `Wrote THIRD_PARTY_NOTICES.md — ${rust.packages.length} Rust + ${npm.packages.length} npm packages, ${content.length} bytes.`,
);
