// src/controllers/step6.evidence.ts
// HTML en: /templates/tpl-step6-evidence.html
import { createStep } from '../shared/step.factory';

export const Step6Evidence = createStep({
  stepNumber: 6,
  templateId: 'tpl-step6-evidence',
  phaseId: 'F5.2',
  promptId: 'F5_2',
  uiConfig: { loadingText: 'Generando Anexo de Evidencias (F5.2)...' },
});
