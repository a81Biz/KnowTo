import type { P7Artifact, TerminoGlosario, ModalidadCanonica, ISO639LanguageCode } from '../../types/certification.types';

/**
 * Constructs a P7Artifact from serialized ParteInformacion JSON (JSON.stringify(partes)).
 * Deduplication operates on typed terminos[], not on Markdown text.
 * Falls back to empty collections on any parse error.
 */
export function parseP7Output(
  texto: string,
  nombreModulo: string,
  modalidad: ModalidadCanonica,
  idioma: ISO639LanguageCode,
): P7Artifact {
  let terminos: TerminoGlosario[] = [];

  try {
    const objMatch = texto.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const obj = JSON.parse(objMatch[0]);
      const tecnico = obj['tecnico'];

      if (Array.isArray(tecnico?.conceptos)) {
        for (const c of tecnico.conceptos) {
          const termino = String(c?.termino ?? c?.concepto ?? '').trim();
          const definicion = String(c?.definicion ?? c?.descripcion ?? '').trim();
          if (termino && definicion) terminos.push({ termino, definicion });
        }
      }

      // Also accept direct array of concepts if the structure is flat
      if (terminos.length === 0 && Array.isArray(obj['conceptos'])) {
        for (const c of obj['conceptos']) {
          const termino = String(c?.termino ?? c?.concepto ?? '').trim();
          const definicion = String(c?.definicion ?? c?.descripcion ?? '').trim();
          if (termino && definicion) terminos.push({ termino, definicion });
        }
      }
    }
  } catch {}

  // Typed-level deduplication: keep first occurrence of each termino (case-insensitive)
  const seen = new Set<string>();
  terminos = terminos.filter((t) => {
    const key = t.termino.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    productCode: 'P7',
    modalidad,
    idioma,
    modulo: nombreModulo,
    terminos,
  };
}

/** Renders a P7Artifact to canonical Markdown table (simplified form for artifact_versions). */
export function renderP7(artifact: P7Artifact): string {
  let md = `## ${artifact.modulo}\n\n`;
  if (artifact.terminos.length === 0) return md;
  md += `| Término | Definición |\n|---|---|\n`;
  for (const t of artifact.terminos) {
    const termEsc = t.termino.replace(/\|/g, '\\|');
    const defEsc = t.definicion.replace(/\|/g, '\\|');
    md += `| ${termEsc} | ${defEsc} |\n`;
  }
  return md + '\n';
}
