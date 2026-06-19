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
  SINTETIZADOR_F2: 'sintetizador_final_f2',

  // TEMARIO BASE (pipeline independiente — ancla de F4)
  EXTRACTOR_TEMARIO:   'extractor_temario',
  ESTRUCTURA_A:        'agente_estructura_A',
  ESTRUCTURA_B:        'agente_estructura_B',
  JUEZ_ESTRUCTURA:     'juez_estructura',
  TIEMPOS_A:           'agente_tiempos_A',
  TIEMPOS_B:           'agente_tiempos_B',
  JUEZ_TIEMPOS:        'juez_tiempos',
  ENSAMBLADOR_TEMARIO: 'ensamblador_temario',

  // F4_P4_CHAPTER (pipeline por capítulo — fuente de verdad para Manual del Participante)
  EXTRACTOR_CAPITULO:    'extractor_capitulo',
  AGENTE_CONTENIDO_A:    'agente_contenido_A',
  AGENTE_CONTENIDO_B:    'agente_contenido_B',
  JUEZ_CAPITULO:         'juez_capitulo',
  ENSAMBLADOR_CAPITULO:  'ensamblador_capitulo',

  // F5 — Verificación
  VERIFICACION_A:       'agente_verificacion_A',
  VERIFICACION_B:       'agente_verificacion_B',
  JUEZ_VERIFICACION:    'juez_verificacion',
  ENSAMBLADOR_F5:       'ensamblador_f5',

  // F5_2 — Evidencias
  EVIDENCIAS_A:         'agente_evidencias_A',
  EVIDENCIAS_B:         'agente_evidencias_B',
  JUEZ_EVIDENCIAS:      'juez_evidencias',
  ENSAMBLADOR_F5_2:     'ensamblador_f5_2',

  // F6 — Ajustes
  AJUSTES_A:            'agente_ajustes_A',
  AJUSTES_B:            'agente_ajustes_B',
  JUEZ_AJUSTES:         'juez_ajustes',
  ENSAMBLADOR_F6:       'ensamblador_f6',

  // F6_2a — Inventario
  INVENTARIO_A:         'agente_inventario_A',
  INVENTARIO_B:         'agente_inventario_B',
  JUEZ_INVENTARIO:      'juez_inventario',
  ENSAMBLADOR_F6_2A:    'ensamblador_f6_2a',

  // F6_2b — Declaración
  DECLARACION_A:        'agente_declaracion_A',
  DECLARACION_B:        'agente_declaracion_B',
  JUEZ_DECLARACION:     'juez_declaracion',
  ENSAMBLADOR_F6_2B:    'ensamblador_f6_2b',

  // F7 — Resumen cualitativo
  RESUMEN_A:            'agente_resumen_A',
  RESUMEN_B:            'agente_resumen_B',
  JUEZ_RESUMEN_PROCESO: 'juez_resumen_proceso',
  ENSAMBLADOR_F7:       'ensamblador_f7',
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
  'juez_temario': 'temario',
  [Agent.JUEZ_ESTRUCTURA]: 'estructura',
  [Agent.JUEZ_TIEMPOS]: 'tiempos',
};
