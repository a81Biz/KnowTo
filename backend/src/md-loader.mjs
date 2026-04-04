// src/md-loader.mjs
// Node.js ESM loader — trata los archivos .md como string exports.
// Equivalente al mdAsStringPlugin de vitest.config.ts y a la regla
// [[rules]] type="Text" de wrangler.toml.
// Usado por tsx en desarrollo: tsx --loader ./src/md-loader.mjs ...

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

export function load(url, context, nextLoad) {
  if (url.endsWith('.md')) {
    const path = fileURLToPath(url);
    const content = readFileSync(path, 'utf-8');
    return {
      format: 'module',
      source: `export default ${JSON.stringify(content)};`,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
