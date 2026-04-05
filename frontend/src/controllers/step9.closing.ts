// src/controllers/step9.closing.ts
// HTML en: /templates/tpl-step9-closing.html
import { createStep } from '../shared/step.factory';

export const Step11Closing = createStep({
  stepNumber: 11,
  templateId: 'tpl-step9-closing',
  phaseId: 'CLOSE',
  promptId: 'F6_2b',
  uiConfig: { loadingText: 'Expediente completo — Finalización...' },
});
