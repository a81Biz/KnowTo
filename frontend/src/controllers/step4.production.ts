// src/controllers/step4.production.ts
// Controlador del paso 4: Producción de Contenidos (8 Productos EC0366)
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
  _dom.form = _container.querySelector('#step-4-form') ?? undefined;
  _dom.btnGenerate = _container.querySelector('#btn-generate-4') ?? undefined;
  _dom.previewPanel = _container.querySelector('#preview-4') ?? undefined;
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
  const currentStep = state.steps[4];
  if (!currentStep?.stepId) {
    showError('Error: step ID no encontrado.');
    return;
  }

  _setLoading(true);
  showLoading('Generando documento de Producción de Contenidos (8 Productos EC0366)...');

  try {
    _store.setStepInputData(4, inputData);

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
        phaseId: 'F4',
        promptId: 'F4',
        context,
        userInputs: inputData,
      }
    );

    if (res.data) {
      _store.setStepDocument(4, res.data.content, res.data.documentId);
      _renderPreview(res.data.content);
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Error al generar el documento');
    _store.setStepStatus(4, 'error');
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
export async function initStep4(
  container: HTMLElement,
  store: typeof import('../stores/wizard.store').wizardStore
): Promise<void> {
  _container = container;
  _store = store;

  const state = store.getState();
  const step = state.steps[4];

  // Si hay documento previo, mostrarlo directamente
  const previewHtml = step?.documentContent
    ? `<div class="document-preview p-6 bg-gray-50 rounded-xl border border-gray-200 max-h-96 overflow-y-auto">
        ${renderMarkdown(step.documentContent)}
       </div>`
    : '';

  container.innerHTML = `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Producción de Contenidos (8 Productos EC0366)</h2>
        <p class="text-gray-500 mt-1">La IA generará los 8 productos obligatorios requeridos por los Elementos E1219 y E1220.</p>
      </div>

      <form id="step-4-form" class="space-y-4">
        <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p class="text-blue-800 font-medium text-sm">📋 Se generarán los 8 productos obligatorios del EC0366:</p>
          <ul class="mt-2 text-blue-700 text-sm space-y-1">
            <li>1. Cronograma de Desarrollo (E1219)</li>
            <li>2. Documento de Información General (E1219)</li>
            <li>3. Estructura Temática (E1219)</li>
            <li>4. Guía de Actividades (E1220)</li>
            <li>5. Lista de Materiales Didácticos (E1220)</li>
            <li>6. Instrumentos de Evaluación (E1220)</li>
            <li>7. Configuración en LMS (E1220)</li>
            <li>8. Lista de Verificación de Producción (E1219+E1220)</li>
          </ul>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">¿Hay algún detalle adicional para la producción?</label>
          <textarea name="productionNotes" rows="3" placeholder="Ej: El curso tendrá 5 módulos, cada uno con 2 videos de 10 minutos..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Fecha estimada de inicio de producción</label>
          <input name="startDate" type="date" class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      </form>

      <button id="btn-generate-4"
        class="w-full bg-blue-900 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-800 transition-colors">
        ✨ Generar documento con IA
      </button>

      <div id="preview-4">
        ${previewHtml}
      </div>
    </div>
  `;

  // Guardar stepId si el proyecto ya existe
  if (state.projectId && !step?.stepId) {
    try {
      const res = await postData<{ stepId: string }>(ENDPOINTS.wizard.saveStep, {
        projectId: state.projectId,
        stepNumber: 4,
        inputData: step?.inputData ?? {},
      });
      if (res.data) store.setStepId(4, res.data.stepId);
    } catch { /* silent */ }
  }

  _cacheDOM();
  _bindEvents();
}
