// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

vi.mock('sonner', () => {
  const toastFn = vi.fn();
  return {
    toast: Object.assign(toastFn, {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    }),
  };
});

const mocks = vi.hoisted(() => ({
  useCreateMultiColorPrint: vi.fn(),
  useCreateAnalyzePrintability: vi.fn(),
  useCreateRepairPrintability: vi.fn(),
  multiColorMutate: vi.fn(),
  analyzeMutate: vi.fn(),
  repairMutate: vi.fn(),
}));

vi.mock('@hooks/useMeshyApi', () => ({
  useCreateMultiColorPrint: mocks.useCreateMultiColorPrint,
  useCreateAnalyzePrintability: mocks.useCreateAnalyzePrintability,
  useCreateRepairPrintability: mocks.useCreateRepairPrintability,
}));

import { PrintPanel } from '@components/generate/PrintPanel';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useCreateMultiColorPrint.mockReturnValue({
    mutate: mocks.multiColorMutate,
    isPending: false,
  });
  mocks.useCreateAnalyzePrintability.mockReturnValue({
    mutate: mocks.analyzeMutate,
    isPending: false,
  });
  mocks.useCreateRepairPrintability.mockReturnValue({
    mutate: mocks.repairMutate,
    isPending: false,
  });
});

describe('PrintPanel — TC-PRINT (3D Print Tools)', () => {
  it('TC-PRINT-01: multi-color tab posts request with input task id and max colors', async () => {
    const user = userEvent.setup();
    render(<PrintPanel />);

    await user.type(screen.getByLabelText('Input Task ID'), 'task-print-123');
    await user.click(screen.getByRole('button', { name: /create multi-color print/i }));

    expect(mocks.multiColorMutate).toHaveBeenCalledTimes(1);
    expect(mocks.multiColorMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTaskId: 'task-print-123',
        maxColors: 4,
      }),
      expect.any(Object),
    );
  });

  it('TC-PRINT-02: analyze tab posts to analyze endpoint', async () => {
    const user = userEvent.setup();
    render(<PrintPanel />);

    await user.type(screen.getByLabelText('Input Task ID'), 'task-print-456');
    await user.click(screen.getByRole('tab', { name: /analyze/i }));
    await user.click(screen.getByRole('button', { name: /analyze printability/i }));

    expect(mocks.analyzeMutate).toHaveBeenCalledWith(
      expect.objectContaining({ inputTaskId: 'task-print-456' }),
      expect.any(Object),
    );
  });

  it('TC-PRINT-03: repair tab posts to repair endpoint', async () => {
    const user = userEvent.setup();
    render(<PrintPanel />);

    await user.type(screen.getByLabelText('Input Task ID'), 'task-print-789');
    await user.click(screen.getByRole('tab', { name: /repair/i }));
    await user.click(screen.getByRole('button', { name: /repair model/i }));

    expect(mocks.repairMutate).toHaveBeenCalledWith(
      expect.objectContaining({ inputTaskId: 'task-print-789' }),
      expect.any(Object),
    );
  });
});
