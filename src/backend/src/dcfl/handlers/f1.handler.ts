import { SupabaseService } from '../services/supabase.service';
import { PipelineService } from '../services/pipeline.service';
import { Agent } from '../constants/agents.constants';
import { parseJsonSafely } from '../helpers/json-cleaner';
import { getValue, formatTable, formatList } from './f1-formatter';

interface NormalizedBrecha {
  comportamiento: string;
  causa: string;
  capacitable: string;
  prioridad: string;
}

interface NormalizedAnalisis {
  declaracion_problema: string;
  impacto: string;
  perfil_participante: {
    perfil_profesional: string;
    nivel_educativo_minimo: string;
    experiencia_previa: string;
    conocimientos_previos_requeridos: string;
    rango_de_edad_estimado: string;
    motivacion_principal: string;
  };
  brechas: NormalizedBrecha[];
  es_capacitable: boolean;
}

interface NormalizedEstrategia {
  objetivo_general_smart: string;
  desglose_smart: {
    s: string;
    m: string;
    a: string;
    r: string;
    t: string;
  };
  objetivos_especificos: Array<{
    dominio: string;
    nivel_bloom: string;
    objetivo: string;
  }>;
  restricciones: string[];
  supuestos: string[];
  viabilidad: {
    es_viable: boolean;
    justificacion: string;
    proximos_pasos: string;
  };
}

/**
 * Normaliza el output de análisis manejando variaciones de la IA.
 */
function normalizeAnalisis(raw: any): NormalizedAnalisis {
  // Manejo de "brecas" vs "brechas"
  const rawBrechas = raw?.brechas || raw?.brecas || [];
  
  const brechas: NormalizedBrecha[] = (Array.isArray(rawBrechas) ? rawBrechas : []).map((b: any) => ({
    comportamiento: b.comportamiento || b.descripcion || '—',
    causa: b.causa || b.causa_raiz || '—',
    capacitable: String(b.capacitable || 'no').toLowerCase().includes('sí') || String(b.capacitable || '').toLowerCase() === 'si' ? 'sí' : 'no',
    prioridad: b.prioridad || 'media'
  }));

  return {
    declaracion_problema: raw?.declaracion_problema ?? 'No especificada',
    impacto: raw?.impacto ?? 'No especificado',
    perfil_participante: raw?.perfil_participante || {},
    brechas,
    es_capacitable: !!raw?.es_capacitable
  };
}

/**
 * Normaliza el output de estrategia.
 */
function normalizeEstrategia(raw: any): NormalizedEstrategia {
  const rawDesglose = raw?.desglose_smart || raw?.desglose || {};
  const rawViabilidad = raw?.viabilidad || {};
  
  return {
    objetivo_general_smart: raw?.objetivo_general_smart ?? raw?.objetivo_smart ?? 'No especificado',
    desglose_smart: {
      s: rawDesglose.s ?? '—',
      m: rawDesglose.m ?? '—',
      a: rawDesglose.a ?? '—',
      r: rawDesglose.r ?? '—',
      t: rawDesglose.t ?? '—'
    },
    objetivos_especificos: Array.isArray(raw?.objetivos_especificos) ? raw.objetivos_especificos : [],
    restricciones: Array.isArray(raw?.restricciones) ? raw.restricciones : [],
    supuestos: Array.isArray(raw?.supuestos) ? raw.supuestos : [],
    viabilidad: {
      es_viable: typeof rawViabilidad.es_viable === 'boolean' ? rawViabilidad.es_viable : !!raw?.es_viable,
      justificacion: rawViabilidad.justificacion ?? 'No especificada',
      proximos_pasos: rawViabilidad.proximos_pasos ?? 'No especificados'
    }
  };
}

/**
 * Construye el Markdown final siguiendo el estándar de F0.
 */
