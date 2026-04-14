// src/controllers/step8.adjustments.ts
// HTML en: /templates/tpl-step7-adjustments.html
//
// Controlador para F6: formulario dinámico + generación del documento de ajustes.
// Flujo: 1) generar formulario via /generate-form → 2) usuario llena → 3) /generate

import { BaseStep } from '../shared/step.base';
import { postData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from '../shared/endpoints';
import { showLoading, hideLoading, showError } from '@core/ui';
import { wizardStore } from '../stores/wizard.store';
import type { DynamicFormField, DynamicFormSchema } from '../types/wizard.types';

const STEP_NUMBER = 8;

class Step8AdjustmentsController extends BaseStep {
  private _adjDom: {
    formGenerationPanel?: HTMLElement;
    btnGenerateForm?: HTMLButtonElement;
    dynamicFormPanel?: HTMLElement;
    dynamicFormTitle?: HTMLElement;
    dynamicFormDescription?: HTMLElement;
    dynamicFieldsContainer?: HTMLElement;
  } = {};

  constructor() {
    super({
      stepNumber: STEP_NUMBER,
      templateId: 'tpl-step7-adjustments',
      phaseId: 'F6.1',
      promptId: 'F6',
      uiConfig: {
        loadingText: 'Generando Documento de Ajustes (F6.1)...',
        helpText: 'La IA analiza el checklist de verificación y genera un formulario personalizado con los ajustes requeridos. Llena el formulario generado y luego produce el documento de ajustes para el expediente.',
      },
    });
  }

  private _cacheAdjDom(): void {
    this._adjDom.formGenerationPanel     = this._container.querySelector('#form-generation-panel') ?? undefined;
    this._adjDom.btnGenerateForm         = this._container.querySelector('#btn-generate-form') ?? undefined;
    this._adjDom.dynamicFormPanel        = this._container.querySelector('#dynamic-form-panel') ?? undefined;
    this._adjDom.dynamicFormTitle        = this._container.querySelector('#dynamic-form-title') ?? undefined;
    this._adjDom.dynamicFormDescription  = this._container.querySelector('#dynamic-form-description') ?? undefined;
    this._adjDom.dynamicFieldsContainer  = this._container.querySelector('#dynamic-fields-container') ?? undefined;

    // El BaseStep busca #form-stepN — apuntar al form dinámico
    this._dom.form = this._container.querySelector('#form-step8') ?? undefined;
  }

  private async _loadDynamicForm(): Promise<void> {
    const state = wizardStore.getState();
    if (!state.projectId) { showError('No hay proyecto activo.'); return; }

    if (this._adjDom.btnGenerateForm) {
      this._adjDom.btnGenerateForm.disabled = true;
      this._adjDom.btnGenerateForm.textContent = '⏳ Analizando verificación...';
    }
    showLoading('Generando formulario personalizado...');

    try {
      const context = wizardStore.buildContext(STEP_NUMBER) as {
        projectName: string; clientName: string; industry?: string; email?: string; previousData?: Record<string, unknown>;
      };

      const res = await postData<{ formSchema: DynamicFormSchema }>(
        buildEndpoint(ENDPOINTS.wizard.generateForm),
        { projectId: state.projectId, promptId: 'F6_FORM', context }
      );

      if (res.data?.formSchema) {
        this._renderDynamicForm(res.data.formSchema);
        if (this._adjDom.formGenerationPanel) this._adjDom.formGenerationPanel.classList.add('hidden');
        if (this._adjDom.dynamicFormPanel) this._adjDom.dynamicFormPanel.classList.remove('hidden');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al generar el formulario');
      if (this._adjDom.btnGenerateForm) {
        this._adjDom.btnGenerateForm.disabled = false;
        this._adjDom.btnGenerateForm.textContent = '🔍 Analizar verificación y generar formulario';
      }
    } finally {
      hideLoading();
    }
  }

  private _renderDynamicForm(schema: DynamicFormSchema): void {
    if (this._adjDom.dynamicFormTitle) this._adjDom.dynamicFormTitle.textContent = schema.formTitle;
    if (this._adjDom.dynamicFormDescription) this._adjDom.dynamicFormDescription.textContent = schema.description;
    if (!this._adjDom.dynamicFieldsContainer) return;

    this._adjDom.dynamicFieldsContainer.innerHTML = schema.fields.map((field) => this._renderField(field)).join('');
  }

  private _renderField(field: DynamicFormField): string {
    const baseInputClass = 'input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 text-sm';
    const required = field.required ? ' *' : '';
    const helpHtml = field.helpText
      ? `<p class="text-xs text-gray-400 mt-1">${field.helpText}</p>`
      : '';

    let inputHtml: string;

    if (field.type === 'textarea') {
      inputHtml = `<textarea name="${field.id}" id="field-${field.id}" rows="3"
        placeholder="${field.placeholder ?? ''}"
        class="${baseInputClass}" ${field.required ? 'required' : ''}></textarea>`;
    } else if (field.type === 'select' && field.options) {
      const options = field.options.map((o) => `<option value="${o.value}">${o.label}</option>`).join('');
      inputHtml = `<select name="${field.id}" id="field-${field.id}" class="${baseInputClass}" ${field.required ? 'required' : ''}>
        <option value="">— Selecciona —</option>
        ${options}
      </select>`;
    } else {
      inputHtml = `<input type="${field.type === 'number' ? 'number' : 'text'}"
        name="${field.id}" id="field-${field.id}"
        placeholder="${field.placeholder ?? ''}"
        class="${baseInputClass}" ${field.required ? 'required' : ''} />`;
    }

    return `<div class="group">
      <label class="block text-xs font-semibold text-gray-600 mb-1" for="field-${field.id}">
        ${field.label}${required}
      </label>
      ${inputHtml}
      ${helpHtml}
    </div>`;
  }

  override _bindEvents(): void {
    this._adjDom.btnGenerateForm?.addEventListener('click', () => {
      void this._loadDynamicForm();
    });

    // El submit usa _generateDocumentAsync de BaseStep con los datos del formulario dinámico
    this._dom.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this._generateDocumentAsync();
    });

    this._dom.btnCopy?.addEventListener('click', () => {
      const step = wizardStore.getState().steps[STEP_NUMBER];
      if (step?.documentContent) {
        navigator.clipboard.writeText(step.documentContent)
          .then(() => { /* éxito silencioso */ })
          .catch(() => showError('No se pudo copiar al portapapeles.'));
      }
    });

    this._dom.btnRegenerate?.addEventListener('click', () => {
      void this._generateDocumentAsync();
    });
  }

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container);
    this._cacheAdjDom();

    // Si ya había un documento generado, mostrar preview
    const step = wizardStore.getState().steps[STEP_NUMBER];
    if (step?.documentContent) {
      if (this._adjDom.formGenerationPanel) this._adjDom.formGenerationPanel.classList.add('hidden');
    }
  }
}

// ── Exportación ──────────────────────────────────────────────────────────────

const _instance = new Step8AdjustmentsController();

export const Step8Adjustments = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
