// frontend/cce/src/shared/step.factory.ts
// Factory para crear controladores de paso del wizard CCE.

import { BaseStep, type StepConfig } from './step.base';

export interface StepController {
  mount: (container: HTMLElement) => Promise<void>;
  getData: () => Record<string, unknown>;
}

export function createStep(config: StepConfig): StepController {
  const instance = new BaseStep(config);
  return {
    mount: (container) => instance.mount(container),
    getData: () => instance.getData(),
  };
}
