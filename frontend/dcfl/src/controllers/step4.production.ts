// src/controllers/step4.production.ts
// HTML en: /templates/tpl-step4-production.html
//
// Sub-wizard de F4: genera los 8 productos EC0366 de forma secuencial.
// Cada producto usa su propio promptId (F4_P0 ... F4_P7).
// El usuario aprueba cada producto antes de continuar al siguiente.
// Todos los productos se acumulan en wizardStore como documentos separados.

import { BaseStep } from '../shared/step.base';
import { postData, getData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from '../shared/endpoints';
import { showLoading, hideLoading, showError, renderMarkdown, printDocument } from '@core/ui';
import { wizardStore } from '../stores/wizard.store';
import type { PromptId } from '../types/wizard.types';
import { subscribeToJob } from '../shared/supabase.realtime';

interface F4ProductoBD {
  id: string;
  producto: string;          // 'P0'..'P7'
  documento_final: string | null;
  validacion_estado: string; // 'aprobado' | 'revision_humana' | 'pendiente'
  validacion_errores: Record<string, unknown> | null;
  job_id: string | null;
}

const STEP_NUMBER = 6;

const PRODUCTS: Array<{ promptId: PromptId; label: string; elementoEC: string }> = [
  { promptId: 'F4_P0', label: 'Cronograma de Desarrollo',         elementoEC: 'E1219 — Producto #1' },
  { promptId: 'F4_P1', label: 'Documento de Información General',  elementoEC: 'E1219 — Producto #2' },
  { promptId: 'F4_P2', label: 'Guías de Actividades por Módulo',   elementoEC: 'E1220 — Producto #1' },
  { promptId: 'F4_P3', label: 'Calendario General de Actividades', elementoEC: 'E1220 — Producto #2' },
  { promptId: 'F4_P4', label: 'Documentos de Texto',               elementoEC: 'E1220 — Producto #3' },
  { promptId: 'F4_P5', label: 'Presentación Electrónica',          elementoEC: 'E1220 — Producto #4' },
  { promptId: 'F4_P6', label: 'Guiones de Material Multimedia',    elementoEC: 'E1220 — Producto #5' },
  { promptId: 'F4_P7', label: 'Instrumentos de Evaluación',        elementoEC: 'E1220 — Producto #6' },
];

class Step5ProductionController extends BaseStep {
  private _currentProductIndex = 0;
  private _approvedProducts: Map<number, { content: string; documentId: string }> = new Map();
  private _sharedFormData: Record<string, unknown> = {};
  /** Índices de productos con validacion_estado = 'revision_humana' (requieren revisión manual) */
  private _validationWarnings: Set<number> = new Set();

  // DOM específico del sub-wizard
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
      promptId: 'F4_P0',
      uiConfig: {
        loadingText: 'Generando producto...',
        helpText: 'Genera los 8 productos obligatorios del EC0366 de forma secuencial. Cada producto se revisa y aprueba antes de continuar al siguiente. Los productos aprobados quedan guardados en tu expediente.',
      },
    });
  }

  private _cacheSubDom(): void {
    this._subDom.productIndicators       = this._container.querySelector('#product-indicators') ?? undefined;
    this._subDom.productElementLabel     = this._container.querySelector('#product-element-label') ?? undefined;
    this._subDom.productTitle            = this._container.querySelector('#product-title') ?? undefined;
    this._subDom.productCounter          = this._container.querySelector('#product-counter') ?? undefined;
    this._subDom.productNotStarted       = this._container.querySelector('#product-not-started') ?? undefined;
    this._subDom.productPreviewArea      = this._container.querySelector('#product-preview-area') ?? undefined;
    this._subDom.productDocumentPreview  = this._container.querySelector('#product-document-preview') ?? undefined;
    this._subDom.productGenerateArea     = this._container.querySelector('#product-generate-area') ?? undefined;
    this._subDom.btnApproveProduct       = this._container.querySelector('#btn-approve-product') ?? undefined;
    this._subDom.btnPrintProduct         = this._container.querySelector('#btn-print-product') ?? undefined;
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
          ? 'bg-yellow-100 text-yellow-800 border border-yellow-400'
          : 'bg-green-100 text-green-800 border border-green-300'
        : isCurrent
          ? 'bg-blue-100 text-blue-800 border border-blue-500 font-semibold'
          : 'bg-gray-100 text-gray-400 border border-gray-200';
      const icon = approved ? (hasWarning ? '⚠' : '✓') : String(i);
      return `<span class="px-2 py-1 rounded text-xs ${cls}" title="${p.label}${hasWarning ? ' — Requiere revisión manual' : ''}">
        ${icon} ${p.label.split(' ').slice(0, 2).join(' ')}
      </span>`;
    }).join('');
  }

  /** Muestra u oculta el badge de advertencia de validación sobre el botón Aprobar */
  private _updateValidationBadge(): void {
    const hasWarning = this._validationWarnings.has(this._currentProductIndex);
    const existing = this._subDom.productPreviewArea?.querySelector('#validation-warning-badge');
    if (hasWarning && !existing && this._subDom.btnApproveProduct) {
      const badge = document.createElement('div');
      badge.id = 'validation-warning-badge';
      badge.className = 'mb-3 p-3 bg-yellow-50 border border-yellow-300 rounded text-yellow-800 text-sm';
      badge.innerHTML = `
        <strong>⚠ Revisión recomendada</strong><br>
        El validador automático detectó que este producto puede tener campos incompletos.
        Revisa el contenido antes de aprobar o regenera para obtener una versión mejor.
      `;
      this._subDom.btnApproveProduct.insertAdjacentElement('beforebegin', badge);
    } else if (!hasWarning && existing) {
      existing.remove();
    }
  }

  /**
   * Carga productos ya generados desde BD (GET /fase4/productos).
   * Permite reanudar el sub-wizard en una sesión interrumpida.
   */
  private async _loadProductsFromBD(projectId: string): Promise<void> {
    try {
      const res = await getData<{ productos: F4ProductoBD[] }>(
        buildEndpoint(ENDPOINTS.wizard.fase4Productos(projectId))
      );
      const productos = res.data?.productos ?? [];
      if (productos.length === 0) return;

      let maxApprovedIndex = -1;
      for (const p of productos) {
        const idx = parseInt(p.producto.replace('P', ''), 10);
        if (isNaN(idx) || !p.documento_final) continue;

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
        // Avanzar al siguiente producto no aprobado
        this._currentProductIndex = Math.min(maxApprovedIndex + 1, PRODUCTS.length - 1);
        // Si el último ya fue aprobado, quedarse en él para ver el resumen
        if (maxApprovedIndex === PRODUCTS.length - 1) {
          this._currentProductIndex = PRODUCTS.length - 1;
        }
        console.log(`[F4] Restaurados ${this._approvedProducts.size} producto(s) desde BD. Continuando desde P${this._currentProductIndex}.`);
      }
    } catch (err) {
      // No abortar si falla la carga — se inicia fresh
      console.warn('[F4] No se pudieron cargar productos desde BD:', err);
    }
  }

  private _updateProductHeader(): void {
    const product = PRODUCTS[this._currentProductIndex];
    if (!product) return;
    if (this._subDom.productElementLabel) this._subDom.productElementLabel.textContent = product.elementoEC;
    if (this._subDom.productTitle) this._subDom.productTitle.textContent = `Producto ${this._currentProductIndex}: ${product.label}`;
    if (this._subDom.productCounter) this._subDom.productCounter.textContent = `${this._approvedProducts.size} / ${PRODUCTS.length}`;
  }

  private _showProductPreview(content: string): void {
    if (this._subDom.productNotStarted) this._subDom.productNotStarted.classList.add('hidden');
    if (this._subDom.productGenerateArea) this._subDom.productGenerateArea.classList.add('hidden');
    if (this._subDom.productPreviewArea) this._subDom.productPreviewArea.classList.remove('hidden');
    if (this._subDom.productDocumentPreview) {
      this._subDom.productDocumentPreview.innerHTML = renderMarkdown(content);
    }
    this._updateValidationBadge();
  }

  private _showGenerateArea(): void {
    if (this._subDom.productNotStarted) this._subDom.productNotStarted.classList.add('hidden');
    if (this._subDom.productPreviewArea) this._subDom.productPreviewArea.classList.add('hidden');
    if (this._subDom.productGenerateArea) this._subDom.productGenerateArea.classList.remove('hidden');
  }

  private async _generateCurrentProduct(): Promise<void> {
    const product = PRODUCTS[this._currentProductIndex];
    if (!product) return;

    const state = wizardStore.getState();
    if (!state.projectId) { showError('No hay proyecto activo.'); return; }

    // Registrar step si no tiene ID
    let stepId = state.steps[STEP_NUMBER]?.stepId;
    if (!stepId) {
      try {
        const formData = this._collectFormData();
        this._sharedFormData = { ...this._sharedFormData, ...formData };
        const res = await postData<{ stepId: string }>(
          buildEndpoint(ENDPOINTS.wizard.saveStep),
          { projectId: state.projectId, stepNumber: STEP_NUMBER, inputData: this._sharedFormData }
        );
        if (res.data?.stepId) {
          stepId = res.data.stepId;
          wizardStore.setStepId(STEP_NUMBER, stepId);
        }
      } catch { /* continuar */ }
    }
    if (!stepId) { showError('No se pudo registrar el paso. Intenta de nuevo.'); return; }

    // Ocultar formulario de datos compartidos después del primer producto
    if (this._currentProductIndex > 0 && this._subDom.productionFormContainer) {
      this._subDom.productionFormContainer.classList.add('hidden');
    }

    this._setLoading(true);
    showLoading(`⏳ Generando ${product.label}... \nIniciando proceso concurrente en background...`);

    try {
      const context = wizardStore.buildContext(STEP_NUMBER) as {
        projectName: string; clientName: string; industry?: string; email?: string; previousData?: Record<string, unknown>;
      };
      const userInputs = { ...this._sharedFormData, currentProductIndex: this._currentProductIndex };

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

        // Limpiar suscripción previa si hubiere
        this._jobSubscription?.cancel();

        this._jobSubscription = subscribeToJob(
          jobId,
          (result) => {
            const idx = this._currentProductIndex;
            this._approvedProducts.set(idx, {
              content: result.content as string,
              documentId: result.documentId as string,
            });
            // Detectar si el backend marcó este producto como revisión_humana
            // (el job result puede incluir metadata de validación si la ruta la expone)
            const meta = result as Record<string, unknown>;
            if (meta.validacion_estado === 'revision_humana') {
              this._validationWarnings.add(idx);
            }
            this._showProductPreview(result.content as string);
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
              const { currentStep, stepIndex, totalSteps } = job.progress;
              showLoading(`⏳ Generando ${product.label}... \n(${currentStep} - paso ${stepIndex + 1}/${totalSteps})`);
            } else {
              showLoading(`⏳ Generando ${product.label}... \nPuedes seguir el progreso detallado en el backend.`);
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
    // Ya fue guardado en el store local durante la generación — avanzar al siguiente producto
    if (this._currentProductIndex < PRODUCTS.length - 1) {
      this._currentProductIndex++;
      this._updateProductHeader();
      this._showGenerateArea();
      this._renderProductIndicators();
    } else {
      // Todos aprobados — marcar el step como completado con contenido concatenado
      const allContent = PRODUCTS.map((p, i) => {
        const prod = this._approvedProducts.get(i);
        return prod ? `---\n# PRODUCTO ${i}: ${p.label}\n\n${prod.content}` : '';
      }).filter(Boolean).join('\n\n');

      wizardStore.setStepDocument(STEP_NUMBER, allContent, 'multi-product');
      wizardStore.setStepStatus(STEP_NUMBER, 'completed');
      this._renderProductIndicators();

      if (this._subDom.productCounter) {
        this._subDom.productCounter.textContent = `${PRODUCTS.length} / ${PRODUCTS.length} ✓`;
      }
      if (this._subDom.productTitle) {
        this._subDom.productTitle.textContent = '¡Todos los productos completados!';
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
    // Solo eventos sobre _dom (disponibles antes del cacheSubDom).
    // Los eventos de _subDom se enlazan en mount() tras _cacheSubDom().
    this._dom.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this._sharedFormData = this._collectFormData();
      void this._generateCurrentProduct();
    });

    // Fallback: el HTML5 form="form-step5" debería lanzar submit, pero si falla:
    this._dom.btnSubmit?.addEventListener('click', (e) => {
      if (!this._dom.form?.checkValidity()) {
        this._dom.form?.reportValidity();
        return;
      }
      e.preventDefault();
      this._sharedFormData = this._collectFormData();
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
        navigator.clipboard.writeText(prod.content)
          .then(() => { /* éxito silencioso */ })
          .catch(() => showError('No se pudo copiar al portapapeles.'));
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
    await super.mount(container);
    this._cacheSubDom();

    // Restaurar datos del formulario compartido si existen
    const stepData = wizardStore.getState().steps[STEP_NUMBER];
    if (stepData?.inputData) {
      this._sharedFormData = stepData.inputData;
    }

    // Intentar reanudar desde BD (carga productos ya generados en sesiones anteriores)
    const projectId = wizardStore.getState().projectId;
    if (projectId) {
      await this._loadProductsFromBD(projectId);
    }

    this._bindSubDomEvents();
    this._updateProductHeader();
    this._renderProductIndicators();

    // Si el producto actual ya fue aprobado (reanudando sesión), mostrar su preview
    const existingProduct = this._approvedProducts.get(this._currentProductIndex);
    if (existingProduct) {
      this._showProductPreview(existingProduct.content);
    } else {
      this._showGenerateArea();
    }

    // Ocultar formulario de datos si ya pasamos del primer producto
    if (this._currentProductIndex > 0 && this._subDom.productionFormContainer) {
      this._subDom.productionFormContainer.classList.add('hidden');
    }
  }
}

// ── Exportación ──────────────────────────────────────────────────────────────

const _instance = new Step5ProductionController();

export const Step5Production = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
