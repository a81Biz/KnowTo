import { PipelineEvent } from '../../types/pipeline-event.types';
import { sanitizeForClosure, checkChronologicalOrder } from '../../helpers/doc-sanitizer.helper';

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

export async function handleF6Events(event: PipelineEvent): Promise<string | void> {
  if (event.agentName === 'ensamblador_f6' && event.promptId === 'F6') {
    return handleF6AjustesAssembler(event);
  }
  if (event.agentName === 'ensamblador_f6_2a' && event.promptId === 'F6_2a') {
    return handleF6InventarioAssembler(event);
  }
  if (event.agentName === 'ensamblador_f6_2b' && event.promptId === 'F6_2b') {
    return handleF6DeclaracionAssembler(event);
  }
}

async function handleF6AjustesAssembler(event: PipelineEvent): Promise<string> {
  const { jobId, projectId, services } = event;
  const ctx = (event.body?.context ?? {}) as any;
  const projectName = ctx.projectName ?? ctx._frozen?.nombreOficialCurso ?? 'Proyecto';
  const clientName = ctx.clientName ?? '';
  const fechaActual = formatDate();

  const juezRaw = (await services.pipelineService.getAgentOutput(jobId, 'juez_ajustes')) ?? '';
  const winner = pickWinner(juezRaw);
  const winnerAgent = winner === 'B' ? 'agente_ajustes_B' : 'agente_ajustes_A';
  const raw = (await services.pipelineService.getAgentOutput(jobId, winnerAgent)) ?? '';

  const parsed = extractJson(raw);
  const ajustes = parsed.ajustes ?? parsed;

  let doc = `# DOCUMENTO DE AJUSTES POST-EVALUACIÓN\n\n`;
  doc += `**Proyecto:** ${projectName}\n`;
  doc += `**Candidato:** ${clientName}\n`;
  doc += `**Fecha:** ${fechaActual}\n\n---\n\n`;

  // 1. Observaciones
  doc += `## 1. RESUMEN DE OBSERVACIONES RECIBIDAS\n\n`;
  doc += `${ajustes.observaciones_recibidas ?? '[Síntesis de las observaciones del usuario y/o participantes de prueba]'}\n\n---\n\n`;

  // 2. Clasificación
  doc += `## 2. CLASIFICACIÓN DE AJUSTES\n\n`;
  doc += `| # | Observación | Tipo | Prioridad | Responsable | Plazo |\n|:---|:---|:---|:---|:---|:---|\n`;
  const clasificacion = Array.isArray(ajustes.clasificacion) ? ajustes.clasificacion : [];
  if (clasificacion.length === 0) {
    doc += `| 1 | [observación pendiente] | Técnico | Media | ${clientName || 'Candidato'} | ${fechaActual} |\n`;
  } else {
    for (const item of clasificacion) {
      doc += `| ${item.numero ?? ''} | ${item.observacion ?? ''} | ${item.tipo ?? ''} | ${item.prioridad ?? ''} | ${item.responsable ?? ''} | ${item.plazo ?? ''} |\n`;
    }
  }
  doc += `\n---\n\n`;

  // 3. Plan detallado
  doc += `## 3. PLAN DE AJUSTES DETALLADO\n\n`;
  const plan = Array.isArray(ajustes.plan_detallado) ? ajustes.plan_detallado : [];
  if (plan.length === 0) {
    doc += `### Ajuste 1: [pendiente de definir]\n`;
    doc += `- **Problema identificado:** [descripción]\n`;
    doc += `- **Solución propuesta:** [descripción]\n`;
    doc += `- **Responsable:** ${clientName || 'Candidato'}\n`;
    doc += `- **Fecha límite:** ${fechaActual}\n`;
    doc += `- **Verificación:** [criterio de verificación]\n\n`;
  } else {
    for (const item of plan) {
      doc += `### Ajuste: ${item.nombre ?? ''}\n`;
      doc += `- **Problema identificado:** ${item.problema ?? ''}\n`;
      doc += `- **Solución propuesta:** ${item.solucion ?? ''}\n`;
      if (item.archivos) doc += `- **Archivos a modificar:** ${item.archivos}\n`;
      doc += `- **Responsable:** ${item.responsable ?? ''}\n`;
      doc += `- **Fecha límite:** ${item.fecha_limite ?? ''}\n`;
      doc += `- **Verificación:** ${item.verificacion ?? ''}\n\n`;
    }
  }
  doc += `---\n\n`;

  // 4. Control de versiones
  doc += `## 4. CONTROL DE VERSIONES\n\n`;
  doc += `| Versión | Fecha | Cambios realizados | Responsable |\n|:---|:---|:---|:---|\n`;
  const versiones = Array.isArray(ajustes.control_versiones) ? ajustes.control_versiones : [];
  if (versiones.length === 0) {
    doc += `| 1.0 | ${fechaActual} | Versión inicial del curso | ${clientName || 'Candidato'} |\n`;
  } else {
    for (const v of versiones) {
      doc += `| ${v.version ?? ''} | ${v.fecha ?? ''} | ${v.cambios ?? ''} | ${v.responsable ?? ''} |\n`;
    }
  }
  doc += `\n---\n\n`;

  // 5. Declaración
  doc += `## 5. DECLARACIÓN DE CONFORMIDAD\n\n`;
  doc += `El candidato ${clientName} declara que los ajustes listados han sido implementados y que el curso cumple con los requisitos del estándar de certificación aplicable.\n\n`;
  doc += `**Firma:** _________________________  **Fecha:** _____________\n`;

  const { doc: docSanitized, blocking } = sanitizeForClosure(doc, 'F6');
  doc = docSanitized;
  const chronoWarnings = checkChronologicalOrder(doc);
  if (chronoWarnings.length > 0) console.warn('[f6.phase] F6 advertencias cronológicas:', chronoWarnings);
  if (blocking.length > 0) {
    console.error('[f6.phase] F6 bloqueado por placeholders:', blocking);
    throw new Error(`F6 contiene placeholders no resueltos: ${blocking.join('; ')}`);
  }

  try {
    await services.supabase.saveDocument({
      projectId,
      stepId: event.body?.stepId ?? '',
      phaseId: 'F6',
      title: 'Documento de Ajustes Post-Evaluación',
      content: doc,
    });
    console.log(`[f6.phase] F6 ajustes guardados para proyecto ${projectId}`);
  } catch (err) {
    console.warn('[f6.phase] saveDocument F6 falló:', err);
  }

  return doc;
}

