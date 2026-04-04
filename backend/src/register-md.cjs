// src/register-md.cjs
// Registra el handler de .md para Node.js CJS (require).
// Equivalente al mdAsStringPlugin de vitest y a [[rules]] type="Text" de wrangler.
// Se carga con: node --require ./src/register-md.cjs

const fs = require('fs');

require.extensions['.md'] = function (module, filename) {
  module.exports = fs.readFileSync(filename, 'utf-8');
};
