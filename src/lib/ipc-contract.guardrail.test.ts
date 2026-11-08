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
