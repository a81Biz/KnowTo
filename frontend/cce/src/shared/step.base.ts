// frontend/cce/src/shared/step.base.ts
// Clase base para todos los controladores de pasos del wizard CCE.
// Adaptada del FRONTEND ARCHITECTURE DOCUMENT con extensiones para CCE:
//   - companyName/sector en vez de industry
//   - endpoint /upload para instrumentos
//   - generateForm para formularios dinámicos

import { TemplateLoader } from '@core/template.loader';
import { postData, getData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from './endpoints';
import { showLoading, hideLoading, showError, showSuccess, renderMarkdown, printDocument } from '@core/ui';
import { wizardStore } from '../stores/wizard.store';
import type { PhaseId, PromptId, DynamicFormSchema, PipelineStatus } from '../types/wizard.types';

// Mapa de paso → ID del extractor que prepara su contexto compacto.
// Step 1 (F1_1): recibe F0 directamente via buildContext(1) — no necesita extractor.
const EXTRACTOR_FOR_STEP: Record<number, string> = {
  3: 'EXTRACTOR_F1_2',
  4: 'EXTRACTOR_F2',
  5: 'EXTRACTOR_F2_5',
  6: 'EXTRACTOR_F4',
  7: 'EXTRACTOR_F5',
};

// ============================================================================
// 1. TIPOS
// ============================================================================
export interface StepUiConfig {
  loadingText?: string;
  submitText?: string;
  submittingText?: string;
}

export interface StepConfig {
  stepNumber: number;
  templateId: string;
  phaseId: PhaseId;
  promptId: PromptId;
  uiConfig?: StepUiConfig;
  /** Step 0 only: crear el proyecto antes de generar el documento */
  createProjectFirst?: boolean;
}

// ============================================================================
// CLASE BASE
// ============================================================================
export class BaseStep {
  // 2. ESTADO PRIVADO
  protected _container!: HTMLElement;
  protected _config: StepConfig;

  protected _dom: {
    form?: HTMLFormElement;
    btnSubmit?: HTMLButtonElement;
    previewPanel?: HTMLElement;
    documentPreview?: HTMLElement;
    btnCopy?: HTMLButtonElement;
    btnRegenerate?: HTMLButtonElement;
    btnPrint?: HTMLButtonElement;
  } = {};

  protected _uiConfig = {
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
    // Busca por ID exacto primero; si no existe (porque el template usa otro número),
    // toma el primer <form> del contenedor. Esto evita que el submit recargue la página.
    this._dom.form =
      this._container.querySelector<HTMLFormElement>(`#form-step${this._config.stepNumber}`) ??
      this._container.querySelector<HTMLFormElement>('form') ?? undefined;
    this._dom.btnSubmit = this._container.querySelector('#btn-submit') ?? undefined;
    this._dom.previewPanel = this._container.querySelector('#preview-panel') ?? undefined;
    this._dom.documentPreview = this._container.querySelector('#document-preview') ?? undefined;
    this._dom.btnCopy = this._container.querySelector('#btn-copy-doc') ?? undefined;
    this._dom.btnRegenerate = this._container.querySelector('#btn-regenerate') ?? undefined;
  }

  // 4. LÓGICA DE VISTA
  protected _renderPreview(markdown: string): void {
    if (!this._dom.previewPanel || !this._dom.documentPreview) return;
    this._dom.documentPreview.innerHTML = renderMarkdown(markdown);
    this._dom.previewPanel.classList.remove('hidden');
    this._ensurePrintButton(markdown);
  }

  private _ensurePrintButton(markdown: string): void {
    if (!this._dom.previewPanel) return;
    if (this._dom.btnPrint) {
      this._dom.btnPrint.onclick = () => printDocument(markdown,
        wizardStore.getState().clientData.projectName || 'Documento KnowTo CCE');
      return;
    }
    const btnContainer = this._dom.previewPanel.querySelector<HTMLElement>('.flex.gap-2');
    if (!btnContainer) return;

    const btn = document.createElement('button');
    btn.id = 'btn-print';
    btn.textContent = '🖨️ Imprimir / PDF';
    btn.className = 'px-4 py-2 border border-green-300 text-green-700 rounded-lg text-sm hover:bg-green-50';
    btn.onclick = () => printDocument(markdown,
      wizardStore.getState().clientData.projectName || 'Documento KnowTo CCE');

    btnContainer.appendChild(btn);
    this._dom.btnPrint = btn;
  }

  protected _setLoading(loading: boolean): void {
    if (!this._dom.btnSubmit) return;
    this._dom.btnSubmit.disabled = loading;
    this._dom.btnSubmit.textContent = loading
      ? this._uiConfig.submittingText
      : this._uiConfig.submitText;
  }

  // 5. LÓGICA DE NEGOCIO
  protected _collectFormData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    if (!this._dom.form) return data;
    new FormData(this._dom.form).forEach((value, key) => { data[key] = value; });
    return data;
  }

  protected async _createProject(formData: Record<string, unknown>): Promise<string | null> {
    try {
      showLoading('Creando proyecto...');
      const res = await postData<{ projectId: string }>(
        buildEndpoint(ENDPOINTS.wizard.createProject),
        {
          name: formData['projectName'] as string,
          clientName: formData['clientName'] as string,
          companyName: (formData['companyName'] as string) || undefined,
          sector: (formData['sector'] as string) || undefined,
          email: (formData['email'] as string) || undefined,
        }
      );
      if (res.data?.projectId) {
        wizardStore.setProjectId(res.data.projectId);
        const str = (k: string) => (formData[k] as string | undefined) ?? '';
        wizardStore.setClientData({
          projectName:          str('projectName'),
          clientName:           str('clientName'),
          companyName:          str('companyName'),
          tradeName:            str('tradeName'),
          mainActivity:         str('mainActivity'),
          sector:               str('sector'),
          subsector:            str('subsector'),
          city:                 str('city'),
          stateRegion:          str('stateRegion'),
          hasMultipleSites:     str('hasMultipleSites'),
          yearsInOperation:     str('yearsInOperation'),
          isPartOfCorporation:  str('isPartOfCorporation'),
          totalWorkers:         str('totalWorkers'),
          unionizedWorkers:     str('unionizedWorkers'),
          mainDepartments:      str('mainDepartments'),
          workersByArea:        str('workersByArea'),
          mainProblem:          str('mainProblem'),
          currentSituation:     str('currentSituation'),
          symptoms:             str('symptoms'),
          problemStart:         str('problemStart'),
          quantitativeData:     str('quantitativeData'),
          previousAttempts:     str('previousAttempts'),
          hasIMSS:              str('hasIMSS'),
          hasDC2:               str('hasDC2'),
          hasMixedCommission:   str('hasMixedCommission'),
          hasSTPS:              str('hasSTPS'),
          recentTraining:       str('recentTraining'),
          hasDC3:               str('hasDC3'),
          hasTrainingBudget:    str('hasTrainingBudget'),
          hasTrainingFacilities:str('hasTrainingFacilities'),
          hasLMS:               str('hasLMS'),
          hasInternalInstructor:str('hasInternalInstructor'),
          trainingAvailability: str('trainingAvailability'),
          mainObjective:        str('mainObjective'),
          measurableResult:     str('measurableResult'),
          timeframe:            str('timeframe'),
          restrictions:         str('restrictions'),
          contactPosition:      str('contactPosition'),
          email:                str('email'),
          phone:                str('phone'),
          availableSchedule:    str('availableSchedule'),
          // §9 Presencia digital
          websiteUrl:           str('websiteUrl'),
          socialMediaUrls:      str('socialMediaUrls'),
          mostActiveNetworks:   str('mostActiveNetworks'),
          reviewProfiles:       str('reviewProfiles'),
        });
        return res.data.projectId;
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al crear el proyecto');
    } finally {
      hideLoading();
    }
    return null;
  }

  protected async _ensureStepId(projectId: string, formData: Record<string, unknown>): Promise<string | null> {
    const step = wizardStore.getState().steps[this._config.stepNumber];
    if (step?.stepId) return step.stepId;

    try {
      const res = await postData<{ stepId: string }>(
        buildEndpoint(ENDPOINTS.wizard.saveStep),
        { projectId, stepNumber: this._config.stepNumber, inputData: formData }
      );
      if (res.data?.stepId) {
        wizardStore.setStepId(this._config.stepNumber, res.data.stepId);
        return res.data.stepId;
      }
    } catch { /* continuar */ }
    return null;
  }

  protected async _generateDocument(extraData?: Record<string, unknown>, options: { regenerate?: boolean } = {}): Promise<void> {
    const formData = { ...this._collectFormData(), ...extraData };
    let state = wizardStore.getState();

    if (this._config.createProjectFirst && !state.projectId) {
      const projectId = await this._createProject(formData);
      if (!projectId) return;
      state = wizardStore.getState();
    }

    if (!state.projectId) { showError('No hay proyecto activo. Regresa al inicio.'); return; }

    const stepId = await this._ensureStepId(state.projectId, formData);
    if (!stepId) { showError('No se pudo registrar el paso. Intenta de nuevo.'); return; }

    this._setLoading(true);
    showLoading(this._uiConfig.loadingText);
    wizardStore.setStepInputData(this._config.stepNumber, formData);

    try {
      const context = wizardStore.buildContext(this._config.stepNumber) as {
        projectName: string;
        clientName: string;
        companyName?: string;
        sector?: string;
        email?: string;
        previousData?: Record<string, unknown>;
      };

      const res = await postData<{ documentId?: string; content?: string; pipelineId?: string }>(
        buildEndpoint(ENDPOINTS.wizard.generate),
        {
          projectId: state.projectId,
          stepId,
          phaseId: this._config.phaseId,
          promptId: this._config.promptId,
          context,
          userInputs: formData,
          regenerate: options.regenerate,
        }
      );

      if (res.data?.pipelineId) {
        const finalStatus = await this._pollPipelineStatus(res.data.pipelineId);
        const finalContent = typeof finalStatus.output === 'string' 
          ? finalStatus.output 
          : JSON.stringify(finalStatus.output) || 'Sin contenido de salida';
        wizardStore.setStepDocument(this._config.stepNumber, finalContent, res.data.pipelineId);
        this._renderPreview(finalContent);
        if (finalStatus.intermediateOutputs && this._dom.previewPanel) {
          this._renderDebugOutputs(this._dom.previewPanel, finalStatus.intermediateOutputs);
        }
      } else if (res.data?.content) {
        wizardStore.setStepDocument(this._config.stepNumber, res.data.content, res.data.documentId!);
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

  // --- Pipeline Polling Helpers ---
  protected async _pollPipelineStatus(pipelineId: string): Promise<PipelineStatus> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const res = await getData<PipelineStatus>(
            buildEndpoint(ENDPOINTS.wizard.pipelineStatus(pipelineId))
          );
          const st = res.data;
          if (!st) throw new Error("Formato de estado de pipeline inválido");
          
          this._updatePipelineProgress(st);
          
          if (st.status === 'completed') {
            if (st.error) {
              // Warning por fallthrough_on_error (no bloquea)
              showError(`Pipeline completado con datos parciales: ${st.error}`);
            }
            resolve(st);
          } else if (st.status === 'failed') {
            reject(new Error(st.error || 'Fallo el pipeline en el backend.'));
          } else {
            setTimeout(poll, 2000);
          }
        } catch (err) {
          reject(err);
        }
      };
      void poll();
    });
  }

  protected _updatePipelineProgress(status: PipelineStatus): void {
    const stage = status.currentStage || 'procesando...';
    const progress = `(${status.completedStages ?? 0}/${status.totalStages ?? 0})`;
    const isRetry = (status.retryCount && status.retryCount > 0) ? ` [Reintentando ${status.retryCount}]` : '';
    showLoading(`Etapa: ${stage} ${progress}${isRetry}`);
  }
  
  // --- Debug Outputs UI ---
  protected _renderDebugOutputs(container: HTMLElement, stagesData: Record<string, any>): void {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') !== '1') return;

    let html = '<div class="mt-4 border border-gray-200 rounded-lg overflow-hidden">';
    html += '<details class="group">';
    html += '<summary class="px-4 py-2 bg-gray-50 text-gray-700 text-sm font-medium cursor-pointer hover:bg-gray-100 flex items-center gap-2">';
    html += '<span class="group-open:-rotate-180 transition-transform text-xs">▼</span> Outputs intermedios (debug)';
    html += '</summary>';
    html += '<div class="p-4 bg-gray-900 text-green-400 text-xs font-mono overflow-auto max-h-64">';
    html += '<ul class="space-y-4">';
    
    for (const [stage, data] of Object.entries(stagesData)) {
      html += `<li><div class="text-white font-bold mb-1">├── ${stage}</div><pre class="pl-6 border-l border-gray-700 ml-2 whitespace-pre-wrap">${JSON.stringify(data, null, 2)}</pre></li>`;
    }

    html += '</ul></div></details></div>';
    
    const div = document.createElement('div');
    div.innerHTML = html;
    container.appendChild(div);
  }

  /**
   * Genera un FormSchema dinámico usando la IA.
   * Retorna el schema o null si falla.
   */
  protected async _generateForm(
    promptId: 'F0_CLIENT_QUESTIONS_FORM' | 'F5_TEST_REPORT_FORM'
  ): Promise<DynamicFormSchema | null> {
    const state = wizardStore.getState();
    if (!state.projectId) return null;

    try {
      showLoading('Generando formulario con IA...');
      const context = wizardStore.buildContext(this._config.stepNumber) as {
        projectName: string; clientName: string; companyName?: string;
        sector?: string; email?: string; previousData?: Record<string, unknown>;
      };

      const res = await postData<{ formSchema: DynamicFormSchema }>(
        buildEndpoint(ENDPOINTS.wizard.generateForm),
        { projectId: state.projectId, promptId, context }
      );
      return res.data?.formSchema ?? null;
    } catch {
      return null;
    } finally {
      hideLoading();
    }
  }

  /**
   * Sube un archivo de instrumento (PDF/JPG/PNG) al backend.
   */
  protected async _uploadFile(params: {
    instrumentId: string;
    fileName: string;
    mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
    base64Content: string;
  }): Promise<{ fileId: string; fileName: string; instrumentId: string } | null> {
    const state = wizardStore.getState();
    if (!state.projectId) return null;

    try {
      const res = await postData<{ fileId: string; fileName: string; instrumentId: string }>(
        buildEndpoint(ENDPOINTS.wizard.upload),
        { projectId: state.projectId, ...params }
      );
      return res.data ?? null;
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al subir el archivo');
      return null;
    }
  }

  // 6. EVENTOS
  protected _bindEvents(): void {
    this._dom.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this._generateDocument();
    });

    this._dom.btnCopy?.addEventListener('click', () => {
      const step = wizardStore.getState().steps[this._config.stepNumber];
      if (step?.documentContent) {
        navigator.clipboard.writeText(step.documentContent)
          .then(() => showSuccess('Documento copiado al portapapeles.'))
          .catch(() => showError('No se pudo copiar. Selecciona y copia manualmente.'));
      }
    });

    this._dom.btnRegenerate?.addEventListener('click', () => {
      void this._generateDocument();
    });
  }

  /**
   * Llama a /extract para preparar el contexto compacto de este paso.
   * No-op si el paso no tiene extractor o ya tiene contexto.
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
    // El extractor espera clave 'F0' pero el paso 0 tiene phaseId 'INTAKE'
    if (sourceDocuments['INTAKE'] && !sourceDocuments['F0']) {
      sourceDocuments['F0'] = sourceDocuments['INTAKE'];
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

    await this._ensureExtractedContext();

    const step = wizardStore.getState().steps[this._config.stepNumber];
    if (step?.documentContent) this._renderPreview(step.documentContent);
    if (step?.inputData) this._restoreFormData(step.inputData);

    this._bindEvents();
  }

  protected _restoreFormData(data: Record<string, unknown>): void {
    if (!this._dom.form) return;
    for (const [key, value] of Object.entries(data)) {
      const el = this._dom.form.elements.namedItem(key) as
        | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (el && typeof value === 'string') el.value = value;
    }
  }

  getData(): Record<string, unknown> {
    return this._collectFormData();
  }
}
