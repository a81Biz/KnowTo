// src/controllers/step1.reference.ts — CCE Step 1: Marco de Referencia + Respuestas + Instrumentos
//
// Flujo:
//   1. mount() → lee el documento F0 generado en step 0
//   2. Muestra el F0 en un panel colapsable
//   3. Parsea §8 PREGUNTAS PARA EL CLIENTE → renderiza formulario de respuestas
//   4. "Generar Instrumentos" → envía F0 + respuestas a F1_1 → muestra 6 instrumentos con tabs
//   5. Todo se guarda en el store y en la base de datos

import { BaseStep } from '../shared/step.base';
import { wizardStore } from '../stores/wizard.store';
import { renderMarkdown } from '@core/ui';
import { renderFormSchema, collectFormAnswers, restoreFormAnswers } from '../components/form-renderer';
import type { DynamicFormSchema, DynamicFormField } from '../types/wizard.types';

const INSTRUMENT_IDS = [
  { id: 'entrevista_director',       label: 'Entrevista Director' },
  { id: 'entrevista_jefes',          label: 'Entrevista Jefes' },
  { id: 'entrevista_colaboradores',  label: 'Entrevista Colaboradores' },
  { id: 'cuestionario_anonimo',      label: 'Cuestionario Anónimo' },
  { id: 'guia_observacion',          label: 'Guía de Observación' },
  { id: 'checklist_documentos',      label: 'Checklist de Documentos' },
];

class Step1ReferenceController extends BaseStep {
  private _schema: DynamicFormSchema | null = null;
  private _activeTab = 0;
  private _instruments: Map<string, string> = new Map();
  private _f0Expanded = false;

  private _subDom: {
    step1Loading?: HTMLElement;
    step1Ready?: HTMLElement;
    step1Error?: HTMLElement;
    errorMessage?: HTMLElement;
    f0Content?: HTMLElement;
    f0ToggleIcon?: HTMLElement;
    btnToggleF0?: HTMLButtonElement;
    dynamicFormContainer?: HTMLElement;
    btnGenerateInstruments?: HTMLButtonElement;
    instrumentTabs?: HTMLElement;
    btnEditAnswers?: HTMLButtonElement;
    btnRetryStep1?: HTMLButtonElement;
  } = {};

  constructor() {
    super({
      stepNumber: 1,
      templateId: 'tpl-step1-reference',
      phaseId: 'F1_1',
      promptId: 'F1_1',
      uiConfig: { loadingText: 'Generando instrumentos de diagnóstico (F1_1)...' },
    });
  }

  // ── DOM helpers ─────────────────────────────────────────────────────────────

  private _cacheSubDom(): void {
    const q = <T extends HTMLElement>(sel: string) =>
      this._container.querySelector<T>(sel) ?? undefined;

    this._subDom.step1Loading          = q('#step1-loading');
    this._subDom.step1Ready            = q('#step1-ready');
    this._subDom.step1Error            = q('#step1-error');
    this._subDom.errorMessage          = q('#step1-error-message');
    this._subDom.f0Content             = q('#f0-document-content');
    this._subDom.f0ToggleIcon          = q('#f0-toggle-icon');
    this._subDom.btnToggleF0           = q<HTMLButtonElement>('#btn-toggle-f0');
    this._subDom.dynamicFormContainer  = q('#dynamic-form-container');
    this._subDom.btnGenerateInstruments= q<HTMLButtonElement>('#btn-generate-instruments');
    this._subDom.instrumentTabs        = q('#instrument-tabs');
    this._subDom.btnEditAnswers        = q<HTMLButtonElement>('#btn-edit-answers');
    this._subDom.btnRetryStep1         = q<HTMLButtonElement>('#btn-retry-step1');
  }

  private _showLoading(): void {
    this._subDom.step1Loading?.classList.remove('hidden');
    this._subDom.step1Ready?.classList.add('hidden');
    this._subDom.step1Error?.classList.add('hidden');
    this._dom.previewPanel?.classList.add('hidden');
  }

  private _showReady(): void {
    this._subDom.step1Loading?.classList.add('hidden');
    this._subDom.step1Ready?.classList.remove('hidden');
    this._subDom.step1Error?.classList.add('hidden');
    this._dom.previewPanel?.classList.add('hidden');
  }

  private _showInstruments(): void {
    this._subDom.step1Loading?.classList.add('hidden');
    this._subDom.step1Ready?.classList.add('hidden');
    this._subDom.step1Error?.classList.add('hidden');
    this._dom.previewPanel?.classList.remove('hidden');
  }

  private _showError(msg?: string): void {
    this._subDom.step1Loading?.classList.add('hidden');
    this._subDom.step1Ready?.classList.add('hidden');
    this._subDom.step1Error?.classList.remove('hidden');
    this._dom.previewPanel?.classList.add('hidden');
    if (msg && this._subDom.errorMessage) this._subDom.errorMessage.textContent = msg;
  }

  // ── §8 Parser (idéntica lógica que step2.clientanswers) ────────────────────

