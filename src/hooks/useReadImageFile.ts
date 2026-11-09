// src/hooks/useReadImageFile.ts
// Source: FRD FR-GEN-04/05, CSD §5
//
// Wraps the `read_file_as_data_uri` command so upload components do not invoke
// Tauri commands directly (frontend.md: "Components call application hooks, not
// Tauri commands directly").
//
// Deliberately an async-callback hook rather than a mutation: its callers are
// used inside forms that are rendered in tests without a QueryClientProvider,
// and the read is a one-shot local filesystem conversion, not cacheable data.
// `invoke` in src/lib/tauri.ts already parses command failures into
// FrontendError, so the rejection this hook propagates is typed.

import { type FrontendError, invoke } from '@lib/tauri';
import { useCallback, useState } from 'react';

export interface UseReadImageFileResult {
  /** Read a local image file and return it as a `data:` URI. Rejects with FrontendError. */
  readonly readFileAsDataUri: (path: string) => Promise<string>;
  /** The parsed error from the most recent failed read, or `null`. */
  readonly error: FrontendError | null;
  /** A read is currently in flight. */
  readonly isReading: boolean;
  /** Clear the remembered error. */
  readonly clearError: () => void;
}

function toFrontendError(caught: unknown): FrontendError {
  if (caught && typeof caught === 'object' && 'message' in caught && 'code' in caught) {
    return caught as FrontendError;
  }
  return { code: 'UNKNOWN', message: 'Failed to read image file' };
}

export function useReadImageFile(): UseReadImageFileResult {
  const [error, setError] = useState<FrontendError | null>(null);
  const [isReading, setIsReading] = useState(false);

  const readFileAsDataUri = useCallback(async (path: string) => {
    setIsReading(true);
    try {
      const dataUri = await invoke<string>('read_file_as_data_uri', { path });
      setError(null);
      return dataUri;
    } catch (caught) {
      const parsed = toFrontendError(caught);
      setError(parsed);
      throw parsed;
    } finally {
      setIsReading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { readFileAsDataUri, error, isReading, clearError };
}
