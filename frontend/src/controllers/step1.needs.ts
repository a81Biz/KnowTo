// src/controllers/step1needs.ts
// Paso 1: controlador que sigue las 7 secciones del FRONTEND ARCHITECTURE DOCUMENT
// HTML en: /templates/tpl-step1-needs.html (NO HTML embebido aquí)

// ============================================================================
// 1. DEPENDENCIAS
// ============================================================================
import { BaseStep } from '../shared/step.base';
import type { PhaseId, PromptId } from '../types/wizard.types';

// ============================================================================
// 2. ESTADO PRIVADO Y CONFIGURACIÓN
// ============================================================================
const _config = {
  stepNumber: 1,
  templateId: 'tpl-step1-needs',
  phaseId: 'F1' as PhaseId,
  promptId: 'F1' as PromptId,
};

// ============================================================================
// 3-6. Implementadas en BaseStep (cache DOM, vista, negocio, eventos)
// ============================================================================
class Step1Needs extends BaseStep {
  constructor() {
    super(_config);
    this._uiConfig.loadingText = 'Generando documento para F1...';
  }
}

// ============================================================================
// 7. API PÚBLICA (export const — patrón del FRONTEND ARCHITECTURE DOCUMENT)
// ============================================================================
const _instance = new Step1Needs();

export const Step1Needs = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
