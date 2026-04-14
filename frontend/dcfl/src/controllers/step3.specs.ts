// src/controllers/step3.specs.ts
// HTML en: /templates/tpl-step3-specs.html
//
// Controlador personalizado: extrae valores sugeridos del documento F2.5
// (Recomendaciones) y los pre-rellena en los campos del formulario.

import { BaseStep } from '../shared/step.base';
import { wizardStore } from '../stores/wizard.store';

// Helpers de extracción ──────────────────────────────────────────────────────

/** Valores por defecto basados en bibliografía (Mayer 2009, Guo et al. 2014, Sweller 1988).
 *  Se usan cuando F2.5 no genera valores concretos extraíbles. */
const DEFAULTS: Record<string, string> = {
  videosCount:          '5',
  videoDuration:        '7',
  reportingActivities:  'Progreso por módulo, calificaciones, tiempo invertido',
  reportFrequency:      'Semanal',
};

function extractNumber(text: string, pattern: RegExp): string {
  const m = text.match(pattern);
  return m?.[1]?.trim() ?? '';
}

function extractF25Suggestions(f25Content: string): Record<string, string> {
  const suggestions: Record<string, string> = {};

  // Número de videos: busca patrones como "X videos", "X material(es) de video"
  const videosMatch = f25Content.match(/(\d+)\s*video[s]?\b/i);
  if (videosMatch?.[1]) suggestions['videosCount'] = videosMatch[1];

  // Duración de cada video (en minutos)
  const durMatch = f25Content.match(/(\d+)\s*min(?:utos?)?\s*(?:por|c\/u|cada)\s*video/i)
    ?? f25Content.match(/videos?\s+de\s+(\d+)\s*min/i)
    ?? f25Content.match(/duración\s+promedio[^:]*:\s*(\d+)/i);
  if (durMatch?.[1]) suggestions['videoDuration'] = durMatch[1];

  // Actividades a reportear — nombre de campo corregido (era 'activitiesCount')
  const actMatch = f25Content.match(/(\d+)\s*actividades?\s*(?:prácticas?|a\s+reportear)?/i);
  if (actMatch?.[1]) suggestions['reportingActivities'] = actMatch[1];

  // Frecuencia de reportes (semanal, quincenal, etc.)
  const freqMatch = f25Content.match(/frecuencia\s+de\s+(?:revisión|reporte[s]?)[:\s]+([^\n.,]+)/i)
    ?? f25Content.match(/reporte[s]?\s+(semanale?s?|quincenal(?:es)?|mensual(?:es)?)/i);
  if (freqMatch?.[1]) suggestions['reportFrequency'] = freqMatch[1].trim();

  return suggestions;
}

// Controlador ────────────────────────────────────────────────────────────────

class Step4SpecsController extends BaseStep {
  constructor() {
    super({
      stepNumber: 4,
      templateId: 'tpl-step3-specs',
      phaseId: 'F3',
      promptId: 'F3',
      uiConfig: {
        loadingText: 'Generando Especificaciones Técnicas (F3)...',
        helpText: 'Define el LMS, versión SCORM, métricas de reporteo y formatos multimedia. La IA propondrá valores concretos para cada especificación técnica basándose en las fases anteriores — NO dejará placeholders sin completar.',
        summaryTemplate: (d) =>
          `LMS: ${d['lmsName'] || d['platform'] || '—'} · Videos: ${d['videosCount'] || '?'} de ${d['videoDuration'] || '?'} min c/u`,
      },
    });
  }

  /** Pre-rellena los campos del formulario con sugerencias extraídas de F2.5.
   *  Si la extracción no encuentra un valor, aplica DEFAULTS como fallback. */
  private _prefillFromF25(): void {
    if (!this._dom.form) return;

    // Solo pre-rellena si no hay datos guardados del paso
    const savedInputs = wizardStore.getState().steps[4]?.inputData ?? {};
    if (Object.keys(savedInputs).length > 0) {
      // Ya hay datos guardados — _restoreFormData los habrá cargado, no sobreescribir
      return;
    }

    const f25Content = wizardStore.getState().steps[3]?.documentContent ?? '';
    const extracted = f25Content ? extractF25Suggestions(f25Content) : {};

    // Fusiona: F2.5 extraído tiene prioridad; DEFAULTS cubre lo que falte
    const values: Record<string, string> = { ...DEFAULTS, ...extracted };

    const form = this._dom.form;
    for (const [key, value] of Object.entries(values)) {
      const el = form.elements.namedItem(key) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el && !el.value) el.value = value;
    }
  }

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container);
    this._prefillFromF25();
  }
}

// Exportación ────────────────────────────────────────────────────────────────

const _instance = new Step4SpecsController();

export const Step4Specs = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
