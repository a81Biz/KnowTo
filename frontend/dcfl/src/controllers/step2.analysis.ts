// src/controllers/step2.analysis.ts
// HTML en: /templates/tpl-step2-analysis.html
//
// Controlador para F2: carga el informe estructurado de F1 desde BD
// (GET /wizard/project/{id}/fase1/informe), muestra el perfil del participante
// y los objetivos preliminares para que el cliente los confirme o ajuste.
// Las respuestas de validación se pasan como userInputs al pipeline F2.

import { BaseStep } from '../shared/step.base';
import { getData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from '../shared/endpoints';
import { wizardStore } from '../stores/wizard.store';

interface PerfilParticipante {
  perfil_profesional?:          string;
  nivel_educativo_minimo?:      string;
  experiencia_previa?:          string;
  conocimientos_previos_requeridos?: string;
  rango_de_edad_estimado?:      string;
  motivacion_principal?:        string;
  [key: string]: string | undefined;
}

interface ObjetivoAprendizaje {
  objetivo:    string;
  nivel_bloom: string;
  tipo:        string;
}

interface InformeF1 {
  sintesis_contexto:      string | null;
  preguntas_respuestas:   Array<{ pregunta: string; respuesta: string }> | null;
  brechas_competencia:    Array<{ tipo: string; descripcion: string; capacitable: string }> | null;
  declaracion_problema:   string | null;
  objetivos_aprendizaje:  ObjetivoAprendizaje[] | null;
  perfil_participante:    PerfilParticipante | null;
  resultados_esperados:   string[] | null;
  recomendaciones_diseno: string[] | null;
}

const PERFIL_FIELDS = [
  'perfil_profesional',
  'nivel_educativo_minimo',
  'experiencia_previa',
  'conocimientos_previos_requeridos',
  'rango_de_edad_estimado',
  'motivacion_principal',
] as const;

// ── Controlador ──────────────────────────────────────────────────────────────

class Step2AnalysisController extends BaseStep {
  private _informe: InformeF1 | null = null;

  constructor() {
    super({
      stepNumber: 2,
      templateId: 'tpl-step2-analysis',
      phaseId: 'F2',
      promptId: 'F2',
      uiConfig: {
        loadingText: 'Generando Especificaciones de Análisis (F2)...',
        helpText:
          'Revisa el perfil y los objetivos que la IA propuso en el Informe de Necesidades. ' +
          'Confírmalos o indica los ajustes antes de que el sistema genere las especificaciones definitivas.',
      },
    });
  }

  /** Carga el informe F1 estructurado desde BD y renderiza perfil y objetivos. */
  private async _loadAndRenderF1Informe(): Promise<void> {
    const panelPerfil     = this._container.querySelector<HTMLElement>('#panel-perfil');
    const panelObjetivos  = this._container.querySelector<HTMLElement>('#panel-objetivos');
    const panelSinInforme = this._container.querySelector<HTMLElement>('#panel-sin-informe');

    const projectId = wizardStore.getState().projectId;
    if (!projectId) return;

    let informe: InformeF1 | null = null;
    try {
      const url = buildEndpoint(ENDPOINTS.wizard.fase1Informe(projectId));
      const res = await getData<InformeF1>(url);
      informe = res.data ?? null;
    } catch (err) {
      console.warn('[Step2Analysis] No se pudo cargar informe F1:', err);
    }

    // Si no hay informe estructurado aún (F1 no generó o tabla vacía),
    // mostrar aviso pero NO bloquear el botón — F2 puede generarse igual
    // con el contexto del documento F1 que ya tiene el pipeline.
    if (!informe) {
      panelSinInforme?.classList.remove('hidden');
      return; // sin informe → no hay paneles que mostrar, pero el botón queda habilitado
    }

    this._informe = informe;

    // ── Perfil del participante — prefill editable fields ────────────────────
    if (panelPerfil) {
      if (informe.perfil_participante) {
        for (const field of PERFIL_FIELDS) {
          const el = this._container.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${field}`);
          if (el) {
            const value = informe.perfil_participante[field] ?? '';
            el.value = value;
          }
        }
      }
      panelPerfil.classList.remove('hidden');
    }

    // ── Objetivos de aprendizaje ──────────────────────────────────────────────
    if (panelObjetivos && informe.objetivos_aprendizaje && informe.objetivos_aprendizaje.length > 0) {
      const objContent = this._container.querySelector<HTMLElement>('#objetivos-content');
      if (objContent) {
        const savedInputs =
          (wizardStore.getState().steps[2]?.inputData as Record<string, unknown>) ?? {};

        objContent.innerHTML = informe.objetivos_aprendizaje
          .map((obj, i) => {
            const isChecked = savedInputs[`objetivo_${i}`] !== 'no';
            return `
            <label class="flex items-start gap-3 cursor-pointer group bg-gray-50 border border-gray-200 rounded-lg p-3">
              <input type="checkbox" name="objetivo_${i}" value="si" ${isChecked ? 'checked' : ''}
                class="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
              <div class="text-sm">
                <span class="text-gray-800">${obj.objetivo}</span>
                <span class="ml-2 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">${obj.nivel_bloom}</span>
                <span class="ml-1 text-xs text-gray-400">${obj.tipo}</span>
              </div>
            </label>`;
          })
          .join('');
      }
      panelObjetivos.classList.remove('hidden');
    }
  }

  /** Muestra en el UI qué documentos previos están disponibles como contexto. */
  private _updateContextSummary(): void {
    const steps = wizardStore.getState().steps;
    const f0Done = steps[0]?.status === 'completed' && !!steps[0]?.documentContent;
    const f1Done = steps[1]?.status === 'completed' && !!steps[1]?.documentContent;

    const f0Icon  = this._container.querySelector<HTMLElement>('#ctx-f0-icon');
    const f0Label = this._container.querySelector<HTMLElement>('#ctx-f0-label');
    const f1Icon  = this._container.querySelector<HTMLElement>('#ctx-f1-icon');
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

    if (this._dom.btnSubmit) {
      this._dom.btnSubmit.disabled = !f0Done || !f1Done;
      if (!f0Done || !f1Done) {
        this._dom.btnSubmit.title = 'Completa F0 y F1 antes de generar las especificaciones';
      }
    }
  }

  /** Collects edited profile fields from the form and passes them as perfilAjustado. */
  private _collectPerfilAjustado(): Record<string, string> {
    const perfil: Record<string, string> = {};
    for (const field of PERFIL_FIELDS) {
      const el = this._container.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${field}`);
      if (el && el.value.trim()) perfil[field] = el.value.trim();
    }
    return perfil;
  }

  /** Inyecta los datos del informe F1 como userInputs adicionales al pipeline F2. */
  protected override async _generateDocument(extraData?: Record<string, unknown>): Promise<void> {
    const informeData: Record<string, unknown> = {};

    if (this._informe) {
      informeData['declaracionProblema'] = this._informe.declaracion_problema ?? '';
      informeData['brechas']             = JSON.stringify(this._informe.brechas_competencia ?? []);
      informeData['recomendaciones']     = JSON.stringify(this._informe.recomendaciones_diseno ?? []);
      informeData['objetivosPropuestos'] = JSON.stringify(this._informe.objetivos_aprendizaje ?? []);
    }

    const perfilAjustado = this._collectPerfilAjustado();
    if (Object.keys(perfilAjustado).length > 0) {
      informeData['perfilAjustado'] = JSON.stringify(perfilAjustado);
    }

    return super._generateDocument({ ...informeData, ...extraData });
  }

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container);
    this._updateContextSummary();
    await this._loadAndRenderF1Informe();
  }

  protected override _renderPreview(markdown: string): void {
    const updated = this._calculateTotalDuration(markdown);
    super._renderPreview(updated);
  }

  private _calculateTotalDuration(markdown: string): string {
    const lines = markdown.split('\n');
    let totalMinutes = 0;
    let tableIndex = -1;
    let isInsideTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('| Componente | Cantidad |')) {
        isInsideTable = true;
        continue;
      }
      if (isInsideTable) {
        if (!line.trim().startsWith('|')) {
          tableIndex = i;
          break;
        }
        if (line.includes('---')) continue;
        const cols = line.split('|').map((c) => c.trim());
        if (cols.length >= 4) {
          const qtyMatch  = cols[2].match(/\d+/);
          const timeMatch = cols[3].match(/\d+/);
          if (qtyMatch && timeMatch) {
            totalMinutes += parseInt(qtyMatch[0]) * parseInt(timeMatch[0]);
          }
        }
      }
    }

    if (isInsideTable && tableIndex === -1) tableIndex = lines.length;

    if (totalMinutes > 0 && tableIndex !== -1) {
      const hours    = Math.floor(totalMinutes / 60);
      const min      = totalMinutes % 60;
      const totalText = hours > 0 ? `${hours} hr ${min} min` : `${min} min`;
      const totalHr   = (totalMinutes / 60).toFixed(1);
      lines.splice(tableIndex, 0,
        `| **TOTAL CALCULADO FRONTEND** | | **${totalText} (${totalHr} hrs)** |`,
      );
      return lines.join('\n');
    }

    return markdown;
  }
}

// ── Exportación ──────────────────────────────────────────────────────────────

const _instance = new Step2AnalysisController();

export const Step2Analysis = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
