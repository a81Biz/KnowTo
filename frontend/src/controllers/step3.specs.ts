// src/controllers/step3specs.ts
// Paso 3: controlador que sigue las 7 secciones del FRONTEND ARCHITECTURE DOCUMENT
// HTML en: /templates/tpl-step3-specs.html (NO HTML embebido aquí)

// ============================================================================
// 1. DEPENDENCIAS
// ============================================================================
import { BaseStep } from '../shared/step.base';
import type { PhaseId, PromptId } from '../types/wizard.types';

// ============================================================================
// 2. ESTADO PRIVADO Y CONFIGURACIÓN
// ============================================================================
const _config = {
  stepNumber: 3,
  templateId: 'tpl-step3-specs',
  phaseId: 'F3' as PhaseId,
  promptId: 'F3' as PromptId,
};

// ============================================================================
// 3-6. Implementadas en BaseStep (cache DOM, vista, negocio, eventos)
// ============================================================================
class Step3Specs extends BaseStep {
  constructor() {
    super(_config);
    this._uiConfig.loadingText = 'Generando documento para F3...';
  }
}

// ============================================================================
// 7. API PÚBLICA (export const — patrón del FRONTEND ARCHITECTURE DOCUMENT)
// ============================================================================
const _instance = new Step3Specs();

export const Step3Specs = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
