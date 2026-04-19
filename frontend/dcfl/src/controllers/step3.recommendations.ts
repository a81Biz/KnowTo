// src/controllers/step3.recommendations.ts
// HTML en: /templates/tpl-step3-recommendations.html
//
// Controlador para F2.5: carga las discrepancias F1↔F2, las presenta al
// usuario ANTES del botón de generación, guarda las resoluciones y las pasa
// como insumo al pipeline de Recomendaciones Pedagógicas.

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

interface Resolucion {
  aspecto: string;
  decision: 'f1' | 'f2' | 'intermedio';
  valor_elegido: string;
}

// ── Controlador ───────────────────────────────────────────────────────────────

class Step3RecommendationsController extends BaseStep {
  private _discrepancias: Discrepancia[] = [];
  private _valoresResueltos: Resolucion[] = [];
  private _confrontacionResuelta = false;

  constructor() {
    super({
      stepNumber: 3,
      templateId: 'tpl-step3-recommendations',
      phaseId: 'F2.5',
      promptId: 'F2_5',
      uiConfig: {
        loadingText: 'Generando Recomendaciones Pedagógicas (F2.5)...',
        helpText:
          'Revisa las diferencias detectadas entre el Informe de Necesidades (F1) y las ' +
          'Especificaciones de Análisis (F2). Tus decisiones alimentarán directamente a la IA ' +
          'para que las Recomendaciones sean coherentes con lo acordado.',
      },
    });
  }

  // ── Carga ─────────────────────────────────────────────────────────────────

  private async _loadDiscrepancias(): Promise<void> {
    const { projectId } = wizardStore.getState();
    if (!projectId) return;

    // Primero verificar si ya existen resoluciones guardadas
    try {
      const resRes = await getData<{ resoluciones: Resolucion[]; listo_para_f3: boolean }>(
        buildEndpoint(ENDPOINTS.wizard.fase2Resolucion(projectId)),
      );
      if (resRes.data?.resoluciones?.length) {
        this._valoresResueltos = resRes.data.resoluciones;
        this._confrontacionResuelta = true;
        return; // Ya resuelto — no hace falta mostrar el panel otra vez
      }
    } catch { /* sin resoluciones previas */ }

    try {
      const discRes = await getData<{ discrepancias: Discrepancia[]; total: number }>(
        buildEndpoint(ENDPOINTS.wizard.fase2Discrepancias(projectId)),
      );
      this._discrepancias = discRes.data?.discrepancias ?? [];
    } catch {
      this._discrepancias = [];
    }
  }

  // ── Render panel confrontación ────────────────────────────────────────────

  private _injectConfrontacionPanel(): void {
    const btnSubmit = this._dom.btnSubmit;
    if (!btnSubmit) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'confrontacion-panel';
    wrapper.className = 'space-y-4';

    // Ya resuelto anteriormente → mostrar badge y desbloquear botón
    if (this._confrontacionResuelta) {
      wrapper.innerHTML = `
        <div class="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-green-600 text-xl">✅</span>
            <div>
              <p class="font-semibold text-green-800 text-sm">Confrontación F1↔F2 ya resuelta</p>
              <p class="text-green-700 text-xs mt-0.5">${this._valoresResueltos.length} decisión(es) guardada(s) — la IA las usará como insumo.</p>
            </div>
          </div>
          <button id="btn-reabrir-confrontacion" type="button"
            class="text-xs text-green-700 underline hover:text-green-900">Revisar</button>
        </div>`;
      btnSubmit.parentElement?.insertBefore(wrapper, btnSubmit);
      wrapper.querySelector('#btn-reabrir-confrontacion')
        ?.addEventListener('click', () => this._reabrirConfrontacion(wrapper));
      return;
    }

    // Sin discrepancias → informar y desbloquear
    if (this._discrepancias.length === 0) {
      wrapper.innerHTML = `
        <div class="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span class="text-green-600 text-xl">✅</span>
          <div>
            <p class="font-semibold text-green-800 text-sm">Sin diferencias entre F1 y F2</p>
            <p class="text-green-700 text-xs mt-0.5">El Informe de Necesidades y las Especificaciones de Análisis son consistentes.</p>
          </div>
        </div>`;
      btnSubmit.parentElement?.insertBefore(wrapper, btnSubmit);
      this._confrontacionResuelta = true;
      return;
    }

    // Hay discrepancias → bloquear botón y mostrar formulario
    btnSubmit.disabled = true;

    const cards = this._discrepancias.map((d, idx) => `
      <div class="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
        <div class="flex items-center gap-2">
          <span class="text-amber-500">⚠️</span>
          <h4 class="font-semibold text-amber-900 text-sm">${d.descripcion}</h4>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div class="bg-white border border-blue-100 rounded-lg p-3">
            <div class="font-bold text-blue-600 uppercase tracking-wide mb-1">Informe de Necesidades (F1)</div>
            <div class="text-gray-800 font-medium">${d.valor_f1}</div>
            <div class="text-gray-400 mt-1">${d.justificacion_f1}</div>
          </div>
          <div class="bg-white border border-green-100 rounded-lg p-3">
            <div class="font-bold text-green-600 uppercase tracking-wide mb-1">Especificaciones de Análisis (F2)</div>
            <div class="text-gray-800 font-medium">${d.valor_f2}</div>
            <div class="text-gray-400 mt-1">${d.justificacion_f2}</div>
          </div>
        </div>
        <div class="space-y-1.5">
          <p class="text-xs font-semibold text-gray-700">¿Qué valor debe usar la IA para generar las Recomendaciones?</p>
          ${d.opciones.map((op) => `
            <label class="flex items-start gap-2 cursor-pointer bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-blue-400 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 transition-colors">
              <input type="radio" name="disc_${idx}" value="${op.id}"
                data-aspecto="${d.aspecto}" data-valor="${op.valor}"
                class="mt-0.5 h-3.5 w-3.5 text-blue-600 shrink-0">
              <span class="text-xs text-gray-700">${op.label}</span>
            </label>`).join('')}
        </div>
      </div>`).join('');

    wrapper.innerHTML = `
      <div class="border border-amber-300 rounded-xl p-4 space-y-4 bg-white">
        <div class="flex items-center gap-2">
          <span class="text-xl">⚖️</span>
          <h3 class="font-semibold text-gray-800">Confrontación F1↔F2 — ${this._discrepancias.length} diferencia(s) detectada(s)</h3>
        </div>
        <p class="text-sm text-gray-500">Elige qué valor debe prevalecer en cada caso. La IA usará estas decisiones para generar las Recomendaciones Pedagógicas.</p>
        <div id="disc-list" class="space-y-4">${cards}</div>
        <button id="btn-confirmar-disc" type="button"
          class="w-full bg-amber-600 text-white py-3 px-6 rounded-xl font-semibold text-sm hover:bg-amber-700 transition-colors disabled:opacity-50"
          disabled>
          Confirmar decisiones →
        </button>
      </div>`;

    btnSubmit.parentElement?.insertBefore(wrapper, btnSubmit);

    const list = wrapper.querySelector<HTMLElement>('#disc-list');
    const btnConfirmar = wrapper.querySelector<HTMLButtonElement>('#btn-confirmar-disc');

    list?.addEventListener('change', () => {
      const allAnswered = this._discrepancias.every((_, i) =>
        !!wrapper.querySelector<HTMLInputElement>(`input[name="disc_${i}"]:checked`),
      );
      if (btnConfirmar) btnConfirmar.disabled = !allAnswered;
    });

    btnConfirmar?.addEventListener('click', () => void this._confirmarDiscrepancias(wrapper));
  }

