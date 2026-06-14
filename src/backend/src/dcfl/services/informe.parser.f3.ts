import { extractTableByColumns, extractSectionByKeywords } from '../../core/parsers/table.parser';

export function parseEspecificacionesF3(markdown: string) {
  // 1. Plataforma/Navegador
  const plataformaText = extractSectionByKeywords(markdown, ['plataforma', 'navegador'], ['##', 'REPORTEO']);
  
  // 2. Reporteo (tabla con columnas: Métrica, Formato, Frecuencia)
  const reporteoTable = extractTableByColumns(markdown, ['Métrica', 'Formato', 'Frecuencia'], 3);
  const reporteo = reporteoTable?.rows.map(row => ({
    metrica: row[0],
    formato: row[1],
    frecuencia: row[2]
  })) ?? [];
  
  // 3. Formatos multimedia (tabla con columnas: Tipo de media, Cantidad, Especificación)
  const multimediaTable = extractTableByColumns(markdown, ['Tipo de media', 'Cantidad', 'Especificación'], 3);
  const formatos_multimedia = multimediaTable?.rows.map(row => ({
    tipo: row[0],
    cantidad: row[1],
    especificacion: row[2]
  })) ?? [];
  
  // 4. Navegación/Identidad
  const navegacionText = extractSectionByKeywords(markdown, ['navegacion', 'identidad'], ['##', 'CRITERIOS']);
  
  // 5. Criterios de aceptación (secciones o lista)
  const criteriosText = extractSectionByKeywords(markdown, ['criterios', 'aceptacion'], ['##']);
  
  // 6. Cálculo duración (tabla de F3)
  const duracionTable = extractTableByColumns(markdown, ['Componente', 'Cantidad', 'Tiempo unitario', 'Total'], 4);
  let calculo_duracion = {};
  if (duracionTable) {
    calculo_duracion = {
      detalles: duracionTable.rows.map(row => ({
        componente: row[0],
        cantidad: row[1],
        tiempo: row[2],
        total: row[3]
      }))
    };
  }

  return {
    plataforma_navegador: plataformaText,
    reporteo,
    formatos_multimedia,
    navegacion_identidad: navegacionText,
    criterios_aceptacion: criteriosText,
    calculo_duracion
  };
}
