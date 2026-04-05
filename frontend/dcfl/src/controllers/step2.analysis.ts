// src/controllers/step2.analysis.ts
// HTML en: /templates/tpl-step2-analysis.html
//
// Controlador personalizado para F2: muestra qué documentos previos (F0, F1)
// están disponibles como contexto y genera las especificaciones completas con IA.
// El usuario solo puede agregar notas adicionales opcionales; el resto lo genera el sistema.

import { BaseStep } from '../shared/step.base';
import { wizardStore } from '../stores/wizard.store';

class Step2AnalysisController extends BaseStep {
  constructor() {
    super({
      stepNumber: 2,
      templateId: 'tpl-step2-analysis',
      phaseId: 'F2',
      promptId: 'F2',
      uiConfig: { loadingText: 'Generando Especificaciones de Análisis (F2)...' },
    });
  }

  /** Muestra en el UI qué documentos previos están disponibles como contexto. */
  private _updateContextSummary(): void {
    const steps = wizardStore.getState().steps;

    const f0Done = steps[0]?.status === 'completed' && !!steps[0]?.documentContent;
    const f1Done = steps[1]?.status === 'completed' && !!steps[1]?.documentContent;

    const f0Icon = this._container.querySelector<HTMLElement>('#ctx-f0-icon');
    const f0Label = this._container.querySelector<HTMLElement>('#ctx-f0-label');
    const f1Icon = this._container.querySelector<HTMLElement>('#ctx-f1-icon');
    const f1Label = this._container.querySelector<HTMLElement>('#ctx-f1-label');

    if (f0Icon && f0Label) {
      f0Icon.textContent = f0Done ? '✅' : '⚠️';
      f0Label.textContent = f0Done
        ? 'Marco de Referencia (F0): disponible'
        : 'Marco de Referencia (F0): no completado — regresa al Paso 0';
      f0Label.classList.toggle('text-amber-700', !f0Done);
      f0Label.classList.toggle('text-blue-700', f0Done);
    }

    if (f1Icon && f1Label) {
      f1Icon.textContent = f1Done ? '✅' : '⚠️';
      f1Label.textContent = f1Done
        ? 'Informe de Necesidades (F1): disponible'
        : 'Informe de Necesidades (F1): no completado — regresa al Paso 1';
      f1Label.classList.toggle('text-amber-700', !f1Done);
      f1Label.classList.toggle('text-blue-700', f1Done);
    }

    // Deshabilitar el botón de submit si faltan documentos previos
    if (this._dom.btnSubmit) {
      this._dom.btnSubmit.disabled = !f0Done || !f1Done;
      if (!f0Done || !f1Done) {
        this._dom.btnSubmit.title =
          'Completa F0 y F1 antes de generar las especificaciones';
      }
    }
  }

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container);
    this._updateContextSummary();
  }
}

// ── Exportación ──────────────────────────────────────────────────────────────

const _instance = new Step2AnalysisController();

export const Step2Analysis = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
