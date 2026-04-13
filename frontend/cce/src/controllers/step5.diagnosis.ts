// src/controllers/step5.diagnosis.ts — CCE Step 3 (renumbered): Diagnóstico (F1_2)
//
// Flujo:
//   1. mount() → BaseStep._ensureExtractedContext() llama /extract con EXTRACTOR_F1_2
//      → obtiene F0 (gaps_iniciales, analisis_sector, estandares_ec) + F1_1 (6 instrumentos)
//   2. _prefillFromContext() → parsea el contenido extraído y pre-llena los campos
//   3. El consultor revisa / edita los campos
//   4. "Generar Diagnóstico" → envía contexto + hallazgos editados a F1_2

import { BaseStep } from '../shared/step.base';
import { wizardStore } from '../stores/wizard.store';

class Step3DiagnosisController extends BaseStep {
  private _subDom: {
    fieldSummary?: HTMLTextAreaElement;
    criticalAreas?: HTMLInputElement;
    noFieldworkNotice?: HTMLElement;
    fieldworkLoadedBadge?: HTMLElement;
  } = {};

  constructor() {
    super({
      stepNumber: 3,
      templateId: 'tpl-step5-diagnosis',
      phaseId: 'F1_2',
      promptId: 'F1_2',
      uiConfig: { loadingText: 'Generando Diagnóstico Organizacional (F1_2)...' },
    });
  }

  private _cacheSubDom(): void {
    const q = <T extends HTMLElement>(sel: string) =>
      this._container.querySelector<T>(sel) ?? undefined;
    this._subDom.fieldSummary         = q<HTMLTextAreaElement>('#field-summary');
    this._subDom.criticalAreas        = q<HTMLInputElement>('#critical-areas');
    this._subDom.noFieldworkNotice    = q('#no-fieldwork-notice');
    this._subDom.fieldworkLoadedBadge = q('#fieldwork-loaded-badge');
  }

  // ── Extrae un bloque de sección del markdown por regex ─────────────────────
  private _extractSection(markdown: string, pattern: RegExp): string {
    const m = pattern.exec(markdown);
    if (!m) return '';
    const start = m.index;
    const headerEnd = markdown.indexOf('\n', start);
    const rest = markdown.slice(headerEnd + 1);
    // Cortar hasta el siguiente encabezado del mismo nivel o superior
    const stopMatch = /\n#{1,3}\s/.exec(rest);
    return stopMatch ? rest.slice(0, stopMatch.index).trim() : rest.trim();
  }

  // ── Pre-llena desde la síntesis diagnóstica generada en el paso de campo ───
  // Prioridad:
  //   1. Síntesis AI (steps[2].documentContent) — generada por F1_2_FIELDWORK_SYNTHESIS
  //   2. Contexto extraído por EXTRACTOR_F1_2 (gaps F0 + fragmentos F1_1)
  //   3. Datos del cliente (mainProblem, symptoms, currentSituation)