  private async _confirmarDiscrepancias(wrapper: HTMLElement): Promise<void> {
    const { projectId } = wizardStore.getState();
    if (!projectId) return;

    const resoluciones: Resolucion[] = [];
    for (let i = 0; i < this._discrepancias.length; i++) {
      const radio = wrapper.querySelector<HTMLInputElement>(`input[name="disc_${i}"]:checked`);
      if (!radio) return;
      resoluciones.push({
        aspecto:       radio.dataset['aspecto'] ?? this._discrepancias[i]?.aspecto ?? '',
        decision:      radio.value as 'f1' | 'f2' | 'intermedio',
        valor_elegido: radio.dataset['valor'] ?? '',
      });
    }

    const btnConfirmar = wrapper.querySelector<HTMLButtonElement>('#btn-confirmar-disc');
    if (btnConfirmar) { btnConfirmar.disabled = true; btnConfirmar.textContent = '⏳ Guardando...'; }

    try {
      await postData(buildEndpoint(ENDPOINTS.wizard.fase2Resolver(projectId)), {
        resoluciones,
        discrepancias: this._discrepancias,
      });

      this._valoresResueltos = resoluciones;
      this._confrontacionResuelta = true;

      // Reemplazar el panel por confirmación y desbloquear el botón de generar
      wrapper.innerHTML = `
        <div class="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span class="text-green-600 text-xl">✅</span>
          <div>
            <p class="font-semibold text-green-800 text-sm">Decisiones guardadas — ${resoluciones.length} resolución(es)</p>
            <p class="text-green-700 text-xs mt-0.5">La IA usará estos insumos al generar las Recomendaciones Pedagógicas.</p>
          </div>
        </div>`;

      if (this._dom.btnSubmit) this._dom.btnSubmit.disabled = false;
    } catch (err) {
      if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = 'Confirmar decisiones →'; }
      showError(err instanceof Error ? err.message : 'Error al guardar las decisiones.');
    }
  }

  private _reabrirConfrontacion(wrapper: HTMLElement): void {
    // Resetear estado y re-renderizar el panel con el formulario
    this._confrontacionResuelta = false;
    this._valoresResueltos = [];
    wrapper.remove();
    this._injectConfrontacionPanel();
  }

  // ── Generación con insumos de confrontación ───────────────────────────────

  protected override async _generateDocumentAsync(extraData?: Record<string, unknown>): Promise<void> {
    const merged: Record<string, unknown> = { ...extraData };
    if (this._valoresResueltos.length > 0) {
      merged['valores_resueltos'] = JSON.stringify(this._valoresResueltos);
    }
    return super._generateDocumentAsync(merged);
  }

  // ── Montaje ───────────────────────────────────────────────────────────────

  override async mount(container: HTMLElement): Promise<void> {
    await this._loadDiscrepancias();
    await super.mount(container);
    this._injectConfrontacionPanel();
  }
}

// ── Exportación ───────────────────────────────────────────────────────────────

const _instance = new Step3RecommendationsController();

export const Step3Recommendations = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
