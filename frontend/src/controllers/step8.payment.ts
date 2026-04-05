// src/controllers/step8.payment.ts
// HTML en: /templates/tpl-step8-payment.html
import { createStep } from '../shared/step.factory';

export const Step9Inventory = createStep({
  stepNumber: 9,
  templateId: 'tpl-step8-payment',
  phaseId: 'F6.2a',
  promptId: 'F6_2a',
  uiConfig: { loadingText: 'Generando Inventario del Expediente y Firmas (F6.2a)...' },
});
