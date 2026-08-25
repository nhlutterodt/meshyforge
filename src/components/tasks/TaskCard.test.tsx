// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import type { ActiveTask } from '@lib/meshy-types';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/tauri', () => ({
  invoke: vi.fn(),
  onEvent: vi.fn(),
  assetUrl: vi.fn((p: string) => p),
}));

const removeTaskMock = vi.fn();

vi.mock('@stores/taskStore', () => ({
  useTaskStore: vi.fn((selector: (s: { removeTask: typeof removeTaskMock }) => unknown) =>
    selector({ removeTask: removeTaskMock }),
  ),
}));

import { TaskCard } from '@components/tasks/TaskCard';

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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TaskCard', () => {
  beforeEach(() => {
    removeTaskMock.mockReset();
  });

  // TC-TASK-01-01: submitting form adds task card with pending status and zero progress
  it('renders a pending task card with PENDING badge and 0% progress', () => {
    render(<TaskCard task={makeTask({ status: 'PENDING', progress: 0 })} />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  // TC-TASK-01-02: status change to in_progress updates progress bar and badge color
  it('renders an in-progress task card with IN_PROGRESS badge and progress percentage', () => {
    render(<TaskCard task={makeTask({ status: 'IN_PROGRESS', progress: 42 })} />);

    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  // TC-TASK-01-03: terminal status shows 100% progress
  it('renders a succeeded task card with SUCCEEDED badge and 100% progress', () => {
    render(<TaskCard task={makeTask({ status: 'SUCCEEDED', progress: 100 })} />);

    expect(screen.getByText('SUCCEEDED')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders a failed task card with FAILED badge and error message', () => {
    render(
      <TaskCard
        task={makeTask({ status: 'FAILED', progress: 50, error: 'Insufficient credits' })}
      />,
    );

    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('Insufficient credits')).toBeInTheDocument();
  });

  // TC-TASK-04-01 / TC-TASK-04-02: remove button removes the task from the store
  // (The component implements a remove (X) button rather than a cancel-with-confirmation
  // dialog. The remove action is the store-side analog of cancel.)
  it('calls removeTask when the remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskCard task={makeTask({ taskId: 'task-abc' })} />);

    await user.click(screen.getByRole('button', { name: /remove task from monitor/i }));

    expect(removeTaskMock).toHaveBeenCalledTimes(1);
    expect(removeTaskMock).toHaveBeenCalledWith('task-abc');
  });

  it('renders a canceled task card with CANCELED badge', () => {
    render(<TaskCard task={makeTask({ status: 'CANCELED', progress: 100 })} />);

    expect(screen.getByText('CANCELED')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
