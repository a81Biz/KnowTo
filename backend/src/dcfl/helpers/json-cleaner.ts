/**
 * Limpia respuestas JSON mal formadas de la IA
 * Maneja: texto antes del JSON, comillas faltantes, arrays/objetos incompletos,
 * múltiples objetos separados, y trailing commas.
 */
export function cleanJsonResponse(raw: string): string {
  if (!raw) return '{}';
  
  // 1. Si hay texto antes del JSON, extraer la parte que parece JSON
  const firstBrace = raw.indexOf('{');
  const firstBracket = raw.indexOf('[');
  let start = firstBrace !== -1 && firstBracket !== -1 
    ? Math.min(firstBrace, firstBracket) 
    : (firstBrace !== -1 ? firstBrace : firstBracket);
  
  if (start === -1) return '{}';
  
  let cleaned = raw.substring(start);
  
  // 2. Eliminar BOM y caracteres invisibles al inicio
  cleaned = cleaned.replace(/^\uFEFF/, '');
  
  // 3. Corregir comillas faltantes en propiedades (caso común: ["key": "value"])
  // Convertir ["key": "value"] a {"key": "value"}
  cleaned = cleaned.replace(/\[\s*"([^"]+)"\s*:/g, '{"$1":');
  cleaned = cleaned.replace(/,\s*"([^"]+)"\s*:/g, ',"$1":');
  
  // 4. Corregir objetos con corchetes en lugar de llaves: [{"key":"value"}] ya está bien
  // Detectar casos donde hay un array de objetos pero las propiedades no tienen comillas
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  
  // 5. Cerrar arrays/objetos incompletos
  if (cleaned.endsWith(',')) {
    const lastBrace = cleaned.lastIndexOf('{');
    const lastBracket = cleaned.lastIndexOf('[');
    if (lastBrace > lastBracket) {
      cleaned = cleaned.slice(0, -1) + '}';
    } else {
      cleaned = cleaned.slice(0, -1) + ']';
    }
  }
  if (cleaned.endsWith('"') && !cleaned.endsWith(']"') && !cleaned.endsWith('"}')) {
    cleaned = cleaned + '}';
  }
  if (cleaned.match(/\d$/) && !cleaned.endsWith(']') && !cleaned.endsWith('}')) {
    cleaned = cleaned + '}';
  }
  
  // 6. Corregir múltiples objetos JSON separados: {}{} → [{},{}]
  const multipleObjectsPattern = /\}\s*\{/g;
  if (multipleObjectsPattern.test(cleaned)) {
    cleaned = '[' + cleaned.replace(/\}\s*\{/g, '},{') + ']';
  }
  
  // 7. Corregir múltiples arrays separados: ][][ → [...] (caso menos común)
  const multipleArraysPattern = /\]\s*\[/g;
  if (multipleArraysPattern.test(cleaned) && !cleaned.startsWith('[')) {
    cleaned = '[' + cleaned.replace(/\]\s*\[/g, '],[') + ']';
  }
  
  // 8. Corregir trailing commas dentro de objetos y arrays
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  
  // 9. Si después de todo esto no es un JSON válido, intentar extraer con regex más agresiva
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        JSON.parse(jsonMatch[0]);
        return jsonMatch[0];
      } catch {
        return cleaned;
      }
    }
    return cleaned;
  }
}

/**
 * Parsea una tabla Markdown a un array de objetos JSON
 */
export function parseMarkdownTableToJson(markdown: string): any[] {
  if (!markdown) return [];
  const lines = markdown.split('\n').filter(l => l.trim().startsWith('|'));
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  if (!firstLine) return [];
  const headers = firstLine
    .split('|')
    .map(h => h.trim().toLowerCase().replace(/[\s_*¿?:]+/g, '_').replace(/[#()]/g, ''))
    .filter(Boolean);

  if (lines.length < 2) return [];
  return lines.slice(2).map(line => {
    const cols = line.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
    const row: Record<string, any> = {};
    headers.forEach((h, i) => { if (h) row[h] = cols[i] ?? ''; });
    return row;
  }).filter(r => Object.values(r).some(v => v.length > 0));
}

/**
 * Elimina etiquetas de debug de outputs de agentes
 */
export function cleanAgentOutput(output: string): string {
  if (!output) return '';
  const lines = output.split('\n');
  return lines
    .filter(line => 
      !line.includes('### RESULTADO DE') && 
      !line.includes('RESULTADO DE') &&
      !line.trim().startsWith('### RESULTADO') &&
      !line.trim().startsWith('---')
    )
    .join('\n')
    .trim();
}

/**
 * Limpia y parsea una respuesta JSON de forma segura
 * @param raw - Respuesta cruda del LLM (puede tener texto antes, después, o estar mal formada)
 * @param fallback - Valor por defecto si falla el parseo
 * @returns Objeto parseado o fallback
 */
export function parseJsonSafely<T = any>(raw: string, fallback: T): T {
  if (!raw || typeof raw !== 'string') {
    // Si ya es un objeto (por ejemplo, devuelto por un tool call ya procesado), devolverlo
    if (raw && typeof raw === 'object') return raw as any;
    console.warn('[parseJsonSafely] raw vacío o no es string, usando fallback');
    return fallback;
  }
  
  try {
    const cleaned = cleanJsonResponse(raw);
    const parsed = JSON.parse(cleaned) as T;
    return parsed;
  } catch (error) {
    console.error(`[parseJsonSafely] Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[parseJsonSafely] Raw preview: ${raw.substring(0, 200)}`);
    return fallback;
  }
}
