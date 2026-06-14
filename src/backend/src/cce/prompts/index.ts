// src/cce/prompts/index.ts
// Prompt Registry para CCE (EC0249).
// Delega al PromptRegistry unificado de core con soporte para BD (site_prompts).
// Mantiene las exportaciones originales para compatibilidad.

import type { IPromptRegistry, PromptEntry, PromptMetadata, PipelineStep } from '../../core/types/pipeline.types';
import { PromptRegistry as CorePromptRegistry } from '../../core/prompts/registry';
import type { PromptId } from '../types/wizard.types';

import F0             from './templates/F0-marco-referencia.md';
import F0_FORM        from './templates/F0-client-questions-form.md';
import F1_1           from './templates/F1-1-instrumentos.md';
import F1_2           from './templates/F1-2-diagnostico.md';
import F1_2_SYNTHESIS from './templates/F1-2-fieldwork-synthesis.md';
import F2             from './templates/F2-priorizacion.md';
import F2_5           from './templates/F2-5-pedagogia.md';
import F3             from './templates/F3-especificaciones.md';
import F4             from './templates/F4-produccion.md';
import F5             from './templates/F5-verificacion.md';
import F5_FORM        from './templates/F5-test-report-form.md';
import F6             from './templates/F6-ajustes-cierre.md';

export const CCE_PROMPT_MAP: Record<PromptId, string> = {
  F0,
  F0_CLIENT_QUESTIONS_FORM: F0_FORM,
  F1_1,
  F1_2,
  F1_2_FIELDWORK_SYNTHESIS: F1_2_SYNTHESIS,
  F2,
  F2_5,
  F3,
  F4,
  F5,
  F5_TEST_REPORT_FORM: F5_FORM,
  F6,
};

// Singleton que usa el PromptRegistry unificado de core
const coreRegistry = new CorePromptRegistry({
  siteId:   'cce',
  localMap: CCE_PROMPT_MAP,
});

export const getPromptRegistry = (): CorePromptRegistry => coreRegistry;

// Re-exportar tipos para compatibilidad
export type { PromptEntry, PromptMetadata, PipelineStep, IPromptRegistry };
