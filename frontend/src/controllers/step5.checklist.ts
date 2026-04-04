// src/controllers/step5.checklist.ts
// HTML en: /templates/tpl-step5-checklist.html
import { createStep } from '../shared/step.factory';

export const Step5Checklist = createStep({
  stepNumber: 5,
  templateId: 'tpl-step5-checklist',
  phaseId: 'F5.1',
  promptId: 'F5',
  uiConfig: { loadingText: 'Generando Checklist de Verificación (F5.1)...' },
});
