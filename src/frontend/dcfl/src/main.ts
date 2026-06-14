// frontend/dcfl/src/main.ts
// Orquestador principal del microsite DCFL (EC0366)
import { getCurrentUser, signInWithGoogle, signOut, onAuthStateChange } from '@core/auth';
import { wizardStore } from './stores/wizard.store';
import { showError, showLoading, hideLoading } from '@core/ui';
import { getData } from '@core/http.client';
import { buildEndpoint, ENDPOINTS } from './shared/endpoints';

// Importar controladores
import { Step0ClientData } from './controllers/step0.clientdata';
import { Step1Needs } from './controllers/step1.needs';
import { Step2Analysis } from './controllers/step2.analysis';
import { Step3Recommendations } from './controllers/step3.recommendations';
import { Step4Specs } from './controllers/step3.specs';
import { Step5Production } from './controllers/step4.production';
import { Step6Checklist } from './controllers/step6.checklist';
import { Step7Evidence } from './controllers/step7.evidence';
import { Step8Adjustments } from './controllers/step8.adjustments';
import { Step9Inventory } from './controllers/step9.inventory';
import { Step10Summary } from './controllers/step10.summary';
import { Step11Closing } from './controllers/step11.closing';

// Registro de controladores — SSOT para navegación (índice = stepNumber)
const STEP_CONTROLLERS = [
  Step0ClientData,      // 0  F0   — Marco de Referencia
  Step1Needs,           // 1  F1   — Informe de Necesidades
  Step2Analysis,        // 2  F2   — Especificaciones de Análisis (confrontación F1↔F2 integrada)
  Step3Recommendations, // 3  F2.5 — Recomendaciones Pedagógicas
  Step4Specs,           // 4  F3   — Especificaciones Técnicas
  Step5Production,      // 5  F4   — Producción (sub-wizard 8 productos)
  Step6Checklist,       // 6  F5.1 — Verificación
  Step7Evidence,        // 7  F5.2 — Evidencias
  Step8Adjustments,     // 8  F6.1 — Ajustes (formulario dinámico)
  Step9Inventory,       // 9  F6.2a — Inventario y Firmas
  Step10Summary,        // 10 F6.2b — Resumen Ejecutivo y Declaración
  Step11Closing,        // 11 CLOSE — Finalización
] as const;

// ============================================================================
// DOM REFERENCES
// ============================================================================
const viewAuth = document.getElementById('view-auth')!;
const viewApp  = document.getElementById('view-app')!;
const headerEmail = document.getElementById('header-user-email')!;
const btnGoogleLogin = document.getElementById('btn-google-login')!;
const btnLogout = document.getElementById('btn-logout')!;
const wizardContainer = document.getElementById('wizard-container')!;
const dashboardContainer = document.getElementById('dashboard-container')!;
const wizardProgress = document.getElementById('wizard-progress')!;
const wizardStepContent = document.getElementById('wizard-step-content')!;
const btnPrev = document.getElementById('btn-prev-step') as HTMLButtonElement;
const btnNext = document.getElementById('btn-next-step') as HTMLButtonElement;

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

  try {
    const res = await getData<unknown[]>(buildEndpoint(ENDPOINTS.wizard.listProjects));
    renderDashboard(res.data ?? []);
  } catch {
    renderDashboard([]);
  }
}

