// src/shared/template.loader.ts
// Carga templates HTML desde /templates/ con caché en memoria

class TemplateLoaderClass {
  private cache: Map<string, HTMLTemplateElement> = new Map();
  private readonly basePath = '/templates';

  async load(templateId: string): Promise<HTMLTemplateElement> {
    if (this.cache.has(templateId)) {
      return this.cache.get(templateId)!;
    }

    const response = await fetch(`${this.basePath}/${templateId}.html`);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${templateId} (HTTP ${response.status})`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const template = doc.querySelector('template');

    if (!template) {
      throw new Error(`Template "${templateId}" must contain a <template> tag`);
    }

    this.cache.set(templateId, template);
    return template;
  }

  async clone(templateId: string): Promise<DocumentFragment> {
    const tpl = await this.load(templateId);
    return tpl.content.cloneNode(true) as DocumentFragment;
  }

  preload(ids: string[]): Promise<void[]> {
    return Promise.all(ids.map((id) => this.load(id).then(() => undefined)));
  }
}

export const TemplateLoader = new TemplateLoaderClass();
