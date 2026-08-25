import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
  // Tauri expects a fixed port for dev server
  server: {
    port: 1420,
    strictPort: true,
    // Tauri dev server proxy not needed — Rust handles all HTTP
    watch: {
      // Exclude src-tauri/target from Vite's file watcher to prevent
      // EBUSY errors on Windows when cargo locks the .exe during build.
      ignored: ['**/src-tauri/target/**'],
    },
  },
  // Tauri uses CSP; inline styles must be allowed
  css: {
    devSourcemap: true,
  },
  optimizeDeps: {
    // Norton heuristically flags Vite's generated monolithic Drei prebundle.
    exclude: ['@react-three/drei'],
  },
  build: {
    target: 'esnext', // Tauri webview supports modern JS
    sourcemap: false, // Disable for production (smaller bundle)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
  },
});