import { ProductContext } from './product.types';
import { parseJsonSafely } from '../../../helpers/json-cleaner';

// ── Tipos ──────────────────────────────────────────────────────────────────

interface FichaTecnica {
  modulo: string;
  objetivo_aprendizaje: string;
  duracion: string;
  recursos: string[];
  equipamiento?: string;
  perfil_talento?: string;
}

interface FilaEscaleta {
  tiempo: string;
  escena: string;
  accion: string;
  shot_type?: string;
}

interface BloqueLiterario {
  marcador: string;
  texto: string;
}

interface FilaTecnica {
  escena: string;
  imagen_tipo_plano: string;
  imagen_descripcion: string;
  audio_locucion: string;
  audio_musica: string;
  audio_sfx: string;
  notas_camara: string;
  notas_transicion: string;
  notas_duracion: string;
  notas_color: string;
  b_roll_sugerencias?: string;
}

interface EscenaStoryboard {
  escena: string;
  framing: string;
  subject: string;
  lighting: string;
  environment: string;
  color_palette: string;
  composition: string;
  mood?: string;
  camera_movement?: string;
}

interface PartesVideo {
  ficha_tecnica: FichaTecnica | null;
  escaleta: FilaEscaleta[];
  guion_literario: BloqueLiterario[];
  guion_tecnico: FilaTecnica[];
  storyboard: EscenaStoryboard[];
}

const SECCIONES = ['ficha', 'escaleta', 'literario', 'tecnico', 'storyboard'] as const;
type Seccion = typeof SECCIONES[number];

const CLAVE_PARTE: Record<Seccion, keyof PartesVideo> = {
  ficha: 'ficha_tecnica',
  escaleta: 'escaleta',
  literario: 'guion_literario',
  tecnico: 'guion_tecnico',
  storyboard: 'storyboard',
};

// ── Formateadores ──────────────────────────────────────────────────────────

function formatearFichaTecnica(f: FichaTecnica): string {
  let md = '| Campo | Valor |\n|---|---|\n';
  md += `| **Módulo/Unidad** | ${f.modulo} |\n`;
  md += `| **Objetivo de Aprendizaje** | ${f.objetivo_aprendizaje} |\n`;
  md += `| **Duración Estimada** | ${f.duracion} |\n`;
  if (f.recursos && f.recursos.length) md += `| **Recursos** | ${f.recursos.join(', ')} |\n`;
  if (f.equipamiento) md += `| **Equipamiento** | ${f.equipamiento} |\n`;
  if (f.perfil_talento) md += `| **Perfil de Talento** | ${f.perfil_talento} |\n`;
  return md;
}

function validarSumaTiempos(rows: FilaEscaleta[], duracionTotal: string): { ok: boolean; suma: string } {
  const totalMatch = duracionTotal.match(/(\d+)/);
  if (!totalMatch) return { ok: true, suma: '0:00' };
  const totalSegundos = parseInt(totalMatch[1]) * 60;
  
  let sumaSegundos = 0;
  for (const row of rows) {
    const match = row.tiempo.match(/(\d+):(\d+)\s*-\s*(\d+):(\d+)/);
    if (match) {
      const inicio = parseInt(match[1]) * 60 + parseInt(match[2]);
      const fin = parseInt(match[3]) * 60 + parseInt(match[4]);
      if (fin > inicio) sumaSegundos += (fin - inicio);
    }
  }

  const mm = Math.floor(sumaSegundos / 60);
  const ss = sumaSegundos % 60;
  const sumaStr = `${mm}:${ss.toString().padStart(2, '0')}`;
  
  return { 
    ok: Math.abs(sumaSegundos - totalSegundos) <= 30,
    suma: sumaStr
  };
}

function formatearEscaleta(rows: FilaEscaleta[], duracionTotal: string): string {
  let md = '| Tiempo | Escena | Descripción de Acción |\n|---|---|---|\n';
  for (const r of rows) {
    md += `| ${r.tiempo} | ${r.escena} | ${r.accion} |\n`;
  }
  
  const validacion = validarSumaTiempos(rows, duracionTotal);
  if (!validacion.ok) {
    md += `\n> ⚠️ **Advertencia de duración:** La escaleta suma ${validacion.suma}, pero la duración del video es ${duracionTotal}.\n`;
  }
  
  return md;
}

function formatearGuionLiterario(bloques: BloqueLiterario[]): string {
  return bloques.map(b => `[${b.marcador}]\n${b.texto}`).join('\n\n');
}

