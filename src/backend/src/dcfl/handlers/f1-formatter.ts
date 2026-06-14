/**
 * Utilidades de formato para la Fase 1 (Informe de Necesidades).
 */

/**
 * sanitiza valores de IA con fallbacks robustos.
 */
export const getValue = (obj: any, key: string, fallback = '—'): string => {
  if (!obj) return fallback;
  const val = obj[key];
  const invalidValues = ['Hallazgo con fuente', 'Tavily', '', null, undefined, 'N/A', '—', 'No especificado', 'No especificada'];
  
  if (val && !invalidValues.includes(val) && typeof val === 'string' && val.trim().length > 0) {
    return val.trim();
  }
  
  if (val !== undefined && val !== null && typeof val !== 'string') {
    return String(val);
  }
  
  return fallback;
};

/**
 * Genera tablas Markdown con sanitización de celdas.
 */
export const formatTable = (headers: string[], rows: any[][]): string => {
  if (!rows || rows.length === 0) return '| — | — | — | — |';
  
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
  
  const dataRows = rows.map(row => {
    const sanitizedCells = row.map(cell => {
      const invalidValues = ['Hallazgo con fuente', 'Tavily', '', null, undefined, 'N/A', '—'];
      if (cell && !invalidValues.includes(cell) && typeof cell === 'string' && cell.trim().length > 0) {
        return cell.trim();
      }
      return '—';
    });
    return `| ${sanitizedCells.join(' | ')} |`;
  });
  
  return [headerRow, separatorRow, ...dataRows].join('\n');
};

/**
 * Genera listas numeradas o con viñetas con sanitización.
 */
export const formatList = (items: string[], numbered = true): string => {
  const sanitizedItems = (items || []).filter(item => {
    const invalidValues = ['Hallazgo con fuente', 'Tavily', '', null, undefined, 'N/A', '—'];
    return item && !invalidValues.includes(item) && typeof item === 'string' && item.trim().length > 0;
  });

  if (sanitizedItems.length === 0) return '—';

  return sanitizedItems
    .map((item, i) => `${numbered ? `${i + 1}.` : '-'} ${item.trim()}`)
    .join('\n');
};
