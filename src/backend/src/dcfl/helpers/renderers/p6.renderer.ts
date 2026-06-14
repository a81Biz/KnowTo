import type { P6Artifact, Sesion, CriterioObservable, ModalidadCanonica, ISO639LanguageCode } from '../../types/certification.types';

/**
 * Constructs a P6Artifact from serialized ParteCalendario JSON (JSON.stringify(partes)).
 * Falls back to empty collections on any parse error.
 */
export function parseP6Output(
  texto: string,
  nombreModulo: string,
  moduloNumero: number,
  modalidad: ModalidadCanonica,
  idioma: ISO639LanguageCode,
): P6Artifact {
  let sesiones: Sesion[] = [];
  let criterios: CriterioObservable[] = [];

  try {
    const objMatch = texto.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const obj = JSON.parse(objMatch[0]);
      const horario = obj['horario'];
      const plan = obj['plan'];
      const entregables = obj['entregables'];

      const teoricoHrs = parseFloat(String(horario?.horas_teoricas ?? 0)) || 0;
      const practicoHrs = parseFloat(String(horario?.horas_practicas ?? 0)) || 0;
      const totalHoras = teoricoHrs + practicoHrs || 1;

      const actividadesText: string[] = [];
      if (Array.isArray(plan?.actividades)) {
        for (const a of plan.actividades) {
          const desc = String(a?.actividad ?? a?.descripcion ?? a ?? '');
          if (desc) actividadesText.push(desc);
        }
      }

      sesiones = [{
        numero: moduloNumero,
        tema: nombreModulo,
        duracion_horas: totalHoras,
        actividades: actividadesText.slice(0, 10),
      }];

      // Build CriterioObservable[] from entregables
      const criterioText = String(entregables?.criterio_aceptacion ?? entregables?.criterio ?? '');
      if (criterioText) {
        criterios = [{
          descripcion: criterioText,
          verbo: criterioText.split(/\s+/)[0] || 'evaluar',
        }];
      }
    }
  } catch {}

  return {
    productCode: 'P6',
    modalidad,
    idioma,
    modulo: nombreModulo,
    sesiones,
    criterios,
  };
}

/** Renders a P6Artifact to canonical Markdown (simplified form for artifact_versions). */
export function renderP6(artifact: P6Artifact): string {
  let md = `## ${artifact.modulo}\n\n`;
  for (const ses of artifact.sesiones) {
    md += `### Sesión ${ses.numero}: ${ses.tema}\n\n`;
    md += `**Duración:** ${ses.duracion_horas} h\n\n`;
    if (ses.actividades.length) {
      md += `**Actividades:**\n`;
      for (const a of ses.actividades) md += `- ${a}\n`;
      md += '\n';
    }
    if (ses.fecha) md += `**Fecha:** ${ses.fecha}\n\n`;
  }
  if (artifact.criterios.length) {
    md += `### Criterios de Aceptación\n\n`;
    for (const c of artifact.criterios) md += `- ${c.descripcion}\n`;
    md += '\n';
  }
  return md;
}
