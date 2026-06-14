import type { P5Artifact, Actividad, CriterioObservable, ModalidadCanonica, ISO639LanguageCode } from '../../types/certification.types';

function parseDuracionMinutos(duracion: string): number {
  if (!duracion) return 60;
  const minMatch = duracion.match(/(\d+(?:\.\d+)?)\s*min/i);
  if (minMatch) return Math.round(parseFloat(minMatch[1]));
  const horaMatch = duracion.match(/(\d+(?:\.\d+)?)\s*h(?:ora[s]?)?/i);
  if (horaMatch) return Math.round(parseFloat(horaMatch[1]) * 60);
  const numOnly = duracion.match(/^(\d+)$/);
  return numOnly ? parseInt(numOnly[1]) : 60;
}

/**
 * Constructs a P5Artifact from serialized ParteActividad JSON (JSON.stringify(partes)).
 * Falls back to empty collections on any parse error.
 */
export function parseP5Output(
  texto: string,
  nombreModulo: string,
  modalidad: ModalidadCanonica,
  idioma: ISO639LanguageCode,
): P5Artifact {
  let actividades: Actividad[] = [];
  let criterios: CriterioObservable[] = [];

  try {
    const objMatch = texto.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const obj = JSON.parse(objMatch[0]);
      const ficha = obj['ficha'];
      const logistica = obj['logistica'];
      const proc = obj['procedimiento'];
      const evaluacion = obj['evaluacion'];

      // Build one Actividad entry for this module
      const recursos: string[] = [];
      if (Array.isArray(logistica?.materiales)) recursos.push(...logistica.materiales.filter(Boolean));
      if (Array.isArray(logistica?.herramientas)) recursos.push(...logistica.herramientas.filter(Boolean));

      const pasos: string[] = Array.isArray(proc?.ejecucion) ? proc.ejecucion.filter(Boolean) : [];

      actividades = [{
        nombre: nombreModulo,
        descripcion: String(ficha?.objetivo ?? pasos[0] ?? ''),
        duracion_minutos: parseDuracionMinutos(String(ficha?.duracion ?? '')),
        verbo_bloom: String(ficha?.objetivo ?? '').split(/\s+/)[0] || 'aplicar',
        recursos: recursos.slice(0, 10),
      }];

      // Build CriterioObservable[] from rubrica
      if (Array.isArray(evaluacion?.rubrica)) {
        criterios = evaluacion.rubrica
          .filter((r: any) => r?.criterio)
          .map((r: any) => ({
            descripcion: String(r.criterio),
            verbo: String(r.criterio).split(/\s+/)[0] || 'verificar',
          }));
      }
    }
  } catch {}

  return {
    productCode: 'P5',
    modalidad,
    idioma,
    modulo: nombreModulo,
    actividades,
    criterios,
  };
}

/** Renders a P5Artifact to canonical Markdown (simplified form for artifact_versions). */
export function renderP5(artifact: P5Artifact): string {
  let md = `## ${artifact.modulo}\n\n`;
  for (const act of artifact.actividades) {
    md += `### ${act.nombre}\n\n`;
    md += `**Descripción:** ${act.descripcion}\n\n`;
    md += `**Duración:** ${act.duracion_minutos} min\n\n`;
    if (act.recursos.length) md += `**Recursos:** ${act.recursos.join(', ')}\n\n`;
  }
  if (artifact.criterios.length) {
    md += `### Criterios de Evaluación\n\n`;
    for (const c of artifact.criterios) md += `- ${c.descripcion}\n`;
    md += '\n';
  }
  return md;
}
