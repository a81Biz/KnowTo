// frontend/dcfl/src/shared/logger.ts
// Logger condicional: verbose en desarrollo, solo errores en producción.

const _isDev =
  (import.meta.env.DEV as boolean) ||
  (import.meta.env['VITE_ENVIRONMENT'] as string) === 'development';

export const logger = {
  debug: (...args: unknown[]): void => { if (_isDev) console.debug('[DEBUG]', ...args); },
  info:  (...args: unknown[]): void => { if (_isDev) console.log('[INFO]',  ...args); },
  warn:  (...args: unknown[]): void => { if (_isDev) console.warn('[WARN]',  ...args); },
  // Errores siempre se loguean (dev y prod)
  error: (...args: unknown[]): void => { console.error('[ERROR]', ...args); },
  time:    (label: string): void => { if (_isDev) console.time(`[TIME] ${label}`); },
  timeEnd: (label: string): void => { if (_isDev) console.timeEnd(`[TIME] ${label}`); },
};
