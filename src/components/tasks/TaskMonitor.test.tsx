// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ActiveTask } from '@lib/meshy-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

// Stub the polling hook so no real intervals/Tauri calls fire.
vi.mock('@hooks/useActiveTaskPolling', () => ({
  useActiveTaskPolling: vi.fn(),
}));

const clearCompletedMock = vi.fn();
let storeTasks: Map<string, ActiveTask> = new Map();

vi.mock('@stores/taskStore', () => ({
  useTaskStore: vi.fn(
    (selector: (s: { activeTasks: Map<string, ActiveTask>; clearCompleted: typeof clearCompletedMock }) => unknown) =>
      selector({ activeTasks: storeTasks, clearCompleted: clearCompletedMock }),
  ),
}));

import { TaskMonitor } from '@components/tasks/TaskMonitor';

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

describe('TaskMonitor', () => {
  beforeEach(() => {
    clearCompletedMock.mockReset();
  });

  it('shows the empty state message when there are no tasks', () => {
    setTasks([]);
    render(<TaskMonitor />);

    expect(screen.getByText('No active tasks')).toBeInTheDocument();
  });

  it('renders active task cards for PENDING and IN_PROGRESS tasks', () => {
    setTasks([
      makeTask({ taskId: 't1', label: 'Pending Task', status: 'PENDING', progress: 0 }),
      makeTask({ taskId: 't2', label: 'Running Task', status: 'IN_PROGRESS', progress: 50 }),
    ]);
    render(<TaskMonitor />);

    expect(screen.getByText('Pending Task')).toBeInTheDocument();
    expect(screen.getByText('Running Task')).toBeInTheDocument();
    expect(screen.getByText('Active (2)')).toBeInTheDocument();
  });

  // TC-TASK-06-01: completed tasks move to history with label, status, credits, timestamp
  it('moves completed tasks to the history section with label and status', () => {
    setTasks([
      makeTask({ taskId: 't1', label: 'Running Task', status: 'IN_PROGRESS', progress: 50 }),
      makeTask({
        taskId: 't2',
        label: 'Finished Dragon',
        status: 'SUCCEEDED',
        progress: 100,
        startedAt: Date.now() - 60_000,
      }),
    ]);
    render(<TaskMonitor />);

    // Active task visible in the active section
    expect(screen.getByText('Running Task')).toBeInTheDocument();
    // Completed task visible in the history ("Recent") section
    expect(screen.getByText('Finished Dragon')).toBeInTheDocument();
    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getAllByText('SUCCEEDED').length).toBeGreaterThan(0);
  });

  // TC-TASK-06-02: clear done removes terminal tasks from store but keeps SQLite
  it('calls clearCompleted when the Clear Finished button is clicked', async () => {
    const user = userEvent.setup();
    setTasks([
      makeTask({ taskId: 't1', label: 'Running', status: 'IN_PROGRESS', progress: 50 }),
      makeTask({ taskId: 't2', label: 'Done', status: 'SUCCEEDED', progress: 100 }),
      makeTask({ taskId: 't3', label: 'Failed', status: 'FAILED', progress: 100 }),
    ]);
    render(<TaskMonitor />);

    const clearButton = screen.getByRole('button', { name: /clear finished/i });
    expect(clearButton).toHaveTextContent('Clear Finished (2)');

    await user.click(clearButton);

    expect(clearCompletedMock).toHaveBeenCalledTimes(1);
  });

  it('does not show the Clear Finished button when there are no completed tasks', () => {
    setTasks([makeTask({ taskId: 't1', label: 'Running', status: 'IN_PROGRESS', progress: 50 })]);
    render(<TaskMonitor />);

    expect(screen.queryByRole('button', { name: /clear finished/i })).not.toBeInTheDocument();
  });
});