export const Agent = {
  EXTRACTOR_F0: 'extractor_f0',
  
  // SECTOR
  SECTOR_A: 'agente_sector_A',
  SECTOR_B: 'agente_sector_B',
  JUEZ_SECTOR: 'juez_sector',

  // MEJORES PRÁCTICAS
  PRACTICAS_A: 'agente_practicas_A',
  PRACTICAS_B: 'agente_practicas_B',
  JUEZ_PRACTICAS: 'juez_practicas',

  // COMPETENCIA
  COMPETENCIA_A: 'agente_competencia_A',
  COMPETENCIA_B: 'agente_competencia_B',
  JUEZ_COMPETENCIA: 'juez_competencia',

  // ESTÁNDARES
  ESTANDARES_A: 'agente_estandares_A',
  ESTANDARES_B: 'agente_estandares_B',
  JUEZ_ESTANDARES: 'juez_estandares',

  // GAPS
  GAPS_A: 'agente_gaps_A',
  GAPS_B: 'agente_gaps_B',
  JUEZ_GAPS: 'juez_gaps',

  // PREGUNTAS
  PREGUNTAS_A: 'agente_preguntas_A',
  PREGUNTAS_B: 'agente_preguntas_B',
  JUEZ_PREGUNTAS: 'juez_preguntas',

  // RECOMENDACIONES
  RECOMENDACIONES_A: 'agente_recomendaciones_A',
  RECOMENDACIONES_B: 'agente_recomendaciones_B',
  JUEZ_RECOMENDACIONES: 'juez_recomendaciones',

  // REFERENCIAS
  REFERENCIAS_A: 'agente_referencias_A',
  REFERENCIAS_B: 'agente_referencias_B',
  JUEZ_REFERENCIAS: 'juez_referencias',

  // ENSAMBLADOR
  ENSAMBLADOR_F0: 'ensamblador_f0',

  // F1 (INFORME DE NECESIDADES)
  ANALISIS_A: 'agente_analisis_A',
  ANALISIS_B: 'agente_analisis_B',
  JUEZ_ANALISIS: 'juez_analisis',
  ESTRATEGIA_A: 'agente_estrategia_A',
  ESTRATEGIA_B: 'agente_estrategia_B',
  JUEZ_ESTRATEGIA: 'juez_estrategia',
  ENSAMBLADOR_F1: 'ensamblador_f1',

  // F2 (ESTRUCTURACIÓN Y ANÁLISIS)
  TEMARIO_A: 'especialista_temario_a',
  TEMARIO_B: 'especialista_temario_b',
  JUEZ_TEMARIO: 'juez_temario',
  SINTETIZADOR_F2: 'sintetizador_final_f2'
} as const;

export type AgentName = typeof Agent[keyof typeof Agent];

export const JudgeSectionMap: Record<string, string> = {
  [Agent.JUEZ_SECTOR]: 'sector',
  [Agent.JUEZ_PRACTICAS]: 'practicas',
  [Agent.JUEZ_COMPETENCIA]: 'competencia',
  [Agent.JUEZ_ESTANDARES]: 'estandares',
  [Agent.JUEZ_GAPS]: 'gaps',
  [Agent.JUEZ_PREGUNTAS]: 'preguntas',
  [Agent.JUEZ_RECOMENDACIONES]: 'recomendaciones',
  [Agent.JUEZ_REFERENCIAS]: 'referencias',
  [Agent.JUEZ_ANALISIS]: 'analisis',
  [Agent.JUEZ_ESTRATEGIA]: 'estrategia',
  'juez_temario': 'temario'
};
