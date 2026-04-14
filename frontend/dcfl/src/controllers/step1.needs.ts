// src/controllers/step1.needs.ts
// HTML en: /templates/tpl-step1-needs.html
//
// Controlador personalizado para F1: extrae las preguntas del documento F0
// y las presenta como campos de entrada. Pre-rellena las brechas con el
// análisis de gaps del Marco de Referencia para que el usuario las confirme.

import { BaseStep } from '../shared/step.base';
import { wizardStore } from '../stores/wizard.store';

// ── Helpers de extracción ────────────────────────────────────────────────────

/**
 * Extrae las preguntas del cliente de la sección "Preguntas para el cliente"
 * del documento F0 generado por la IA.
 */
function extractQuestionsFromF0(content: string): string[] {
  const sectionMatch = content.match(
    /###\s+Preguntas para el cliente[^\n]*\n([\s\S]*?)(?=\n---|\n##|\n###|$)/i,
  );
  if (!sectionMatch?.[1]) return [];

  const questions: string[] = [];
  const lineRegex = /^\d+\.\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = lineRegex.exec(sectionMatch[1])) !== null) {
    const q = m[1]?.trim() ?? '';
    // Ignorar líneas que son marcadores de plantilla sin rellenar
    if (q && !q.startsWith('[')) questions.push(q);
  }
  return questions;
}

/**
 * Extrae el texto de los gaps iniciales (vs. mejores prácticas y competencia)
 * del documento F0 para pre-proponer las brechas al usuario.
 */
function extractGapsFromF0(content: string): string {
  const gapsMpMatch = content.match(
    /###\s+Gap vs mejores prácticas\s*\n([\s\S]*?)(?=###|---|\n##|$)/i,
  );
  const gapCompMatch = content.match(
    /###\s+Gap vs competencia\s*\n([\s\S]*?)(?=###|---|\n##|$)/i,
  );

  const parts: string[] = [];

  const gapMp = gapsMpMatch?.[1]?.trim();
  if (gapMp && gapMp !== '[texto]') {
    parts.push(`Brecha vs. mejores prácticas:\n${gapMp}`);
  }

  const gapComp = gapCompMatch?.[1]?.trim();
  if (gapComp && gapComp !== '[texto]') {
    parts.push(`Brecha vs. competencia:\n${gapComp}`);
  }

  return parts.join('\n\n');
}

// ── Controlador ──────────────────────────────────────────────────────────────

class Step1NeedsController extends BaseStep {
  private _questions: string[] = [];

  constructor() {
    super({
      stepNumber: 1,
      templateId: 'tpl-step1-needs',
      phaseId: 'F1',
      promptId: 'F1',
      uiConfig: {
        loadingText: 'Generando Informe de Necesidades (F1)...',
        helpText: 'Responde las preguntas diagnósticas que la IA identificó en el Marco de Referencia y confirma las brechas de capacitación propuestas. Tus respuestas determinan los objetivos de aprendizaje y el perfil del participante.',
      },
    });
  }

  /** Renderiza las preguntas de F0 como textareas dentro del formulario. */
  private _renderDynamicQuestions(): void {
    const container = this._container.querySelector<HTMLElement>(
      '#dynamic-questions-container',
    );
    if (!container) return;

    const f0Content = wizardStore.getState().steps[0]?.documentContent;

    if (!f0Content) {
      container.innerHTML =
        '<p class="text-amber-600 text-sm">No se encontró el Marco de Referencia. Completa el Paso 0 primero.</p>';
      return;
    }

    this._questions = extractQuestionsFromF0(f0Content);

    if (this._questions.length === 0) {
      container.innerHTML =
        '<p class="text-amber-600 text-sm">No se encontraron preguntas en el Marco de Referencia.</p>';
      return;
    }

    const savedInputs =
      (wizardStore.getState().steps[1]?.inputData as Record<string, unknown>) ??
      {};

    container.innerHTML = this._questions
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

  /** Pre-rellena el textarea de brechas con el análisis de gaps de F0. */
  private _prepopulateGaps(): void {
    const gapsEl = this._container.querySelector<HTMLTextAreaElement>(
      '#textarea-confirmed-gaps',
    );
    if (!gapsEl || gapsEl.value.trim()) return; // no sobreescribir ediciones del usuario

    const f0Content = wizardStore.getState().steps[0]?.documentContent;
    if (!f0Content) return;

    const proposed = extractGapsFromF0(f0Content);
    if (proposed) gapsEl.value = proposed;
  }

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container);
    this._renderDynamicQuestions();
    this._prepopulateGaps();
  }
}

// ── Exportación ──────────────────────────────────────────────────────────────

const _instance = new Step1NeedsController();

export const Step1Needs = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