  private _parseF0Questions(f0Document: string): DynamicFormSchema | null {
    const sectionMatch = f0Document.match(
      /##\s*(?:8\.)?\s*PREGUNTAS PARA EL CLIENTE([\s\S]*?)(?=\n##\s*(?:9[.\s]|REFERENCIAS)|$)/i
    );
    if (!sectionMatch?.[1]) return null;

    const sectionText = sectionMatch[1];
    const fields: DynamicFormField[] = [];

    const boldPattern = /\*\*(\d+)\.\s+([\s\S]+?)\*\*/g;
    let match: RegExpExecArray | null;

    while ((match = boldPattern.exec(sectionText)) !== null) {
      const num = match[1]!;
      const questionText = match[2]!.replace(/\n/g, ' ').trim();
      if (questionText.length < 8) continue;

      const blockStart = match.index + match[0].length;
      const nextBold = sectionText.indexOf('**' + (parseInt(num) + 1) + '.', blockStart);
      const blockText = nextBold > -1
        ? sectionText.slice(blockStart, nextBold)
        : sectionText.slice(blockStart);

      const objetivoMatch = blockText.match(/\*\*Objetivo:\*\*\s*([^\n]+)/i);
      const hint = objetivoMatch?.[1]?.trim();

      fields.push({
        id: `q${num}`,
        label: `${num}. ${questionText}`,
        type: 'textarea',
        required: true,
        hint: (hint && hint.length > 5) ? hint : 'Registra la respuesta del cliente',
        placeholder: 'Escribe la respuesta del cliente...',
      });
    }

    if (fields.length === 0) {
      const linePattern = /^(\d+)\.\s+(.{10,})$/gm;
      while ((match = linePattern.exec(sectionText)) !== null) {
        const num = match[1]!;
        const questionText = match[2]!.trim();
        fields.push({
          id: `q${num}`,
          label: `${num}. ${questionText}`,
          type: 'textarea',
          required: true,
          hint: 'Registra la respuesta del cliente',
          placeholder: 'Escribe la respuesta del cliente...',
        });
      }
    }

    if (fields.length === 0) return null;

    return {
      formTitle: 'Sesión de Diagnóstico con el Cliente',
      description: `Registra las respuestas del cliente a las ${fields.length} preguntas del Marco de Referencia (F0).`,
      sections: [
        {
          id: 'preguntas-f0',
          title: `Preguntas de Diagnóstico (${fields.length})`,
          fields,
        },
      ],
    };
  }

  // ── Instrument splitter ────────────────────────────────────────────────────
  //
  // El modelo genera: "## INSTRUMENTO 1: ENTREVISTA AL DIRECTOR/DUEÑO"
  // No podemos buscar por label porque el modelo puede parafrasear el título.
  // Estrategia: dividir por "## INSTRUMENTO N" en orden y asignar por posición.

