// src/main.ts
// Orquestador principal: maneja auth, navegación entre vistas y pasos del wizard

import { getCurrentUser, signInWithGoogle, signOut, onAuthStateChange } from './shared/auth';
import { wizardStore } from './stores/wizard.store';
import { showError, showLoading, hideLoading } from './shared/ui';
import { postData, getData } from './shared/http.client';
import { ENDPOINTS } from './shared/endpoints';
import type { WizardState } from './types/wizard.types';

// Controllers (importación lazy por paso)
import { initStep0 } from './controllers/step0.clientdata';
import { initStep1 } from './controllers/step1.needs';
import { initStep2 } from './controllers/step2.analysis';
import { initStep3 } from './controllers/step3.specs';
import { initStep4 } from './controllers/step4.production';
import { initStep5 } from './controllers/step5.checklist';
import { initStep6 } from './controllers/step6.evidence';
import { initStep7 } from './controllers/step7.adjustments';
import { initStep8 } from './controllers/step8.signatures';
import { initStep9 } from './controllers/step9.closing';

const STEP_INIT_FNS = [
  initStep0, initStep1, initStep2, initStep3, initStep4,
  initStep5, initStep6, initStep7, initStep8, initStep9,
];

// ============================================================================
// DOM references
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
btnGoogleLogin.addEventListener('click', () => signInWithGoogle().catch(showError));
btnLogout.addEventListener('click', () => signOut());

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
    const res = await getData<unknown[]>(ENDPOINTS.wizard.listProjects);
    const projects = res.data ?? [];
    renderDashboard(projects);
  } catch {
    renderDashboard([]);
  }
}

function renderDashboard(projects: unknown[]): void {
  dashboardContainer.innerHTML = `
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Mis proyectos</h1>
        <p class="text-gray-500 mt-1">Gestiona tus procesos de certificación EC0366</p>
      </div>
      <button id="btn-new-project"
        class="bg-blue-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors flex items-center gap-2">
        <span class="material-symbols-outlined text-sm">add</span>
        Nuevo proyecto
      </button>
    </div>
    ${projects.length === 0
      ? `<div class="text-center py-20 text-gray-400">
          <span class="material-symbols-outlined text-6xl mb-4 block">folder_open</span>
          <p class="text-lg">No tienes proyectos aún.</p>
          <p class="text-sm mt-2">Crea tu primer proyecto para comenzar.</p>
        </div>`
      : `<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          ${(projects as Record<string, unknown>[]).map((p) => `
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer project-card"
              data-project-id="${p['project_id']}">
              <div class="font-semibold text-gray-900 text-lg mb-1">${p['name']}</div>
              <div class="text-gray-500 text-sm mb-4">${p['client_name']}</div>
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-gray-100 rounded-full h-2">
                  <div class="bg-blue-900 rounded-full h-2" style="width:${p['progress_pct']}%"></div>
                </div>
                <span class="text-xs text-gray-500">${p['progress_pct']}%</span>
              </div>
              <div class="mt-3 text-xs text-gray-400">Paso ${p['current_step']} / 9</div>
            </div>
          `).join('')}
        </div>`
    }
  `;

  document.getElementById('btn-new-project')?.addEventListener('click', () => startNewProject());

  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('click', () => {
      const projectId = (card as HTMLElement).dataset['projectId'];
      if (projectId) resumeProject(projectId);
    });
  });
}

// ============================================================================
// WIZARD NAVIGATION
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
    const res = await getData<Record<string, unknown>>(ENDPOINTS.wizard.getProject(projectId));
    const project = res.data?.['project'] as Record<string, unknown> | undefined;

    if (project) {
      wizardStore.setProjectInfo({
        projectId,
        projectName: String(project['name'] ?? ''),
        clientName: String(project['client_name'] ?? ''),
        industry: String(project['industry'] ?? ''),
        email: String(project['email'] ?? ''),
      });
      wizardStore.goToStep(Number(project['current_step'] ?? 0));
    }

    dashboardContainer.classList.add('hidden');
    wizardContainer.classList.remove('hidden');
    renderProgress();
    await loadStep(wizardStore.getState().currentStep);
  } catch (e) {
    showError(e instanceof Error ? e.message : 'Error al cargar el proyecto');
  } finally {
    hideLoading();
  }
}

function renderProgress(): void {
  const state = wizardStore.getState();
  wizardProgress.innerHTML = `
    <div class="flex items-center gap-1 overflow-x-auto pb-2">
      ${state.steps.map((step, i) => `
        <div class="flex items-center gap-1 flex-shrink-0">
          <div class="flex flex-col items-center">
            <div class="wizard-step-indicator ${
              step.status === 'completed' ? 'completed' :
              i === state.currentStep ? 'active' : 'pending'
            }" title="${step.label}">
              ${step.status === 'completed'
                ? '<span class="material-symbols-outlined text-sm">check</span>'
                : String(i + 1)
              }
            </div>
            <span class="text-xs mt-1 text-gray-500 hidden md:block">${step.label}</span>
          </div>
          ${i < state.steps.length - 1
            ? `<div class="w-8 h-px bg-gray-200 flex-shrink-0 mb-4"></div>`
            : ''
          }
        </div>
      `).join('')}
    </div>
  `;
}

async function loadStep(n: number): Promise<void> {
  const initFn = STEP_INIT_FNS[n];
  if (!initFn) return;

  wizardStepContent.innerHTML = '';

  const state = wizardStore.getState();
  btnPrev.disabled = n === 0;
  btnPrev.classList.toggle('opacity-50', n === 0);
  btnNext.textContent = n === state.steps.length - 1 ? '🎉 Finalizar' : 'Siguiente →';

  await initFn(wizardStepContent, wizardStore);
  renderProgress();
}

btnPrev.addEventListener('click', () => {
  const { currentStep } = wizardStore.getState();
  if (currentStep > 0) {
    wizardStore.goToStep(currentStep - 1);
    loadStep(currentStep - 1);
  }
});

btnNext.addEventListener('click', async () => {
  const { currentStep, steps } = wizardStore.getState();
  if (currentStep < steps.length - 1) {
    wizardStore.goToStep(currentStep + 1);
    await loadStep(currentStep + 1);
  } else {
    // Cierre del wizard
    alert('¡Proceso completado! Descarga tu expediente desde el panel de proyectos.');
    wizardStore.reset();
    await initDashboard();
  }
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
