// src/controllers/step0.clientdata.ts
// Controlador del paso 0: Marco de Referencia del Cliente
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
  _dom.form = _container.querySelector('#step-0-form') ?? undefined;
  _dom.btnGenerate = _container.querySelector('#btn-generate-0') ?? undefined;
  _dom.previewPanel = _container.querySelector('#preview-0') ?? undefined;
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
  const currentStep = state.steps[0];
  if (!currentStep?.stepId) {
    showError('Error: step ID no encontrado.');
    return;
  }

  _setLoading(true);
  showLoading('Generando documento de Marco de Referencia del Cliente...');

  try {
    _store.setStepInputData(0, inputData);

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
        phaseId: 'F0',
        promptId: 'F0',
        context,
        userInputs: inputData,
      }
    );

    if (res.data) {
      _store.setStepDocument(0, res.data.content, res.data.documentId);
      _renderPreview(res.data.content);
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Error al generar el documento');
    _store.setStepStatus(0, 'error');
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
export async function initStep0(
  container: HTMLElement,
  store: typeof import('../stores/wizard.store').wizardStore
): Promise<void> {
  _container = container;
  _store = store;

  const state = store.getState();
  const step = state.steps[0];

  // Si hay documento previo, mostrarlo directamente
  const previewHtml = step?.documentContent
    ? `<div class="document-preview p-6 bg-gray-50 rounded-xl border border-gray-200 max-h-96 overflow-y-auto">
        ${renderMarkdown(step.documentContent)}
       </div>`
    : '';

  container.innerHTML = `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Marco de Referencia del Cliente</h2>
        <p class="text-gray-500 mt-1">La IA investigará el sector, la competencia y las mejores prácticas para tu proyecto.</p>
      </div>

      <form id="step-0-form" class="space-y-4">
        <div class="grid md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del proyecto *</label>
          <input name="projectName" type="text" required placeholder="Ej: Curso de Seguridad Industrial"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del candidato *</label>
          <input name="clientName" type="text" required placeholder="Nombre completo"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Industria / Sector *</label>
          <input name="industry" type="text" required placeholder="Ej: Manufactura, Salud, Educación"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
          <input name="email" type="email" placeholder="correo@empresa.com"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Descripción breve del curso a desarrollar *</label>
          <textarea name="courseDescription" required rows="3" placeholder="Describe brevemente qué aprenderán los participantes..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Público objetivo</label>
          <input name="targetAudience" type="text" placeholder="Ej: Operadores de planta con 1-3 años de experiencia"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>
      </form>

      <button id="btn-generate-0"
        class="w-full bg-blue-900 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-800 transition-colors">
        ✨ Generar documento con IA
      </button>

      <div id="preview-0">
        ${previewHtml}
      </div>
    </div>
  `;

  // Guardar stepId si el proyecto ya existe
  if (state.projectId && !step?.stepId) {
    try {
      const res = await postData<{ stepId: string }>(ENDPOINTS.wizard.saveStep, {
        projectId: state.projectId,
        stepNumber: 0,
        inputData: step?.inputData ?? {},
      });
      if (res.data) store.setStepId(0, res.data.stepId);
    } catch { /* silent */ }
  }

  _cacheDOM();
  _bindEvents();
}
