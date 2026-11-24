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
import commandsAssetsSource from '../../src-tauri/src/commands/assets.rs?raw';
import commandsRecoverySource from '../../src-tauri/src/commands/recovery.rs?raw';
import libRsSource from '../../src-tauri/src/lib.rs?raw';
import meshyModelsSource from '../../src-tauri/src/meshy/models.rs?raw';
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

// ─── Payload field parity (hand-mirrored structs must not drift) ───
//
// Defect class prevented: silent field drift between a Rust serde struct and
// its hand-maintained TypeScript mirror.
//
// The checks above pin the command registry and the closed enums. A renamed,
// removed or added *field*, though, compiles on both sides and reads back
// `undefined` at runtime — the LESSONS_LEARNED #10 snake/camel class, one
// level down. Types stay hand-mirrored by decision (CSD PR-06 forbids a new
// dependency without justification, so no codegen crate); this test is what
// makes that decision safe.
//
// Scope is the structs that actually cross IPC. Internal Rust structs
// (`Database`, `MeshyClient`, …) are deliberately absent. `BalanceResponse` is
// absent because `get_credit_balance` returns `i64`, so that TypeScript
// interface has no Rust counterpart — dead surface, not drift.

const stripComments = (source: string): string =>
  source.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

/** Body of the block whose opening brace sits at `openIndex`. */
function braceBody(source: string, openIndex: number): string {
  let depth = 0;
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, index);
    }
  }
  throw new Error('unbalanced braces in source');
}

const toCamelCase = (name: string): string =>
  name.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());

/**
 * Struct-level attributes: the text after the last blank line above the struct,
 * so a preceding struct's `rename_all` is not picked up.
 *
 * Line-ending agnostic ON PURPOSE. A blank line in a CRLF working tree is
 * `\r\n\r\n`, which `lastIndexOf('\n\n')` never matches: it returns -1, and the
 * old `.slice(-1)` then produced a ONE-CHARACTER attribute block. `rename_all`
 * became invisible, every field came back snake_case, and the guardrail failed
 * for the WRONG reason (2026-11-23 — a Windows write converted
 * `commands/assets.rs` to CRLF; `migrations/001_initial.sql` is CRLF in this
 * tree as well, so the assumption was never safe to begin with).
 */
function attributeBlockOf(preceding: string): string {
  const blankLine = /\r?\n\r?\n/g;
  let last = -1;
  let match = blankLine.exec(preceding);
  while (match !== null) {
    last = match.index;
    match = blankLine.exec(preceding);
  }
  // No blank line at all: prefer the whole preceding text over one character.
  return last === -1 ? preceding : preceding.slice(last);
}

interface RustField {
  /** Absent from the wire when `None` (`skip_serializing_if`). */
  requiresOptional: boolean;
}

/**
 * Serde wire field names of a Rust struct, in declaration order.
 *
 * Honours the three things that change the wire name or presence:
 * `#[serde(rename = "...")]`, struct-level `rename_all = "camelCase"`, and
 * `#[serde(skip)]`. `skip_serializing_if = "Option::is_none"` does NOT remove
 * the field — it only makes it absent when `None`, which is why it maps to
 * `requiresOptional` instead of being dropped.
 */
