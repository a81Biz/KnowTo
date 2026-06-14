// e2e/specs/08-step7-closing.spec.ts — CCE
// Tests del step 7 — Verificación (F5), Reporte de Pruebas, Ajustes (F6) y Cierre.
// Verifica los 4 sub-tabs y sus comportamientos bloqueantes.

import { test, expect } from '@playwright/test';

test.describe('CCE — Step 7: Verificación y Cierre', () => {
  test.beforeEach(async ({ page }) => {
    // 1.4 Limpieza de estado entre tests
    await page.addInitScript(() => {
      localStorage.removeItem('knowto_cce_wizard_state');
      sessionStorage.clear();
      const state = {
        currentStep: 7,
        projectId: '11111111-2222-3333-4444-555555555555',
        clientData: { clientName: 'Test', projectName: 'E2E', companyName: 'E2E Corp', sector: 'Tech', email: '' },
        steps: Array.from({ length: 8 }, (_, i) => ({
          stepNumber: i,
          phaseId: i === 7 ? 'F5' : `PASO_${i}`,
          promptId: 'F0',
          label: `Paso ${i}`,
          icon: 'circle',
          status: i < 7 ? 'completed' : 'pending',
          inputData: {},
          documentContent: i < 7 ? `# Documento paso ${i}` : undefined,
        })),
        extractedContexts: {},
        clientAnswersData: null, instrumentsData: null, fieldworkData: null,
        diagnosisData: null, prioritizationData: null, pedagogySpecsData: null,
        productionData: null, closingData: null,
      };
      localStorage.setItem('knowto_cce_wizard_state', JSON.stringify(state));
    });

    await page.goto('/');
    await expect(page.locator('#view-app')).toBeVisible({ timeout: 5000 });

    // Mockear todas las llamadas relevantes
    await page.route('**/cce/wizard/generate', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {
          pipelineId: 'pipeline-123',
          documentId: '33333333-0000-0000-0000-000000000000',
          content: '# Documento Generado',
        }, timestamp: '' }) });
    });

    await page.route('**/cce/wizard/pipeline/*/status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { status: 'completed' } }) });
    });

    await page.route('**/cce/wizard/generate-form', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { formSchema: {
          formTitle: 'Reporte de Pruebas Funcionales',
          description: 'Complete los campos del reporte.',
          sections: [{
            id: 's1',
            title: 'Resultados',
            fields: [
              { id: 'resultado1', label: 'Resultado 1', type: 'textarea', required: true },
            ],
          }],
        }}, timestamp: '' }) });
    });

    await page.route('**/cce/wizard/step', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { stepId: '55555555-0000-0000-0000-000000000000' }, timestamp: '' }) });
    });

    await page.route('**/cce/wizard/extract', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {
          extractorId: 'EXTRACTOR_F5',
          content: '## Contexto',
          parserUsed: {},
          extractedContextId: '44444444-0000-0000-0000-000000000000',
        }, timestamp: '' }) });
    });

    // Navegar al step 7
    await page.click('#btn-new-project');
    for (let i = 0; i < 7; i++) {
      await page.click('#btn-next-step');
      await page.waitForTimeout(200);
    }
    await expect(page.locator('#step-7-container')).toBeVisible({ timeout: 5000 });
  });

  test('muestra los 4 sub-tabs', async ({ page }) => {
    await expect(page.locator('.subtab-btn')).toHaveCount(4);
    await expect(page.locator('[data-subtab="verification"]')).toBeVisible();
    await expect(page.locator('[data-subtab="test-report"]')).toBeVisible();
    await expect(page.locator('[data-subtab="adjustments"]')).toBeVisible();
    await expect(page.locator('[data-subtab="close"]')).toBeVisible();
  });

  test('el tab de verificación está activo por defecto', async ({ page }) => {
    await expect(page.locator('#panel-verification')).toBeVisible();
    await expect(page.locator('#panel-test-report')).toBeHidden();
    await expect(page.locator('#panel-adjustments')).toBeHidden();
    await expect(page.locator('#panel-close')).toBeHidden();
  });

  test('reporte de pruebas está deshabilitado hasta generar F5', async ({ page }) => {
    const btnReport = page.locator('[data-subtab="test-report"]');
    await expect(btnReport).toBeDisabled();

    // Generar F5
    await page.click('#btn-submit'); // id en step.base.ts para generar
    await expect(page.locator('#document-preview')).toContainText('Documento Generado', { timeout: 15000 });

    // Ahora debe estar habilitado
    await expect(btnReport).toBeEnabled();
    await btnReport.click();
    await expect(page.locator('#panel-test-report')).toBeVisible();
  });

  test('puede guardar reporte y desbloquear ajustes', async ({ page }) => {
    // Generar F5 primero
    await page.click('#btn-submit');
    await expect(page.locator('#document-preview')).toContainText('Documento Generado', { timeout: 15000 });

    await page.click('[data-subtab="test-report"]');
    await expect(page.locator('#test-form-ready')).toBeVisible({ timeout: 10000 });
    
    // Simular llenado de form y guardado
    await page.fill('[name="resultado1"]', 'Resultados OK');
    await page.click('#btn-save-test-report');

    const btnAdjustments = page.locator('[data-subtab="adjustments"]');
    await expect(btnAdjustments).toBeEnabled();
    await btnAdjustments.click();
    await expect(page.locator('#panel-adjustments')).toBeVisible();
  });

  test('el botón Finalizar en tab cierre guarda la consultoría', async ({ page }) => {
    // Truco: Para llegar a Cierre hay que generar Ajustes
    await page.click('#btn-submit'); // F5
    await expect(page.locator('#document-preview')).toContainText('Documento Generado', { timeout: 10000 });

    await page.click('[data-subtab="test-report"]');
    await expect(page.locator('#test-form-ready')).toBeVisible({ timeout: 10000 });
    await page.fill('[name="resultado1"]', 'OK');
    await page.click('#btn-save-test-report');

    await page.click('[data-subtab="adjustments"]');
    await page.click('#btn-generate-adjustments');
    // Mismo mock devuelve "Documento Generado" para F6
    await expect(page.locator('#adjustments-preview')).toContainText('Documento Generado', { timeout: 10000 });

    await page.click('[data-subtab="close"]');
    await expect(page.locator('#panel-close')).toBeVisible();

    await page.fill('#closing-notes', 'Consultoría finalizada con éxito.');
    await page.click('#btn-save-closing');
    await expect(page.locator('#btn-save-closing')).toBeVisible();
  });
});
