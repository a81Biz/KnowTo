// src/controllers/step9.closing.ts
// HTML en: /templates/tpl-step9-closing.html
import { createStep } from '../shared/step.factory';

export const Step9Closing = createStep({
  stepNumber: 9,
  templateId: 'tpl-step9-closing',
  phaseId: 'CLOSE',
  promptId: 'F6_2',
  uiConfig: { loadingText: 'Generando documento de Finalización...' },
});
