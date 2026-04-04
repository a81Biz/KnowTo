// src/controllers/step8payment.ts
// Paso 8: controlador que sigue las 7 secciones del FRONTEND ARCHITECTURE DOCUMENT
// HTML en: /templates/tpl-step8-payment.html (NO HTML embebido aquí)

// ============================================================================
// 1. DEPENDENCIAS
// ============================================================================
import { BaseStep } from '../shared/step.base';
import type { PhaseId, PromptId } from '../types/wizard.types';

// ============================================================================
// 2. ESTADO PRIVADO Y CONFIGURACIÓN
// ============================================================================
const _config = {
  stepNumber: 8,
  templateId: 'tpl-step8-payment',
  phaseId: 'F6.2' as PhaseId,
  promptId: 'F6_2' as PromptId,
};

// ============================================================================
// 3-6. Implementadas en BaseStep (cache DOM, vista, negocio, eventos)
// ============================================================================
class Step8Payment extends BaseStep {
  constructor() {
    super(_config);
    this._uiConfig.loadingText = 'Generando documento para F6.2...';
  }
}

// ============================================================================
// 7. API PÚBLICA (export const — patrón del FRONTEND ARCHITECTURE DOCUMENT)
// ============================================================================
const _instance = new Step8Payment();

export const Step8Payment = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
