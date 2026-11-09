// useReadImageFile.test.tsx — hook-level coverage for FRD FR-GEN-04/05

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReadImageFile } from './useReadImageFile';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@lib/tauri';

describe('useReadImageFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the data URI produced by read_file_as_data_uri', async () => {
    vi.mocked(invoke).mockResolvedValue('data:image/png;base64,AAAA');
    const { result } = renderHook(() => useReadImageFile());

    let dataUri: string | undefined;
    await act(async () => {
      dataUri = await result.current.readFileAsDataUri('C:/imgs/a.png');
    });

    expect(dataUri).toBe('data:image/png;base64,AAAA');
    expect(invoke).toHaveBeenCalledWith('read_file_as_data_uri', { path: 'C:/imgs/a.png' });
    expect(result.current.error).toBeNull();
    expect(result.current.isReading).toBe(false);
  });

  it('surfaces the parsed FrontendError when the command fails', async () => {
    vi.mocked(invoke).mockRejectedValue({ code: 'FILE_NOT_FOUND', message: 'No such file' });
    const { result } = renderHook(() => useReadImageFile());

    let rejection: unknown;
    await act(async () => {
      rejection = await result.current.readFileAsDataUri('C:/missing.png').catch((e) => e);
    });

    expect(rejection).toEqual({ code: 'FILE_NOT_FOUND', message: 'No such file' });
    await waitFor(() => expect(result.current.error?.code).toBe('FILE_NOT_FOUND'));
    expect(result.current.isReading).toBe(false);
  });

  it('normalises a non-FrontendError rejection', async () => {
    vi.mocked(invoke).mockRejectedValue('boom');
    const { result } = renderHook(() => useReadImageFile());

    let rejection: unknown;
    await act(async () => {
      rejection = await result.current.readFileAsDataUri('C:/x.png').catch((e) => e);
    });

    expect(rejection).toEqual({ code: 'UNKNOWN', message: 'Failed to read image file' });
    await waitFor(() => expect(result.current.error?.code).toBe('UNKNOWN'));
  });

  it('clears a remembered error via clearError and after a later success', async () => {
    vi.mocked(invoke).mockRejectedValue({ code: 'X', message: 'bad' });
    const { result } = renderHook(() => useReadImageFile());

    await act(async () => {
      await result.current.readFileAsDataUri('C:/bad.png').catch(() => undefined);
    });
    await waitFor(() => expect(result.current.error).not.toBeNull());

    await act(async () => {
      result.current.clearError();
    });
    expect(result.current.error).toBeNull();

    vi.mocked(invoke).mockResolvedValue('data:,ok');
    await act(async () => {
      await result.current.readFileAsDataUri('C:/good.png');
    });
    expect(result.current.error).toBeNull();
  });
});
