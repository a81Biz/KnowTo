/**
 * Compresses productos_previos before injecting into pipeline context.
 * Strips large markdown blobs (contenido_md, presentacion_md, etc.) and
 * keeps only the structured metadata each downstream assembler needs for
 * alignment checks. Budget: 8000 chars total.
 *
 * Canonical F4 order: P4 → P1 → P2 → P3 → P5 → P7 → P6 → P8
 */

const F4_ORDER = ['P4', 'P1', 'P2', 'P3', 'P5', 'P7', 'P6', 'P8'];
const BUDGET = 8000;

function comprimirP4(data: any): any {
  if (!data) return data;
  const capitulos = (data.capitulos ?? []).map((c: any) => ({
    unidad: c.unidad,
    nombre: c.nombre,
    palabras: c.palabras,
  }));
  return {
    capitulos,
    inventario_materiales: (data.inventario_materiales ?? []).slice(0, 10),
    inventario_conceptos: (data.inventario_conceptos ?? []).slice(0, 10),
    palabras_totales: data.palabras_totales,
  };
}

function comprimirPartes(partes: Record<string, any>): Record<string, any> {
  if (!partes) return partes;
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(partes)) {
    const { nombre, fecha_sesion, hitos, duracion_horas } = val ?? {};
    out[key] = { nombre, fecha_sesion, hitos, duracion_horas };
  }
  return out;
}

function comprimirProducto(producto: string, data: any): any {
  if (!data) return data;
  switch (producto) {
    case 'P4':
      return comprimirP4(data);
    case 'P2':
    case 'P3':
    case 'P5':
    case 'P6':
    case 'P7':
    case 'P8':
      return { partes: comprimirPartes(data.partes), ficha_formacion: data.ficha_formacion, total_modulos: data.total_modulos };
    default:
      return data;
  }
}

export function comprimirProductosPrevios(productos: Record<string, any>): Record<string, any> {
  const ordenados: Record<string, any> = {};

  // Insert in canonical order first, then any extra keys not in F4_ORDER
  const keys = [
    ...F4_ORDER.filter(k => k in productos),
    ...Object.keys(productos).filter(k => !F4_ORDER.includes(k)),
  ];

  for (const key of keys) {
    ordenados[key] = comprimirProducto(key, productos[key]);
  }

  // Cap to budget by serializing and trimming if needed
  let serialized = JSON.stringify(ordenados);
  if (serialized.length <= BUDGET) return ordenados;

  // Budget exceeded: progressively drop the last (least critical) products
  const trimmed: Record<string, any> = {};
  for (const key of keys) {
    trimmed[key] = ordenados[key];
    if (JSON.stringify(trimmed).length > BUDGET) {
      delete trimmed[key];
      console.warn(`[context-compressor] Budget exceeded — omitting ${key} from productos_previos (${serialized.length} → target ${BUDGET})`);
      break;
    }
  }
  return trimmed;
}
