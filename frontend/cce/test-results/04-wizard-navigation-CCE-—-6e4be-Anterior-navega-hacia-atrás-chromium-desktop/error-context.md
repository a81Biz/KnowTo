# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-wizard-navigation.spec.ts >> CCE — Navegación del wizard >> el botón Anterior navega hacia atrás
- Location: e2e\specs\04-wizard-navigation.spec.ts:72:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#step-0-container')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#step-0-container')

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
  1   | // e2e/specs/04-wizard-navigation.spec.ts — CCE
  2   | // Tests de navegación entre pasos del wizard (Siguiente / Anterior).
  3   | 
  4   | import { test, expect } from '@playwright/test';
  5   | 
  6   | // Helper: mockear todas las llamadas API para aislar los tests de navegación
  7   | async function mockAllApis(page: import('@playwright/test').Page): Promise<void> {
  8   |   await page.route('**/cce/wizard/project', async (route) => {
  9   |     await route.fulfill({ status: 201, contentType: 'application/json',
  10  |       body: JSON.stringify({ success: true, data: { projectId: '11111111-2222-3333-4444-555555555555' }, timestamp: '' }) });
  11  |   });
  12  |   await page.route('**/cce/wizard/step', async (route) => {
  13  |     await route.fulfill({ status: 200, contentType: 'application/json',
  14  |       body: JSON.stringify({ success: true, data: { stepId: '22222222-3333-4444-5555-666666666666' }, timestamp: '' }) });
  15  |   });
  16  |   await page.route('**/cce/wizard/generate', async (route) => {
  17  |     const body = await route.request().postDataJSON() as { promptId?: string };
  18  |     await route.fulfill({ status: 200, contentType: 'application/json',
  19  |       body: JSON.stringify({ success: true,
  20  |         data: { documentId: '33333333-0000-0000-0000-000000000000', content: `# Documento ${body.promptId ?? 'test'}` },
  21  |         timestamp: '' }) });
  22  |   });
  23  |   await page.route('**/cce/wizard/generate-form', async (route) => {
  24  |     await route.fulfill({ status: 200, contentType: 'application/json',
  25  |       body: JSON.stringify({ success: true, data: { formSchema: {
  26  |         formTitle: 'Test Form',
  27  |         description: 'Test',
  28  |         sections: [{ id: 's1', title: 'Sección', fields: [
  29  |           { id: 'q1', label: 'Pregunta 1', type: 'textarea', required: false }
  30  |         ]}],
  31  |       }}, timestamp: '' }) });
  32  |   });
  33  |   await page.route('**/cce/wizard/extract', async (route) => {
  34  |     await route.fulfill({ status: 200, contentType: 'application/json',
  35  |       body: JSON.stringify({ success: true, data: {
  36  |         extractorId: 'EXTRACTOR_TEST',
  37  |         content: '## Contexto extraído',
  38  |         parserUsed: {},
  39  |         extractedContextId: '44444444-0000-0000-0000-000000000000',
  40  |       }, timestamp: '' }) });
  41  |   });
  42  | }
  43  | 
  44  | test.describe('CCE — Navegación del wizard', () => {
  45  |   test.beforeEach(async ({ page }) => {
  46  |     // Limpieza de estado
  47  |     await page.addInitScript(() => {
  48  |       localStorage.removeItem('knowto_cce_wizard_state');
  49  |       sessionStorage.clear();
  50  |     });
  51  |     
  52  |     await mockAllApis(page);
  53  |     await page.goto('/');
  54  |     await expect(page.locator('#view-app')).toBeVisible({ timeout: 5000 });
  55  |     await page.click('#btn-new-project');
> 56  |     await expect(page.locator('#step-0-container')).toBeVisible({ timeout: 5000 });
      |                                                     ^ Error: expect(locator).toBeVisible() failed
  57  |   });
  58  | 
  59  |   test('el wizard tiene 8 indicadores de paso', async ({ page }) => {
  60  |     await expect(page.locator('.wizard-step-indicator')).toHaveCount(8);
  61  |   });
  62  | 
  63  |   test('el botón Anterior está deshabilitado en el paso 0', async ({ page }) => {
  64  |     await expect(page.locator('#btn-prev-step')).toBeDisabled();
  65  |   });
  66  | 
  67  |   test('el botón Siguiente navega al paso 1', async ({ page }) => {
  68  |     await page.click('#btn-next-step');
  69  |     await expect(page.locator('#step-1-container')).toBeVisible({ timeout: 5000 });
  70  |   });
  71  | 
  72  |   test('el botón Anterior navega hacia atrás', async ({ page }) => {
  73  |     await page.click('#btn-next-step');
  74  |     await expect(page.locator('#step-1-container')).toBeVisible({ timeout: 5000 });
  75  |     await page.click('#btn-prev-step');
  76  |     await expect(page.locator('#step-0-container')).toBeVisible({ timeout: 5000 });
  77  |   });
  78  | 
  79  |   test('el indicador del paso activo cambia al navegar', async ({ page }) => {
  80  |     const indicators = page.locator('.wizard-step-indicator');
  81  |     // Primer indicador debe estar activo (índice 0)
  82  |     await expect(indicators.nth(0)).toHaveClass(/active/);
  83  | 
  84  |     await page.click('#btn-next-step');
  85  |     await expect(indicators.nth(1)).toHaveClass(/active/, { timeout: 5000 });
  86  |   });
  87  | 
  88  |   test('en el último paso (7) el botón dice "Finalizar"', async ({ page }) => {
  89  |     // Navegar rápidamente hasta el último paso
  90  |     for (let i = 0; i < 7; i++) {
  91  |       await page.click('#btn-next-step');
  92  |       await page.waitForTimeout(200);
  93  |     }
  94  |     await expect(page.locator('#btn-next-step')).toContainText('Finalizar', { timeout: 5000 });
  95  |   });
  96  | 
  97  |   test('"Finalizar" en el último paso regresa al dashboard', async ({ page }) => {
  98  |     for (let i = 0; i < 7; i++) {
  99  |       await page.click('#btn-next-step');
  100 |       await page.waitForTimeout(200);
  101 |     }
  102 |     // Mock de listProjects para el retorno al dashboard
  103 |     await page.route('**/cce/wizard/projects', async (route) => {
  104 |       await route.fulfill({ status: 200, contentType: 'application/json',
  105 |         body: JSON.stringify({ success: true, data: [], timestamp: '' }) });
  106 |     });
  107 |     await page.click('#btn-next-step');
  108 |     await expect(page.locator('#dashboard-container')).toBeVisible({ timeout: 5000 });
  109 |     await expect(page.locator('#wizard-container')).toBeHidden();
  110 |   });
  111 | });
  112 | 
```