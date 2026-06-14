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

interface ObjetivoEspecífico {
  objetivo:    string;
  nivel_bloom: string;
  dominio:        string;
}

interface InformeF1 {
  sintesis_contexto:      string | null;
  preguntas_respuestas:   Array<{ pregunta: string; respuesta: string }> | null;
  brechas_competencia:    Array<{ tipo: string; descripcion: string; capacitable: string }> | null;
  declaracion_problema:   string | null;
  objetivos_aprendizaje:  any[] | null;
  objetivos_especificos:  ObjetivoEspecífico[] | null;
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

    const projectId = wizardStore.getState()?.projectId;
    if (!projectId) return;

    let informe: InformeF1 | null = null;
    try {
      const url = buildEndpoint(ENDPOINTS.wizard.fase1Informe(projectId));
      const res = await getData<InformeF1>(url);
      informe = res?.data ?? null;
    } catch (err) {
      console.warn('[Step2Analysis] Error al cargar informe F1:', err);
    }

    // Programación defensiva: Siempre mostrar los paneles base para que el usuario pueda trabajar
    panelPerfil?.classList.remove('hidden');
    panelObjetivos?.classList.remove('hidden');

    if (!informe) {
      panelSinInforme?.classList.remove('hidden');
      // No retornamos aquí para permitir que los campos vacíos sean visibles
    }

    this._informe = informe;

    try {
      // ── Perfil del participante — prefill editable fields ────────────────────
      this._fillProfileFields(informe?.perfil_participante ?? null);

      // ── Objetivos de aprendizaje (Bloom) ──────────────────────────────────
      const todosLosObjetivos = informe?.objetivos_aprendizaje || informe?.objetivos_especificos || [];
      const objetivos = Array.isArray(todosLosObjetivos) 
        ? todosLosObjetivos.filter((obj: any) => obj?.tipo && obj.tipo.toLowerCase() !== 'general')
        : [];

      const objContent = this._container.querySelector<HTMLElement>('#objetivos-content');
      
      if (objContent) {
        objContent.innerHTML = ''; // Limpiar siempre
        
        if (objetivos.length > 0) {
          const savedInputs = (wizardStore.getState().steps[2]?.inputData as any)?.objetivosAprobados ?? [];

          objContent.innerHTML = objetivos
            .map((obj: any, i: number) => {
              if (!obj?.objetivo) return '';
              const isChecked = savedInputs.length === 0 || savedInputs.includes(obj.objetivo);
              return `
              <label class="flex items-start gap-3 cursor-pointer group bg-gray-50 border border-gray-200 rounded-lg p-3 transition-colors hover:bg-blue-50">
                <input type="checkbox" name="objetivo_${i}" value="${obj.objetivo}" data-objetivo="${obj.objetivo}" ${isChecked ? 'checked' : ''}
                  class="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                <div class="text-sm">
                  <span class="text-gray-800 font-medium">${obj.objetivo}</span>
                  <div class="mt-1 flex gap-2">
                    <span class="text-[10px] uppercase font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">${obj.nivel_bloom ?? 'N/A'}</span>
                    <span class="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">${obj.tipo ?? 'N/A'}</span>
                  </div>
                </div>
              </label>`;
            })
            .join('');
        } else {
          objContent.innerHTML = '<p class="text-xs text-gray-400 italic">No se encontraron objetivos de aprendizaje específicos en el Informe F1.</p>';
        }
      }
    } catch (err) {
      console.error('[Step2Analysis] Error crítico en el renderizado de datos:', err);
    }
  }

  /** Llena los campos del perfil con datos existentes desde F1. */
  private _fillProfileFields(perfilRaw: PerfilParticipante | null): void {
    const perfil = perfilRaw || {};
    
    // Helper para asignar valor seguro a inputs/textareas
    const setVal = (id: string, val: any) => {
      const el = this._container.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`);
      if (el) el.value = val || "";
    };

    setVal("perfil_profesional", perfil.perfil_profesional);
    setVal("nivel_educativo_minimo", perfil.nivel_educativo_minimo);
    setVal("conocimientos_previos_requeridos", perfil.conocimientos_previos_requeridos);
    setVal("rango_de_edad_estimado", perfil.rango_de_edad_estimado);
    setVal("experiencia_previa", perfil.experiencia_previa);
    setVal("motivacion_principal", perfil.motivacion_principal);
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
      f0Label.textContent = f0Done ? 'Marco de Referencia (F0): disponible' : 'Marco de Referencia (F0): pendiente';
    }

    if (f1Icon && f1Label) {
      f1Icon.textContent = f1Done ? '✅' : '⚠️';
      f1Label.textContent = f1Done ? 'Informe de Necesidades (F1): disponible' : 'Informe de Necesidades (F1): pendiente';
    }

    if (this._dom.btnSubmit) {
      this._dom.btnSubmit.disabled = !f0Done || !f1Done;
    }
  }

  /** Collects edited profile fields as a clean object. */
  private _collectPerfil(): Record<string, string> {
    const perfil: Record<string, string> = {};
    for (const field of PERFIL_FIELDS) {
      const el = this._container.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${field}`);
      if (el && el.value.trim()) perfil[field] = el.value.trim();
    }
    return perfil;
  }

  /** Inyecta los datos sanitizados y priorizados para el pipeline F2. */
  protected override async _generateDocumentAsync(extraData?: Record<string, unknown>): Promise<void> {
    // 1. Capturar Perfil y Notas
    const perfil = this._collectPerfil();
    const notas  = this._container.querySelector<HTMLTextAreaElement>('#textarea-additional-notes')?.value || '';

    // 2. Capturar Objetivos Aprobados (solo el texto)
    const objetivosAprobados = Array.from(this._container.querySelectorAll<HTMLInputElement>('input[name^="objetivo_"]:checked'))
      .map(el => el.getAttribute('data-objetivo') || el.value);

    // 3. Preparar userInputs estructurados para el prompt
    const userInputs = {
      perfil,
      objetivosAprobados,
      notas
    };

    // 4. Delegar al flujo asíncrono base inyectando los datos del usuario en extraData,
    // lo cual se combinará con formData y terminará en payload.userInputs.
    return super._generateDocumentAsync({
      ...userInputs,
      ...extraData
    });
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
