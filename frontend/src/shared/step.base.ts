// src/shared/step.base.ts
// Clase base para todos los controladores de pasos del wizard
// Implementa las 7 secciones obligatorias del FRONTEND ARCHITECTURE DOCUMENT

import { TemplateLoader } from './template.loader';
import { postData } from './http.client';
import { ENDPOINTS, buildEndpoint } from './endpoints';
import { showLoading, hideLoading, showError, renderMarkdown } from './ui';
import { wizardStore } from '../stores/wizard.store';
import type { PhaseId, PromptId } from '../types/wizard.types';

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
    this._dom.form = this._container.querySelector(`#form-step${this._config.stepNumber}`) ?? undefined;
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

  protected async _generateDocument(extraData?: Record<string, unknown>): Promise<void> {
    const formData = { ...this._collectFormData(), ...extraData };
    let state = wizardStore.getState();

    // Step 0: crear el proyecto con los datos del formulario antes de generar
    if (this._config.createProjectFirst && !state.projectId) {
      try {
        showLoading('Creando proyecto...');
        const emailVal = (formData['email'] as string) || undefined;
        const res = await postData<{ projectId: string }>(
          ENDPOINTS.wizard.createProject,
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
          ENDPOINTS.wizard.saveStep,
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

    try {
      const context = wizardStore.buildContext() as {
        projectName: string;
        clientName: string;
        industry?: string;
        email?: string;
        previousData?: Record<string, unknown>;
      };

      const res = await postData<{ documentId: string; content: string }>(
        ENDPOINTS.wizard.generate,
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
          .then(() => alert('Documento copiado al portapapeles'));
      }
    });

    this._dom.btnRegenerate?.addEventListener('click', () => {
      void this._generateDocument();
    });
  }

  // 7. API PÚBLICA
  async mount(container: HTMLElement): Promise<void> {
    this._container = container;

    // Cargar template desde archivo (NO HTML embebido)
    const fragment = await TemplateLoader.clone(this._config.templateId);
    container.innerHTML = '';
    container.appendChild(fragment);

    this._cacheDOM();

    // Restaurar datos previos si existen
    const step = wizardStore.getState().steps[this._config.stepNumber];
    if (step?.documentContent) {
      this._renderPreview(step.documentContent);
    }
    if (step?.inputData) {
      this._restoreFormData(step.inputData);
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
