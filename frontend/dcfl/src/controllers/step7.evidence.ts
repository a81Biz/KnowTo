// src/controllers/step7.evidence.ts
// HTML en: /templates/tpl-step6-evidence.html
import { createStep } from '../shared/step.factory';

export const Step7Evidence = createStep({
  stepNumber: 8,
  templateId: 'tpl-step6-evidence',
  phaseId: 'F5.2',
  promptId: 'F5_2',
  uiConfig: {
    loadingText: 'Generando Anexo de Evidencias (F5.2)...',
    helpText: 'La IA genera una plantilla de anexo de evidencias con las URLs y referencias de los materiales producidos. Proporciona las URLs de los archivos para que el sistema las incorpore al expediente.',
  },
});
