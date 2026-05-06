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
  job_id: string | null;
}

const STEP_NUMBER = 6;

const PRODUCTS: Array<{ promptId: PromptId; label: string; elementoEC: string }> = [
  { promptId: 'F4_P1' as PromptId, label: '1 Instrumentos de Evaluación', elementoEC: 'Producto #1' },
  { promptId: 'F4_P2' as PromptId, label: '2 Presentación Electrónica', elementoEC: 'Producto #2' },
  { promptId: 'F4_P3' as PromptId, label: '3 Guiones Multimedia', elementoEC: 'Producto #3' },
  { promptId: 'F4_P4' as PromptId, label: '4 Manual del Participante', elementoEC: 'Producto #4' },
  { promptId: 'F4_P5' as PromptId, label: '5 Guías de Actividades', elementoEC: 'Producto #5' },
  { promptId: 'F4_P6' as PromptId, label: '6 Calendario General', elementoEC: 'Producto #6' },
  { promptId: 'F4_P7' as PromptId, label: '7 Documento de Información', elementoEC: 'Producto #7' },
  { promptId: 'F4_P8' as PromptId, label: '8 Cronograma de Desarrollo', elementoEC: 'Producto #8' },
];

class Step5ProductionController extends BaseStep {
  private _currentProductIndex = 0;
  private _approvedProducts: Map<number, { content: string; documentId: string }> = new Map();
  private _sharedFormData: Record<string, unknown> = {};
  private _validationWarnings: Set<number> = new Set();
  private _currentSchema: any = null;
  private _loadedProductId: string | null = null;
  private _schemaRetryCount = 0;
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

    console.log(`[FLOW-FE] Handshake iniciado. Producto solicitado: ${producto}`);
    console.log(`[DEBUG-F4-DATA] _loadFormSchema para ${producto}. Estado de wizardStore:`, wizardStore.getState());
    
    const url = buildEndpoint(`/api/form-schema/${projectId}/${producto}`);
    console.log('[F4] Fetching form schema from:', url);

