// frontend/cce/src/main.ts
// Orquestador principal del microsite CCE (EC0249 — Consultoría Empresarial)
import { getCurrentUser, signInWithGoogle, signOut, onAuthStateChange } from '@core/auth';
import { wizardStore } from './stores/wizard.store';
import { showError, showLoading, hideLoading } from '@core/ui';
import { getData } from '@core/http.client';
import { buildEndpoint, ENDPOINTS } from './shared/endpoints';

// Controladores de pasos
import { Step0Intake } from './controllers/step0.intake';
import { Step1Reference } from './controllers/step1.reference';
import { Step4Fieldwork } from './controllers/step4.fieldwork';
import { Step5Diagnosis } from './controllers/step5.diagnosis';
import { Step6Prioritization } from './controllers/step6.prioritization';
import { Step7Strategy } from './controllers/step7.strategy';
import { Step8Production } from './controllers/step8.production';
import { Step9Closing } from './controllers/step9.closing';

// Registro SSOT — índice = stepNumber (0–7)
const STEP_CONTROLLERS = [
  Step0Intake,          // 0  INTAKE          — Datos del Cliente (genera F0)
  Step1Reference,       // 1  F1_1            — Marco de Referencia + Respuestas + Instrumentos
  Step4Fieldwork,       // 2  F1_2_FIELDWORK  — Trabajo de Campo
  Step5Diagnosis,       // 3  F1_2            — Diagnóstico Organizacional
  Step6Prioritization,  // 4  F2              — Priorización
  Step7Strategy,        // 5  F2_5 + F3       — Estrategia y Especificaciones
  Step8Production,      // 6  F4              — Producción (7 productos)
  Step9Closing,         // 7  F5+F6+CLOSE     — Verificación, Pruebas, Ajustes y Cierre
] as const;

const MAX_STEP = STEP_CONTROLLERS.length - 1; // 7

// ============================================================================
// DOM REFERENCES
// ============================================================================
const viewAuth           = document.getElementById('view-auth')!;
const viewApp            = document.getElementById('view-app')!;
const headerEmail        = document.getElementById('header-user-email')!;
const btnGoogleLogin     = document.getElementById('btn-google-login')!;
const btnLogout          = document.getElementById('btn-logout')!;
const wizardContainer    = document.getElementById('wizard-container')!;
const dashboardContainer = document.getElementById('dashboard-container')!;
const wizardProgress     = document.getElementById('wizard-progress')!;
const wizardStepContent  = document.getElementById('wizard-step-content')!;
const btnPrev            = document.getElementById('btn-prev-step') as HTMLButtonElement;
const btnNext            = document.getElementById('btn-next-step') as HTMLButtonElement;

// ============================================================================
// AUTH
// ============================================================================
btnGoogleLogin.addEventListener('click', () => { void signInWithGoogle().catch(showError); });
btnLogout.addEventListener('click', () => { void signOut(); });

onAuthStateChange(async (user) => {
  if (user) {
    viewAuth.classList.add('hidden');
    viewApp.classList.remove('hidden');
    headerEmail.textContent = user.email;
    await initDashboard();
  } else {
    viewAuth.classList.remove('hidden');
    viewApp.classList.add('hidden');
  }
});

// ============================================================================
// DASHBOARD
// ============================================================================
async function initDashboard(): Promise<void> {
  dashboardContainer.classList.remove('hidden');
  wizardContainer.classList.add('hidden');

  // En dev: API devuelve [] — usamos localStorage para mostrar el proyecto activo
  const devProjects = wizardStore.getDevProjects();
  if (devProjects.length > 0) {
    renderDashboard(devProjects.map((p) => ({
      project_id: p.projectId,
      name: p.name,
      client_name: p.clientName,
      company_name: p.companyName,
      current_step: p.currentStep,
      total_steps: p.totalSteps,
      progress_pct: Math.round((p.currentStep / p.totalSteps) * 100),
      updated_at: p.updatedAt,
      _isLocal: true,
    })));
    return;
  }

  try {
    const res = await getData<unknown[]>(buildEndpoint(ENDPOINTS.wizard.listProjects));
    renderDashboard(res.data ?? []);
  } catch {
    renderDashboard([]);
  }
}

const STEP_LABELS = [
  'Datos del Cliente',
  'Marco de Referencia',
  'Trabajo de Campo',
  'Diagnóstico',
  'Priorización',
  'Estrategia y Specs',
  'Producción',
  'Verificación y Cierre',
];

