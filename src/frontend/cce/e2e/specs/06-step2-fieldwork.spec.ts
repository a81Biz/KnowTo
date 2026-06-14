// e2e/specs/06-step2-fieldwork.spec.ts — CCE
// Tests del step 2 — Trabajo de Campo (F1_2_FIELDWORK).
// Verifica tabs de instrumentos, zona de upload y formulario de instancia digital.

import { test, expect } from '@playwright/test';

test.describe('CCE — Step 2: Trabajo de Campo', () => {
  test.beforeEach(async ({ page }) => {
    // 1.4 Limpieza de estado entre tests e inyección
    await page.addInitScript(() => {
      localStorage.removeItem('knowto_cce_wizard_state');
      sessionStorage.clear();
      const state = {
        currentStep: 2,
        projectId: '11111111-2222-3333-4444-555555555555',
        clientData: { clientName: 'Test', projectName: 'E2E', companyName: 'E2E Corp', sector: 'Tech', email: '' },
        steps: Array.from({ length: 8 }, (_, i) => ({
          stepNumber: i,
          phaseId: i === 0 ? 'INTAKE' : i === 1 ? 'F1_1' : 'F1_2_FIELDWORK',
          promptId: 'F0',
          label: `Paso ${i}`,
          icon: 'circle',
          status: i < 2 ? 'completed' : 'pending',
          inputData: {},
          documentContent: i < 2 ? `# Documento paso ${i}` : undefined,
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

    await page.click('#btn-new-project');
    
    // Avanzamos los 2 pasos previamiente cargados en UI
    for (let i = 0; i < 2; i++) {
      await page.click('#btn-next-step');
      await page.waitForTimeout(200);
    }
    await expect(page.locator('#step-2-container')).toBeVisible({ timeout: 5000 });
  });

  test('muestra el selector de instrumentos con 6 tabs', async ({ page }) => {
    await expect(page.locator('#instrument-selector')).toBeVisible();
    await expect(page.locator('#instrument-selector button')).toHaveCount(6);
  });

  test('muestra la zona de upload', async ({ page }) => {
    await expect(page.locator('#upload-zone')).toBeVisible();
  });

  test('muestra el botón para añadir instancia digital', async ({ page }) => {
    await expect(page.locator('#btn-add-digital-instance')).toBeVisible();
  });

  test('al hacer clic en "Añadir instancia digital" se muestra el formulario', async ({ page }) => {
    await expect(page.locator('#digital-instance-form')).toBeHidden();
    await page.click('#btn-add-digital-instance');
    await expect(page.locator('#digital-instance-form')).toBeVisible();
  });

  test('el formulario de instancia digital tiene campos requeridos', async ({ page }) => {
    await page.click('#btn-add-digital-instance');
    await expect(page.locator('#digital-person-name')).toBeVisible();
    await expect(page.locator('#digital-person-role')).toBeVisible();
    await expect(page.locator('#digital-application-date')).toBeVisible();
    await expect(page.locator('#digital-observations')).toBeVisible();
    await expect(page.locator('#btn-save-digital-instance')).toBeVisible();
  });

  test('el botón cerrar oculta el formulario de instancia digital', async ({ page }) => {
    await page.click('#btn-add-digital-instance');
    await expect(page.locator('#digital-instance-form')).toBeVisible();
    await page.click('#btn-close-digital');
    await expect(page.locator('#digital-instance-form')).toBeHidden();
  });

  test('muestra el campo de notas generales del trabajo de campo', async ({ page }) => {
    await expect(page.locator('#field-notes')).toBeVisible();
  });

  test('muestra el botón de guardar trabajo de campo', async ({ page }) => {
    await expect(page.locator('#btn-save-fieldwork')).toBeVisible();
    await expect(page.locator('#btn-save-fieldwork')).toContainText('Guardar trabajo de campo');
  });

  test('guardar trabajo de campo muestra el estado completado', async ({ page }) => {
    await page.fill('#field-notes', 'Notas de campo de prueba E2E.');
    await page.click('#btn-save-fieldwork');
    await expect(page.locator('#fieldwork-saved')).toBeVisible({ timeout: 3000 });
  });
});
