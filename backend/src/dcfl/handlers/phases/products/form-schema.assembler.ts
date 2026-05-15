import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';

const PRODUCTOS_NOMBRES: Record<string, string> = {
  'P1': 'Instrumentos de Evaluación',
  'P2': 'Presentación Electrónica',
  'P3': 'Guiones Multimedia',
  'P4': 'Manual del Participante',
  'P5': 'Guías de Actividades',
  'P6': 'Calendario General',
  'P7': 'Documento de Información General',
  'P8': 'Cronograma de Desarrollo'
};

const FIELD_PREFIX: Record<string, string> = {
  'P1': 'instrumento_unidad_',
  'P2': 'presentacion_unidad_',
  'P3': 'guion_unidad_',
  'P4': 'manual_unidad_',
  'P5': 'actividad_unidad_',
  'P6': 'sesion_unidad_',
  'P7': 'informacion_unidad_',
  'P8': 'cronograma_unidad_',
};

export async function handleFormSchemaAssembler(context: ProductContext): Promise<any> {
  const { jobId, projectId, services, promptId, event } = context;

  const producto = event?.body?.userInputs?.producto || 'P4';
  const nombreProducto = PRODUCTOS_NOMBRES[producto] || producto;

  console.log(`[DEBUG-F4-DATA] Assembler iniciado para: ${producto} (${nombreProducto})`);

  // 1. Contexto del extractor — soporta nombre nuevo (extractor_f4) y antiguo (refinador_contexto_form)
  const rawContext =
    (await services.pipelineService.getAgentOutput(jobId, 'extractor_f4')) ||
    (await services.pipelineService.getAgentOutput(jobId, 'refinador_contexto_form')) ||
    '{}';
  console.log(`[form-schema-assembler] Extractor raw (${rawContext.length} chars): ${rawContext.slice(0, 300)}`);
  const contexto = parseJsonSafely(rawContext, {});
  console.log(`[form-schema-assembler] Extractor parseado — unidades LLM: ${(contexto as any).unidades?.length ?? 0}`);

  // 2. Unidades: fuente primaria = contexto directo de la ruta; secundaria = extractor LLM
  const unidadesDirectas: any[] = event?.body?.context?.fase3?.unidades || [];
  const unidadesLLM: any[] = contexto.unidades || [];
  const unidades = unidadesDirectas.length > 0 ? unidadesDirectas : unidadesLLM;
  console.log(`[DYNAMIC-DISCOVERY] Unidades — directas: ${unidadesDirectas.length}, LLM: ${unidadesLLM.length}, usando: ${unidades.length}`);

  // 3. Juez: extrae selección (A o B)
  const rawJudge = (await services.pipelineService.getAgentOutput(jobId, 'juez_form')) || '';
  const judgeMatch = rawJudge.match(/\{[\s\S]*\}/);
  const decisionJuez = judgeMatch ? parseJsonSafely(judgeMatch[0], null) : null;
  const seleccion: 'A' | 'B' = decisionJuez?.seleccion === 'B' ? 'B' : 'A';
  console.log(`[DIALECTIC-TEAM] Selección del Juez: ${seleccion} (${decisionJuez?.razon?.slice(0, 80) || 'sin razón'})`);

  // 4. ENSAMBLADO E INMUTABILIDAD: Cabecera EC0366 Determinista
  const criteriosValue = unidades.length > 0
    ? unidades.map((u: any, i: number) => {
        const nombre = u.nombre || u.titulo || `Unidad ${i + 1}`;
        return `${i + 1}. ${nombre}: acciones físicas observables y verificables`;
      }).join('\n')
    : "1. [Criterio específico de la unidad 1]\n2. [Criterio específico de la unidad 2]";

  const fields = [
    {
      name: "criterios_evaluacion_global",
      label: "Criterios de Evaluación Globales (EC0366)",
      type: "textarea",
      required: true,
      suggested_value: criteriosValue,
      hint: "Cabecera normativa inmutable."
    }
  ];

  // 5. MAPEO DINÁMICO: el juez elige A o B; leemos los fields del agente ganador directamente
  const rawWinner = (await services.pipelineService.getAgentOutput(
    jobId, seleccion === 'A' ? 'agente_form_A' : 'agente_form_B'
  )) || '';
  // El agente ganador puede devolver un array JSON directo o un objeto con .fields o .propuesta
  const winnerArrayMatch = rawWinner.match(/\[[\s\S]*\]/);
  const winnerObjMatch   = rawWinner.match(/\{[\s\S]*\}/);
  let propuestasDinamicas: any[] = [];
  if (winnerArrayMatch) {
    propuestasDinamicas = parseJsonSafely(winnerArrayMatch[0], []);
  } else if (winnerObjMatch) {
    const obj = parseJsonSafely(winnerObjMatch[0], {});
    propuestasDinamicas = obj.fields || obj.propuesta || decisionJuez?.fields || [];
  }
  console.log(`[DIALECTIC-TEAM] Campos del agente ${seleccion}: ${propuestasDinamicas.length} items`);
  
  if (propuestasDinamicas.length > 0) {
    const hoy = new Date();
    hoy.setDate(hoy.getDate() + 7);
    const sugeridaDate = hoy.toISOString().split('T')[0];

    propuestasDinamicas.forEach((bloque: any, idx: number) => {
      const unitId = bloque.unit_id || idx + 1;
      const prefix = FIELD_PREFIX[producto] || 'instrumento_unidad_';
      let suggestedValue = bloque.suggested_value || "Contenido validado por el Juez...";
      
      if (bloque.name === 'fecha_inicio_curso') {
        suggestedValue = sugeridaDate;
      }

      fields.push({
        name: bloque.name || `${prefix}${unitId}`,
        label: bloque.label || `Evaluación: Unidad ${unitId}`,
        type: bloque.type || "textarea",
        required: true,
        suggested_value: suggestedValue,
        hint: bloque.hint || `Basado en el objetivo de la unidad ${unitId}.`
      });
    });
  } else {
    // Fallback de Emergencia: Descubrimiento básico si la dialéctica falla pero el contexto es válido
    unidades.forEach((u: any, idx: number) => {
      const prefix = FIELD_PREFIX[producto] || 'instrumento_unidad_';
      fields.push({
        name: `${prefix}${idx + 1}`,
        label: `Evaluación: ${u.titulo || u.nombre || `Unidad ${idx+1}`}`,
        type: "textarea",
        required: true,
        suggested_value: u.objetivo || `Puntos clave a desarrollar para esta unidad.`,
        hint: `Auto-generado por StrictDiscoveryHandler.`
      });
    });
  }

  const schemaFinal = {
    description: `Instrumentos de Evaluación - Zero Human Trace v2.3.0`,
    fields: fields
  };

  // 6. StatePersistenceHandler: UPSERT Deterministico (MANDATO #4)
  console.log(`[STATE-PERSISTENCE] Escribiendo esquema dinámico (${fields.length} campos).`);
  
  const { error } = await services.supabase.client!
    .from('producto_form_schemas')
    .upsert({
      project_id: projectId,
      producto: producto,
      schema_json: schemaFinal,
      valores_sugeridos: contexto,
      updated_at: new Date().toISOString()
    }, { onConflict: 'project_id,producto' });
  
  if (error) {
    console.error('[form-schema-assembler] Error de base de datos:', error);
    throw error;
  }
  
  return schemaFinal;
}
