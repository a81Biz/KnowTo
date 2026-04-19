// src/controllers/step1.needs.ts
// HTML en: /templates/tpl-step1-needs.html
//
// Controlador personalizado para F1: carga las preguntas y brechas del F0
// directamente desde la BD vía API (GET /wizard/project/{id}/f0-context),
// y las presenta como campos de entrada para el usuario.

import { BaseStep } from '../shared/step.base';
import { getData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from '../shared/endpoints';
import { wizardStore } from '../stores/wizard.store';

interface F0ContextResponse {
  questions: string[];
  gaps: string;
}

// ── Controlador ──────────────────────────────────────────────────────────────

class Step1NeedsController extends BaseStep {
  constructor() {
    super({
      stepNumber: 1,
      templateId: 'tpl-step1-needs',
      phaseId: 'F1',
      promptId: 'F1',
      uiConfig: {
        loadingText: 'Generando Informe de Necesidades (F1)...',
        helpText:
          'Responde las preguntas diagnósticas que la IA identificó en el Marco de Referencia ' +
          'y confirma las brechas de capacitación propuestas. Tus respuestas determinan los ' +
          'objetivos de aprendizaje y el perfil del participante.',
      },
    });
  }

  /** Llama al API para obtener preguntas y brechas del F0, luego renderiza el formulario. */
  private async _loadAndRenderF0Context(): Promise<void> {
    const container = this._container.querySelector<HTMLElement>('#dynamic-questions-container');
    const gapsEl    = this._container.querySelector<HTMLTextAreaElement>('#textarea-confirmed-gaps');
    if (!container) return;

    const projectId = wizardStore.getState().projectId;
    if (!projectId) {
      container.innerHTML =
        '<p class="text-amber-600 text-sm">No se encontró el proyecto. Recarga la página.</p>';
      return;
    }

    container.innerHTML = '<p class="text-gray-400 text-sm animate-pulse">Cargando preguntas…</p>';

    let questions: string[] = [];
    let gaps = '';

    try {
      const url = buildEndpoint(ENDPOINTS.wizard.f0Context(projectId));
      const res = await getData<F0ContextResponse>(url);
      questions = res.data?.questions ?? [];
      gaps      = res.data?.gaps      ?? '';
    } catch (err) {
      console.warn('[Step1Needs] No se pudo cargar f0-context desde API:', err);
    }

    // Fallback: si el API no devolvió preguntas (job F0 aún no completado o dev sin Supabase),
    // intentar extraer del documento en memoria como respaldo.
    if (questions.length === 0) {
      const f0Content = wizardStore.getState().steps[0]?.documentContent ?? '';
      questions = _extractQuestionsFromDocument(f0Content);
      if (!gaps) gaps = _extractGapsFromDocument(f0Content);
    }

    // ── Renderizar preguntas ──────────────────────────────────────────────────
    if (questions.length === 0) {
      container.innerHTML =
        '<p class="text-amber-600 text-sm">No se encontraron preguntas en el Marco de Referencia. ' +
        'Asegúrate de completar el Paso 0 primero.</p>';
    } else {
      const savedInputs =
        (wizardStore.getState().steps[1]?.inputData as Record<string, unknown>) ?? {};

      container.innerHTML = questions
        .map((q, i) => {
          const savedVal = (savedInputs[`clientAnswer_${i}`] as string) ?? '';
          return `
          <div class="group">
            <label class="block text-xs font-semibold text-gray-600 mb-1">
              ${i + 1}. ${q}
            </label>
            <textarea name="clientAnswer_${i}" rows="2"
              class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Tu respuesta...">${savedVal}</textarea>
          </div>`;
        })
        .join('');
    }

    // ── Pre-rellenar brechas (solo si el usuario no las ha editado) ───────────
    if (gapsEl && !gapsEl.value.trim() && gaps) {
      gapsEl.value = gaps;
    }
  }

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container);
    await this._loadAndRenderF0Context();
  }
}

// ── Fallbacks de extracción desde documento en memoria ───────────────────────

function _extractQuestionsFromDocument(content: string): string[] {
  const questions: string[] = [];
  const sectionMatch = content.match(/#+\s*Preguntas para el cliente[\s\S]*?(?=\n##|$)/i);
  if (!sectionMatch) return questions;

  for (const line of sectionMatch[0].split('\n')) {
    const trimmed = line.trim();
    // Formato viñeta bold: - **¿Pregunta?**
    const boldBullet = trimmed.match(/^-\s+\*\*(.+?)\*\*\s*$/);
    if (boldBullet) {
      const q = boldBullet[1].trim();
      if (q.includes('?') && !q.startsWith('[')) { questions.push(q); continue; }
    }
    // Formato numerado: 1. ¿Pregunta?
    const numbered = trimmed.match(/^(?:\*\*)?(?:\[)?\d+(?:\])?(?:\*\*)?\.\s+(.+)/);
    if (numbered) {
      const q = numbered[1].replace(/^\*\*|\*\*$/g, '').replace(/\*.*$/, '').trim();
      if (q.includes('?') && !q.startsWith('[')) questions.push(q);
    }
  }
  return questions;
}

function _extractGapsFromDocument(content: string): string {
  const mpMatch   = content.match(/#+\s*Gap vs mejores pr[aá]cticas[^\n]*\n([\s\S]*?)(?=\n#|\n---|\n\*\*|$)/i);
  const compMatch = content.match(/#+\s*Gap vs competencia[^\n]*\n([\s\S]*?)(?=\n#|\n---|\n\*\*|$)/i);
  const parts: string[] = [];
  const mp   = mpMatch?.[1]?.trim();
  const comp = compMatch?.[1]?.trim();
  if (mp   && mp   !== '[texto]') parts.push(`Brecha vs. mejores prácticas:\n${mp}`);
  if (comp && comp !== '[texto]') parts.push(`Brecha vs. competencia:\n${comp}`);
  return parts.join('\n\n');
}

// ── Exportación ──────────────────────────────────────────────────────────────

const _instance = new Step1NeedsController();

export const Step1Needs = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
