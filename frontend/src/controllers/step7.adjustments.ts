// src/controllers/step7.adjustments.ts
// HTML en: /templates/tpl-step7-adjustments.html
import { createStep } from '../shared/step.factory';

export const Step7Adjustments = createStep({
  stepNumber: 7,
  templateId: 'tpl-step7-adjustments',
  phaseId: 'F6.1',
  promptId: 'F6',
  uiConfig: { loadingText: 'Generando Documento de Ajustes (F6.1)...' },
});
