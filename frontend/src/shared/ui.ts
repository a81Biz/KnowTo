// src/shared/ui.ts
// Funciones de UI compartidas (modales, loading, notificaciones, markdown, PDF)

export function showLoading(message = 'Generando documento con IA...'): void {
  const overlay = document.getElementById('loading-overlay');
  const msg = document.getElementById('loading-message');
  if (overlay) overlay.classList.remove('hidden');
  if (msg) msg.textContent = message;
}

export function hideLoading(): void {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.add('hidden');
}

export function showModal(options: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}): void {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const message = document.getElementById('modal-message');
  const btnConfirm = document.getElementById('modal-confirm');
  const btnCancel = document.getElementById('modal-cancel');

  if (!overlay || !title || !message || !btnConfirm || !btnCancel) return;

  title.textContent = options.title;
  message.textContent = options.message;
  btnConfirm.textContent = options.confirmText ?? 'Confirmar';

  // Ocultar el botón cancelar cuando no se proporciona texto (modales de alerta/aviso)
  const showCancel = !!options.cancelText;
  btnCancel.textContent = options.cancelText ?? '';
  btnCancel.classList.toggle('hidden', !showCancel);

  overlay.classList.remove('hidden');

  const confirmHandler = () => {
    overlay.classList.add('hidden');
    options.onConfirm?.();
    btnConfirm.removeEventListener('click', confirmHandler);
    btnCancel.removeEventListener('click', cancelHandler);
  };

  const cancelHandler = () => {
    overlay.classList.add('hidden');
    options.onCancel?.();
    btnConfirm.removeEventListener('click', confirmHandler);
    btnCancel.removeEventListener('click', cancelHandler);
  };

  btnConfirm.addEventListener('click', confirmHandler);
  btnCancel.addEventListener('click', cancelHandler);
}

export function hideModal(): void {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
}

export function showError(message: string): void {
  showModal({ title: '⚠️ Error', message, confirmText: 'Aceptar', onConfirm: () => {} });
}

export function showSuccess(message: string, onClose?: () => void): void {
  showModal({
    title: '✅ Éxito',
    message,
    confirmText: 'Aceptar',
    onConfirm: onClose,
  });
}

// ── Markdown → HTML ──────────────────────────────────────────────────────────

