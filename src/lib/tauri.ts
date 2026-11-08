// src/lib/tauri.ts
// This is the ONLY file that imports from @tauri-apps/api/core.
// All other files import from this module.

import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { type UnlistenFn, listen } from '@tauri-apps/api/event';

// ─── Typed Error ─────────────────────────────────────────────
export interface FrontendError {
  code: string; // "API_ERROR_402" | "NETWORK_ERROR" | "MISSING_API_KEY" | etc.
  message: string; // Human-readable error message
  details?: unknown; // Additional context (HTTP body, endpoint, etc.)
}

// ─── Error Parser ────────────────────────────────────────────
function parseError(error: unknown): FrontendError {
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error);
      return {
        code: parsed.code ?? 'UNKNOWN',
        message: parsed.message ?? error,
        details: parsed.details,
      };
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
  // ─── Recovery commands
  | 'recovery_status'
  | 'request_recovery_restore'
  // ─── API commands (Phase 1)
  | 'get_credit_balance'
  | 'fetch_animation_library'
  | 'cache_animation_preview'
  // ─── Asset commands (Phase 1)
  | 'get_all_assets'
  | 'search_assets'
  | 'update_tags'
  | 'toggle_favorite'
  | 'update_notes'
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

// ─── Event Listener ──────────────────────────────────────────
export function onEvent<T>(event: string, handler: (payload: T) => void): Promise<UnlistenFn> {
  return listen<T>(event, (e) => handler(e.payload));
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
