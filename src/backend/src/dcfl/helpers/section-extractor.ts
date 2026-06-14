/**
 * Genera el encabezado del documento F2
 */
export function getF2Header(projectName: string): string {
  return `# ESPECIFICACIONES DE ANÁLISIS Y DISEÑO\n` +
    `**Proyecto:** ${projectName}\n` +
    `**Fase:** Especificaciones de Análisis y Diseño\n` +
    `**Fecha:** ${new Date().toLocaleDateString('es-MX')}\n` +
    `**Basado en:** Marco de Referencia F0 + Informe de Necesidades F1`;
}

/**
 * Extrae una sección específica de un documento Markdown de F2
 */
export function extractF2Section(markdown: string, sectionTitle: string): string {
  const lines = markdown.split('\n');
  let inSection = false;
  const sectionContent: string[] = [];
  
  const target = sectionTitle.toLowerCase().trim();
  
  for (const line of lines) {
    const cleanLine = line.replace(/^#+\s*/, '').toLowerCase().trim();
    
    if (cleanLine === target || (cleanLine.includes(target) && line.startsWith('##'))) {
      inSection = true;
      continue;
    }
    
    if (inSection) {
      if (line.startsWith('## ') && !cleanLine.includes(target)) {
        break;
      }
      sectionContent.push(line);
    }
  }
  
  return sectionContent.join('\n').trim();
}