async function handleF6InventarioAssembler(event: PipelineEvent): Promise<string> {
  const { jobId, projectId, services } = event;
  const ctx = (event.body?.context ?? {}) as any;
  const projectName = ctx.projectName ?? ctx._frozen?.nombreOficialCurso ?? 'Proyecto';
  const clientName = ctx.clientName ?? '';
  const folioSugerido = ctx.folioSugerido ?? `EXP-${new Date().getFullYear()}-0001`;
  const fechaActual = formatDate();

  const juezRaw = (await services.pipelineService.getAgentOutput(jobId, 'juez_inventario')) ?? '';
  const winner = pickWinner(juezRaw);
  const winnerAgent = winner === 'B' ? 'agente_inventario_B' : 'agente_inventario_A';
  const raw = (await services.pipelineService.getAgentOutput(jobId, winnerAgent)) ?? '';

  const parsed = extractJson(raw);
  const inventario = parsed.inventario ?? parsed;

  let doc = `# LISTA DE VERIFICACIÓN E INVENTARIO DEL EXPEDIENTE\n\n`;
  doc += `**Proyecto:** ${projectName}\n`;
  doc += `**Candidato:** ${clientName}\n`;
  doc += `**Folio de expediente:** ${folioSugerido}\n`;
  doc += `**Fecha de elaboración:** ${fechaActual}\n\n---\n\n`;

  // 1. Inventario
  doc += `## 1. INVENTARIO COMPLETO DEL EXPEDIENTE\n\n`;
  doc += `| # | Documento | Fase | Elemento | Estado | Páginas aprox. | Firma requerida |\n|:---|:---|:---|:---|:---|:---|:---|\n`;

  const documentos = Array.isArray(inventario.documentos) ? inventario.documentos : [];
  if (documentos.length === 0) {
    const defaults = [
      { numero: 1, documento: 'Marco de Referencia del Cliente', fase: 'Diagnóstico', elemento: 'REQ-A', estado: 'Completado', paginas: '2', firma: 'Candidato' },
      { numero: 2, documento: 'Informe de Necesidades de Capacitación', fase: 'Análisis de Necesidades', elemento: 'REQ-A', estado: 'Completado', paginas: '4', firma: 'Candidato' },
      { numero: 3, documento: 'Especificaciones de Análisis', fase: 'Alcance y Estructura', elemento: 'REQ-A', estado: 'Completado', paginas: '3', firma: 'Candidato' },
      { numero: 4, documento: 'Recomendaciones Pedagógicas', fase: 'Estrategia Pedagógica', elemento: 'REQ-A', estado: 'Completado', paginas: '2', firma: 'Candidato' },
      { numero: 5, documento: 'Especificaciones Técnicas', fase: 'Especificaciones Técnicas', elemento: 'REQ-A', estado: 'Completado', paginas: '3', firma: 'Candidato' },
    ];
    for (const d of defaults) {
      doc += `| ${d.numero} | ${d.documento} | ${d.fase} | ${d.elemento} | ${d.estado} | ${d.paginas} | ${d.firma} |\n`;
    }
  } else {
    let completados = 0;
    for (const d of documentos) {
      doc += `| ${d.numero ?? ''} | ${d.documento ?? ''} | ${d.fase ?? ''} | ${d.elemento ?? ''} | ${d.estado ?? ''} | ${d.paginas ?? ''} | ${d.firma ?? ''} |\n`;
      if (d.estado === 'Completado') completados++;
    }
    doc += `\n**Documentos completados:** ${completados} de ${documentos.length}\n`;
    doc += `**Documentos pendientes:** ${documentos.length - completados} de ${documentos.length}\n`;
  }
  doc += `\n---\n\n`;

  // 2. Firmas
  const firmas = inventario.firmas ?? {};
  doc += `## 2. FIRMAS DE CIERRE\n\n`;
  doc += `### Candidato a Certificación\n`;
  doc += `**Nombre completo:** ${firmas.candidato?.nombre || clientName || '_________________________'}\n`;
  doc += `**CURP:** ${firmas.candidato?.curp || '_________________________'}\n`;
  doc += `**Firma:** _________________________\n`;
  doc += `**Fecha:** _________________________\n\n`;

  doc += `### Revisor Técnico\n`;
  doc += `**Nombre completo:** ${firmas.revisor?.nombre || '_________________________'}\n`;
  doc += `**Cargo:** ${firmas.revisor?.cargo || '_________________________'}\n`;
  doc += `**Firma:** _________________________\n`;
  doc += `**Fecha:** _________________________\n\n`;

  doc += `### Coordinador del Proceso (Organismo Certificador)\n`;
  doc += `**Nombre completo:** ${firmas.coordinador?.nombre || '_________________________'}\n`;
  doc += `**Organismo Certificador:** ${firmas.coordinador?.organismo || '_________________________'}\n`;
  doc += `**Firma:** _________________________\n`;
  doc += `**Fecha:** _________________________\n`;

  const { doc: docSanitized2a, blocking: blocking2a } = sanitizeForClosure(doc, 'F6_2a');
  doc = docSanitized2a;
  if (blocking2a.length > 0) {
    console.error('[f6.phase] F6_2a bloqueado por placeholders:', blocking2a);
    throw new Error(`F6_2a contiene placeholders no resueltos: ${blocking2a.join('; ')}`);
  }

  try {
    await services.supabase.saveDocument({
      projectId,
      stepId: event.body?.stepId ?? '',
      phaseId: 'F6_2a',
      title: 'Lista de Verificación e Inventario del Expediente',
      content: doc,
    });
    console.log(`[f6.phase] F6_2a inventario guardado para proyecto ${projectId}`);
  } catch (err) {
    console.warn('[f6.phase] saveDocument F6_2a falló:', err);
  }

  return doc;
}