    try {
      const result = await getData<any>(url) as any;
      console.log('[F4] Response data:', result);

      if (result.status === 'ready') {
        console.log('[DEBUG-F4-RAW] Schema raw data:', result.schema);
        
        // Si el schema es un string, lo limpiamos y parseamos
        if (typeof result.schema === 'string') {
          try {
            result.schema = this._cleanAndParseJSON(result.schema);
          } catch (e) {
            console.error('[F4] Error parseando schema sanitizado:', e);
            this._showErrorForm();
            return null;
          }
        }

        this._currentSchema = result;
        return result;
      }

      if (result.status === 'error') {
        this._showMissingDataError(result.message || 'Faltan datos de la Fase 3 para generar este formulario');
        return null;
      }

      if (result.status === 'generating' && result.jobId) {
        this._showGeneratingStatus();
        console.log(`[REALTIME-DEBUG] Suscrito al Job ID: ${result.jobId}`);
        return new Promise<any>((resolve) => {
          let resolved = false;
          const timeout = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            console.warn(`[DEBUG-F4-DATA] Timeout de 30s alcanzado esperando esquema para ${producto}`);
            this._schemaSubscription?.cancel();
            this._showRetryForm(producto);
            resolve(null);
          }, 30000);

          this._schemaSubscription = subscribeToJob(
            result.jobId,
            async (jobData) => {
              if (resolved) return;
              console.log(`[REALTIME-LOG] Cambio de estado en Job ${result.jobId}: ${jobData?.status || 'desconocido'}`);
              try {
                const ready = await getData<any>(url) as any;
                if (ready.status === 'ready') {
                  clearTimeout(timeout);
                  resolved = true;
                  this._currentSchema = ready;
                  resolve(this._currentSchema);
                }
              } catch {
                // Continuar esperando o fallar en el siguiente poll
              }
            },
            (error) => {
              if (resolved) return;
              clearTimeout(timeout);
              resolved = true;
              console.error('[F4] Schema generation failed:', error);
              this._showErrorForm();
              resolve(null);
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
   * Muestra estado de generación del formulario
   */
  private _showGeneratingStatus(): void {
    const formContainer = document.getElementById('form-step6');
    if (formContainer) {
      formContainer.innerHTML = `
        <div class="bg-purple-50 p-6 rounded-lg text-center border border-purple-200">
          <div class="text-4xl mb-3">🤖</div>
          <p class="text-purple-800 font-medium">Generando formulario inteligente...</p>
          <p class="text-purple-600 text-sm mt-2">La IA está analizando tu curso para crear el formulario adecuado.</p>
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
  }

  /**
   * Renderiza el formulario usando el esquema generado por IA
   * NO hay código hardcodeado - todo viene del backend
   */
  private async _renderDynamicForm(): Promise<void> {
    console.log('[F4] _renderDynamicForm called for index:', this._currentProductIndex);
    const product = PRODUCTS[this._currentProductIndex];
    const productoNum = product.promptId.replace('F4_', '');
    const formContainer = document.getElementById('form-step6');

    if (!formContainer) return;

    console.log(`[F4] Cargando formulario dinámico para ${productoNum}`);

    // Mostrar loading
    formContainer.innerHTML = `
      <div class="bg-gray-50 p-4 rounded-lg text-center">
        <p class="text-gray-500">🔄 Cargando formulario inteligente...</p>
      </div>
    `;

    const { schema, valores_sugeridos, valores_usuario } = this._currentSchema || {};
    const currentProductInSchema = this._loadedProductId;

    // GUARD: Si ya tenemos el esquema de este producto, no lo recargamos
    if (this._currentSchema && currentProductInSchema === productoNum && schema?.fields?.length) {
      console.log(`[DEBUG-F4-DATA] Usando esquema en memoria para ${productoNum}`);
      this._schemaRetryCount = 0; // Reset al tener éxito
    } else {
      if (this._schemaRetryCount >= 2) {
        console.error(`[DEBUG-F4-DATA] Límite de reintentos alcanzado para ${productoNum}`);
        this._showMissingDataError('No se pudo generar un formulario válido después de varios intentos. Contacta con soporte.');
        return;
      }

      console.log(`[DEBUG-F4-DATA] Cargando nuevo esquema para ${productoNum} (Intento ${this._schemaRetryCount + 1})`);
      this._schemaRetryCount++;
      
      const schemaData = await this._loadFormSchema(productoNum);

      if (!schemaData || schemaData.status !== 'ready') {
        this._showErrorForm();
        return;
      }
      this._loadedProductId = productoNum;
    }

    const { schema: finalSchema, valores_sugeridos: suggested, valores_usuario: user } = this._currentSchema;
    
    try {
      const fields = finalSchema?.fields || [];
      console.log(`[RENDER-CHECK] Iniciando construcción de HTML con ${fields.length} campos provenientes del Assembler.`);

      if (fields.length === 0) {
        console.error('[DEBUG-F4-DATA] El esquema no contiene campos:', this._currentSchema);
        this._showErrorForm();
        return;
      }

      // Construir HTML dinámicamente desde el esquema
      let html = `
        <div class="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
          <p class="text-sm text-blue-800">${this._escapeHtml(finalSchema.description || 'Confirma los datos para generar el producto:')}</p>
        </div>
      `;

      for (const field of fields) {
        const savedValue = user?.[field.name];
        const suggestedValue = suggested?.[field.name] || field.suggested_value || '';
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
    } catch (err) {
      console.error('[DEBUG-F4-DATA] Error fatal renderizando formulario:', err);
      console.error('[DEBUG-F4-DATA] Objeto schema recibido:', JSON.stringify(this._currentSchema, null, 2));
      this._showErrorForm();
    }
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
    const productoNum = PRODUCTS[this._currentProductIndex].promptId.replace('F4_', '');
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
        retryBtn.addEventListener('click', () => {
          console.warn('[F4] Forzando reset de esquema para reintento...');
          this._currentSchema = null;
          this._loadedProductId = null;
          this._schemaRetryCount = 0;
          this._renderDynamicForm();
        });
      }
    }
  }

  /**
   * Muestra botón de reintento forzado por timeout
   */
  private _showRetryForm(productoNum: string): void {
    const formContainer = document.getElementById('form-step6');
    if (formContainer) {
      formContainer.innerHTML = `
        <div class="bg-amber-50 p-6 rounded-lg text-center border border-amber-200">
          <div class="text-4xl mb-3">⏳</div>
          <p class="text-amber-800 font-medium">La generación está tardando demasiado...</p>
          <p class="text-amber-600 text-sm mt-2">Es posible que el proceso se haya detenido.</p>
          <button id="btn-force-refresh" class="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-colors">
            🔄 Forzar Nuevo Intento
          </button>
        </div>
      `;

      const forceBtn = document.getElementById('btn-force-refresh');
      if (forceBtn) {
        forceBtn.addEventListener('click', async () => {
          console.log(`[DEBUG-F4-DATA] Forzando refresh para ${productoNum}`);
          const projectId = wizardStore.getState().projectId;
          const url = buildEndpoint(`/api/form-schema/${projectId}/${productoNum}?refresh=true`);
          
          this._showGeneratingStatus();
          try {
            await getData(url); // Disparar nuevo job
            this._renderDynamicForm(); // Re-renderizar iniciará la espera del nuevo job
          } catch (err) {
            this._showErrorForm();
          }
        });
      }
    }
  }

  /**
   * Muestra error amigable cuando faltan datos de origen
   */
  /**
   * Limpia y parsea un string JSON que puede contener basura de la IA (markdown, etc)
   */
  private _cleanAndParseJSON(str: string): any {
    if (!str) return null;
    let clean = str.trim();
    // Eliminar bloques de código markdown
    clean = clean.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    // Buscar el primer { y el último }
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      clean = clean.substring(start, end + 1);
    }
    console.log('[DEBUG-F4-CLEAN] JSON resultante:', clean);
    return JSON.parse(clean);
  }

  private _showMissingDataError(message: string): void {
    const formContainer = document.getElementById('form-step6');
    if (formContainer) {
      formContainer.innerHTML = `
        <div class="bg-blue-50 p-6 rounded-lg text-center border border-blue-200">
          <div class="text-4xl mb-3">📋</div>
          <p class="text-blue-800 font-medium">${this._escapeHtml(message)}</p>
          <p class="text-blue-600 text-sm mt-2">Asegúrate de haber completado el temario y las especificaciones técnicas antes de continuar.</p>
        </div>
      `;
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

  private async _loadProductsFromBD(projectId: string): Promise<void> {
    try {
      const res = await getData<{ productos: F4ProductoBD[] }>(
        buildEndpoint(ENDPOINTS.wizard.fase4Productos(projectId))
      );
      const productos = res.data?.productos ?? [];
      if (productos.length === 0) return;

      let maxApprovedIndex = -1;
      for (const p of productos) {
        const productNumber = parseInt(p.producto.replace('P', ''), 10);
        if (isNaN(productNumber) || productNumber === 0) continue;
        const idx = productNumber - 1;
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

  private async _generateCurrentProduct(): Promise<void> {
    const product = PRODUCTS[this._currentProductIndex];
    if (!product) return;

    const state = wizardStore.getState();
    if (!state.projectId) { showError('No hay proyecto activo.'); return; }

    // Recolectar valores actuales del formulario
    await this._saveFormValues();

    // Cargar esquema para obtener los valores_usuario guardados
    const productoNum = product.promptId.replace('F4_', '');
    const schemaData = await this._loadFormSchema(productoNum);
    const userInputs = schemaData?.valores_usuario || this._sharedFormData;

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

    // --- LÓGICA MODULAR PARA P2 Y P3 ---
    if (product.promptId === 'F4_P2' || product.promptId === 'F4_P3') {
      this._setLoading(true);
      const isP2 = product.promptId === 'F4_P2';
      const promptToUse = isP2 ? 'F4_P2_GENERATE_DOCUMENT' : 'F4_P3_GENERATE_DOCUMENT';
      const prefix = isP2 ? 'presentacion_unidad_' : 'guion_unidad_';
      
      const unitKeys = Object.keys(userInputs).filter(k => k.startsWith(prefix));
      
      if (unitKeys.length === 0) {
        showError(`No se encontraron módulos para generar ${product.label}.`);
        this._setLoading(false);
        return;
      }

      // Obtener P3 si es P2 (para referencia en las slides)
      let p3Partes: any = {};
      if (isP2) {
        try {
          const resP3 = await getData<any>(buildEndpoint(ENDPOINTS.wizard.fase4Productos(state.projectId)));
          const p3Prod = resP3.data?.productos?.find((p: any) => p.producto === 'P3');
          p3Partes = p3Prod?.datos_producto?.partes || {};
        } catch (e) { console.warn('[F4] No se pudo cargar P3 para referencia'); }
      }

      for (const key of unitKeys.sort()) {
        const n = key.replace(prefix, '');
        const nombreModulo = userInputs[`_nombre_modulo_${n}`] || userInputs[`_nombre_video_${n}`] || `Módulo ${n}`;
        
        showLoading(`⏳ Generando ${product.label} - ${nombreModulo}...`);
        
        const modularInputs: Record<string, any> = {
          _modulo_actual: n,
          _nombre_modulo: nombreModulo,
          [key]: userInputs[key]
        };

        if (isP2 && p3Partes[`modulo_${n}`]) {
          const m = p3Partes[`modulo_${n}`];
          modularInputs['p3_guion'] = `GUION LITERARIO:\n${m.guion_literario}\n\nGUION TECNICO:\n${m.guion_tecnico}`;
        }

        const res = await postData<{ jobId: string }>(
          buildEndpoint(ENDPOINTS.wizard.generateAsync),
          {
            projectId: state.projectId,
            stepId,
            phaseId: 'F4',
            promptId: promptToUse,
            context: wizardStore.buildContext(STEP_NUMBER),
            userInputs: modularInputs,
          }
        );

        if (res.data?.jobId) {
          await new Promise((resolve, reject) => {
            subscribeToJob(res.data!.jobId, (r) => resolve(r), (e) => reject(e));
          });
        }
      }

      await this._loadProductsFromBD(state.projectId);
      const prod = this._approvedProducts.get(this._currentProductIndex);
      if (prod) this._showProductPreview(prod.content);
      this._renderProductIndicators();
      this._setLoading(false);
      hideLoading();
      return;
    }

    this._setLoading(true);
    showLoading(`⏳ Generando ${product.label}...`);

    try {
      const context = wizardStore.buildContext(STEP_NUMBER) as any;

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
    this._dom.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this._generateCurrentProduct();
    });
    this._dom.btnSubmit?.addEventListener('click', (e) => {
      if (!this._dom.form?.checkValidity()) {
        this._dom.form?.reportValidity();
        return;
      }
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
    this._dom.btnRegenerate?.addEventListener('click', () => {
      void this._generateCurrentProduct();
    });
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
    // --- RESET DE MEMORIA (DEBUG) ---
    console.warn('[REALTIME-DEBUG] Limpiando memoria local del wizard para forzar handshake limpio.');
    this._schemaSubscription?.cancel(); // Cerrar suscripción previa si existe
    this._schemaRetryCount = 0;
    
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
