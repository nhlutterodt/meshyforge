// src/lib/tauri.ts
// This is the ONLY file that imports from @tauri-apps/api/core, the Tauri
// event API, or the Tauri plugins (dialog, shell). All other files import
// from this module.

import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { type UnlistenFn, listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import { open as openShell } from '@tauri-apps/plugin-shell';
import type { TaskSnapshot } from './meshy-types';

// ─── Typed Error ─────────────────────────────────────────────
// CSD §7.2 defines the IPC error envelope as exactly two fields:
// `{ code, message }`. There is no `details` field — this parser used to read
// one that no Rust producer ever wrote, so that branch is removed rather than
// left dangling. Adding a third field is a documented contract change: update
// the envelope in `src-tauri/src/commands/error.rs`, CSD §7.2, and this type
// together. `ipc-contract.guardrail.test.ts` pins the two-field shape.
//
// `code` stays `string` on purpose. The full backend vocabulary spans the
// recovery/backup families plus dynamic `API_ERROR_<status>` values, so a
// closed union here would either be a large speculative surface or silently
// downgrade any code it failed to list — the opposite of what this module is
// for. The codes the UI is expected to *act* on are the CSD §10.2 catalog, and
// the guardrail test pins the envelope codes the command layer actually emits,
// so a rename on the Rust side fails CI instead of falling through to the
// generic branch at runtime.
export interface FrontendError {
  code: string; // CSD §10.2 catalog, e.g. "MISSING_API_KEY" | "API_ERROR_402"
  message: string; // Human-readable, already sanitized by Rust (IPC-06)
}

// ─── Error Parser ────────────────────────────────────────────
function parseError(error: unknown): FrontendError {
  if (typeof error === 'string') {
    try {
      const parsed: unknown = JSON.parse(error);
      if (typeof parsed === 'object' && parsed !== null) {
        const envelope = parsed as { code?: unknown; message?: unknown };
        return {
          code: typeof envelope.code === 'string' ? envelope.code : 'UNKNOWN',
          message: typeof envelope.message === 'string' ? envelope.message : error,
        };
      }
      return { code: 'UNKNOWN', message: error };
    } catch {
      return { code: 'UNKNOWN', message: error };
    }
  }
  return { code: 'UNKNOWN', message: 'An unknown error occurred' };
}

// ─── Command Registry ────────────────────────────────────────
// Every command registered in a `tauri::generate_handler![...]` block in
// src-tauri/src/lib.rs (normal builder and recovery builder). Calling an
// invoke name that is not in this union must fail `npm run type-check` and
// src/lib/ipc-contract.guardrail.test.ts — not the runtime.
// If you add or remove a Rust command, update this union in the same commit.
export type CommandName =
  // ─── Keychain commands (Phase 1)
  | 'set_api_key'
  | 'get_api_key'
  | 'validate_api_key'
  | 'delete_api_key'
  // ─── Settings commands
  | 'get_setting'
  | 'set_setting'
  // ─── Recovery commands
  | 'recovery_status'
  | 'request_recovery_restore'
  // ─── API commands (Phase 1)
  | 'get_credit_balance'
  | 'fetch_animation_library'
  | 'cache_animation_preview'
  // ─── Asset commands (Phase 1)
  | 'list_assets_page'
  | 'search_assets_page'
  | 'get_all_tags'
  | 'update_tags'
  | 'toggle_favorite'
  | 'update_notes'
  | 'update_asset_rights'
  | 'delete_asset'
  | 'get_storage_usage'
  | 'reveal_in_file_manager'
  | 'export_asset'
  | 'read_file_as_data_uri'
  | 'save_completed_task'
  // ─── Task commands (Phase 3)
  | 'create_text_to_3d'
  | 'create_image_to_3d'
  | 'create_multi_image_to_3d'
  | 'create_remesh'
  | 'create_retexture'
  | 'create_convert'
  | 'create_resize'
  | 'create_uv_unwrap'
  | 'create_rigging'
  | 'create_animation'
  | 'create_text_to_motion'
  | 'create_text_to_image'
  | 'create_image_to_image'
  | 'create_multi_color_print'
  | 'create_analyze_printability'
  | 'create_repair_printability'
  | 'create_creative_lab'
  | 'poll_task'
  | 'stream_task'
  | 'delete_task'
  | 'download_asset';

// ─── Typed Invoke ────────────────────────────────────────────
export async function invoke<T>(command: CommandName, args?: Record<string, unknown>): Promise<T> {
  try {
    return await tauriInvoke<T>(command, args);
  } catch (error) {
    throw parseError(error);
  }
}

// ─── Event Contract ─────────────────────────────────────────
// Source: IPC-07 / CTR-06. Event names and payloads are defined once, here,
// and mirrored from `src-tauri/src/commands/events.rs`. The guardrail test
// pins the two sets together, so renaming an event on either side fails CI
// instead of silently stopping delivery at runtime.
//
// Why a payload map instead of the former generic `<T>`: with `onEvent<T>` the
// caller asserted its own payload type, so a wrong assertion compiled clean and
// read `undefined` at runtime. Keyed by event name, the payload type comes from
// the contract rather than from the call site.

/** Every event a command emits. Mirrors `commands::events`' `&str` constants. */
export type AppEventName = 'task-progress' | 'task-complete';

/** Payload of `task-complete`. Mirrors `commands::events::TaskCompletePayload`. */
export interface TaskCompletePayload {
  taskId: string;
  status: string;
}

export interface AppEventPayloads {
  'task-progress': TaskSnapshot;
  'task-complete': TaskCompletePayload;
}

// ─── Event Listener ──────────────────────────────────────────
export function onEvent<K extends AppEventName>(
  event: K,
  handler: (payload: AppEventPayloads[K]) => void,
): Promise<UnlistenFn> {
  return listen<AppEventPayloads[K]>(event, (e) => handler(e.payload));
}

// ─── Native File Dialog ──────────────────────────────────────
// The only place the frontend may reach the Tauri dialog plugin. There is no
// `open_dialog` Rust command: opening a picker is a pure plugin call, so it
// must not be routed through invoke(). Capability `dialog:allow-open` grants
// this in src-tauri/capabilities/default.json.
export async function openFileDialog(options: {
  filters?: Array<{ name: string; extensions: string[] }>;
  multiple?: boolean;
}): Promise<string | string[] | null> {
  return open(options);
}

export async function saveFileDialog(options: {
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}): Promise<string | null> {
  return save(options);
}

// ─── External URL ────────────────────────────────────────────
// The only place the frontend may reach the shell plugin. Like the dialogs,
// opening a URL is a pure plugin call rather than an `invoke()`, so it belongs
// at the boundary instead of becoming a Rust command. Capability
// `shell:allow-open` grants it in src-tauri/capabilities/default.json.
//
// https-only: nothing in this app has a legitimate reason to hand the OS a
// `file:`/`javascript:`/custom-scheme URL, and a future caller should not be
// able to turn this helper into one.
export async function openExternalUrl(url: string): Promise<void> {
  if (!/^https:\/\//i.test(url)) {
    throw new Error('Only https URLs may be opened externally.');
  }
  await openShell(url);
}

// ─── File Source Converter ───────────────────────────────────
// Convert a local file path to a Tauri asset:// URL for use in <img>/3D.
// Remote URLs (http/https/data) are passed through unchanged —
// convertFileSrc would mangle them into invalid asset.localhost paths.
export function assetUrl(filePath: string): string {
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('data:')
  ) {
    return filePath;
  }
  return convertFileSrc(filePath);
}
