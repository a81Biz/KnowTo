// e2e/specs/02-dashboard.spec.ts — CCE
// Verifica el dashboard de proyectos.

import { test, expect } from '@playwright/test';

test.describe('CCE — Dashboard de consultorías', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#view-app')).toBeVisible({ timeout: 5000 });
  });

  test('muestra el dashboard con el botón de nueva consultoría', async ({ page }) => {
    await expect(page.locator('#dashboard-container')).toBeVisible();
    await expect(page.locator('#btn-new-project')).toBeVisible();
  });

  test('el botón "Nueva consultoría" inicia el wizard en paso 0', async ({ page }) => {
    await page.click('#btn-new-project');
    await expect(page.locator('#wizard-container')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#dashboard-container')).toBeHidden();
    // El wizard progress debe mostrar 8 pasos
    await expect(page.locator('.wizard-step-indicator')).toHaveCount(8);
  });

  test('el wizard muestra el paso 0 (Datos del Cliente) al inicio', async ({ page }) => {
    await page.click('#btn-new-project');
    await expect(page.locator('#step-0-container')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#step-0-container h2')).toContainText('Datos del Cliente');
  });
});
