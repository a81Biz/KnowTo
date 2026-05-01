import { PipelineEvent } from '../../types/pipeline-event.types';

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

      let f3Payload: any = {};
      
      try {
        const jsonMatch = juezRaw.match(/\{[\s\S]*\}/);
        let cleanJsonString = jsonMatch ? jsonMatch[0] : juezRaw;
        
        try {
          f3Payload = JSON.parse(cleanJsonString);
        } catch (parseError) {
          console.warn("[f3.phase] Parseo estricto falló, intentando reparar JSON...");
          const trimmed = cleanJsonString.trim();
          if (!trimmed.endsWith('}')) {
              cleanJsonString = trimmed + '}';
          }
          f3Payload = JSON.parse(cleanJsonString);
        }
      } catch (error) {
        console.error("[f3.phase] Error irrecuperable al parsear JSON unificado F3:", error);
      }

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

      // 6. CÁLCULO DE DURACIÓN
      documentoFinal += `## 6. CÁLCULO DE DURACIÓN\n`;
      documentoFinal += `| Componente | Cantidad | Tiempo Unitario | Total (min) |\n|:---|:---|:---|:---|\n`;
      (data.calculo_duracion?.desglose || []).forEach((d: any) => {
        documentoFinal += `| ${d.componente || ''} | ${d.cantidad || 0} | ${d.tiempo_unitario_min || 0} min | ${d.total_min || 0} min |\n`;
      });
      documentoFinal += `\n**Duración Total Estimada:** ${data.calculo_duracion?.duracion_total_horas_aprox || 0} horas.\n`;

      await services.supabase.saveF3Especificaciones({
        projectId,
        jobId,
        decision_juez: 'A', // Forzamos un string ya que el JSON gigante es el propio ganador
        similitud_juez: 100,
        borrador_A: borradorA,
        borrador_B: borradorB,
        documento_final: documentoFinal,
        plataforma_navegador: f3Payload.plataforma_navegador || null,
        reporteo: f3Payload.reporteo || null,
        formatos_multimedia: f3Payload.formatos_multimedia || null,
        navegacion_identidad: f3Payload.navegacion_identidad || null,
        criterios_aceptacion: f3Payload.criterios_aceptacion || null,
        calculo_duracion: f3Payload.calculo_duracion || null
      });
      
      console.log(`[f3.phase] Especificaciones Técnicas estructuradas guardadas con éxito.`);
      return documentoFinal;
    } catch (err) {
      console.warn('[f3.phase] saveF3Especificaciones failed:', err);
    }
  }
}
