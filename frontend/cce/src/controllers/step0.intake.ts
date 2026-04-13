// src/controllers/step0.intake.ts — CCE Step 0: Datos del Cliente (INTAKE)
// Crea el proyecto y genera el Marco de Referencia (F0) en un solo flujo.
import { BaseStep } from '../shared/step.base';
import { postData, getData } from '@core/http.client';
import { ENDPOINTS, buildEndpoint } from '../shared/endpoints';
import { wizardStore } from '../stores/wizard.store';
import { showLoading, hideLoading } from '@core/ui';

class Step0IntakeController extends BaseStep {
  constructor() {
    super({
      stepNumber: 0,
      templateId: 'tpl-step0-intake',
      phaseId: 'INTAKE',
      promptId: 'F0',
      createProjectFirst: true,
      uiConfig: { loadingText: 'Creando proyecto y generando Marco de Referencia (F0)...' },
    });
  }

  private _crawlerStatusUI?: HTMLElement;

  protected override _cacheDOM(): void {
    super._cacheDOM();
    this._crawlerStatusUI = this._container.querySelector<HTMLElement>('#crawler-status') ?? undefined;
  }

  private async _runCrawler(websiteUrl: string, projectId: string): Promise<void> {
    if (this._crawlerStatusUI) {
      this._crawlerStatusUI.classList.remove('hidden');
    }
    showLoading('Analizando sitio web con CrawlerIA...');
    
    try {
      const res = await postData<{ crawlId: string }>(
        buildEndpoint(ENDPOINTS.wizard.crawl),
        { projectId, websiteUrl }
      );
      if (res.data?.crawlId) {
        await this._pollCrawlerStatus(res.data.crawlId);
      }
    } catch {
      // Ignorar fallo del crawler para no bloquear flujo F0
    } finally {
      if (this._crawlerStatusUI) {
        this._crawlerStatusUI.classList.add('hidden');
      }
      hideLoading();
    }
  }

  private _pollCrawlerStatus(crawlId: string): Promise<void> {
    return new Promise((resolve) => {
      const poll = async () => {
        try {
          const res = await getData<{ status: string }>(
            buildEndpoint(ENDPOINTS.wizard.crawlStatus(crawlId))
          );
          if (res.data?.status === 'completed' || res.data?.status === 'failed') {
            resolve();
          } else {
            setTimeout(poll, 2000);
          }
        } catch {
          resolve(); // Fallback on error
        }
      };
      void poll();
    });
  }

  protected override async _generateDocument(extraData?: Record<string, unknown>): Promise<void> {
    const formData = { ...this._collectFormData(), ...extraData };
    
    // Si no tenemos proyecto, lo creamos primero (comportamiento de BaseStep copiado a mano aquí temporalmente)
    let state = wizardStore.getState();
    if (!state.projectId) {
      const projectId = await this._createProject(formData);
      if (!projectId) return;
      state = wizardStore.getState();
    }

    const websiteUrl = formData['websiteUrl'] as string;
    if (websiteUrl && state.projectId) {
      await this._runCrawler(websiteUrl, state.projectId);
    }
    
    // Y luego sí, generamos el F0
    // Llama al original saltando la creación (ya lo hicimos)
    this._config.createProjectFirst = false; 
    await super._generateDocument(extraData);
    this._config.createProjectFirst = true;
  }
}

const _instance = new Step0IntakeController();
export const Step0Intake = {
  mount: (container: HTMLElement) => _instance.mount(container),
  getData: () => _instance.getData(),
};
