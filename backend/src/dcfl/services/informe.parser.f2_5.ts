import { extractTableByColumns } from '../../core/parsers/table.parser';

export function parseRecomendacionesF2_5(markdown: string) {
  // 1. Actividades (columnas: #, Tipo, Propósito, Frecuencia, Justificación)
  const actividadesTable = extractTableByColumns(markdown, ['Tipo', 'Propósito', 'Frecuencia'], 3);
  const actividades = actividadesTable?.rows.map(row => ({
    tipo: row[1] ? String(row[1]) : '',
    proposito: row[2] ? String(row[2]) : '',
    frecuencia: row[3] ? String(row[3]) : '',
    justificacion: row[4] ? String(row[4]) : ''
  })) ?? [];

  // 2. Métricas (columnas: Métrica, Descripción, Importancia, Frecuencia)
  const metricasTable = extractTableByColumns(markdown, ['Métrica', 'Descripción', 'Frecuencia'], 3);
  const metricas = metricasTable?.rows.map(row => ({
    metrica: row[0] ? String(row[0]) : '',
    descripcion: row[1] ? String(row[1]) : '',
    importancia: row[2] ? String(row[2]) : '',
    frecuencia: row[3] ? String(row[3]) : ''
  })) ?? [];

  // 3. Estructura de videos (tabla típica de F2.5)
  const videosTable = extractTableByColumns(markdown, ['Tipo de video', 'Cantidad', 'Duración'], 3);
  let total_videos = 0;
  let duracion_promedio_minutos = 0;
  
  if (videosTable) {
    const totalRow = videosTable.rows.find(r => r[0] && String(r[0]).toLowerCase().includes('total'));
    if (totalRow) {
      total_videos = parseInt(String(totalRow[1])) || 0;
      // Extraer promedio si existe o calcular (aquí simplificamos ya que F3 prefiere el valor numérico)
    }
  }

  return {
    actividades,
    metricas,
    total_videos,
    duracion_promedio_minutos
  };
}
