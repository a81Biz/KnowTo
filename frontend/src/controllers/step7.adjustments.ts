// src/controllers/step7.adjustments.ts
// Controlador del paso 7: Documento de Ajustes Post-Evaluación
// Estructura de 7 secciones (ver FRONTEND ARCHITECTURE DOCUMENT.md)

// ============================================================================
// 1. DEPENDENCIAS
// ============================================================================
import { postData } from '../shared/http.client';
import { ENDPOINTS } from '../shared/endpoints';
import { showLoading, hideLoading, showError, renderMarkdown } from '../shared/ui';
import type { WizardStore } from '../stores/wizard.store';

// ============================================================================
// 2. ESTADO PRIVADO Y CONFIGURACIÓN
// ============================================================================
let _container: HTMLElement;
let _store: typeof import('../stores/wizard.store').wizardStore;

const _dom: {
  form?: HTMLFormElement;
  btnGenerate?: HTMLButtonElement;
  previewPanel?: HTMLDivElement;
} = {};

// ============================================================================
// 3. CACHÉ DEL DOM
// ============================================================================
const _cacheDOM = (): void => {
  _dom.form = _container.querySelector('#step-7-form') ?? undefined;
  _dom.btnGenerate = _container.querySelector('#btn-generate-7') ?? undefined;
  _dom.previewPanel = _container.querySelector('#preview-7') ?? undefined;
};

// ============================================================================
// 4. LÓGICA DE VISTA
// ============================================================================
const _renderPreview = (content: string): void => {
  if (!_dom.previewPanel) return;
  _dom.previewPanel.innerHTML = `
    <div class="document-preview p-6 bg-gray-50 rounded-xl border border-gray-200 max-h-96 overflow-y-auto">
      ${renderMarkdown(content)}
    </div>
    <div class="mt-4 flex gap-3">
      <button class="btn-copy-doc px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
        📋 Copiar documento
      </button>
    </div>
  `;

  _container.querySelector('.btn-copy-doc')?.addEventListener('click', () => {
    navigator.clipboard.writeText(content).then(() => alert('Documento copiado'));
  });
};

const _setLoading = (loading: boolean): void => {
  if (_dom.btnGenerate) {
    _dom.btnGenerate.disabled = loading;
    _dom.btnGenerate.textContent = loading ? '⏳ Generando con IA...' : '✨ Generar documento';
  }
};

// ============================================================================
// 5. LÓGICA DE NEGOCIO
// ============================================================================
const _collectFormData = (): Record<string, unknown> => {
  const data: Record<string, unknown> = {};
  if (!_dom.form) return data;
  const formData = new FormData(_dom.form);
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  return data;
};

const _generateDocument = async (): Promise<void> => {
  const state = _store.getState();
  if (!state.projectId) {
    showError('No hay proyecto activo. Regresa al inicio.');
    return;
  }

  const inputData = _collectFormData();
  const currentStep = state.steps[7];
  if (!currentStep?.stepId) {
    showError('Error: step ID no encontrado.');
    return;
  }

  _setLoading(true);
  showLoading('Generando documento de Documento de Ajustes Post-Evaluación...');

  try {
    _store.setStepInputData(7, inputData);

    const context = _store.buildContext() as {
      projectName: string;
      clientName: string;
      industry?: string;
      email?: string;
      previousData?: Record<string, unknown>;
    };

    const res = await postData<{ documentId: string; content: string }>(
      ENDPOINTS.wizard.generate,
      {
        projectId: state.projectId,
        stepId: currentStep.stepId,
        phaseId: 'F6.1',
        promptId: 'F6',
        context,
        userInputs: inputData,
      }
    );

    if (res.data) {
      _store.setStepDocument(7, res.data.content, res.data.documentId);
      _renderPreview(res.data.content);
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Error al generar el documento');
    _store.setStepStatus(7, 'error');
  } finally {
    _setLoading(false);
    hideLoading();
  }
};

// ============================================================================
// 6. REGISTRO DE EVENTOS
// ============================================================================
const _bindEvents = (): void => {
  _dom.btnGenerate?.addEventListener('click', (e) => {
    e.preventDefault();
    void _generateDocument();
  });
};

// ============================================================================
// 7. API PÚBLICA
// ============================================================================
export async function initStep7(
  container: HTMLElement,
  store: typeof import('../stores/wizard.store').wizardStore
): Promise<void> {
  _container = container;
  _store = store;

  const state = store.getState();
  const step = state.steps[7];

  // Si hay documento previo, mostrarlo directamente
  const previewHtml = step?.documentContent
    ? `<div class="document-preview p-6 bg-gray-50 rounded-xl border border-gray-200 max-h-96 overflow-y-auto">
        ${renderMarkdown(step.documentContent)}
       </div>`
    : '';

  container.innerHTML = `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Documento de Ajustes Post-Evaluación</h2>
        <p class="text-gray-500 mt-1">Documenta las correcciones realizadas al curso tras la verificación.</p>
      </div>

      <form id="step-7-form" class="space-y-4">
        <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Observaciones recibidas del evaluador o usuarios</label>
          <textarea name="observations" rows="4" placeholder="Lista las observaciones recibidas durante la evaluación del curso..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ajustes realizados al curso</label>
          <textarea name="adjustmentsMade" rows="4" placeholder="Describe los cambios que hiciste al curso en respuesta a las observaciones..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Versión actual del curso</label>
          <input name="courseVersion" type="text" placeholder="Ej: 1.1"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      </form>

      <button id="btn-generate-7"
        class="w-full bg-blue-900 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-800 transition-colors">
        ✨ Generar documento con IA
      </button>

      <div id="preview-7">
        ${previewHtml}
      </div>
    </div>
  `;

  // Guardar stepId si el proyecto ya existe
  if (state.projectId && !step?.stepId) {
    try {
      const res = await postData<{ stepId: string }>(ENDPOINTS.wizard.saveStep, {
        projectId: state.projectId,
        stepNumber: 7,
        inputData: step?.inputData ?? {},
      });
      if (res.data) store.setStepId(7, res.data.stepId);
    } catch { /* silent */ }
  }

  _cacheDOM();
  _bindEvents();
}
