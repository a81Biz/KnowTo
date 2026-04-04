import { defineConfig, loadEnv } from 'vite';

// En desarrollo el frontend está en :5173 y el backend en :8787.
// El proxy reenvía /api al backend local, de modo que si VITE_DEV_API_PORT
// no está definida el bundle funciona igualmente (usa el proxy como fallback).
//
// En producción no hay proxy — el frontend llama directamente a api.{dominio}
// según la lógica de resolución dinámica de endpoints.ts.

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devApiPort = env['VITE_DEV_API_PORT'] ?? '8787';

  return {
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${devApiPort}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