function formatearGuionTecnico(rows: FilaTecnica[]): string {
  let md = '| Escena | Imagen (Video/Recursos) | Audio (Locución/Música/SFX) | Notas Técnicas |\n|---|---|---|---|\n';
  for (const r of rows) {
    const imagen = `[${r.imagen_tipo_plano}] ${r.imagen_descripcion}`;
    const audio = `Locución: "${r.audio_locucion || '...'}". Música: ${r.audio_musica || 'Sin música'}. SFX: ${r.audio_sfx || 'Sin SFX'}`;
    const duracion = r.notas_duracion || '30s';
    const color = r.notas_color || 'Neutro';
    const camara = r.notas_camara || 'tripod';
    const transicion = r.notas_transicion || 'cut';
    const notas = `Cámara: ${camara}. Transición: ${transicion}. Duración: ${duracion}. Color: ${color}`;
    md += `| ${r.escena} | ${imagen} | ${audio} | ${notas} |\n`;
  }
  return md;
}

function formatearStoryboard(scenes: EscenaStoryboard[]): string {
  return scenes.map(s => {
    let md = `- **${s.escena}:**\n`;
    md += `  - **Framing:** ${s.framing}\n`;
    md += `  - **Subject:** ${s.subject}\n`;
    md += `  - **Lighting:** ${s.lighting}\n`;
    md += `  - **Environment:** ${s.environment}\n`;
    md += `  - **Color palette:** ${s.color_palette}\n`;
    md += `  - **Composition:** ${s.composition}\n`;
    if (s.mood) md += `  - **Mood:** ${s.mood}\n`;
    if (s.camera_movement) md += `  - **Camera Movement:** ${s.camera_movement}\n`;
    return md;
  }).join('\n\n');
}

// ── Extractor genérico (recursivo) ─────────────────────────────────────────

function sanitizeValue(value: any, expectedType: 'string' | 'array' | 'object'): any {
  if (value === null || value === undefined) {
    if (expectedType === 'string') return '';
    if (expectedType === 'array') return [];
    if (expectedType === 'object') return {};
  }
  if (typeof value === 'string') {
    if (value === 'undefined' || value === '[object Object]') {
      if (expectedType === 'string') return '';
      if (expectedType === 'object') return {};
    }
    return value;
  }
  if (expectedType === 'string' && typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (expectedType === 'object' && typeof value === 'object' && !Array.isArray(value)) {
    const cleaned: any = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === null || v === undefined || v === 'undefined' || v === '[object Object]') {
        cleaned[k] = '';
      } else if (typeof v === 'object' && !Array.isArray(v)) {
        cleaned[k] = sanitizeValue(v, 'object');
      } else if (typeof v === 'string') {
        cleaned[k] = v === 'undefined' || v === '[object Object]' ? '' : v;
      } else {
        cleaned[k] = v;
      }
    }
    return cleaned;
  }
  if (expectedType === 'array' && Array.isArray(value)) {
    return value.map((item: any) => {
      if (typeof item === 'object' && item !== null) {
        const cleaned: any = {};
        for (const [k, v] of Object.entries(item)) {
          cleaned[k] = (v === null || v === undefined || v === 'undefined' || v === '[object Object]') ? '' : v;
        }
        return cleaned;
      }
      return (item === 'undefined' || item === '[object Object]') ? '' : item;
    });
  }
  return value;
}