export function buildF1Document(analisis: NormalizedAnalisis, estrategia: NormalizedEstrategia, projectName: string): string {
  return `
# INFORME DE NECESIDADES DE CAPACITACIÓN (EC0249)
**Proyecto:** ${projectName}
**Fecha de análisis:** ${new Date().toLocaleDateString('es-MX')}

---

## 1. DECLARACIÓN DEL PROBLEMA
${getValue(analisis, 'declaracion_problema')}

## 2. IMPACTO IDENTIFICADO
${getValue(analisis, 'impacto')}

---

## 3. ANÁLISIS DE BRECHAS
${formatTable(
  ['Comportamiento Observado', 'Causa Raíz', '¿Capacitable?', 'Prioridad'],
  analisis.brechas.map((b: NormalizedBrecha) => [
    getValue(b, 'comportamiento'),
    getValue(b, 'causa'),
    b.capacitable === 'sí' ? '✅ Sí' : '❌ No',
    getValue(b, 'prioridad')
  ])
)}

---

## 4. OBJETIVO GENERAL (SMART)
${getValue(estrategia, 'objetivo_general_smart')}

### Desglose SMART:
| Criterio | Definición |
|:---|:---|
| Específico | ${getValue(estrategia.desglose_smart, 's')} |
| Medible | ${getValue(estrategia.desglose_smart, 'm')} |
| Alcanzable | ${getValue(estrategia.desglose_smart, 'a')} |
| Relevante | ${getValue(estrategia.desglose_smart, 'r')} |
| Temporal | ${getValue(estrategia.desglose_smart, 't')} |

### Objetivos Específicos (Taxonomía de Bloom)
${formatTable(
  ['Dominio', 'Nivel Bloom', 'Objetivo'],
  estrategia.objetivos_especificos.map(o => [
    getValue(o, 'dominio'),
    getValue(o, 'nivel_bloom'),
    getValue(o, 'objetivo')
  ])
)}

---

## 5. RESTRICCIONES Y SUPUESTOS
### Restricciones
${formatList(estrategia.restricciones.map(r => `⚠️ ${r}`), false)}

### Supuestos
${formatList(estrategia.supuestos.map(s => `💡 ${s}`), false)}

---

## 6. PERFIL DEL PARTICIPANTE PROPUESTO
- **Perfil profesional:** ${analisis.perfil_participante?.perfil_profesional || 'No especificado'}
- **Nivel educativo mínimo:** ${analisis.perfil_participante?.nivel_educativo_minimo || 'No especificado'}
- **Conocimientos previos:** ${analisis.perfil_participante?.conocimientos_previos_requeridos || 'No especificado'}
- **Rango de edad estimado:** ${analisis.perfil_participante?.rango_de_edad_estimado || 'No especificado'}
- **Experiencia previa:** ${analisis.perfil_participante?.experiencia_previa || 'No especificada'}
- **Motivación principal:** ${analisis.perfil_participante?.motivacion_principal || 'No especificada'}

---

## 7. VIABILIDAD (EC0249)
**Estado:** ${estrategia.viabilidad.es_viable ? '✅ VIABLE' : '⚠️ REQUIERE AJUSTES'}

**Justificación:**
${estrategia.viabilidad.justificacion}

**Próximos pasos:**
${estrategia.viabilidad.proximos_pasos}

---
${analisis.es_capacitable && estrategia.viabilidad.es_viable ? '✅ El proyecto es viable para capacitación.' : '⚠️ Se requieren ajustes antes de proceder.'}
  `.trim();
}

/**
 * Validación mínima de esquema para análisis.
 */
function isValidAnalisisSchema(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const requiredKeys = ['declaracion_problema', 'impacto', 'brechas', 'es_capacitable'];
  return requiredKeys.every(key => key in obj);
}

/**
 * Validación mínima de esquema para estrategia.
 */
function isValidEstrategiaSchema(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const requiredKeys = ['objetivo_general_smart', 'desglose_smart', 'objetivos_especificos', 'viabilidad'];
  return requiredKeys.every(key => key in obj);
}

/**
 * Orquestador del ensamblaje de la Fase 1.
 */
