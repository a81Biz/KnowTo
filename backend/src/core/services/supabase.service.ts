// src/core/services/supabase.service.ts
//
// Clase base abstracta para SupabaseService.
// Contiene toda la lógica de conexión y los métodos CRUD comunes.
// Las subclases sobreescriben los nombres de RPC/vistas según su estándar (DCFL, CCE…).
//
// Patrón de uso:
//   class DcflSupabaseService extends BaseSupabaseService { ... }
//   class CceSupabaseService  extends BaseSupabaseService { ... }

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PreguntasRepository } from '../repositories/preguntas.repository';
import { Fase0Repository, type Fase0Estructurado } from '../repositories/fase0.repository';
import { PreguntasService } from './preguntas.service';
import type { Env } from '../types/env';

export abstract class BaseSupabaseService {
  public client: SupabaseClient | null;
  protected isDev: boolean;

  // ── Nombres de RPC / vistas — sobreescribir en subclases ─────────────────
  protected readonly spSaveStep: string = 'sp_save_step';
  protected readonly spSaveDocument: string = 'sp_save_document';
  protected readonly spGetProjectContext: string = 'sp_get_project_context';
  protected readonly spSaveExtractedContext: string = 'sp_save_extracted_context';
  protected readonly spMarkStepError: string = 'sp_mark_step_error';
  protected readonly projectProgressView: string = 'vw_project_progress';

  constructor(protected readonly env: Env) {
    this.isDev = env.ENVIRONMENT !== 'production';

    // Crear el cliente Supabase siempre que haya una URL real apuntando a la instancia.
    // En desarrollo local apunta al Kong interno (http://supabase-kong:8000).
    // En producción apunta al proyecto Supabase cloud.
    // Si la URL contiene 'dummy' o está vacía, se deja null y los métodos usan mocks.
    const url = env.SUPABASE_URL ?? '';
    const key = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
    const hasRealSupabase = url.length > 0 && !url.includes('dummy') && key.length > 0 && !key.includes('dummy');

    this.client = hasRealSupabase
      ? createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      : null;
  }

  /** Devuelve el cliente Supabase. Solo disponible en producción. */
  getClient(): SupabaseClient | null {
    return this.client;
  }

  // ── createProject es abstracto: los parámetros difieren por estándar ───────
  abstract createProject(params: Record<string, unknown> & { userId: string; name: string; clientName: string }): Promise<{ projectId: string }>;

  async saveStep(params: {
    projectId: string;
    stepNumber: number;
    inputData: Record<string, unknown>;
  }): Promise<{ stepId: string }> {
    if (!this.client) return { stepId: crypto.randomUUID() };

    const { data, error } = await this.client!.rpc(this.spSaveStep, {
      p_project_id: params.projectId,
      p_step_number: params.stepNumber,
      p_input_data: params.inputData,
    });

    if (error) throw new Error(`${this.spSaveStep} failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { stepId: data.step_id };
  }

  async saveDocument(params: {
    projectId: string;
    stepId: string;
    phaseId: string;
    title: string;
    content: string;
  }): Promise<{ documentId: string }> {
    if (!this.client) return { documentId: crypto.randomUUID() };

    const { data, error } = await this.client!.rpc(this.spSaveDocument, {
      p_project_id: params.projectId,
      p_step_id: params.stepId,
      p_phase_id: params.phaseId,
      p_title: params.title,
      p_content: params.content,
    });

    if (error) throw new Error(`${this.spSaveDocument} failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { documentId: data.document_id };
  }

  async getProjectContext(projectId: string): Promise<Record<string, unknown>> {
    if (!this.client) return { project: null };

    const { data, error } = await this.client!.rpc(this.spGetProjectContext, {
      p_project_id: projectId,
    });

    if (error) throw new Error(`${this.spGetProjectContext} failed: ${error.message}`);
    return data as Record<string, unknown>;
  }

  async getUserProjects(userId: string) {
    if (!this.client) return [];

    const { data, error } = await this.client!
      .from(this.projectProgressView)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`getUserProjects failed: ${error.message}`);
    return data ?? [];
  }

