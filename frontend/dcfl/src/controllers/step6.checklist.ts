// src/controllers/step6.checklist.ts
// HTML en: /templates/tpl-step5-checklist.html
import { createStep } from '../shared/step.factory';

export const Step6Checklist = createStep({
  stepNumber: 7,
  templateId: 'tpl-step5-checklist',
  phaseId: 'F5.1',
  promptId: 'F5',
  uiConfig: {
    loadingText: 'Generando Checklist de Verificación (F5.1)...',
    helpText: 'La IA genera un checklist técnico y pedagógico personalizado para verificar que todos los productos de producción cumplen con los criterios del estándar EC0366 (E1221). Revisa cada ítem antes de continuar.',
  },
});
