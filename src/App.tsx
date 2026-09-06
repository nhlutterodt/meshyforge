import { Layout } from '@app/layout';
import { Routes } from '@app/routes';
import { RecoveryScreen, type RecoveryStatus } from '@components/recovery/RecoveryScreen';
import { Toaster } from '@components/ui/sonner';
import { invoke } from '@lib/tauri';
import { useEffect, useState } from 'react';

export default function App() {
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus | null>(null);

  useEffect(() => {
    void invoke<RecoveryStatus>('recovery_status')
      .then(setRecoveryStatus)
      .catch(() =>
        setRecoveryStatus({
          state: 'Normal',
          backupIds: [],
          quarantineExists: false,
          failureCode: null,
        }),
      );
  }, []);

  if (recoveryStatus?.state === 'RecoveryRequired' || recoveryStatus?.state === 'RecoveryFailed') {
    return <RecoveryScreen status={recoveryStatus} />;
  }

  if (!recoveryStatus) return null;

  return (
    <>
      <Layout>
        <Routes />
      </Layout>
      <Toaster />
    </>
  );
}