function renderDashboard(projects: unknown[]): void {
  const rows = (projects as Record<string, unknown>[]).map((p) => {
    const pct = Number(p['progress_pct'] ?? 0);
    const currentStep = Number(p['current_step'] ?? 0);
    const stepLabel = STEP_LABELS[currentStep] ?? `Paso ${currentStep + 1}`;
    const updatedAt = p['updated_at'] ? String(p['updated_at']) : '';
    const isLocal = Boolean(p['_isLocal']);

    return `
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md
      transition-shadow cursor-pointer project-card" data-project-id="${p['project_id'] as string}">
      <div class="font-semibold text-gray-900 text-lg mb-0.5">${p['name'] as string}</div>
      <div class="text-gray-600 text-sm mb-0.5">${p['client_name'] ?? ''}</div>
      <div class="text-gray-400 text-xs mb-3">${p['company_name'] ?? ''}</div>
      <div class="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span class="bg-green-50 text-green-800 border border-green-200 px-2 py-0.5 rounded-full">
          📍 ${stepLabel}
        </span>
        ${updatedAt ? `<span>${updatedAt}</span>` : ''}
      </div>
      <div class="flex items-center gap-2">
        <div class="flex-1 bg-gray-100 rounded-full h-2">
          <div class="bg-green-900 rounded-full h-2 transition-all" style="width:${pct}%"></div>
        </div>
        <span class="text-xs text-gray-500">${pct}%</span>
      </div>
      ${isLocal ? '<p class="text-xs text-gray-300 mt-2">Sesión local</p>' : ''}
    </div>`;
  }).join('');

  dashboardContainer.innerHTML = `
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Mis consultorías</h1>
        <p class="text-gray-500 mt-1">Procesos de consultoría EC0249</p>
      </div>
      <button id="btn-new-project"
        class="bg-green-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition-colors">
        + Nueva consultoría
      </button>
    </div>
    ${projects.length === 0
      ? '<div class="text-center py-20 text-gray-400"><p class="text-6xl mb-4">💼</p><p class="text-lg">No tienes consultorías aún.</p></div>'
      : `<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">${rows}</div>`
    }
  `;

  document.getElementById('btn-new-project')?.addEventListener('click', () => { void startNewProject(); });
  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset['projectId'];
      if (id) void resumeProject(id);
    });
  });
}

// ============================================================================
// WIZARD
// ============================================================================
async function startNewProject(): Promise<void> {
  wizardStore.reset();
  dashboardContainer.classList.add('hidden');
  wizardContainer.classList.remove('hidden');
  renderProgress();
  await loadStep(0);
}

async function resumeProject(projectId: string): Promise<void> {
  try {
    showLoading('Cargando consultoría...');

    // 1. Intentar restaurar estado completo desde localStorage
    //    (cubre dev mode y re-apertura en la misma sesión del navegador)
    const restoredFromLocal = wizardStore.restoreFromLocalStorage(projectId);

    if (!restoredFromLocal) {
      // 2. En producción: cargar desde API y restaurar datos básicos
      const res = await getData<Record<string, unknown>>(
        buildEndpoint(ENDPOINTS.wizard.getProject(projectId))
      );
      const project = res.data?.['project'] as Record<string, unknown> | undefined;
      if (project) {
        wizardStore.setProjectId(projectId);
        wizardStore.setClientData({
          projectName:  String(project['name'] ?? ''),
          clientName:   String(project['client_name'] ?? ''),
          companyName:  String(project['company_name'] ?? ''),
          sector:       String(project['sector'] ?? ''),
          email:        String(project['email'] ?? ''),
        });
        wizardStore.goToStep(Number(project['current_step'] ?? 0));
      }
    }

    dashboardContainer.classList.add('hidden');
    wizardContainer.classList.remove('hidden');
    renderProgress();
    await loadStep(wizardStore.getCurrentStep());
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Error al cargar la consultoría');
  } finally {
    hideLoading();
  }
}

function renderProgress(): void {
  const { steps, currentStep } = wizardStore.getState();
  wizardProgress.innerHTML = `
    <div class="flex items-center gap-1 overflow-x-auto pb-2 mb-6">
      ${steps.map((step, i) => `
        <div class="flex items-center gap-1 flex-shrink-0">
          <div class="flex flex-col items-center">
            <div class="wizard-step-indicator ${
              step.status === 'completed' ? 'completed' :
              i === currentStep ? 'active' : 'pending'
            }" title="${step.label}">
              ${step.status === 'completed' ? '✓' : String(i + 1)}
            </div>
            <span class="text-xs mt-1 text-gray-500 hidden lg:block max-w-16 text-center leading-tight">
              ${step.label}
            </span>
          </div>
          ${i < steps.length - 1 ? '<div class="w-4 h-px bg-gray-200 flex-shrink-0 mb-4"></div>' : ''}
        </div>
      `).join('')}
    </div>
  `;
}

async function loadStep(n: number): Promise<void> {
  const controller = STEP_CONTROLLERS[n];
  if (!controller) return;

  wizardStepContent.innerHTML = '';
  btnPrev.disabled = n === 0;
  btnPrev.classList.toggle('opacity-50', n === 0);
  btnNext.textContent = n === MAX_STEP ? '🎉 Finalizar' : 'Siguiente →';

  await controller.mount(wizardStepContent);
  renderProgress();
}

btnPrev.addEventListener('click', () => {
  wizardStore.prevStep();
  void loadStep(wizardStore.getCurrentStep());
});

btnNext.addEventListener('click', () => {
  if (wizardStore.getCurrentStep() === MAX_STEP) {
    // Finalizar — volver al dashboard
    void initDashboard();
    return;
  }
  wizardStore.nextStep();
  void loadStep(wizardStore.getCurrentStep());
});

// ============================================================================
// INIT
// ============================================================================
(async () => {
  const user = await getCurrentUser();
  if (user) {
    viewAuth.classList.add('hidden');
    viewApp.classList.remove('hidden');
    headerEmail.textContent = user.email;
    await initDashboard();
  } else {
    viewAuth.classList.remove('hidden');
  }
})();
