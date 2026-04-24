import { SupabaseService } from '../services/supabase.service';
import { PipelineService } from '../services/pipeline.service';
import { ProjectService } from '../services/project.service';
import { buildF0Document } from '../services/f0-formatter';
import { cleanJsonResponse, parseJsonSafely } from '../helpers/json-cleaner';

function normalizeSector(sector: any): any {
  // Si sector ya tiene los campos esperados, devolverlo
  if (sector && (sector.tamaño !== undefined || sector.tendencias !== undefined)) {
    return sector;
  }
  
  // Si sector tiene projectName/industry, transformar
  if (sector && (sector.projectName || sector.industry)) {
    console.log('[F0-NORMALIZE] Transformando sector desde formato extractor');
    return {
      tamaño: `Sector de ${sector.industry || 'arte'} - ${sector.projectName || 'Curso'}`,
      fuente_tamaño: 'Contexto del proyecto',
      tendencias: `Crecimiento en demanda de cursos de ${sector.courseTopic || sector.industry || 'pintura'}`,
      fuente_tendencias: 'Análisis de mercado preliminar',
      regulaciones: 'No se identifican regulaciones específicas',
      fuente_regulaciones: '',
      certificaciones: 'No se identifican certificaciones obligatorias',
      fuente_certificaciones: '',
      desafios: [
        { desafio: 'Falta de contenido práctico en cursos existentes', fuente: 'Análisis de competencia' },
        { desafio: 'Materiales didácticos limitados', fuente: 'Contexto del proyecto' }
      ]
    };
  }
  
  // Fallback con datos por defecto
  return {
    tamaño: 'No se encontró información',
    fuente_tamaño: '',
    tendencias: 'No se encontró información',
    fuente_tendencias: '',
    regulaciones: 'No se identifican regulaciones específicas',
    fuente_regulaciones: '',
    certificaciones: 'No se identifican certificaciones obligatorias',
    fuente_certificaciones: '',
    desafios: []
  };
}

function normalizeEstandares(estandares: any): any[] {
  if (!estandares) return [];
  
  let parsed = estandares;
  
  if (typeof estandares === 'string') {
    try {
      parsed = JSON.parse(estandares);
    } catch (e) {
      console.warn('[F0-NORMALIZE] Error parseando estandares:', e);
      return [];
    }
  }
  
  if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].codigo) {
    return parsed;
  }
  
  if (parsed && parsed.codigo) {
    return [parsed];
  }
  
  // Si no hay datos válidos, devolver array vacío (sin inventar EC0366)
  return [];
}

function normalizeGaps(gaps: any): any {
  if (!gaps) return { mejores_practicas: 'No se identifican gaps iniciales', competencia: 'No se identifican gaps iniciales' };
  
  // Si tiene brecas (error común), transformar
  if (gaps.brecas) {
    console.log('[F0-NORMALIZE] Transformando gaps desde formato brecas');
    const analisis = gaps.brecas.analisis || [];
    const descripciones = analisis.map((a: any) => a.descripcion).join(', ');
    return {
      mejores_practicas: descripciones || 'Se requieren mejoras en la estructura del curso',
      competencia: descripciones || 'Falta diferenciación frente a cursos existentes'
    };
  }
  
  // Si ya tiene el formato correcto
  if (gaps.mejores_practicas !== undefined || gaps.competencia !== undefined) {
    return {
      mejores_practicas: gaps.mejores_practicas || 'No se identifican gaps iniciales',
      competencia: gaps.competencia || 'No se identifican gaps iniciales'
    };
  }
  
  // Fallback
  return {
    mejores_practicas: 'No se identifican gaps iniciales',
    competencia: 'No se identifican gaps iniciales'
  };
}

export async function handleF0Assembler(params: {
  jobId: string;
  projectId: string;
  pipelineService: PipelineService;
  supabase: SupabaseService;
  projectService: ProjectService;
}): Promise<string> {
  const { jobId, projectId, pipelineService, supabase, projectService } = params;
  
  console.log('[F0-ENSAMBLADOR] ========== INICIO ==========');
  console.log('[F0-ENSAMBLADOR] projectId:', projectId);
  console.log('[F0-ENSAMBLADOR] jobId:', jobId);

  const getJson = async (name: string, fallback: string = '{}') => {
    const raw = await pipelineService.getAgentOutput(jobId, name);
    console.log(`[F0-ENSAMBLADOR] ${name} RAW:`, raw?.substring(0, 150));
    
    const fallbackParsed = JSON.parse(fallback);
    if (!raw) {
      console.warn(`[F0-ENSAMBLADOR] ${name} está vacío, usando fallback`);
      return fallbackParsed;
    }

    const parsed = parseJsonSafely(raw, fallbackParsed);
    console.log(`[F0-ENSAMBLADOR] ${name} procesado (keys: ${Object.keys(parsed || {}).length})`);
    return parsed;
  };

  const decisiones = await supabase.getF0JuezDecisiones(jobId);
  
  const pickSelected = async (seccion: string, fallbackJson: string = '{}') => {
    const decision = decisiones[seccion];
    const suffix = decision?.seleccion === 'B' ? '_B' : '_A';
    const name = `agente_${seccion}${suffix}`;
    return await getJson(name, fallbackJson);
  };

  const sector = await pickSelected('sector');
  const practicas = await pickSelected('practicas', '[]');
  const competencia = await pickSelected('competencia', '[]');
  const estandares = await pickSelected('estandares', '[]');
  const gaps = await pickSelected('gaps');
  const preguntas = await pickSelected('preguntas', '[]');
  const recomendaciones = await pickSelected('recomendaciones', '[]');
  const referencias = await pickSelected('referencias', '[]');
  
  // Normalizar estructuras
  const normalizedSector = normalizeSector(sector);
  const normalizedEstandares = normalizeEstandares(estandares);
  const normalizedGaps = normalizeGaps(gaps);

  const projectName = await projectService.getProjectName(projectId);
  console.log('[F0-ENSAMBLADOR] projectName desde BD:', projectName);
  const today = new Date().toLocaleDateString('es-MX');
  
  const documentoFinal = buildF0Document(
    normalizedSector,
    practicas,
    competencia,
    normalizedEstandares,
    normalizedGaps,
    preguntas,
    recomendaciones,
    referencias,
    projectName,
    today
  );
  
  try {
    await supabase.saveF0Componentes({
      project_id: projectId,
      job_id: jobId,
      sector: normalizedSector,
      practicas,
      competencia,
      estandares: normalizedEstandares,
      gaps: normalizedGaps,
      preguntas,
      recomendaciones,
      referencias,
      documento_final: documentoFinal
    });
  } catch (err) {
    console.warn('[pipeline] Error al guardar fase0_componentes:', err);
  }

  console.log(`[pipeline] ensamblador F0: documento generado (${documentoFinal.length} chars)`);
  return documentoFinal;
}
