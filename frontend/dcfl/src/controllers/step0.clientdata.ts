// src/controllers/step0.clientdata.ts
// HTML en: /templates/tpl-step0-clientdata.html
import { createStep } from '../shared/step.factory';

export const Step0ClientData = createStep({
  stepNumber: 0,
  templateId: 'tpl-step0-clientdata',
  phaseId: 'F0',
  promptId: 'F0',
  createProjectFirst: true,
  uiConfig: { loadingText: 'Generando Marco de Referencia (F0)...' },
});
