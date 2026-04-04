// src/shared/ui.ts
// Funciones de UI compartidas (modales, loading, notificaciones)

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
  btnCancel.textContent = options.cancelText ?? 'Cancelar';

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
  showModal({ title: '⚠️ Error', message, confirmText: 'Cerrar', onConfirm: () => {} });
}

export function showSuccess(message: string, onClose?: () => void): void {
  showModal({
    title: '✅ Éxito',
    message,
    confirmText: 'Continuar',
    cancelText: '',
    onConfirm: onClose,
  });
}

export function renderMarkdown(raw: string): string {
  // Renderizado básico de Markdown a HTML (sin dependencias externas)
  return raw
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim()).map(c => c.trim());
      return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
    })
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[huplt])/gm, '<p>')
    .replace(/(?<![>])$/gm, '</p>');
}
