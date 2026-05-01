// src/dcfl/services/discrepancy-detector.ts
//
// Detector determinista de discrepancias F1 ↔ F2.
// Compara campo por campo sin IA: solo lógica de negocio.
// Regla: una discrepancia se genera SOLO si ambos documentos tienen valor Y difieren.

import type { InformeF1Parsed } from './informe.parser';
// import type { AnalisisF2Parsed } from './informe.parser.f2'; // Usamos any para el nuevo JSON

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface OpcionResolucion {
  id: 'f1' | 'f2' | 'intermedio';
  label: string;
  valor: string;
}

export interface Discrepancia {
  aspecto: string;
  descripcion: string;
  valor_f1: string;
  justificacion_f1: string;
  valor_f2: string;
  justificacion_f2: string;
  opciones: OpcionResolucion[];
}

export interface ResolucionCliente {
  aspecto: string;
  decision: 'f1' | 'f2' | 'intermedio';
  valor_elegido: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function _differ(a: string, b: string): boolean {
  return _normalize(a) !== _normalize(b);
}

// Extrae horas de texto como "20 horas", "15h", "2 horas/semana" → número o null
function _extractHours(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*h(?:oras?)?/i);
  return m?.[1] ? parseFloat(m[1]) : null;
}

// Suma horas de los módulos de F2
function _sumF2Hours(estructura: any[] | undefined): number | null {
  if (!estructura || !Array.isArray(estructura) || estructura.length === 0) return null;
  let total = 0;
  for (const mod of estructura) {
    const h = mod.duracion_estimada_horas !== undefined ? Number(mod.duracion_estimada_horas) : _extractHours(String(mod.horas || mod.duracion || ''));
    if (h === null || isNaN(h)) return null;
    total += h;
  }
  return total > 0 ? total : null;
}

// Extrae horas semanales de perfil F1 (campo libre)
function _extractF1HorasSemanales(f1: any): string | null {
  if (f1.preguntas_respuestas && Array.isArray(f1.preguntas_respuestas)) {
    for (const qa of f1.preguntas_respuestas) {
      if (/(hora|tiempo|dedicar|semana)/i.test(qa.pregunta || '')) {
        return qa.respuesta || null;
      }
    }
  }
  return null;
}

// Extrae escolaridad mínima de F1 (perfil_participante)
function _extractF1Escolaridad(f1: any): string | null {
  const p = f1.perfil_participante || f1.perfil;
  if (!p) return null;
  return p['nivel_educativo_minimo'] ?? p['escolaridad'] ?? p['nivel_educativo'] ?? null;
}

// Extrae escolaridad de F2 (perfil_ingreso_ec0366)
function _extractF2Escolaridad(f2: any): string | null {
  const p = f2.perfil_ingreso_ec0366 || f2.perfil_ingreso;
  if (!p) return null;
  
  if (p.escolaridad_minima?.requisito) {
    return p.escolaridad_minima.requisito;
  }
  
  // Soporte legacy array
  if (Array.isArray(p)) {
    const row = p.find((r) => /escolaridad|educaci[oó]n|nivel.*m[ií]nimo/i.test(r.categoria));
    return row?.requisito ?? null;
  }
  
  return null;
}

// Extrae número de módulos de F1 (objetivos_aprendizaje como proxy)
function _extractF1NumModulos(f1: any): number | null {
  if (f1.objetivos_aprendizaje && Array.isArray(f1.objetivos_aprendizaje) && f1.objetivos_aprendizaje.length > 0) {
    return f1.objetivos_aprendizaje.length;
  }
  return null;
}

// ── Detector principal ────────────────────────────────────────────────────────

