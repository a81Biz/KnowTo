// src/controllers/step4.fieldwork.ts — CCE Step 2 (renumbered): Trabajo de Campo (F1_2_FIELDWORK)
// Permite subir instrumentos completados (JPG/PNG) con OCR automático, o añadir instancias digitales.
// Al guardar: 1) guarda el resumen de hallazgos, 2) genera síntesis diagnóstica con IA (F1_2_FIELDWORK_SYNTHESIS).
// La síntesis es el insumo principal para el pre-llenado del paso 4 (Diagnóstico).

import { BaseStep } from '../shared/step.base';
import { wizardStore } from '../stores/wizard.store';
import { postData } from '@core/http.client';
import { showError, showSuccess, showLoading, hideLoading } from '@core/ui';
import { ENDPOINTS, buildEndpoint } from '../shared/endpoints';
import type { FieldworkData } from '../types/wizard.types';

const INSTRUMENTS = [
  { id: 'entrevista-director',      label: 'Entrevista Director' },
  { id: 'entrevista-jefes',         label: 'Entrevista Jefes' },
  { id: 'entrevista-colaboradores', label: 'Entrevista Colaboradores' },
  { id: 'cuestionario-anonimo',     label: 'Cuestionario Anónimo' },
  { id: 'guia-observacion',         label: 'Guía de Observación' },
  { id: 'checklist-documentos',     label: 'Checklist de Documentos' },
];

interface InstrumentInstance {
  type: 'upload' | 'digital';
  fileId?: string;
  fileName?: string;
  extractedText?: string;  // OCR result for image uploads
  ocrStatus?: 'pending' | 'done' | 'failed' | 'n/a';
  personName?: string;
  personRole?: string;
  applicationDate?: string;
  observations?: string;
}

class Step4FieldworkController extends BaseStep {
  private _activeInstrumentId = INSTRUMENTS[0]!.id;
  private _instances: Map<string, InstrumentInstance[]> = new Map();

  private _subDom: {
    instrumentSelector?: HTMLElement;
    activeInstrumentLabel?: HTMLElement;
    instancesList?: HTMLElement;
    uploadZone?: HTMLElement;
    fileInput?: HTMLInputElement;
    btnAddDigital?: HTMLButtonElement;
    digitalInstanceForm?: HTMLElement;
    digitalInstanceTitle?: HTMLElement;
    btnCloseDigital?: HTMLButtonElement;
    digitalPersonName?: HTMLInputElement;
    digitalPersonRole?: HTMLInputElement;
    digitalApplicationDate?: HTMLInputElement;
    digitalObservations?: HTMLTextAreaElement;
    btnSaveDigitalInstance?: HTMLButtonElement;
    fieldNotes?: HTMLTextAreaElement;
    btnSaveFieldwork?: HTMLButtonElement;
    fieldworkSaved?: HTMLElement;
  } = {};

  constructor() {
    super({
      stepNumber: 2,
      templateId: 'tpl-step4-fieldwork',
      phaseId: 'F1_2_FIELDWORK',
      promptId: 'F1_1', // No genera doc AI, solo guarda
    });
    INSTRUMENTS.forEach((i) => this._instances.set(i.id, []));
  }

  private _cacheSubDom(): void {
    const q = <T extends HTMLElement>(sel: string) =>
      this._container.querySelector<T>(sel) ?? undefined;

    this._subDom.instrumentSelector    = q('#instrument-selector');
    this._subDom.activeInstrumentLabel = q('#active-instrument-label');
    this._subDom.instancesList         = q('#instances-list');
    this._subDom.uploadZone            = q('#upload-zone');
    this._subDom.fileInput             = q<HTMLInputElement>('#file-input');
    this._subDom.btnAddDigital         = q<HTMLButtonElement>('#btn-add-digital-instance');
    this._subDom.digitalInstanceForm   = q('#digital-instance-form');
    this._subDom.digitalInstanceTitle  = q('#digital-instance-title');
    this._subDom.btnCloseDigital       = q<HTMLButtonElement>('#btn-close-digital');
    this._subDom.digitalPersonName     = q<HTMLInputElement>('#digital-person-name');
    this._subDom.digitalPersonRole     = q<HTMLInputElement>('#digital-person-role');
    this._subDom.digitalApplicationDate= q<HTMLInputElement>('#digital-application-date');
    this._subDom.digitalObservations   = q<HTMLTextAreaElement>('#digital-observations');
    this._subDom.btnSaveDigitalInstance= q<HTMLButtonElement>('#btn-save-digital-instance');
    this._subDom.fieldNotes            = q<HTMLTextAreaElement>('#field-notes');
    this._subDom.btnSaveFieldwork      = q<HTMLButtonElement>('#btn-save-fieldwork');
    this._subDom.fieldworkSaved        = q('#fieldwork-saved');
  }