function rustWireFields(source: string, structName: string): Map<string, RustField> {
  const clean = stripComments(source);
  const declaration = new RegExp(`pub struct ${structName}\\s*\\{`).exec(clean);
  if (!declaration) throw new Error(`Rust struct ${structName} not found`);
  const body = braceBody(clean, declaration.index + declaration[0].length - 1);

  // Struct-level attributes are the text after the last blank line above the
  // struct, so a preceding struct's `rename_all` cannot be picked up. See
  // `attributeBlockOf` for why that lookup must tolerate CRLF.
  const preceding = clean.slice(0, declaration.index);
  const attributeBlock = attributeBlockOf(preceding);
  const renameAll = /rename_all\s*=\s*"([^"]+)"/.exec(attributeBlock)?.[1];

  const fields = new Map<string, RustField>();
  let pending = '';
  let accumulating = false;
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    // Multi-line attributes: `#[serde(` … `)]` spans several lines.
    if (accumulating) {
      pending += ` ${line}`;
      if (line.includes(']')) accumulating = false;
      continue;
    }
    if (line.startsWith('#[')) {
      pending += ` ${line}`;
      if (!line.includes(']')) accumulating = true;
      continue;
    }
    const field = /^pub\s+(\w+)\s*:\s*(.+?)\s*,?$/.exec(line);
    if (!field) continue;
    const name = field[1] ?? '';
    const fieldType = field[2] ?? '';
    const tokens = [...pending.matchAll(/serde\(([^)]*)\)/g)].flatMap((match) =>
      (match[1] ?? '').split(',').map((token) => token.trim()),
    );
    pending = '';
    if (tokens.includes('skip')) continue;

    const renamed = tokens.find((token) => /^rename\s*=/.test(token));
    let wireName = name;
    if (renamed) {
      wireName = renamed.replace(/^rename\s*=\s*"/, '').replace(/"$/, '');
    } else if (renameAll === 'camelCase') {
      wireName = toCamelCase(name);
    } else if (renameAll !== undefined) {
      throw new Error(`unsupported serde rename_all "${renameAll}" on ${structName}`);
    }
    fields.set(wireName, {
      requiresOptional:
        /^Option</.test(fieldType) &&
        tokens.some((token) => token.startsWith('skip_serializing_if')),
    });
  }
  if (fields.size === 0) throw new Error(`no fields parsed from Rust struct ${structName}`);
  return fields;
}

interface TsField {
  optional: boolean;
  acceptsNull: boolean;
}

/** Field names and optionality of a TypeScript `export interface`. */
function tsInterfaceFields(source: string, typeName: string): Map<string, TsField> {
  const clean = stripComments(source);
  const declaration = new RegExp(`export interface ${typeName}\\s*\\{`).exec(clean);
  if (!declaration) throw new Error(`TypeScript interface ${typeName} not found`);
  const body = braceBody(clean, declaration.index + declaration[0].length - 1);

  const fields = new Map<string, TsField>();
  let depth = 0;
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    // Only depth-0 lines are direct members; nested object literals are not.
    if (depth === 0) {
      const field = /^(?:readonly\s+)?(\w+)(\?)?\s*:\s*(.+?);?$/.exec(line);
      if (field) {
        fields.set(field[1] ?? '', {
          optional: Boolean(field[2]),
          acceptsNull: /\bnull\b/.test(field[3] ?? ''),
        });
      }
    }
    for (const char of line) {
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
    }
  }
  if (fields.size === 0) throw new Error(`no fields parsed from TypeScript ${typeName}`);
  return fields;
}

interface ParityPair {
  rustFile: string;
  rustSource: string;
  rustStruct: string;
  tsFile: string;
  tsSource: string;
  tsType: string;
}

const useActiveTaskPollingSource = frontendModules['../hooks/useActiveTaskPolling.ts'] ?? '';
const useRecoverySource = frontendModules['../hooks/useRecovery.ts'] ?? '';

/**
 * Every payload type that crosses the IPC boundary, paired across the seam.
 *
 * Adding a command whose response is a named struct means adding its pair
 * here — that is the point: the list is the contract surface, in one place.
 */