export function detectDiscrepancias(
  f1: any,
  f2: any,
): Discrepancia[] {
  const discrepancias: Discrepancia[] = [];

  // ── 1. MODALIDAD ─────────────────────────────────────────────────────────────
  const modalidadF2 = f2.modalidad_curso?.seleccion ?? f2.modalidad?.modalidad ?? f2.modalidad?.modalidad_de_entrega ?? null;
  if (modalidadF2) {
    // F1 infiere modalidad de recomendaciones_diseno
    const recF1 = (f1.recomendaciones_diseno || []).join(' ') || '';
    let modalidadF1: string | null = null;
    if (/en l[ií]nea|online|virtual/i.test(recF1)) modalidadF1 = 'En línea (online)';
    else if (/presencial/i.test(recF1)) modalidadF1 = 'Presencial';
    else if (/mixto|h[ií]brido/i.test(recF1)) modalidadF1 = 'Mixto (híbrido)';

    if (modalidadF1 && _differ(modalidadF1, modalidadF2)) {
      discrepancias.push({
        aspecto: 'modalidad',
        descripcion: 'Modalidad del curso',
        valor_f1: modalidadF1,
        justificacion_f1: 'Inferido de las recomendaciones de diseño del Informe de Necesidades (F1)',
        valor_f2: modalidadF2,
        justificacion_f2: 'Definido en la Sección de Modalidad e Interactividad (F2)',
        opciones: [
          { id: 'f1', label: `Usar F1: ${modalidadF1}`, valor: modalidadF1 },
          { id: 'f2', label: `Usar F2: ${modalidadF2}`, valor: modalidadF2 },
        ],
      });
    }
  }

  // ── 2. NÚMERO DE MÓDULOS ──────────────────────────────────────────────────────
  const numModulosF2 = Array.isArray(f2.estructura_tematica) ? f2.estructura_tematica.length : null;
  const numModulosF1 = _extractF1NumModulos(f1);
  if (numModulosF1 !== null && numModulosF2 !== null && numModulosF1 !== numModulosF2) {
    discrepancias.push({
      aspecto: 'numero_modulos',
      descripcion: 'Número de módulos del curso',
      valor_f1: `${numModulosF1} módulos (estimado por número de objetivos de aprendizaje)`,
      justificacion_f1: `F1 tiene ${numModulosF1} objetivos de aprendizaje declarados, que sugieren la misma cantidad de módulos`,
      valor_f2: `${numModulosF2} módulos`,
      justificacion_f2: `F2 define explícitamente ${numModulosF2} módulos en la estructura temática`,
      opciones: [
        { id: 'f1', label: `${numModulosF1} módulos (basado en F1)`, valor: String(numModulosF1) },
        { id: 'f2', label: `${numModulosF2} módulos (basado en F2)`, valor: String(numModulosF2) },
        ...(numModulosF1 !== numModulosF2
          ? [{ id: 'intermedio' as const, label: `${Math.round((numModulosF1 + numModulosF2) / 2)} módulos (promedio)`, valor: String(Math.round((numModulosF1 + numModulosF2) / 2)) }]
          : []),
      ],
    });
  }

  // ── 3. DURACIÓN TOTAL ─────────────────────────────────────────────────────────
  const horasF1Raw = _extractF1HorasSemanales(f1);
  const horasF2Total = _sumF2Hours(f2.estructura_tematica);
  if (horasF1Raw && horasF2Total !== null) {
    const horasF1Num = _extractHours(horasF1Raw);
    if (horasF1Num !== null) {
      const estimadoF1_4semanas = horasF1Num * 4;
      const diff = Math.abs(estimadoF1_4semanas - horasF2Total);
      if (diff > 4) { // diferencia mayor a 4 horas
        discrepancias.push({
          aspecto: 'duracion_total',
          descripcion: 'Duración total estimada del curso',
          valor_f1: `~${estimadoF1_4semanas} horas (${horasF1Raw} × 4 semanas)`,
          justificacion_f1: `El participante declaró disponibilidad de "${horasF1Raw}" en el Informe de Necesidades`,
          valor_f2: `${horasF2Total} horas (suma de módulos)`,
          justificacion_f2: `F2 define la estructura temática con una duración total de ${horasF2Total} horas`,
          opciones: [
            { id: 'f1', label: `${estimadoF1_4semanas} h (ajustado a disponibilidad F1)`, valor: String(estimadoF1_4semanas) },
            { id: 'f2', label: `${horasF2Total} h (definido en F2)`, valor: String(horasF2Total) },
            {
              id: 'intermedio',
              label: `${Math.round((estimadoF1_4semanas + horasF2Total) / 2)} h (punto medio)`,
              valor: String(Math.round((estimadoF1_4semanas + horasF2Total) / 2)),
            },
          ],
        });
      }
    }
  }

  // ── 4. ESCOLARIDAD MÍNIMA ─────────────────────────────────────────────────────
  const escolaridadF1 = _extractF1Escolaridad(f1);
  const escolaridadF2 = _extractF2Escolaridad(f2);
  if (escolaridadF1 && escolaridadF2 && _differ(escolaridadF1, escolaridadF2)) {
    discrepancias.push({
      aspecto: 'escolaridad_minima',
      descripcion: 'Escolaridad mínima del participante',
      valor_f1: escolaridadF1,
      justificacion_f1: 'Definido en el perfil del participante del Informe de Necesidades (F1)',
      valor_f2: escolaridadF2,
      justificacion_f2: 'Definido en la categoría "Escolaridad mínima" del Perfil de Ingreso (F2)',
      opciones: [
        { id: 'f1', label: `Usar F1: ${escolaridadF1}`, valor: escolaridadF1 },
        { id: 'f2', label: `Usar F2: ${escolaridadF2}`, valor: escolaridadF2 },
      ],
    });
  }

  // ── 5. ALINEACIÓN DE OBJETIVOS (NUEVO) ────────────────────────────────────────
  // Verifica si F2 cubrió el mismo número de objetivos principales o inventó módulos.
  const numObjetivos = _extractF1NumModulos(f1);
  if (numObjetivos !== null && numModulosF2 !== null && numModulosF2 > numObjetivos) {
    discrepancias.push({
      aspecto: 'alcance_excedido',
      descripcion: 'Módulos excedentes detectados',
      valor_f1: `${numObjetivos} objetivos`,
      justificacion_f1: `F1 delimitó un alcance estricto de ${numObjetivos} objetivos principales de aprendizaje.`,
      valor_f2: `${numModulosF2} módulos`,
      justificacion_f2: `F2 propone ${numModulosF2} módulos, excediendo el alcance pactado en F1.`,
      opciones: [
        { id: 'f1', label: `Ajustar temario a ${numObjetivos} módulos (F1)`, valor: String(numObjetivos) },
        { id: 'f2', label: `Aprobar ${numModulosF2} módulos (F2)`, valor: String(numModulosF2) },
      ]
    });
  } else if (numObjetivos !== null && numModulosF2 !== null && numModulosF2 < numObjetivos) {
    discrepancias.push({
      aspecto: 'alcance_incompleto',
      descripcion: 'Objetivos sin módulo asignado',
      valor_f1: `${numObjetivos} objetivos`,
      justificacion_f1: `F1 delimitó un alcance de ${numObjetivos} objetivos principales.`,
      valor_f2: `${numModulosF2} módulos`,
      justificacion_f2: `F2 solo desarrolla ${numModulosF2} módulos, dejando contenido fuera.`,
      opciones: [
        { id: 'f1', label: `Expandir temario a ${numObjetivos} módulos (F1)`, valor: String(numObjetivos) },
        { id: 'f2', label: `Aprobar versión resumida de ${numModulosF2} módulos (F2)`, valor: String(numModulosF2) },
      ]
    });
  }

  return discrepancias;
}