  private _splitInstruments(fullContent: string): void {
    this._instruments.clear();

    // Captura todo lo que sigue a cada "## INSTRUMENTO N:" hasta el siguiente o fin
    const sectionRegex = /##\s*INSTRUMENTO\s*\d+[^\n]*\n([\s\S]*?)(?=##\s*INSTRUMENTO\s*\d+|##\s*INSTRUCCIONES\s+DE\s+CALIDAD|$)/gi;

    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = sectionRegex.exec(fullContent)) !== null && idx < INSTRUMENT_IDS.length) {
      const sectionContent = match[1]?.trim();
      if (sectionContent && sectionContent.length > 20) {
        const entry = INSTRUMENT_IDS[idx]!;
        this._instruments.set(entry.id, `## ${entry.label}\n\n${sectionContent}`);
        idx++;
      }
    }

    // Fallback: si el modelo no usó el formato ## INSTRUMENTO N, asignar todo al primero
    if (this._instruments.size === 0 && fullContent) {
      this._instruments.set(INSTRUMENT_IDS[0]!.id, fullContent);
    }
  }

  private _renderTabs(): void {
    if (!this._subDom.instrumentTabs) return;
    this._subDom.instrumentTabs.innerHTML = INSTRUMENT_IDS.map(({ id, label }, i) => {
      const hasContent = this._instruments.has(id);
      const isActive = i === this._activeTab;
      const cls = isActive ? 'instrument-tab active' : hasContent ? 'instrument-tab completed' : 'instrument-tab';
      return `<button class="${cls}" data-tab-index="${i}" data-instrument-id="${id}">${label}</button>`;
    }).join('');

    this._subDom.instrumentTabs.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this._activeTab = Number((btn as HTMLElement).dataset['tabIndex']);
        const instrId = (btn as HTMLElement).dataset['instrumentId'] ?? '';
        this._renderTabs();
        this._showInstrument(instrId);
      });
    });
  }

  private _showInstrument(instrumentId: string): void {
    const content = this._instruments.get(instrumentId) ?? '';
    if (this._dom.documentPreview) {
      this._dom.documentPreview.innerHTML = content
        ? renderMarkdown(content)
        : '<p class="text-gray-400 text-center py-8">Genera los instrumentos para visualizarlos.</p>';
    }
  }

  // ── Carga del F0 y renderizado del formulario ──────────────────────────────

  private _loadF0(): void {
    const state = wizardStore.getState();
    const f0Content = state.steps[0]?.documentContent;

    if (!f0Content) {
      this._showError('Primero debes generar el Marco de Referencia (F0) en el paso anterior (Datos del Cliente).');
      return;
    }

    // Mostrar F0 en el panel colapsable
    if (this._subDom.f0Content) {
      this._subDom.f0Content.innerHTML = renderMarkdown(f0Content);
    }

    // Parsear preguntas §8
    const schema = this._parseF0Questions(f0Content);
    if (!schema) {
      this._showError(
        'No se encontraron preguntas en §8 del Marco de Referencia. ' +
        'Regresa al paso anterior y regenera el documento F0.'
      );
      return;
    }

    this._schema = schema;
    if (this._subDom.dynamicFormContainer) {
      renderFormSchema(schema, this._subDom.dynamicFormContainer);
    }

    // Restaurar respuestas guardadas si existen
    const saved = wizardStore.getStepData<{ answers: Record<string, string> }>(1);
    if (saved?.answers && this._subDom.dynamicFormContainer) {
      restoreFormAnswers(this._subDom.dynamicFormContainer, saved.answers);
    }

    this._showReady();
  }

  // ── Generación de instrumentos (F1_1) ──────────────────────────────────────

  private async _generateInstruments(opts: { regenerate?: boolean } = {}): Promise<void> {
    if (!this._subDom.dynamicFormContainer) return;

    const answers = collectFormAnswers(this._subDom.dynamicFormContainer);

    // Guardar respuestas en el store antes de generar
    wizardStore.setStepData(1, { answers, formSchema: this._schema });

    // _generateDocument usa wizardStore.buildContext(1) para el contexto compacto
    // y envía las respuestas aplanadas en userInputs para que el modelo las lea directamente
    await this._generateDocument({ ...answers }, { regenerate: opts.regenerate });

    // Después de generar, parsear instrumentos y mostrar tabs
    const step = wizardStore.getState().steps[1];
    if (step?.documentContent) {
      this._splitInstruments(step.documentContent);
      this._renderTabs();
      this._showInstrument(INSTRUMENT_IDS[this._activeTab]?.id ?? INSTRUMENT_IDS[0]!.id);
      this._showInstruments();
    }
  }

  // ── Eventos ────────────────────────────────────────────────────────────────

  override _bindEvents(): void {
    // Toggle F0 document
    this._subDom.btnToggleF0?.addEventListener('click', () => {
      this._f0Expanded = !this._f0Expanded;
      this._subDom.f0Content?.classList.toggle('hidden', !this._f0Expanded);
      if (this._subDom.f0ToggleIcon) {
        this._subDom.f0ToggleIcon.textContent = this._f0Expanded ? '▲' : '▼';
      }
    });

    // Generar instrumentos
    this._subDom.btnGenerateInstruments?.addEventListener('click', () => {
      void this._generateInstruments();
    });

    // Editar respuestas — volver al formulario
    this._subDom.btnEditAnswers?.addEventListener('click', () => {
      this._loadF0();
    });

    // Reintentar en caso de error
    this._subDom.btnRetryStep1?.addEventListener('click', () => {
      this._loadF0();
    });

    // Copiar documento completo
    this._dom.btnCopy?.addEventListener('click', () => {
      const step = wizardStore.getState().steps[1];
      if (step?.documentContent) {
        navigator.clipboard.writeText(step.documentContent).catch(() => { /* silent */ });
      }
    });

    // Regenerar — reinicia el pipeline limpiando outputs
    this._dom.btnRegenerate?.addEventListener('click', () => {
      void this._generateInstruments({ regenerate: true });
    });
  }

  // ── Mount ──────────────────────────────────────────────────────────────────

  override async mount(container: HTMLElement): Promise<void> {
    this._container = container;
    const { TemplateLoader } = await import('@core/template.loader');
    const fragment = await TemplateLoader.clone(this._config.templateId);
    container.innerHTML = '';
    container.appendChild(fragment);

    this._cacheDOM();     // BaseStep: #preview-panel, #document-preview, #btn-copy-doc, #btn-regenerate
    this._cacheSubDom();
    this._bindEvents();

    this._showLoading();

    // Si ya tiene instrumentos generados, mostrarlos directamente
    const step = wizardStore.getState().steps[1];
    if (step?.documentContent) {
      this._splitInstruments(step.documentContent);
      this._renderTabs();
      this._showInstrument(INSTRUMENT_IDS[0]!.id);
      this._showInstruments();
      return;
    }

    // Cargar F0 y preparar formulario
    this._loadF0();
  }
}

const _instance = new Step1ReferenceController();
export const Step1Reference = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
