import type { P8Artifact, EntradaCronograma, ModalidadCanonica, ISO639LanguageCode } from '../../types/certification.types';

/**
 * Constructs a P8Artifact from serialized ParteCronograma JSON (JSON.stringify(partes)).
 * Maps hitos to EntradaCronograma[] for the canonical timeline representation.
 * Falls back to empty collections on any parse error.
 */
export function parseP8Output(
  texto: string,
  nombreModulo: string,
  modalidad: ModalidadCanonica,
  idioma: ISO639LanguageCode,
): P8Artifact {
  let cronograma: EntradaCronograma[] = [];

  try {
    const objMatch = texto.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const obj = JSON.parse(objMatch[0]);
      const hitos: any[] = Array.isArray(obj['hitos']) ? obj['hitos'] : [];

      cronograma = hitos.map((h: any, idx: number) => ({
        semana: typeof h.semana === 'number' ? h.semana : idx + 1,
        modulo: nombreModulo,
        actividad: String(h?.tarea ?? h?.actividad ?? h?.hito ?? ''),
        responsable: String(h?.responsable ?? ''),
        entregable: String(h?.entrega ?? h?.entregable ?? ''),
      })).filter((e) => e.actividad);
    }
  } catch {}

  return {
    productCode: 'P8',
    modalidad,
    idioma,
    modulo: nombreModulo,
    cronograma,
  };
}

/** Renders a P8Artifact to canonical Markdown (simplified form for artifact_versions). */
export function renderP8(artifact: P8Artifact): string {
  let md = `## ${artifact.modulo}\n\n`;
  if (artifact.cronograma.length === 0) return md;
  md += `| Semana | Actividad | Responsable | Entregable |\n|---|---|---|---|\n`;
  for (const e of artifact.cronograma) {
    const actEsc = e.actividad.replace(/\|/g, '\\|');
    const respEsc = e.responsable.replace(/\|/g, '\\|');
    const entEsc = e.entregable.replace(/\|/g, '\\|');
    md += `| ${e.semana} | ${actEsc} | ${respEsc} | ${entEsc} |\n`;
  }
  return md + '\n';
}
