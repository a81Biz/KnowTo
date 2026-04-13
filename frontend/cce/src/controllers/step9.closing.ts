// src/controllers/step9.closing.ts — CCE Step 7 (renumbered): Verificación + Pruebas + Ajustes + Cierre
//
// Sub-fases: F5 (Verificación), F5_TEST_REPORT (Reporte de pruebas), F6 (Ajustes), CLOSE (Cierre)
//
// Prefill:
//   • successCriteria  ← clientData.measurableResult
//   • measurementTools ← sugeridos por tipo de intervención (extractedContexts[7])

import { BaseStep } from '../shared/step.base';
import { postData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from '../shared/endpoints';
import { showLoading, hideLoading, showError, renderMarkdown } from '@core/ui';
import { wizardStore } from '../stores/wizard.store';
import { renderFormSchema, collectFormAnswers, restoreFormAnswers } from '../components/form-renderer';
import type { DynamicFormSchema, PromptId } from '../types/wizard.types';

type SubTab = 'verification' | 'test-report' | 'adjustments' | 'close';

class Step9ClosingController extends BaseStep {
  private _testReportSchema: DynamicFormSchema | null = null;
  private _adjustmentsContent = '';

  private _subDom: {
    subtabBtns?: NodeListOf<HTMLButtonElement>;
    panels?: Record<SubTab, HTMLElement | undefined>;
    // Test report
    testFormGenerating?: HTMLElement;
    testFormReady?: HTMLElement;
    testFormError?: HTMLElement;
    testReportSaved?: HTMLElement;
    testFormContainer?: HTMLElement;
    btnRegenerateTestForm?: HTMLButtonElement;
    btnSaveTestReport?: HTMLButtonElement;
    btnRetryTestForm?: HTMLButtonElement;
    // Adjustments
    formAdjustments?: HTMLFormElement;
    btnSubmitAdjustments?: HTMLButtonElement;
    previewPanelAdjustments?: HTMLElement;
    documentPreviewAdjustments?: HTMLElement;
    btnCopyAdjustments?: HTMLButtonElement;
    btnRegenerateAdjustments?: HTMLButtonElement;
    // Close
    closingNotes?: HTMLTextAreaElement;
    btnSaveClosing?: HTMLButtonElement;
    documentsSummary?: HTMLElement;
    // Prefill fields
    successCriteriaArea?: HTMLTextAreaElement;
    measurementToolsInput?: HTMLInputElement;
  } = {};

  constructor() {
    super({
      stepNumber: 7,
      templateId: 'tpl-step9-closing',
      phaseId: 'F5',
      promptId: 'F5',
      uiConfig: { loadingText: 'Generando Plan de Verificación (F5)...' },
    });
  }

  // Caches _subDom before _bindEvents() runs (called via super._cacheDOM chain)
  override _cacheDOM(): void {
    super._cacheDOM();
    this._cacheSubDom();
  }

  private _cacheSubDom(): void {
    const q = <T extends HTMLElement>(s: string) => this._container.querySelector<T>(s) ?? undefined;

    this._subDom.subtabBtns = this._container.querySelectorAll<HTMLButtonElement>('.subtab-btn');
    this._subDom.panels = {
      'verification': q('#panel-verification'),
      'test-report':  q('#panel-test-report'),
      'adjustments':  q('#panel-adjustments'),
      'close':        q('#panel-close'),
    };

    // Test report
    this._subDom.testFormGenerating = q('#test-form-generating');
    this._subDom.testFormReady = q('#test-form-ready');
    this._subDom.testFormError = q('#test-form-error');
    this._subDom.testReportSaved = q('#test-report-saved');
    this._subDom.testFormContainer = q('#test-form-container');
    this._subDom.btnRegenerateTestForm = q<HTMLButtonElement>('#btn-regenerate-test-form');
    this._subDom.btnSaveTestReport = q<HTMLButtonElement>('#btn-save-test-report');
    this._subDom.btnRetryTestForm = q<HTMLButtonElement>('#btn-retry-test-form');

    // Adjustments
    this._subDom.formAdjustments = q<HTMLFormElement>('#form-step9-adjustments');
    this._subDom.btnSubmitAdjustments = q<HTMLButtonElement>('#btn-submit-adjustments');
    this._subDom.previewPanelAdjustments = q('#preview-panel-adjustments');
    this._subDom.documentPreviewAdjustments = q('#document-preview-adjustments');
    this._subDom.btnCopyAdjustments = q<HTMLButtonElement>('#btn-copy-adjustments');
    this._subDom.btnRegenerateAdjustments = q<HTMLButtonElement>('#btn-regenerate-adjustments');

    // Close
    this._subDom.closingNotes = q<HTMLTextAreaElement>('#closing-notes');
    this._subDom.btnSaveClosing = q<HTMLButtonElement>('#btn-save-closing');
    this._subDom.documentsSummary = q('#documents-summary');

    // Prefill
    this._subDom.successCriteriaArea = q<HTMLTextAreaElement>('[name="successCriteria"]');
    this._subDom.measurementToolsInput = q<HTMLInputElement>('[name="measurementTools"]');
  }

  private _prefillFromContext(): void {
    const { clientData: cd, extractedContexts } = wizardStore.getState();

    // successCriteria ← measurableResult del cliente
    if (this._subDom.successCriteriaArea && !this._subDom.successCriteriaArea.value) {
      const parts: string[] = [];
      if (cd.measurableResult) parts.push(cd.measurableResult);
      if (cd.mainObjective)    parts.push(`Objetivo: ${cd.mainObjective}`);
      if (parts.length > 0) {
        this._subDom.successCriteriaArea.value = parts.join('\n');
      }
    }

    // measurementTools ← inferidos del contexto o defaults por sector
    if (this._subDom.measurementToolsInput && !this._subDom.measurementToolsInput.value) {
      const extracted = extractedContexts[7]?.content ?? '';
      const tools: string[] = [];
      const combined = (extracted + (cd.sector ?? '')).toLowerCase();

      if (/capacitaci/.test(combined))     tools.push('Evaluación de aprendizaje (pre/post)');
      if (/venta|comerci/.test(combined))  tools.push('KPIs de ventas');
      if (/proceso|calidad/.test(combined)) tools.push('Indicadores de proceso y calidad');
      if (/liderazgo|direcci/.test(combined)) tools.push('Evaluación 360°');
      tools.push('Encuesta de satisfacción del participante');

      this._subDom.measurementToolsInput.value = [...new Set(tools)].join(', ');
    }
  }

  private _switchSubTab(tab: SubTab): void {
    this._subDom.subtabBtns?.forEach((btn) => {
      const isActive = btn.dataset['subtab'] === tab;
      btn.className = `subtab-btn px-3 py-2 text-sm font-medium ${
        isActive
          ? 'text-green-900 border-b-2 border-green-900'
          : 'text-gray-500 border-b-2 border-transparent hover:text-gray-700'
      }`;
    });
    Object.entries(this._subDom.panels ?? {}).forEach(([key, panel]) => {
      panel?.classList.toggle('hidden', key !== tab);
    });

    this._updateTabStates();

    if (tab === 'test-report' && !this._testReportSchema) {
      void this._loadTestReportForm();
    }
    if (tab === 'close') {
      this._renderDocumentsSummary();
    }
  }

  private async _loadTestReportForm(): Promise<void> {
    this._subDom.testFormGenerating?.classList.remove('hidden');
    this._subDom.testFormReady?.classList.add('hidden');
    this._subDom.testFormError?.classList.add('hidden');

    const schema = await this._generateForm('F5_TEST_REPORT_FORM');
    if (!schema) {
      this._subDom.testFormGenerating?.classList.add('hidden');
      this._subDom.testFormError?.classList.remove('hidden');
      return;
    }

    this._testReportSchema = schema;
    if (this._subDom.testFormContainer) {
      renderFormSchema(schema, this._subDom.testFormContainer);
    }

    // Restaurar respuestas previas
    const saved = wizardStore.getStepData<{ testReportAnswers: Record<string, string> }>(7);
    if (saved?.testReportAnswers && this._subDom.testFormContainer) {
      restoreFormAnswers(this._subDom.testFormContainer, saved.testReportAnswers);
    }

    this._subDom.testFormGenerating?.classList.add('hidden');
    this._subDom.testFormReady?.classList.remove('hidden');
  }

  private _saveTestReport(): void {
    if (!this._subDom.testFormContainer) return;
    const answers = collectFormAnswers(this._subDom.testFormContainer);
    const existing = wizardStore.getStepData<Record<string, unknown>>(7) ?? {};
    wizardStore.setStepData(7, { ...existing, testReportAnswers: answers, testReportSchema: this._testReportSchema });
    this._subDom.testReportSaved?.classList.remove('hidden');
    this._updateTabStates();
  }

  private async _generateAdjustments(formData: Record<string, unknown>): Promise<void> {
    const state = wizardStore.getState();
    if (!state.projectId) { showError('No hay proyecto activo.'); return; }

    let stepId = state.steps[7]?.stepId;
    if (!stepId) {
      stepId = await this._ensureStepId(state.projectId, formData) ?? undefined;
    }
    if (!stepId) { showError('No se pudo registrar el paso.'); return; }

    if (this._subDom.btnSubmitAdjustments) {
      this._subDom.btnSubmitAdjustments.disabled = true;
      this._subDom.btnSubmitAdjustments.textContent = '⏳ Generando...';
    }
    showLoading('Generando Reporte de Ajustes (F6)...');

    try {
      const context = wizardStore.buildContext(7) as {
        projectName: string; clientName: string; companyName?: string;
        sector?: string; email?: string; previousData?: Record<string, unknown>;
      };

      const res = await postData<{ documentId: string; content: string }>(
        buildEndpoint(ENDPOINTS.wizard.generate),
        {
          projectId: state.projectId,
          stepId,
          phaseId: 'F6',
          promptId: 'F6' as PromptId,
          context,
          userInputs: formData,
        }
      );

      if (res.data) {
        this._adjustmentsContent = res.data.content;
        if (this._subDom.documentPreviewAdjustments) {
          this._subDom.documentPreviewAdjustments.innerHTML = renderMarkdown(res.data.content);
        }
        this._subDom.previewPanelAdjustments?.classList.remove('hidden');

        const existing = wizardStore.getStepData<Record<string, unknown>>(7) ?? {};
        wizardStore.setStepData(7, {
          ...existing,
          adjustmentsContent: res.data.content,
          adjustmentsDocumentId: res.data.documentId ?? '',
        });
        this._updateTabStates();
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al generar ajustes');
    } finally {
      if (this._subDom.btnSubmitAdjustments) {
        this._subDom.btnSubmitAdjustments.disabled = false;
        this._subDom.btnSubmitAdjustments.textContent = '✨ Generar Reporte de Ajustes con IA';
      }
      hideLoading();
    }
  }

  private _renderDocumentsSummary(): void {
    if (!this._subDom.documentsSummary) return;
    const { steps } = wizardStore.getState();
    const completed = steps.filter((s) => s.status === 'completed');
    if (completed.length === 0) {
      this._subDom.documentsSummary.innerHTML = '<p class="text-gray-400">No hay documentos generados aún.</p>';
      return;
    }
    this._subDom.documentsSummary.innerHTML = completed.map((s) =>
      `<div class="flex items-center gap-2">
        <span class="text-green-600">✓</span>
        <span>${s.label} — ${s.phaseId}</span>
      </div>`
    ).join('');
  }

  private _saveClosing(): void {
    const notes = this._subDom.closingNotes?.value.trim() ?? '';
    const existing = wizardStore.getStepData<Record<string, unknown>>(7) ?? {};
    wizardStore.setStepData(7, { ...existing, closingNotes: notes });
    wizardStore.setStepStatus(7, 'completed');
    this._renderDocumentsSummary();
  }

  override _bindEvents(): void {
    super._bindEvents();

    this._subDom.subtabBtns?.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const tab = btn.dataset['subtab'] as SubTab;
        if (tab) this._switchSubTab(tab);
      });
    });

    // Test report
    this._subDom.btnRegenerateTestForm?.addEventListener('click', () => {
      this._testReportSchema = null;
      void this._loadTestReportForm();
    });
    this._subDom.btnSaveTestReport?.addEventListener('click', () => this._saveTestReport());
    this._subDom.btnRetryTestForm?.addEventListener('click', () => void this._loadTestReportForm());

    // Adjustments
    this._subDom.formAdjustments?.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData: Record<string, unknown> = {};
      new FormData(this._subDom.formAdjustments!).forEach((v, k) => { formData[k] = v; });
      void this._generateAdjustments(formData);
    });
    this._subDom.btnCopyAdjustments?.addEventListener('click', () => {
      if (this._adjustmentsContent) {
        navigator.clipboard.writeText(this._adjustmentsContent).catch(() => { /* silent */ });
      }
    });
    this._subDom.btnRegenerateAdjustments?.addEventListener('click', () => {
      const formData: Record<string, unknown> = {};
      new FormData(this._subDom.formAdjustments!).forEach((v, k) => { formData[k] = v; });
      void this._generateAdjustments(formData);
    });

    // Close
    this._subDom.btnSaveClosing?.addEventListener('click', () => this._saveClosing());
  }

  override async mount(container: HTMLElement): Promise<void> {
    // _cacheSubDom() ya se llama dentro de _cacheDOM() override → _bindEvents() correcto
    await super.mount(container);

    // Restaurar ajustes previos si existen
    const saved = wizardStore.getStepData<{ adjustmentsContent?: string }>(7);
    if (saved?.adjustmentsContent && this._subDom.documentPreviewAdjustments) {
      this._adjustmentsContent = saved.adjustmentsContent;
      this._subDom.documentPreviewAdjustments.innerHTML = renderMarkdown(saved.adjustmentsContent);
      this._subDom.previewPanelAdjustments?.classList.remove('hidden');
    }

    // Pre-llenar si no hay documento generado aún
    const step = wizardStore.getState().steps[7];
    if (!step?.documentContent) {
      this._prefillFromContext();
    }

    this._updateTabStates();
    this._switchSubTab('verification');
  }

  // --- Validación secuencial ---
  private _updateTabStates(): void {
    const step = wizardStore.getState().steps[7];
    const data = wizardStore.getStepData<Record<string, unknown>>(7) || {};
    
    const hasF5 = !!step?.documentContent;
    const hasTestReport = !!data.testReportAnswers;
    const hasF6 = !!data.adjustmentsContent;

    this._subDom.subtabBtns?.forEach(btn => {
      const tab = btn.dataset['subtab'] as SubTab;
      let disabled = false;
      if (tab === 'test-report') disabled = !hasF5;
      if (tab === 'adjustments') disabled = !hasTestReport;
      if (tab === 'close') disabled = !hasF6;
      
      btn.disabled = disabled;
      if (disabled) {
        btn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-50');
        btn.classList.remove('hover:text-gray-700');
        if (tab === 'test-report') btn.title = 'Genera Verificación (F5) primero';
        if (tab === 'adjustments') btn.title = 'Guarda el Reporte de Pruebas primero';
        if (tab === 'close') btn.title = 'Genera el Reporte de Ajustes (F6) primero';
      } else {
        btn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-50');
        btn.classList.add('hover:text-gray-700');
        btn.title = '';
      }
    });
  }
}

const _instance = new Step9ClosingController();
export const Step9Closing = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
