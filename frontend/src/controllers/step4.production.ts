// src/controllers/step4.production.ts
// HTML en: /templates/tpl-step4-production.html
import { createStep } from '../shared/step.factory';

export const Step4Production = createStep({
  stepNumber: 4,
  templateId: 'tpl-step4-production',
  phaseId: 'F4',
  promptId: 'F4',
  uiConfig: { loadingText: 'Generando los 8 productos de Producción (F4)...' },
});
