import { defineConfig } from 'vite';
import { resolve } from 'path';

// Frontend CCE (EC0249 Consultoría) — cce.localhost (via Nginx) o localhost:5175 (nativo).
// Sin proxy — el frontend llama a api.localhost/cce/* vía URL absoluta resuelta en runtime.

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      '@core': resolve(__dirname, '../core/src'),
    },
  },
  server: {
    port: 5175,
    host: '0.0.0.0',
    hmr: mode === 'development'
      ? {
          clientPort: 80,
          protocol: 'ws',
        }
      : undefined,
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
}));
