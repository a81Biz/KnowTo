import type { P3Artifact, Escena, ModalidadCanonica, ISO639LanguageCode } from '../../types/certification.types';

function parseTiempoToSegundos(tiempo: string): number {
  // Format: "0:00 - 1:30" or "0:30" — use end time if range, else parse single value
  const rangeMatch = tiempo.match(/(\d+):(\d{2})\s*-\s*(\d+):(\d{2})/);
  if (rangeMatch) {
    const startSec = parseInt(rangeMatch[1]) * 60 + parseInt(rangeMatch[2]);
    const endSec = parseInt(rangeMatch[3]) * 60 + parseInt(rangeMatch[4]);
    return Math.max(0, endSec - startSec);
  }
  const singleMatch = tiempo.match(/(\d+):(\d{2})/);
  if (singleMatch) return parseInt(singleMatch[1]) * 60 + parseInt(singleMatch[2]);
  // Plain seconds like "30s" or "90"
  const digitsMatch = tiempo.match(/(\d+)/);
  return digitsMatch ? parseInt(digitsMatch[1]) : 0;
}

/**
 * Constructs a P3Artifact from raw agent output text.
 * Accepts JSON with `escaleta` or `guion_tecnico` arrays, or a serialized PartesVideo object.
 * Falls back to empty escenas on any parse error.
 */
export function parseP3Output(
  texto: string,
  nombreModulo: string,
  modalidad: ModalidadCanonica,
  idioma: ISO639LanguageCode,
): P3Artifact {
  let escenas: Escena[] = [];
  try {
    const objMatch = texto.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const obj = JSON.parse(objMatch[0]);
      const rawEscaleta = obj['escaleta'];
      const rawTecnico = obj['guion_tecnico'];

      if (Array.isArray(rawEscaleta) && rawEscaleta.length > 0) {
        escenas = rawEscaleta.map((row: any, idx: number) => ({
          numero: idx + 1,
          duracion_segundos: parseTiempoToSegundos(String(row.tiempo ?? '')),
          descripcion_visual: String(row.accion ?? row.escena ?? ''),
          audio: Array.isArray(rawTecnico) && rawTecnico[idx]
            ? String(rawTecnico[idx].audio_locucion ?? '')
            : '',
        }));
      } else if (Array.isArray(rawTecnico) && rawTecnico.length > 0) {
        escenas = rawTecnico.map((row: any, idx: number) => ({
          numero: idx + 1,
          duracion_segundos: parseTiempoToSegundos(String(row.notas_duracion ?? '')),
          descripcion_visual: String(row.imagen_descripcion ?? row.escena ?? ''),
          audio: String(row.audio_locucion ?? ''),
        }));
      }
    }
  } catch {}

  return {
    productCode: 'P3',
    modalidad,
    idioma,
    modulo: nombreModulo,
    escenas,
  };
}

/** Renders a P3Artifact to canonical Markdown (simplified form for artifact_versions). */
export function renderP3(artifact: P3Artifact): string {
  let md = `## ${artifact.modulo}\n\n`;
  if (artifact.escenas.length === 0) {
    return md + '*Sin escenas disponibles*\n\n';
  }
  md += '| # | Duración | Descripción Visual | Audio |\n|---|---|---|---|\n';
  for (const escena of artifact.escenas) {
    const dur = escena.duracion_segundos > 0 ? `${Math.floor(escena.duracion_segundos / 60)}:${String(escena.duracion_segundos % 60).padStart(2, '0')}` : '-';
    md += `| ${escena.numero} | ${dur} | ${escena.descripcion_visual} | ${escena.audio || '-'} |\n`;
  }
  return md + '\n';
}
