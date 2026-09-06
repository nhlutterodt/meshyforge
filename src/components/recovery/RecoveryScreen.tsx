import { Button } from '@components/ui/button';
import { invoke } from '@lib/tauri';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export interface RecoveryStatus {
  readonly state: 'Normal' | 'RecoveryRequired' | 'RecoveryInProgress' | 'RecoveryFailed';
  readonly backupIds: readonly string[];
  readonly quarantineExists: boolean;
  readonly failureCode: string | null;
}

interface RecoveryScreenProps {
  readonly status: RecoveryStatus;
}

export function RecoveryScreen({ status }: RecoveryScreenProps) {
  const [selectedBackup, setSelectedBackup] = useState(status.backupIds[0] ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRestore() {
    if (!selectedBackup) return;
    setIsSubmitting(true);
    try {
      await invoke('request_recovery_restore', { backupId: selectedBackup });
    } catch {
      setIsSubmitting(false);
    }
  }

  const failed = status.state === 'RecoveryFailed';

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-start gap-4">
          {failed ? (
            <AlertTriangle className="mt-1 h-7 w-7 shrink-0 text-destructive" aria-hidden="true" />
          ) : (
            <ShieldCheck className="mt-1 h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Database recovery</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              MeshyForge found a problem with its local asset history. Your downloaded model files
              are not modified by this recovery process.
            </p>
          </div>
        </div>

        {failed && status.failureCode ? (
          <p className="mb-5 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Recovery did not complete: {status.failureCode}.
          </p>
        ) : null}

        {status.quarantineExists ? (
          <p className="mb-5 text-sm text-muted-foreground">
            A preserved recovery copy is available for diagnosis.
          </p>
        ) : null}

        {status.backupIds.length > 0 ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="recovery-backup">
              Select a verified backup
            </label>
            <select
              id="recovery-backup"
              className="w-full border border-input bg-background px-3 py-2 text-sm"
              value={selectedBackup}
              onChange={(event) => setSelectedBackup(event.target.value)}
              disabled={isSubmitting}
            >
              {status.backupIds.map((backupId) => (
                <option key={backupId} value={backupId}>
                  {backupId}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Restoring replaces the local database with the selected verified snapshot and restarts
              MeshyForge.
            </p>
            <Button
              type="button"
              onClick={handleRestore}
              disabled={!selectedBackup || isSubmitting}
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Restarting for recovery...' : 'Restore and restart'}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No verified backup is currently available. The preserved recovery evidence can be
            reviewed without modifying your downloaded assets.
          </p>
        )}
      </section>
    </main>
  );
}
