// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import type { ActiveTask } from '@lib/meshy-types';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

const creditBalanceMock = { isSuccess: false };
vi.mock('@hooks/useCreditBalance', () => ({
  useCreditBalance: vi.fn(() => creditBalanceMock),
}));

let storeTasks: Map<string, ActiveTask> = new Map();
vi.mock('@stores/taskStore', () => ({
  useTaskStore: vi.fn((selector: (s: { activeTasks: Map<string, ActiveTask> }) => unknown) =>
    selector({ activeTasks: storeTasks }),
  ),
}));

import { StatusBar } from '@components/common/StatusBar';

function makeTask(overrides: Partial<ActiveTask> = {}): ActiveTask {
  return {
    taskId: 'task-1',
    endpoint: 'create_text_to_3d',
    meshyType: 'text-to-3d-preview',
    status: 'PENDING',
    progress: 0,
    label: 'Test Task',
    startedAt: Date.now(),
    error: null,
    ...overrides,
  };
}

function setTasks(tasks: ActiveTask[]) {
  storeTasks = new Map(tasks.map((t) => [t.taskId, t]));
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  storeTasks = new Map();
});

describe('StatusBar', () => {
  beforeEach(() => {
    creditBalanceMock.isSuccess = false;
  });

  it('renders a footer element with the h-8 height class', () => {
    render(<StatusBar />);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('h-8');
  });

  // TC-EXP-05-01: displays total asset storage size
  it('displays the asset storage usage count', () => {
    render(<StatusBar />);

    // The component renders "0 assets" by default (storageUsage = 0).
    expect(screen.getByText(/assets/i)).toBeInTheDocument();
  });

  it('shows "No active tasks" when there are no active tasks', () => {
    setTasks([]);
    render(<StatusBar />);

    expect(screen.getByText('No active tasks')).toBeInTheDocument();
  });

  it('shows the active task count when tasks are pending or in progress', () => {
    setTasks([
      makeTask({ taskId: 't1', status: 'PENDING' }),
      makeTask({ taskId: 't2', status: 'IN_PROGRESS' }),
      makeTask({ taskId: 't3', status: 'SUCCEEDED' }),
    ]);
    render(<StatusBar />);

    expect(screen.getByText('2 active tasks')).toBeInTheDocument();
  });

  it('shows Connected when the credit balance query succeeds', () => {
    creditBalanceMock.isSuccess = true;
    render(<StatusBar />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows Not connected when the credit balance query is not successful', () => {
    creditBalanceMock.isSuccess = false;
    render(<StatusBar />);

    expect(screen.getByText('Not connected')).toBeInTheDocument();
  });
});
