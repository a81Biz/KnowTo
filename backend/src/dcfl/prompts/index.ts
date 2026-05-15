// src/dcfl/prompts/index.ts
// Prompt Registry para DCFL (EC0366).
// Delega al PromptRegistry unificado de core inyectando el mapa local de .md.
// Mantiene las exportaciones originales para compatibilidad con imports existentes.

import type { IPromptRegistry, PromptEntry, PromptMetadata } from '../../core/types/pipeline.types';
import { PromptRegistry as CorePromptRegistry } from '../../core/prompts/registry';
import type { PromptId } from '../types/wizard.types';

// Importar todos los prompts como texto estático (compatible con Workers)
import F0     from './templates/F0-marco-referencia.md';
import F1     from './templates/F1-informe-necesidades.md';
import F2     from './templates/F2-estructuracion-temario.md';
import F2_5   from './templates/F2_5-recomendaciones.md';
import F3     from './templates/F3-especificaciones-tecnicas.md';
import F4_P1_FORM_SCHEMA from './templates/F4_P1_FORM_SCHEMA.md';
import F4_P1_GENERATE_DOCUMENT from './templates/F4_P1_GENERATE_DOCUMENT.md';
import F4_P2_FORM_SCHEMA from './templates/F4_P2_FORM_SCHEMA.md';
import F4_P3_FORM_SCHEMA from './templates/F4_P3_FORM_SCHEMA.md';
import F4_P4_FORM_SCHEMA from './templates/F4_P4_FORM_SCHEMA.md';
import F4_P5_FORM_SCHEMA from './templates/F4_P5_FORM_SCHEMA.md';
import F4_P6_FORM_SCHEMA from './templates/F4_P6_FORM_SCHEMA.md';
import F4_P7_FORM_SCHEMA from './templates/F4_P7_FORM_SCHEMA.md';
import F4_P8_FORM_SCHEMA from './templates/F4_P8_FORM_SCHEMA.md';
import F4_P2_GENERATE_DOCUMENT from './templates/F4_P2_GENERATE_DOCUMENT.md';
import F4_P3_GENERATE_DOCUMENT from './templates/F4_P3_GENERATE_DOCUMENT.md';
import F4_P3_ORCHESTRATOR from './templates/F4_P3_ORCHESTRATOR.md';
import F4_P4_GENERATE_DOCUMENT from './templates/F4_P4_GENERATE_DOCUMENT.md';
import F4_P5_GENERATE_DOCUMENT from './templates/F4_P5_GENERATE_DOCUMENT.md';
import F4_P6_GENERATE_DOCUMENT from './templates/F4_P6_GENERATE_DOCUMENT.md';
import F4_P7_GENERATE_DOCUMENT from './templates/F4_P7_GENERATE_DOCUMENT.md';
import F4_P8_GENERATE_DOCUMENT from './templates/F4_P8_GENERATE_DOCUMENT.md';
import F5     from './templates/F5-verificacion.md';
import F5_2   from './templates/F5_2-evidencias.md';
import F6     from './templates/F6-ajustes.md';
import F6_FORM from './templates/F6_FORM.md';
import F6_2a  from './templates/F6_2a-inventario-firmas.md';
import F6_2b  from './templates/F6_2b-resumen-declaracion.md';
import F7     from './templates/F7-resumen-proceso.md';
import EXTRACTOR from './templates/EXTRACTOR.md';


export const DCFL_PROMPT_MAP: Record<PromptId, string> = {
  F0,
  F1,
  F2,
  F2_5,
  F3,
  F4_P1_FORM_SCHEMA,
  F4_P1_GENERATE_DOCUMENT,
  F4_P2_FORM_SCHEMA,
  F4_P3_FORM_SCHEMA,
  F4_P4_FORM_SCHEMA,
  F4_P5_FORM_SCHEMA,
  F4_P6_FORM_SCHEMA,
  F4_P7_FORM_SCHEMA,
  F4_P8_FORM_SCHEMA,
  F4_P2_GENERATE_DOCUMENT,
  F4_P3_GENERATE_DOCUMENT,
  F4_P3_ORCHESTRATOR,
  F4_P4_GENERATE_DOCUMENT,
  F4_P5_GENERATE_DOCUMENT,
  F4_P6_GENERATE_DOCUMENT,
  F4_P7_GENERATE_DOCUMENT,
  F4_P8_GENERATE_DOCUMENT,
  F5,
  F5_2,
  F6,
  F6_FORM,
  F6_2a,
  F6_2b,
  F7,
  EXTRACTOR,
};

// Singleton que usa el PromptRegistry unificado de core
const coreRegistry = new CorePromptRegistry({
  siteId:   'dcfl',
  localMap: DCFL_PROMPT_MAP,
});

export const getPromptRegistry = (): CorePromptRegistry => coreRegistry;

// Re-exportar tipos para compatibilidad
export type { PromptEntry, PromptMetadata, IPromptRegistry };
