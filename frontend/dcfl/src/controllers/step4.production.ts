// src/controllers/step4.production.ts
// HTML en: /templates/tpl-step4-production.html
//
// Sub-wizard de F4: genera los 8 productos EC0366 de forma secuencial.
// AHORA CON FORMULARIOS DINÁMICOS GENERADOS POR IA

import { BaseStep } from '../shared/step.base';
import { postData, getData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from '../shared/endpoints';
import { showLoading, hideLoading, showError, renderMarkdown, printDocument } from '@core/ui';
import { wizardStore } from '../stores/wizard.store';
import type { PromptId } from '../types/wizard.types';
import { subscribeToJob, type JobSubscription } from '../shared/supabase.realtime';

interface F4ProductoBD {
  id: string;
  producto: string;
  documento_final: string | null;
  validacion_estado: string;
  validacion_errores: Record<string, unknown> | null;
  datos_producto: Record<string, unknown> | null;
  job_id: string | null;
}

const STEP_NUMBER = 5;

const PRODUCTS: Array<{ promptId: PromptId; productCode: string; label: string; elementoEC: string }> = [
  { promptId: 'F4_P1_GENERATE_DOCUMENT' as PromptId, productCode: 'P1', label: '1 Instrumentos de Evaluación', elementoEC: 'Producto #1' },
  { promptId: 'F4_P4_GENERATE_DOCUMENT' as PromptId, productCode: 'P4', label: '2 Manual del Participante', elementoEC: 'Producto #2' },
  { promptId: 'F4_P3_GENERATE_DOCUMENT' as PromptId, productCode: 'P3', label: '3 Guiones Multimedia', elementoEC: 'Producto #3' },
  { promptId: 'F4_P2_GENERATE_DOCUMENT' as PromptId, productCode: 'P2', label: '4 Presentación Electrónica', elementoEC: 'Producto #4' },
  { promptId: 'F4_P5_GENERATE_DOCUMENT' as PromptId, productCode: 'P5', label: '5 Guías de Actividades', elementoEC: 'Producto #5' },
  { promptId: 'F4_P6_GENERATE_DOCUMENT' as PromptId, productCode: 'P6', label: '6 Calendario General', elementoEC: 'Producto #6' },
  { promptId: 'F4_P7_GENERATE_DOCUMENT' as PromptId, productCode: 'P7', label: '7 Documento de Información', elementoEC: 'Producto #7' },
  { promptId: 'F4_P8_GENERATE_DOCUMENT' as PromptId, productCode: 'P8', label: '8 Cronograma de Desarrollo', elementoEC: 'Producto #8' },
];

class Step5ProductionController extends BaseStep {
  private _currentProductIndex = 0;
  private _approvedProducts: Map<number, { content: string; documentId: string }> = new Map();
  private _sharedFormData: Record<string, unknown> = {};
  private _validationWarnings: Set<number> = new Set();
  private _currentSchema: any = null;
  private _schemaSubscription: JobSubscription | null = null;

  private _subDom: {
    productIndicators?: HTMLElement;
    productElementLabel?: HTMLElement;
    productTitle?: HTMLElement;
    productCounter?: HTMLElement;
    productNotStarted?: HTMLElement;
    productPreviewArea?: HTMLElement;
    productDocumentPreview?: HTMLElement;
    productGenerateArea?: HTMLElement;
    btnApproveProduct?: HTMLButtonElement;
    btnPrintProduct?: HTMLButtonElement;
    productionFormContainer?: HTMLElement;
  } = {};

  constructor() {
    super({
      stepNumber: STEP_NUMBER,
      templateId: 'tpl-step4-production',
      phaseId: 'F4',
      promptId: 'F4_P1',
      uiConfig: {
        loadingText: 'Generando producto...',
        helpText: 'Genera los 8 productos obligatorios del EC0366 de forma secuencial.',
      },
    });
  }

  // ==============================================
  // FORMULARIOS DINÁMICOS - NÚCLEO DEL SISTEMA
  // ==============================================

  /**
   * Carga el esquema del formulario desde el backend (generado por IA)
   * El backend ejecuta el pipeline F4_GENERATE_FORM_SCHEMA con dos agentes y un juez
   */
  private async _loadFormSchema(producto: string): Promise<any> {
    const projectId = wizardStore.getState().projectId;
    if (!projectId) return null;

    const url = buildEndpoint(`/api/form-schema/${projectId}/${producto}`);
    console.log('[F4] Fetching form schema from:', url);

    try {
      const result = await getData<any>(url) as any;
      console.log('[F4] Response data:', result);

      if (result.status === 'ready') {
        this._currentSchema = result;
        return result;
      }

      if (result.status === 'generating' && result.jobId) {
        this._showGeneratingStatus();
        return new Promise<any>((resolve) => {
          this._schemaSubscription?.cancel();
          this._schemaSubscription = subscribeToJob(
            result.jobId,
            async () => {
              try {
                const ready = await getData<any>(url) as any;
                this._currentSchema = ready.status === 'ready' ? ready : null;
                resolve(this._currentSchema);
              } catch {
                resolve(null);
              }
            },
            (error) => {
              console.error('[F4] Schema generation failed:', error);
              this._showErrorForm();
              resolve(null);
            },
            (job) => {
              if (job.progress?.currentStep) {
                this._showGeneratingStatus(job.progress.currentStep);
              }
            }
          );
        });
      }
    } catch (err) {
      console.error('[F4] Error loading schema:', err);
      this._showErrorForm();
    }

    return null;
  }

  /**
   * Muestra estado de generación del formulario con el agente actual si está disponible
   */
  private _showGeneratingStatus(currentStep?: string): void {
    const formContainer = document.getElementById('form-step6');
    if (!formContainer) return;
    const stepLine = currentStep
      ? `<p class="text-purple-700 text-xs font-mono mt-2 bg-purple-100 rounded px-2 py-1 inline-block">${this._escapeHtml(currentStep)}</p>`
      : `<p class="text-purple-600 text-sm mt-2">La IA está analizando tu curso para crear el formulario adecuado.</p>`;
    formContainer.innerHTML = `
      <div class="bg-purple-50 p-6 rounded-lg text-center border border-purple-200">
        <div class="text-4xl mb-3">🤖</div>
        <p class="text-purple-800 font-medium">Generando formulario inteligente...</p>
        ${stepLine}
        <div class="mt-3 flex justify-center">
          <div class="animate-pulse flex space-x-1">
            <div class="w-2 h-2 bg-purple-400 rounded-full"></div>
            <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
            <div class="w-2 h-2 bg-purple-600 rounded-full"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza el formulario usando el esquema generado por IA
   * NO hay código hardcodeado - todo viene del backend
   */
  private async _renderDynamicForm(): Promise<void> {
    console.log('[F4] _renderDynamicForm called for index:', this._currentProductIndex);
    const product = PRODUCTS[this._currentProductIndex];
    const productoNum = product.productCode;
    const formContainer = document.getElementById('form-step6');

    if (!formContainer) return;

    console.log(`[F4] Cargando formulario dinámico para ${productoNum}`);

    // Mostrar loading
    formContainer.innerHTML = `
      <div class="bg-gray-50 p-4 rounded-lg text-center">
        <p class="text-gray-500">🔄 Cargando formulario inteligente...</p>
      </div>
    `;

    const schemaData = await this._loadFormSchema(productoNum);

    if (!schemaData || schemaData.status !== 'ready') {
      this._showErrorForm();
      return;
    }

    const { schema, valores_sugeridos, valores_usuario } = schemaData;
    const fields = schema.fields || [];

    if (fields.length === 0) {
      this._showErrorForm();
      return;
    }

    // Construir HTML dinámicamente desde el esquema
    let html = `
      <div class="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
        <p class="text-sm text-blue-800">${this._escapeHtml(schema.description || 'Confirma los datos para generar el producto:')}</p>
      </div>
    `;

    for (const field of fields) {
      const savedValue = valores_usuario?.[field.name];
      const suggestedValue = valores_sugeridos?.[field.name] || field.suggested_value || '';
      const value = (savedValue !== undefined && savedValue !== '') ? savedValue : suggestedValue;

      const required = field.required ? '<span class="text-red-500">*</span>' : '';

      html += `<div class="group mb-4">`;
      html += `<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">${this._escapeHtml(field.label)} ${required}</label>`;

      if (field.type === 'textarea') {
        html += `<textarea 
          id="input-${field.name}" 
          name="${field.name}" 
          rows="${field.rows || 4}"
          placeholder="${this._escapeHtml(field.placeholder || '')}"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">${this._escapeHtml(String(value))}</textarea>`;
      } else if (field.type === 'select' && field.options?.length) {
        html += `<select 
          id="input-${field.name}" 
          name="${field.name}"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">`;
        for (const opt of field.options) {
          html += `<option value="${this._escapeHtml(opt)}" ${value === opt ? 'selected' : ''}>${this._escapeHtml(opt)}</option>`;
        }
        html += `</select>`;
      } else if (field.type === 'date') {
        html += `<input 
          id="input-${field.name}" 
          name="${field.name}" 
          type="date"
          value="${this._escapeHtml(String(value))}"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">`;
      } else {
        html += `<input 
          id="input-${field.name}" 
          name="${field.name}" 
          type="${field.type || 'text'}"
          placeholder="${this._escapeHtml(field.placeholder || '')}"
          value="${this._escapeHtml(String(value))}"
          class="input-field w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500">`;
      }

      if (field.hint) {
        html += `<p class="text-xs text-gray-400 mt-1">${this._escapeHtml(field.hint)}</p>`;
      }

      html += `</div>`;
    }

    formContainer.innerHTML = html;

    // Guardar valores cuando cambien
    this._bindFormAutoSave();
  }

  /**
   * Auto-guarda los valores del formulario cuando el usuario cambia algo
   */
  private _bindFormAutoSave(): void {
    const formContainer = document.getElementById('form-step6');
    if (!formContainer) return;

    const inputs = formContainer.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.removeEventListener('change', this._saveFormValuesBound);
      input.addEventListener('change', this._saveFormValuesBound);
    });
  }

  private _saveFormValuesBound = () => this._saveFormValues();

  private async _saveFormValues(): Promise<void> {
    const projectId = wizardStore.getState().projectId;
    const productoNum = PRODUCTS[this._currentProductIndex].productCode;
    const formContainer = document.getElementById('form-step6');

    if (!formContainer || !projectId) return;

    const values: Record<string, any> = {};
    const inputs = formContainer.querySelectorAll('input, textarea, select');

    inputs.forEach((input: any) => {
      if (input.name) {
        values[input.name] = input.value;
      }
    });

    try {
      await postData(buildEndpoint(`/api/form-schema/${projectId}/${productoNum}`), { valores_usuario: values });
      console.log(`[F4] Valores guardados para ${productoNum}`);
    } catch (err) {
      console.error('[F4] Error saving form values:', err);
    }
  }

  /**
   * Muestra error si no se puede cargar el formulario dinámico
   */
  private _showErrorForm(): void {
    const formContainer = document.getElementById('form-step6');
    if (formContainer) {
      formContainer.innerHTML = `
        <div class="bg-red-50 p-4 rounded-lg border border-red-200">
          <p class="text-red-800">❌ Error al cargar el formulario dinámico</p>
          <p class="text-red-600 text-sm mt-1">Intenta regenerar el formulario o contacta soporte.</p>
          <button id="btn-retry-form" class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Reintentar</button>
        </div>
      `;

      const retryBtn = document.getElementById('btn-retry-form');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this._renderDynamicForm());
      }
    }
  }

  private _escapeHtml(str: string): string {
    if (!str) return '';
    return str.replace(/[&<>]/g, (m) => {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  // ==============================================
  // MÉTODOS EXISTENTES (adaptados)
  // ==============================================

  private _cacheSubDom(): void {
    this._subDom.productIndicators = this._container.querySelector('#product-indicators') ?? undefined;
    this._subDom.productElementLabel = this._container.querySelector('#product-element-label') ?? undefined;
    this._subDom.productTitle = this._container.querySelector('#product-title') ?? undefined;
    this._subDom.productCounter = this._container.querySelector('#product-counter') ?? undefined;
    this._subDom.productNotStarted = this._container.querySelector('#product-not-started') ?? undefined;
    this._subDom.productPreviewArea = this._container.querySelector('#product-preview-area') ?? undefined;
    this._subDom.productDocumentPreview = this._container.querySelector('#product-document-preview') ?? undefined;
    this._subDom.productGenerateArea = this._container.querySelector('#product-generate-area') ?? undefined;
    this._subDom.btnApproveProduct = this._container.querySelector('#btn-approve-product') ?? undefined;
    this._subDom.btnPrintProduct = this._container.querySelector('#btn-print-product') ?? undefined;
    this._subDom.productionFormContainer = this._container.querySelector('#production-form-container') ?? undefined;
  }

  private _renderProductIndicators(): void {
    if (!this._subDom.productIndicators) return;
    this._subDom.productIndicators.innerHTML = PRODUCTS.map((p, i) => {
      const approved = this._approvedProducts.has(i);
      const hasWarning = this._validationWarnings.has(i);
      const isCurrent = i === this._currentProductIndex;
      const cls = approved
        ? hasWarning
          ? 'bg-yellow-100 text-yellow-800 border border-yellow-400 cursor-pointer hover:bg-yellow-200'
          : 'bg-green-100 text-green-800 border border-green-300 cursor-pointer hover:bg-green-200'
        : isCurrent
          ? 'bg-blue-100 text-blue-800 border border-blue-500 font-semibold cursor-pointer hover:bg-blue-200'
          : 'bg-gray-100 text-gray-400 border border-gray-200 opacity-50';
      const icon = approved ? (hasWarning ? '⚠' : '✓') : String(i + 1);
      return `<span data-index="${i}" class="product-tab px-2 py-1 rounded text-xs transition-colors ${cls}" title="${p.label}${hasWarning ? ' — Requiere revisión manual' : ''}">
        ${icon} ${p.label.split(' ').slice(0, 2).join(' ')}
      </span>`;
    }).join('');

    const tabs = this._subDom.productIndicators.querySelectorAll('.product-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const index = parseInt(target.getAttribute('data-index') || '-1', 10);
        if (index >= 0 && this._approvedProducts.has(index)) {
          this._currentProductIndex = index;
          this._config.promptId = PRODUCTS[index].promptId;
          this._updateProductHeader();
          this._renderProductIndicators();
          const prod = this._approvedProducts.get(index);
          if (prod) this._showProductPreview(prod.content);
        }
      });
    });
  }

  private async _cargarProductosPrevios(): Promise<Record<string, any>> {
    const projectId = wizardStore.getState().projectId;
    if (!projectId) return {};
    try {
      const res = await getData<{ productos: F4ProductoBD[] }>(
        buildEndpoint(ENDPOINTS.wizard.fase4Productos(projectId))
      );
      const productos = res.data?.productos ?? [];
      const previos: Record<string, any> = {};
      for (const p of productos) {
        if (p.datos_producto) {
          previos[p.producto] = p.datos_producto;
        } else if (p.documento_final) {
          previos[p.producto] = { documento_final: p.documento_final };
        }
      }
      return previos;
    } catch (err) {
      console.warn('[F4] No se pudieron cargar productos previos:', err);
      return {};
    }
  }

  private async _loadProductsFromBD(projectId: string): Promise<void> {
    try {
      const res = await getData<{ productos: F4ProductoBD[] }>(
        buildEndpoint(ENDPOINTS.wizard.fase4Productos(projectId))
      );
      const productos = res.data?.productos ?? [];
      if (productos.length === 0) return;

      let maxApprovedIndex = -1;
      for (const p of productos) {
        const idx = PRODUCTS.findIndex(prod => prod.productCode === p.producto);
        if (idx < 0) continue;
        if (!p.documento_final) continue;
        this._approvedProducts.set(idx, {
          content: p.documento_final,
          documentId: p.job_id ?? '',
        });
        if (p.validacion_estado === 'revision_humana') {
          this._validationWarnings.add(idx);
        }
        if (idx > maxApprovedIndex) maxApprovedIndex = idx;
      }
      if (maxApprovedIndex >= 0) {
        this._currentProductIndex = maxApprovedIndex;
        console.log(`[F4] Restaurados ${this._approvedProducts.size} producto(s) desde BD.`);
      }
    } catch (err) {
      console.warn('[F4] No se pudieron cargar productos desde BD:', err);
    }
  }

  private _updateProductHeader(): void {
    const product = PRODUCTS[this._currentProductIndex];
    if (!product) return;
    if (this._subDom.productElementLabel) this._subDom.productElementLabel.textContent = product.elementoEC;
    if (this._subDom.productTitle) this._subDom.productTitle.textContent = `Producto ${this._currentProductIndex + 1}: ${product.label}`;
    if (this._subDom.productCounter) this._subDom.productCounter.textContent = `${this._approvedProducts.size} / ${PRODUCTS.length}`;
  }

  private _showProductPreview(content: string): void {
    if (this._subDom.productNotStarted) this._subDom.productNotStarted.classList.add('hidden');
    if (this._subDom.productGenerateArea) this._subDom.productGenerateArea.classList.add('hidden');
    if (this._subDom.productPreviewArea) this._subDom.productPreviewArea.classList.remove('hidden');
    if (this._subDom.productDocumentPreview) {
      this._subDom.productDocumentPreview.innerHTML = renderMarkdown(content);
    }
    if (this._subDom.btnApproveProduct) {
      this._subDom.btnApproveProduct.style.display = 'none';
    }

    // Always render the form so the user can edit values and regenerate
    if (this._subDom.productionFormContainer) {
      this._subDom.productionFormContainer.classList.remove('hidden');
    }
    void this._renderDynamicForm();

    // Botón de aprobar
    if (this._subDom.productPreviewArea) {
      let approveBtn = this._subDom.productPreviewArea.querySelector('#btn-approve-continue') as HTMLButtonElement;
      if (!approveBtn) {
        approveBtn = document.createElement('button');
        approveBtn.id = 'btn-approve-continue';
        approveBtn.className = 'mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg w-full transition-colors';
        approveBtn.innerText = '✨ Aprobar y Continuar al Siguiente Producto';
        this._subDom.productPreviewArea.appendChild(approveBtn);
      }
      const newApproveBtn = approveBtn.cloneNode(true) as HTMLButtonElement;
      approveBtn.parentNode?.replaceChild(newApproveBtn, approveBtn);
      newApproveBtn.addEventListener('click', () => {
        if (this._currentProductIndex < PRODUCTS.length - 1) {
          this._currentProductIndex++;
          this._config.promptId = PRODUCTS[this._currentProductIndex].promptId;
          this._updateProductHeader();
          this._showGenerateArea();
          this._renderProductIndicators();
        } else {
          alert('¡Todos los productos han sido generados y aprobados!');
          this._approveCurrentProduct();
        }
      });
    }
  }

  private _showGenerateArea(): void {
    console.log('[F4] _showGenerateArea Front called');
    this._schemaSubscription?.cancel();
    this._schemaSubscription = null;
    if (this._subDom.productNotStarted) this._subDom.productNotStarted.classList.add('hidden');
    if (this._subDom.productPreviewArea) this._subDom.productPreviewArea.classList.add('hidden');
    if (this._subDom.productGenerateArea) this._subDom.productGenerateArea.classList.remove('hidden');
    if (this._subDom.productDocumentPreview) {
      this._subDom.productDocumentPreview.innerHTML = '';
    }
    if (this._subDom.productionFormContainer) {
      this._subDom.productionFormContainer.classList.remove('hidden');
    }
    this._renderDynamicForm();
  }

  private _waitForJobComplete(jobId: string, onProgress?: (step: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      subscribeToJob(
        jobId,
        () => { resolve(); },
        (err) => { reject(new Error(err)); },
        (job) => { if (job.progress?.currentStep) onProgress?.(job.progress.currentStep); }
      );
    });
  }

  private async _generateCurrentProduct(): Promise<void> {
    const product = PRODUCTS[this._currentProductIndex];
    if (!product) return;

    const state = wizardStore.getState();
    if (!state.projectId) { showError('No hay proyecto activo.'); return; }

    await this._saveFormValues();

    const productoNum = product.productCode;
    const schemaData = await this._loadFormSchema(productoNum);
    const userInputs = { ...(schemaData?.valores_usuario || this._sharedFormData), _producto: productoNum };

    let stepId = state.steps[STEP_NUMBER]?.stepId;
    if (!stepId) {
      try {
        const res = await postData<{ stepId: string }>(
          buildEndpoint(ENDPOINTS.wizard.saveStep),
          { projectId: state.projectId, stepNumber: STEP_NUMBER, inputData: userInputs }
        );
        if (res.data?.stepId) {
          stepId = res.data.stepId;
          wizardStore.setStepId(STEP_NUMBER, stepId);
        }
      } catch { /* continuar */ }
    }
    if (!stepId) { showError('No se pudo registrar el paso.'); return; }

    this._setLoading(true);
    showLoading(`⏳ Generando ${product.label}...`);

    try {
      const context = wizardStore.buildContext(STEP_NUMBER) as any;

      // ── P3: iteración módulo a módulo ──────────────────────────────────
      if (productoNum === 'P3') {
        const valores = schemaData?.valores_usuario || {};
        const moduloKeys = Object.keys(valores)
          .filter(k => k.startsWith('guion_unidad_'))
          .sort();

        if (moduloKeys.length === 0) {
          showError('No hay módulos en el formulario de P3.');
          this._setLoading(false);
          hideLoading();
          return;
        }

        // Construir mapa de fieldName → nombre real desde schema_json
        const labelMap: Record<string, string> = {};
        const schemaFields: any[] = schemaData?.schema?.fields || [];
        for (const field of schemaFields) {
          if (field.name && field.label) {
            const rawLabel: string = field.label;
            const nombre = rawLabel
              .replace(/^(Configuración de Producción|Ficha Técnica de Producción):\s*/i, '')
              .trim();
            labelMap[field.name] = nombre || rawLabel;
          }
        }

        const productosPreviosP3 = await this._cargarProductosPrevios();

        for (let i = 0; i < moduloKeys.length; i++) {
          const key = moduloKeys[i];
          const moduloNum = parseInt(key.replace('guion_unidad_', ''), 10);
          const nombreVideo = labelMap[key] || `Módulo ${moduloNum}`;
          showLoading(`⏳ Generando Guiones P3... Módulo ${i + 1}/${moduloKeys.length}: ${nombreVideo}`);

          const res = await postData<{ jobId: string }>(
            buildEndpoint(ENDPOINTS.wizard.generateAsync),
            {
              projectId: state.projectId,
              stepId,
              phaseId: 'F4',
              promptId: 'F4_P3_GENERATE_DOCUMENT' as PromptId,
              context,
              userInputs: {
                [key]: valores[key],
                _modulo_actual: moduloNum,
                _nombre_video: nombreVideo,
                _producto: 'P3',
                productos_previos: productosPreviosP3,
              },
            }
          );

          if (!res.data?.jobId) throw new Error(`Sin jobId para módulo ${moduloNum}`);

          await this._waitForJobComplete(res.data.jobId, (step) => {
            showLoading(`⏳ Módulo ${i + 1}/${moduloKeys.length}: ${step}`);
          });
        }

        // Todos los módulos completados — cargar documento ensamblado desde BD
        const idx = this._currentProductIndex;
        await this._loadProductsFromBD(state.projectId!);
        this._currentProductIndex = idx;
        const prod = this._approvedProducts.get(idx);
        if (prod) {
          this._showProductPreview(prod.content);
          this._renderProductIndicators();
        }
        this._setLoading(false);
        hideLoading();
        return;
      }
      // ── P2: iteración módulo a módulo ──────────────────────────────────
      if (productoNum === 'P2') {
        const valores = schemaData?.valores_usuario || {};
        const moduloKeys = Object.keys(valores)
          .filter(k => k.startsWith('presentacion_unidad_'))
          .sort();

        if (moduloKeys.length === 0) {
          showError('No hay módulos en el formulario de P2.');
          this._setLoading(false);
          hideLoading();
          return;
        }

        // Construir mapa de fieldName → nombre real desde schema_json
        const labelMap: Record<string, string> = {};
        const schemaFields: any[] = schemaData?.schema?.fields || [];
        for (const field of schemaFields) {
          if (field.name && field.label) {
            const rawLabel: string = field.label;
            const nombre = rawLabel
              .replace(/^Presentación:\s*/i, '')
              .trim();
            labelMap[field.name] = nombre || rawLabel;
          }
        }

        const productosPreviosP2 = await this._cargarProductosPrevios();

        for (let i = 0; i < moduloKeys.length; i++) {
          const key = moduloKeys[i];
          const moduloNum = parseInt(key.replace('presentacion_unidad_', ''), 10);
          const nombreModulo = labelMap[key] || `Módulo ${moduloNum}`;
          showLoading(`⏳ Generando Presentación P2... Módulo ${i + 1}/${moduloKeys.length}: ${nombreModulo}`);

          const res = await postData<{ jobId: string }>(
            buildEndpoint(ENDPOINTS.wizard.generateAsync),
            {
              projectId: state.projectId,
              stepId,
              phaseId: 'F4',
              promptId: 'F4_P2_GENERATE_DOCUMENT' as PromptId,
              context,
              userInputs: {
                [key]: valores[key],
                _modulo_actual: moduloNum,
                _nombre_modulo: nombreModulo,
                _producto: 'P2',
                productos_previos: productosPreviosP2,
              },
            }
          );

          if (!res.data?.jobId) throw new Error(`Sin jobId para módulo ${moduloNum}`);

          await this._waitForJobComplete(res.data.jobId, (step) => {
            showLoading(`⏳ Módulo ${i + 1}/${moduloKeys.length}: ${step}`);
          });
        }

        // Todos los módulos completados — cargar documento ensamblado desde BD
        const idx = this._currentProductIndex;
        await this._loadProductsFromBD(state.projectId!);
        this._currentProductIndex = idx;
        const prod = this._approvedProducts.get(idx);
        if (prod) {
          this._showProductPreview(prod.content);
          this._renderProductIndicators();
        }
        this._setLoading(false);
        hideLoading();
        return;
      }
      // ── P5: iteración módulo a módulo ──────────────────────────────────
      if (productoNum === 'P5') {
        const valores = schemaData?.valores_usuario || {};
        const moduloKeys = Object.keys(valores)
          .filter(k => k.startsWith('actividad_unidad_'))
          .sort();

        if (moduloKeys.length === 0) {
          showError('No hay actividades en el formulario de P5.');
          this._setLoading(false);
          hideLoading();
          return;
        }

        // Construir mapa de fieldName → nombre real
        const labelMap: Record<string, string> = {};
        const schemaFields: any[] = schemaData?.schema?.fields || [];
        for (const field of schemaFields) {
          if (field.name && field.label) {
            const rawLabel: string = field.label;
            const nombre = rawLabel
              .replace(/^(Configuración de Actividad|Actividad):\s*/i, '')
              .trim();
            labelMap[field.name] = nombre || rawLabel;
          }
        }

        const productosPreviosP5 = await this._cargarProductosPrevios();

        for (let i = 0; i < moduloKeys.length; i++) {
          const key = moduloKeys[i];
          const moduloNum = parseInt(key.replace('actividad_unidad_', ''), 10);
          const nombreActividad = labelMap[key] || `Actividad ${moduloNum}`;
          showLoading(`⏳ Generando Guías P5... Unidad ${i + 1}/${moduloKeys.length}: ${nombreActividad}`);

          const res = await postData<{ jobId: string }>(
            buildEndpoint(ENDPOINTS.wizard.generateAsync),
            {
              projectId: state.projectId,
              stepId,
              phaseId: 'F4',
              promptId: 'F4_P5_GENERATE_DOCUMENT' as PromptId,
              context,
              userInputs: {
                [key]: valores[key],
                _modulo_actual: moduloNum,
                _nombre_actividad: nombreActividad,
                _producto: 'P5',
                productos_previos: productosPreviosP5,
              },
            }
          );

          if (!res.data?.jobId) throw new Error(`Sin jobId para actividad ${moduloNum}`);

          await this._waitForJobComplete(res.data.jobId, (step) => {
            showLoading(`⏳ Unidad ${i + 1}/${moduloKeys.length}: ${step}`);
          });
        }

        // Finalizar P5
        const idx = this._currentProductIndex;
        await this._loadProductsFromBD(state.projectId!);
        this._currentProductIndex = idx;
        const prod = this._approvedProducts.get(idx);
        if (prod) {
          this._showProductPreview(prod.content);
          this._renderProductIndicators();
        }
        this._setLoading(false);
        hideLoading();
        return;
      }
      // ── P6: iteración módulo a módulo ──────────────────────────────────
      if (productoNum === 'P6') {
        const valores = schemaData?.valores_usuario || {};
        const moduloKeys = Object.keys(valores)
          .filter(k => k.startsWith('sesion_unidad_'))
          .sort();

        if (moduloKeys.length === 0) {
          showError('No hay sesiones en el formulario de P6.');
          this._setLoading(false);
          hideLoading();
          return;
        }

        // Construir mapa de fieldName → nombre real
        const labelMap: Record<string, string> = {};
        const schemaFields: any[] = schemaData?.schema?.fields || [];
        for (const field of schemaFields) {
          if (field.name && field.label) {
            const rawLabel: string = field.label;
            const nombre = rawLabel
              .replace(/^(Programación de Sesión|Sesión):\s*/i, '')
              .trim();
            labelMap[field.name] = nombre || rawLabel;
          }
        }

        const productosPreviosP6 = await this._cargarProductosPrevios();

        for (let i = 0; i < moduloKeys.length; i++) {
          const key = moduloKeys[i];
          const moduloNum = parseInt(key.replace('sesion_unidad_', ''), 10);
          const nombreSesion = labelMap[key] || `Sesión ${moduloNum}`;
          showLoading(`⏳ Generando Calendario P6... Sesión ${i + 1}/${moduloKeys.length}: ${nombreSesion}`);

          const res = await postData<{ jobId: string }>(
            buildEndpoint(ENDPOINTS.wizard.generateAsync),
            {
              projectId: state.projectId,
              stepId,
              phaseId: 'F4',
              promptId: 'F4_P6_GENERATE_DOCUMENT' as PromptId,
              context,
              userInputs: {
                [key]: valores[key],
                _modulo_actual: moduloNum,
                _nombre_sesion: nombreSesion,
                _producto: 'P6',
                productos_previos: productosPreviosP6,
              },
            }
          );

          if (!res.data?.jobId) throw new Error(`Sin jobId para sesión ${moduloNum}`);

          await this._waitForJobComplete(res.data.jobId, (step) => {
            showLoading(`⏳ Sesión ${i + 1}/${moduloKeys.length}: ${step}`);
          });
        }

        // Finalizar P6
        const idx = this._currentProductIndex;
        await this._loadProductsFromBD(state.projectId!);
        this._currentProductIndex = idx;
        const prod = this._approvedProducts.get(idx);
        if (prod) {
          this._showProductPreview(prod.content);
          this._renderProductIndicators();
        }
        this._setLoading(false);
        hideLoading();
        return;
      }
      // ── P7: iteración módulo a módulo ──────────────────────────────────
      if (productoNum === 'P7') {
        const valores = schemaData?.valores_usuario || {};
        const moduloKeys = Object.keys(valores)
          .filter(k => k.startsWith('informacion_unidad_'))
          .sort();

        if (moduloKeys.length === 0) {
          showError('No hay información en el formulario de P7.');
          this._setLoading(false);
          hideLoading();
          return;
        }

        // Construir mapa de fieldName → nombre real
        const labelMap: Record<string, string> = {};
        const schemaFields: any[] = schemaData?.schema?.fields || [];
        for (const field of schemaFields) {
          if (field.name && field.label) {
            const rawLabel: string = field.label;
            const nombre = rawLabel
              .replace(/^(Información General|Tema):\s*/i, '')
              .trim();
            labelMap[field.name] = nombre || rawLabel;
          }
        }

        const productosPreviosP7 = await this._cargarProductosPrevios();

        for (let i = 0; i < moduloKeys.length; i++) {
          const key = moduloKeys[i];
          const moduloNum = parseInt(key.replace('informacion_unidad_', ''), 10);
          const nombreTema = labelMap[key] || `Tema ${moduloNum}`;
          showLoading(`⏳ Generando Información P7... Tema ${i + 1}/${moduloKeys.length}: ${nombreTema}`);

          const res = await postData<{ jobId: string }>(
            buildEndpoint(ENDPOINTS.wizard.generateAsync),
            {
              projectId: state.projectId,
              stepId,
              phaseId: 'F4',
              promptId: 'F4_P7_GENERATE_DOCUMENT' as PromptId,
              context,
              userInputs: {
                [key]: valores[key],
                _modulo_actual: moduloNum,
                _nombre_tema: nombreTema,
                _producto: 'P7',
                productos_previos: productosPreviosP7,
              },
            }
          );

          if (!res.data?.jobId) throw new Error(`Sin jobId para tema ${moduloNum}`);

          await this._waitForJobComplete(res.data.jobId, (step) => {
            showLoading(`⏳ Tema ${i + 1}/${moduloKeys.length}: ${step}`);
          });
        }

        // Finalizar P7
        const idx = this._currentProductIndex;
        await this._loadProductsFromBD(state.projectId!);
        this._currentProductIndex = idx;
        const prod = this._approvedProducts.get(idx);
        if (prod) {
          this._showProductPreview(prod.content);
          this._renderProductIndicators();
        }
        this._setLoading(false);
        hideLoading();
        return;
      }
      // ── P8: iteración módulo a módulo ──────────────────────────────────
      if (productoNum === 'P8') {
        const valores = schemaData?.valores_usuario || {};
        const moduloKeys = Object.keys(valores)
          .filter(k => k.startsWith('cronograma_unidad_'))
          .sort();

        if (moduloKeys.length === 0) {
          showError('No hay cronograma en el formulario de P8.');
          this._setLoading(false);
          hideLoading();
          return;
        }

        // Construir mapa de fieldName → nombre real
        const labelMap: Record<string, string> = {};
        const schemaFields: any[] = schemaData?.schema?.fields || [];
        for (const field of schemaFields) {
          if (field.name && field.label) {
            const rawLabel: string = field.label;
            const nombre = rawLabel
              .replace(/^(Cronograma de Módulo|Desarrollo):\s*/i, '')
              .trim();
            labelMap[field.name] = nombre || rawLabel;
          }
        }

        const productosPreviosP8 = await this._cargarProductosPrevios();

        for (let i = 0; i < moduloKeys.length; i++) {
          const key = moduloKeys[i];
          const moduloNum = parseInt(key.replace('cronograma_unidad_', ''), 10);
          const nombreModulo = labelMap[key] || `Módulo ${moduloNum}`;
          showLoading(`⏳ Generando Cronograma P8... Módulo ${i + 1}/${moduloKeys.length}: ${nombreModulo}`);

          const res = await postData<{ jobId: string }>(
            buildEndpoint(ENDPOINTS.wizard.generateAsync),
            {
              projectId: state.projectId,
              stepId,
              phaseId: 'F4',
              promptId: 'F4_P8_GENERATE_DOCUMENT' as PromptId,
              context,
              userInputs: {
                [key]: valores[key],
                _modulo_actual: moduloNum,
                _nombre_modulo: nombreModulo,
                _producto: 'P8',
                productos_previos: productosPreviosP8,
              },
            }
          );

          if (!res.data?.jobId) throw new Error(`Sin jobId para cronograma ${moduloNum}`);

          await this._waitForJobComplete(res.data.jobId, (step) => {
            showLoading(`⏳ Módulo ${i + 1}/${moduloKeys.length}: ${step}`);
          });
        }

        // Finalizar P8
        const idx = this._currentProductIndex;
        await this._loadProductsFromBD(state.projectId!);
        this._currentProductIndex = idx;
        const prod = this._approvedProducts.get(idx);
        if (prod) {
          this._showProductPreview(prod.content);
          this._renderProductIndicators();
        }
        this._setLoading(false);
        hideLoading();
        return;
      }

      // ── Resto de productos: pipeline único ─────────────────────────────
      const res = await postData<{ jobId: string; status: string }>(
        buildEndpoint(ENDPOINTS.wizard.generateAsync),
        {
          projectId: state.projectId,
          stepId,
          phaseId: 'F4',
          promptId: product.promptId,
          context,
          userInputs,
        }
      );

      if (res.data && res.data.jobId) {
        const jobId = res.data.jobId;
        this._jobSubscription?.cancel();
        this._jobSubscription = subscribeToJob(
          jobId,
          async (result) => {
            const idx = this._currentProductIndex;
            if (state.projectId) {
              await this._loadProductsFromBD(state.projectId);
            }
            this._currentProductIndex = idx;
            const prod = this._approvedProducts.get(idx);
            const content = prod ? prod.content : (result.content as string);
            if (!prod) {
              this._approvedProducts.set(idx, {
                content: result.content as string,
                documentId: result.documentId as string,
              });
            }
            const meta = result as unknown as Record<string, unknown>;
            if (meta.validacion_estado === 'revision_humana') {
              this._validationWarnings.add(idx);
            }
            this._showProductPreview(content);
            this._renderProductIndicators();
            this._setLoading(false);
            hideLoading();
          },
          (error) => {
            this._setLoading(false);
            hideLoading();
            showError(error);
          },
          (job) => {
            if (job.progress?.currentStep) {
              showLoading(`⏳ Generando ${product.label}... (${job.progress.currentStep})`);
            }
          }
        );
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al encolar producto');
      this._setLoading(false);
      hideLoading();
    }
  }

  private _approveCurrentProduct(): void {
    if (this._currentProductIndex < PRODUCTS.length - 1) {
      this._currentProductIndex++;
      this._config.promptId = PRODUCTS[this._currentProductIndex].promptId;
      this._updateProductHeader();
      this._showGenerateArea();
      this._renderProductIndicators();
    } else {
      const allContent = PRODUCTS.map((p, i) => {
        const prod = this._approvedProducts.get(i);
        return prod ? `---\n# PRODUCTO ${i + 1}: ${p.label}\n\n${prod.content}` : '';
      }).filter(Boolean).join('\n\n');
      wizardStore.setStepDocument(STEP_NUMBER, allContent, 'multi-product');
      if (this._approvedProducts.size === PRODUCTS.length) {
        wizardStore.setStepStatus(STEP_NUMBER, 'completed');
        // Persist completion to DB so resumeProject() advances past step 5 on next load
        const stepId = wizardStore.getState().steps[STEP_NUMBER]?.stepId;
        if (stepId) {
          postData(buildEndpoint(ENDPOINTS.wizard.completeStep), { stepId }).catch(() => { });
        }
      }
      this._renderProductIndicators();
      if (this._subDom.productCounter) {
        this._subDom.productCounter.textContent = `${PRODUCTS.length} / ${PRODUCTS.length} ✓`;
      }
      if (this._subDom.productGenerateArea) {
        this._subDom.productGenerateArea.classList.add('hidden');
      }
      if (this._subDom.productPreviewArea) {
        this._subDom.productPreviewArea.classList.add('hidden');
      }
    }
  }

  override _bindEvents(): void {
    // Use the actual form element (form-step6), not this._dom.form which looks for
    // form-step5 (stepNumber=5) and would be null, causing e.preventDefault() to be skipped.
    const form = this._container.querySelector<HTMLFormElement>('#form-step6');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this._generateCurrentProduct();
    });
    this._dom.btnSubmit?.addEventListener('click', (e) => {
      e.preventDefault();
      void this._generateCurrentProduct();
    });
  }

  private _bindSubDomEvents(): void {
    this._subDom.btnApproveProduct?.addEventListener('click', () => {
      this._approveCurrentProduct();
    });
    this._dom.btnCopy?.addEventListener('click', () => {
      const prod = this._approvedProducts.get(this._currentProductIndex);
      if (prod) {
        navigator.clipboard.writeText(prod.content).catch(() => showError('No se pudo copiar.'));
      }
    });
    this._subDom.btnPrintProduct?.addEventListener('click', () => {
      const prod = this._approvedProducts.get(this._currentProductIndex);
      if (prod) {
        const productData = PRODUCTS[this._currentProductIndex];
        printDocument(prod.content, productData?.label ?? 'Documento');
      }
    });
  }

  protected override async _generateDocumentAsync(): Promise<void> {
    await this._generateCurrentProduct();
  }

  override _setLoading(loading: boolean, text?: string): void {
    if (!this._dom.btnSubmit) return;
    this._dom.btnSubmit.disabled = loading;
    const product = PRODUCTS[this._currentProductIndex];
    if (loading) {
      this._dom.btnSubmit.textContent = text ?? `⏳ Generando ${product?.label ?? 'Producto'}...`;
    } else {
      this._dom.btnSubmit.textContent = '✨ Generar Producto';
    }
  }

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container);
    this._cacheSubDom();

    const stepData = wizardStore.getState().steps[STEP_NUMBER];
    const formCache = wizardStore.getState().formCache || {};
    this._sharedFormData = { ...stepData?.inputData, ...formCache };

    const projectId = wizardStore.getState().projectId;
    if (projectId) {
      await this._loadProductsFromBD(projectId);
    }

    this._config.promptId = PRODUCTS[this._currentProductIndex].promptId;

    this._bindSubDomEvents();
    this._updateProductHeader();
    this._renderProductIndicators();

    const existingProduct = this._approvedProducts.get(this._currentProductIndex);
    if (existingProduct) {
      this._showProductPreview(existingProduct.content);
    } else {
      this._showGenerateArea();
    }
  }
}

const _instance = new Step5ProductionController();

export const Step5Production = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
