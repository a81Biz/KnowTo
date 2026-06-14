// frontend/cce/src/components/form-renderer.ts
// Renderiza un DynamicFormSchema (generado por IA) en HTML dentro de un contenedor.
// Soporta secciones con campos: text, textarea, select, number, date.

import type { DynamicFormSchema, DynamicFormField } from '../types/wizard.types';

function renderField(field: DynamicFormField): string {
  const base = 'input-field w-full';
  const required = field.required ? 'required' : '';
  const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';

  let input: string;
  switch (field.type) {
    case 'textarea':
      input = `<textarea name="${field.id}" rows="3" ${required} ${placeholder} class="${base}"></textarea>`;
      break;
    case 'select':
      if (!field.options?.length) {
        input = `<input type="text" name="${field.id}" ${required} ${placeholder} class="${base}" />`;
      } else {
        const options = field.options.map((o) =>
          `<option value="${o.value}">${o.label}</option>`
        ).join('');
        input = `<select name="${field.id}" ${required} class="${base}"><option value="">Selecciona...</option>${options}</select>`;
      }
      break;
    case 'number':
      input = `<input type="number" name="${field.id}" ${required} ${placeholder} class="${base}" />`;
      break;
    case 'date':
      input = `<input type="date" name="${field.id}" ${required} class="${base}" />`;
      break;
    default:
      input = `<input type="text" name="${field.id}" ${required} ${placeholder} class="${base}" />`;
  }

  const hint = field.hint
    ? `<p class="text-xs text-gray-400 mt-1">${field.hint}</p>`
    : '';

  return `
    <div class="space-y-1">
      <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest">
        ${field.label}${field.required ? ' *' : ''}
      </label>
      ${input}
      ${hint}
    </div>
  `;
}

export function renderFormSchema(schema: DynamicFormSchema, container: HTMLElement): void {
  const sectionsHtml = schema.sections.map((section) => `
    <div class="dynamic-form-section">
      <h3>${section.title}</h3>
      <div class="space-y-4">
        ${section.fields.map(renderField).join('')}
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="space-y-4">
      <div class="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h4 class="font-semibold text-blue-900">${schema.formTitle}</h4>
        <p class="text-sm text-blue-700 mt-1">${schema.description}</p>
      </div>
      ${sectionsHtml}
    </div>
  `;
}

export function collectFormAnswers(container: HTMLElement): Record<string, string> {
  const answers: Record<string, string> = {};
  const inputs = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select'
  );
  inputs.forEach((el) => {
    if (el.name) answers[el.name] = el.value;
  });
  return answers;
}

export function restoreFormAnswers(container: HTMLElement, answers: Record<string, string>): void {
  for (const [name, value] of Object.entries(answers)) {
    const el = container.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[name="${name}"]`
    );
    if (el) el.value = value;
  }
}