const PAYLOAD_PAIRS: ParityPair[] = [
  {
    rustFile: 'src-tauri/src/provider/types.rs',
    rustSource: providerTypesSource,
    rustStruct: 'TaskSnapshot',
    tsFile: 'src/lib/meshy-types.ts',
    tsSource: meshyTypesSource,
    tsType: 'TaskSnapshot',
  },
  {
    rustFile: 'src-tauri/src/provider/types.rs',
    rustSource: providerTypesSource,
    rustStruct: 'TaskArtifact',
    tsFile: 'src/lib/meshy-types.ts',
    tsSource: meshyTypesSource,
    tsType: 'TaskArtifact',
  },
  {
    rustFile: 'src-tauri/src/provider/types.rs',
    rustSource: providerTypesSource,
    rustStruct: 'TaskErrorSummary',
    tsFile: 'src/lib/meshy-types.ts',
    tsSource: meshyTypesSource,
    tsType: 'TaskErrorSummary',
  },
  {
    rustFile: 'src-tauri/src/provider/types.rs',
    rustSource: providerTypesSource,
    rustStruct: 'TaskCreateResponse',
    tsFile: 'src/lib/meshy-types.ts',
    tsSource: meshyTypesSource,
    tsType: 'TaskCreateResponse',
  },
  {
    // The one pair whose names differ: the Rust type is the provider
    // catalogue entry, the TS type is the frontend-facing item.
    rustFile: 'src-tauri/src/provider/types.rs',
    rustSource: providerTypesSource,
    rustStruct: 'AnimationLibraryEntry',
    tsFile: 'src/lib/meshy-types.ts',
    tsSource: meshyTypesSource,
    tsType: 'AnimationLibraryItem',
  },
  {
    rustFile: 'src-tauri/src/meshy/models.rs',
    rustSource: meshyModelsSource,
    rustStruct: 'AssetRow',
    tsFile: 'src/lib/meshy-types.ts',
    tsSource: meshyTypesSource,
    tsType: 'AssetRow',
  },
  {
    rustFile: 'src-tauri/src/commands/assets.rs',
    rustSource: commandsAssetsSource,
    rustStruct: 'AssetPage',
    tsFile: 'src/lib/meshy-types.ts',
    tsSource: meshyTypesSource,
    tsType: 'AssetPage',
  },
  {
    rustFile: 'src-tauri/src/commands/assets.rs',
    rustSource: commandsAssetsSource,
    rustStruct: 'SaveCompletedTaskArgs',
    tsFile: 'src/hooks/useActiveTaskPolling.ts',
    tsSource: useActiveTaskPollingSource,
    tsType: 'SaveCompletedTaskArgs',
  },
  {
    // Typed in its own hook rather than meshy-types.ts (a CTR-01 filing
    // deviation tracked for the cleanup lane); parity still pins the fields.
    rustFile: 'src-tauri/src/commands/recovery.rs',
    rustSource: commandsRecoverySource,
    rustStruct: 'RecoveryStatus',
    tsFile: 'src/hooks/useRecovery.ts',
    tsSource: useRecoverySource,
    tsType: 'RecoveryStatus',
  },
];

describe('payload field parity (Rust serde structs vs hand-mirrored TypeScript)', () => {
  for (const pair of PAYLOAD_PAIRS) {
    it(`${pair.rustStruct} matches ${pair.tsType}`, () => {
      const rust = rustWireFields(pair.rustSource, pair.rustStruct);
      const ts = tsInterfaceFields(pair.tsSource, pair.tsType);

      const missingFromTs = [...rust.keys()].filter((field) => !ts.has(field));
      expect(
        missingFromTs,
        `${pair.rustFile} ${pair.rustStruct} sends field(s) that ${pair.tsFile} ${pair.tsType} does not declare — they read back as undefined: ${missingFromTs.join(', ')}`,
      ).toEqual([]);

      const extraInTs = [...ts.keys()].filter((field) => !rust.has(field));
      expect(
        extraInTs,
        `${pair.tsFile} ${pair.tsType} declares field(s) the Rust struct never sends: ${extraInTs.join(', ')}`,
      ).toEqual([]);

      const wrongOptionality = [...rust.entries()]
        .filter(([field, meta]) => {
          const mirror = ts.get(field);
          return (
            meta.requiresOptional && mirror !== undefined && !mirror.optional && !mirror.acceptsNull
          );
        })
        .map(([field]) => field);
      expect(
        wrongOptionality,
        `Rust omits these from the JSON when None (skip_serializing_if), but ${pair.tsType} declares them required and non-null: ${wrongOptionality.join(', ')}`,
      ).toEqual([]);
    });
  }

  it('covers every payload struct a registered command returns', () => {
    // Guard against the list silently going stale: the suites above can only
    // check pairs that exist. This pins the covered set so that adding a
    // command with a new named payload type is a visible edit here.
    const covered = new Set(PAYLOAD_PAIRS.map((pair) => pair.rustStruct));
    for (const required of [
      'TaskSnapshot',
      'TaskArtifact',
      'TaskErrorSummary',
      'TaskCreateResponse',
      'AnimationLibraryEntry',
      'AssetRow',
      'AssetPage',
      'SaveCompletedTaskArgs',
      'RecoveryStatus',
    ]) {
      expect(covered, `${required} lost its parity pair`).toContain(required);
    }
    expect(PAYLOAD_PAIRS.length).toBeGreaterThanOrEqual(9);
  });
});

