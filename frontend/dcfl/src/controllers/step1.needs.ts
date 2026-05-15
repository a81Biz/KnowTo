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
    const gapsEl = this._container.querySelector<HTMLTextAreaElement>('#textarea-confirmed-gaps');
    if (!container) return;

    const projectId = wizardStore.getState().projectId;
    if (!projectId) {
      container.innerHTML =
        '<p class="text-amber-600 text-sm">No se encontró el proyecto. Recarga la página.</p>';
      return;
    }

    container.innerHTML = '<p class="text-gray-400 text-sm animate-pulse">Cargando preguntas…</p>';

    // 1. Cargar preguntas estructuradas desde preguntas_fase (endpoint canónico)
    let questionObjects: Array<{ id: string; texto: string }> = [];
    let gaps = '';

    try {
      const phaseUrl = buildEndpoint(ENDPOINTS.wizard.phaseQuestions(projectId, 1));
      const phaseRes = await getData<{ questions: Array<{ id: string; texto: string }> }>(phaseUrl);
      if (phaseRes.data?.questions?.length) {
        questionObjects = phaseRes.data.questions.map((q) => ({ id: q.id, texto: q.texto }));
        console.log(`[Step1Needs] Cargadas ${questionObjects.length} preguntas desde phase-questions endpoint`);
      } else {
        console.warn('[Step1Needs] phase-questions endpoint devolvió 0 preguntas');
      }
    } catch (err) {
      console.warn('[Step1Needs] phase-questions endpoint falló, usando fallback:', err);
    }

    // 2. Cargar brechas desde fase0_estructurado (NUEVO endpoint canónico)
    try {
      const estructUrl = buildEndpoint(ENDPOINTS.wizard.f0Estructurado(projectId));
      const estructRes = await getData<{ brechas: { mejores_practicas: string; competencia: string } }>(estructUrl);
      if (estructRes.data?.brechas) {
        const { mejores_practicas, competencia } = estructRes.data.brechas;
        gaps = '';
        if (mejores_practicas) gaps += `### Gap vs mejores prácticas\n${mejores_practicas}\n\n`;
        if (competencia) gaps += `### Gap vs competencia\n${competencia}`;
        console.log('[Step1Needs] Brechas cargadas desde fase0_estructurado');
      }
    } catch (err) {
      console.warn('[Step1Needs] fase0_estructurado falló, intentando legacy f0-context:', err);
      try {
        const gapsUrl = buildEndpoint(ENDPOINTS.wizard.f0Context(projectId));
        const gapsRes = await getData<F0ContextResponse>(gapsUrl);
        gaps = gapsRes.data?.gaps ?? '';
      } catch (err2) {
        console.warn('[Step1Needs] f0-context también falló:', err2);
      }
    }

    // Fallback manual desde documento si todo lo anterior falla
    if (!gaps) {
      const f0Content = wizardStore.getState().steps[0]?.documentContent ?? '';
      gaps = _extractGapsFromDocument(f0Content);
    }

    // ── Renderizar preguntas ──────────────────────────────────────────────────
    if (questionObjects.length === 0) {
      container.innerHTML =
        '<p class="text-amber-600 text-sm">No se encontraron preguntas en el Marco de Referencia. ' +
        'Asegúrate de completar el Paso 0 primero.</p>';
    } else {
      const savedInputs =
        (wizardStore.getState().steps[1]?.inputData as Record<string, unknown>) ?? {};

      container.innerHTML = questionObjects
        .map((q, i) => {
          const savedVal = (savedInputs[`clientAnswer_${i}`] as string) ?? '';
          return `
          <div class="group">
            <label class="block text-xs font-semibold text-gray-600 mb-1">
              ${i + 1}. ${q.texto}
            </label>
            <textarea name="clientAnswer_${i}" 
              data-pregunta-id="${q.id}"
              rows="2"
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

  /**
   * Sobreescritura para inyectar preguntas y respuestas estructuradas desde la BD
   * antes de llamar al pipeline de generación F1.
   */
  protected override async _generateDocumentAsync(extraData?: Record<string, unknown>): Promise<void> {
    const projectId = wizardStore.getState().projectId;
    if (!projectId) return super._generateDocumentAsync(extraData);

    // 1. Recolectar y Persistir respuestas en la tabla estructurada
    const answers: Array<{ preguntaId: string; respuesta: string }> = [];
    const textareas = this._container.querySelectorAll<HTMLTextAreaElement>('textarea[data-pregunta-id]');
    
    textareas.forEach((el) => {
      const id = el.getAttribute('data-pregunta-id');
      const val = el.value.trim();
      if (id && id.length > 30) { // Valid UUID length check simplifiée
        answers.push({ preguntaId: id, respuesta: val || 'No especificada' });
      }
    });

    if (answers.length > 0) {
      try {
        const { postData } = await import('@core/http.client');
        await postData(
          buildEndpoint(ENDPOINTS.wizard.phaseAnswers(projectId)),
          { projectId, phaseDestino: 1, answers }
        );
        console.log(`[Step1Needs] ${answers.length} respuestas persistidas correctamente`);
      } catch (err) {
        console.error('[Step1Needs] Error al persistir respuestas estructuradas (continuando con pipeline):', err);
      }
    }

    // 2. Obtener preguntas y respuestas estructuradas (para el payload del pipeline)
    let preguntasRespuestasEstructuradas = [];
    try {
      const prUrl = buildEndpoint(ENDPOINTS.wizard.fase1PreguntasRespuestas(projectId));
      const prRes = await getData<{ preguntasRespuestas: Array<{ id: string; pregunta: string; respuesta: string }> }>(prUrl);
      preguntasRespuestasEstructuradas = prRes.data?.preguntasRespuestas ?? [];
    } catch (err) {
      console.warn('[Step1Needs] No se pudo obtener preguntas-respuestas estructuradas:', err);
    }

    // 2. Ejecutar lógica base pero inyectando el campo en el contexto
    // Nota: Como BaseStep._generateDocumentAsync construye su propio payload,
    // interceptamos el buildContext() inyectando temporalmente en el store
    // o simplemente pasando los datos si BaseStep lo permitiera.
    // En este caso, lo más directo es replicar la llamada a BaseStep con el extraData enriquecido.

    // Obtenemos el contexto base y le añadimos el campo estructurado
    const baseContext = wizardStore.buildContext(1);
    const enrichedContext = {
      ...baseContext,
      previousData: {
        ...(baseContext.previousData as Record<string, unknown>),
        preguntas_respuestas_estructuradas: preguntasRespuestasEstructuradas
      }
    };

    // Para que BaseStep use este contexto, tendríamos que modificar BaseStep o
    // pasarle el contexto ya construido. Dado que BaseStep._generateDocumentAsync
    // llama a wizardStore.buildContext(this._config.stepNumber), 
    // lo más limpio para cumplir el "Cambio 2" es realizar la llamada aquí mismo.

    const formData = { ...this._collectFormData(), ...extraData };
    let stepId = wizardStore.getState().steps[1].stepId;

    if (!stepId) {
      return super._generateDocumentAsync(extraData); // Fallback si no hay stepId
    }

    try {
      const { postData } = await import('@core/http.client');
      await postData(
        buildEndpoint(ENDPOINTS.wizard.saveStep),
        { projectId, stepNumber: 1, inputData: formData }
      );
    } catch (err) {
      console.warn('[Step1Needs] No se pudo guardar el step data', err);
    }

    this._setLoading(true);
    // showLoading importado en step.base.ts, pero disponible vía window en el core del proyecto?
    // BaseStep usa imports de @core/ui.
    // Usamos el método de la clase base para mantener la UI consistente.

    // Re-implementación mínima del flujo de BaseStep para inyectar el payload exacto pedido:
    try {
      const { postData } = await import('@core/http.client');
      const { showLoading, hideLoading, showError } = await import('@core/ui');

      showLoading('Generando Informe de Necesidades (F1) con datos estructurados...');

      const res = await postData<{ jobId: string }>(
        buildEndpoint(ENDPOINTS.wizard.generateAsync),
        {
          projectId,
          stepId,
          phaseId: 'F1',
          promptId: 'F1',
          context: enrichedContext,
          userInputs: formData
        }
      );

      if (res.data?.jobId) {
        const { subscribeToJob } = await import('../shared/supabase.realtime');
        this._jobSubscription?.cancel();
        this._jobSubscription = subscribeToJob(
          res.data.jobId,
          (result) => {
            wizardStore.setStepDocument(1, result.content, result.documentId);
            this._renderPreview(result.content);
            this._setLoading(false);
            hideLoading();
          },
          (err) => {
            showError(err);
            this._setLoading(false);
            hideLoading();
          },
          (update) => {
            if (update.progress) {
              const { currentStep, stepIndex, totalSteps } = update.progress;
              showLoading(`Ejecutando ${currentStep} (${stepIndex + 1}/${totalSteps})...`);
            }
          }
        );
      }
    } catch (err) {
      console.error(err);
      this._setLoading(false);
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

function _extractGapsFromDocument(markdown: string): string {
  // Regex flexible: captura desde "Gap vs mejores prácticas" hasta el próximo encabezado o fin
  const mejorPracticasMatch = markdown.match(/#+\s*Gap vs mejores pr[aá]cticas[^\n]*[:：]?\s*([\s\S]*?)(?=\n#|\n---|\n\*\*|$)/i);
  const competenciaMatch = markdown.match(/#+\s*Gap vs competencia[^\n]*[:：]?\s*([\s\S]*?)(?=\n#|\n---|\n\*\*|$)/i);

  const mejorPracticas = mejorPracticasMatch?.[1]?.trim() ?? '';
  const competencia = competenciaMatch?.[1]?.trim() ?? '';

  if (!mejorPracticas && !competencia) return '';

  let result = '';
  if (mejorPracticas) result += `### Gap vs mejores prácticas\n${mejorPracticas}\n\n`;
  if (competencia) result += `### Gap vs competencia\n${competencia}`;

  return result;
}

// ── Exportación ──────────────────────────────────────────────────────────────

const _instance = new Step1NeedsController();

export const Step1Needs = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
