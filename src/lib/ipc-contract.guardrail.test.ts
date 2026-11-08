// src/lib/ipc-contract.guardrail.test.ts
//
// Defect class prevented: phantom IPC commands.
//
// The frontend can invoke a Tauri command name that is not registered in any
// `tauri::generate_handler![...]` block in src-tauri/src/lib.rs. Such calls
// compile clean and pass every ordinary test, then fail only at runtime
// ("Command get_setting not found"). This guardrail makes that class of defect
// fail a test instead: it cross-checks every command-name string literal used
// with invoke() (directly, or via a config object such as
// makeCreateHook({ command: '...' })) against the Rust registry parsed from
// lib.rs, and pins the CommandName union in tauri.ts to the same set.

import { describe, expect, it } from 'vitest';
import libRsSource from '../../src-tauri/src/lib.rs?raw';
import providerTypesSource from '../../src-tauri/src/provider/types.rs?raw';
import meshyTypesSource from './meshy-types.ts?raw';
import tauriSource from './tauri.ts?raw';

// ─── Rust registry: every `generate_handler![...]` block in lib.rs ───
function extractRegisteredCommands(rustSource: string): Set<string> {
  const registered = new Set<string>();
  const blocks = rustSource.matchAll(/generate_handler!\s*\[([\s\S]*?)\]/g);
  for (const block of blocks) {
    const body = block[1] ?? '';
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//')) continue; // skip comments and blanks
      const entry = line.replace(/,$/, '').trim();
      const segments = entry.split('::');
      const name = segments.at(-1) ?? '';
      if (/^[a-z_0-9]+$/.test(name)) registered.add(name);
    }
  }
  return registered;
}

// ─── Frontend invocations: command-name literals in non-test src files ───
const frontendModules = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const isFrontendSource = (path: string): boolean =>
  !path.endsWith('.test.ts') &&
  !path.endsWith('.test.tsx') &&
  !path.endsWith('.d.ts') &&
  !path.includes('/test-setup');

