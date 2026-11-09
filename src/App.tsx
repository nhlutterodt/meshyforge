import { Layout } from '@app/layout';
import { Routes } from '@app/routes';
import { RecoveryScreen } from '@components/recovery/RecoveryScreen';
import { Toaster } from '@components/ui/sonner';
import { useRecovery } from '@hooks/useRecovery';

export default function App() {
  // Startup recovery read lives in the hook: `status` stays null while the
  // query is pending (so nothing renders yet) and falls back to the Normal
  // state if the read fails, exactly as the previous inline effect did.
  const { status: recoveryStatus } = useRecovery();

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