  private _prefillFromContext(): void {
    const state = wizardStore.getState();
    const synthDoc = state.steps[2]?.documentContent ?? '';
    const extracted = state.extractedContexts[3]?.content ?? '';
    const cd = state.clientData;

    let fieldSummary = '';
    let criticalAreas = '';

    // ── Prioridad 1: Síntesis AI del paso de campo ─────────────────────────
    // Si el documento tiene secciones markdown propias (## Síntesis, ## Síntomas, etc.)
    // y NO es el dump crudo de hallazgos de campo (que empieza con # HALLAZGOS)
    const isSynthesis = synthDoc.length > 100
      && !synthDoc.trim().startsWith('# HALLAZGOS DE TRABAJO DE CAMPO')
      && synthDoc.includes('##');

    if (isSynthesis) {
      fieldSummary = synthDoc.trim();
      // Extraer áreas críticas de la sección específica
      const areasSection = this._extractSection(synthDoc, /##\s+[ÁA]reas cr[ÍI]ticas/i);
      if (areasSection) {
        criticalAreas = areasSection
          .split('\n')
          .filter((l) => l.trim().startsWith('-'))
          .map((l) => l.replace(/^-\s*\*?\*?([^:*]+)\*?\*?:.*$/, '$1').trim())
          .filter(Boolean)
          .join(', ');
      }
    }

    // ── Prioridad 2: Contexto extraído (EXTRACTOR_F1_2) ────────────────────
    if (!fieldSummary && extracted && extracted.length > 100) {
      const parts: string[] = [];
      const gaps = this._extractSection(extracted, /##\s+5\.\s+AN[ÁA]LISIS DE GAPS/i)
        || this._extractSection(extracted, /gaps_iniciales/i);
      if (gaps && !gaps.includes('NO DISPONIBLE')) {
        parts.push('**Brechas del Marco de Referencia:**\n' + gaps.slice(0, 600).trim());
      }
      const needsSection = this._extractSection(extracted, /##\s+5\.\s+NECESIDAD/i)
        || this._extractSection(extracted, /necesidad_capacitacion/i);
      if (needsSection && !needsSection.includes('NO DISPONIBLE')) {
        parts.push('**Necesidades de capacitación identificadas:**\n' + needsSection.slice(0, 400).trim());
      }
      if (parts.length > 0) {
        fieldSummary = parts.join('\n\n');
      }
      // Áreas desde texto combinado
      const combined = (gaps + extracted).toLowerCase();
      const areaSet = new Set<string>();
      if (/comunicaci/.test(combined))           areaSet.add('Comunicación interna');
      if (/capacitaci/.test(combined))           areaSet.add('Capacitación');
      if (/proceso|procedimiento/.test(combined)) areaSet.add('Procesos operativos');
      if (/producci/.test(combined))             areaSet.add('Producción');
      if (/venta|comerci/.test(combined))        areaSet.add('Ventas');
      if (/calidad/.test(combined))              areaSet.add('Control de calidad');
      if (/liderazgo|direcci/.test(combined))    areaSet.add('Liderazgo');
      if (/stps|dc-2|comisi/.test(combined))     areaSet.add('Cumplimiento STPS');
      if (/seguridad/.test(combined))            areaSet.add('Seguridad laboral');
      criticalAreas = Array.from(areaSet).join(', ');
    }

    // ── Prioridad 3: Datos básicos del cliente ─────────────────────────────
    if (!fieldSummary) {
      const parts: string[] = [];
      if (cd.mainProblem)       parts.push(`**Problema principal:** ${cd.mainProblem}`);
      if (cd.currentSituation)  parts.push(`**Situación actual:** ${cd.currentSituation}`);
      if (cd.symptoms)          parts.push(`**Síntomas observados:** ${cd.symptoms}`);
      if (cd.quantitativeData)  parts.push(`**Datos cuantitativos:** ${cd.quantitativeData}`);
      if (cd.previousAttempts)  parts.push(`**Intentos previos:** ${cd.previousAttempts}`);
      if (parts.length > 0) {
        fieldSummary = parts.join('\n\n')
          + '\n\n*(Completa con los hallazgos del trabajo de campo antes de generar el diagnóstico)*';
      }
    }

    if (fieldSummary) {
      if (this._subDom.fieldSummary && !this._subDom.fieldSummary.value) {
        this._subDom.fieldSummary.value = fieldSummary;
      }
      this._subDom.fieldworkLoadedBadge?.classList.remove('hidden');
    } else {
      this._subDom.noFieldworkNotice?.classList.remove('hidden');
    }

    if (criticalAreas && this._subDom.criticalAreas && !this._subDom.criticalAreas.value) {
      this._subDom.criticalAreas.value = criticalAreas;
    }
  }

  override async mount(container: HTMLElement): Promise<void> {
    // super.mount() llama _ensureExtractedContext() → /extract → EXTRACTOR_F1_2
    await super.mount(container);
    this._cacheSubDom();
    // Solo pre-llenar si el form no tiene documento previo (no regenerar)
    const step = wizardStore.getState().steps[3];
    if (!step?.documentContent) {
      this._prefillFromContext();
    }
  }
}

const _instance = new Step3DiagnosisController();
export const Step5Diagnosis = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
