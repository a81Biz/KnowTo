// src/controllers/step3.specs.ts
// HTML en: /templates/tpl-step3-specs.html
import { createStep } from '../shared/step.factory';

export const Step4Specs = createStep({
  stepNumber: 4,
  templateId: 'tpl-step3-specs',
  phaseId: 'F3',
  promptId: 'F3',
  uiConfig: { loadingText: 'Generando Especificaciones Técnicas (F3)...' },
});
