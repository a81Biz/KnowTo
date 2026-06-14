// src/controllers/step7.strategy.ts — CCE Step 5 (renumbered): Estrategia pedagógica (F2_5) + Especificaciones (F3)
//
// Flujo:
//   1. mount() → BaseStep._ensureExtractedContext() llama /extract con EXTRACTOR_F2_5
//      → obtiene F2 (intervenciones priorizadas) + datos del cliente
//   2. _prefillFromContext() → pre-llena:
//      • modality         ← inferida de hasLMS / hasTrainingFacilities
//      • availability     ← trainingAvailability del cliente
//      • methodologies    ← sugeridas por el contexto extraído
//   3. El consultor revisa / edita
//   4. "Generar Estrategia" → F2_5  |  "Generar Especificaciones" → F3

import { BaseStep } from '../shared/step.base';
import { postData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from '../shared/endpoints';
import { showLoading, hideLoading, showError, renderMarkdown } from '@core/ui';
import { wizardStore } from '../stores/wizard.store';
import type { PromptId } from '../types/wizard.types';

class Step7StrategyController extends BaseStep {
  private _specsContent = '';

  private _subDom: {
    tabPedagogy?: HTMLButtonElement;
    tabSpecs?: HTMLButtonElement;
    panelPedagogy?: HTMLElement;
    panelSpecs?: HTMLElement;
    formSpecs?: HTMLFormElement;
    btnSubmitSpecs?: HTMLButtonElement;
    previewPanelSpecs?: HTMLElement;
    documentPreviewSpecs?: HTMLElement;
    btnCopySpecs?: HTMLButtonElement;
    btnRegenerateSpecs?: HTMLButtonElement;
    // prefill fields
    modalitySelect?: HTMLSelectElement;
    methodologiesInput?: HTMLInputElement;
    availabilityInput?: HTMLInputElement;
    contextBadge?: HTMLElement;
  } = {};

  constructor() {
    super({
      stepNumber: 5,
      templateId: 'tpl-step7-strategy',
      phaseId: 'F2_5',
      promptId: 'F2_5',
      uiConfig: { loadingText: 'Generando Estrategia Pedagógica (F2.5)...' },
    });
  }

  // Called by BaseStep._cacheDOM() chain so _subDom is ready before _bindEvents()
  override _cacheDOM(): void {
    super._cacheDOM();
    this._cacheSubDom();
  }

  private _cacheSubDom(): void {
    const q = <T extends HTMLElement>(sel: string) =>
      this._container.querySelector<T>(sel) ?? undefined;

    this._subDom.tabPedagogy = q<HTMLButtonElement>('#tab-pedagogy');
    this._subDom.tabSpecs = q<HTMLButtonElement>('#tab-specs');
    this._subDom.panelPedagogy = q('#panel-pedagogy');
    this._subDom.panelSpecs = q('#panel-specs');
    this._subDom.formSpecs = q<HTMLFormElement>('#form-step7-specs');
    this._subDom.btnSubmitSpecs = q<HTMLButtonElement>('#btn-submit-specs');
    this._subDom.previewPanelSpecs = q('#preview-panel-specs');
    this._subDom.documentPreviewSpecs = q('#document-preview-specs');
    this._subDom.btnCopySpecs = q<HTMLButtonElement>('#btn-copy-specs');
    this._subDom.btnRegenerateSpecs = q<HTMLButtonElement>('#btn-regenerate-specs');
    this._subDom.modalitySelect = q<HTMLSelectElement>('[name="modality"]');
    this._subDom.methodologiesInput = q<HTMLInputElement>('[name="methodologies"]');
    this._subDom.availabilityInput = q<HTMLInputElement>('[name="availability"]');
    this._subDom.contextBadge = q('#context-loaded-badge-strategy');
  }

  private _switchTab(tab: 'pedagogy' | 'specs'): void {
    const activeClass = 'text-green-900 border-b-2 border-green-900';
    const inactiveClass = 'text-gray-500 border-b-2 border-transparent hover:text-gray-700';

    if (this._subDom.tabPedagogy) {
      this._subDom.tabPedagogy.className = `px-4 py-2 text-sm font-medium ${tab === 'pedagogy' ? activeClass : inactiveClass}`;
    }
    if (this._subDom.tabSpecs) {
      this._subDom.tabSpecs.className = `px-4 py-2 text-sm font-medium ${tab === 'specs' ? activeClass : inactiveClass}`;
    }
    this._subDom.panelPedagogy?.classList.toggle('hidden', tab !== 'pedagogy');
    this._subDom.panelSpecs?.classList.toggle('hidden', tab !== 'specs');
  }

  private _prefillFromContext(): void {
    const state = wizardStore.getState();
    const cd = state.clientData;
    const extracted = state.extractedContexts[5]?.content ?? '';

    let prefilled = false;

    // ── modality ───────────────────────────────────────────────────────────────
    if (this._subDom.modalitySelect && !this._subDom.modalitySelect.value) {
      let modality = 'hibrido';
      if (cd.hasLMS === 'si') modality = 'en_linea';
      else if (cd.hasTrainingFacilities === 'si') modality = 'presencial';
      else if (cd.hasInternalInstructor === 'si') modality = 'presencial';
      this._subDom.modalitySelect.value = modality;
      prefilled = true;
    }

    // ── availability ────────────────────────────────────────────────────────────
    if (this._subDom.availabilityInput && !this._subDom.availabilityInput.value) {
      const avail = cd.trainingAvailability || cd.timeframe || '';
      if (avail) {
        this._subDom.availabilityInput.value = avail;
        prefilled = true;
      }
    }

    // ── methodologies ──────────────────────────────────────────────────────────
    if (this._subDom.methodologiesInput && !this._subDom.methodologiesInput.value) {
      const methods: string[] = [];
      if (extracted) {
        // Buscar metodologías mencionadas en el contexto extraído
        const lower = extracted.toLowerCase();
        if (/lean|mejora continua|kaizen/.test(lower)) methods.push('Lean / Mejora continua');
        if (/design thinking|pensamiento de diseño/.test(lower)) methods.push('Design Thinking');
        if (/coaching/.test(lower)) methods.push('Coaching');
        if (/mentoring|mentoría/.test(lower)) methods.push('Mentoring');
        if (/taller|workshop/.test(lower)) methods.push('Talleres prácticos');
        if (/e-learning|en línea|plataforma/.test(lower)) methods.push('E-learning');
        if (/on.?the.?job|en el puesto/.test(lower)) methods.push('Capacitación en el puesto');
      }
      // Defaults basados en datos del cliente
      if (methods.length === 0) {
        if (cd.sector?.toLowerCase().includes('manufactura') || cd.sector?.toLowerCase().includes('producción')) {
          methods.push('Capacitación técnica en el puesto', 'Talleres prácticos');
        } else if (cd.sector?.toLowerCase().includes('servicio') || cd.sector?.toLowerCase().includes('comercio')) {
          methods.push('Aprendizaje experiencial', 'Role-playing', 'Coaching');
        } else {
          methods.push('Aprendizaje experiencial', 'Talleres prácticos');
        }
      }
      if (methods.length > 0) {
        this._subDom.methodologiesInput.value = methods.join(', ');
        prefilled = true;
      }
    }

    if (prefilled) {
      this._subDom.contextBadge?.classList.remove('hidden');
    }
  }

  private async _generateSpecs(formData: Record<string, unknown>): Promise<void> {
    const state = wizardStore.getState();
    if (!state.projectId) { showError('No hay proyecto activo.'); return; }

    let stepId = state.steps[5]?.stepId;
    stepId = await this._ensureStepId(state.projectId, formData) ?? stepId;
    if (!stepId) { showError('No se pudo registrar el paso.'); return; }

    if (this._subDom.btnSubmitSpecs) {
      this._subDom.btnSubmitSpecs.disabled = true;
      this._subDom.btnSubmitSpecs.textContent = '⏳ Generando...';
    }
    showLoading('Generando Especificaciones Técnicas (F3)...');

    try {
      const context = wizardStore.buildContext(5) as {
        projectName: string; clientName: string; companyName?: string; sector?: string;
        email?: string; previousData?: Record<string, unknown>;
      };

      const res = await postData<{ documentId: string; content: string }>(
        buildEndpoint(ENDPOINTS.wizard.generate),
        {
          projectId: state.projectId,
          stepId,
          phaseId: 'F3',
          promptId: 'F3' as PromptId,
          context,
          userInputs: formData,
        }
      );

      if (res.data) {
        this._specsContent = res.data.content;
        if (this._subDom.documentPreviewSpecs) {
          this._subDom.documentPreviewSpecs.innerHTML = renderMarkdown(res.data.content);
        }
        this._subDom.previewPanelSpecs?.classList.remove('hidden');

        const pedagogyStep = wizardStore.getState().steps[5];
        wizardStore.setStepData(5, {
          pedagogyContent: pedagogyStep?.documentContent,
          pedagogyDocumentId: pedagogyStep?.documentId,
          specsContent: res.data.content,
          specsDocumentId: res.data.documentId ?? '',
        });
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al generar las especificaciones');
    } finally {
      if (this._subDom.btnSubmitSpecs) {
        this._subDom.btnSubmitSpecs.disabled = false;
        this._subDom.btnSubmitSpecs.textContent = '✨ Generar Especificaciones con IA';
      }
      hideLoading();
    }
  }

  override _bindEvents(): void {
    super._bindEvents();

    this._subDom.tabPedagogy?.addEventListener('click', () => this._switchTab('pedagogy'));
    this._subDom.tabSpecs?.addEventListener('click', () => this._switchTab('specs'));

    this._subDom.formSpecs?.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData: Record<string, unknown> = {};
      new FormData(this._subDom.formSpecs!).forEach((v, k) => { formData[k] = v; });
      void this._generateSpecs(formData);
    });

    this._subDom.btnCopySpecs?.addEventListener('click', () => {
      if (this._specsContent) {
        navigator.clipboard.writeText(this._specsContent).catch(() => { /* silent */ });
      }
    });

    this._subDom.btnRegenerateSpecs?.addEventListener('click', () => {
      const formData: Record<string, unknown> = {};
      new FormData(this._subDom.formSpecs!).forEach((v, k) => { formData[k] = v; });
      void this._generateSpecs(formData);
    });
  }

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container);
    // _cacheSubDom() already called via _cacheDOM() override → _bindEvents() is correct

    // Restaurar specs si existen
    const saved = wizardStore.getStepData<{ specsContent: string }>(5);
    if (saved?.specsContent && this._subDom.documentPreviewSpecs) {
      this._specsContent = saved.specsContent;
      this._subDom.documentPreviewSpecs.innerHTML = renderMarkdown(saved.specsContent);
      this._subDom.previewPanelSpecs?.classList.remove('hidden');
    }

    // Pre-llenar si no hay documento generado aún
    const step = wizardStore.getState().steps[5];
    if (!step?.documentContent) {
      this._prefillFromContext();
    }

    this._switchTab('pedagogy');
  }
}

const _instance = new Step7StrategyController();
export const Step7Strategy = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
