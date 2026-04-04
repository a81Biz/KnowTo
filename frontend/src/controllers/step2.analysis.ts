// src/controllers/step2.analysis.ts
// HTML en: /templates/tpl-step2-analysis.html
import { createStep } from '../shared/step.factory';

export const Step2Analysis = createStep({
  stepNumber: 2,
  templateId: 'tpl-step2-analysis',
  phaseId: 'F2',
  promptId: 'F2',
  uiConfig: { loadingText: 'Generando Especificaciones de Análisis (F2)...' },
});
