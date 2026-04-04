import { defineConfig, type Plugin } from 'vitest/config';

// Los archivos .md se importan como texto estático (wrangler [[rules]] type="Text").
// En el entorno de test (Node.js) no existe ese loader, así que lo simulamos aquí.
const mdAsStringPlugin: Plugin = {
  name: 'md-as-string',
  transform(code, id) {
    if (id.endsWith('.md')) {
      return { code: `export default ${JSON.stringify(code)};`, map: null };
    }
  },
};

export default defineConfig({
  plugins: [mdAsStringPlugin],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/types/**'],
    },
  },
});
