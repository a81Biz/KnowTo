// src/controllers/step11.closing.ts
// HTML en: /templates/tpl-step9-closing.html
import { createStep } from '../shared/step.factory';

export const Step11Closing = createStep({
  stepNumber: 12,
  templateId: 'tpl-step9-closing',
  phaseId: 'CLOSE',
  promptId: null, // Paso de cierre: solo guarda y marca como completado, sin IA
  allowManualOverride: true,
  uiConfig: {
    loadingText: 'Finalizando expediente...',
    submitText: '🎉 Finalizar expediente',
    helpText: 'Este es el último paso. Revisa que todos los productos del expediente estén completos. Al confirmar, el proceso de certificación EC0366 quedará registrado como finalizado.',
    summaryTemplate: (d) => d['manualNotes']
      ? `Notas finales: ${String(d['manualNotes']).substring(0, 100)}`
      : 'Expediente listo para finalizar.',
  },
});
