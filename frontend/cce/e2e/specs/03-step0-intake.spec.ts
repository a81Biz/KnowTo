// e2e/specs/03-step0-intake.spec.ts — CCE
// Tests del formulario de ingreso de datos del cliente (Step 0 — INTAKE).

import { test, expect } from '@playwright/test';

test.describe('CCE — Step 0: Datos del Cliente', () => {
  test.beforeEach(async ({ page }) => {
    // 1.4 Limpieza de estado entre tests
    await page.addInitScript(() => {
      localStorage.removeItem('knowto_cce_wizard_state');
      sessionStorage.clear();
    });

    // Mock general para status (sirve para todo el archivo)
    await page.route('**/cce/wizard/pipeline/*/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            status: 'completed',
            currentStage: 'extractor_web',
            totalStages: 5,
            completedStages: 5,
            output: null,
            error: null,
            retryCount: 0
          },
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/');
    await expect(page.locator('#view-app')).toBeVisible({ timeout: 5000 });
    await page.click('#btn-new-project');
    await expect(page.locator('#step-0-container')).toBeVisible({ timeout: 5000 });
  });

  test('muestra todos los campos del formulario de entrada del cliente', async ({ page }) => {
    await expect(page.locator('[name="projectName"]')).toBeVisible();
    await expect(page.locator('[name="clientName"]')).toBeVisible();
    await expect(page.locator('[name="companyName"]')).toBeVisible();
    await expect(page.locator('[name="sector"]')).toBeVisible();
    await expect(page.locator('[name="email"]')).toBeVisible();
    await expect(page.locator('[name="totalWorkers"]')).toBeVisible();
    await expect(page.locator('[name="currentSituation"]')).toBeVisible();
    await expect(page.locator('[name="mainObjective"]')).toBeVisible();
  });

  test('el botón de submit está visible', async ({ page }) => {
    await expect(page.locator('#btn-submit')).toBeVisible();
    await expect(page.locator('#btn-submit')).toContainText('Generar Documento de Intake');
  });

  test('el panel de preview está oculto al inicio', async ({ page }) => {
    await expect(page.locator('#preview-panel')).toBeHidden();
  });

  test('puede completar y enviar el formulario con datos válidos', async ({ page }) => {
    // Mockear la API para no depender del backend real
    await page.route('**/cce/wizard/project', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { projectId: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee' },
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/cce/wizard/step', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { stepId: 'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff' },
          timestamp: new Date().toISOString(),
        }),
      });
    });

    // Crawler mock
    await page.route('**/cce/wizard/crawl', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { crawlId: 'crawl-1234' },
          timestamp: new Date().toISOString()
        }),
      });
    });

    await page.route('**/cce/wizard/crawl/*/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { status: 'completed' },
          timestamp: new Date().toISOString()
        }),
      });
    });

    await page.route('**/cce/wizard/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            pipelineId: 'pipeline-1234',
            documentId: 'cccccccc-dddd-4eee-ffff-000000000000',
            content: '# MARCO DE REFERENCIA\n\n## 1. Análisis del Sector\n\nContenido de prueba E2E.',
          },
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.fill('[name="projectName"]', 'Consultoría E2E TECHIC 2026');
    await page.fill('[name="captureDate"]', '2026-04-09');
    await page.fill('[name="clientName"]', 'María López E2E');
    await page.fill('[name="companyName"]', 'TECHIC Agencia Creativa');
    await page.fill('[name="sector"]', 'Servicios creativos y producción');
    await page.fill('[name="websiteUrl"]', 'https://example.com');
    await page.fill('[name="currentSituation"]', 'La empresa tiene problemas de comunicación interna.');
    await page.fill('[name="mainObjective"]', 'Mejorar la productividad del equipo en un 25%.');
    await page.click('#btn-submit');

    // El preview debe aparecer con el contenido generado
    await expect(page.locator('#preview-panel')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#document-preview')).toContainText('MARCO DE REFERENCIA');
  });

  test('muestra botones de copiar y regenerar tras generar el documento', async ({ page }) => {
    await page.route('**/cce/wizard/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/project')) {
        await route.fulfill({ status: 201, contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { projectId: '11111111-2222-3333-4444-555555555555' }, timestamp: '' }) });
      } else if (url.includes('/step')) {
        await route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { stepId: '22222222-3333-4444-5555-666666666666' }, timestamp: '' }) });
      } else if (url.includes('/generate')) {
        await route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { pipelineId: 'pipeline-1234', documentId: '33333333-4444-5555-6666-777777777777', content: '# Doc' }, timestamp: '' }) });
      } else {
        await route.continue();
      }
    });

    await page.fill('[name="projectName"]', 'Proyecto E2E');
    await page.fill('[name="captureDate"]', '2026-04-09');
    await page.fill('[name="clientName"]', 'Cliente E2E');
    await page.fill('[name="websiteUrl"]', 'https://example.com');
    await page.fill('[name="currentSituation"]', 'Situación E2E');
    await page.fill('[name="mainObjective"]', 'Objetivo E2E');
    await page.click('#btn-submit');

    await expect(page.locator('#btn-copy-doc')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#btn-regenerate')).toBeVisible();
  });
});
