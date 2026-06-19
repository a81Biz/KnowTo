import { PipelineEvent } from '../../types/pipeline-event.types';

function extractJson(raw: string): any {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}
  return {};
}

function pickWinner(juezRaw: string): 'A' | 'B' {
  let decision: { seleccion?: string } = { seleccion: 'A' };
  try {
    const m = juezRaw.match(/\{[\s\S]*\}/);
    if (m) decision = JSON.parse(m[0]);
  } catch {}
  return decision.seleccion === 'B' ? 'B' : 'A';
}

function formatDate(): string {
  return new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function handleF5Events(event: PipelineEvent): Promise<string | void> {
  if (event.agentName === 'ensamblador_f5' && event.promptId === 'F5') {
    return handleF5VerificacionAssembler(event);
  }
  if (event.agentName === 'ensamblador_f5_2' && event.promptId === 'F5_2') {
    return handleF5EvidenciasAssembler(event);
  }
}

async function handleF5VerificacionAssembler(event: PipelineEvent): Promise<string> {
  const { jobId, projectId, services } = event;
  const ctx = (event.body?.context ?? {}) as any;
  const projectName = ctx.projectName ?? ctx._frozen?.nombreOficialCurso ?? 'Proyecto';
  const fechaActual = formatDate();

  const juezRaw = (await services.pipelineService.getAgentOutput(jobId, 'juez_verificacion')) ?? '';
  const winner = pickWinner(juezRaw);
  const winnerAgent = winner === 'B' ? 'agente_verificacion_B' : 'agente_verificacion_A';
  const raw = (await services.pipelineService.getAgentOutput(jobId, winnerAgent)) ?? '';

  const parsed = extractJson(raw);
  const verificacion = parsed.verificacion ?? parsed;

  let doc = `# VERIFICACIÓN Y EVALUACIÓN DEL CURSO\n\n`;
  doc += `**Proyecto:** ${projectName}\n`;
  doc += `**Fecha de verificación:** ${fechaActual}\n\n---\n\n`;

  // 1. Checklist técnico
  doc += `## 1. CHECKLIST DE VERIFICACIÓN TÉCNICA\n\n`;
  doc += `| Ítem | Verificado | Evidencia | Observaciones |\n|:---|:---|:---|:---|\n`;
  const tecnicos = Array.isArray(verificacion.checklist_tecnico) ? verificacion.checklist_tecnico : [];
  if (tecnicos.length === 0) {
    const defaults = [
      'El curso carga correctamente en el LMS',
      'El seguimiento SCORM/xAPI funciona',
      'Los videos reproducen sin error',
      'Las evaluaciones calculan correctamente',
      'El certificado se emite al aprobar',
      'El curso es compatible con móviles',
      'Los enlaces están activos',
      'El tiempo de carga es aceptable (<5s)',
    ];
    for (const item of defaults) {
      doc += `| ${item} | ☐ | [por capturar] | |\n`;
    }
  } else {
    for (const item of tecnicos) {
      doc += `| ${item.item ?? ''} | ${item.resultado ?? '☐'} | ${item.evidencia ?? '[por capturar]'} | ${item.observacion ?? ''} |\n`;
    }
  }
  doc += `\n`;

  // 2. Checklist pedagógico
  doc += `## 2. CHECKLIST DE VERIFICACIÓN PEDAGÓGICA\n\n`;
  doc += `| Ítem | Verificado | Observaciones |\n|:---|:---|:---|\n`;
  const pedagogicos = Array.isArray(verificacion.checklist_pedagogico) ? verificacion.checklist_pedagogico : [];
  if (pedagogicos.length === 0) {
    const defaults = [
      'Los objetivos son alcanzables',
      'La secuencia didáctica es lógica',
      'Las actividades corresponden a los objetivos',
      'Las evaluaciones miden lo que deben medir',
      'El lenguaje es claro y apropiado',
      'El nivel de dificultad es adecuado',
      'Las instrucciones son claras',
    ];
    for (const item of defaults) {
      doc += `| ${item} | ☐ | |\n`;
    }
  } else {
    for (const item of pedagogicos) {
      doc += `| ${item.item ?? ''} | ${item.resultado ?? '☐'} | ${item.observacion ?? ''} |\n`;
    }
  }
  doc += `\n`;

  // 3. Reporte de pruebas
  const reporte = verificacion.reporte_pruebas ?? {};
  doc += `## 3. PLANTILLA DE REPORTE DE PRUEBAS DE USUARIO\n\n`;
  doc += `**Número de participantes:** ${reporte.participantes ?? '[N]'}\n`;
  doc += `**Tasa de aprobación:** ${reporte.tasa_aprobacion ?? '[por calcular]'}\n\n`;

  const hallazgos = Array.isArray(reporte.hallazgos) ? reporte.hallazgos : [];
  if (hallazgos.length > 0) {
    doc += `### Hallazgos principales\n`;
    hallazgos.forEach((h: string, i: number) => { doc += `${i + 1}. ${h}\n`; });
    doc += `\n`;
  }

  const ajustes = Array.isArray(reporte.ajustes_recomendados) ? reporte.ajustes_recomendados : [];
  if (ajustes.length > 0) {
    doc += `### Ajustes recomendados\n`;
    ajustes.forEach((a: any, i: number) => {
      const texto = typeof a === 'string' ? a : (a.ajuste ?? '');
      const prioridad = typeof a === 'string' ? 'Media' : (a.prioridad ?? 'Media');
      doc += `${i + 1}. ${texto} — Prioridad: ${prioridad}\n`;
    });
    doc += `\n`;
  }

  try {
    await services.supabase.saveDocument({
      projectId,
      stepId: event.body?.stepId ?? '',
      phaseId: 'F5',
      title: 'Verificación y Evaluación del Curso',
      content: doc,
    });
    console.log(`[f5.phase] F5 verificación guardada para proyecto ${projectId}`);
  } catch (err) {
    console.warn('[f5.phase] saveDocument F5 falló:', err);
  }

  return doc;
}

async function handleF5EvidenciasAssembler(event: PipelineEvent): Promise<string> {
  const { jobId, projectId, services } = event;
  const ctx = (event.body?.context ?? {}) as any;
  const projectName = ctx.projectName ?? ctx._frozen?.nombreOficialCurso ?? 'Proyecto';
  const clientName = ctx.clientName ?? '';
  const fechaActual = formatDate();

  const juezRaw = (await services.pipelineService.getAgentOutput(jobId, 'juez_evidencias')) ?? '';
  const winner = pickWinner(juezRaw);
  const winnerAgent = winner === 'B' ? 'agente_evidencias_B' : 'agente_evidencias_A';
  const raw = (await services.pipelineService.getAgentOutput(jobId, winnerAgent)) ?? '';

  const parsed = extractJson(raw);
  const evidencias = parsed.evidencias ?? parsed;

  let doc = `# ANEXO DE EVIDENCIAS\n\n`;
  doc += `**Proyecto:** ${projectName}\n`;
  doc += `**Candidato:** ${clientName}\n`;
  doc += `**Fecha de elaboración:** ${fechaActual}\n\n`;
  doc += `> **Instrucciones generales:** Este documento es una plantilla oficial para el expediente de certificación. Cada sección indica qué evidencia recopilar, cómo hacerlo y qué formato usar.\n\n---\n\n`;

  const lista = Array.isArray(evidencias.lista) ? evidencias.lista : [];
  if (lista.length === 0) {
    doc += `## EVIDENCIA 1: CURSO PUBLICADO EN LMS\n\n`;
    doc += `**Propósito:** Demostrar que el curso está activo y accesible en la plataforma.\n\n`;
    doc += `- **Archivo:** \`evidencia-1-curso-publicado.png\`\n`;
    doc += `- **Instrucción:** Captura de pantalla de la pantalla de inicio del curso con título visible y estado Activo.\n`;
    doc += `- **Formato:** PNG o JPG, mínimo 1280×720 px\n\n`;
  } else {
    for (const ev of lista) {
      doc += `## EVIDENCIA ${ev.numero ?? ''}: ${(ev.nombre ?? '').toUpperCase()}\n\n`;
      doc += `**Propósito:** ${ev.proposito ?? ''}\n\n`;
      doc += `- **Archivo sugerido:** \`${ev.archivo ?? ''}\`\n`;
      doc += `- **Instrucción de captura:** ${ev.instruccion_captura ?? ''}\n`;
      doc += `- **Formato:** ${ev.formato ?? 'PNG o JPG'}\n\n---\n\n`;
    }
  }

  // Declaración de autenticidad
  doc += `## DECLARACIÓN DE AUTENTICIDAD\n\n`;
  doc += `El candidato certifica que todas las evidencias presentadas son auténticas y corresponden al proceso de desarrollo del curso.\n\n`;
  doc += `**Nombre completo:** ${clientName || '_________________________'}\n`;
  doc += `**Firma:** _________________________\n`;
  doc += `**Fecha de firma:** _________________________\n\n---\n\n`;

  // Lista de verificación
  doc += `## LISTA DE VERIFICACIÓN FINAL\n\n`;
  doc += `| # | Archivo | ¿Listo? |\n|:---|:---|:---|\n`;
  const listaVerif = Array.isArray(evidencias.lista_verificacion) ? evidencias.lista_verificacion : lista;
  if (listaVerif.length === 0) {
    doc += `| 1 | evidencia-1-curso-publicado.png | ☐ |\n`;
    doc += `| 2 | evidencia-2-reporteo-lms.png | ☐ |\n`;
    doc += `| 3 | evidencia-3-resultados-evaluaciones.png | ☐ |\n`;
    doc += `| 4 | evidencia-4-certificado-ejemplo.pdf | ☐ |\n`;
  } else {
    for (const v of listaVerif) {
      doc += `| ${v.numero ?? ''} | ${v.archivo ?? ''} | ☐ |\n`;
    }
  }

  try {
    await services.supabase.saveDocument({
      projectId,
      stepId: event.body?.stepId ?? '',
      phaseId: 'F5_2',
      title: 'Anexo de Evidencias',
      content: doc,
    });
    console.log(`[f5.phase] F5_2 evidencias guardadas para proyecto ${projectId}`);
  } catch (err) {
    console.warn('[f5.phase] saveDocument F5_2 falló:', err);
  }

  return doc;
}
