// frontend/cce/e2e/playwright.config.ts
// Configuración de Playwright para el microsite CCE (EC0249 Consultoría Empresarial).
//
// Para ejecutar los tests:
//   npx playwright test --config=e2e/playwright.config.ts
//
// Pre-requisitos:
//   • Dev stack corriendo: docker compose up (api.localhost, cce.localhost)
//   • Token de desarrollo: dev-local-bypass (authMiddleware acepta en ENVIRONMENT=development)

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 30_000,
  retries: 1,
  workers: 1, // secuencial — el wizard tiene estado entre pasos

  use: {
    baseURL: 'http://localhost:5173',
    // Inyectar token en localStorage (bypassa el OAuth en desarrollo)
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:5173',
          localStorage: [
            { name: 'sb-access-token', value: 'dev-local-bypass' },
            { name: 'sb-refresh-token', value: 'dev-local-bypass' },
            { name: 'knowto_auth_token', value: 'dev-local-bypass' },
          ],
        },
      ],
    },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/report', open: 'never' }],
  ],

  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env['CI'],
    env: {
      VITE_API_BASE_URL: 'http://localhost:5173',
    },
  },
});