function renderDashboard(projects: unknown[]): void {
  const rows = (projects as Record<string, unknown>[]).map((p) => `
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer project-card"
      data-project-id="${p['project_id']}">
      <div class="font-semibold text-gray-900 text-lg mb-1">${p['name']}</div>
      <div class="text-gray-500 text-sm mb-4">${p['client_name']}</div>
      <div class="flex items-center gap-2">
        <div class="flex-1 bg-gray-100 rounded-full h-2">
          <div class="bg-blue-900 rounded-full h-2 transition-all" style="width:${p['progress_pct'] ?? 0}%"></div>
        </div>
        <span class="text-xs text-gray-500">${p['progress_pct'] ?? 0}%</span>
      </div>
    </div>
  `).join('');

  dashboardContainer.innerHTML = `
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Mis proyectos</h1>
        <p class="text-gray-500 mt-1">Procesos de certificación EC0366</p>
      </div>
      <button id="btn-new-project"
        class="bg-blue-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors">
        + Nuevo proyecto
      </button>
    </div>
    ${projects.length === 0
      ? '<div class="text-center py-20 text-gray-400"><p class="text-6xl mb-4">📂</p><p class="text-lg">No tienes proyectos aún.</p></div>'
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
    showLoading('Cargando proyecto...');
    const res = await getData<Record<string, unknown>>(
      buildEndpoint(ENDPOINTS.wizard.getProject(projectId))
    );
    const project = res.data?.['project'] as Record<string, unknown> | undefined;
    const steps = res.data?.['steps'] as Record<string, unknown>[] | undefined;
    
    if (project) {
      wizardStore.setProjectId(projectId);
      wizardStore.setClientData({
        projectName: String(project['name'] ?? ''),
        clientName: String(project['client_name'] ?? ''),
        industry: String(project['industry'] ?? ''),
        email: String(project['email'] ?? ''),
      });

      // Reset all steps to pending before hydrating from DB so stale localStorage
      // state doesn't bleed through for steps that are pending in the DB.
      for (let i = 0; i <= 11; i++) {
        wizardStore.setStepStatus(i, 'pending');
      }

      let maxCompleted = -1;

      if (steps) {
        for (const apiStep of steps) {
          const stepNumber = Number(apiStep['step_number']);
          const status = String(apiStep['status']);
          const outputText = apiStep['output_text'] as string | undefined;
          const stepId = apiStep['id'] as string;

          if (apiStep['input_data']) {
            const parsedInput = typeof apiStep['input_data'] === 'string' 
              ? JSON.parse(apiStep['input_data']) 
              : apiStep['input_data'];
            wizardStore.setStepInputData(stepNumber, parsedInput);
          }
          if (status === 'completed') {
            maxCompleted = Math.max(maxCompleted, stepNumber);
            if (outputText) {
              wizardStore.setStepDocument(stepNumber, outputText, stepId);
            } else {
              wizardStore.setStepStatus(stepNumber, 'completed');
            }
          }
          if (stepId) wizardStore.setStepId(stepNumber, stepId);
        }
        // Reparación de hidratación: Si un paso superior está completado, 
        // los pasos inferiores (aunque fuesen saltados) se marcan visualmente como completados.
        // Opcional: Esto ya no debería ser necesario si iteramos buscando el primer incompleto.
        // for (let i = 0; i < maxCompleted; i++) {
        //    if (wizardStore.getState().steps[i].status !== 'completed') {
        //       wizardStore.setStepStatus(i, 'completed');
        //    }
        // }
      }

      // Calcular nextStep como el PRIMER paso que devuelva status !== 'completed'
      let nextStep = 11;
      const storeSteps = wizardStore.getState().steps;
      for (let i = 0; i <= 11; i++) {
        if (storeSteps[i].status !== 'completed') {
          nextStep = i;
          break;
        }
      }
      wizardStore.goToStep(nextStep);
    }
    dashboardContainer.classList.add('hidden');
    wizardContainer.classList.remove('hidden');
    renderProgress();
    await loadStep(wizardStore.getCurrentStep());
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Error al cargar el proyecto');
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
            <span class="text-xs mt-1 text-gray-500 hidden lg:block max-w-16 text-center leading-tight">${step.label}</span>
          </div>
          ${i < steps.length - 1 ? '<div class="w-6 h-px bg-gray-200 flex-shrink-0 mb-4"></div>' : ''}
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
  btnNext.textContent = n === 11 ? '🎉 Finalizar' : 'Siguiente →';

  await controller.mount(wizardStepContent);
  renderProgress();
}

btnPrev.addEventListener('click', () => {
  wizardStore.prevStep();
  void loadStep(wizardStore.getCurrentStep());
});

btnNext.addEventListener('click', () => {
  // Guardar los datos del formulario actual antes de navegar al siguiente paso
  const currentStep = wizardStore.getCurrentStep();
  const controller = STEP_CONTROLLERS[currentStep];
  if (controller) {
    const data = controller.getData();
    if (Object.keys(data).length > 0) {
      wizardStore.setStepInputData(currentStep, data);
    }
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