/** Escapa caracteres HTML en texto plano. */
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Aplica formato inline: negrita, cursiva, código. */
function inlineFormat(s: string): string {
  return escHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

/** Convierte un bloque de líneas que forman una tabla markdown en HTML. */
function renderTable(lines: string[]): string {
  const parseRow = (line: string): string[] =>
    line.split('|').slice(1, -1).map((c) => c.trim());

  const isSeparator = (line: string): boolean =>
    /^\|[\s|:=-]+\|$/.test(line.trim());

  /** Normaliza una fila al número de columnas esperado, rellenando o truncando. */
  const normalizeRow = (cells: string[], colCount: number): string[] => {
    if (cells.length === colCount) return cells;
    if (cells.length < colCount) return [...cells, ...Array(colCount - cells.length).fill('')];
    return cells.slice(0, colCount);
  };

  const sepIdx = lines.findIndex((l) => isSeparator(l));

  if (sepIdx < 1) {
    // Sin separador → detectar ancho máximo y normalizar todo como cuerpo
    const allCells = lines.map(parseRow);
    const colCount = Math.max(...allCells.map((r) => r.length), 1);
    const rows = allCells.map((cells) => {
      const norm = normalizeRow(cells, colCount);
      return `<tr>${norm.map((c) => `<td>${inlineFormat(c)}</td>`).join('')}</tr>`;
    });
    return `<table><tbody>${rows.join('')}</tbody></table>`;
  }

  // Columnas definidas por la fila de encabezado
  const headerCells = parseRow(lines[0] ?? '');
  const colCount = headerCells.length;

  // Filas de encabezado (antes del separador)
  const headerRows = lines.slice(0, sepIdx).map((l) => {
    const norm = normalizeRow(parseRow(l), colCount);
    return `<tr>${norm.map((c) => `<th>${inlineFormat(c)}</th>`).join('')}</tr>`;
  });

  // Filas de cuerpo (después del separador) — normalizar columnas
  const bodyRows = lines.slice(sepIdx + 1).map((l) => {
    const norm = normalizeRow(parseRow(l), colCount);
    return `<tr>${norm.map((c) => `<td>${inlineFormat(c)}</td>`).join('')}</tr>`;
  });

  return `<table><thead>${headerRows.join('')}</thead><tbody>${bodyRows.join('')}</tbody></table>`;
}

/**
 * Convierte texto Markdown a HTML.
 * Soporta: encabezados, tablas (con thead/tbody), listas, párrafos, negrita, cursiva, código.
 */
export function renderMarkdown(raw: string): string {
  const lines = raw.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    // Línea en blanco
    if (line.trim() === '') { i++; continue; }

    // Encabezados (evaluar del más específico al menos)
    const h4 = line.match(/^####\s+(.+)$/);
    if (h4) { out.push(`<h4>${inlineFormat(h4[1]!)}</h4>`); i++; continue; }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) { out.push(`<h3>${inlineFormat(h3[1]!)}</h3>`); i++; continue; }
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) { out.push(`<h2>${inlineFormat(h2[1]!)}</h2>`); i++; continue; }
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) { out.push(`<h1>${inlineFormat(h1[1]!)}</h1>`); i++; continue; }

    // Separador horizontal
    if (/^[-*_]{3,}$/.test(line.trim())) { out.push('<hr />'); i++; continue; }

    // Bloque de tabla: líneas que comienzan con |
    if (line.trimStart().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && (lines[i]?.trimStart().startsWith('|') ?? false)) {
        tableLines.push(lines[i] ?? '');
        i++;
      }
      out.push(renderTable(tableLines));
      continue;
    }

    // Lista no ordenada
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^[-*]\s+/, ''));
        i++;
      }
      out.push(
        `<ul>${items.map((it) => `<li>${inlineFormat(it)}</li>`).join('')}</ul>`,
      );
      continue;
    }

    // Lista ordenada
    if (/^\d+[.)]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\d+[.)]\s+/, ''));
        i++;
      }
      out.push(
        `<ol>${items.map((it) => `<li>${inlineFormat(it)}</li>`).join('')}</ol>`,
      );
      continue;
    }

    // Párrafo
    out.push(`<p>${inlineFormat(line)}</p>`);
    i++;
  }

  return out.join('\n');
}

// ── Impresión / PDF ──────────────────────────────────────────────────────────

const PRINT_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    color: #111;
    padding: 0;
    margin: 0;
    line-height: 1.5;
  }
  h1 { font-size: 16pt; border-bottom: 2px solid #333; padding-bottom: 4pt; margin: 0 0 12pt; }
  h2 { font-size: 13pt; margin: 16pt 0 6pt; color: #222; }
  h3 { font-size: 11pt; margin: 12pt 0 4pt; color: #444; }
  h4 { font-size: 10pt; margin: 8pt 0 3pt; color: #555; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 9pt; page-break-inside: avoid; }
  th { background: #f0f0f0; border: 1px solid #888; padding: 4pt 7pt; text-align: left; font-weight: bold; }
  td { border: 1px solid #bbb; padding: 4pt 7pt; vertical-align: top; }
  ul, ol { padding-left: 18pt; margin: 6pt 0; }
  li { margin: 2pt 0; }
  p { margin: 5pt 0; }
  strong { font-weight: bold; }
  em { font-style: italic; }
  code { font-family: 'Courier New', monospace; background: #f5f5f5; padding: 1pt 3pt; font-size: 9pt; }
  hr { border: none; border-top: 1px solid #ccc; margin: 10pt 0; }
  @page { margin: 20mm; size: A4 portrait; }
`;

/**
 * Abre una ventana de impresión con el contenido Markdown renderizado.
 * El usuario puede elegir "Guardar como PDF" desde el diálogo de impresión.
 */
export function printDocument(markdown: string, title = 'Documento KnowTo'): void {
  const html = renderMarkdown(markdown);
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    showError('El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio e intenta de nuevo.');
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body class="document-preview">
${html}
</body>
</html>`);
  printWindow.document.close();
  // Esperar a que el CSS cargue antes de imprimir
  printWindow.addEventListener('load', () => {
    printWindow.focus();
    printWindow.print();
  });
  // Fallback si load ya fue
  setTimeout(() => {
    if (!printWindow.closed) {
      printWindow.focus();
      printWindow.print();
    }
  }, 500);
}
