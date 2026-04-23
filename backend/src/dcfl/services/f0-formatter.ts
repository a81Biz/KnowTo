export function buildF0Document(
  sector: any,
  practicas: any[],
  competencia: any[],
  estandares: any[],
  gaps: any,
  preguntas: string[],
  recomendaciones: string[],
  referencias: any[],
  projectName: string,
  today: string
): string {
  // Funciones helper con fallbacks
  const getValue = (obj: any, key: string, fallback = '—') => {
    const val = obj?.[key];
    const invalidValues = ['Hallazgo con fuente', 'Fuente', 'Hallazgo o vacío', 'Fuente o vacío', 'Texto', '', null, undefined];
    
    if (val && !invalidValues.includes(val) && typeof val === 'string' && val.trim().length > 0) {
      return val;
    }
    
    // Si el valor es un número o booleano, mostrarlo
    if (val !== undefined && val !== null && typeof val !== 'string') {
      return String(val);
    }
    
    return fallback;
  };
  
  const getArray = (arr: any[], fallback = []) => Array.isArray(arr) && arr.length > 0 ? arr : fallback;
  
  // 1. Sector
  const tableSector = `
| Aspecto | Hallazgo | Fuente |
|:---|:---|:---|
| Tamaño del mercado | ${getValue(sector, 'tamaño')} | ${getValue(sector, 'fuente_tamaño')} |
| Tendencias principales | ${getValue(sector, 'tendencias')} | ${getValue(sector, 'fuente_tendencias')} |
| Regulaciones aplicables | ${getValue(sector, 'regulaciones')} | ${getValue(sector, 'fuente_regulaciones')} |
| Certificaciones obligatorias | ${getValue(sector, 'certificaciones')} | ${getValue(sector, 'fuente_certificaciones')} |
`;

  const desafiosRaw = sector?.desafios;
  const desafios = Array.isArray(desafiosRaw) ? desafiosRaw : [];
  const desafiosTable = desafios.length > 0 ? `
### Desafíos comunes (dolores del sector)

| Desafío / Dolor | Fuente |
|:---|:---|
${desafios.map((d: any) => `| ${getValue(d, 'desafio')} | ${getValue(d, 'fuente')} |`).join('\n')}
` : '';

  // 2. Prácticas
  const arrayPracticas = getArray(practicas);
  const tablePracticas = arrayPracticas.length > 0 ? `
| Práctica | Descripción | Fuente |
|:---|:---|:---|
${arrayPracticas.map((p: any) => `| ${getValue(p, 'practica')} | ${getValue(p, 'descripcion')} | ${getValue(p, 'fuente')} |`).join('\n')}
` : '| — | — | — |';

  // 3. Competencia
  const arrayCompetencia = getArray(competencia);
  const tableCompetencia = arrayCompetencia.length > 0 ? `
| Curso | Plataforma | Precio | Alumnos | Duración | Enfoque | Oportunidad |
|:---|:---|:---|:---|:---|:---|:---|
${arrayCompetencia.map((c: any) => `| ${getValue(c, 'curso')} | ${getValue(c, 'plataforma')} | ${getValue(c, 'precio')} | ${getValue(c, 'alumnos')} | ${getValue(c, 'duracion')} | ${getValue(c, 'enfoque')} | ${getValue(c, 'oportunidad')} |`).join('\n')}
` : '| — | — | — | — | — | — | — |';

  // 4. Estándares
  const arrayEstandares = getArray(estandares);
  const tableEstandares = arrayEstandares.length > 0 ? `
| Código | Nombre | Propósito | Aplicabilidad |
|:---|:---|:---|:---|
${arrayEstandares.map((e: any) => `| ${getValue(e, 'codigo')} | ${getValue(e, 'nombre')} | ${getValue(e, 'proposito')} | ${getValue(e, 'aplicabilidad')} |`).join('\n')}
` : '| — | — | — | — |';

  // 5. Gaps
  const gapMejoresPracticas = getValue(gaps, 'mejores_practicas');
  const gapCompetencia = getValue(gaps, 'competencia');

  // 6. Preguntas
  const arrayPreguntas = getArray(preguntas);
  const listPreguntas = arrayPreguntas.length > 0 
    ? arrayPreguntas.map((p: any, i: number) => {
        const text = typeof p === 'string' ? p : (p?.pregunta ?? JSON.stringify(p));
        return `${i + 1}. ${text}`;
      }).join('\n')
    : 'No se generaron preguntas.';

  // 7. Recomendaciones
  const arrayRecomendaciones = getArray(recomendaciones);
  const listRecomendaciones = arrayRecomendaciones.length > 0
    ? arrayRecomendaciones.map((r: any, i: number) => {
        const text = typeof r === 'string' ? r : (r?.recomendacion ?? JSON.stringify(r));
        return `${i + 1}. ${text}`;
      }).join('\n')
    : 'No se generaron recomendaciones.';

  // 8. Referencias
  const arrayReferencias = getArray(referencias);
  const listReferencias = arrayReferencias.length > 0
    ? arrayReferencias.map((r: any) => `[${getValue(r, 'id')}] ${getValue(r, 'referencia')}`).join('\n')
    : 'No se encontraron referencias.';

  return `# MARCO DE REFERENCIA DEL CLIENTE
**Proyecto:** ${projectName}
**Fecha de investigación:** ${today}
**Investigador:** IA (fuentes documentadas)

---

## 1. ANÁLISIS DEL SECTOR/INDUSTRIA
${tableSector}
${desafiosTable}

---

## 2. MEJORES PRÁCTICAS PARA CURSOS EN LÍNEA EN ESTE SECTOR
${tablePracticas}

---

## 3. COMPETENCIA IDENTIFICADA
${tableCompetencia}

**Análisis de brecha:** ${gapCompetencia}

---

## 4. ESTÁNDARES EC RELACIONADOS (CONOCER)
${tableEstandares}

---

## 5. ANÁLISIS DE GAPS INICIALES
### Gap vs mejores prácticas: ${gapMejoresPracticas}
### Gap vs competencia: ${gapCompetencia}

---

## 6. PREGUNTAS PARA EL CLIENTE (MÁXIMO 10)
${listPreguntas}

---

## 7. RECOMENDACIONES INICIALES
${listRecomendaciones}

---

## 8. REFERENCIAS
${listReferencias}`;
}