// Direct pattern: invoke('name', ...) / invoke<T>('name', ...)
const DIRECT_INVOKE = /invoke(?:<[^>]*>)?\(\s*['"]([a-z_0-9]+)['"]/g;
// Config pattern: { command: 'name', ... } (useMeshyApi passes the name via makeCreateHook)
const COMMAND_CONFIG = /command:\s*['"]([a-z_0-9]+)['"]/g;

interface Invocation {
  command: string;
  file: string;
}

function extractInvokedCommands(): Invocation[] {
  const invocations: Invocation[] = [];
  for (const [path, source] of Object.entries(frontendModules)) {
    if (!isFrontendSource(path)) continue;
    for (const pattern of [DIRECT_INVOKE, COMMAND_CONFIG]) {
      for (const match of source.matchAll(pattern)) {
        const command = match[1];
        if (command) invocations.push({ command, file: path });
      }
    }
  }
  return invocations;
}

// ─── CommandName union in tauri.ts ───
function extractCommandNameUnion(source: string): Set<string> {
  const decl = source.match(/export type CommandName\s*=([\s\S]*?);/);
  if (!decl) throw new Error('CommandName union not found in src/lib/tauri.ts');
  const names = new Set<string>();
  for (const match of (decl[1] ?? '').matchAll(/'([a-z_0-9]+)'/g)) {
    const name = match[1];
    if (name) names.add(name);
  }
  return names;
}

describe('IPC contract guardrails (unregistered invoke names must fail a test, not the runtime)', () => {
  it('every invoked command is registered in generate_handler!', () => {
    const registered = extractRegisteredCommands(libRsSource);
    expect(registered.size).toBeGreaterThan(0);

    const unregistered = extractInvokedCommands().filter((inv) => !registered.has(inv.command));

    // Group by command so the failure names each phantom command once, with files.
    const summary = unregistered
      .map((inv) => `  '${inv.command}' invoked in ${inv.file}`)
      .join('\n');
    expect(
      unregistered,
      `phantom commands not registered in src-tauri/src/lib.rs:\n${summary}`,
    ).toEqual([]);
  });

  it('CommandName union in tauri.ts matches the Rust registry exactly', () => {
    const registered = extractRegisteredCommands(libRsSource);
    const union = extractCommandNameUnion(tauriSource);

    const missingFromUnion = [...registered].filter((name) => !union.has(name));
    const extraInUnion = [...union].filter((name) => !registered.has(name));

    expect(
      missingFromUnion,
      `registered Rust commands missing from CommandName: ${missingFromUnion.join(', ')}`,
    ).toEqual([]);
    expect(
      extraInUnion,
      `CommandName members not registered in Rust: ${extraInUnion.join(', ')}`,
    ).toEqual([]);
  });
});

// ─── TaskType / ArtifactRole wire-name parity (ADR-0015) ─────────
//
// ADR-0015 consequence: "The `TaskType` serde names become part of the poll
// IPC surface" — since step 2, `poll_task`/`stream_task`/`delete_task` take
// the wire value as their dispatch argument, and `TaskSnapshot.artifacts[].role`
// carries the ArtifactRole wire value. A rename on one side that does not land
// on the other fails at runtime only (unknown taskType => INVALID_INPUT,
// undefined role), so it must fail a test instead.

/// Rust enum body: from `pub enum NAME {` to the next column-0 `}`.
function extractRustEnumBody(rustSource: string, enumName: string): string {
  const start = rustSource.match(new RegExp(`pub enum ${enumName}\\s*\\{`));
  if (!start || start.index === undefined) {
    throw new Error(`Rust enum ${enumName} not found in provider/types.rs`);
  }
  const rest = rustSource.slice(start.index);
  const end = rest.search(/\n\}/);
  if (end < 0) throw new Error(`Unbalanced Rust enum ${enumName}`);
  return rest.slice(0, end);
}

/// Every `#[serde(rename = "...")]` wire value inside a Rust enum body.
function extractRustSerdeRenames(enumBody: string): Set<string> {
  const names = new Set<string>();
  for (const match of enumBody.matchAll(/#\[serde\(rename\s*=\s*"([^"]+)"\)\]/g)) {
    const name = match[1];
    if (name) names.add(name);
  }
  return names;
}

/// TypeScript string-literal union: from `export type NAME =` to the `;`.
function extractTsUnion(source: string, typeName: string): Set<string> {
  const decl = source.match(new RegExp(`export type ${typeName}\\s*=([^;]*);`));
  if (!decl) throw new Error(`TS union ${typeName} not found in meshy-types.ts`);
  const names = new Set<string>();
  for (const match of (decl[1] ?? '').matchAll(/'([^']+)'/g)) {
    const name = match[1];
    if (name) names.add(name);
  }
  return names;
}

function assertSetEquality(rust: Set<string>, ts: Set<string>, label: string) {
  const missingFromTs = [...rust].filter((name) => !ts.has(name));
  const extraInTs = [...ts].filter((name) => !rust.has(name));
  expect(
    missingFromTs,
    `Rust ${label} wire values missing from TypeScript: ${missingFromTs.join(', ')}`,
  ).toEqual([]);
  expect(
    extraInTs,
    `TypeScript ${label} members not present in Rust: ${extraInTs.join(', ')}`,
  ).toEqual([]);
  expect(ts.size, `${label} set must be non-empty`).toBeGreaterThan(0);
}

describe('ADR-0015 wire-name parity (TaskType/ArtifactRole are IPC surface)', () => {
  it('TS TaskType union equals the Rust TaskType serde renames', () => {
    assertSetEquality(
      extractRustSerdeRenames(extractRustEnumBody(providerTypesSource, 'TaskType')),
      extractTsUnion(meshyTypesSource, 'TaskType'),
      'TaskType',
    );
  });

  it('TS ArtifactRole union equals the Rust ArtifactRole serde renames', () => {
    assertSetEquality(
      extractRustSerdeRenames(extractRustEnumBody(providerTypesSource, 'ArtifactRole')),
      extractTsUnion(meshyTypesSource, 'ArtifactRole'),
      'ArtifactRole',
    );
  });

  it('TS TaskStatus union equals the Rust TaskSnapshotStatus wire values', () => {
    // TaskSnapshotStatus uses rename_all = "SCREAMING_SNAKE_CASE", so the
    // wire values are derived from the variant identifiers.
    const body = extractRustEnumBody(providerTypesSource, 'TaskSnapshotStatus');
    const variants = [...body.matchAll(/^\s{4}([A-Z][A-Za-z]*),/gm)].map((m) => m[1] as string);
    const toScreamingSnake = (name: string) =>
      name
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/([A-Za-z])([0-9])/g, '$1_$2')
        .toUpperCase();
    assertSetEquality(
      new Set(variants.map(toScreamingSnake)),
      extractTsUnion(meshyTypesSource, 'TaskStatus'),
      'TaskStatus',
    );
  });

  it('the frontend no longer mirrors provider endpoint paths (TPC-05)', () => {
    // TPC-05: `provider::meshy::ENDPOINT_MAP` is the only endpoint table.
    const useMeshyApiSource = frontendModules['../hooks/useMeshyApi.ts'];
    const pollingSource = frontendModules['../hooks/useActiveTaskPolling.ts'];
    expect(useMeshyApiSource).toBeDefined();
    expect(useMeshyApiSource).not.toMatch(/endpoint:/);
    expect(pollingSource).not.toMatch(/endpoint:/);
    // ...and the commands dispatch on taskType.
    expect(pollingSource).toContain("invoke<TaskSnapshot>('poll_task'");
    expect(tauriSource).toBeDefined();
  });
});
