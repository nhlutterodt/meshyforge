#!/usr/bin/env node
// Rebuilds the queryable SQLite projection of docs/governance/task-manifest.yaml.
//
// The YAML file is the source of truth (git-tracked, human-diffable). This
// script's output (.claude/state/task_ledger.db) is a disposable cache for
// fast queries across a large backlog — gitignored, and always rebuilt from
// scratch, never hand-edited. See ADR-0005 for why: a binary DB diffs badly
// in git and would invite exactly the kind of silent, unauditable drift the
// rest of this repo's governance tooling (adr-log, doc-sync) is built to
// prevent.
//
// Requires Node 22+ (repo minimum per package.json). Uses node:sqlite,
// which is experimental as of Node 22 — acceptable here because this DB is
// dev/governance tooling, never shipped in the app bundle, and fully
// rebuildable at any time from the YAML.
//
// Usage: node scripts/governance/sync_task_ledger.mjs [--manifest <path>] [--db <path>]
//
// Note: node:sqlite (and SQLite generally) can fail with "disk I/O error"
// on a network-mounted or FUSE filesystem, since SQLite relies on real
// file locking. If that happens, point --db at a path on a genuine local
// disk. Verified working against a real local filesystem; this is an
// environment constraint, not a script bug.

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}

const manifestPath = resolve(repoRoot, arg('--manifest', 'docs/governance/task-manifest.yaml'));
const dbPath = resolve(repoRoot, arg('--db', '.claude/state/task_ledger.db'));

function fail(msg) {
  console.error(JSON.stringify({ ok: false, error: msg }));
  process.exit(1);
}

if (!existsSync(manifestPath)) fail(`manifest not found: ${manifestPath}`);

let manifest;
try {
  manifest = loadYaml(readFileSync(manifestPath, 'utf8'));
} catch (e) {
  fail(`manifest parse error: ${e.message}`);
}

if (!manifest || !Array.isArray(manifest.tasks)) {
  fail('manifest missing top-level "tasks" array');
}

const VALID_STATUS = new Set(['pending', 'in_progress', 'blocked', 'completed', 'abandoned']);
const VALID_TIER = new Set(['T0', 'T1', 'T2', 'T3']);
const seenIds = new Set();
const errors = [];

for (const t of manifest.tasks) {
  if (!t.id || !/^TASK-\d{4}$/.test(t.id)) errors.push(`bad id: ${t.id}`);
  if (seenIds.has(t.id)) errors.push(`duplicate id: ${t.id}`);
  seenIds.add(t.id);
  if (!VALID_STATUS.has(t.status)) errors.push(`${t.id}: bad status "${t.status}"`);
  if (!VALID_TIER.has(t.capability_tier)) errors.push(`${t.id}: bad capability_tier "${t.capability_tier}"`);
  for (const dep of t.blocked_by || []) {
    if (!manifest.tasks.some((o) => o.id === dep)) errors.push(`${t.id}: blocked_by references unknown id ${dep}`);
  }
}

if (errors.length) fail(`validation failed:\n${errors.join('\n')}`);

mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);

db.exec(`
  DROP TABLE IF EXISTS tasks;
  DROP TABLE IF EXISTS task_blocks;
  DROP TABLE IF EXISTS task_adr_refs;
  DROP TABLE IF EXISTS task_notes;

  CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    risk_level INTEGER NOT NULL,
    capability_tier TEXT NOT NULL,
    owner TEXT,
    created TEXT,
    updated TEXT,
    evidence_gate TEXT
  );
  CREATE TABLE task_blocks (task_id TEXT, blocked_by TEXT);
  CREATE TABLE task_adr_refs (task_id TEXT, adr_id TEXT);
  CREATE TABLE task_notes (task_id TEXT, seq INTEGER, note TEXT);
`);

const insertTask = db.prepare(
  `INSERT INTO tasks (id, title, status, risk_level, capability_tier, owner, created, updated, evidence_gate)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertBlock = db.prepare(`INSERT INTO task_blocks (task_id, blocked_by) VALUES (?, ?)`);
const insertAdr = db.prepare(`INSERT INTO task_adr_refs (task_id, adr_id) VALUES (?, ?)`);
const insertNote = db.prepare(`INSERT INTO task_notes (task_id, seq, note) VALUES (?, ?, ?)`);

for (const t of manifest.tasks) {
  insertTask.run(
    t.id, t.title, t.status, t.risk_level, t.capability_tier,
    t.owner ?? null, t.created ?? null, t.updated ?? null, t.evidence_gate ?? null
  );
  for (const b of t.blocked_by || []) insertBlock.run(t.id, b);
  for (const a of t.adr_refs || []) insertAdr.run(t.id, a);
  (t.notes || []).forEach((n, idx) => insertNote.run(t.id, idx, n));
}

db.close();

console.log(JSON.stringify({
  ok: true,
  manifest: manifestPath,
  db: dbPath,
  task_count: manifest.tasks.length,
  protocol_version: manifest.protocol_version ?? null,
}, null, 2));
