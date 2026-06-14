// src/controllers/step8.adjustments.ts
// HTML en: /templates/tpl-step7-adjustments.html
//
// Controlador para F6: formulario dinámico + generación del documento de ajustes.
// Flujo: 1) generar formulario via /generate-form → 2) usuario llena → 3) /generate

import { BaseStep } from '../shared/step.base';
import { showError } from '@core/ui';
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

  // Extrae los módulos del curso leyendo los documentos ya generados en el wizard store.
  // Busca en F2 (idx 2), F3 (idx 4) y F2.5 (idx 3). Sin LLM.
  private _extractModules(): Array<{ num: number; nombre: string }> {
    const steps = wizardStore.getState().steps;
    for (const idx of [2, 4, 3, 5]) {
      const doc = steps[idx]?.documentContent ?? '';
      if (!doc) continue;
      const map = new Map<number, string>();
      const re = /\b(?:Módulo|Unidad)\s+(\d+)\s*[:\-–]\s*([^\n|*#]{3,80})/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(doc)) !== null) {
        const n = parseInt(m[1]);
        const name = m[2].replace(/\*+/g, '').trim();
        if (!map.has(n) && name.length > 2) map.set(n, name);
      }
      if (map.size > 1) {
        return Array.from(map.entries()).map(([num, nombre]) => ({ num, nombre })).sort((a, b) => a.num - b.num);
      }
    }
    return [{ num: 1, nombre: 'Módulo único del curso' }];
  }

  private _buildSchema(modules: Array<{ num: number; nombre: string }>): DynamicFormSchema {
    const TYPE_OPTIONS = [
      { value: 'ninguno',        label: 'Sin ajuste necesario en este módulo' },
      { value: 'tecnico',        label: 'Técnico (plataforma, link, video, audio)' },
      { value: 'pedagogico',     label: 'Pedagógico (instrucciones, dificultad, claridad)' },
      { value: 'administrativo', label: 'Administrativo (fechas, nombres, datos)' },
    ];

    const fields: DynamicFormField[] = [
      {
        id: 'courseVersion', label: 'Versión del curso después de ajustes',
        type: 'text', placeholder: 'Ej: 1.1', required: true,
        helpText: 'Incrementa el número de versión respecto a la versión anterior.',
      },
      {
        id: 'observationSummary', label: 'Resumen general de observaciones recibidas',
        type: 'textarea', placeholder: 'Observaciones del evaluador o participantes de prueba.',
        required: true, helpText: 'Incluye observaciones técnicas y pedagógicas.',
      },
    ];

    for (const { num, nombre } of modules) {
      const p = `mod_${num}`;
      fields.push(
        { id: `${p}_description`, label: `${nombre} — Problema o ajuste detectado`,
          type: 'textarea', placeholder: "Describe el problema o escribe 'Sin observaciones'.",
          required: true, helpText: 'Actividad específica, síntoma observable, impacto.' },
        { id: `${p}_solution`, label: `${nombre} — Solución implementada`,
          type: 'textarea', placeholder: 'Describe el cambio realizado (archivo, texto, config).',
          required: true, helpText: 'Indica el recurso modificado y el cambio exacto.' },
        { id: `${p}_type`, label: `${nombre} — Tipo de ajuste`,
          type: 'select', required: true, options: TYPE_OPTIONS },
        { id: `${p}_verification`, label: `${nombre} — ¿Cómo verificaste que quedó resuelto?`,
          type: 'text', placeholder: "Ej: Probé el módulo completo. Si no hubo ajuste: 'No aplica'.",
          required: true, helpText: 'Verificación objetiva y comprobable.' },
      );
    }

    fields.push(
      { id: 'additionalAdjustments', label: 'Otros ajustes (no asociados a un módulo específico)',
        type: 'textarea', placeholder: 'Cambios globales u otros no contemplados arriba.',
        required: false, helpText: 'Opcional.' },
      { id: 'completionDate', label: 'Fecha de finalización de ajustes',
        type: 'text', placeholder: 'DD/MM/AAAA', required: true,
        helpText: 'Fecha en que implementaste todos los ajustes.' },
    );

    return {
      formTitle: 'Ajustes Post-Evaluación',
      description: `Documenta los ajustes módulo por módulo (${modules.length} módulo${modules.length !== 1 ? 's' : ''}). Si un módulo no requirió ajustes, selecciona "Sin ajuste necesario" y escribe "No aplica" en verificación.`,
      fields,
    };
  }

  private _loadDynamicForm(): void {
    const modules = this._extractModules();
    const schema = this._buildSchema(modules);
    this._renderDynamicForm(schema);
    if (this._adjDom.formGenerationPanel) this._adjDom.formGenerationPanel.classList.add('hidden');
    if (this._adjDom.dynamicFormPanel) this._adjDom.dynamicFormPanel.classList.remove('hidden');
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
    // Solo eventos de _dom. Los de _adjDom van en _bindSubDomEvents.
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

  private _bindSubDomEvents(): void {
    this._adjDom.btnGenerateForm?.addEventListener('click', () => {
      this._loadDynamicForm();
    });
  }

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container);
    this._cacheAdjDom();
    this._bindSubDomEvents();

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
