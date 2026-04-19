// src/controllers/step3.specs.ts
// HTML en: /templates/tpl-step3-specs.html
//
// Controlador para F3 (Especificaciones Técnicas):
// Carga datos estructurados de F2.5 desde BD y los prellena en el formulario.
// El usuario solo ajusta si no está de acuerdo con los valores sugeridos.

import { BaseStep } from '../shared/step.base';
import { getData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from '../shared/endpoints';
import { wizardStore } from '../stores/wizard.store';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface F25BDData {
  actividades:               Array<{ tipo: string; proposito: string; frecuencia: string }> | null;
  metricas:                  Array<{ metrica: string; descripcion: string; frecuencia: string }> | null;
  frecuencia_revision:       string | null;
  total_videos:              number | null;
  duracion_promedio_minutos: number | null;
  documento_final:           string | null;
  juez_decision:             string | null;
}

interface Resolucion {
  aspecto: string;
  decision: string;
  valor_elegido: string;
}

// ── Defaults bibliográficos ──────────────────────────────────────────────────
// Mayer (2009), Guo et al. (2014), Sweller (1988)

const DEFAULTS: Record<string, string> = {
  videosCount:          '5',
  videoDuration:        '6',
  reportingActivities:  'Progreso por módulo, calificaciones, tiempo invertido',
  reportFrequency:      'Semanal',
};

// ── Controlador ──────────────────────────────────────────────────────────────

class Step4SpecsController extends BaseStep {
  private _f25Data:         F25BDData | null = null;
  private _valoresResueltos: Resolucion[]    = [];
  private _perfilAjustado:  Record<string, string> | null = null;

  constructor() {
    super({
      stepNumber: 4,
      templateId: 'tpl-step3-specs',
      phaseId: 'F3',
      promptId: 'F3',
      uiConfig: {
        loadingText: 'Generando Especificaciones Técnicas (F3)...',
        helpText:
          'Define el LMS, versión SCORM, métricas de reporteo y formatos multimedia. ' +
          'Los campos se precargan automáticamente desde las Recomendaciones Pedagógicas (F2.5). ' +
          'Ajusta solo lo que sea diferente.',
        summaryTemplate: (d) =>
          `LMS: ${d['lmsName'] || '—'} · SCORM: ${d['scormVersion'] || '—'} · Videos: ${d['videosCount'] || '?'} × ${d['videoDuration'] || '?'} min`,
      },
    });
  }

  // ── Carga desde BD ───────────────────────────────────────────────────────

  private async _loadF25FromBD(): Promise<void> {
    const { projectId } = wizardStore.getState();
    if (!projectId) return;
    try {
      const res = await getData<F25BDData>(
        buildEndpoint(ENDPOINTS.wizard.fase2_5Recomendaciones(projectId)),
      );
      this._f25Data = res.data ?? null;
    } catch {
      this._f25Data = null;
    }
  }

  private async _loadResolucion(): Promise<void> {
    const { projectId } = wizardStore.getState();
    if (!projectId) return;
    try {
      const res = await getData<{ resoluciones: Resolucion[]; listo_para_f3: boolean }>(
        buildEndpoint(ENDPOINTS.wizard.fase2Resolucion(projectId)),
      );
      this._valoresResueltos = res.data?.resoluciones ?? [];
    } catch {
      this._valoresResueltos = [];
    }
  }

  private async _loadPerfilAjustado(): Promise<void> {
    const { projectId } = wizardStore.getState();
    if (!projectId) return;
    try {
      const res = await getData<{ perfil_ajustado: Record<string, string> | null }>(
        buildEndpoint(ENDPOINTS.wizard.fase2Analisis(projectId)),
      );
      this._perfilAjustado = res.data?.perfil_ajustado ?? null;
    } catch {
      this._perfilAjustado = null;
    }
  }

  // ── Pre-relleno del formulario ────────────────────────────────────────────

  private _prefillFromF25(): void {
    if (!this._dom.form) return;

    // No sobreescribir si el usuario ya guardó datos en este paso
    const savedInputs = wizardStore.getState().steps[4]?.inputData ?? {};
    if (Object.keys(savedInputs).length > 0) return;

    const form = this._dom.form;

    const setField = (name: string, value: string | number | null | undefined): boolean => {
      if (value == null || value === '') return false;
      const el = form.elements.namedItem(name) as
        | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (!el || el.value) return false;
      el.value = String(value);
      return true;
    };

    const data = this._f25Data;

    if (data) {
      // Datos estructurados de BD — fuente principal
      let anySet = false;

      anySet = setField('videosCount', data.total_videos) || anySet;
      anySet = setField('videoDuration', data.duracion_promedio_minutos) || anySet;

      if (data.frecuencia_revision) {
        anySet = setField('reportFrequency', this._mapFrequency(data.frecuencia_revision)) || anySet;
      }

      if (data.metricas?.length) {
        const names = data.metricas.map((m) => m.metrica).filter(Boolean).join(', ');
        anySet = setField('reportingActivities', names) || anySet;
      }

      if (data.documento_final) {
        const lms = this._extractLmsFromDoc(data.documento_final);
        if (lms) anySet = setField('lmsName', lms) || anySet;
      }

      // Mostrar badge si se precargó algo
      if (anySet) {
        const badge = this._container.querySelector<HTMLElement>('#f25-badge');
        badge?.classList.remove('hidden');
      }
    }

    // Aplicar DEFAULTS para los campos que sigan vacíos
    for (const [key, value] of Object.entries(DEFAULTS)) {
      setField(key, value);
    }
  }

  /** Normaliza la frecuencia de BD al valor del select del formulario. */
  private _mapFrequency(raw: string): string {
    const lower = raw.toLowerCase();
    if (/diaria|daily/.test(lower))       return 'Diaria';
    if (/quincenal|biweekly/.test(lower)) return 'Quincenal';
    if (/mensual|monthly/.test(lower))    return 'Mensual';
    if (/m[oó]dulo|module/.test(lower))   return 'Por módulo';
    return 'Semanal'; // default
  }

  /** Intenta extraer el nombre del LMS del documento final de F2.5. */
  private _extractLmsFromDoc(content: string): string | null {
    const patterns = [
      /plataforma\s+(?:LMS\s*)?recomendada[:\s]+\*?\*?([^\n*,]+)/i,
      /\*\*Plataforma[:\s]+\*?\*?([^\n*,]+)/i,
      /LMS[:\s]+\*?\*?([^\n*,]+)/i,
      /(Moodle|TalentLMS|Canvas|Blackboard|Teachable|Google Classroom|Hotmart|Chamilo|Dokeos)\b/i,
    ];
    for (const p of patterns) {
      const m = content.match(p);
      const val = m?.[1]?.trim().replace(/\*\*/g, '');
      if (val && val.length > 1 && val.length < 60) return val;
    }
    return null;
  }

  // ── Generación ────────────────────────────────────────────────────────────

  protected override async _generateDocumentAsync(extraData?: Record<string, unknown>): Promise<void> {
    const merged: Record<string, unknown> = { ...extraData };
    if (this._valoresResueltos.length > 0) {
      merged['valores_resueltos'] = JSON.stringify(this._valoresResueltos);
    }
    if (this._perfilAjustado && Object.keys(this._perfilAjustado).length > 0) {
      merged['perfilAjustado'] = JSON.stringify(this._perfilAjustado);
    }
    return super._generateDocumentAsync(merged);
  }

  // ── Montaje ───────────────────────────────────────────────────────────────

  override async mount(container: HTMLElement): Promise<void> {
    await Promise.all([
      this._loadF25FromBD(),
      this._loadResolucion(),
      this._loadPerfilAjustado(),
    ]);
    await super.mount(container);
    this._prefillFromF25();
  }
}

// ── Exportación ───────────────────────────────────────────────────────────────

const _instance = new Step4SpecsController();

export const Step4Specs = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
