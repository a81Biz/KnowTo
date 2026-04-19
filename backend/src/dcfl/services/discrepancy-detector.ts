// src/dcfl/services/discrepancy-detector.ts
//
// Detector determinista de discrepancias F1 ↔ F2.
// Compara campo por campo sin IA: solo lógica de negocio.
// Regla: una discrepancia se genera SOLO si ambos documentos tienen valor Y difieren.

import type { InformeF1Parsed } from './informe.parser';
import type { AnalisisF2Parsed } from './informe.parser.f2';

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
function _sumF2Hours(estructura: AnalisisF2Parsed['estructura_tematica']): number | null {
  if (!estructura || estructura.length === 0) return null;
  let total = 0;
  for (const mod of estructura) {
    const h = _extractHours(mod.horas ?? '');
    if (h === null) return null; // si alguno es ambiguo, no sumamos
    total += h;
  }
  return total > 0 ? total : null;
}

// Extrae horas semanales de perfil F1 (campo libre)
function _extractF1HorasSemanales(f1: InformeF1Parsed): string | null {
  // Buscar en preguntas_respuestas
  if (f1.preguntas_respuestas) {
    for (const qa of f1.preguntas_respuestas) {
      if (/hora|tiempo|dedicar|semana/i.test(qa.pregunta)) {
        return qa.respuesta || null;
      }
    }
  }
  return null;
}

// Extrae escolaridad mínima de F1 (perfil_participante)
function _extractF1Escolaridad(f1: InformeF1Parsed): string | null {
  const p = f1.perfil_participante;
  if (!p) return null;
  return p['nivel_educativo_minimo'] ?? p['escolaridad'] ?? p['nivel_educativo'] ?? null;
}

// Extrae escolaridad de F2 (perfil_ingreso, fila Escolaridad mínima)
function _extractF2Escolaridad(f2: AnalisisF2Parsed): string | null {
  if (!f2.perfil_ingreso) return null;
  const row = f2.perfil_ingreso.find((r) =>
    /escolaridad|educaci[oó]n|nivel.*m[ií]nimo/i.test(r.categoria),
  );
  return row?.requisito ?? null;
}

// Extrae número de módulos de F1 (objetivos_aprendizaje como proxy)
function _extractF1NumModulos(f1: InformeF1Parsed): number | null {
  if (!f1.objetivos_aprendizaje || f1.objetivos_aprendizaje.length === 0) return null;
  // Si hay 3+ objetivos distintos, estimamos módulos ~ objetivos
  return f1.objetivos_aprendizaje.length;
}

// ── Detector principal ────────────────────────────────────────────────────────

export function detectDiscrepancias(
  f1: InformeF1Parsed,
  f2: AnalisisF2Parsed,
): Discrepancia[] {
  const discrepancias: Discrepancia[] = [];

  // ── 1. MODALIDAD ─────────────────────────────────────────────────────────────
  const modalidadF2 = f2.modalidad?.['modalidad'] ?? f2.modalidad?.['modalidad_de_entrega'] ?? null;
  if (modalidadF2) {
    // F1 infiere modalidad de recomendaciones_diseno
    const recF1 = f1.recomendaciones_diseno?.join(' ') ?? '';
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
        justificacion_f2: 'Definido en la Sección 1 de las Especificaciones de Análisis (F2)',
        opciones: [
          { id: 'f1', label: `Usar F1: ${modalidadF1}`, valor: modalidadF1 },
          { id: 'f2', label: `Usar F2: ${modalidadF2}`, valor: modalidadF2 },
        ],
      });
    }
  }

  // ── 2. NÚMERO DE MÓDULOS ──────────────────────────────────────────────────────
  const numModulosF2 = f2.estructura_tematica?.length ?? null;
  const numModulosF1 = _extractF1NumModulos(f1);
  if (numModulosF1 !== null && numModulosF2 !== null && numModulosF1 !== numModulosF2) {
    discrepancias.push({
      aspecto: 'numero_modulos',
      descripcion: 'Número de módulos del curso',
      valor_f1: `${numModulosF1} módulos (estimado por número de objetivos de aprendizaje)`,
      justificacion_f1: `F1 tiene ${numModulosF1} objetivos de aprendizaje declarados, que sugieren la misma cantidad de módulos`,
      valor_f2: `${numModulosF2} módulos`,
      justificacion_f2: `F2 define explícitamente ${numModulosF2} módulos en la estructura temática (Sección 3)`,
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
    // Solo comparamos si F1 indica horas semanales y F2 suma difiere significativamente
    // F1 puede ser "2-3 horas semanales" → estimamos 8-12 horas en 4 semanas
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
      justificacion_f2: 'Definido en la categoría "Escolaridad mínima" del Perfil de Ingreso (F2, Sección 4)',
      opciones: [
        { id: 'f1', label: `Usar F1: ${escolaridadF1}`, valor: escolaridadF1 },
        { id: 'f2', label: `Usar F2: ${escolaridadF2}`, valor: escolaridadF2 },
      ],
    });
  }

  // ── 5. NÚMERO DE ESTRATEGIAS ──────────────────────────────────────────────────
  const numEstrategias = f2.estrategias?.length ?? null;
  const numObjetivos = f1.objetivos_aprendizaje?.length ?? null;
  // Regla: se espera al menos 1 estrategia por objetivo; si hay menos de la mitad, es discrepancia
  if (numEstrategias !== null && numObjetivos !== null && numEstrategias < Math.ceil(numObjetivos / 2)) {
    discrepancias.push({
      aspecto: 'estrategias_instruccionales',
      descripcion: 'Número de estrategias instruccionales',
      valor_f1: `${numObjetivos} objetivos de aprendizaje → sugiere ${numObjetivos}+ estrategias`,
      justificacion_f1: `F1 declara ${numObjetivos} objetivos; cada objetivo debería tener al menos una estrategia instruccional`,
      valor_f2: `${numEstrategias} estrategias definidas`,
      justificacion_f2: `F2 define ${numEstrategias} estrategias instruccionales en la Sección 5`,
      opciones: [
        { id: 'f2', label: `Mantener ${numEstrategias} estrategias (F2)`, valor: String(numEstrategias) },
        { id: 'f1', label: `Ampliar a ${numObjetivos} estrategias (una por objetivo)`, valor: String(numObjetivos) },
      ],
    });
  }

  return discrepancias;
}
