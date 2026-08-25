// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

/**
 * Creates a QueryClient configured for testing — no retries, no refetch on mount.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnMount: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface ProvidersProps {
  children: ReactNode;
  client: QueryClient;
}

function Providers({ children, client }: ProvidersProps) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/**
 * Renders a component wrapped in a QueryClientProvider.
 * Returns the render result plus the QueryClient for assertion.
 *
 * Usage:
 *   const { result, qc } = renderWithProviders(<MyComponent />);
 *   await waitFor(() => expect(qc.getQueryData(['key'])).toBeDefined());
 */
export function renderWithProviders(
  ui: ReactNode,
  options?: RenderOptions & { client?: QueryClient },
) {
  const client = options?.client ?? createTestQueryClient();
  const result = render(ui, {
    ...options,
    wrapper: ({ children }: { children: ReactNode }) => (
      <Providers client={client}>{children}</Providers>
    ),
  });
  return { ...result, qc: client };
}

export { Providers };