import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5174,
    host: '0.0.0.0',
    hmr: {
      clientPort: 80,
      protocol: 'ws',
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  build: {
    outDir: 'dist',
  },
});
