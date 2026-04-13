// e2e/specs/01-auth.spec.ts — CCE
// Verifica que la página carga y muestra la pantalla de autenticación.
// En dev, el header de app solo aparece tras autenticarse (ver storage state en playwright.config.ts).

import { test, expect } from '@playwright/test';

test.describe('CCE — Autenticación y carga inicial', () => {
  test('la página principal carga correctamente', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/KnowTo|Consultoría|CCE/i);
  });

  test.describe('Sin sesión activa', () => {
    test('muestra la pantalla de login cuando no hay sesión', async ({ browser }) => {
      const context = await browser.newContext({ storageState: undefined, baseURL: 'http://localhost:5173' });
      // Inyectamos the token en el origen
      await context.addInitScript(() => {
        localStorage.setItem('disable_dev_bypass', 'true');
      });
      const page = await context.newPage();
      await page.goto('/');
      await expect(page.locator('#view-auth')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('#view-app')).toBeHidden();
      await context.close();
    });
  });

  test('con token en localStorage se muestra la pantalla de app', async ({ page }) => {
    await page.goto('/');
    // El storageState del config inyecta el token — esperamos el dashboard
    await expect(page.locator('#view-app')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#view-auth')).toBeHidden();
  });
});
