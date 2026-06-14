import { PipelineEvent } from '../../types/pipeline-event.types';

/** Multi-strategy JSON extractor for F3 LLM output — handles wrapped, truncated, and malformed responses. */
function parseF3Json(raw: string): any {
  const candidate = raw.match(/\{[\s\S]*\}/);
  if (!candidate) return {};
  let src = candidate[0];
  try { return JSON.parse(src); } catch { /* fall through */ }
  // Repair: unclosed JSON
  const trimmed = src.trim();
  if (!trimmed.endsWith('}')) {
    try { return JSON.parse(trimmed + '}'); } catch { /* fall through */ }
  }
  // Repair: strip trailing commas before closing brace
  try { return JSON.parse(src.replace(/,\s*([}\]])/g, '$1')); } catch { /* fall through */ }
  return {};
}

function validarEspecificacionesF3(data: any): string[] {
  const errores: string[] = [];
  const plataforma: string = (data.plataforma_navegador?.plataforma || '').toLowerCase();
  const scorm: string = (data.plataforma_navegador?.version_scorm || '').trim();
  const criteriosAccesibilidad: string[] = data.criterios_aceptacion?.criterios_accesibilidad ?? [];

  // (a) Presencial + LMS online = incoherencia
  const esLmsOnline = ['moodle', 'canvas', 'blackboard', 'teams', 'google classroom', 'lms'].some(lms => plataforma.includes(lms));
  const esPresencial = plataforma.includes('presencial') || plataforma.includes('f2f') || plataforma.includes('face');
  if (esPresencial && esLmsOnline) {
    errores.push(`Incoherencia: modalidad presencial incompatible con plataforma LMS online (${data.plataforma_navegador?.plataforma}).`);
  }

  // (b) SCORM sin plataforma definida
  if (scorm && scorm.toLowerCase() !== 'no aplica' && !data.plataforma_navegador?.plataforma) {
    errores.push(`Error: versión SCORM especificada (${scorm}) pero sin plataforma LMS asociada.`);
  }

  // (c) Sin nivel WCAG
  const tieneWcag = criteriosAccesibilidad.some((c: string) => /wcag/i.test(c));
  if (!tieneWcag) {
    errores.push('Error: no se especificó nivel de accesibilidad WCAG en criterios de aceptación.');
  }

  return errores;
}

/**
 * Controlador de eventos para la Fase 3.
 */
