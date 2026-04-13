// src/controllers/step6.prioritization.ts — CCE Step 4 (renumbered): Priorización (F2)
//
// Flujo:
//   1. mount() → BaseStep._ensureExtractedContext() llama /extract con EXTRACTOR_F2
//      → obtiene F0 (analisis_sector, estandares_ec, noms_aplicables)
//               + F1_2 (causa_raiz, brechas_dominio, necesidad_capacitacion)
//   2. _prefillFromContext() → pre-llena:
//      • priorityCriteria  ← brechas de F1_2 + restricciones del cliente
//      • maxInterventions  ← conteo de brechas identificadas
//      • timeHorizon       ← timeframe del cliente (parsea meses)
//   3. El consultor revisa / edita
//   4. "Generar Priorización" → envía a F2

import { BaseStep } from '../shared/step.base';
import { wizardStore } from '../stores/wizard.store';

class Step4PrioritizationController extends BaseStep {
  private _subDom: {
    priorityCriteria?: HTMLTextAreaElement;
    maxInterventions?: HTMLInputElement;
    timeHorizon?: HTMLInputElement;
    contextLoadedBadge?: HTMLElement;
  } = {};

  constructor() {
    super({
      stepNumber: 4,
      templateId: 'tpl-step6-prioritization',
      phaseId: 'F2',
      promptId: 'F2',
      uiConfig: { loadingText: 'Generando Priorización de Intervenciones (F2)...' },
    });
  }

  private _cacheSubDom(): void {
    const q = <T extends HTMLElement>(sel: string) =>
      this._container.querySelector<T>(sel) ?? undefined;
    this._subDom.priorityCriteria  = q<HTMLTextAreaElement>('[name="priorityCriteria"]');
    this._subDom.maxInterventions  = q<HTMLInputElement>('[name="maxInterventions"]');
    this._subDom.timeHorizon       = q<HTMLInputElement>('[name="timeHorizon"]');
    this._subDom.contextLoadedBadge= q('#context-loaded-badge');
  }

  private _extractSection(markdown: string, pattern: RegExp): string {
    const m = pattern.exec(markdown);
    if (!m) return '';
    const headerEnd = markdown.indexOf('\n', m.index);
    const rest = markdown.slice(headerEnd + 1);
    const stop = /\n#{1,3}\s/.exec(rest);
    return stop ? rest.slice(0, stop.index).trim() : rest.trim();
  }

  private _parseMonths(timeframe: string): number | null {
    if (!timeframe) return null;
    const lower = timeframe.toLowerCase();
    // "6 meses", "seis meses", "medio año", "1 año", etc.
    const numMatch = /(\d+)\s*mes/i.exec(lower);
    if (numMatch) return parseInt(numMatch[1]!);
    if (/un año|1\s*año|12\s*mes/.test(lower)) return 12;
    if (/dos años|2\s*años/.test(lower)) return 24;
    if (/seis meses|medio año/.test(lower)) return 6;
    if (/tres meses/.test(lower)) return 3;
    // número genérico
    const genMatch = /(\d+)/.exec(timeframe);
    if (genMatch) {
      const n = parseInt(genMatch[1]!);
      return n <= 60 ? n : null;
    }
    return null;
  }

  private _countBrechas(brechasText: string): number {
    // Cuenta filas de tabla markdown (cada | fila | es una brecha)
    const rows = brechasText.split('\n').filter(
      (l) => l.trim().startsWith('|') && !/^\|[-\s|]+$/.test(l.trim()) && !/^#/.test(l.trim())
    );
    // Descontar filas de encabezado de tabla (~1 por sección)
    const headerRows = brechasText.split('\n').filter((l) => /\|\s*Brecha\s*\|/i.test(l)).length;
    return Math.max(0, rows.length - headerRows);
  }

  private _prefillFromContext(): void {
    const state = wizardStore.getState();
    const extracted = state.extractedContexts[4]?.content ?? '';
    const cd = state.clientData;

    if (!extracted || extracted.length < 50) return;

    // ── priorityCriteria ────────────────────────────────────────────────────
    const brechas = this._extractSection(extracted, /##\s+4\.\s+BRECHAS POR [ÁA]REA/i)
      || this._extractSection(extracted, /brechas_dominio/i)
      || '';
    const necesidad = this._extractSection(extracted, /##\s+5\.\s+NECESIDAD DE CAPACITACI[ÓO]N/i)
      || this._extractSection(extracted, /necesidad_capacitacion/i)
      || '';
    const causaRaiz = this._extractSection(extracted, /##\s+3\.\s+CAUSA RA[ÍI]Z/i)
      || this._extractSection(extracted, /causa_raiz/i)
      || '';

    const criteriaParts: string[] = [];
    if (causaRaiz) criteriaParts.push(`Causa raíz: ${causaRaiz.slice(0, 200).replace(/\n/g, ' ').trim()}`);
    if (brechas)   criteriaParts.push(`Brechas identificadas:\n${brechas.slice(0, 400).trim()}`);
    if (necesidad) criteriaParts.push(`Necesidades de capacitación:\n${necesidad.slice(0, 300).trim()}`);
    if (cd.restrictions) criteriaParts.push(`Restricciones del cliente: ${cd.restrictions}`);
    if (cd.measurableResult) criteriaParts.push(`Resultado esperado: ${cd.measurableResult}`);

    if (criteriaParts.length > 0 && this._subDom.priorityCriteria && !this._subDom.priorityCriteria.value) {
      this._subDom.priorityCriteria.value = criteriaParts.join('\n\n');
    }

    // ── maxInterventions ────────────────────────────────────────────────────
    if (this._subDom.maxInterventions && !this._subDom.maxInterventions.value) {
      const count = brechas ? this._countBrechas(brechas) : 0;
      // Sugerir al menos 3 y máximo 8
      const suggested = count > 0 ? Math.min(Math.max(count, 3), 8) : 5;
      this._subDom.maxInterventions.value = String(suggested);
    }

    // ── timeHorizon ─────────────────────────────────────────────────────────
    if (this._subDom.timeHorizon && !this._subDom.timeHorizon.value) {
      const months = cd.timeframe ? this._parseMonths(cd.timeframe) : null;
      this._subDom.timeHorizon.value = String(months ?? 6);
    }

    this._subDom.contextLoadedBadge?.classList.remove('hidden');
  }

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container);  // _ensureExtractedContext → EXTRACTOR_F2
    this._cacheSubDom();
    const step = wizardStore.getState().steps[4];
    if (!step?.documentContent) {
      this._prefillFromContext();
    }
  }
}

const _instance = new Step4PrioritizationController();
export const Step6Prioritization = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
