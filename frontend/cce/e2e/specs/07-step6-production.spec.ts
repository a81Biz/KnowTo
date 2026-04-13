// e2e/specs/07-step6-production.spec.ts — CCE
// Tests del step 6 — Producción (F4) — Sub-wizard de 7 productos.

import { test, expect } from '@playwright/test';

test.describe('CCE — Step 6: Producción (F4)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('knowto_cce_wizard_state');
      sessionStorage.clear();
      const state = {
        currentStep: 6,
        projectId: '11111111-2222-3333-4444-555555555555',
        clientData: { clientName: 'Test', projectName: 'E2E', companyName: 'E2E Corp', sector: 'Tech', email: '' },
        steps: Array.from({ length: 8 }, (_, i) => ({
          stepNumber: i,
          phaseId: i === 6 ? 'F4' : `PASO_${i}`,
          promptId: 'F0',
          label: `Paso ${i}`,
          icon: 'circle',
          status: i < 6 ? 'completed' : 'pending',
          inputData: {},
          documentContent: i < 6 ? `# Documento paso ${i}` : undefined,
        })),
        extractedContexts: {},
        clientAnswersData: null, instrumentsData: null, fieldworkData: null,
        diagnosisData: null, prioritizationData: null, pedagogySpecsData: null,
        productionData: null, closingData: null,
      };
      localStorage.setItem('knowto_cce_wizard_state', JSON.stringify(state));
    });

    // Mocks API
    await page.route('**/cce/wizard/generate', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {
          pipelineId: 'pipeline-123',
          documentId: '33333333-4444-5555-6666-777777777777',
          content: '# Producto Generado',
        }, timestamp: '' }) });
    });

    await page.route('**/cce/wizard/pipeline/*/status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { status: 'completed' } }) });
    });

    await page.goto('/');
    await expect(page.locator('#view-app')).toBeVisible({ timeout: 5000 });

    await page.click('#btn-new-project');
    
    // Avanzamos los 6 pasos previamiente cargados
    for (let i = 0; i < 6; i++) {
      await page.click('#btn-next-step');
      await page.waitForTimeout(200);
    }
    await expect(page.locator('#step-6-container')).toBeVisible({ timeout: 5000 });
  });

  test('se muestran los 7 productos no aprobados', async ({ page }) => {
    await expect(page.locator('.product-indicator')).toHaveCount(7);
    const indicators = page.locator('.product-indicator');
    for (let i = 0; i < 7; i++) {
      await expect(indicators.nth(i)).toHaveClass(/bg-gray-100/);
    }
  });

  test('al hacer clic en Generar, simula la generación del producto', async ({ page }) => {
    // Al iniciar, no hay previsualización
    await expect(page.locator('#product-preview-content')).toBeHidden();

    // Clic en Generar del primer producto
    await page.click('#btn-generate-product');
    await expect(page.locator('#product-preview-content')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#product-preview-content')).toContainText('Producto Generado');

    // Botones Aprobar y Regenerar deben estar visibles
    await expect(page.locator('#btn-approve-product')).toBeVisible();
    await expect(page.locator('#btn-regenerate-product')).toBeVisible();
  });

  test('al Aprobar un producto su indicador cambia', async ({ page }) => {
    await page.click('#btn-generate-product');
    await expect(page.locator('#btn-approve-product')).toBeVisible({ timeout: 15000 });
    
    await page.click('#btn-approve-product');
    // El indicador del paso 0 debe estar verde o reflejar aprobado
    const indicators = page.locator('.product-indicator');
    await expect(indicators.nth(0)).toHaveClass(/bg-green-500|bg-green-100/);
  });
});
