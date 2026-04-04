// Declara los módulos de texto importados por wrangler (regla [[rules]] type="Text")
declare module '*.md' {
  const content: string;
  export default content;
}
