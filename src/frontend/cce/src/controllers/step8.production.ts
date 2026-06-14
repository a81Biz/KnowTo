// src/controllers/step8.production.ts — CCE Step 6: Producción (F4) — Sub-wizard de 7 productos
import { BaseStep } from '../shared/step.base';
import { renderMarkdown, showSuccess } from '@core/ui';
import { wizardStore } from '../stores/wizard.store';
import type { PromptId } from '../types/wizard.types';

const PRODUCTS: Array<{ id: string; promptId: PromptId; label: string }> = [
  { id: 'pac_dc2',               promptId: 'F4_PAC_DC2',               label: 'PAC / DC-2' },
  { id: 'carta_descriptiva',     promptId: 'F4_CARTA_DESCRIPTIVA',     label: 'Carta Descriptiva' },
  { id: 'manual_participante',   promptId: 'F4_MANUAL_PARTICIPANTE',   label: 'Manual del Participante' },
  { id: 'instrumentos_evaluacion', promptId: 'F4_INSTRUMENTOS_EVALUACION', label: 'Instrumentos de Evaluación' },
  { id: 'materiales_apoyo',      promptId: 'F4_MATERIALES_APOYO',      label: 'Materiales de Apoyo' },
  { id: 'dc5_constancia',        promptId: 'F4_DC5_CONSTANCIA',        label: 'DC-5 / Constancia' },
  { id: 'informe_ejecutivo',     promptId: 'F4_INFORME_EJECUTIVO',     label: 'Informe Ejecutivo' },
];

class Step8ProductionController extends BaseStep {
  private _activeProductIdx = 0;

  private _subDom: {
    productIndicators?: HTMLElement;
    productElementLabel?: HTMLElement;
    productTitle?: HTMLElement;
    productCounter?: HTMLElement;
    productStatusBadge?: HTMLElement;
    productGenerateArea?: HTMLElement;
    btnGenerateProduct?: HTMLButtonElement;
    btnApproveProduct?: HTMLButtonElement;
    btnFinishProduction?: HTMLButtonElement;
  } = {};

  constructor() {
    super({
      stepNumber: 6,
      templateId: 'tpl-step8-production',
      phaseId: 'F4',
      promptId: 'F4', // Default, se sobrescribe en _generateProduct
      uiConfig: { loadingText: 'Generando producto con IA...' },
    });
  }

  // Override BaseStep submit behavior
  protected override _bindEvents(): void {
    super._bindEvents(); // handles #btn-copy-doc, #btn-regenerate
    
    // Prevent default form submission from bubbling if someone presses Enter
    this._dom.form?.addEventListener('submit', (e) => e.preventDefault());

    this._subDom.btnGenerateProduct?.addEventListener('click', () => {
      void this._generateActiveProduct();
    });

    this._dom.btnRegenerate?.addEventListener('click', () => {
      void this._generateActiveProduct({ regenerate: true });
    });

    this._subDom.btnApproveProduct?.addEventListener('click', () => {
      this._approveActiveProduct();
    });

    this._subDom.btnFinishProduction?.addEventListener('click', () => {
      this._finishSubWizard();
    });
  }

  override _cacheDOM(): void {
    super._cacheDOM();
    const q = <T extends HTMLElement>(s: string) => this._container.querySelector<T>(s) ?? undefined;
    
    this._subDom.productIndicators = q('#product-indicators');
    this._subDom.productElementLabel = q('#product-element-label');
    this._subDom.productTitle = q('#product-title');
    this._subDom.productCounter = q('#product-counter');
    this._subDom.productStatusBadge = q('#product-status-badge');
    this._subDom.productGenerateArea = q('#product-generate-area');
    this._subDom.btnGenerateProduct = q<HTMLButtonElement>('#btn-generate-product');
    this._subDom.btnApproveProduct = q<HTMLButtonElement>('#btn-approve-product');
    this._subDom.btnFinishProduction = q<HTMLButtonElement>('#btn-finish-production');
  }

  // ── ESTADO DE PRODUCTOS ──────────────────────────────────────────────────

  private _ensureProductsState(): void {
    const s = wizardStore.getState();
    if (!s.productionData || !s.productionData.products || s.productionData.products.length === 0) {
      wizardStore.setStepData(6, {
        products: PRODUCTS.map(p => ({
          id: p.id,
          name: p.label,
          approved: false,
        }))
      });
    }
  }

  private _updateProductInStore(productId: string, partial: Partial<{content: string, documentId: string, approved: boolean}>): void {
    const s = wizardStore.getState();
    const prods = s.productionData?.products ?? [];
    const idx = prods.findIndex(p => p.id === productId);
    if (idx > -1) {
      prods[idx] = { ...prods[idx]!, ...partial };
      wizardStore.setStepData(6, { products: prods });
    }
  }

  private _getProductState(idx: number) {
    const s = wizardStore.getState();
    return s.productionData?.products?.[idx];
  }

  // ── RENDER UI ────────────────────────────────────────────────────────────

