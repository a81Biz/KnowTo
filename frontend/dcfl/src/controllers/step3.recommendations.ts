// src/controllers/step3.recommendations.ts
// HTML en: /templates/tpl-step3-recommendations.html
//
// Controlador para F2_5: la IA genera recomendaciones pedagógicas (actividades,
// frecuencia de reportes, número y duración de videos) con justificación bibliográfica.
// El usuario puede agregar notas opcionales antes de generar.

import { createStep } from '../shared/step.factory';

export const Step3Recommendations = createStep({
  stepNumber: 3,
  templateId: 'tpl-step3-recommendations',
  phaseId: 'F2.5',
  promptId: 'F2_5',
  uiConfig: {
    loadingText: 'Generando Recomendaciones Pedagógicas (F2.5)...',
    helpText: 'La IA propone la estrategia pedagógica óptima: número de videos, duración, tipos de actividades y frecuencia de reportes. Estas recomendaciones alimentan directamente las Especificaciones Técnicas (siguiente paso).',
  },
});