export async function handleF1Assembler(params: {
  jobId: string;
  projectId: string;
  pipelineService: PipelineService;
  supabase: SupabaseService;
  projectService: any;
}): Promise<string> {
  const { jobId, projectId, pipelineService, supabase, projectService } = params;
  
  console.log(`[f1.handler] Starting assembly | jobId: ${jobId} | projectId: ${projectId}`);

  const project = await projectService.getProject(projectId);
  const previousData = (params as any).context?.previousData || {};

  console.log(`[f1.assembler] previousData keys: ${Object.keys(previousData).join(', ')}`);
  console.log(`[f1.assembler] f0_estructurado keys: ${Object.keys(previousData.f0_estructurado || {}).join(', ')}`);
  console.log(`[f1.assembler] QA count: ${previousData.preguntas_respuestas_estructuradas?.length || 0}`);


  // 1. Extraer decisiones de jueces
  const judgeAnalisisRaw = await pipelineService.getAgentOutput(jobId, Agent.JUEZ_ANALISIS);
  const judgeEstrategiaRaw = await pipelineService.getAgentOutput(jobId, Agent.JUEZ_ESTRATEGIA);

  const judgeAnalisis = parseJsonSafely(judgeAnalisisRaw || '', { seleccion: 'A' });
  const judgeEstrategia = parseJsonSafely(judgeEstrategiaRaw || '', { seleccion: 'A' });

  // 2. Seleccionar ganadores iniciales
  let winnerAnalisisAgent = judgeAnalisis.seleccion === 'B' ? Agent.ANALISIS_B : Agent.ANALISIS_A;
  let winnerEstrategiaAgent = judgeEstrategia.seleccion === 'B' ? Agent.ESTRATEGIA_B : Agent.ESTRATEGIA_A;

  // 3. Extraer y validar output de ANÁLISIS
  let analisisRaw = await pipelineService.getAgentOutput(jobId, winnerAnalisisAgent);
  let analisisParsed = parseJsonSafely(analisisRaw || '', {});

  if (!isValidAnalisisSchema(analisisParsed)) {
    const fallbackAgent = winnerAnalisisAgent === Agent.ANALISIS_A ? Agent.ANALISIS_B : Agent.ANALISIS_A;
    console.warn(`[f1.handler] Winner ${winnerAnalisisAgent} failed schema validation, falling back to ${fallbackAgent}`);
    analisisRaw = await pipelineService.getAgentOutput(jobId, fallbackAgent);
    analisisParsed = parseJsonSafely(analisisRaw || '', {});
  }
  console.log(`[f1.handler] Analisis validation: ${isValidAnalisisSchema(analisisParsed) ? 'PASSED' : 'FAILED (Both agents invalid, using fallbacks)'}`);
  const analisis = normalizeAnalisis(analisisParsed);

  // 4. Extraer y validar output de ESTRATEGIA
  let estrategiaRaw = await pipelineService.getAgentOutput(jobId, winnerEstrategiaAgent);
  let estrategiaParsed = parseJsonSafely(estrategiaRaw || '', {});

  if (!isValidEstrategiaSchema(estrategiaParsed)) {
    const fallbackAgent = winnerEstrategiaAgent === Agent.ESTRATEGIA_A ? Agent.ESTRATEGIA_B : Agent.ESTRATEGIA_A;
    console.warn(`[f1.handler] Winner ${winnerEstrategiaAgent} failed schema validation, falling back to ${fallbackAgent}`);
    estrategiaRaw = await pipelineService.getAgentOutput(jobId, fallbackAgent);
    estrategiaParsed = parseJsonSafely(estrategiaRaw || '', {});
  }
  console.log(`[f1.handler] Estrategia validation: ${isValidEstrategiaSchema(estrategiaParsed) ? 'PASSED' : 'FAILED (Both agents invalid, using fallbacks)'}`);
  const estrategia = normalizeEstrategia(estrategiaParsed);

  // 5. Construir Markdown
  const projectName = project?.name || project?.project_name || project?.title || projectId;
  const finalDoc = buildF1Document(analisis, estrategia, projectName);

  // 6. Mapear para persistencia legacy (Anti-Rogue)
  const perfilPersistente = {
    perfil_profesional: analisis.perfil_participante?.perfil_profesional || 'No especificado',
    nivel_educativo_minimo: analisis.perfil_participante?.nivel_educativo_minimo || 'No especificado',
    experiencia_previa: analisis.perfil_participante?.experiencia_previa || 'No especificada',
    conocimientos_previos_requeridos: analisis.perfil_participante?.conocimientos_previos_requeridos || 'No especificado',
    rango_de_edad_estimado: analisis.perfil_participante?.rango_de_edad_estimado || 'No especificado',
    motivacion_principal: analisis.perfil_participante?.motivacion_principal || 'No especificada'
  };

  const legacyData = {
    projectId,
    jobId,
    sintesis_contexto: analisis.impacto,
    preguntas_respuestas: [], 
    brechas_competencia: analisis.brechas.map((b: NormalizedBrecha) => ({
      tipo: b.prioridad,
      descripcion: `${b.comportamiento} (Causa: ${b.causa})`,
      capacitable: b.capacitable
    })),
    declaracion_problema: analisis.declaracion_problema,
    objetivos_aprendizaje: [{
      objetivo: estrategia.objetivo_general_smart,
      nivel_bloom: 'General',
      tipo: 'General'
    }, ...estrategia.objetivos_especificos.map(o => ({
      objetivo: o.objetivo,
      nivel_bloom: o.nivel_bloom,
      tipo: o.dominio
    }))],
    objetivos_especificos: estrategia.objetivos_especificos.map(o => ({
      objetivo: o.objetivo,
      nivel_bloom: o.nivel_bloom,
      dominio: o.dominio
    })),
    perfil_participante: perfilPersistente,
    resultados_esperados: [estrategia.desglose_smart.m],
    recomendaciones_diseno: estrategia.restricciones
  };

  await supabase.saveF1Informe(legacyData);

  // ── Identity Synthesizer: generar y persistir el "Project Soul" ──────────
  // Este párrafo canónico actúa como ancla semántica inmutable para todas las
  // fases subsecuentes, evitando la amnesia técnica y la deriva de dominio.
  try {
    const soul = buildProjectSoul({
      projectName,
      declaracion: analisis.declaracion_problema,
      objetivo: estrategia.objetivo_general_smart,
      perfil: perfilPersistente,
      brechas: analisis.brechas,
      restricciones: estrategia.restricciones,
    });
    await supabase.saveProjectSoul(projectId, soul);
    console.log(`[f1.handler] Project Soul guardado (${soul.length} chars) para proyecto ${projectId}`);
  } catch (err) {
    console.warn('[f1.handler] No se pudo guardar el Project Soul:', err);
  }

  return finalDoc;
}

