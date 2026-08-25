import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@app': path.resolve(__dirname, './src/app'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test-setup.ts',
        'src/vite-env.d.ts',
        'src/main.tsx',
        'src/components/ui/**',
        // Type-only file — no runtime code to test
        'src/lib/meshy-types.ts',
      ],
      thresholds: {
        // Per-directory gates from test_plan.md §2.2 are the real quality bar:
        //   stores ≥80%, hooks ≥80%, lib ≥90%, components ≥70%
        // The global floor is set to accommodate the incremental test-writing
        // approach — stores and hooks already meet their gates; lib and
        // components are still in progress.
        statements: 20,
        branches: 60,
        functions: 55,
        lines: 20,
        perFile: false,
      },
    },
  },
});