import { PipelineEvent } from '../../types/pipeline-event.types';
import { ProductContext } from './products/product.types';
import { handleP1 } from './products/p1-instrumentos.handler';
import { handleP2 } from './products/p2-presentacion-electronica.handler';
import { handleP3 } from './products/p3-guiones-multimedia.handler';
import { handleP4 } from './products/p4-manual-participante.handler';
import { handleP5 } from './products/p5-guias-actividades.handler';
import { handleP6 } from './products/p6-calendario-general.handler';
import { handleP7 } from './products/p7-documento-informacion.handler';
import { handleP8 } from './products/p8-cronograma-desarrollo.handler';
import { handleFormSchemaAssembler } from './products/form-schema.assembler';
import { handleDocumentP1Assembler } from './products/p1-document.assembler';
import { handleDocumentGenericAssembler } from './products/document-generic.assembler';
import { handleDocumentP4Assembler } from './products/p4-document.assembler';
import { handleDocumentP3Assembler } from './products/p3-document.assembler';
import { handleDocumentP2Assembler } from './products/p2-document.assembler';
import { handleDocumentP5Assembler } from './products/p5-document.assembler';
import { handleDocumentP6Assembler } from './products/p6-document.assembler';
import { handleDocumentP7Assembler } from './products/p7-document.assembler';
import { handleDocumentP8Assembler } from './products/p8-document.assembler';

const productHandlers: Record<string, Record<string, Function>> = {
  'ensamblador_p1_final': { 'F4_P1': handleP1 },
  'ensamblador_doc_p1': { 'F4_P1_GENERATE_DOCUMENT': handleDocumentP1Assembler },
  'ensamblador_doc_p3': { 'F4_P3_GENERATE_DOCUMENT': handleDocumentP3Assembler },
  'ensamblador_doc_p2': { 'F4_P2_GENERATE_DOCUMENT': handleDocumentP2Assembler },
  'ensamblador_doc_generic': {
    'F4_P4_GENERATE_DOCUMENT': handleDocumentP4Assembler,
    'F4_P5_GENERATE_DOCUMENT': handleDocumentP5Assembler,
    'F4_P6_GENERATE_DOCUMENT': handleDocumentP6Assembler,
    'F4_P7_GENERATE_DOCUMENT': handleDocumentP7Assembler,
    'F4_P8_GENERATE_DOCUMENT': handleDocumentP8Assembler,
  },
  'ensamblador_p2': { 'F4_P2': handleP2 },
  'ensamblador_p3': { 'F4_P3': handleP3 },
  'ensamblador_p4': { 'F4_P4': handleP4 },
  'ensamblador_p5': { 'F4_P5': handleP5 },
  'ensamblador_p6': { 'F4_P6': handleP6 },
  'ensamblador_p7': { 'F4_P7': handleP7 },
  'ensamblador_p8': { 'F4_P8': handleP8 },
  'ensamblador_form_schema': {},
};

export async function handleF4Events(event: PipelineEvent): Promise<string | void> {
  const { agentName, jobId, projectId, services, promptId } = event;

  // Assembler de form schema: intercepta cualquier pipeline F4_P*_FORM_SCHEMA
  if (agentName === 'ensamblador_form_schema' && promptId.includes('_FORM_SCHEMA')) {
    const context: ProductContext = {
      jobId,
      projectId,
      projectName: event.body?.context?.projectName || 'Curso',
      promptId,
      services,
      event
    };
    return await handleFormSchemaAssembler(context);
  }

  const agentHandlers = productHandlers[agentName];
  if (agentHandlers) {
    const handler = agentHandlers[promptId];
    if (handler) {
      const context: ProductContext = {
        jobId,
        projectId,
        projectName: event.body?.context?.projectName || 'Curso',
        promptId,
        services,
        event
      };
      return await handler(context);
    }
  }

  console.log(`[f4.phase] Evento no manejado: agentName=${agentName}, promptId=${promptId}`);
}
