import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds before refetch on focus
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
      retry: 1, // Retry failed queries once
      refetchOnWindowFocus: true, // Refresh balance on focus
    },
    mutations: {
      retry: 0, // Don't retry mutations (user action)
    },
  },
});

// Only enable devtools in development
const enableDevtools = import.meta.env.DEV;

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {enableDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>,
);
