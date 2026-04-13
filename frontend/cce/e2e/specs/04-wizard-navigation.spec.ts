// e2e/specs/04-wizard-navigation.spec.ts — CCE
// Tests de navegación entre pasos del wizard (Siguiente / Anterior).

import { test, expect } from '@playwright/test';

// Helper: mockear todas las llamadas API para aislar los tests de navegación
async function mockAllApis(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/cce/wizard/project', async (route) => {
    await route.fulfill({ status: 201, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { projectId: '11111111-2222-3333-4444-555555555555' }, timestamp: '' }) });
  });
  await page.route('**/cce/wizard/step', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { stepId: '22222222-3333-4444-5555-666666666666' }, timestamp: '' }) });
  });
  await page.route('**/cce/wizard/generate', async (route) => {
    const body = await route.request().postDataJSON() as { promptId?: string };
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true,
        data: { documentId: '33333333-0000-0000-0000-000000000000', content: `# Documento ${body.promptId ?? 'test'}` },
        timestamp: '' }) });
  });
  await page.route('**/cce/wizard/generate-form', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { formSchema: {
        formTitle: 'Test Form',
        description: 'Test',
        sections: [{ id: 's1', title: 'Sección', fields: [
          { id: 'q1', label: 'Pregunta 1', type: 'textarea', required: false }
        ]}],
      }}, timestamp: '' }) });
  });
  await page.route('**/cce/wizard/extract', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {
        extractorId: 'EXTRACTOR_TEST',
        content: '## Contexto extraído',
        parserUsed: {},
        extractedContextId: '44444444-0000-0000-0000-000000000000',
      }, timestamp: '' }) });
  });
}

test.describe('CCE — Navegación del wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Limpieza de estado
    await page.addInitScript(() => {
      localStorage.removeItem('knowto_cce_wizard_state');
      sessionStorage.clear();
    });
    
    await mockAllApis(page);
    await page.goto('/');
    await expect(page.locator('#view-app')).toBeVisible({ timeout: 5000 });
    await page.click('#btn-new-project');
    await expect(page.locator('#step-0-container')).toBeVisible({ timeout: 5000 });
  });

  test('el wizard tiene 8 indicadores de paso', async ({ page }) => {
    await expect(page.locator('.wizard-step-indicator')).toHaveCount(8);
  });

  test('el botón Anterior está deshabilitado en el paso 0', async ({ page }) => {
    await expect(page.locator('#btn-prev-step')).toBeDisabled();
  });

  test('el botón Siguiente navega al paso 1', async ({ page }) => {
    await page.click('#btn-next-step');
    await expect(page.locator('#step-1-container')).toBeVisible({ timeout: 5000 });
  });

  test('el botón Anterior navega hacia atrás', async ({ page }) => {
    await page.click('#btn-next-step');
    await expect(page.locator('#step-1-container')).toBeVisible({ timeout: 5000 });
    await page.click('#btn-prev-step');
    await expect(page.locator('#step-0-container')).toBeVisible({ timeout: 5000 });
  });

  test('el indicador del paso activo cambia al navegar', async ({ page }) => {
    const indicators = page.locator('.wizard-step-indicator');
    // Primer indicador debe estar activo (índice 0)
    await expect(indicators.nth(0)).toHaveClass(/active/);

    await page.click('#btn-next-step');
    await expect(indicators.nth(1)).toHaveClass(/active/, { timeout: 5000 });
  });

  test('en el último paso (7) el botón dice "Finalizar"', async ({ page }) => {
    // Navegar rápidamente hasta el último paso
    for (let i = 0; i < 7; i++) {
      await page.click('#btn-next-step');
      await page.waitForTimeout(200);
    }
    await expect(page.locator('#btn-next-step')).toContainText('Finalizar', { timeout: 5000 });
  });

  test('"Finalizar" en el último paso regresa al dashboard', async ({ page }) => {
    for (let i = 0; i < 7; i++) {
      await page.click('#btn-next-step');
      await page.waitForTimeout(200);
    }
    // Mock de listProjects para el retorno al dashboard
    await page.route('**/cce/wizard/projects', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], timestamp: '' }) });
    });
    await page.click('#btn-next-step');
    await expect(page.locator('#dashboard-container')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#wizard-container')).toBeHidden();
  });
});