// ─── Envelope code vocabulary (CSD §7.2 / §10.2) ───
//
// Defect class prevented: an `error_json` code drifting from the documented
// contract with nothing to notice it. This is not hypothetical — the command
// layer shipped BOTH `DB_ERROR` and `DATABASE_ERROR` for the same condition,
// and both `FS_ERROR` and the catalog's `FILESYSTEM_ERROR`, because no
// frontend branch read the code and no test named the set.
//
// Shape precedent: `commands/recovery.rs`'s
// `all_bare_codes_produced_at_this_boundary_are_mapped` isolates its own
// implementation with `source.split("#[cfg(test)]").next()` and asserts the
// produced set EQUALS a documented set, so a new code fails the test rather
// than shipping unnoticed. Same idea, one layer up (the IPC envelope).

const rustSources = import.meta.glob('../../src-tauri/src/**/*.rs', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Implementation section only — `#[cfg(test)]` modules are always last. */
const withoutTestModules = (source: string): string => source.split('#[cfg(test)]')[0] ?? '';

function emittedEnvelopeCodes(): Map<string, string[]> {
  const sites = new Map<string, string[]>();
  for (const [path, source] of Object.entries(rustSources)) {
    if (!path.includes('/commands/')) continue;
    for (const match of withoutTestModules(source).matchAll(
      /error_json\(\s*"([A-Z][A-Z0-9_]*)"/g,
    )) {
      const code = match[1] ?? '';
      const files = sites.get(code) ?? [];
      files.push(path.replace('../../src-tauri/src/', 'src-tauri/src/'));
      sites.set(code, files);
    }
  }
  return sites;
}

/**
 * Every code the command layer hands to `error_json`, pinned.
 *
 * Out of scope on purpose, each covered by its own test:
 * - `error_json_from_provider_error`'s dynamic arms (`API_ERROR_<status>`,
 *   `NETWORK_ERROR`, `DOWNLOAD_TOO_LARGE`, `INTERNAL_ERROR`);
 * - the bare `RECOVERY_*` / `BACKUP_*` family, pinned by `recovery.rs`'s own
 *   `MAPPED_RECOVERY_CODES` assertion.
 *
 * Adding a code here is a contract change: give it a CSD §10.2 catalog row with
 * a user action (CSD §10.3), or it is a code no UI can act on.
 */
const EXPECTED_ENVELOPE_CODES = [
  'DATABASE_ERROR',
  'FILESYSTEM_ERROR',
  'INVALID_IMAGE',
  'INVALID_INPUT',
  'INVALID_PATH',
  // Not in the CSD §10.2 catalog, which spells its catch-all `UNKNOWN`. Both
  // exist on the wire; reconciling them is a catalog decision, so the code is
  // pinned as-is rather than silently renamed to hide the divergence.
  'INTERNAL_ERROR',
  'KEYCHAIN_ERROR',
  'MISSING_API_KEY',
  'OS_ERROR',
  'SERIALIZATION_ERROR',
  'SNAPSHOT_ERROR',
];

describe('IPC envelope codes (CSD §7.2, §10.2)', () => {
  it('emits exactly the pinned set of error_json codes', () => {
    const emitted = emittedEnvelopeCodes();
    const actual = [...emitted.keys()].sort();
    const expected = [...EXPECTED_ENVELOPE_CODES].sort();
    const added = actual.filter((code) => !expected.includes(code));
    const removed = expected.filter((code) => !actual.includes(code));
    expect(
      { added, removed },
      `error_json vocabulary changed. ADDED: ${added.join(', ') || '(none)'} — give each a CSD §10.2 row and a §10.3 user action, then add it here. REMOVED: ${removed.join(', ') || '(none)'} — retarget the CSD row or the replacement code.`,
    ).toEqual({ added: [], removed: [] });
  });

  it('never reintroduces the undocumented duplicate names', () => {
    // The two names this test was written to kill. Kept as explicit assertions
    // so a regression reads as "use DATABASE_ERROR", not just a set diff.
    const codes = new Set(emittedEnvelopeCodes().keys());
    expect(codes.has('DB_ERROR'), 'use DATABASE_ERROR (CSD §10.2)').toBe(false);
    expect(codes.has('FS_ERROR'), 'use FILESYSTEM_ERROR (CSD §10.2)').toBe(false);
  });
});

// ─── Event contract (IPC-07 / CTR-06) ───
//
// Defect class prevented: a renamed event on either side of the seam. Events
// are the second IPC surface (invoke is the first) and were the last one with
// no shared definition — `emit("task-progress", …)` and
// `onEvent('task-progress', …)` were independent string literals, so a typo
// compiled clean and simply stopped delivering progress with no error anywhere.
//
// `commands/events.rs` owns the names; `src/lib/tauri.ts`'s `AppEventName`
// must list exactly those, and `AppEventPayloads` must give each a payload type
// (a name without an entry would type its handler argument as `never`).

describe('IPC event contract (IPC-07)', () => {
  const rustEventNames = (): string[] => {
    const values: string[] = [];
    for (const [path, source] of Object.entries(rustSources)) {
      if (!path.endsWith('/commands/events.rs')) continue;
      for (const match of source.matchAll(/pub const \w+: &str = "([^"]+)";/g)) {
        values.push(match[1] ?? '');
      }
    }
    return values.sort();
  };

  it('AppEventName lists exactly the Rust event names', () => {
    const rustNames = rustEventNames();
    expect(rustNames.length, 'no event constants found in commands/events.rs').toBeGreaterThan(0);
    const tsNames = [...extractTsUnion(tauriSource, 'AppEventName')].sort();
    expect(
      tsNames,
      `AppEventName drifted from src-tauri/src/commands/events.rs. Rust: ${rustNames.join(', ') || '(none)'} — TypeScript: ${tsNames.join(', ') || '(none)'}`,
    ).toEqual(rustNames);
  });

  it('AppEventPayloads types every event a listener can subscribe to', () => {
    for (const name of extractTsUnion(tauriSource, 'AppEventName')) {
      expect(tauriSource, `AppEventPayloads is missing '${name}'`).toContain(`'${name}':`);
    }
  });
});

describe('guardrail robustness (line endings)', () => {
  it('reads struct attributes from a CRLF working tree', () => {
    // Regression, 2026-11-23. Under CRLF a blank line is `\r\n\r\n`, so
    // `preceding.lastIndexOf('\n\n')` returned -1 and `.slice(-1)` produced a
    // ONE-CHARACTER attribute block: `rename_all` was invisible, every field
    // came back snake_case, and the SaveCompletedTaskArgs parity test failed
    // for the wrong reason.
    //
    // Restoring LF in the working tree is NOT sufficient protection: git
    // normalises on checkout, but a tree can be CRLF anyway — this repo's own
    // `src-tauri/migrations/001_initial.sql` is. So the parser must be tested
    // against CRLF input, or the same false failure returns the next time
    // anyone touches these files from Windows.
    const crlf = commandsAssetsSource.replace(/\r?\n/g, '\r\n');
    expect(crlf).not.toBe(commandsAssetsSource);

    const fromLf = rustWireFields(commandsAssetsSource, 'SaveCompletedTaskArgs');
    const fromCrlf = rustWireFields(crlf, 'SaveCompletedTaskArgs');

    expect([...fromCrlf.keys()]).toEqual([...fromLf.keys()]);
    expect([...fromLf.keys()]).toContain('taskId');
    expect([...fromLf.keys()]).not.toContain('task_id');
  });
});