/**
 * Construye el "Project Soul" — identidad canónica del proyecto.
 * Se inyecta como System Prompt prioritario en todas las fases posteriores a F1.
 */
function buildProjectSoul(params: {
  projectName: string;
  declaracion: string;
  objetivo: string;
  perfil: Record<string, string>;
  brechas: NormalizedBrecha[];
  restricciones: string[];
}): string {
  const brechasCapacitables = params.brechas
    .filter(b => b.capacitable === 'sí')
    .map(b => b.comportamiento)
    .slice(0, 3)
    .join('; ');

  const restriccionesTxt = params.restricciones.slice(0, 3).join('; ');

  return [
    `IDENTIDAD DEL PROYECTO (INMUTABLE):`,
    `Nombre del proyecto: "${params.projectName}".`,
    `Problema: ${params.declaracion}`,
    `Objetivo general: ${params.objetivo}`,
    `Perfil del participante: ${params.perfil.perfil_profesional || 'No especificado'}, nivel educativo ${params.perfil.nivel_educativo_minimo || 'no especificado'}.`,
    brechasCapacitables ? `Brechas capacitables priorizadas: ${brechasCapacitables}.` : '',
    restriccionesTxt ? `Restricciones: ${restriccionesTxt}.` : '',
    ``,
    `RESTRICCIONES NEGATIVAS OBLIGATORIAS:`,
    `- No cambies el nombre del proyecto ni el estándar de certificación.`,
    `- No inventes datos de mercado, cifras financieras ni URLs sin fuentes verificables.`,
    `- No menciones tecnologías, herramientas o plataformas que no hayan sido especificadas por el usuario.`,
    `- No sustituyas el stack tecnológico o el dominio del curso por otros no relacionados.`,
    `- Toda la salida debe estar en español mexicano. No generes contenido en inglés.`,
  ].filter(Boolean).join('\n');
}