function extractAny(raw: string, key: string): any {
  // 1. JSON.parse completo
  try {
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const obj = JSON.parse(objMatch[0]);
      const value = obj[key];
      if (value !== undefined && value !== null) return value;
    }
  } catch {}

  // 2. Regex para string
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`"${escapedKey}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's');
  const match = raw.match(pattern);
  if (match && match[1]) {
    return match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\\|/g, '|');
  }

  return null;
}

function corregirFichaTecnica(f: FichaTecnica, nombreVideo: string): FichaTecnica {
  const objetivo = validarVerboObservable(f.objetivo_aprendizaje);
  return {
    ...f,
    modulo: nombreVideo,
    objetivo_aprendizaje: objetivo,
  };
}

function validarVerboObservable(objetivo: string): string {
  const prohibidos = /\b(Aprender|Comprender|Entender|Saber|Conocer|Familiarizarse)\b/i;
  if (prohibidos.test(objetivo)) {
    return `⚠️ VERBO NO OBSERVABLE: ${objetivo}`;
  }
  return objetivo;
}

function corregirSumaEscaleta(rows: FilaEscaleta[], duracionTotal: string): FilaEscaleta[] {
  const totalMatch = duracionTotal.match(/(\d+)/);
  if (!totalMatch || rows.length === 0) return rows;
  const totalSegundos = parseInt(totalMatch[1]) * 60;
  
  // Distribuir: 10% apertura (2 filas), 80% desarrollo (6 filas), 10% cierre (1 fila)
  const aperturaSegundos = Math.round(totalSegundos * 0.10);
  const cierreSegundos = Math.round(totalSegundos * 0.10);
  const desarrolloSegundos = totalSegundos - aperturaSegundos - cierreSegundos;
  
  const numDesarrollo = rows.length - 3; // filas entre apertura y cierre
  if (numDesarrollo <= 0) return rows;
  
  const desarrolloPorFila = Math.floor(desarrolloSegundos / numDesarrollo);
  let resto = desarrolloSegundos - (desarrolloPorFila * numDesarrollo);
  
  let currentTime = 0;
  const result: FilaEscaleta[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    let duration: number;
    if (i === 0) {
      duration = Math.floor(aperturaSegundos / 2);
    } else if (i === 1) {
      duration = aperturaSegundos - Math.floor(aperturaSegundos / 2);
    } else if (i === rows.length - 1) {
      duration = cierreSegundos;
    } else {
      duration = desarrolloPorFila + (resto > 0 ? 1 : 0);
      if (resto > 0) resto--;
    }
    
    const start = currentTime;
    const end = currentTime + duration;
    const startMin = Math.floor(start / 60);
    const startSec = start % 60;
    const endMin = Math.floor(end / 60);
    const endSec = end % 60;
    
    result.push({
      ...rows[i],
      tiempo: `${startMin}:${startSec.toString().padStart(2, '0')} - ${endMin}:${endSec.toString().padStart(2, '0')}`,
    });
    
    currentTime = end;
  }
  
  return result;
}

function validarNombresEscena(tecnicas: FilaTecnica[], escaleta: FilaEscaleta[]): string[] {
  const nombresEscaleta = new Set(escaleta.map(e => e.escena));
  const warnings: string[] = [];
  for (const t of tecnicas) {
    if (!nombresEscaleta.has(t.escena)) {
      warnings.push(`⚠️ Escena "${t.escena}" no coincide con la escaleta`);
    }
  }
  return warnings;
}

// ── Ensamblador principal ──────────────────────────────────────────────────

export async function handleDocumentP3Assembler(context: ProductContext): Promise<string> {
  const { jobId, projectId, services, event } = context;
  console.log(`[p3-assembler] ── Ensamblando partes del módulo (job: ${jobId}) ──`);

  const moduloActual = event?.body?.userInputs?._modulo_actual || 1;
  const nombreVideo = event?.body?.userInputs?._nombre_video || `Módulo ${moduloActual}`;

  const partes: PartesVideo = {
    ficha_tecnica: null,
    escaleta: [],
    guion_literario: [],
    guion_tecnico: [],
    storyboard: [],
  };

  for (const seccion of SECCIONES) {
    const juezNombre = `juez_${seccion}`;
    const parteClave = CLAVE_PARTE[seccion];
    const isArray = ['escaleta', 'guion_literario', 'guion_tecnico', 'storyboard'].includes(parteClave);
    const expectedType = isArray ? 'array' : 'object';

    // 1. Obtener la decisión del juez (ahora es un selector booleano puro)
    const rawJuez = await services.pipelineService.getAgentOutput(jobId, juezNombre) || '';
    const juezParsed = parseJsonSafely(rawJuez, { seleccion: 'A' }) as { seleccion?: string };
    
    // 2. Determinar quién ganó (por defecto 'A' si el juez falla o alucina)
    const ganador = juezParsed?.seleccion?.toUpperCase() === 'B' ? 'B' : 'A';
    console.log(`[p3-assembler] Sección ${seccion}: El Juez seleccionó al agente ${ganador}`);
    
    // 3. Obtener el JSON crudo del agente ganador
    const agenteGanadorNombre = `agente_${seccion}_${ganador}`;
    const rawGanador = await services.pipelineService.getAgentOutput(jobId, agenteGanadorNombre) || '';
    
    // 4. Extraer el contenido real del ganador
    const ganadorParsed = parseJsonSafely(rawGanador, null) as Record<string, unknown> | null;
    let contenidoJuez: unknown = ganadorParsed?.[parteClave] ?? null;

    // Fallback: si el parseo directo falla, buscar con regex en el raw del ganador
    if (contenidoJuez === null || contenidoJuez === undefined) {
      contenidoJuez = extractAny(rawGanador, parteClave);
    }

    (partes as any)[parteClave] = sanitizeValue(contenidoJuez, expectedType);

    // Último recurso: si el juez falló completamente, intentar los agentes A→B
    const valorActual = (partes as any)[parteClave];
    const estaVacio = Array.isArray(valorActual) ? valorActual.length === 0 : !valorActual;
    if (estaVacio) {
      console.warn(`[p3-assembler] Sección ${seccion}: juez vacío, intentando agentes A/B como último recurso`);
      for (const suffix of ['A', 'B']) {
        const rawAgente = await services.pipelineService.getAgentOutput(jobId, `agente_${seccion}_${suffix}`) || '';
        const fallbackVal = sanitizeValue(extractAny(rawAgente, parteClave), expectedType);
        const fallbackOk = Array.isArray(fallbackVal) ? fallbackVal.length > 0 : !!fallbackVal;
        if (fallbackOk) {
          (partes as any)[parteClave] = fallbackVal;
          console.log(`[p3-assembler] Sección ${seccion}: recuperado desde agente_${seccion}_${suffix}`);
          break;
        }
      }
    }

    const contenido = (partes as any)[parteClave];
    const tipo = Array.isArray(contenido) ? `array[${contenido.length}]` : typeof contenido;
    console.log(`[p3-assembler] Sección ${seccion}: procesada, tipo=${tipo}`);
  }

  // ── Correcciones programáticas ──────────────────────────────────────
  
  // Corregir nombre de módulo y verbo observable en ficha técnica
  if (partes.ficha_tecnica) {
    partes.ficha_tecnica = corregirFichaTecnica(partes.ficha_tecnica, nombreVideo);
  }

  // Corregir suma de tiempos de escaleta
  if (partes.escaleta.length > 0) {
    const duracionTotal = partes.ficha_tecnica?.duracion || '5 min';
    partes.escaleta = corregirSumaEscaleta(partes.escaleta, duracionTotal);
  }

  // Validar consistencia de nombres entre escaleta y guion técnico
  let warningsAdicionales: string[] = [];
  if (partes.guion_tecnico.length > 0 && partes.escaleta.length > 0) {
    warningsAdicionales = validarNombresEscena(partes.guion_tecnico, partes.escaleta);
    if (warningsAdicionales.length > 0) {
      console.warn(`[p3-assembler] ⚠️ Advertencias de consistencia:`, warningsAdicionales);
    }
  }

  // Formatear a markdown
  const duracionTotal = partes.ficha_tecnica?.duracion || '0 min';
  const fichaMd = partes.ficha_tecnica ? formatearFichaTecnica(partes.ficha_tecnica) : '*No disponible*';
  const escaletaMd = partes.escaleta.length ? formatearEscaleta(partes.escaleta, duracionTotal) : '*No disponible*';
  const literarioMd = partes.guion_literario.length ? formatearGuionLiterario(partes.guion_literario) : '*No disponible*';
  const tecnicoMd = partes.guion_tecnico.length ? formatearGuionTecnico(partes.guion_tecnico) : '*No disponible*';
  const storyboardMd = partes.storyboard.length ? formatearStoryboard(partes.storyboard) : '*No disponible*';

  // Acumular en BD
  let partesAcumuladas: Record<string, any> = {};
  try {
    const { data } = await services.supabase.client!
      .from('fase4_productos')
      .select('datos_producto')
      .eq('project_id', projectId)
      .eq('producto', 'P3')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.datos_producto?.partes) partesAcumuladas = data.datos_producto.partes;
  } catch {}

  partesAcumuladas[`modulo_${moduloActual}`] = {
    nombre: nombreVideo,
    ficha_tecnica: fichaMd,
    escaleta: escaletaMd,
    guion_literario: literarioMd,
    guion_tecnico: tecnicoMd,
    storyboard: storyboardMd,
  };

  const modulosOrdenados = Object.keys(partesAcumuladas).sort();
  let documentoFinal = '# Guiones Multimedia (Paquete de Producción)\n\n';
  for (const key of modulosOrdenados) {
    const m = partesAcumuladas[key];
    documentoFinal += `## ${key.replace('modulo_', 'Módulo ')}: ${m.nombre}\n\n`;
    documentoFinal += `### Ficha Técnica\n\n${m.ficha_tecnica}\n\n---\n\n`;
    documentoFinal += `### Escaleta\n\n${m.escaleta}\n\n---\n\n`;
    documentoFinal += `### Guion Literario\n\n${m.guion_literario}\n\n---\n\n`;
    documentoFinal += `### Guion Técnico\n\n${m.guion_tecnico}\n\n---\n\n`;
    documentoFinal += `### Storyboard Descriptivo\n\n${m.storyboard}\n\n---\n\n`;
  }

  await services.supabase.saveF4Producto({
    projectId,
    producto: 'P3',
    documentoFinal,
    borradorA: '',
    borradorB: '',
    validacionEstado: 'aprobado',
    jobId,
    validacionErrores: { passed: true },
    datosProducto: { partes: partesAcumuladas, total_modulos: modulosOrdenados.length },
  });

  console.log(`[p3-assembler] Módulo ${moduloActual} ensamblado. Total: ${modulosOrdenados.length}. Caracteres: ${documentoFinal.length}`);
  return documentoFinal;
}

function parseJsonSafely(raw: string, fallback: any): any {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);
    return fallback;
  } catch {
    return fallback;
  }
}