// src/controllers/step7adjustments.ts
// Paso 7: controlador que sigue las 7 secciones del FRONTEND ARCHITECTURE DOCUMENT
// HTML en: /templates/tpl-step7-adjustments.html (NO HTML embebido aquí)

// ============================================================================
// 1. DEPENDENCIAS
// ============================================================================
import { BaseStep } from '../shared/step.base';
import type { PhaseId, PromptId } from '../types/wizard.types';

// ============================================================================
// 2. ESTADO PRIVADO Y CONFIGURACIÓN
// ============================================================================
const _config = {
  stepNumber: 7,
  templateId: 'tpl-step7-adjustments',
  phaseId: 'F6.1' as PhaseId,
  promptId: 'F6' as PromptId,
};

// ============================================================================
// 3-6. Implementadas en BaseStep (cache DOM, vista, negocio, eventos)
// ============================================================================
class Step7Adjustments extends BaseStep {
  constructor() {
    super(_config);
    this._uiConfig.loadingText = 'Generando documento para F6.1...';
  }
}

// ============================================================================
// 7. API PÚBLICA (export const — patrón del FRONTEND ARCHITECTURE DOCUMENT)
// ============================================================================
const _instance = new Step7Adjustments();

export const Step7Adjustments = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
