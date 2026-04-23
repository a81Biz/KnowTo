// frontend/dcfl/src/shared/step.base.ts
// Clase base para todos los controladores de pasos del wizard
// Implementa las 7 secciones obligatorias del FRONTEND ARCHITECTURE DOCUMENT

import { TemplateLoader } from '@core/template.loader';
import { postData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from './endpoints';
import { showLoading, hideLoading, showError, showSuccess, renderMarkdown, printDocument } from '@core/ui';
import { subscribeToJob, type JobResult, type JobSubscription } from './supabase.realtime';
import { logger } from './logger';
import { wizardStore } from '../stores/wizard.store';
import type { PhaseId, PromptId } from '../types/wizard.types';

// Mapa de paso → ID del extractor que prepara su contexto.
// Solo los pasos que necesitan contexto compacto (2 en adelante).
const EXTRACTOR_FOR_STEP: Record<number, string> = {
  2:  'EXTRACTOR_F2',
  4:  'EXTRACTOR_F2_5',
  5:  'EXTRACTOR_F3',
  6:  'EXTRACTOR_F4',
  7:  'EXTRACTOR_F5',
  8:  'EXTRACTOR_F5_2',
  9:  'EXTRACTOR_F6',
  10: 'EXTRACTOR_F6_2a',
  11: 'EXTRACTOR_F6_2b',
};

// ============================================================================
// 1. TIPOS
// ============================================================================
export interface StepUiConfig {
  loadingText?: string;
  submitText?: string;
  submittingText?: string;
  /** Texto de ayuda contextual mostrado en la burbuja azul del paso. */
  helpText?: string;
  /** Función que recibe los datos del formulario y retorna el texto del resumen del paso. */
  summaryTemplate?: (data: Record<string, unknown>) => string;
}

export interface StepConfig {
  stepNumber: number;
  templateId: string;
  phaseId: PhaseId;
  /** null para pasos sin generación IA (solo guardan datos y avanzan). */
  promptId: PromptId | null;
  uiConfig?: StepUiConfig;
  /** Step 0 only: crear el proyecto antes de generar el documento */
  createProjectFirst?: boolean;
  /** Muestra un textarea de notas manuales al final del paso. */
  allowManualOverride?: boolean;
}

// ============================================================================
// CLASE BASE
// ============================================================================
export class BaseStep {
  // 2. ESTADO PRIVADO
  protected _container!: HTMLElement;
  protected _config: StepConfig;
  // Suscripción activa al job en curso. Se cancela antes de crear una nueva
  // para evitar múltiples polling timers simultáneos.
  protected _jobSubscription: JobSubscription | null = null;

  protected _dom: {
    form?: HTMLFormElement;
    btnSubmit?: HTMLButtonElement;
    previewPanel?: HTMLElement;
    documentPreview?: HTMLElement;
    btnCopy?: HTMLButtonElement;
    btnRegenerate?: HTMLButtonElement;
    btnPrint?: HTMLButtonElement;
  } = {};

  protected _uiConfig: Required<Pick<StepUiConfig, 'loadingText' | 'submitText' | 'submittingText'>> & StepUiConfig = {
    loadingText: 'Generando documento con IA...',
    submitText: '✨ Generar documento',
    submittingText: '⏳ Generando con IA...',
  };

  constructor(config: StepConfig) {
    this._config = config;
    if (config.uiConfig) Object.assign(this._uiConfig, config.uiConfig);
  }

  // 3. CACHÉ DEL DOM
  protected _cacheDOM(): void {
    this._dom.form = this._container.querySelector(`#form-step${this._config.stepNumber}`) ?? undefined;
    this._dom.btnSubmit = this._container.querySelector('#btn-submit') ?? undefined;
    this._dom.previewPanel = this._container.querySelector('#preview-panel') ?? undefined;
    this._dom.documentPreview = this._container.querySelector('#document-preview') ?? undefined;
    this._dom.btnCopy = this._container.querySelector('#btn-copy-doc') ?? undefined;
    this._dom.btnRegenerate = this._container.querySelector('#btn-regenerate') ?? undefined;
    this._dom.btnPrint = this._container.querySelector('#btn-print') ?? undefined;
  }

  // 4. LÓGICA DE VISTA

  /** Inyecta la burbuja de ayuda justo antes del formulario del paso. */
  private _injectHelpBubble(): void {
    if (!this._uiConfig.helpText) return;
    if (this._container.querySelector('#help-bubble')) return;
    const bubble = document.createElement('div');
    bubble.id = 'help-bubble';
    bubble.className = 'bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 items-start';
    bubble.innerHTML = `
      <span class="text-2xl flex-shrink-0">📘</span>
      <div>
        <h3 class="font-semibold text-blue-900 text-sm">Acerca de este paso</h3>
        <p class="text-blue-800 text-sm mt-1">${this._uiConfig.helpText}</p>
      </div>`;
    const form = this._dom.form;
    if (form?.parentElement) {
      form.parentElement.insertBefore(bubble, form);
    } else {
      this._container.prepend(bubble);
    }
  }

  /** Inyecta el div de resumen dinámico justo antes del formulario. */
  private _injectSummaryDiv(): void {
    if (!this._uiConfig.summaryTemplate) return;
    if (this._container.querySelector('#step-summary')) return;
    const summary = document.createElement('div');
    summary.id = 'step-summary';
    summary.className = 'bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm';
    summary.innerHTML = `<span class="font-semibold text-gray-600">📊 Resumen: </span><span id="summary-content" class="text-gray-500">Completa el formulario para ver el resumen.</span>`;
    const form = this._dom.form;
    // Insert after help-bubble (if present) or before the form
    const helpBubble = this._container.querySelector('#help-bubble');
    const insertAfter = helpBubble ?? null;
    if (insertAfter?.nextElementSibling) {
      insertAfter.parentElement!.insertBefore(summary, insertAfter.nextElementSibling);
    } else if (form?.parentElement) {
      form.parentElement.insertBefore(summary, form);
    } else {
      this._container.appendChild(summary);
    }
  }

  /** Actualiza el texto del resumen con los datos del formulario. */
  protected _updateSummary(data?: Record<string, unknown>): void {
    if (!this._uiConfig.summaryTemplate) return;
    const el = this._container.querySelector<HTMLElement>('#summary-content');
    if (!el) return;
    el.textContent = this._uiConfig.summaryTemplate(data ?? this._collectFormData());
  }

  /** Inyecta el campo de notas manuales al final del contenedor del paso. */
  private _injectManualOverride(): void {
    if (!this._config.allowManualOverride) return;
    if (this._container.querySelector('#manual-override')) return;
    const div = document.createElement('div');
    div.id = 'manual-override';
    div.className = 'mt-4 space-y-2';
    div.innerHTML = `
      <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest">
        Notas o ajustes manuales (opcional)
      </label>
      <textarea name="manualNotes" rows="3"
        class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 text-sm"
        placeholder="Si deseas agregar notas antes de continuar, escríbelas aquí..."></textarea>`;
    this._container.appendChild(div);
  }

  protected _renderPreview(markdown: string): void {
    if (!this._dom.previewPanel || !this._dom.documentPreview) return;
    this._dom.documentPreview.innerHTML = renderMarkdown(markdown);
    this._dom.previewPanel.classList.remove('hidden');
    this._ensurePrintButton(markdown);
  }

  /** Inyecta el botón de impresión la primera vez que se muestra el preview. */
  private _ensurePrintButton(markdown: string): void {
    if (!this._dom.previewPanel) return;
    const title = this._pdfTitle();
    if (this._dom.btnPrint) {
      this._dom.btnPrint.onclick = () => printDocument(markdown, title);
      return;
    }

    const btnContainer =
      this._dom.previewPanel.querySelector<HTMLElement>('.flex.gap-2') ??
      this._dom.previewPanel.querySelector<HTMLElement>('.preview-actions') ??
      this._dom.previewPanel;

    const btn = document.createElement('button');
    btn.id = 'btn-print';
    btn.textContent = '🖨️ Imprimir / PDF';
    btn.className =
      'px-4 py-2 border border-green-300 text-green-700 rounded-lg text-sm hover:bg-green-50';
    btn.onclick = () => printDocument(markdown, title);

    btnContainer.appendChild(btn);
    this._dom.btnPrint = btn;
  }

  /** Nombre sugerido para el PDF: "{N}_{Etiqueta del paso}". */
  private _pdfTitle(): string {
    const step = wizardStore.getState().steps[this._config.stepNumber];
    const label = step?.label ?? 'Documento';
    return `${this._config.stepNumber}_${label}`;
  }

  protected _setLoading(loading: boolean, text?: string): void {
    if (!this._dom.btnSubmit) return;
    this._dom.btnSubmit.disabled = loading;
    if (loading) {
      this._dom.btnSubmit.textContent = text ?? `⏳ Procesando... (iniciando)`;
    } else {
      this._dom.btnSubmit.textContent = this._uiConfig.submitText;
    }
  }

  // 5. LÓGICA DE NEGOCIO
  protected _collectFormData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    if (!this._dom.form) return data;
    new FormData(this._dom.form).forEach((value, key) => { data[key] = value; });
    return data;
  }

  protected async _generateDocument(extraData?: Record<string, unknown>): Promise<void> {
    const formData = { ...this._collectFormData(), ...extraData };

    // Pasos sin IA: guardar datos y marcar como completado
    if (!this._config.promptId) {
      wizardStore.setStepInputData(this._config.stepNumber, formData);
      wizardStore.setStepStatus(this._config.stepNumber, 'completed');
      return;
    }

    let state = wizardStore.getState();

    // Step 0: crear el proyecto con los datos del formulario antes de generar
    if (this._config.createProjectFirst && !state.projectId) {
      try {
        showLoading('Creando proyecto...');
        const emailVal = (formData['email'] as string) || undefined;
        const res = await postData<{ projectId: string }>(
          buildEndpoint(ENDPOINTS.wizard.createProject),
          {
            name: formData['projectName'] as string,
            clientName: formData['clientName'] as string,
            industry: (formData['industry'] as string) || undefined,
            email: emailVal,
          }
        );
        if (res.data?.projectId) {
          wizardStore.setProjectId(res.data.projectId);
          wizardStore.setClientData({
            projectName: formData['projectName'] as string,
            clientName: formData['clientName'] as string,
            industry: formData['industry'] as string ?? '',
            email: formData['email'] as string ?? '',
            courseTopic: formData['courseTopic'] as string ?? '',
            experienceLevel: formData['experienceLevel'] as string ?? '',
            targetAudience: formData['targetAudience'] as string ?? '',
            expectedOutcome: formData['expectedOutcome'] as string ?? '',
            budget: formData['budget'] as string ?? '',
            courseDuration: formData['courseDuration'] as string ?? '',
            deadline: formData['deadline'] as string ?? '',
            constraints: formData['constraints'] as string ?? '',
          });
          state = wizardStore.getState();
        }
      } catch (err) {
        hideLoading();
        showError(err instanceof Error ? err.message : 'Error al crear el proyecto');
        return;
      }
    }

    if (!state.projectId) {
      showError('No hay proyecto activo. Regresa al inicio.');
      return;
    }

    const step = state.steps[this._config.stepNumber];

    // Registrar step si no tiene ID
    let stepId = step?.stepId;
    if (!stepId) {
      try {
        const res = await postData<{ stepId: string }>(
          buildEndpoint(ENDPOINTS.wizard.saveStep),
          { projectId: state.projectId, stepNumber: this._config.stepNumber, inputData: formData }
        );
        if (res.data?.stepId) {
          stepId = res.data.stepId;
          wizardStore.setStepId(this._config.stepNumber, stepId);
        }
      } catch { /* continuar, se reintentará */ }
    }

    if (!stepId) {
      showError('No se pudo registrar el paso. Intenta de nuevo.');
      return;
    }

    this._setLoading(true);
    showLoading(this._uiConfig.loadingText);
    wizardStore.setStepInputData(this._config.stepNumber, formData);

    if (this._config.stepNumber === 0) {
      wizardStore.setClientData({
        projectName: formData['projectName'] as string,
        clientName: formData['clientName'] as string,
        industry: formData['industry'] as string ?? '',
        email: formData['email'] as string ?? '',
        courseTopic: formData['courseTopic'] as string ?? '',
        experienceLevel: formData['experienceLevel'] as string ?? '',
        targetAudience: formData['targetAudience'] as string ?? '',
        expectedOutcome: formData['expectedOutcome'] as string ?? '',
        budget: formData['budget'] as string ?? '',
        courseDuration: formData['courseDuration'] as string ?? '',
        deadline: formData['deadline'] as string ?? '',
        constraints: formData['constraints'] as string ?? '',
      });
    }

    try {
      const context = wizardStore.buildContext(this._config.stepNumber);

      const res = await postData<{ documentId: string; content: string }>(
        buildEndpoint(ENDPOINTS.wizard.generate),
        {
          projectId: state.projectId,
          stepId,
          phaseId: this._config.phaseId,
          promptId: this._config.promptId,
          context,
          userInputs: formData,
        }
      );

      if (res.data) {
        wizardStore.setStepDocument(
          this._config.stepNumber,
          res.data.content,
          res.data.documentId
        );
        this._renderPreview(res.data.content);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al generar el documento');
      wizardStore.setStepStatus(this._config.stepNumber, 'error');
    } finally {
      this._setLoading(false);
      hideLoading();
    }
  }

  /**
   * Versión asíncrona de _generateDocument.
   * Encola el job en el backend y espera la notificación reactiva:
   *   - Desarrollo: WebSocket (ws://api.localhost/ws)
   *   - Producción: Supabase Realtime (suscripción directa al frontend)
   *
   * Los pasos que necesiten pipelines lentos (>30 s) deben usar este método.
   */
  protected async _generateDocumentAsync(extraData?: Record<string, unknown>): Promise<void> {
    if (!this._config.promptId) {
      // Paso sin IA — delegar al flujo síncrono
      return this._generateDocument(extraData);
    }

    const timerLabel = `step${this._config.stepNumber}:${this._config.promptId}`;
    logger.time(timerLabel);
    logger.info(`[step${this._config.stepNumber}] Iniciando generación async`, { promptId: this._config.promptId });

    const formData = { ...this._collectFormData(), ...extraData };
    let state      = wizardStore.getState();

    // Step 0: crear el proyecto con los datos del formulario antes de generar
    if (this._config.createProjectFirst && !state.projectId) {
      logger.info(`[step${this._config.stepNumber}] Creando proyecto...`);
      try {
        showLoading('Creando proyecto...');
        const emailVal = (formData['email'] as string) || undefined;
        const res = await postData<{ projectId: string }>(
          buildEndpoint(ENDPOINTS.wizard.createProject),
          {
            name: formData['projectName'] as string,
            clientName: formData['clientName'] as string,
            industry: (formData['industry'] as string) || undefined,
            email: emailVal,
          }
        );
        if (res.data?.projectId) {
          wizardStore.setProjectId(res.data.projectId);
          wizardStore.setClientData({
            projectName: formData['projectName'] as string,
            clientName: formData['clientName'] as string,
            industry: formData['industry'] as string ?? '',
            email: formData['email'] as string ?? '',
            courseTopic: formData['courseTopic'] as string ?? '',
            experienceLevel: formData['experienceLevel'] as string ?? '',
            targetAudience: formData['targetAudience'] as string ?? '',
            expectedOutcome: formData['expectedOutcome'] as string ?? '',
            budget: formData['budget'] as string ?? '',
            courseDuration: formData['courseDuration'] as string ?? '',
            deadline: formData['deadline'] as string ?? '',
            constraints: formData['constraints'] as string ?? '',
          });
          state = wizardStore.getState();
          logger.info(`[step${this._config.stepNumber}] Proyecto creado`, { projectId: res.data.projectId });
        }
      } catch (err) {
        logger.error(`[step${this._config.stepNumber}] Error al crear proyecto`, err);
        hideLoading();
        showError(err instanceof Error ? err.message : 'Error al crear el proyecto');
        return;
      }
    }

    if (!state.projectId) {
      logger.error(`[step${this._config.stepNumber}] Sin projectId`);
      showError('No hay proyecto activo. Regresa al inicio.');
      return;
    }

    // Registrar step si no tiene ID
    let stepId = state.steps[this._config.stepNumber]?.stepId;
    if (!stepId) {
      logger.info(`[step${this._config.stepNumber}] Registrando step...`);
      try {
        const res = await postData<{ stepId: string }>(
          buildEndpoint(ENDPOINTS.wizard.saveStep),
          { projectId: state.projectId, stepNumber: this._config.stepNumber, inputData: formData }
        );
        if (res.data?.stepId) {
          stepId = res.data.stepId;
          wizardStore.setStepId(this._config.stepNumber, stepId);
          logger.info(`[step${this._config.stepNumber}] Step registrado`, { stepId });
        }
      } catch (err) {
        logger.warn(`[step${this._config.stepNumber}] No se pudo registrar el step`, err);
      }
    }

    if (!stepId) {
      logger.error(`[step${this._config.stepNumber}] Sin stepId`);
      showError('No se pudo registrar el paso. Intenta de nuevo.');
      return;
    }

    this._setLoading(true);
    showLoading(`⏳ Procesando... (iniciando)\nPuedes seguir el progreso detallado en la consola del backend.`);
    wizardStore.setStepInputData(this._config.stepNumber, formData);

    if (this._config.stepNumber === 0) {
      wizardStore.setClientData({
        projectName: formData['projectName'] as string,
        clientName: formData['clientName'] as string,
        industry: formData['industry'] as string ?? '',
        email: formData['email'] as string ?? '',
        courseTopic: formData['courseTopic'] as string ?? '',
        experienceLevel: formData['experienceLevel'] as string ?? '',
        targetAudience: formData['targetAudience'] as string ?? '',
        expectedOutcome: formData['expectedOutcome'] as string ?? '',
        budget: formData['budget'] as string ?? '',
        courseDuration: formData['courseDuration'] as string ?? '',
        deadline: formData['deadline'] as string ?? '',
        constraints: formData['constraints'] as string ?? '',
      });
    }

    const context = wizardStore.buildContext(this._config.stepNumber);

    let jobId: string;
    try {
      const payload = {
        projectId: state.projectId,
        stepId,
        phaseId: this._config.phaseId,
        promptId: this._config.promptId,
        context,
        userInputs: formData,
      };


      logger.info(`[step${this._config.stepNumber}] Encolando job...`, { projectId: state.projectId, stepId, phaseId: this._config.phaseId });
      const res = await postData<{ jobId: string; status: string }>(
        buildEndpoint(ENDPOINTS.wizard.generateAsync),
        payload
      );
      jobId = res.data!.jobId;
      logger.info(`[step${this._config.stepNumber}] Job encolado`, { jobId });
    } catch (err) {
      logger.error(`[step${this._config.stepNumber}] Error al encolar job`, err);
      this._setLoading(false);
      hideLoading();
      showError(err instanceof Error ? err.message : 'Error al iniciar la generación');
      return;
    }

    const onComplete = (result: JobResult) => {
      logger.timeEnd(timerLabel);
      logger.info(`[step${this._config.stepNumber}] Job completado`, { documentId: result.documentId });
      wizardStore.setStepDocument(this._config.stepNumber, result.content, result.documentId);
      this._renderPreview(result.content);
      this._setLoading(false);
      hideLoading();
    };

    const onError = (error: string) => {
      logger.timeEnd(timerLabel);
      logger.error(`[step${this._config.stepNumber}] Job fallido`, error);
      showError(error);
      wizardStore.setStepStatus(this._config.stepNumber, 'error');
      this._setLoading(false);
      hideLoading();
    };

    const onUpdate = (job: any) => {
      if (job.progress?.currentStep) {
        const { currentStep, stepIndex, totalSteps } = job.progress;
        const msg = `⏳ Procesando... (${currentStep} - paso ${stepIndex + 1}/${totalSteps})`;
        this._setLoading(true, msg);
        // Usar showLoading de nuevo reescribe el texto del modal si usas @core/ui modal clásico
        showLoading(`${msg}\nPuedes seguir el progreso detallado en la consola del backend.`);
      }
    };

    // Cancelar cualquier suscripción anterior antes de crear la nueva.
    // Sin esto, cada "Regenerar" acumula un polling timer adicional.
    this._jobSubscription?.cancel();

    logger.info(`[step${this._config.stepNumber}] Esperando via Supabase Realtime (WebSocket)...`);
    this._jobSubscription = subscribeToJob(jobId, onComplete, onError, onUpdate);
  }


  // 6. EVENTOS
  protected _bindEvents(): void {
    // Auto-guardar y actualizar resumen al editar cualquier campo
    this._dom.form?.addEventListener('input', () => {
      const data = this._collectFormData();
      wizardStore.setStepInputData(this._config.stepNumber, data);
      this._updateSummary(data);
    });

    this._dom.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this._generateDocumentAsync();
    });

    this._dom.btnCopy?.addEventListener('click', () => {
      const step = wizardStore.getState().steps[this._config.stepNumber];
      if (step?.documentContent) {
        navigator.clipboard.writeText(step.documentContent)
          .then(() => showSuccess('Documento copiado al portapapeles.'))
          .catch(() => showError('No se pudo copiar al portapapeles. Intenta seleccionar y copiar el texto manualmente.'));
      }
    });

    this._dom.btnRegenerate?.addEventListener('click', () => {
      void this._generateDocumentAsync();
    });
  }

  /**
   * Llama al endpoint /extract para preparar el contexto compacto de este paso.
   * Solo actúa si el paso tiene un extractor asignado y aún no hay contexto extraído.
   */
  private async _ensureExtractedContext(): Promise<void> {
    const extractorId = EXTRACTOR_FOR_STEP[this._config.stepNumber];
    if (!extractorId) return;

    const state = wizardStore.getState();
    if (state.extractedContexts[this._config.stepNumber]) return;

    const projectId = state.projectId;
    if (!projectId) return;

    const sourceDocuments: Record<string, string> = {};
    for (const step of state.steps) {
      if (step.status === 'completed' && step.documentContent) {
        sourceDocuments[step.phaseId] = step.documentContent;
      }
    }
    if (Object.keys(sourceDocuments).length === 0) return;

    try {
      showLoading('Preparando contexto...');
      const res = await postData<{
        extractorId: string;
        content: string;
        parserUsed: Record<string, boolean>;
        extractedContextId: string;
      }>(buildEndpoint(ENDPOINTS.wizard.extract), { projectId, extractorId, sourceDocuments });

      if (res.data) {
        wizardStore.setExtractedContext(this._config.stepNumber, {
          extractedContextId: res.data.extractedContextId,
          content: res.data.content,
        });
      }
    } catch {
      // Extracción fallida no es bloqueante
    } finally {
      hideLoading();
    }
  }

  // 7. API PÚBLICA
  async mount(container: HTMLElement): Promise<void> {
    this._container = container;

    const fragment = await TemplateLoader.clone(this._config.templateId);
    container.innerHTML = '';
    container.appendChild(fragment);

    this._cacheDOM();

    // Inyectar burbuja de ayuda y resumen dinámico si están configurados
    this._injectHelpBubble();
    this._injectSummaryDiv();
    this._injectManualOverride();

    await this._ensureExtractedContext();

    const step = wizardStore.getState().steps[this._config.stepNumber];
    if (step?.documentContent) {
      this._renderPreview(step.documentContent);
    }
    if (step?.inputData && Object.keys(step.inputData).length > 0) {
      this._restoreFormData(step.inputData);
      this._updateSummary(step.inputData);
    }

    this._bindEvents();
  }

  protected _restoreFormData(data: Record<string, unknown>): void {
    if (!this._dom.form) return;
    for (const [key, value] of Object.entries(data)) {
      const el = this._dom.form.elements.namedItem(key) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (el && typeof value === 'string') el.value = value;
    }
  }

  getData(): Record<string, unknown> {
    return this._collectFormData();
  }
}
