// src/controllers/step4.production.ts
// HTML en: /templates/tpl-step4-production.html
//
// Sub-wizard de F4: genera los 8 productos EC0366 de forma secuencial.
// Cada producto usa su propio promptId (F4_P0 ... F4_P7).
// El usuario aprueba cada producto antes de continuar al siguiente.
// Todos los productos se acumulan en wizardStore como documentos separados.

import { BaseStep } from '../shared/step.base';
import { postData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from '../shared/endpoints';
import { showLoading, hideLoading, showError, renderMarkdown } from '@core/ui';
import { wizardStore } from '../stores/wizard.store';
import type { PromptId } from '../types/wizard.types';

const STEP_NUMBER = 5;

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
    productionFormContainer?: HTMLElement;
  } = {};

  constructor() {
    super({
      stepNumber: STEP_NUMBER,
      templateId: 'tpl-step4-production',
      phaseId: 'F4',
      promptId: 'F4_P0',
      uiConfig: { loadingText: 'Generando producto...' },
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
    this._subDom.productionFormContainer = this._container.querySelector('#production-form-container') ?? undefined;
  }

  private _renderProductIndicators(): void {
    if (!this._subDom.productIndicators) return;
    this._subDom.productIndicators.innerHTML = PRODUCTS.map((p, i) => {
      const approved = this._approvedProducts.has(i);
      const isCurrent = i === this._currentProductIndex;
      const cls = approved
        ? 'bg-green-100 text-green-800 border border-green-300'
        : isCurrent
          ? 'bg-blue-100 text-blue-800 border border-blue-500 font-semibold'
          : 'bg-gray-100 text-gray-400 border border-gray-200';
      return `<span class="px-2 py-1 rounded text-xs ${cls}" title="${p.label}">
        ${approved ? '✓' : String(i)} ${p.label.split(' ').slice(0, 2).join(' ')}
      </span>`;
    }).join('');
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
    showLoading(`Generando ${product.label}...`);

    try {
      const context = wizardStore.buildContext(STEP_NUMBER) as {
        projectName: string; clientName: string; industry?: string; email?: string; previousData?: Record<string, unknown>;
      };
      const userInputs = { ...this._sharedFormData, currentProductIndex: this._currentProductIndex };

      const res = await postData<{ documentId: string; content: string }>(
        buildEndpoint(ENDPOINTS.wizard.generate),
        {
          projectId: state.projectId,
          stepId,
          phaseId: 'F4',
          promptId: product.promptId,
          context,
          userInputs,
        }
      );

      if (res.data) {
        this._approvedProducts.set(this._currentProductIndex, {
          content: res.data.content,
          documentId: res.data.documentId,
        });
        this._showProductPreview(res.data.content);
        this._renderProductIndicators();
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al generar el producto');
    } finally {
      this._setLoading(false);
      hideLoading();
    }
  }

  private _approveCurrentProduct(): void {
    // Ya fue guardado al generarse — avanzar al siguiente producto
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
      this._renderProductIndicators();

      if (this._subDom.productCounter) {
        this._subDom.productCounter.textContent = `${PRODUCTS.length} / ${PRODUCTS.length} ✓`;
      }
      if (this._subDom.productTitle) {
        this._subDom.productTitle.textContent = '¡Todos los productos completados!';
      }
    }
  }

  override _bindEvents(): void {
    // Sobreescribir: el submit genera el producto actual, no el documento completo
    this._dom.form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this._sharedFormData = this._collectFormData();
      void this._generateCurrentProduct();
    });

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

    this._dom.btnRegenerate?.addEventListener('click', () => {
      void this._generateCurrentProduct();
    });
  }

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container);
    this._cacheSubDom();

    // Restaurar estado previo si existe
    const stepData = wizardStore.getState().steps[STEP_NUMBER];
    if (stepData?.inputData) {
      this._sharedFormData = stepData.inputData;
    }

    this._updateProductHeader();
    this._renderProductIndicators();
    this._showGenerateArea();
  }
}

// ── Exportación ──────────────────────────────────────────────────────────────

const _instance = new Step5ProductionController();

export const Step5Production = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
