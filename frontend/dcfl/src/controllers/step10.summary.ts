// src/controllers/step10.summary.ts
// HTML en: /templates/tpl-step10-summary.html
// F6_2b: Resumen Ejecutivo y Declaración Final

import { createStep } from '../shared/step.factory';

export const Step10Summary = createStep({
  stepNumber: 11,
  templateId: 'tpl-step10-summary',
  phaseId: 'F6.2b',
  promptId: 'F6_2b',
  uiConfig: {
    loadingText: 'Generando Resumen Ejecutivo y Declaración Final (F6.2b)...',
    helpText: 'La IA genera el resumen ejecutivo del proceso de certificación y la declaración final del candidato. Este documento es el penúltimo entregable del expediente EC0366.',
  },
});