export async function handleF3Events(event: PipelineEvent): Promise<string | void> {
  const { agentName, output, jobId, projectId, services, promptId } = event;

  if (agentName === 'sintetizador_final_f3') {
    if (promptId !== 'F3') return;

    try {
      const borradorA = (await services.pipelineService.getAgentOutput(jobId, 'agente_doble_A_f3')) ?? '';
      const borradorB = (await services.pipelineService.getAgentOutput(jobId, 'agente_doble_B_f3')) ?? '';
      const juezRaw = (await services.pipelineService.getAgentOutput(jobId, 'agente_juez_f3')) ?? output;

      let f3Payload: any = parseF3Json(juezRaw);
      if (!f3Payload || Object.keys(f3Payload).length === 0) {
        console.error("[f3.phase] Error irrecuperable al parsear JSON unificado F3 — payload vacío");
      }

      // Extract modalidad from extractor_f3 output (not included in the juez merged JSON)
      // and inject into plataforma_navegador so it is queryable downstream by the CCM engine.
      const extractorRaw = (await services.pipelineService.getAgentOutput(jobId, 'extractor_f3')) ?? '';
      const extractorData: any = parseF3Json(extractorRaw);
      const modalidadCurso: string = extractorData.modalidad ?? '';
      if (modalidadCurso) {
        const pn = f3Payload.plataforma_navegador ?? {};
        f3Payload.plataforma_navegador = { ...pn, modalidad_curso: modalidadCurso };
        console.log(`[f3.phase] modalidad_curso capturada: ${modalidadCurso}`);
      }

      // Extraer selección real del juez (fallback 'A' si el JSON no tiene seleccion)
      let juezDecision = 'A';
      const juezObj = parseF3Json(juezRaw);
      if (juezObj?.seleccion === 'B') juezDecision = 'B';

      // Convertir el JSON a Markdown para la interfaz de usuario
      const data = f3Payload.especificaciones_tecnicas || f3Payload;

      let documentoFinal = `# ESPECIFICACIONES TÉCNICAS Y DISEÑO DE INTERFAZ\n\n`;

      // 1. PLATAFORMA Y COMPATIBILIDAD
      documentoFinal += `## 1. PLATAFORMA Y COMPATIBILIDAD\n`;
      documentoFinal += `- **LMS Seleccionado:** ${data.plataforma_navegador?.plataforma || 'No especificado'}\n`;
      documentoFinal += `- **Versión SCORM:** ${data.plataforma_navegador?.version_scorm || 'No especificado'}\n`;
      documentoFinal += `- **Justificación:** ${data.plataforma_navegador?.justificacion || 'N/A'}\n\n`;
      documentoFinal += `**Navegadores Soportados:**\n`;
      (data.plataforma_navegador?.navegadores_soportados || []).forEach((nav: string) => { documentoFinal += `- ${nav}\n`; });
      documentoFinal += `\n`;

      // 2. REPORTEO
      documentoFinal += `## 2. REPORTEO E INDICADORES\n`;
      documentoFinal += `| Métrica | Formato | Frecuencia |\n|:---|:---|:---|\n`;
      (data.reporteo?.metricas || []).forEach((m: any) => {
        documentoFinal += `| ${m.metrica || ''} | ${m.formato || ''} | ${m.frecuencia || ''} |\n`;
      });
      documentoFinal += `\n- **Frecuencia Automática:** ${data.reporteo?.frecuencia_reporte_automatico || 'N/A'}\n\n`;

      // 3. FORMATOS MULTIMEDIA
      documentoFinal += `## 3. FORMATOS MULTIMEDIA\n`;
      const v = data.formatos_multimedia?.videos || {};
      documentoFinal += `- **Videos Recomendados:** ${v.cantidad_recomendada || 0} videos de ${v.duracion_optima_minutos || 0} min aprox.\n`;
      documentoFinal += `- **Resolución:** ${v.resolucion || 'N/A'}\n`;
      documentoFinal += `- **Herramientas:** ${(v.herramientas_sugeridas || []).join(', ')}\n\n`;

      // 4. NAVEGACIÓN E IDENTIDAD GRÁFICA
      documentoFinal += `## 4. NAVEGACIÓN E IDENTIDAD\n`;
      documentoFinal += `- **Tipo de Navegación:** ${data.navegacion_identidad?.navegacion?.tipo || 'N/A'}\n`;
      documentoFinal += `- **Botones Principales:** ${(data.navegacion_identidad?.navegacion?.botones_principales || []).join(', ')}\n\n`;

      // 5. CRITERIOS DE ACEPTACIÓN
      documentoFinal += `## 5. CRITERIOS DE ACEPTACIÓN\n`;
      documentoFinal += `**Técnicos:**\n`;
      (data.criterios_aceptacion?.criterios_tecnicos || []).forEach((c: string) => { documentoFinal += `- ${c}\n`; });
      documentoFinal += `\n**Pedagógicos y Accesibilidad:**\n`;
      (data.criterios_aceptacion?.criterios_pedagogicos || []).forEach((c: string) => { documentoFinal += `- ${c}\n`; });
      (data.criterios_aceptacion?.criterios_accesibilidad || []).forEach((c: string) => { documentoFinal += `- ${c}\n`; });
      documentoFinal += `\n`;

      // Sección 6 (Cálculo de Duración) eliminada — el LLM producía totales imposibles
      // (num_modulos × 30min + total_videos × duración_avg). La duración real proviene
      // del formulario del cliente (F3 userInputs), no de un cálculo automático.

      // PT-029.4: Validar coherencia de especificaciones F3
      const erroresF3 = validarEspecificacionesF3(data);
      if (erroresF3.length > 0) {
        console.warn('[f3.phase] Advertencias de validación F3:', erroresF3);
      }

      await services.supabase.saveF3Especificaciones({
        projectId,
        jobId,
        juez_decision: juezDecision,
        juez_similitud: 100,
        borrador_A: borradorA,
        borrador_B: borradorB,
        documento_final: documentoFinal,
        plataforma_navegador: f3Payload.plataforma_navegador || null,
        reporteo: f3Payload.reporteo || null,
        formatos_multimedia: f3Payload.formatos_multimedia || null,
        navegacion_identidad: f3Payload.navegacion_identidad || null,
        criterios_aceptacion: f3Payload.criterios_aceptacion || null,
        calculo_duracion: erroresF3.length > 0 ? { errores: erroresF3 } : null,
      });
      
      console.log(`[f3.phase] Especificaciones Técnicas estructuradas guardadas con éxito.`);
      return documentoFinal;
    } catch (err) {
      console.warn('[f3.phase] saveF3Especificaciones failed:', err);
    }
  }
}