  private _renderProductIndicators(): void {
    if (!this._subDom.productIndicators) return;
    this._subDom.productIndicators.innerHTML = PRODUCTS.map((prod, i) => {
      const state = this._getProductState(i);
      const isCurrent = i === this._activeProductIdx;
      const isApproved = state?.approved;
      const hasContent = !!state?.content;
      
      let cls = 'product-indicator ';
      if (isCurrent) cls += 'current';
      else if (isApproved) cls += 'done';
      else if (hasContent) cls += 'pending'; // Generated but not approved
      else cls += 'pending opacity-60';

      return `<button class="${cls}" data-prod-idx="${i}" title="${prod.label}">
        ${isApproved ? '✓' : String(i + 1)} ${prod.label.split(' ')[0]}
      </button>`;
    }).join('');

    this._subDom.productIndicators.querySelectorAll('[data-prod-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this._activeProductIdx = Number((btn as HTMLElement).dataset['prodIdx']);
        this._updateUI();
      });
    });
  }

  private _updateUI(): void {
    this._renderProductIndicators();
    const prodDef = PRODUCTS[this._activeProductIdx]!;
    const state = this._getProductState(this._activeProductIdx);
    
    // Header
    if (this._subDom.productElementLabel) {
      this._subDom.productElementLabel.textContent = `Producto ${this._activeProductIdx + 1} de ${PRODUCTS.length}`;
    }
    if (this._subDom.productTitle) {
      this._subDom.productTitle.textContent = prodDef.label;
    }
    if (this._subDom.productCounter) {
      const approvedCount = wizardStore.getState().productionData?.products.filter(p => p.approved).length ?? 0;
      this._subDom.productCounter.textContent = `${approvedCount} / ${PRODUCTS.length} Aprobados`;
    }

    // Status Badge
    if (this._subDom.productStatusBadge) {
      if (state?.approved) {
        this._subDom.productStatusBadge.classList.remove('hidden');
      } else {
        this._subDom.productStatusBadge.classList.add('hidden');
      }
    }

    // Panels
    const hasContent = !!state?.content;
    const isApproved = !!state?.approved;

    if (hasContent) {
      this._subDom.productGenerateArea?.classList.add('hidden');
      this._dom.previewPanel?.classList.remove('hidden');
      if (this._dom.documentPreview) {
        this._dom.documentPreview.innerHTML = renderMarkdown(state.content!);
      }
      // Approve button visibility
      if (this._subDom.btnApproveProduct) {
        this._subDom.btnApproveProduct.classList.toggle('hidden', isApproved);
      }
    } else {
      this._subDom.productGenerateArea?.classList.remove('hidden');
      this._dom.previewPanel?.classList.add('hidden');
    }
    
    // El botón general BaseStep submit no se usa nativamente, ocultamos text loading etc
  }

  // ── LÓGICA DE NEGOCIO ────────────────────────────────────────────────────

  private async _generateActiveProduct(opts: { regenerate?: boolean } = {}): Promise<void> {
    const prod = PRODUCTS[this._activeProductIdx]!;
    
    // Alter prompt temporalmente
    const basePromptId = this._config.promptId;
    this._config.promptId = prod.promptId;
    
    // Si regenerating, pierde aprobación antes de iniciar
    if (opts.regenerate) {
      this._updateProductInStore(prod.id, { approved: false, content: '' });
      this._updateUI();
    }

    // Call base generate
    await super._generateDocument({}, { regenerate: opts.regenerate });
    
    // Restore prompt
    this._config.promptId = basePromptId;

    // Recuperamos el HTML / content del wizardStore
    // Super setea en `wizardStore.setStepDocument(6, content)`. Lo pasamos al store individual.
    const stepState = wizardStore.getState().steps[6];
    if (stepState?.documentContent) {
      this._updateProductInStore(prod.id, {
        content: stepState.documentContent,
        documentId: stepState.documentId,
        approved: false // requiere validación manual
      });
      // Limpiamos el step para no confundir
      wizardStore.setStepDocument(6, '', '');
    }
    
    this._updateUI();
  }

  private _approveActiveProduct(): void {
    const prod = PRODUCTS[this._activeProductIdx]!;
    this._updateProductInStore(prod.id, { approved: true });
    showSuccess(`${prod.label} aprobado correctamente.`);
    
    // Auto-avanzar al siguiente si hay
    if (this._activeProductIdx < PRODUCTS.length - 1) {
      this._activeProductIdx++;
    }
    this._updateUI();
  }

  private _finishSubWizard(): void {
    const state = wizardStore.getState();
    const products = state.productionData?.products ?? [];
    const nonApproved = products.filter(p => !p.approved);

    if (nonApproved.length > 0) {
      const names = nonApproved.map(p => p.name).join(', ');
      if (!confirm(`Tienes ${nonApproved.length} productos sin aprobar (${names}). ¿Deseas saltarlos y continuar de todos modos?`)) {
        return;
      }
    }

    // Trigger main workflow event
    document.getElementById('btn-next-step')?.click();
  }

  private _prefillFromContext(): void {
    const state = wizardStore.getState();
    const cd = state.clientData;

    const nameInput = this._container.querySelector<HTMLInputElement>('[name="programName"]');
    if (nameInput && !nameInput.value) {
      const name = cd.projectName || (cd.mainObjective ? cd.mainObjective.slice(0, 60).trim() : '');
      if (name) nameInput.value = name;
    }

    const durationInput = this._container.querySelector<HTMLInputElement>('[name="totalDuration"]');
    if (durationInput && !durationInput.value && cd.timeframe) {
      durationInput.value = cd.timeframe;
    }
  }

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container);
    this._ensureProductsState();
    this._prefillFromContext();
    this._updateUI();
  }
}

const _instance = new Step8ProductionController();
export const Step8Production = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