  // ── Renderizado ────────────────────────────────────────────────────────────

  private _renderInstrumentSelector(): void {
    if (!this._subDom.instrumentSelector) return;
    this._subDom.instrumentSelector.innerHTML = INSTRUMENTS.map(({ id, label }) => {
      const instances = this._instances.get(id) ?? [];
      const isActive = id === this._activeInstrumentId;
      const cls = isActive ? 'instrument-tab active' : instances.length > 0 ? 'instrument-tab completed' : 'instrument-tab';
      const badge = instances.length > 0 ? ` (${instances.length})` : '';
      return `<button class="${cls}" data-instrument-id="${id}">${label}${badge}</button>`;
    }).join('');

    this._subDom.instrumentSelector.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this._activeInstrumentId = (btn as HTMLElement).dataset['instrumentId'] ?? INSTRUMENTS[0]!.id;
        this._renderInstrumentSelector();
        this._renderInstancesList();
        if (this._subDom.activeInstrumentLabel) {
          this._subDom.activeInstrumentLabel.textContent =
            INSTRUMENTS.find((i) => i.id === this._activeInstrumentId)?.label ?? '';
        }
      });
    });
  }

  private _renderInstancesList(): void {
    if (!this._subDom.instancesList) return;
    const instances = this._instances.get(this._activeInstrumentId) ?? [];

    if (instances.length === 0) {
      this._subDom.instancesList.innerHTML =
        '<p class="text-xs text-gray-400 text-center py-2">Sin instancias registradas aún.</p>';
      return;
    }

    this._subDom.instancesList.innerHTML = instances.map((inst, idx) => {
      if (inst.type === 'upload') {
        const ocrBadge =
          inst.ocrStatus === 'done'    ? '<span class="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">OCR ✓</span>' :
          inst.ocrStatus === 'pending' ? '<span class="text-xs text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded">OCR...</span>' :
          inst.ocrStatus === 'failed'  ? '<span class="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">OCR ✗</span>' :
          '<span class="text-xs text-gray-400">PDF</span>';
        return `<div class="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span class="text-green-600">📎</span>
          <span class="text-green-800 flex-1 truncate">${inst.fileName ?? 'Archivo'}</span>
          ${ocrBadge}
          <button data-remove="${idx}" class="text-red-400 hover:text-red-600 text-xs ml-1">✕</button>
        </div>`;
      }
      return `<div class="flex items-center gap-2 text-sm bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <span class="text-blue-600">📝</span>
        <span class="text-blue-800 flex-1 truncate">${inst.personName ?? 'Instancia digital'} ${inst.personRole ? `— ${inst.personRole}` : ''}</span>
        <button data-remove="${idx}" class="text-red-400 hover:text-red-600 text-xs">✕</button>
      </div>`;
    }).join('');

    this._subDom.instancesList.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number((btn as HTMLElement).dataset['remove']);
        const current = this._instances.get(this._activeInstrumentId) ?? [];
        current.splice(idx, 1);
        this._renderInstancesList();
        this._renderInstrumentSelector();
      });
    });
  }

  // ── OCR ────────────────────────────────────────────────────────────────────

  private async _runOcr(
    base64: string,
    mimeType: 'image/jpeg' | 'image/png',
    instRef: InstrumentInstance,
  ): Promise<void> {
    instRef.ocrStatus = 'pending';
    this._renderInstancesList();
    try {
      const res = await postData<{ extractedText: string }>(
        buildEndpoint(ENDPOINTS.wizard.ocr),
        { base64Content: base64, mimeType },
      );
      if (res.data?.extractedText) {
        instRef.extractedText = res.data.extractedText;
        instRef.ocrStatus = 'done';
      } else {
        instRef.ocrStatus = 'failed';
      }
    } catch {
      instRef.ocrStatus = 'failed';
    }
    this._renderInstancesList();
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  private async _handleFileUpload(files: FileList): Promise<void> {
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        showError(`El archivo ${file.name} supera el límite de 10 MB.`);
        continue;
      }

      const mimeType = file.type as 'application/pdf' | 'image/jpeg' | 'image/png';
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType)) {
        showError(`Tipo de archivo no soportado: ${file.type}`);
        continue;
      }

      const isImage = mimeType === 'image/jpeg' || mimeType === 'image/png';

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string).split(',')[1] ?? '');
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        showLoading(`Subiendo ${file.name}...`);
        const result = await this._uploadFile({
          instrumentId: this._activeInstrumentId,
          fileName: file.name,
          mimeType,
          base64Content: base64,
        });
        hideLoading();

        if (result) {
          const inst: InstrumentInstance = {
            type: 'upload',
            fileId: result.fileId,
            fileName: result.fileName,
            ocrStatus: isImage ? 'pending' : 'n/a',
          };
          const instances = this._instances.get(this._activeInstrumentId) ?? [];
          instances.push(inst);
          this._renderInstancesList();
          this._renderInstrumentSelector();
          showSuccess(`Archivo "${file.name}" subido.${isImage ? ' Extrayendo texto...' : ''}`);

          // OCR automático para imágenes (sin await para no bloquear la UI)
          if (isImage) {
            void this._runOcr(base64, mimeType as 'image/jpeg' | 'image/png', inst);
          }
        }
      } catch (err) {
        hideLoading();
        showError(err instanceof Error ? err.message : 'Error al subir el archivo.');
      }
    }
  }

  // ── Instancia digital ──────────────────────────────────────────────────────

  private _saveDigitalInstance(): void {
    const personName = this._subDom.digitalPersonName?.value.trim() ?? '';
    const observations = this._subDom.digitalObservations?.value.trim() ?? '';
    if (!observations) { showError('Ingresa las respuestas u observaciones.'); return; }

    const instances = this._instances.get(this._activeInstrumentId) ?? [];
    instances.push({
      type: 'digital',
      personName: personName || 'Sin nombre',
      personRole: this._subDom.digitalPersonRole?.value.trim(),
      applicationDate: this._subDom.digitalApplicationDate?.value,
      observations,
    });
    this._instances.set(this._activeInstrumentId, instances);
    this._renderInstancesList();
    this._renderInstrumentSelector();

    if (this._subDom.digitalPersonName) this._subDom.digitalPersonName.value = '';
    if (this._subDom.digitalPersonRole) this._subDom.digitalPersonRole.value = '';
    if (this._subDom.digitalApplicationDate) this._subDom.digitalApplicationDate.value = '';
    if (this._subDom.digitalObservations) this._subDom.digitalObservations.value = '';
    this._subDom.digitalInstanceForm?.classList.add('hidden');
    showSuccess('Instancia guardada correctamente.');
  }

  // ── Síntesis diagnóstica con IA ────────────────────────────────────────────
  // Llamada post-guardado: toma F0 + hallazgos de campo y genera una síntesis
  // estructurada que el paso 4 (Diagnóstico) usa como pre-llenado.

  private async _generateSynthesis(rawFieldworkMarkdown: string): Promise<void> {
    const state = wizardStore.getState();
    if (!state.projectId) return;

    let stepId = state.steps[2]?.stepId;
    if (!stepId) {
      stepId = await this._ensureStepId(state.projectId, {}) ?? undefined;
    }
    if (!stepId) return;

    showLoading('Generando síntesis diagnóstica...');
    try {
      const context = wizardStore.buildContext(2);
      // Incluir el documento F0 en el contexto para que la IA tenga el análisis del sector
      const f0Doc = state.steps[0]?.documentContent ?? '';
      const f1_1Doc = state.steps[1]?.documentContent ?? '';

      const userInputs: Record<string, string> = {
        fieldworkContent: rawFieldworkMarkdown.slice(0, 2000),
      };
      if (f0Doc) userInputs['f0Summary'] = f0Doc.slice(0, 600);
      if (f1_1Doc) {
        // Solo incluir la primera parte del F1_1 (instrumentos —> preguntas clave)
        userInputs['instrumentsContext'] = f1_1Doc.slice(0, 400);
      }

      const res = await postData<{ documentId: string; content: string }>(
        buildEndpoint(ENDPOINTS.wizard.generate),
        {
          projectId: state.projectId,
          stepId,
          phaseId: 'F1_2_FIELDWORK',
          promptId: 'F1_2_FIELDWORK_SYNTHESIS',
          context,
          userInputs,
        }
      );

      if (res.data?.content) {
        wizardStore.setStepDocument(2, res.data.content, res.data.documentId);
      }
    } catch {
      // La síntesis fallida no es bloqueante — el paso siguiente usará el markdown crudo
    } finally {
      hideLoading();
    }
  }

  // ── Guardar trabajo de campo ───────────────────────────────────────────────
  // 1. Genera resumen markdown con OCR + notas digitales
  // 2. Guarda inmediatamente (badge "Guardado")
  // 3. Llama a IA para generar síntesis diagnóstica (reemplaza el documento guardado)

  private async _saveFieldwork(): Promise<void> {
    const fieldNotes = this._subDom.fieldNotes?.value.trim() ?? '';
    const uploadedFiles: FieldworkData['uploadedFiles'] = {};

    // Construir resumen markdown
    const lines: string[] = ['# HALLAZGOS DE TRABAJO DE CAMPO\n'];

    this._instances.forEach((instances, instrumentId) => {
      const instrLabel = INSTRUMENTS.find((i) => i.id === instrumentId)?.label ?? instrumentId;
      if (instances.length === 0) return;

      lines.push(`## ${instrLabel}\n`);

      instances.forEach((inst, n) => {
        lines.push(`### Instancia ${n + 1}`);
        if (inst.type === 'upload') {
          lines.push(`**Archivo:** ${inst.fileName ?? 'desconocido'}`);
          if (inst.extractedText) {
            lines.push('\n**Texto extraído (OCR):**\n');
            lines.push(inst.extractedText);
          }
          // Guardar en uploadedFiles para persistencia
          uploadedFiles[instrumentId] = {
            fileId: inst.fileId ?? '',
            fileName: inst.fileName ?? '',
            extractedText: inst.extractedText,
          };
        } else {
          if (inst.personName) lines.push(`**Persona:** ${inst.personName}`);
          if (inst.personRole) lines.push(`**Cargo:** ${inst.personRole}`);
          if (inst.applicationDate) lines.push(`**Fecha:** ${inst.applicationDate}`);
          if (inst.observations) {
            lines.push('\n**Respuestas / Observaciones:**\n');
            lines.push(inst.observations);
          }
        }
        lines.push('');
      });
    });

    if (fieldNotes) {
      lines.push('## Notas Generales del Trabajo de Campo\n');
      lines.push(fieldNotes);
    }

    const summaryMarkdown = lines.join('\n');

    // Guardar datos estructurados y resumen crudo inmediatamente
    wizardStore.setStepData(2, { uploadedFiles, fieldNotes } satisfies FieldworkData);
    wizardStore.setStepDocument(2, summaryMarkdown, 'fieldwork-local');
    wizardStore.setStepStatus(2, 'completed');
    this._subDom.fieldworkSaved?.classList.remove('hidden');

    // Generar síntesis diagnóstica con IA (reemplaza el documento crudo si tiene éxito)
    await this._generateSynthesis(summaryMarkdown);
  }

  // ── Eventos ────────────────────────────────────────────────────────────────

  override _bindEvents(): void {
    this._subDom.uploadZone?.addEventListener('click', () => this._subDom.fileInput?.click());
    this._subDom.uploadZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      this._subDom.uploadZone?.classList.add('drag-over');
    });
    this._subDom.uploadZone?.addEventListener('dragleave', () => {
      this._subDom.uploadZone?.classList.remove('drag-over');
    });
    this._subDom.uploadZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      this._subDom.uploadZone?.classList.remove('drag-over');
      const files = (e as DragEvent).dataTransfer?.files;
      if (files?.length) void this._handleFileUpload(files);
    });
    this._subDom.fileInput?.addEventListener('change', () => {
      if (this._subDom.fileInput?.files?.length) {
        void this._handleFileUpload(this._subDom.fileInput.files);
      }
    });

    this._subDom.btnAddDigital?.addEventListener('click', () => {
      const label = INSTRUMENTS.find((i) => i.id === this._activeInstrumentId)?.label ?? '';
      if (this._subDom.digitalInstanceTitle) {
        this._subDom.digitalInstanceTitle.textContent = `Nueva instancia — ${label}`;
      }
      this._subDom.digitalInstanceForm?.classList.remove('hidden');
    });
    this._subDom.btnCloseDigital?.addEventListener('click', () => {
      this._subDom.digitalInstanceForm?.classList.add('hidden');
    });
    this._subDom.btnSaveDigitalInstance?.addEventListener('click', () => this._saveDigitalInstance());
    this._subDom.btnSaveFieldwork?.addEventListener('click', () => { void this._saveFieldwork(); });
  }

  // ── Mount ──────────────────────────────────────────────────────────────────

  override async mount(container: HTMLElement): Promise<void> {
    this._container = container;
    const { TemplateLoader } = await import('@core/template.loader');
    const fragment = await TemplateLoader.clone(this._config.templateId);
    container.innerHTML = '';
    container.appendChild(fragment);

    this._cacheDOM();
    this._cacheSubDom();

    const saved = wizardStore.getStepData<FieldworkData>(2);
    if (saved?.fieldNotes && this._subDom.fieldNotes) {
      this._subDom.fieldNotes.value = saved.fieldNotes;
    }
    if (saved && Object.keys(saved.uploadedFiles ?? {}).length > 0) {
      this._subDom.fieldworkSaved?.classList.remove('hidden');
    }
    if (this._subDom.activeInstrumentLabel) {
      this._subDom.activeInstrumentLabel.textContent = INSTRUMENTS[0]!.label;
    }

    this._renderInstrumentSelector();
    this._renderInstancesList();
    this._bindEvents();
  }
}

const _instance = new Step4FieldworkController();
export const Step4Fieldwork = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
