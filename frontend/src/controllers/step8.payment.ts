// src/controllers/step8.payment.ts
// HTML en: /templates/tpl-step8-payment.html
import { createStep } from '../shared/step.factory';

export const Step8Payment = createStep({
  stepNumber: 8,
  templateId: 'tpl-step8-payment',
  phaseId: 'F6.2',
  promptId: 'F6_2',
  uiConfig: { loadingText: 'Generando Lista de Verificación de Firmas (F6.2)...' },
});