  async saveExtractedContext(params: {
    projectId: string;
    extractorId: string;
    fromPhases: string[];
    toPhase: string;
    content: string;
    parserUsed: Record<string, boolean>;
  }): Promise<{ extractedContextId: string }> {
    if (!this.client) return { extractedContextId: crypto.randomUUID() };

    const { data, error } = await this.client!.rpc(this.spSaveExtractedContext, {
      p_project_id: params.projectId,
      p_extractor_id: params.extractorId,
      p_from_phases: params.fromPhases,
      p_to_phase: params.toPhase,
      p_content: params.content,
      p_parser_used: params.parserUsed,
    });

    if (error) throw new Error(`${this.spSaveExtractedContext} failed: ${error.message}`);
    if (!data.success) throw new Error(data.error);
    return { extractedContextId: data.extracted_context_id };
  }

  // ── Fase 0 Estructurado ───────────────────────────────────────────────────

  async saveFase0Estructurado(data: any): Promise<void> {
    if (!this.client) return;
    const repo = new Fase0Repository(this.client);
    await repo.upsert(data);
  }

  async getFase0Estructurado(projectId: string): Promise<any> {
    if (!this.client) return null;
    const repo = new Fase0Repository(this.client);
    return repo.findByProjectId(projectId);
  }

  async markStepError(stepId: string, errorMsg: string): Promise<void> {
    if (!this.client) return;
    await this.client!.rpc(this.spMarkStepError, {
      p_step_id: stepId,
      p_error_msg: errorMsg,
    });
  }

  async getExtractedContext(params: {
    projectId: string;
    extractorId: string;
  }): Promise<{ content: string } | null> {
    if (!this.client) return null;

    const { data, error } = await this.client!
      .from('extracted_contexts')
      .select('content')
      .eq('project_id', params.projectId)
      .eq('extractor_id', params.extractorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`getExtractedContext failed: ${error.message}`);
    if (!data) return null;
    return { content: (data as { content: string }).content };
  }

