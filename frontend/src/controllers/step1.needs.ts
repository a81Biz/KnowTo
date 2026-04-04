// src/controllers/step1.needs.ts
// HTML en: /templates/tpl-step1-needs.html
import { createStep } from '../shared/step.factory';

export const Step1Needs = createStep({
  stepNumber: 1,
  templateId: 'tpl-step1-needs',
  phaseId: 'F1',
  promptId: 'F1',
  uiConfig: { loadingText: 'Generando Informe de Necesidades (F1)...' },
});