async function handleF6DeclaracionAssembler(event: PipelineEvent): Promise<string> {
  const { jobId, projectId, services } = event;
  const ctx = (event.body?.context ?? {}) as any;
  const projectName = ctx.projectName ?? ctx._frozen?.nombreOficialCurso ?? 'Proyecto';
  const clientName = ctx.clientName ?? '';
  const folioSugerido = ctx.folioSugerido ?? `EXP-${new Date().getFullYear()}-0001`;
  const estandarNorma = ctx._frozen?.estandar_norma ?? 'el estándar de certificación aplicable';
  const fechaActual = formatDate();

  const juezRaw = (await services.pipelineService.getAgentOutput(jobId, 'juez_declaracion')) ?? '';
  const winner = pickWinner(juezRaw);
  const winnerAgent = winner === 'B' ? 'agente_declaracion_B' : 'agente_declaracion_A';
  const raw = (await services.pipelineService.getAgentOutput(jobId, winnerAgent)) ?? '';

  const parsed = extractJson(raw);
  const resumen = parsed.resumen_declaracion ?? parsed;
  const datos = resumen.datos_curso ?? {};

  let doc = `# RESUMEN EJECUTIVO Y DECLARACIÓN FINAL\n\n`;
  doc += `**Proyecto:** ${projectName}\n`;
  doc += `**Candidato:** ${clientName}\n`;
  doc += `**Folio de expediente:** ${folioSugerido}\n`;
  doc += `**Fecha de cierre:** ${fechaActual}\n\n---\n\n`;

  // 1. Resumen ejecutivo
  doc += `## 1. RESUMEN EJECUTIVO DEL PROCESO\n\n`;
  doc += `| Dato | Valor |\n|:---|:---|\n`;
  doc += `| Nombre del curso desarrollado | ${datos.nombre || projectName} |\n`;
  doc += `| Industria / Sector | ${datos.industria || 'No especificado'} |\n`;
  doc += `| Duración total del curso | ${datos.duracion || 'No especificado'} |\n`;
  doc += `| Modalidad | ${datos.modalidad || 'No especificado'} |\n`;
  doc += `| Plataforma LMS utilizada | ${datos.plataforma || 'No especificado'} |\n`;
  doc += `| Estándar de empaquetamiento | ${datos.scorm || 'No especificado'} |\n`;
  doc += `| Número de módulos | ${datos.modulos || 'No especificado'} |\n`;
  doc += `| Número de videos producidos | ${datos.videos || 'No especificado'} |\n`;
  doc += `| Fecha de inicio del diseño instruccional | ${datos.fecha_inicio || 'No especificado'} |\n`;
  doc += `| Fecha de cierre del expediente | ${fechaActual} |\n\n`;

  if (resumen.logros) {
    doc += `### Logros del proceso\n${resumen.logros}\n\n`;
  }

  if (resumen.observaciones_organismo) {
    doc += `### Observaciones para el organismo certificador\n${resumen.observaciones_organismo}\n\n`;
  }

  doc += `---\n\n`;

  // 2. Declaración final
  doc += `## 2. DECLARACIÓN FINAL\n\n`;
  doc += `El candidato ${clientName} declara bajo protesta de decir verdad que:\n\n`;
  doc += `1. Todos los documentos incluidos en este expediente son auténticos.\n`;
  doc += `2. El curso descrito fue desarrollado íntegramente por el/la suscrito/a.\n`;
  doc += `3. El proceso se realizó conforme al estándar de certificación aplicable (${estandarNorma}).\n`;
  doc += `4. Las evidencias presentadas corresponden al proceso real de desarrollo y despliegue del curso.\n`;
  doc += `5. Los instrumentos de evaluación cumplen con los requisitos del estándar de certificación aplicable.\n\n`;
  doc += `**Nombre del candidato:** ${clientName}\n`;
  doc += `**Firma:** _________________________\n`;
  doc += `**Fecha:** _________________________\n\n`;
  doc += `---\n\n`;
  doc += `> *Este expediente fue generado con apoyo de la plataforma KnowTo como herramienta de diseño instruccional. El contenido, decisiones pedagógicas y evidencias son responsabilidad del candidato.*\n`;

  const { doc: docSanitized2b, blocking: blocking2b } = sanitizeForClosure(doc, 'F6_2b');
  doc = docSanitized2b;
  const chronoWarnings2b = checkChronologicalOrder(doc);
  if (chronoWarnings2b.length > 0) console.warn('[f6.phase] F6_2b advertencias cronológicas:', chronoWarnings2b);
  if (blocking2b.length > 0) {
    console.error('[f6.phase] F6_2b bloqueado por placeholders:', blocking2b);
    throw new Error(`F6_2b contiene placeholders no resueltos: ${blocking2b.join('; ')}`);
  }

  try {
    await services.supabase.saveDocument({
      projectId,
      stepId: event.body?.stepId ?? '',
      phaseId: 'F6_2b',
      title: 'Resumen Ejecutivo y Declaración Final',
      content: doc,
    });
    console.log(`[f6.phase] F6_2b declaración guardada para proyecto ${projectId}`);
  } catch (err) {
    console.warn('[f6.phase] saveDocument F6_2b falló:', err);
  }

  return doc;
}
