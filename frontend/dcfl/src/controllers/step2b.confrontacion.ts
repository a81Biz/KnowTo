// src/controllers/step2b.confrontacion.ts
// Paso 3 del wizard (insertado entre F2 y F2.5).
// Confronta el Informe de Necesidades (F1) con las Especificaciones de Análisis (F2),
// muestra discrepancias detectadas automáticamente y permite al cliente resolverlas
// antes de generar F3.

import { BaseStep } from '../shared/step.base';
import { getData, postData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from '../shared/endpoints';
import { wizardStore } from '../stores/wizard.store';
import { showError } from '@core/ui';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface OpcionResolucion {
  id: 'f1' | 'f2' | 'intermedio';
  label: string;
  valor: string;
}

interface Discrepancia {
  aspecto: string;
  descripcion: string;
  valor_f1: string;
  justificacion_f1: string;
  valor_f2: string;
  justificacion_f2: string;
  opciones: OpcionResolucion[];
}

interface DiscrepanciasResponse {
  discrepancias: Discrepancia[];
  total: number;
}

// ── Controlador ───────────────────────────────────────────────────────────────

class Step2bConfrontacionController extends BaseStep {
  private _discrepancias: Discrepancia[] = [];

  constructor() {
    super({
      stepNumber: 3,
      templateId: 'tpl-step2b-confrontacion',
      phaseId: 'F2',
      promptId: null,
      uiConfig: {
        submitText: 'Confirmar decisiones y continuar →',
        submittingText: '⏳ Guardando decisiones...',
        helpText:
          'El sistema comparó automáticamente el Informe de Necesidades (F1) con las ' +
          'Especificaciones de Análisis (F2). Revisa cada diferencia y elige qué valor ' +
          'debe prevalecer. Si no hay diferencias, puedes continuar directamente.',
      },
    });
  }

  // ── Montaje ───────────────────────────────────────────────────────────────────

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container);  // loads template, caches DOM
    await this._loadDiscrepancias();
  }

  protected override _bindEvents(): void {
    this._bindEventsConfrontacion();
  }

  private async _loadDiscrepancias(): Promise<void> {
    const { projectId } = wizardStore.getState();
    if (!projectId) return;

    const panelLoading    = this._container.querySelector<HTMLElement>('#panel-loading');
    const panelCards      = this._container.querySelector<HTMLElement>('#panel-cards');
    const panelNoConflict = this._container.querySelector<HTMLElement>('#panel-no-conflict');

    panelLoading?.classList.remove('hidden');

    try {
      const url = buildEndpoint(ENDPOINTS.wizard.fase2Discrepancias(projectId));
      const res = await getData<DiscrepanciasResponse>(url);
      this._discrepancias = res.data?.discrepancias ?? [];
    } catch (err) {
      console.warn('[Step2b] No se pudieron cargar discrepancias:', err);
      this._discrepancias = [];
    } finally {
      panelLoading?.classList.add('hidden');
    }

    if (this._discrepancias.length === 0) {
      panelNoConflict?.classList.remove('hidden');
      // Habilitar botón directamente — no hay nada que resolver
      if (this._dom.btnSubmit) {
        this._dom.btnSubmit.disabled = false;
        this._dom.btnSubmit.textContent = 'Sin diferencias — continuar →';
      }
      return;
    }

    this._renderCards();
    panelCards?.classList.remove('hidden');
    this._updateSubmitButton();

    // Enable button once every discrepancy has a selection
    const list = this._container.querySelector<HTMLElement>('#discrepancias-list');
    list?.addEventListener('change', () => this._updateSubmitButton());
  }

  private _updateSubmitButton(): void {
    if (!this._dom.btnSubmit) return;
    const allAnswered = this._discrepancias.every((_, idx) =>
      !!this._container.querySelector<HTMLInputElement>(`input[name="resolucion_${idx}"]:checked`),
    );
    this._dom.btnSubmit.disabled = !allAnswered;
  }

  private _renderCards(): void {
    const container = this._container.querySelector<HTMLElement>('#discrepancias-list');
    if (!container) return;

    container.innerHTML = this._discrepancias.map((d, idx) => `
      <div class="border border-amber-200 bg-amber-50 rounded-xl p-5 space-y-4">
        <div class="flex items-center gap-2">
          <span class="text-amber-500 text-lg">⚠️</span>
          <h3 class="font-semibold text-amber-900">${d.descripcion}</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div class="bg-white border border-blue-100 rounded-lg p-3">
            <div class="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Informe de Necesidades (F1)</div>
            <div class="text-gray-800 font-medium">${d.valor_f1}</div>
            <div class="text-gray-400 text-xs mt-1">${d.justificacion_f1}</div>
          </div>
          <div class="bg-white border border-green-100 rounded-lg p-3">
            <div class="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Especificaciones de Análisis (F2)</div>
            <div class="text-gray-800 font-medium">${d.valor_f2}</div>
            <div class="text-gray-400 text-xs mt-1">${d.justificacion_f2}</div>
          </div>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium text-gray-700">¿Cuál valor debe prevalecer para generar F3?</p>
          ${d.opciones.map((op) => `
            <label class="flex items-start gap-3 cursor-pointer bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-400 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 transition-colors">
              <input type="radio" name="resolucion_${idx}" value="${op.id}"
                data-aspecto="${d.aspecto}" data-valor="${op.valor}"
                class="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" required>
              <span class="text-sm text-gray-700">${op.label}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  private _bindEventsConfrontacion(): void {
    const form = this._container.querySelector<HTMLFormElement>(`#form-step3`);
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this._handleSubmit(form);
    });
  }

  private async _handleSubmit(form: HTMLFormElement): Promise<void> {
    const { projectId } = wizardStore.getState();
    if (!projectId) {
      showError('No hay proyecto activo.');
      return;
    }

    if (this._dom.btnSubmit) {
      this._dom.btnSubmit.disabled = true;
      this._dom.btnSubmit.textContent = this._uiConfig.submittingText;
    }

    try {
      // Recopilar resoluciones del formulario
      const resoluciones: Array<{ aspecto: string; decision: 'f1' | 'f2' | 'intermedio'; valor_elegido: string }> = [];

      if (this._discrepancias.length > 0) {
        for (let i = 0; i < this._discrepancias.length; i++) {
          const radio = this._container.querySelector<HTMLInputElement>(`input[name="resolucion_${i}"]:checked`);
          if (!radio) {
            showError(`Por favor elige una opción para "${this._discrepancias[i]?.descripcion ?? 'la discrepancia'}".`);
            if (this._dom.btnSubmit) {
              this._dom.btnSubmit.disabled = false;
              this._dom.btnSubmit.textContent = this._uiConfig.submitText;
            }
            return;
          }
          resoluciones.push({
            aspecto:       radio.dataset['aspecto'] ?? this._discrepancias[i]?.aspecto ?? '',
            decision:      radio.value as 'f1' | 'f2' | 'intermedio',
            valor_elegido: radio.dataset['valor'] ?? '',
          });
        }
      }

      // Guardar en BD
      const url = buildEndpoint(ENDPOINTS.wizard.fase2Resolver(projectId));
      await postData(url, {
        resoluciones,
        discrepancias: this._discrepancias,
      });

      // Guardar en store y marcar paso completado
      wizardStore.setStepInputData(3, { resoluciones, total_discrepancias: this._discrepancias.length });
      wizardStore.setStepStatus(3, 'completed');

      // Avanzar al siguiente paso
      wizardStore.goToStep(4);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al guardar las decisiones.');
      if (this._dom.btnSubmit) {
        this._dom.btnSubmit.disabled = false;
        this._dom.btnSubmit.textContent = this._uiConfig.submitText;
      }
    }
  }
}

const _instance = new Step2bConfrontacionController();

export const Step2bConfrontacion = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
