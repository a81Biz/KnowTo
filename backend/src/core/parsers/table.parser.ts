/**
 * Extrae una tabla del Markdown buscando por columnas esperadas,
 * no por título de sección.
 */
export function extractTableByColumns(
  markdown: string,
  expectedColumns: string[],
  minRows: number = 1
): { headers: string[]; rows: string[][] } | null {
  // Normalizar texto: eliminar acentos, convertir a minúsculas
  const normalize = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  
  const normalizedExpected = expectedColumns.map(normalize);
  
  // Buscar todas las tablas en el Markdown
  const tableRegex = /\|(?:[^\n]*\|)\n\|[\s\-:|]+\|\n((?:\|(?:[^\n]*\|)\n?)+)/g;
  let match;
  
  while ((match = tableRegex.exec(markdown)) !== null) {
    const tableText = match[0];
    const lines = tableText.split('\n').filter(l => l.trim().startsWith('|'));
    if (lines.length < 2) continue;
    
    // Extraer encabezados
    const headers = lines[0].split('|').filter(cell => cell.trim().length > 0).map(cell => normalize(cell));
    
    // Verificar coincidencia (al menos 70% de las columnas esperadas)
    const matchedColumns = normalizedExpected.filter(col => headers.some(h => h.includes(col) || col.includes(h)));
    if (matchedColumns.length / normalizedExpected.length >= 0.7) {
      const rows = lines.slice(2).map(line =>
        line.split('|').filter(cell => {
          // Keep internal structure but trim. 
          // Note: splitting by | can be tricky if table content has | (escaped), 
          // but for these AI generated tables it's usually fine.
          return true;
        }).map(cell => cell.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1)
      ).filter(row => row.length >= expectedColumns.length);
      
      if (rows.length >= minRows) {
        return { headers, rows };
      }
    }
  }
  
  return null;
}

/**
 * Extrae una sección completa del Markdown buscando por palabras clave,
 * no por título exacto.
 */
export function extractSectionByKeywords(
  markdown: string,
  keywords: string[],
  stopKeywords: string[] = []
): string {
  const lines = markdown.split('\n');
  let inSection = false;
  const content: string[] = [];
  
  const normalize = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
  for (const line of lines) {
    const normalizedLine = normalize(line);
    
    // Iniciar sección si encuentra palabra clave (como encabezado o contenido relevante)
    if (!inSection && keywords.some(k => normalizedLine.includes(normalize(k)))) {
      inSection = true;
      continue;
    }
    
    // Terminar sección si encuentra palabra de parada
    if (inSection && stopKeywords.some(k => normalizedLine.includes(normalize(k)) && line.startsWith('#'))) {
      break;
    }
    
    if (inSection) {
      content.push(line);
    }
  }
  
  return content.join('\n').trim();
}
