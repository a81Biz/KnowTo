// src/controllers/step9.inventory.ts
// HTML en: /templates/tpl-step8-payment.html
import { createStep } from '../shared/step.factory';

export const Step9Inventory = createStep({
  stepNumber: 9,
  templateId: 'tpl-step8-payment',
  phaseId: 'F6.2a',
  promptId: 'F6_2a',
  uiConfig: {
    loadingText: 'Generando Inventario del Expediente y Firmas (F6.2a)...',
    helpText: 'La IA genera el inventario completo del expediente de certificación y la hoja de firmas requerida por el CONOCER. Este documento forma parte de los entregables obligatorios del proceso EC0366.',
  },
});
