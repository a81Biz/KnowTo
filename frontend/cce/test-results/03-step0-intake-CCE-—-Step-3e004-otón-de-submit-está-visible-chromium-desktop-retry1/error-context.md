# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 03-step0-intake.spec.ts >> CCE — Step 0: Datos del Cliente >> el botón de submit está visible
- Location: e2e\specs\03-step0-intake.spec.ts:52:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#btn-submit')
Expected substring: "Generar Documento de Intake"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('#btn-submit')
    4 × locator resolved to <button type="submit" id="btn-submit" class="btn-primary w-full py-4 text-lg">↵        ✨ Generar Marco de Referencia con IA↵   …</button>
      - unexpected value "
        ✨ Generar Marco de Referencia con IA
      "

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - banner [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: KNOWTO
      - generic [ref=e6]: Consultoría EC0249
    - generic [ref=e7]:
      - generic [ref=e8]: dev@knowto.local
      - button "Salir" [ref=e9] [cursor=pointer]
  - main [ref=e10]:
    - generic [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - heading "Mis consultorías" [level=1] [ref=e14]
          - paragraph [ref=e15]: Procesos de consultoría EC0249
        - button "+ Nueva consultoría" [ref=e16] [cursor=pointer]
      - generic [ref=e17]:
        - paragraph [ref=e18]: 💼
        - paragraph [ref=e19]: No tienes consultorías aún.
```

# Test source

```ts
  1   | // e2e/specs/03-step0-intake.spec.ts — CCE
  2   | // Tests del formulario de ingreso de datos del cliente (Step 0 — INTAKE).
  3   | 
  4   | import { test, expect } from '@playwright/test';
  5   | 
  6   | test.describe('CCE — Step 0: Datos del Cliente', () => {
  7   |   test.beforeEach(async ({ page }) => {
  8   |     // 1.4 Limpieza de estado entre tests
  9   |     await page.addInitScript(() => {
  10  |       localStorage.removeItem('knowto_cce_wizard_state');
  11  |       sessionStorage.clear();
  12  |     });
  13  | 
  14  |     // Mock general para status (sirve para todo el archivo)
  15  |     await page.route('**/cce/wizard/pipeline/*/status', async (route) => {
  16  |       await route.fulfill({
  17  |         status: 200,
  18  |         contentType: 'application/json',
  19  |         body: JSON.stringify({
  20  |           success: true,
  21  |           data: {
  22  |             status: 'completed',
  23  |             currentStage: 'extractor_web',
  24  |             totalStages: 5,
  25  |             completedStages: 5,
  26  |             output: null,
  27  |             error: null,
  28  |             retryCount: 0
  29  |           },
  30  |           timestamp: new Date().toISOString(),
  31  |         }),
  32  |       });
  33  |     });
  34  | 
  35  |     await page.goto('/');
  36  |     await expect(page.locator('#view-app')).toBeVisible({ timeout: 5000 });
  37  |     await page.click('#btn-new-project');
  38  |     await expect(page.locator('#step-0-container')).toBeVisible({ timeout: 5000 });
  39  |   });
  40  | 
  41  |   test('muestra todos los campos del formulario de entrada del cliente', async ({ page }) => {
  42  |     await expect(page.locator('[name="projectName"]')).toBeVisible();
  43  |     await expect(page.locator('[name="clientName"]')).toBeVisible();
  44  |     await expect(page.locator('[name="companyName"]')).toBeVisible();
  45  |     await expect(page.locator('[name="sector"]')).toBeVisible();
  46  |     await expect(page.locator('[name="email"]')).toBeVisible();
  47  |     await expect(page.locator('[name="totalWorkers"]')).toBeVisible();
  48  |     await expect(page.locator('[name="currentSituation"]')).toBeVisible();
  49  |     await expect(page.locator('[name="mainObjective"]')).toBeVisible();
  50  |   });
  51  | 
  52  |   test('el botón de submit está visible', async ({ page }) => {
  53  |     await expect(page.locator('#btn-submit')).toBeVisible();
> 54  |     await expect(page.locator('#btn-submit')).toContainText('Generar Documento de Intake');
      |                                               ^ Error: expect(locator).toContainText(expected) failed
  55  |   });
  56  | 
  57  |   test('el panel de preview está oculto al inicio', async ({ page }) => {
  58  |     await expect(page.locator('#preview-panel')).toBeHidden();
  59  |   });
  60  | 
  61  |   test('puede completar y enviar el formulario con datos válidos', async ({ page }) => {
  62  |     // Mockear la API para no depender del backend real
  63  |     await page.route('**/cce/wizard/project', async (route) => {
  64  |       await route.fulfill({
  65  |         status: 201,
  66  |         contentType: 'application/json',
  67  |         body: JSON.stringify({
  68  |           success: true,
  69  |           data: { projectId: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee' },
  70  |           timestamp: new Date().toISOString(),
  71  |         }),
  72  |       });
  73  |     });
  74  | 
  75  |     await page.route('**/cce/wizard/step', async (route) => {
  76  |       await route.fulfill({
  77  |         status: 200,
  78  |         contentType: 'application/json',
  79  |         body: JSON.stringify({
  80  |           success: true,
  81  |           data: { stepId: 'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff' },
  82  |           timestamp: new Date().toISOString(),
  83  |         }),
  84  |       });
  85  |     });
  86  | 
  87  |     // Crawler mock
  88  |     await page.route('**/cce/wizard/crawl', async (route) => {
  89  |       await route.fulfill({
  90  |         status: 200,
  91  |         contentType: 'application/json',
  92  |         body: JSON.stringify({
  93  |           success: true,
  94  |           data: { crawlId: 'crawl-1234' },
  95  |           timestamp: new Date().toISOString()
  96  |         }),
  97  |       });
  98  |     });
  99  | 
  100 |     await page.route('**/cce/wizard/crawl/*/status', async (route) => {
  101 |       await route.fulfill({
  102 |         status: 200,
  103 |         contentType: 'application/json',
  104 |         body: JSON.stringify({
  105 |           success: true,
  106 |           data: { status: 'completed' },
  107 |           timestamp: new Date().toISOString()
  108 |         }),
  109 |       });
  110 |     });
  111 | 
  112 |     await page.route('**/cce/wizard/generate', async (route) => {
  113 |       await route.fulfill({
  114 |         status: 200,
  115 |         contentType: 'application/json',
  116 |         body: JSON.stringify({
  117 |           success: true,
  118 |           data: {
  119 |             pipelineId: 'pipeline-1234',
  120 |             documentId: 'cccccccc-dddd-4eee-ffff-000000000000',
  121 |             content: '# MARCO DE REFERENCIA\n\n## 1. Análisis del Sector\n\nContenido de prueba E2E.',
  122 |           },
  123 |           timestamp: new Date().toISOString(),
  124 |         }),
  125 |       });
  126 |     });
  127 | 
  128 |     await page.fill('[name="projectName"]', 'Consultoría E2E TECHIC 2026');
  129 |     await page.fill('[name="captureDate"]', '2026-04-09');
  130 |     await page.fill('[name="clientName"]', 'María López E2E');
  131 |     await page.fill('[name="companyName"]', 'TECHIC Agencia Creativa');
  132 |     await page.fill('[name="sector"]', 'Servicios creativos y producción');
  133 |     await page.fill('[name="websiteUrl"]', 'https://example.com');
  134 |     await page.fill('[name="currentSituation"]', 'La empresa tiene problemas de comunicación interna.');
  135 |     await page.fill('[name="mainObjective"]', 'Mejorar la productividad del equipo en un 25%.');
  136 |     await page.click('#btn-submit');
  137 | 
  138 |     // El preview debe aparecer con el contenido generado
  139 |     await expect(page.locator('#preview-panel')).toBeVisible({ timeout: 15000 });
  140 |     await expect(page.locator('#document-preview')).toContainText('MARCO DE REFERENCIA');
  141 |   });
  142 | 
  143 |   test('muestra botones de copiar y regenerar tras generar el documento', async ({ page }) => {
  144 |     await page.route('**/cce/wizard/**', async (route) => {
  145 |       const url = route.request().url();
  146 |       if (url.includes('/project')) {
  147 |         await route.fulfill({ status: 201, contentType: 'application/json',
  148 |           body: JSON.stringify({ success: true, data: { projectId: '11111111-2222-3333-4444-555555555555' }, timestamp: '' }) });
  149 |       } else if (url.includes('/step')) {
  150 |         await route.fulfill({ status: 200, contentType: 'application/json',
  151 |           body: JSON.stringify({ success: true, data: { stepId: '22222222-3333-4444-5555-666666666666' }, timestamp: '' }) });
  152 |       } else if (url.includes('/generate')) {
  153 |         await route.fulfill({ status: 200, contentType: 'application/json',
  154 |           body: JSON.stringify({ success: true, data: { pipelineId: 'pipeline-1234', documentId: '33333333-4444-5555-6666-777777777777', content: '# Doc' }, timestamp: '' }) });
```