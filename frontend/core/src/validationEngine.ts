// src/shared/validationEngine.ts
// Motor de validación de formularios (requerido por FRONTEND ARCHITECTURE DOCUMENT)

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  custom?: (value: string) => string | null;
}

export interface ValidationSchema {
  [fieldName: string]: ValidationRule;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateForm(
  form: HTMLFormElement,
  schema: ValidationSchema
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [fieldName, rules] of Object.entries(schema)) {
    const el = form.elements.namedItem(fieldName) as HTMLInputElement | null;
    if (!el) continue;

    const value = el.value.trim();

    if (rules.required && !value) {
      errors[fieldName] = 'Este campo es requerido';
      continue;
    }

    if (value && rules.minLength && value.length < rules.minLength) {
      errors[fieldName] = `Mínimo ${rules.minLength} caracteres`;
      continue;
    }

    if (value && rules.maxLength && value.length > rules.maxLength) {
      errors[fieldName] = `Máximo ${rules.maxLength} caracteres`;
      continue;
    }

    if (value && rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[fieldName] = 'Correo electrónico inválido';
      continue;
    }

    if (value && rules.pattern && !rules.pattern.test(value)) {
      errors[fieldName] = 'Formato inválido';
      continue;
    }

    if (value && rules.custom) {
      const customError = rules.custom(value);
      if (customError) errors[fieldName] = customError;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function displayErrors(
  form: HTMLFormElement,
  errors: Record<string, string>
): void {
  // Limpiar errores anteriores
  form.querySelectorAll('.field-error').forEach((el) => {
    el.textContent = '';
    el.classList.add('hidden');
  });
  form.querySelectorAll('.input-field').forEach((el) => {
    el.classList.remove('border-red-500');
  });

  // Mostrar nuevos errores
  for (const [fieldName, message] of Object.entries(errors)) {
    const input = form.elements.namedItem(fieldName) as HTMLElement | null;
    if (!input) continue;

    input.classList.add('border-red-500');

    // Buscar el elemento de error adyacente
    const errorEl = input.parentElement?.querySelector('.field-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
    }
  }
}

export function clearErrors(form: HTMLFormElement): void {
  displayErrors(form, {});
}
