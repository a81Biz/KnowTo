# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 03-step0-intake.spec.ts >> CCE — Step 0: Datos del Cliente >> muestra botones de copiar y regenerar tras generar el documento
- Location: e2e\specs\03-step0-intake.spec.ts:143:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[name="currentSituation"]')
    - waiting for" http://localhost:5173/" navigation to finish...
    - navigated to "http://localhost:5173/"

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
  155 |       } else {
  156 |         await route.continue();
  157 |       }
  158 |     });
  159 | 
  160 |     await page.fill('[name="projectName"]', 'Proyecto E2E');
  161 |     await page.fill('[name="captureDate"]', '2026-04-09');
  162 |     await page.fill('[name="clientName"]', 'Cliente E2E');
  163 |     await page.fill('[name="websiteUrl"]', 'https://example.com');
> 164 |     await page.fill('[name="currentSituation"]', 'Situación E2E');
      |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  165 |     await page.fill('[name="mainObjective"]', 'Objetivo E2E');
  166 |     await page.click('#btn-submit');
  167 | 
  168 |     await expect(page.locator('#btn-copy-doc')).toBeVisible({ timeout: 15000 });
  169 |     await expect(page.locator('#btn-regenerate')).toBeVisible();
  170 |   });
  171 | });
  172 | 
```