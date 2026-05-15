// src/controllers/step11.closing.ts
// HTML en: /templates/tpl-step9-closing.html

import { BaseStep } from '../shared/step.base';
import { getData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from '../shared/endpoints';
import { showError } from '@core/ui';
import { wizardStore } from '../stores/wizard.store';
import { ZipWriter, downloadBlob } from '../shared/zip';

// Nombre de archivo por stepNumber (índice 0-11)
const STEP_FILENAMES: Record<number, string> = {
  0:  '00_Marco_de_Referencia.md',
  1:  '01_Necesidades.md',
  2:  '02_Analisis.md',
  3:  '03_Recomendaciones.md',
  4:  '04_Especificaciones.md',
  // Step 5 se divide por productos — ver _addProductionFiles
  6:  '06_Verificacion.md',
  7:  '07_Evidencias.md',
  8:  '08_Ajustes.md',
  9:  '09_Inventario_Firmas.md',
  10: '10_Resumen_Declaracion.md',
  11: '11_Resumen_Cualitativo.md',
};

interface F4Producto {
  producto: string;
  documento_final: string | null;
}

class Step11ClosingController extends BaseStep {
  constructor() {
    super({
      stepNumber: 11,
      templateId: 'tpl-step9-closing',
      phaseId: 'F7',
      promptId: 'F7',
      allowManualOverride: true,
      uiConfig: {
        loadingText: 'Finalizando expediente...',
        submitText: '🎉 Finalizar expediente',
        helpText:
          'Este es el último paso. Revisa que todos los productos del expediente estén completos. ' +
          'Al confirmar, el proceso de certificación EC0366 quedará registrado como finalizado.',
        summaryTemplate: (d) =>
          d['manualNotes']
            ? `Notas finales: ${String(d['manualNotes']).substring(0, 100)}`
            : 'Expediente listo para finalizar.',
      },
    });
  }

  /**
   * Añade al ZIP los 8 productos F4 obtenidos desde la BD.
   * Si la BD no está disponible, intenta extraer del documento combinado del store.
   */
  private async _addProductionFiles(zip: ZipWriter, projectId: string): Promise<void> {
    // Intentar obtener productos individuales desde la BD
    try {
      const res = await getData<{ productos: F4Producto[] }>(
        buildEndpoint(ENDPOINTS.wizard.fase4Productos(projectId)),
      );
      const productos = res.data?.productos ?? [];
      for (const p of productos) {
        if (p.documento_final) {
          const safeName = p.producto.replace(/[^a-zA-Z0-9_]/g, '');
          zip.addFile(`05_F4_${safeName}.md`, p.documento_final);
        }
      }
      if (productos.length > 0) return;
    } catch {
      // fallback al store
    }

    // Fallback: el documento combinado almacenado en el store
    const combined = wizardStore.getState().steps[5]?.documentContent;
    if (!combined) return;

    // Intentar separar por el separador que usa step4 al aprobar todos los productos
    const parts = combined.split(/(?=^---\n# PRODUCTO \d+:)/m).filter(Boolean);
    if (parts.length > 1) {
      parts.forEach((part, i) => {
        zip.addFile(`05_F4_P${i + 1}.md`, part.trim());
      });
    } else {
      zip.addFile('05_F4_Produccion.md', combined);
    }
  }

  private async _downloadExpediente(): Promise<void> {
    const state = wizardStore.getState();
    const projectId = state.projectId;
    if (!projectId) {
      showError('No hay proyecto activo para descargar.');
      return;
    }

    const btn = this._container.querySelector<HTMLButtonElement>('#btn-download-expediente');
    const originalText = btn?.querySelector('span:last-child')?.textContent ?? '';
    if (btn) {
      btn.disabled = true;
      const label = btn.querySelector('span:last-child');
      if (label) label.textContent = 'Preparando ZIP...';
    }

    try {
      const zip = new ZipWriter();
      const projectName = (state.clientData.projectName || 'Expediente')
        .replace(/[^\wÀ-ɏ\s-]/g, '')
        .trim()
        .replace(/\s+/g, '_');

      // Paso a paso (excluye step 5 — se añade por separado como productos individuales)
      for (const step of state.steps) {
        if (step.stepNumber === 5) continue;
        if (!step.documentContent) continue;
        const filename = STEP_FILENAMES[step.stepNumber];
        if (filename) zip.addFile(filename, step.documentContent);
      }

      // Fase 4: productos individuales desde BD
      await this._addProductionFiles(zip, projectId);

      const blob = zip.toBlob();
      downloadBlob(blob, `${projectName}_EC0366.zip`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error al generar el ZIP.');
    } finally {
      if (btn) {
        btn.disabled = false;
        const label = btn.querySelector('span:last-child');
        if (label) label.textContent = originalText;
      }
    }
  }

  override async mount(container: HTMLElement): Promise<void> {
    await super.mount(container);

    container.querySelector<HTMLButtonElement>('#btn-download-expediente')
      ?.addEventListener('click', () => void this._downloadExpediente());
  }
}

const _instance = new Step11ClosingController();

export const Step11Closing = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
