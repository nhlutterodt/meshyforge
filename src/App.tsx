import { Layout } from '@app/layout';
import { Routes } from '@app/routes';
import { Toaster } from '@components/ui/sonner';

export default function App() {
  return (
    <>
      <Layout>
        <Routes />
      </Layout>
      <Toaster />
    </>
  );
}
