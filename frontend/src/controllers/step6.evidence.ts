// src/controllers/step6.evidence.ts
// Paso 6: F5.2 Anexo de Evidencias del Curso
// Estructura de 7 secciones — FRONTEND ARCHITECTURE DOCUMENT

// ============================================================================
// 1. DEPENDENCIAS
// ============================================================================
import { postData } from '../shared/http.client';
import { ENDPOINTS } from '../shared/endpoints';
import { showLoading, hideLoading, showError, renderMarkdown } from '../shared/ui';

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
  _dom.form        = _container.querySelector('#step-6-form') ?? undefined;
  _dom.btnGenerate = _container.querySelector('#btn-generate-6') ?? undefined;
  _dom.previewPanel = _container.querySelector('#preview-6') ?? undefined;
};

// ============================================================================
// 4. LÓGICA DE VISTA
// ============================================================================
const _renderPreview = (content: string): void => {
  if (!_dom.previewPanel) return;
  _dom.previewPanel.innerHTML = `
    <div class="document-preview bg-gray-50 border border-gray-200 rounded-xl p-6 max-h-96 overflow-y-auto text-sm">
      ${renderMarkdown(content)}
    </div>
    <div class="mt-3 flex gap-2">
      <button id="btn-copy-6" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
        📋 Copiar
      </button>
    </div>
  `;
  document.getElementById('btn-copy-6')?.addEventListener('click', () => {
    navigator.clipboard.writeText(content).then(() => alert('Copiado'));
  });
};

const _setLoading = (loading: boolean): void => {
  if (!_dom.btnGenerate) return;
  _dom.btnGenerate.disabled = loading;
  _dom.btnGenerate.textContent = loading ? '⏳ Generando con IA...' : '✨ Generar Anexo de Evidencias';
};

// ============================================================================
// 5. LÓGICA DE NEGOCIO
// ============================================================================
const _collectFormData = (): Record<string, unknown> => {
  const data: Record<string, unknown> = {};
  if (!_dom.form) return data;
  new FormData(_dom.form).forEach((v, k) => { data[k] = v; });
  return data;
};

const _generateDocument = async (): Promise<void> => {
  const state = _store.getState();
  if (!state.projectId) { showError('No hay proyecto activo.'); return; }

  const inputData = _collectFormData();
  let stepId = state.steps[6]?.stepId;

  if (!stepId) {
    try {
      const res = await postData<{ stepId: string }>(ENDPOINTS.wizard.saveStep, {
        projectId: state.projectId, stepNumber: 6, inputData,
      });
      if (res.data?.stepId) {
        stepId = res.data.stepId;
        _store.setStepId(6, stepId);
      }
    } catch { /* continuar */ }
  }

  if (!stepId) { showError('No se pudo registrar el paso.'); return; }

  _setLoading(true);
  showLoading('Generando Anexo de Evidencias...');
  _store.setStepInputData(6, inputData);

  try {
    const context = _store.buildContext() as {
      projectName: string; clientName: string;
      industry?: string; email?: string;
      previousData?: Record<string, unknown>;
    };

    const res = await postData<{ documentId: string; content: string }>(
      ENDPOINTS.wizard.generate,
      { projectId: state.projectId, stepId, phaseId: 'F5.2', promptId: 'F5_2', context, userInputs: inputData }
    );

    if (res.data) {
      _store.setStepDocument(6, res.data.content, res.data.documentId);
      _renderPreview(res.data.content);
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Error al generar el documento');
    _store.setStepStatus(6, 'error');
  } finally {
    _setLoading(false);
    hideLoading();
  }
};

// ============================================================================
// 6. EVENTOS
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
export async function initStep6(
  container: HTMLElement,
  store: typeof import('../stores/wizard.store').wizardStore
): Promise<void> {
  _container = container;
  _store = store;

  const step = store.getState().steps[6];
  const previewHtml = step?.documentContent
    ? `<div class="document-preview bg-gray-50 border border-gray-200 rounded-xl p-6 max-h-96 overflow-y-auto text-sm">${renderMarkdown(step.documentContent)}</div>`
    : '';

  container.innerHTML = `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Anexo de Evidencias del Curso</h2>
        <p class="text-gray-500 mt-1">Documenta las capturas de pantalla y URLs que acreditan el funcionamiento del curso.</p>
      </div>
      <form id="step-6-form" class="space-y-4" novalidate>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">URL del curso publicado en el LMS *</label>
          <input name="courseUrl" type="url" required placeholder="https://mi-lms.com/cursos/mi-curso"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">URL del reporte de seguimiento (SCORM/xAPI)</label>
          <input name="reportUrl" type="url" placeholder="https://mi-lms.com/reportes/..."
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Descripción de las capturas tomadas</label>
          <textarea name="screenshotsDescription" rows="3"
            placeholder="Captura 1: Pantalla de inicio&#10;Captura 2: Módulo completado&#10;Captura 3: Certificado emitido"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Número de certificados emitidos</label>
          <input name="certificatesIssued" type="number" min="0" placeholder="10"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500" />
        </div>
        <button id="btn-generate-6" type="button"
          class="w-full bg-blue-900 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-800 transition-colors">
          ✨ Generar Anexo de Evidencias
        </button>
      </form>
      <div id="preview-6">${previewHtml}</div>
    </div>
  `;

  _cacheDOM();
  _bindEvents();
}