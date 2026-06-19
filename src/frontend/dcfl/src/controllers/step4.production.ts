// src/controllers/step4.production.ts
// HTML en: /templates/tpl-step4-production.html
//
// Sub-wizard de F4: genera los 8 productos EC0366 de forma secuencial.
// AHORA CON FORMULARIOS DINÁMICOS GENERADOS POR IA

import { BaseStep } from '../shared/step.base';
import { postData, getData, patchData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from '../shared/endpoints';
import { showLoading, hideLoading, showError, renderMarkdown, printDocument } from '@core/ui';
import { wizardStore } from '../stores/wizard.store';
import type { PromptId } from '../types/wizard.types';
import { jobHub } from '../shared/supabase.realtime';

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

// P4 (Manual del Participante) is generated first — it is the source of truth for all other products.
// P3 (Guiones Multimedia) must be generated before P2 (Presentación Electrónica) because
// juez_presentacion in P2 penalizes agents that don't synchronize with P3 scenes.
// Correct order: P4 → P1 → P3 → P2 → P5 → P7 → P6 → P8
const PRODUCTS: Array<{ promptId: PromptId; productCode: string; label: string; elementoEC: string }> = [
  { promptId: 'F4_P4_GENERATE_DOCUMENT' as PromptId, productCode: 'P4', label: '1 Manual del Participante', elementoEC: 'Producto #1' },
  { promptId: 'F4_P1_GENERATE_DOCUMENT' as PromptId, productCode: 'P1', label: '2 Instrumentos de Evaluación', elementoEC: 'Producto #2' },
  { promptId: 'F4_P3_GENERATE_DOCUMENT' as PromptId, productCode: 'P3', label: '3 Guiones Multimedia', elementoEC: 'Producto #3' },
  { promptId: 'F4_P2_GENERATE_DOCUMENT' as PromptId, productCode: 'P2', label: '4 Presentación Electrónica', elementoEC: 'Producto #4' },
  { promptId: 'F4_P5_GENERATE_DOCUMENT' as PromptId, productCode: 'P5', label: '5 Guías de Actividades', elementoEC: 'Producto #5' },
  { promptId: 'F4_P7_GENERATE_DOCUMENT' as PromptId, productCode: 'P7', label: '6 Documento de Información', elementoEC: 'Producto #6' },
  { promptId: 'F4_P6_GENERATE_DOCUMENT' as PromptId, productCode: 'P6', label: '7 Calendario General', elementoEC: 'Producto #7' },
  { promptId: 'F4_P8_GENERATE_DOCUMENT' as PromptId, productCode: 'P8', label: '8 Cronograma de Desarrollo', elementoEC: 'Producto #8' },
];

class Step5ProductionController extends BaseStep {
  private _currentProductIndex = 0;
  private _approvedProducts: Map<number, { content: string; documentId: string }> = new Map();
  private _sharedFormData: Record<string, unknown> = {};
  private _validationWarnings: Set<number> = new Set();
  private _rejectedProducts: Set<number> = new Set();
  /** Caché por código de producto (P1-P8). Evita re-fetch al cambiar de tab. */
  private _schemaCache = new Map<string, any>();
  private _schemaJobId: string | null = null;
  private _temarioSubscription: JobSubscription | null = null;
  private _projectSoul: string | null = null;
  private _temarioConfirmado = false;
  private _f3Valid = false;
  private _canonicalSpecFrozen = false;
  /** Raw datos_producto for P1 — populated in _loadProductsFromBD for strategy panel */
  private _p1DatosProducto: Record<string, unknown> | null = null;
  /** Whether the P1 strategy confirmation has been dismissed this session */
  private _p1StrategyConfirmed = false;

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
    // Devolver caché si ya está listo (evita round-trip al cambiar de tab)
    if (this._schemaCache.has(producto)) {
      return this._schemaCache.get(producto);
    }

    const projectId = wizardStore.getState().projectId;
    if (!projectId) return null;

    const url = buildEndpoint(`/api/form-schema/${projectId}/${producto}`);

    try {
      const result = await getData<any>(url) as any;

      if (result.status === 'ready') {
        this._schemaCache.set(producto, result);
        return result;
      }

      if (result.status === 'generating' && result.jobId) {
        this._showGeneratingStatus();
        return new Promise<any>((resolve) => {
          if (this._schemaJobId) { jobHub.cancel(this._schemaJobId); this._schemaJobId = null; }
          this._schemaJobId = result.jobId;
          jobHub.waitForJob(result.jobId, (job) => {
            if (job.progress?.currentStep) this._showGeneratingStatus(job.progress.currentStep);
          }).then(async () => {
            this._schemaJobId = null;
            try {
              const ready = await getData<any>(url) as any;
              const schema = ready.status === 'ready' ? ready : null;
              if (schema) this._schemaCache.set(producto, schema);
              resolve(schema);
            } catch {
              resolve(null);
            }
          }).catch((error: Error) => {
            this._schemaJobId = null;
            console.error('[F4] Schema generation failed:', error.message);
            this._showErrorForm();
            resolve(null);
          });
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
    let html = '';

    // Banner del Project Soul (solo lectura, colapsable)
    const soul = this._projectSoul ?? wizardStore.getState().projectSoul;
    if (soul) {
      const preview = soul.length > 180 ? soul.slice(0, 180) + '…' : soul;
      const full = soul.length > 180 ? soul : '';
      html += `
        <details class="mb-4 border border-amber-300 rounded-lg bg-amber-50 open:bg-amber-50">
          <summary class="cursor-pointer px-4 py-2 text-xs font-bold text-amber-800 uppercase tracking-widest select-none flex items-center gap-2">
            <span>Anclaje del proyecto (solo lectura)</span>
            <span class="ml-auto text-amber-500 text-base">▼</span>
          </summary>
          <div class="px-4 pb-3 pt-1 text-xs text-amber-900 leading-relaxed whitespace-pre-line">
            ${this._escapeHtml(full || preview)}
          </div>
        </details>
      `;
    }

    html += `
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
      // Actualizar la caché para que el siguiente render use los valores recién guardados
      const cached = this._schemaCache.get(productoNum);
      if (cached) cached.valores_usuario = { ...cached.valores_usuario, ...values };
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
      tab.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLElement;
        const index = parseInt(target.getAttribute('data-index') || '-1', 10);
        if (index < 0) return;
        this._currentProductIndex = index;
        this._config.promptId = PRODUCTS[index].promptId;
        this._updateProductHeader();
        this._renderProductIndicators();
        const prod = this._approvedProducts.get(index);
        if (prod) {
          this._showProductPreview(prod.content);
        } else if (this._temarioConfirmado && this._f3Valid && this._canonicalSpecFrozen) {
          // Refresh from BD before showing generate area — product may exist if generated this session
          const pid = wizardStore.getState().projectId;
          if (pid) await this._loadProductsFromBD(pid);
          const prodRefreshed = this._approvedProducts.get(index);
          if (prodRefreshed) {
            this._showProductPreview(prodRefreshed.content);
          } else {
            this._showGenerateArea();
          }
        }
      });
    });
  }

  private async _checkTemarioGate(projectId: string): Promise<boolean> {
    try {
      const res = await getData<any>(buildEndpoint(`/api/temario/${projectId}`));
      this._temarioConfirmado = res?.confirmado_por_usuario === true;
    } catch {
      this._temarioConfirmado = false;
    }
    return this._temarioConfirmado;
  }

  private async _checkF3Gate(projectId: string): Promise<boolean> {
    try {
      const res = await getData<any>(buildEndpoint(`/api/f3/${projectId}/validation-status`));
      this._f3Valid = (res?.plataforma === true) && (res?.modalidad === true);
    } catch {
      // If F3 endpoint unavailable, don't block production (fail-open for legacy projects)
      this._f3Valid = true;
    }
    return this._f3Valid;
  }

  private async _checkCanonicalSpecGate(projectId: string): Promise<boolean> {
    try {
      const res = await getData<any>(buildEndpoint(ENDPOINTS.canonicalSpec.status(projectId)));
      this._canonicalSpecFrozen = res?.canonical_spec_frozen === true;
    } catch {
      // Fail-open: if the endpoint is unavailable (legacy project or DB issue), allow production.
      this._canonicalSpecFrozen = true;
    }
    return this._canonicalSpecFrozen;
  }

  private _renderCanonicalSpecGate(projectId: string): void {
    const gateId = 'canonical-spec-gate-area';
    if (this._container.querySelector(`#${gateId}`)) return;

    const gate = document.createElement('div');
    gate.id = gateId;
    gate.className = 'bg-amber-50 border border-amber-300 rounded-lg p-5 mb-6';
    gate.innerHTML = `
      <h3 class="font-semibold text-amber-800 mb-2">🔒 Confirmación de Especificación Canónica de Producción</h3>
      <p class="text-amber-700 text-sm mb-3">
        Antes de generar los productos del curso, confirma que las especificaciones de producción están listas.
        Una vez confirmadas, el <strong>temario</strong>, el <strong>plan de video</strong> y el <strong>estándar de seguimiento</strong>
        quedarán congelados como fuente de verdad inmutable para todos los productos F4–F7.
      </p>
      <p class="text-amber-600 text-xs mb-4">
        Asegúrate de haber completado: Temario Base (confirmado), Paso 2.5 (recomendaciones de video) y Paso 3 (especificaciones técnicas).
      </p>
      <div id="canonical-spec-gate-status" class="text-sm mb-3"></div>
      <button id="btn-confirm-canonical-spec"
        class="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">
        Confirmar y comenzar producción
      </button>
    `;

    this._container.insertBefore(gate, this._container.firstChild);

    const statusEl = gate.querySelector<HTMLElement>('#canonical-spec-gate-status')!;
    const btnConfirm = gate.querySelector<HTMLButtonElement>('#btn-confirm-canonical-spec')!;

    btnConfirm.addEventListener('click', async () => {
      btnConfirm.disabled = true;
      btnConfirm.textContent = 'Confirmando...';
      statusEl.textContent = '';

      try {
        await patchData(buildEndpoint(ENDPOINTS.canonicalSpec.confirm(projectId)), {});
        this._canonicalSpecFrozen = true;
        gate.remove();
        void this._renderConfirmedTemarioPanel(projectId);
        this._showGenerateArea();
      } catch (err) {
        statusEl.textContent = `❌ Error al confirmar: ${err instanceof Error ? err.message : String(err)}`;
        statusEl.className = 'text-sm text-red-600 mb-3';
        btnConfirm.disabled = false;
        btnConfirm.textContent = 'Confirmar y comenzar producción';
      }
    });
  }

  private _renderF3Gate(projectId: string): void {
    const gateId = 'f3-gate-area';
    if (this._container.querySelector(`#${gateId}`)) return;

    const gate = document.createElement('div');
    gate.id = gateId;
    gate.className = 'bg-blue-50 border border-blue-300 rounded-lg p-5 mb-6';
    gate.innerHTML = `
      <h3 class="font-semibold text-blue-800 mb-2">📋 Verificación F3: Especificaciones del Curso</h3>
      <p class="text-blue-700 text-sm mb-4">
        Los productos F4 requieren conocer la <strong>plataforma de impartición</strong> y la <strong>modalidad</strong> del curso.
        Estos campos no pudieron determinarse automáticamente en F3. Completa la información a continuación para continuar.
      </p>
      <div id="f3-gate-status" class="text-sm text-blue-600 mb-3"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-blue-800 mb-1" for="f3-plataforma">
            Plataforma / Entorno de Impartición
          </label>
          <input id="f3-plataforma" type="text"
            class="w-full text-sm border border-blue-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ej: Moodle, Teams, Presencial, Zoom..." />
        </div>
        <div>
          <label class="block text-sm font-medium text-blue-800 mb-1" for="f3-modalidad">
            Modalidad del Curso
          </label>
          <select id="f3-modalidad"
            class="w-full text-sm border border-blue-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">— Seleccionar —</option>
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual / En línea</option>
            <option value="mixta">Mixta / Semipresencial</option>
            <option value="hibrida">Híbrida</option>
          </select>
        </div>
      </div>
      <button id="btn-f3-guardar" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
        Guardar y continuar
      </button>
    `;

    this._container.insertBefore(gate, this._container.firstChild);

    const statusEl = gate.querySelector<HTMLElement>('#f3-gate-status')!;
    const btnGuardar = gate.querySelector<HTMLButtonElement>('#btn-f3-guardar')!;
    const inputPlataforma = gate.querySelector<HTMLInputElement>('#f3-plataforma')!;
    const selectModalidad = gate.querySelector<HTMLSelectElement>('#f3-modalidad')!;

    btnGuardar.addEventListener('click', async () => {
      const plataforma = inputPlataforma.value.trim();
      const modalidad = selectModalidad.value;

      if (!plataforma || !modalidad) {
        statusEl.textContent = '⚠️ Completa ambos campos antes de continuar.';
        statusEl.className = 'text-sm text-red-600 mb-3';
        return;
      }

      btnGuardar.disabled = true;
      btnGuardar.textContent = 'Guardando...';
      statusEl.textContent = 'Guardando especificaciones F3...';
      statusEl.className = 'text-sm text-blue-600 mb-3';

      try {
        await patchData(buildEndpoint(`/api/f3/${projectId}/structured`), { plataforma, modalidad });
        statusEl.textContent = '✅ Especificaciones guardadas. Cargando producción...';
        statusEl.className = 'text-sm text-green-600 mb-3';
        this._f3Valid = true;

        setTimeout(async () => {
          gate.remove();
          await this._checkCanonicalSpecGate(projectId);
          if (!this._canonicalSpecFrozen) {
            this._renderCanonicalSpecGate(projectId);
          } else {
            void this._renderConfirmedTemarioPanel(projectId);
            this._showGenerateArea();
          }
        }, 800);
      } catch (err) {
        statusEl.textContent = `❌ Error al guardar: ${err instanceof Error ? err.message : String(err)}`;
        statusEl.className = 'text-sm text-red-600 mb-3';
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar y continuar';
      }
    });
  }

  private _renderTemarioPreview(temario: any): string {
    const modulos: any[] = temario.temario ?? [];
    const totalMin = temario.duracion_total_minutos ?? 0;
    const totalU = temario.total_unidades ?? 0;

    const VERBOS_NO_OBS = ['conocer', 'entender', 'saber', 'comprender', 'aprender', 'familiarizar'];
    const esVerboNoObservable = (obj: string): boolean => {
      const primer = (obj ?? '').trim().toLowerCase().split(/\s+/)[0];
      return VERBOS_NO_OBS.some(v => primer.startsWith(v));
    };

    const rows = modulos.map((mod: any) => {
      const unidades = (mod.unidades ?? []).map((u: any) => {
        const bloomBadge = esVerboNoObservable(u.objetivo_bloom)
          ? `<span class="text-red-600 text-xs font-bold ml-1" title="Usa verbos observables: Aplica, Ejecuta, Construye, Evalúa, Analiza, Diseña.">⚠ Verbo no observable (Bloom)</span>`
          : '';
        return `
        <tr class="border-t border-gray-100">
          <td class="pl-6 py-1 text-gray-600">${u.nombre ?? '—'}</td>
          <td class="py-1 text-gray-500 text-xs italic">${u.objetivo_bloom ?? '—'}${bloomBadge}</td>
          <td class="py-1 text-right text-gray-500">${u.duracion_minutos ?? '?'} min</td>
          <td class="py-1 text-gray-400 text-xs">${u.tipo_evaluacion ?? '—'}</td>
        </tr>`;
      }).join('');
      const modMin = (mod.unidades ?? []).reduce((s: number, u: any) => s + (Number(u.duracion_minutos) || 0), 0);
      return `
        <tr class="bg-amber-50 font-medium">
          <td class="py-1.5 text-amber-900" colspan="2">Módulo ${mod.numero}: ${mod.nombre}</td>
          <td class="py-1.5 text-right text-amber-700">${modMin} min</td>
          <td></td>
        </tr>${unidades}`;
    }).join('');

    return `
      <div class="mb-2 text-xs text-gray-500 font-medium uppercase tracking-wide">
        ${modulos.length} módulo(s) · ${totalU} unidad(es) · ${totalMin} min total
      </div>
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr class="border-b border-gray-200 text-gray-400 uppercase tracking-wide">
            <th class="text-left py-1 w-1/3">Unidad</th>
            <th class="text-left py-1">Objetivo (Bloom)</th>
            <th class="text-right py-1 w-20">Duración</th>
            <th class="text-left py-1 w-24">Evaluación</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  private async _renderConfirmedTemarioPanel(projectId: string): Promise<void> {
    if (this._container.querySelector('#temario-summary-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'temario-summary-panel';
    panel.className = 'bg-green-50 border border-green-200 rounded-lg p-3 mb-6';
    panel.innerHTML = `
      <details>
        <summary class="cursor-pointer text-sm font-semibold text-green-800 flex items-center gap-2 select-none">
          ✅ Temario Base confirmado
          <span class="ml-auto text-green-500 text-xs">▼ Ver temario</span>
        </summary>
        <div id="temario-summary-content" class="mt-3 max-h-72 overflow-y-auto bg-white border border-green-100 rounded p-3 text-xs">
          <p class="text-gray-400 text-center">Cargando temario...</p>
        </div>
      </details>
    `;
    this._container.insertBefore(panel, this._container.firstChild);

    try {
      const temario = await getData<any>(buildEndpoint(`/api/temario/${projectId}`));
      const contentEl = panel.querySelector<HTMLElement>('#temario-summary-content');
      if (contentEl && temario?.temario?.length > 0) {
        contentEl.innerHTML = this._renderTemarioPreview(temario);
      }
    } catch { /* no bloquear la carga */ }
  }

  private _renderTemarioGate(projectId: string): void {
    const gateId = 'temario-gate-area';
    if (this._container.querySelector(`#${gateId}`)) return;

    let lastFetchedTemario: any = null;

    const gate = document.createElement('div');
    gate.id = gateId;
    gate.className = 'bg-amber-50 border border-amber-300 rounded-lg p-5 mb-6';
    gate.innerHTML = `
      <h3 class="font-semibold text-amber-800 mb-2">⚠️ Paso previo requerido: Temario Base</h3>
      <p class="text-amber-700 text-sm mb-4">
        Antes de generar los productos F4, debes generar y confirmar el Temario Base del curso.
        Este temario define módulos, unidades, objetivos y duraciones que serán el ancla de todos los productos.
      </p>
      <div id="temario-gate-status" class="text-sm text-amber-600 mb-3"></div>
      <div id="temario-preview" class="mb-4 hidden text-sm bg-white border border-amber-200 rounded p-4 max-h-96 overflow-y-auto"></div>
      <div id="temario-extra-inputs" class="mb-4 hidden">
        <label class="block text-sm font-medium text-amber-800 mb-1">
          Instrucciones adicionales para regenerar (opcional)
        </label>
        <textarea id="temario-instrucciones" rows="3"
          class="w-full text-sm border border-amber-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="Ej: Agrega una unidad sobre normatividad NOM-035, extiende el módulo 2 a 3 horas..."></textarea>
      </div>
      <div id="bloom-violations-alert" class="hidden mb-4 bg-orange-50 border border-orange-300 rounded-lg p-3 text-sm text-orange-800"></div>
      <div class="flex gap-2 flex-wrap">
        <button id="btn-generar-temario" class="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">
          Generar Temario
        </button>
        <button id="btn-confirmar-temario" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 hidden">
          Confirmar Temario
        </button>
      </div>
    `;

    this._container.insertBefore(gate, this._container.firstChild);

    const btnGenerar = gate.querySelector<HTMLButtonElement>('#btn-generar-temario')!;
    const btnConfirmar = gate.querySelector<HTMLButtonElement>('#btn-confirmar-temario')!;
    const statusEl = gate.querySelector<HTMLElement>('#temario-gate-status')!;
    const previewEl = gate.querySelector<HTMLElement>('#temario-preview')!;
    const extraInputsEl = gate.querySelector<HTMLElement>('#temario-extra-inputs')!;
    const instruccionesEl = gate.querySelector<HTMLTextAreaElement>('#temario-instrucciones')!;
    const bloomAlertEl = gate.querySelector<HTMLElement>('#bloom-violations-alert')!;

    const updateBloomAlert = (temario: any) => {
      const violations: any[] = (temario?.validacion_bloom_instrument ?? [])
        .filter((v: any) => v.valido === false);
      if (violations.length === 0) {
        bloomAlertEl.classList.add('hidden');
        if (btnConfirmar.textContent?.startsWith('Confirmar de todas formas')) {
          btnConfirmar.textContent = 'Confirmar Temario';
        }
        return;
      }
      const items = violations.map((v: any) =>
        `<li><strong>${v.unidad ?? '—'}</strong>: verbo <em>${v.verboPrimero ?? '?'}</em> → instrumento <em>${v.tipoInstrumento ?? '?'}</em> (válidos: ${v.instrumentosPermitidos?.join(', ') ?? 'N/A'})</li>`
      ).join('');
      bloomAlertEl.innerHTML = `
        <strong>⚠️ ${violations.length} desalineación(es) Bloom-Instrumento detectada(s):</strong>
        <ul class="mt-1 ml-4 list-disc">${items}</ul>
        <p class="mt-2 text-xs text-orange-700">P1 usará estos tipos de instrumento. Puedes regenerar el temario o confirmar y corregir después.</p>`;
      bloomAlertEl.classList.remove('hidden');
      btnConfirmar.textContent = `Confirmar de todas formas (${violations.length} advertencia${violations.length > 1 ? 's' : ''})`;
    };

    // Mostrar temario existente si ya fue generado (pero aún no confirmado)
    getData<any>(buildEndpoint(`/api/temario/${projectId}`)).then(temario => {
      if (temario?.temario?.length > 0) {
        lastFetchedTemario = temario;
        previewEl.classList.remove('hidden');
        previewEl.innerHTML = this._renderTemarioPreview(temario);
        extraInputsEl.classList.remove('hidden');
        btnConfirmar.classList.remove('hidden');
        btnGenerar.textContent = 'Regenerar Temario';
        statusEl.textContent = 'Temario previo cargado. Revísalo y confirma, o regenera con nuevas instrucciones.';
        updateBloomAlert(temario);
      }
    }).catch(() => {});

    btnGenerar.addEventListener('click', async () => {
      btnGenerar.disabled = true;
      btnGenerar.textContent = 'Generando...';
      statusEl.textContent = 'Iniciando pipeline de Temario Base...';

      try {
        const state = wizardStore.getState();
        const instruccionesExtra = instruccionesEl.value.trim();

        // Paso 1: obtener stepId
        let stepId = state.steps[STEP_NUMBER]?.stepId;
        try {
          const saveRes = await postData<{ stepId: string }>(
            buildEndpoint(ENDPOINTS.wizard.saveStep),
            { projectId, stepNumber: STEP_NUMBER, inputData: instruccionesExtra ? { instrucciones_adicionales: instruccionesExtra } : {} }
          );
          if (saveRes.data?.stepId) {
            stepId = saveRes.data.stepId;
            wizardStore.setStepId(STEP_NUMBER, stepId);
          }
        } catch { /* usar stepId existente */ }

        if (!stepId) throw new Error('No stepId disponible para el pipeline');

        // Paso 2: contexto del wizard
        const context = wizardStore.buildContext(STEP_NUMBER);

        // Paso 3: lanzar pipeline asíncrono
        const userInputs = instruccionesExtra ? { instrucciones_adicionales: instruccionesExtra } : {};
        const res = await postData<{ jobId: string }>(
          buildEndpoint(ENDPOINTS.wizard.generateAsync),
          { projectId, stepId, phaseId: 'TEMARIO_BASE', promptId: 'TEMARIO_BASE', context, userInputs }
        );

        if (!res.data?.jobId) throw new Error('No jobId recibido del servidor');
        statusEl.textContent = 'Pipeline iniciado. Esperando resultado...';

        // Paso 4: jobHub en lugar de subscribeToJob
        this._temarioSubscription?.cancel();
        this._temarioSubscription = jobHub.subscribeToJobCallback(
          res.data.jobId,
          async () => {
            try {
              const temario = await getData<any>(buildEndpoint(`/api/temario/${projectId}`));
              if (temario?.temario?.length > 0) {
                lastFetchedTemario = temario;
                btnGenerar.textContent = 'Regenerar Temario';
                btnGenerar.disabled = false;
                btnConfirmar.classList.remove('hidden');
                extraInputsEl.classList.remove('hidden');
                previewEl.classList.remove('hidden');
                previewEl.innerHTML = this._renderTemarioPreview(temario);
                updateBloomAlert(temario);
                statusEl.textContent = '✅ Temario generado. Revísalo y confirma para continuar.';
              } else {
                statusEl.textContent = '⚠️ El temario se completó pero no tiene módulos. Intenta de nuevo.';
                btnGenerar.disabled = false;
                btnGenerar.textContent = 'Generar Temario';
              }
            } catch {
              statusEl.textContent = '⚠️ Error al cargar el temario generado.';
              btnGenerar.disabled = false;
              btnGenerar.textContent = 'Generar Temario';
            }
          },
          (err) => {
            statusEl.textContent = `❌ Error en pipeline: ${err}`;
            btnGenerar.disabled = false;
            btnGenerar.textContent = 'Generar Temario';
          },
          (job) => {
            if (job?.progress?.currentStep) {
              statusEl.textContent = `⏳ ${job.progress.currentStep}`;
            }
          }
        );
      } catch (err) {
        statusEl.textContent = `❌ Error al iniciar: ${err}`;
        btnGenerar.disabled = false;
        btnGenerar.textContent = 'Generar Temario';
      }
    });

    btnConfirmar.addEventListener('click', async () => {
      btnConfirmar.disabled = true;
      btnConfirmar.textContent = 'Confirmando...';
      try {
        await patchData(buildEndpoint(`/api/temario/${projectId}/confirm`), {});
        this._temarioConfirmado = true;
        const temarioHtml = lastFetchedTemario
          ? this._renderTemarioPreview(lastFetchedTemario)
          : previewEl.innerHTML;
        gate.id = 'temario-summary-panel';
        gate.className = 'bg-green-50 border border-green-200 rounded-lg p-3 mb-6';
        gate.innerHTML = `
          <details>
            <summary class="cursor-pointer text-sm font-semibold text-green-800 flex items-center gap-2 select-none">
              ✅ Temario Base confirmado
              <span class="ml-auto text-green-500 text-xs">▼ Ver temario</span>
            </summary>
            <div class="mt-3 max-h-72 overflow-y-auto bg-white border border-green-100 rounded p-3 text-xs">
              ${temarioHtml}
            </div>
          </details>
        `;
        await this._checkCanonicalSpecGate(projectId);
        if (!this._f3Valid) {
          this._renderF3Gate(projectId);
        } else if (!this._canonicalSpecFrozen) {
          this._renderCanonicalSpecGate(projectId);
        } else {
          this._showGenerateArea();
        }
        this._renderProductIndicators();
      } catch (err) {
        statusEl.textContent = `❌ Error al confirmar: ${err}`;
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = 'Confirmar Temario';
      }
    });
  }

  private async _loadProjectSoul(projectId: string): Promise<void> {
    // Prefer cached value in store to avoid an extra round-trip on every re-mount
    const cached = wizardStore.getState().projectSoul;
    if (cached) { this._projectSoul = cached; return; }

    try {
      const res = await getData<any>(buildEndpoint(ENDPOINTS.wizard.getProject(projectId)));
      const soul = res.data?.project?.project_soul as string | null | undefined;
      if (soul) {
        this._projectSoul = soul;
        wizardStore.setProjectSoul(soul);
      }
    } catch {
      // No bloquea la carga del formulario si falla
    }
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

      for (const p of productos) {
        const idx = PRODUCTS.findIndex(prod => prod.productCode === p.producto);
        if (idx < 0) continue;
        if (!p.documento_final) continue;
        this._approvedProducts.set(idx, {
          content: p.documento_final,
          documentId: p.job_id ?? '',
        });
        if (p.validacion_estado === 'revision_humana' || p.validacion_estado === 'aprobado_con_errores') {
          this._validationWarnings.add(idx);
        }
        if (p.validacion_estado.includes('rechazado')) {
          this._rejectedProducts.add(idx);
        }
        if (p.producto === 'P1' && p.datos_producto) {
          this._p1DatosProducto = p.datos_producto as Record<string, unknown>;
        }
      }

      if (this._approvedProducts.size > 0) {
        // Posicionar en el primer producto no aprobado (hueco) para que el usuario lo genere.
        // Si no hay huecos (todo completo), posicionar en el último.
        const firstGap = PRODUCTS.findIndex((_, i) => !this._approvedProducts.has(i));
        this._currentProductIndex = firstGap >= 0 ? firstGap : PRODUCTS.length - 1;
        console.log(`[F4] Restaurados ${this._approvedProducts.size} producto(s) desde BD. Posición: ${this._currentProductIndex}`);
      }

      // Si todos los productos están en BD, marcar step 5 como completado.
      // Cubre el caso del test runner y refresco de página donde _approveCurrentProduct
      // nunca fue llamado manualmente.
      if (this._approvedProducts.size === PRODUCTS.length) {
        if (this._rejectedProducts.size > 0) {
          const names = [...this._rejectedProducts].map(i => `P${i + 1}`).join(', ');
          console.warn(`[F4] Productos rechazados detectados: ${names}. Bloqueando completado automático.`);
          return;
        }
        wizardStore.setStepStatus(STEP_NUMBER, 'completed');
        const stepId = wizardStore.getState().steps[STEP_NUMBER]?.stepId;
        if (stepId) {
          postData(buildEndpoint(ENDPOINTS.wizard.completeStep), { stepId }).catch(() => {});
        }
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

  private _renderP1StrategyPanel(): void {
    const panelId = 'p1-strategy-confirmation';
    if (this._p1StrategyConfirmed || this._container.querySelector(`#${panelId}`)) return;

    const isRejected = this._rejectedProducts.has(this._currentProductIndex);
    const instrumentos: Array<{ unidad: number; tipo: string }> =
      (this._p1DatosProducto?.instrumentos as Array<any>) ?? [];

    let tableHtml = '';
    if (instrumentos.length > 0) {
      tableHtml = `
        <table class="w-full text-xs border-collapse mt-2">
          <thead><tr class="bg-green-100 text-green-800">
            <th class="border p-2 text-left">Unidad</th>
            <th class="border p-2 text-left">Instrumento de Evaluación</th>
          </tr></thead>
          <tbody>
            ${instrumentos.map(i => `<tr><td class="border p-2">Unidad ${i.unidad}</td><td class="border p-2">${i.tipo}</td></tr>`).join('')}
          </tbody>
        </table>`;
    }

    const rejectedHtml = isRejected ? `
      <div class="mt-3 p-3 bg-red-50 border border-red-300 rounded text-sm text-red-800">
        ⚠️ Este producto tiene violaciones de certificación. Revisa el documento generado y considera regenerar P1.
      </div>` : '';

    const panel = document.createElement('div');
    panel.id = panelId;
    panel.className = 'bg-green-50 border border-green-300 rounded-lg p-4 mb-4';
    panel.innerHTML = `
      <h4 class="font-semibold text-green-800 mb-2">📊 Estrategia Evaluativa — Revisión P1</h4>
      <p class="text-green-700 text-sm mb-2">
        Los instrumentos de evaluación han sido generados y validados por el Motor de Certificación EC0366.
        Confirma la estrategia antes de continuar con P3 y P2.
      </p>
      ${tableHtml}
      ${rejectedHtml}
      <button id="btn-p1-confirmar" class="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
        Confirmar estrategia evaluativa
      </button>
    `;

    const previewArea = this._subDom.productPreviewArea;
    if (previewArea) previewArea.insertBefore(panel, previewArea.firstChild);

    panel.querySelector<HTMLButtonElement>('#btn-p1-confirmar')?.addEventListener('click', () => {
      this._p1StrategyConfirmed = true;
      panel.remove();
    });
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

    // P1 strategy confirmation panel (non-blocking)
    if (PRODUCTS[this._currentProductIndex]?.productCode === 'P1') {
      this._renderP1StrategyPanel();
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
        this._showAprobacionModal(() => {
          if (this._currentProductIndex < PRODUCTS.length - 1) {
            this._currentProductIndex++;
            this._config.promptId = PRODUCTS[this._currentProductIndex].promptId;
            this._updateProductHeader();
            this._showGenerateArea();
            this._renderProductIndicators();
          } else {
            this._approveCurrentProduct();
          }
        });
      });
    }
  }

  private _showGenerateArea(): void {
    console.log('[F4] _showGenerateArea Front called');
    this._setLoading(false);
    if (this._schemaJobId) { jobHub.cancel(this._schemaJobId); this._schemaJobId = null; }
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
    return jobHub.waitForJob(jobId, (job) => {
      if (job.progress?.currentStep) onProgress?.(job.progress.currentStep);
    }).then(() => undefined);
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
        this._jobSubscription = jobHub.subscribeToJobCallback(
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
            this._clearPipelineProgressBar();
            this._showProductPreview(content);
            this._renderProductIndicators();
            this._setLoading(false);
            hideLoading();
          },
          (error) => {
            this._clearPipelineProgressBar();
            this._setLoading(false);
            hideLoading();
            showError(error);
          },
          (job) => {
            if (job.progress?.currentStep) {
              showLoading(`⏳ Generando ${product.label}... (${job.progress.currentStep})`);
              this._renderPipelineProgressBar(job.progress.currentStep);
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

  private readonly _PIPELINE_STAGES = [
    { key: 'extractor', label: 'Extractor' },
    { key: 'agente_a', label: 'Especialista A' },
    { key: 'agente_b', label: 'Especialista B' },
    { key: 'juez', label: 'Juez' },
    { key: 'ensamblador', label: 'Ensamblador' },
  ];

  private _classifyStep(step: string): string {
    const s = step.toLowerCase();
    if (/extractor/.test(s)) return 'extractor';
    if (/agente.*_a\b|agente_[a-z]+_a/.test(s)) return 'agente_a';
    if (/agente.*_b\b|agente_[a-z]+_b/.test(s)) return 'agente_b';
    if (/juez/.test(s)) return 'juez';
    if (/ensamblador/.test(s)) return 'ensamblador';
    return '';
  }

  private _renderPipelineProgressBar(currentStep: string): void {
    const container = this._subDom.productGenerateArea;
    if (!container) return;

    const activeKey = this._classifyStep(currentStep);
    let bar = container.querySelector('#pipeline-progress-bar') as HTMLElement | null;
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'pipeline-progress-bar';
      bar.className = 'flex items-center gap-1 mt-4 px-2 select-none';
      container.appendChild(bar);
    }

    bar.innerHTML = this._PIPELINE_STAGES.map((stage, i) => {
      const isActive = stage.key === activeKey;
      const activeIdx = this._PIPELINE_STAGES.findIndex(s => s.key === activeKey);
      const isDone = activeIdx > i;
      const dotColor = isActive ? 'bg-green-500 ring-2 ring-green-300' : isDone ? 'bg-green-400' : 'bg-gray-300';
      const textColor = isActive ? 'text-green-700 font-bold' : isDone ? 'text-green-600' : 'text-gray-400';
      const connector = i < this._PIPELINE_STAGES.length - 1
        ? `<div class="flex-1 h-0.5 ${isDone ? 'bg-green-400' : 'bg-gray-200'}"></div>`
        : '';
      return `
        <div class="flex items-center ${i < this._PIPELINE_STAGES.length - 1 ? 'flex-1' : ''}">
          <div class="flex flex-col items-center">
            <div class="w-3 h-3 rounded-full ${dotColor} transition-all"></div>
            <span class="text-xs mt-1 whitespace-nowrap ${textColor}">${stage.label}</span>
          </div>
          ${connector}
        </div>`;
    }).join('');
  }

  private _clearPipelineProgressBar(): void {
    this._subDom.productGenerateArea?.querySelector('#pipeline-progress-bar')?.remove();
  }

  private _showAprobacionModal(onConfirm: () => void): void {
    const productIndex = this._currentProductIndex;
    const product = PRODUCTS[productIndex];
    const content = this._approvedProducts.get(productIndex)?.content ?? '';

    const previewLimit = 5000;
    const isTruncated = content.length > previewLimit;
    const previewContent = isTruncated ? content.slice(0, previewLimit) : content;
    const truncationNote = isTruncated
      ? `<p class="text-xs text-amber-600 mt-1">⚠ Mostrando 5,000 de ${content.length.toLocaleString('es-MX')} caracteres totales</p>`
      : '';
    const verCompletoBtn = isTruncated
      ? `<button id="modal-ver-completo" class="text-xs text-blue-600 underline hover:text-blue-800 mt-1">Ver documento completo</button>`
      : '';

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60';
    overlay.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-gray-800 mb-1">Registrar aprobación</h3>
        <p class="text-sm text-gray-500 mb-2">Producto: <strong>${product?.label ?? ''}</strong></p>
        ${previewContent ? `<div class="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-1 max-h-40 overflow-y-auto"><pre class="text-xs text-gray-700 whitespace-pre-wrap font-mono">${previewContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></div>${truncationNote}${verCompletoBtn}` : ''}
        <div class="space-y-3 mt-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Aprobado por <span class="text-red-500">*</span></label>
            <input id="modal-aprobado-por" type="text" required placeholder="Nombre completo"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Cargo (opcional)</label>
            <input id="modal-cargo" type="text" placeholder="Ej: Diseñador Instruccional"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
            <textarea id="modal-observaciones" rows="3" placeholder="Notas de la revisión..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"></textarea>
          </div>
          <div id="modal-folio-result" class="hidden text-green-700 text-sm font-medium bg-green-50 border border-green-200 rounded-lg px-3 py-2"></div>
          <div id="modal-error" class="hidden text-red-600 text-sm"></div>
        </div>
        <div class="flex gap-3 mt-5">
          <button id="modal-cancel" class="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
          <button id="modal-confirm" class="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-sm font-bold transition-colors">Confirmar aprobación</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector('#modal-cancel') as HTMLButtonElement;
    const confirmBtn = overlay.querySelector('#modal-confirm') as HTMLButtonElement;
    const folioEl = overlay.querySelector('#modal-folio-result') as HTMLElement;
    const errorEl = overlay.querySelector('#modal-error') as HTMLElement;

    const close = () => document.body.removeChild(overlay);
    cancelBtn.addEventListener('click', close);

    const verCompletoEl = overlay.querySelector('#modal-ver-completo') as HTMLButtonElement | null;
    verCompletoEl?.addEventListener('click', () => {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<pre style="font-family:monospace;white-space:pre-wrap;padding:1rem">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`);
        win.document.close();
      }
    });

    confirmBtn.addEventListener('click', async () => {
      const aprobadoPor = (overlay.querySelector('#modal-aprobado-por') as HTMLInputElement).value.trim();
      if (!aprobadoPor) {
        errorEl.textContent = 'El campo "Aprobado por" es requerido.';
        errorEl.classList.remove('hidden');
        return;
      }
      const cargo = (overlay.querySelector('#modal-cargo') as HTMLInputElement).value.trim();
      const observaciones = (overlay.querySelector('#modal-observaciones') as HTMLTextAreaElement).value.trim();

      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Guardando...';
      errorEl.classList.add('hidden');

      const state = wizardStore.getState();
      try {
        const res = await postData<{ folio?: string }>(buildEndpoint('/api/aprobaciones'), {
          projectId: state.projectId,
          fase: `F4_${product?.productCode ?? productIndex}`,
          aprobadoPor,
          cargo: cargo || undefined,
          observaciones: observaciones || undefined,
          documentoMd: content,
        });
        folioEl.textContent = `✓ Aprobación registrada. Folio: ${res?.folio ?? '—'}`;
        folioEl.classList.remove('hidden');
        confirmBtn.textContent = 'Cerrar';
        confirmBtn.disabled = false;
        confirmBtn.addEventListener('click', () => { close(); onConfirm(); }, { once: true });
      } catch {
        errorEl.textContent = 'No se pudo registrar en el servidor. La aprobación local continuará.';
        errorEl.classList.remove('hidden');
        confirmBtn.textContent = 'Continuar de todas formas';
        confirmBtn.disabled = false;
        confirmBtn.addEventListener('click', () => { close(); onConfirm(); }, { once: true });
      }
    });
  }

  private async _renderCRRScreen(projectId: string): Promise<void> {
    // Hide all product UI areas
    if (this._subDom.productGenerateArea) this._subDom.productGenerateArea.classList.add('hidden');
    if (this._subDom.productPreviewArea) this._subDom.productPreviewArea.classList.add('hidden');
    if (this._subDom.productNotStarted) this._subDom.productNotStarted.classList.add('hidden');

    const crrId = 'crr-screen';
    const existing = this._container.querySelector(`#${crrId}`);
    if (existing) existing.remove();

    const crr = document.createElement('div');
    crr.id = crrId;
    crr.className = 'p-6 bg-white border border-gray-200 rounded-xl shadow-sm mt-4';
    crr.innerHTML = `
      <h2 class="text-xl font-bold text-gray-800 mb-2">Revisión de Preparación para Certificación</h2>
      <p class="text-gray-600 text-sm mb-4">Se revisarán los 8 productos contra los criterios EC0366 antes de iniciar el expediente oficial.</p>
      <div id="crr-loading" class="text-gray-500 text-sm">Consultando motor de certificación...</div>
      <div id="crr-content" class="hidden"></div>
    `;
    this._container.appendChild(crr);

    const loadingEl = crr.querySelector<HTMLElement>('#crr-loading')!;
    const contentEl = crr.querySelector<HTMLElement>('#crr-content')!;

    try {
      const res = await getData<any>(buildEndpoint(`/api/certification-status/${projectId}`));
      const data = res.data ?? res;
      const { products = {}, projectCertScore = {}, certificable = false } = data;

      const AXIS_LABELS: Record<string, string> = {
        cobertura: 'Cobertura', bloom: 'Bloom', modalidad: 'Modalidad',
        idioma: 'Idioma', vocabulario: 'Vocabulario', trazabilidad: 'Trazabilidad',
      };
      const axes = Object.entries(AXIS_LABELS)
        .map(([k, label]) => {
          const val = (projectCertScore as any)[k] ?? 0;
          const barCls = val >= 80 ? 'bg-green-500' : val >= 50 ? 'bg-yellow-400' : 'bg-red-500';
          const textCls = val >= 80 ? 'text-green-700' : val >= 50 ? 'text-yellow-700' : 'text-red-700';
          return `<tr>
            <td class="border p-2 text-xs font-medium w-24">${label}</td>
            <td class="border p-2">
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-gray-200 rounded-full h-2">
                  <div class="h-2 rounded-full ${barCls}" style="width:${val}%"></div>
                </div>
                <span class="font-mono text-xs ${textCls} w-10 text-right">${val}%</span>
              </div>
            </td>
          </tr>`;
        }).join('');

      const productRows = ['P1','P2','P3','P4','P5','P6','P7','P8'].map(code => {
        const p = products[code];
        if (!p) return `<tr><td class="border p-2">${code}</td><td class="border p-2 text-gray-400">No generado</td><td class="border p-2 text-red-600">—</td></tr>`;
        const statusCls = p.status === 'valid' ? 'text-green-700' : p.status === 'corrected' ? 'text-yellow-700' : 'text-red-700';
        return `<tr><td class="border p-2">${code}</td><td class="border p-2 ${statusCls}">${p.status}</td><td class="border p-2 font-mono">${p.certScore?.total ?? '—'}%</td></tr>`;
      }).join('');

      const totalScore = (projectCertScore as any).total ?? 0;
      const totalBadgeCls = totalScore >= 80
        ? 'bg-green-100 text-green-800 border-green-300'
        : totalScore >= 50
          ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
          : 'bg-red-100 text-red-800 border-red-300';

      const gateMsg = certificable
        ? '<p class="text-green-700 text-sm font-semibold">✅ Todos los productos cumplen los criterios de certificación. Puedes iniciar el expediente.</p>'
        : '<p class="text-red-700 text-sm font-semibold">⛔ Uno o más productos no cumplen los criterios. Corrígelos antes de iniciar el expediente.</p>';

      contentEl.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 class="font-semibold text-gray-700 mb-2">Score por Eje (Proyecto)</h3>
            <table class="w-full text-xs border-collapse">
              <thead><tr class="bg-gray-100"><th class="border p-2 text-left">Eje</th><th class="border p-2 text-left">Progreso</th></tr></thead>
              <tbody>${axes}</tbody>
              <tfoot>
                <tr class="bg-gray-50">
                  <td class="border p-2 font-bold text-xs">TOTAL</td>
                  <td class="border p-2">
                    <span class="inline-block px-3 py-1 rounded-full text-sm font-bold border ${totalBadgeCls}">${totalScore}%</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div>
            <h3 class="font-semibold text-gray-700 mb-2">Estado por Producto</h3>
            <table class="w-full text-xs border-collapse">
              <thead><tr class="bg-gray-100"><th class="border p-2 text-left">Producto</th><th class="border p-2 text-left">Estado</th><th class="border p-2 text-left">Score</th></tr></thead>
              <tbody>${productRows}</tbody>
            </table>
          </div>
        </div>
        <div class="mb-4">${gateMsg}</div>
        <button id="btn-iniciar-expediente"
          class="px-6 py-3 rounded-lg font-bold text-white ${certificable ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}"
          ${certificable ? '' : 'disabled'}>
          Iniciar Expediente de Certificación →
        </button>
      `;

      loadingEl.classList.add('hidden');
      contentEl.classList.remove('hidden');

      crr.querySelector<HTMLButtonElement>('#btn-iniciar-expediente')?.addEventListener('click', async () => {
        if (!certificable) return;
        wizardStore.setStepStatus(STEP_NUMBER, 'completed');
        const allContent = PRODUCTS.map((p, i) => {
          const prod = this._approvedProducts.get(i);
          return prod ? `---\n# PRODUCTO ${i + 1}: ${p.label}\n\n${prod.content}` : '';
        }).filter(Boolean).join('\n\n');
        wizardStore.setStepDocument(STEP_NUMBER, allContent, 'multi-product');
        const stepId = wizardStore.getState().steps[STEP_NUMBER]?.stepId;
        if (stepId) {
          try { await postData(buildEndpoint(ENDPOINTS.wizard.completeStep), { stepId }); } catch {}
        }
        this._renderProductIndicators();
        crr.innerHTML = '<p class="text-green-700 font-semibold p-4">✅ Expediente iniciado. Continúa al siguiente paso.</p>';
      });
    } catch (err) {
      loadingEl.textContent = `Error al verificar certificación: ${err instanceof Error ? err.message : String(err)}`;
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
        if (this._rejectedProducts.size > 0) {
          const names = [...this._rejectedProducts]
            .map(i => `P${i + 1}`)
            .join(', ');
          showError(`No se puede completar la producción: los productos [${names}] fueron rechazados. Regénéralos antes de continuar.`);
          return;
        }
        // PT-082: Show Certification Readiness Review before marking step complete
        const projectId = wizardStore.getState().projectId;
        if (projectId) {
          void this._renderCRRScreen(projectId);
          return;
        }
        wizardStore.setStepStatus(STEP_NUMBER, 'completed');
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
      this._showAprobacionModal(() => this._approveCurrentProduct());
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
      jobHub.activate(projectId);
      await this._checkTemarioGate(projectId);
      await this._checkF3Gate(projectId);
      await this._checkCanonicalSpecGate(projectId);
      await this._loadProductsFromBD(projectId);
      await this._loadProjectSoul(projectId);
    }

    if (!this._temarioConfirmado && projectId) {
      this._renderTemarioGate(projectId);
    } else if (this._temarioConfirmado && !this._f3Valid && projectId) {
      this._renderF3Gate(projectId);
    } else if (this._temarioConfirmado && this._f3Valid && !this._canonicalSpecFrozen && projectId) {
      this._renderCanonicalSpecGate(projectId);
    } else if (this._temarioConfirmado && this._f3Valid && this._canonicalSpecFrozen && projectId) {
      void this._renderConfirmedTemarioPanel(projectId);
    }

    this._config.promptId = PRODUCTS[this._currentProductIndex].promptId;

    this._bindSubDomEvents();
    this._updateProductHeader();
    this._renderProductIndicators();

    const existingProduct = this._approvedProducts.get(this._currentProductIndex);
    if (existingProduct) {
      this._showProductPreview(existingProduct.content);
    } else if (this._temarioConfirmado && this._f3Valid && this._canonicalSpecFrozen) {
      this._showGenerateArea();
    } else {
      if (this._subDom.productGenerateArea) this._subDom.productGenerateArea.classList.add('hidden');
      if (this._subDom.productNotStarted) this._subDom.productNotStarted.classList.remove('hidden');
    }
  }
}

const _instance = new Step5ProductionController();

export const Step5Production = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
