// src/controllers/step9.closing.ts
// Paso 9: Finalización del proceso

import type { WizardStore } from '../stores/wizard.store';

export async function initStep9(
  container: HTMLElement,
  store: typeof import('../stores/wizard.store').wizardStore
): Promise<void> {
  const state = store.getState();
  const completedSteps = state.steps.filter((s) => s.status === 'completed').length;
  const totalDocs = state.steps.length - 1; // excluir el paso de cierre

  container.innerHTML = `
    <div class="text-center py-12 space-y-6">
      <div class="text-6xl">🎉</div>
      <h2 class="text-3xl font-bold text-gray-900">¡Proceso completado!</h2>
      <p class="text-gray-500 max-w-md mx-auto">
        Has generado <strong>${completedSteps} de ${totalDocs}</strong> documentos del expediente EC0366.
        Tu carpeta de certificación está lista.
      </p>

      <div class="bg-green-50 border border-green-200 rounded-xl p-6 max-w-md mx-auto text-left">
        <p class="font-semibold text-green-800 mb-3">📁 Próximos pasos:</p>
        <ol class="text-green-700 text-sm space-y-2 list-decimal list-inside">
          <li>Descarga todos los documentos generados</li>
          <li>Revisa que estén firmados donde corresponde</li>
          <li>Entrega el expediente a tu Organismo Certificador</li>
          <li>Agenda tu evaluación con el evaluador asignado</li>
        </ol>
      </div>

      <div class="flex justify-center gap-4 pt-4">
        <button id="btn-download-all"
          class="bg-blue-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors">
          📥 Descargar expediente completo
        </button>
        <button id="btn-new-project-close"
          class="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
          🆕 Nuevo proyecto
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-download-all')?.addEventListener('click', () => {
    // Compilar todos los documentos en un solo texto descargable
    const docs = state.steps
      .filter((s) => s.documentContent)
      .map((s) => `\n\n${'='.repeat(60)}\n${s.label.toUpperCase()}\n${'='.repeat(60)}\n\n${s.documentContent}`)
      .join('');

    const blob = new Blob([`EXPEDIENTE EC0366\nProyecto: ${state.projectName}\nCandidato: ${state.clientName}\n${docs}`], {
      type: 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expediente-EC0366-${state.projectName.replace(/\s+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-new-project-close')?.addEventListener('click', () => {
    store.reset();
    window.location.reload();
  });
}
