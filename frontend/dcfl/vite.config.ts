import { defineConfig } from 'vite';
import { resolve } from 'path';

// En development el frontend corre en dcfl.localhost (via Nginx) o en localhost:5173 (nativo).
// No hay proxy — el frontend llama directamente a api.localhost/dcfl/* vía URL absoluta.
// El HMR de Vite se configura para funcionar a través de Nginx (host: dcfl.localhost, port: 80).

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      // @core apunta a frontend/core/src — funciona tanto local como en Docker
      // (en Docker, frontend/ se monta en /app-frontend/ → ../core/src resuelve igual)
      '@core': resolve(__dirname, '../core/src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    hmr: mode === 'development'
      ? {
          // clientPort=80 le dice al cliente (navegador) que conecte el WebSocket
          // a puerto 80 (Nginx), que lo proxea al contenedor en :5173.
          // NO se setea host — el cliente usa automáticamente el hostname de la página
          // (dcfl.localhost), y el servidor no intenta resolver ese nombre dentro del
          // contenedor donde no existe en DNS.
          clientPort: 80,
          protocol: 'ws',
        }
      : undefined,
    // usePolling evita eventos inotify espurios en Windows + Docker Desktop
    // (los bind mounts generan falsos cambios que disparan recargas infinitas).
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