  /**
   * Guarda el contexto enriquecido con resultados de búsqueda web
   */
  async saveEnrichedContext(
    projectId: string,
    phaseId: string,
    enrichedContext: Record<string, unknown>
  ): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client
      .from('pipeline_jobs')
      .update({ enriched_context: enrichedContext })
      .eq('project_id', projectId)
      .eq('phase_id', phaseId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.warn('[Supabase] Error saving enriched context:', error);
    }
  }

  /**
   * Obtiene el contexto enriquecido más reciente para un proyecto y fase
   */
  async getEnrichedContext(projectId: string, phaseId: string): Promise<any> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('pipeline_jobs')
      .select('enriched_context')
      .eq('project_id', projectId)
      .eq('phase_id', phaseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.warn('[Supabase] Error getting enriched context:', error);
      return null;
    }
    return data?.enriched_context || null;
  }

  /**
   * Obtiene las preguntas y brechas generadas por el pipeline F0 de un proyecto.
   * Lee los outputs de los agentes 'seccion_5_preguntas' y 'seccion_5_gaps'
   * del job F0 más reciente completado para el proyecto.
   * Devuelve { questions: string[], gaps: string }.
   */
  async getF0AgentOutputs(projectId: string): Promise<{ questions: string[]; gaps: string }> {
    if (!this.client) return { questions: [], gaps: '' };

    // 1. Encontrar el job F0 más reciente completado para este proyecto
    const { data: jobData, error: jobError } = await this.client
      .from('pipeline_jobs')
      .select('id')
      .eq('project_id', projectId)
      .eq('phase_id', 'F0')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (jobError || !jobData) return { questions: [], gaps: '' };
    const jobId = (jobData as { id: string }).id;

    // 2. Leer los outputs de los agentes relevantes
    const { data: outputs, error: outError } = await this.client
      .from('pipeline_agent_outputs')
      .select('agent_name, output')
      .eq('job_id', jobId)
      .in('agent_name', ['seccion_5_preguntas', 'seccion_5_gaps']);

    if (outError || !outputs) return { questions: [], gaps: '' };

    const rows = outputs as { agent_name: string; output: string }[];
    const preguntasRow = rows.find((r) => r.agent_name === 'seccion_5_preguntas');
    const gapsRow = rows.find((r) => r.agent_name === 'seccion_5_gaps');

    // Parsear preguntas: texto plano, una por línea, filtrar las que contienen '?'
    const questions = preguntasRow
      ? preguntasRow.output
        .split('\n')
        .map((l) => l.replace(/^[-\d.*)\s]+/, '').replace(/^\*\*|\*\*$/g, '').trim())
        .filter((l) => l.includes('?'))
      : [];

    // Extraer texto de brechas: gap vs mejores prácticas + gap vs competencia
    const gaps = gapsRow ? this._extractGapsText(gapsRow.output) : '';

    return { questions, gaps };
  }

  // ── Informe estructurado F1 ───────────────────────────────────────────────

  async saveF1Informe(params: {
    projectId: string;
    jobId: string;
    sintesis_contexto: string | null;
    preguntas_respuestas: unknown | null;
    brechas_competencia: unknown | null;
    declaracion_problema: string | null;
    objetivos_aprendizaje: unknown | null;
    perfil_participante: unknown | null;
    resultados_esperados: unknown | null;
    recomendaciones_diseno: unknown | null;
  }): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client
      .from('fase1_informe_necesidades')
      .insert({
        project_id: params.projectId,
        job_id: params.jobId,
        sintesis_contexto: params.sintesis_contexto,
        preguntas_respuestas: params.preguntas_respuestas,
        brechas_competencia: params.brechas_competencia,
        declaracion_problema: params.declaracion_problema,
        objetivos_aprendizaje: params.objetivos_aprendizaje,
        perfil_participante: params.perfil_participante,
        resultados_esperados: params.resultados_esperados,
        recomendaciones_diseno: params.recomendaciones_diseno,
      });

    if (error) throw new Error(`saveF1Informe failed: ${error.message}`);
  }

  async getF1Informe(projectId: string): Promise<{
    sintesis_contexto: string | null;
    preguntas_respuestas: Array<{ pregunta: string; respuesta: string }> | null;
    brechas_competencia: Array<{ tipo: string; descripcion: string; capacitable: string }> | null;
    declaracion_problema: string | null;
    objetivos_aprendizaje: Array<{ objetivo: string; nivel_bloom: string; tipo: string }> | null;
    perfil_participante: Record<string, string> | null;
    resultados_esperados: string[] | null;
    recomendaciones_diseno: string[] | null;
  } | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('fase1_informe_necesidades')
      .select(
        'sintesis_contexto, preguntas_respuestas, brechas_competencia, declaracion_problema, ' +
        'objetivos_aprendizaje, perfil_participante, resultados_esperados, recomendaciones_diseno',
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`getF1Informe failed: ${error.message}`);
    if (!data) return null;
    return data as unknown as {
      sintesis_contexto: string | null;
      preguntas_respuestas: Array<{ pregunta: string; respuesta: string }> | null;
      brechas_competencia: Array<{ tipo: string; descripcion: string; capacitable: string }> | null;
      declaracion_problema: string | null;
      objetivos_aprendizaje: Array<{ objetivo: string; nivel_bloom: string; tipo: string }> | null;
      perfil_participante: Record<string, string> | null;
      resultados_esperados: string[] | null;
      recomendaciones_diseno: string[] | null;
    };
  }

  // ── Preguntas y respuestas entre fases ───────────────────────────────────

  /**
   * Guarda las preguntas generadas para una fase futura.
   * IMPORTANTE: Elimina preguntas previas para el mismo proyecto/fase.
   */
  async saveFaseQuestions(params: {
    projectId: string;
    faseDestino: number;
    preguntas: string[];
  }): Promise<void> {
    if (!this.client) return;
    const srv = new PreguntasService(new PreguntasRepository(this.client));
    await srv.saveFaseQuestions(params.projectId, params.faseDestino, params.preguntas);
  }

  /**
   * Obtiene las preguntas diagnósticas generadas para una fase.
   */
  async getFaseQuestions(
    projectId: string,
    faseDestino: number,
  ): Promise<any[]> {
    if (!this.client) return [];
    const srv = new PreguntasService(new PreguntasRepository(this.client));
    return srv.getFaseQuestions(projectId, faseDestino);
  }

  async saveFaseAnswers(params: {
    projectId: string;
    answers: Array<{ preguntaId: string; respuesta: string }>;
  }): Promise<void> {
    if (!this.client) return;

    const rows = params.answers.map((a) => ({
      pregunta_id: a.preguntaId,
      project_id: params.projectId,
      respuesta: a.respuesta,
    }));

    const { error } = await this.client
      .from('respuestas_preguntas_fase')
      .insert(rows);

    if (error) throw new Error(`saveFaseAnswers failed: ${error.message}`);
  }

  async getFaseAnswers(
    projectId: string,
    faseDestino: number,
  ): Promise<Array<{ pregunta_id: string; respuesta: string }>> {
    if (!this.client) return [];

    // Paso 1: obtener los IDs de preguntas para la fase destino
    const { data: qData, error: qError } = await this.client
      .from('preguntas_fase')
      .select('id')
      .eq('project_id', projectId)
      .eq('fase_destino', faseDestino);

    if (qError) throw new Error(`getFaseAnswers (step1) failed: ${qError.message}`);
    const questionIds = (qData ?? []).map((r) => (r as { id: string }).id);
    if (questionIds.length === 0) return [];

    // Paso 2: obtener las respuestas para esos IDs
    const { data, error } = await this.client
      .from('respuestas_preguntas_fase')
      .select('pregunta_id, respuesta')
      .eq('project_id', projectId)
      .in('pregunta_id', questionIds);

    if (error) throw new Error(`getFaseAnswers (step2) failed: ${error.message}`);
    return (data ?? []) as Array<{ pregunta_id: string; respuesta: string }>;
  }

  // ── Análisis estructurado F2 ─────────────────────────────────────────────

  async saveF2Analisis(params: {
    projectId: string;
    jobId: string;
    modalidad: Record<string, string> | null;
    interactividad: Record<string, unknown> | null;
    estructura_tematica: Array<{ modulo: string; nombre: string; objetivo: string; horas: string }> | null;
    perfil_ingreso: Array<{ categoria: string; requisito: string; fuente: string }> | null;
    estrategias: Array<{ estrategia: string; descripcion: string; modulos: string; bloom: string }> | null;
    supuestos_restricciones: { supuestos: string[]; restricciones: string[] } | null;
    documento_final: string;
    perfil_ajustado: Record<string, string> | null;
  }): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client
      .from('fase2_analisis_alcance')
      .insert({
        project_id: params.projectId,
        job_id: params.jobId,
        modalidad: params.modalidad,
        interactividad: params.interactividad,
        estructura_tematica: params.estructura_tematica,
        perfil_ingreso: params.perfil_ingreso,
        estrategias: params.estrategias,
        supuestos_restricciones: params.supuestos_restricciones,
        documento_final: params.documento_final,
        perfil_ajustado: params.perfil_ajustado,
      });

    if (error) throw new Error(`saveF2Analisis failed: ${error.message}`);
  }

  async getF2Analisis(projectId: string): Promise<{
    modalidad: Record<string, string> | null;
    interactividad: Record<string, unknown> | null;
    estructura_tematica: Array<{ modulo: string; nombre: string; objetivo: string; horas: string }> | null;
    perfil_ingreso: Array<{ categoria: string; requisito: string; fuente: string }> | null;
    estrategias: Array<{ estrategia: string; descripcion: string; modulos: string; bloom: string }> | null;
    supuestos_restricciones: { supuestos: string[]; restricciones: string[] } | null;
    perfil_ajustado: Record<string, string> | null;
  } | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('fase2_analisis_alcance')
      .select('modalidad,interactividad,estructura_tematica,perfil_ingreso,estrategias,supuestos_restricciones,perfil_ajustado')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`getF2Analisis failed: ${error.message}`);
    if (!data) return null;
    return data as unknown as {
      modalidad: Record<string, string> | null;
      interactividad: Record<string, unknown> | null;
      estructura_tematica: Array<{ modulo: string; nombre: string; objetivo: string; horas: string }> | null;
      perfil_ingreso: Array<{ categoria: string; requisito: string; fuente: string }> | null;
      estrategias: Array<{ estrategia: string; descripcion: string; modulos: string; bloom: string }> | null;
      supuestos_restricciones: { supuestos: string[]; restricciones: string[] } | null;
      perfil_ajustado: Record<string, string> | null;
    };
  }

  // ── Resolución de discrepancias F1↔F2 ────────────────────────────────────

  async saveResolucionDiscrepancias(params: {
    projectId: string;
    discrepancias: unknown[];
    resoluciones: Array<{ aspecto: string; decision: string; valor_elegido: string }>;
    listoParaF3: boolean;
  }): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client
      .from('fase2_resolucion_discrepancias')
      .insert({
        project_id: params.projectId,
        discrepancias: params.discrepancias,
        resoluciones: params.resoluciones,
        listo_para_f3: params.listoParaF3,
        resuelto_en: new Date().toISOString(),
      });

    if (error) throw new Error(`saveResolucionDiscrepancias failed: ${error.message}`);
  }

  async getResolucionDiscrepancias(projectId: string): Promise<{
    discrepancias: unknown[];
    resoluciones: Array<{ aspecto: string; decision: string; valor_elegido: string }>;
    listo_para_f3: boolean;
  } | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('fase2_resolucion_discrepancias')
      .select('discrepancias,resoluciones,listo_para_f3')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`getResolucionDiscrepancias failed: ${error.message}`);
    if (!data) return null;
    return data as unknown as {
      discrepancias: unknown[];
      resoluciones: Array<{ aspecto: string; decision: string; valor_elegido: string }>;
      listo_para_f3: boolean;
    };
  }

  // ── Especificaciones estructuradas F3 ────────────────────────────────────

  async saveF3Especificaciones(params: {
    projectId: string;
    jobId: string;
    plataforma_navegador: unknown | null;
    reporteo: unknown | null;
    formatos_multimedia: unknown | null;
    navegacion_identidad: unknown | null;
    criterios_aceptacion: unknown | null;
    calculo_duracion: unknown | null;
    documento_final: string;
    borrador_A: string;
    borrador_B: string;
    juez_decision: string;
    juez_similitud: number;
  }): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client
      .from('fase3_especificaciones')
      .insert({
        project_id: params.projectId,
        job_id: params.jobId,
        plataforma_navegador: params.plataforma_navegador,
        reporteo: params.reporteo,
        formatos_multimedia: params.formatos_multimedia,
        navegacion_identidad: params.navegacion_identidad,
        criterios_aceptacion: params.criterios_aceptacion,
        calculo_duracion: params.calculo_duracion,
        documento_final: params.documento_final,
        borrador_a: params.borrador_A,
        borrador_b: params.borrador_B,
        juez_decision: params.juez_decision,
        juez_similitud: params.juez_similitud,
      });

    if (error) throw new Error(`saveF3Especificaciones failed: ${error.message}`);
  }

  async getF3Especificaciones(projectId: string): Promise<{
    plataforma_navegador: unknown | null;
    reporteo: unknown | null;
    formatos_multimedia: unknown | null;
    navegacion_identidad: unknown | null;
    criterios_aceptacion: unknown | null;
    calculo_duracion: unknown | null;
    documento_final: string | null;
    juez_decision: string | null;
    juez_similitud: number | null;
  } | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('fase3_especificaciones')
      .select(
        'plataforma_navegador,reporteo,formatos_multimedia,navegacion_identidad,' +
        'criterios_aceptacion,calculo_duracion,documento_final,juez_decision,juez_similitud',
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`getF3Especificaciones failed: ${error.message}`);
    if (!data) return null;
    return data as unknown as {
      plataforma_navegador: unknown | null;
      reporteo: unknown | null;
      formatos_multimedia: unknown | null;
      navegacion_identidad: unknown | null;
      criterios_aceptacion: unknown | null;
      calculo_duracion: unknown | null;
      documento_final: string | null;
      juez_decision: string | null;
      juez_similitud: number | null;
    };
  }

  // ── Recomendaciones estructuradas F2.5 ──────────────────────────────────────

  async saveF2_5Recomendaciones(params: {
    projectId: string;
    jobId: string;
    actividades: unknown | null;
    metricas: unknown | null;
    frecuencia_revision: string | null;
    total_videos: number | null;
    duracion_promedio_minutos: number | null;
    documento_final: string;
    borrador_A: string;
    borrador_B: string;
    juez_decision: string;
  }): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client
      .from('fase2_5_recomendaciones')
      .insert({
        project_id: params.projectId,
        job_id: params.jobId,
        actividades: params.actividades,
        metricas: params.metricas,
        frecuencia_revision: params.frecuencia_revision,
        total_videos: params.total_videos,
        duracion_promedio_minutos: params.duracion_promedio_minutos,
        documento_final: params.documento_final,
        borrador_a: params.borrador_A,
        borrador_b: params.borrador_B,
        juez_decision: params.juez_decision,
      });

    if (error) throw new Error(`saveF2_5Recomendaciones failed: ${error.message}`);
  }

  async saveF2_5EstructuraVideos(jobId: string, estructuraVideos: any): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client
      .from('fase2_5_recomendaciones')
      .update({ estructura_videos: estructuraVideos })
      .eq('job_id', jobId);

    if (error) throw new Error(`saveF2_5EstructuraVideos failed: ${error.message}`);
  }

  async saveF2JuezDecision(jobId: string, seccion: string, decision: any): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client
      .from('f2_jueces_decisiones')
      .upsert({
        job_id: jobId,
        seccion: seccion,
        decision: decision,
        created_at: new Date().toISOString()
      }, { onConflict: 'job_id,seccion' });

    if (error) throw new Error(`saveF2JuezDecision failed: ${error.message}`);
  }

  async getF2JuezDecisiones(jobId: string): Promise<Record<string, any>> {
    if (!this.client) return {};

    const { data, error } = await this.client
      .from('f2_jueces_decisiones')
      .select('seccion, decision')
      .eq('job_id', jobId);

    if (error) throw new Error(`getF2JuezDecisiones failed: ${error.message}`);

    const result: Record<string, any> = {};
    data.forEach(row => { result[row.seccion] = row.decision; });
    return result;
  }

  async saveF0JuezDecision(jobId: string, seccion: string, decision: any): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client
      .from('fase0_jueces_decisiones')
      .upsert({
        job_id: jobId,
        seccion: seccion,
        decision: decision,
        created_at: new Date().toISOString()
      }, { onConflict: 'job_id,seccion' });

    if (error) throw new Error(`saveF0JuezDecision failed: ${error.message}`);
  }

  async getF0JuezDecisiones(jobId: string): Promise<Record<string, any>> {
    if (!this.client) return {};

    const { data, error } = await this.client
      .from('fase0_jueces_decisiones')
      .select('seccion, decision')
      .eq('job_id', jobId);

    if (error) throw new Error(`getF0JuezDecisiones failed: ${error.message}`);

    const result: Record<string, any> = {};
    data.forEach(row => { result[row.seccion] = row.decision; });
    return result;
  }

  async getF2_5Recomendaciones(projectId: string): Promise<any | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('fase2_5_recomendaciones')
      .select('total_videos, duracion_promedio_minutos, estructura_videos, actividades, metricas')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('getF2_5Recomendaciones failed:', error);
      return null;
    }
    return data;
  }

  // ── Productos estructurados F4 ───────────────────────────────────────────

  async saveF4Producto(params: {
    projectId: string;
    producto: string;  // 'P0'..'P7'
    documentoFinal: string;
    borradorA?: string;
    borradorB?: string;
    juezDecision?: object;
    validacionEstado?: string;  // 'aprobado' | 'revision_humana' | 'pendiente'
    validacionErrores?: object;
    datosProducto?: object;
    jobId?: string;
  }): Promise<{ id: string }> {
    if (!this.client) return { id: crypto.randomUUID() };

    // Eliminar registro anterior (mismo project_id + producto) para evitar conflicto con UNIQUE parcial
    await this.client
      .from('fase4_productos')
      .delete()
      .eq('project_id', params.projectId)
      .eq('producto', params.producto)
      .eq('validacion_estado', 'aprobado');

    const { data, error } = await this.client
      .from('fase4_productos')
      .insert({
        project_id: params.projectId,
        producto: params.producto,
        documento_final: params.documentoFinal,
        borrador_a: params.borradorA ?? null,
        borrador_b: params.borradorB ?? null,
        juez_decision: params.juezDecision ?? null,
        validacion_estado: params.validacionEstado ?? 'aprobado',
        validacion_errores: params.validacionErrores ?? null,
        datos_producto: params.datosProducto ?? null,
        job_id: params.jobId ?? null,
      })
      .select('id')
      .single();

    if (error) throw new Error(`saveF4Producto failed: ${error.message}`);
    return { id: (data as { id: string }).id };
  }

  async getF4Productos(projectId: string): Promise<Array<{
    id: string;
    producto: string;
    documento_final: string | null;
    validacion_estado: string;
    validacion_errores: object | null;
    datos_producto: object | null;
    job_id: string | null;
    created_at: string;
    approved_at: string | null;
  }>> {
    if (!this.client) return [];

    const { data, error } = await this.client
      .from('fase4_productos')
      .select('id,producto,documento_final,validacion_estado,validacion_errores,datos_producto,job_id,created_at,approved_at')
      .eq('project_id', projectId)
      .order('producto', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw new Error(`getF4Productos failed: ${error.message}`);
    return (data ?? []) as Array<{
      id: string;
      producto: string;
      documento_final: string | null;
      validacion_estado: string;
      validacion_errores: object | null;
      datos_producto: object | null;
      job_id: string | null;
      created_at: string;
      approved_at: string | null;
    }>;
  }

  private _extractGapsText(markdown: string): string {
    // Regex flexible: captura desde "Gap vs mejores prácticas" hasta el próximo encabezado o fin
    const mejorPracticasMatch = markdown.match(/#+\s*Gap vs mejores pr[aá]cticas[^\n]*[:：]?\s*([\s\S]*?)(?=\n#|\n---|\n\*\*|$)/i);
    const competenciaMatch = markdown.match(/#+\s*Gap vs competencia[^\n]*[:：]?\s*([\s\S]*?)(?=\n#|\n---|\n\*\*|$)/i);

    const mejorPracticas = mejorPracticasMatch?.[1]?.trim() ?? '';
    const competencia = competenciaMatch?.[1]?.trim() ?? '';

    if (!mejorPracticas && !competencia) return '';

    let result = '';
    if (mejorPracticas) result += `### Gap vs mejores prácticas\n${mejorPracticas}\n\n`;
    if (competencia) result += `### Gap vs competencia\n${competencia}`;

    return result;
  }

  /**
   * Obtiene un prompt de la tabla unificada `site_prompts` (migración 008).
   * Fallback: devuelve null si la tabla no existe aún (compatibilidad durante migración).
   */
  async getPromptFromSiteTable(siteId: string, promptId: string): Promise<Record<string, unknown> | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('site_prompts')
      .select('content, metadata')
      .eq('site_id', siteId)
      .eq('prompt_id', promptId)
      .eq('active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null; // tabla puede no existir aún
    if (!data) return null;
    return data as Record<string, unknown>;
  }
}
