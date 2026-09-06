import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecoveryScreen, type RecoveryStatus } from './RecoveryScreen';

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock('@lib/tauri', () => ({
  invoke: invokeMock,
}));

describe('RecoveryScreen', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue(undefined);
  });

  it('lists verified opaque backup identifiers without normal app chrome', () => {
    const status: RecoveryStatus = {
      state: 'RecoveryRequired',
      backupIds: ['backup-100.db', 'backup-200.db'],
      quarantineExists: true,
      failureCode: null,
    };

    render(<RecoveryScreen status={status} />);

    expect(screen.getByRole('heading', { name: 'Database recovery' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'backup-100.db' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'backup-200.db' })).toBeInTheDocument();
    expect(
      screen.getByText('A preserved recovery copy is available for diagnosis.'),
    ).toBeInTheDocument();
  });

  it('submits only the selected backup identifier', async () => {
    const status: RecoveryStatus = {
      state: 'RecoveryRequired',
      backupIds: ['backup-100.db', 'backup-200.db'],
      quarantineExists: false,
      failureCode: null,
    };

    render(<RecoveryScreen status={status} />);
    fireEvent.change(screen.getByLabelText('Select a verified backup'), {
      target: { value: 'backup-200.db' },
    });
    fireEvent.click(screen.getByRole('button', { name: /restore and restart/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('request_recovery_restore', {
        backupId: 'backup-200.db',
      });
    });
  });
});
