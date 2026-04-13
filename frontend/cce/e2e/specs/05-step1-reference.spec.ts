// e2e/specs/05-step1-reference.spec.ts — CCE
// Tests del step 1 — Instrumentos de Diagnóstico y Marco de Referencia (F1_1).
// Verifica que los 6 instrumentos se muestran como tabs.

import { test, expect } from '@playwright/test';

test.describe('CCE — Step 1: Marco de Referencia e Instrumentos', () => {
  test.beforeEach(async ({ page }) => {
    // Limpieza e Inyección de estado
    await page.addInitScript(() => {
      localStorage.removeItem('knowto_cce_wizard_state');
      sessionStorage.clear();
      const state = {
        currentStep: 1,
        projectId: '11111111-2222-3333-4444-555555555555',
        clientData: { clientName: 'Test', projectName: 'Proyecto E2E', companyName: 'E2E Corp', sector: 'Tech', email: '' },
        steps: Array.from({ length: 8 }, (_, i) => ({
          stepNumber: i,
          phaseId: i === 0 ? 'INTAKE' : 'F1_1',
          promptId: 'F0',
          label: `Paso ${i}`,
          icon: 'circle',
          status: i < 1 ? 'completed' : 'pending',
          inputData: {},
          documentContent: i < 1 ? `# Documento paso ${i}\n\nContenido de prueba.` : undefined,
        })),
        extractedContexts: {},
        clientAnswersData: null, instrumentsData: null, fieldworkData: null,
        diagnosisData: null, prioritizationData: null, pedagogySpecsData: null,
        productionData: null, closingData: null,
      };
      localStorage.setItem('knowto_cce_wizard_state', JSON.stringify(state));
    });

    // Navegar de frente
    await page.goto('/');
    await expect(page.locator('#view-app')).toBeVisible({ timeout: 5000 });

    // Mockear API de extract
    await page.route('**/cce/wizard/extract', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {
          extractorId: 'EXTRACTOR_F1_1',
          content: '## Contexto extraído',
          parserUsed: {},
          extractedContextId: '44444444-0000-0000-0000-000000000000',
        }, timestamp: '' }) });
    });

    await page.route('**/cce/wizard/step', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { stepId: '55555555-0000-0000-0000-000000000000' }, timestamp: '' }) });
    });

    await page.route('**/cce/wizard/generate', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {
          documentId: '33333333-0000-0000-0000-000000000000',
          content: `# INSTRUMENTOS DE DIAGNÓSTICO\n\n## Entrevista Director\n\nPreguntas para director.\n\n` +
            `## Entrevista Jefes\n\nPreguntas para jefes.\n\n` +
            `## Entrevista Colaboradores\n\nPreguntas para colaboradores.\n\n` +
            `## Cuestionario Anónimo\n\nPreguntas anónimas.\n\n` +
            `## Guía de Observación\n\nItems de observación.\n\n` +
            `## Checklist de Documentos\n\nDocs a revisar.`,
          pipelineId: 'pipeline-123',
        }, timestamp: '' }) });
    });

    await page.route('**/cce/wizard/pipeline/*/status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { status: 'completed' } }) });
    });

    await page.click('#btn-new-project');
    // Ir al step 1 con next 1 vez
    await page.click('#btn-next-step');
    await page.waitForTimeout(300);
    await expect(page.locator('#step-1-container')).toBeVisible({ timeout: 5000 });
  });

  test('muestra el formulario de entrada para contexto adicional', async ({ page }) => {
    await expect(page.locator('[name="instrumentContext"]')).toBeVisible();
    await expect(page.locator('[name="focusAreas"]')).toBeVisible();
  });

  test('muestra botón de generación de instrumentos', async ({ page }) => {
    await expect(page.locator('#btn-submit')).toContainText('Generar Instrumentos');
  });

  test('tras generar, muestra los 6 tabs de instrumentos', async ({ page }) => {
    await page.click('#btn-submit');
    await expect(page.locator('#instrument-tabs')).toBeVisible({ timeout: 15000 });
    // Debe haber 6 tabs
    await expect(page.locator('#instrument-tabs button')).toHaveCount(6);
  });
});
