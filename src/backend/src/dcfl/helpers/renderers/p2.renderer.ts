import type { P2Artifact, Slide, ModalidadCanonica, ISO639LanguageCode } from '../../types/certification.types';

/**
 * Constructs a P2Artifact from raw agent output text.
 * Expects JSON with `presentacion_completa: PresentacionItem[]` structure.
 * Falls back to empty slides on any parse error.
 */
export function parseP2Output(
  texto: string,
  nombreModulo: string,
  modalidad: ModalidadCanonica,
  idioma: ISO639LanguageCode,
): P2Artifact {
  let slides: Slide[] = [];
  try {
    const objMatch = texto.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const obj = JSON.parse(objMatch[0]);
      const raw = obj['presentacion_completa'];
      if (Array.isArray(raw)) {
        slides = raw.map((item: any, idx: number) => ({
          numero: typeof item.numero === 'number' ? item.numero : idx + 1,
          titulo: String(item.slide?.titulo ?? item.titulo ?? `Diapositiva ${idx + 1}`),
          contenido: String(item.slide?.contenido ?? item.contenido ?? ''),
          notas: item.nota_facilitador?.diga || undefined,
        }));
      }
    }
  } catch {}

  return {
    productCode: 'P2',
    modalidad,
    idioma,
    modulo: nombreModulo,
    slides,
  };
}

/** Renders a P2Artifact to canonical Markdown (simplified form for artifact_versions). */
export function renderP2(artifact: P2Artifact): string {
  let md = `## ${artifact.modulo}\n\n`;
  for (const slide of artifact.slides) {
    md += `### Diapositiva ${slide.numero}: ${slide.titulo}\n\n`;
    md += `${slide.contenido}\n\n`;
    if (slide.notas) md += `*Nota del facilitador:* ${slide.notas}\n\n`;
    md += '---\n\n';
  }
  return md;
}
