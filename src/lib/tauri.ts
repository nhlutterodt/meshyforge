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

// ─── Typed Invoke ────────────────────────────────────────────
export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
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
