import { extractTableByColumns, extractSectionByKeywords } from '../../core/parsers/table.parser';

export interface AnalisisF2Parsed {
  modalidad: Record<string, string>;
  interactividad: Array<{ elemento: string; incluido: string; frecuencia: string }>;
  estructura_tematica: Array<{ modulo: string; nombre: string; objetivo: string; horas: string }>;
  perfil_ingreso: Array<{ categoria: string; requisito: string; fuente: string }>;
  estrategias: Array<{ estrategia: string; descripcion: string; modulo: string; bloom: string }>;
  supuestos_restricciones: { supuestos: string[]; restricciones: string[] };
  perfil_ajustado: Record<string, string> | null;
}

export function parseAnalisisF2(markdown: string) {
  // 1. Extraer modalidad (tabla con columnas: Parámetro, Decisión, Justificación)
  const modalidadTable = extractTableByColumns(markdown, ['Parámetro', 'Decisión', 'Justificación']);
  const modalidad: Record<string, string> = {};
  if (modalidadTable) {
    for (const row of modalidadTable.rows) {
      if (row[0] && row[1]) modalidad[row[0].toLowerCase()] = row[1];
    }
  }
  
  // 2. Extraer SCORM (tabla con columnas: Elemento interactivo, Incluido, Frecuencia)
  const scormTable = extractTableByColumns(markdown, ['Elemento interactivo', 'Incluido', 'Frecuencia'], 5);
  const interactividad = scormTable?.rows.map(row => ({
    elemento: row[0],
    incluido: row[1],
    frecuencia: row[2]
  })) ?? [];
  
  // 3. Extraer estructura temática (tabla con columnas: Módulo, Nombre, Objetivo, Duración)
  const estructuraTable = extractTableByColumns(markdown, ['Módulo', 'Nombre', 'Objetivo', 'Duración'], 3);
  const estructura_tematica = estructuraTable?.rows.map(row => ({
    modulo: row[0],
    nombre: row[1],
    objetivo: row[2],
    horas: row[3]
  })) ?? [];
  
  // 4. Extraer perfil de ingreso (tabla con columnas: Categoría, Requisito, Fuente)
  const perfilTable = extractTableByColumns(markdown, ['Categoría', 'Requisito', 'Fuente'], 5);
  const perfil_ingreso = perfilTable?.rows.map(row => ({
    categoria: row[0],
    requisito: row[1],
    fuente: row[2]
  })) ?? [];
  
  // 5. Extraer estrategias (tabla con columnas: Estrategia, Descripción, Módulo, Bloom)
  const estrategiasTable = extractTableByColumns(markdown, ['Estrategia', 'Descripción', 'Módulo', 'Bloom'], 3);
  const estrategias = estrategiasTable?.rows.map(row => ({
    estrategia: row[0],
    descripcion: row[1],
    modulo: row[2],
    bloom: row[3]
  })) ?? [];
  
  // 6. Extraer supuestos y restricciones (por palabras clave)
  const supuestosText = extractSectionByKeywords(markdown, ['supuestos'], ['restricciones', '##']);
  const restriccionesText = extractSectionByKeywords(markdown, ['restricciones'], ['##']);
  
  return {
    modalidad,
    interactividad,
    estructura_tematica,
    perfil_ingreso,
    estrategias,
    supuestos_restricciones: {
      supuestos: supuestosText.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '')),
      restricciones: restriccionesText.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, ''))
    },
    perfil_ajustado: {} 
  } as AnalisisF2Parsed;
}
