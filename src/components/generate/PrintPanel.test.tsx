// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen, within } from '@testing-library/react';
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
  useAssets: vi.fn(),
  useTaskPolling: vi.fn(),
}));

vi.mock('@hooks/useMeshyApi', () => ({
  useCreateMultiColorPrint: mocks.useCreateMultiColorPrint,
  useCreateAnalyzePrintability: mocks.useCreateAnalyzePrintability,
  useCreateRepairPrintability: mocks.useCreateRepairPrintability,
}));

vi.mock('@hooks/useAssets', () => ({
  useAssets: mocks.useAssets,
}));

vi.mock('@hooks/useTaskPolling', () => ({
  useTaskPolling: mocks.useTaskPolling,
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
  mocks.useAssets.mockReturnValue({ data: [] });
  mocks.useTaskPolling.mockReturnValue({ data: undefined, isFetching: false });
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

  it('TC-PRINT-04: analyze tab shows the free credit cost estimate', async () => {
    const user = userEvent.setup();
    render(<PrintPanel />);

    await user.click(screen.getByRole('tab', { name: /analyze/i }));

    expect(screen.getByText('Cost: Free — no credits consumed')).toBeInTheDocument();
  });

  it('TC-PRINT-05: analyze tab renders the printability report once the task succeeds', async () => {
    const user = userEvent.setup();
    mocks.analyzeMutate.mockImplementation(
      (_body: unknown, options: { onSuccess: (data: { result: string }) => void }) => {
        options.onSuccess({ result: 'analyze-task-1' });
      },
    );
    mocks.useTaskPolling.mockReturnValue({
      data: {
        status: 'SUCCEEDED',
        printability_status: 'warning',
        issue_count: 3,
        watertight: false,
        volume: 12.5,
        non_manifold_edge_count: 2,
        degenerate_face_count: 1,
        hole_count: 4,
      },
      isFetching: false,
    });

    render(<PrintPanel />);

    await user.type(screen.getByLabelText('Input Task ID'), 'task-print-999');
    await user.click(screen.getByRole('tab', { name: /analyze/i }));
    await user.click(screen.getByRole('button', { name: /analyze printability/i }));

    const report = screen.getByTestId('printability-report');
    expect(within(report).getByText('warning')).toBeInTheDocument();
    expect(within(report).getByText('3')).toBeInTheDocument();
    expect(within(report).getByText('No')).toBeInTheDocument();
    expect(within(report).getByText('12.5')).toBeInTheDocument();
  });

  it('TC-PRINT-06: analyze tab shows an error message when the task fails', async () => {
    const user = userEvent.setup();
    mocks.analyzeMutate.mockImplementation(
      (_body: unknown, options: { onSuccess: (data: { result: string }) => void }) => {
        options.onSuccess({ result: 'analyze-task-2' });
      },
    );
    mocks.useTaskPolling.mockReturnValue({
      data: { status: 'FAILED', task_error: { message: 'Mesh could not be parsed' } },
      isFetching: false,
    });

    render(<PrintPanel />);

    await user.type(screen.getByLabelText('Input Task ID'), 'task-print-998');
    await user.click(screen.getByRole('tab', { name: /analyze/i }));
    await user.click(screen.getByRole('button', { name: /analyze printability/i }));

    expect(screen.getByText(/Analysis failed: Mesh could not be parsed/)).toBeInTheDocument();
  });

  it('TC-PRINT-07: repair tab shows the texture-removal warning and credit cost', async () => {
    const user = userEvent.setup();
    render(<PrintPanel />);

    await user.click(screen.getByRole('tab', { name: /repair/i }));

    expect(
      screen.getByText(
        'Existing textures are removed during repair. Use Retexture to add them back.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Cost: 10 credits')).toBeInTheDocument();
  });
});
