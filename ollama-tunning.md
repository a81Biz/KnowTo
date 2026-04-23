# ollama-tunning.md

## wizard.route.ts
```typescript
async function _runPipelineAsync(
  jobId: string,
  body: {
    projectId: string;
    stepId: string;
    phaseId: string;
    promptId: string;
    context: {
      projectName: string;
      clientName: string;
      industry?: string;
      email?: string;
      courseTopic?: string;
      experienceLevel?: string;
      targetAudience?: string;
      expectedOutcome?: string;
      budget?: string;
      courseDuration?: string;
      deadline?: string;
      constraints?: string;
      currentDate?: string;
      previousData?: Record<string, unknown>;
    };
    userInputs: Record<string, unknown>;
  },
  env: Env
): Promise<void> {
  const jobsSvc  = new PipelineJobsService(env);
  const supabase = new SupabaseService(env);
  const ai       = createAIService(env);

  const projectRepository = new ProjectRepository(supabase.client!);
  const pipelineRepository = new PipelineRepository(supabase.client!);
  const projectService = new ProjectService(projectRepository);
  const pipelineService = new PipelineService(pipelineRepository, supabase);

  console.log(`[pipeline] START job=${jobId} phase=${body.phaseId} prompt=${body.promptId}`);

  if (body.phaseId === 'F2') {
    try {
      const f0Data = await supabase.getF0AgentOutputs(body.projectId);
      const f1Data = await supabase.getF1Informe(body.projectId);
      const context = body.context;
      if (!context.previousData) context.previousData = {};
      context.previousData.f0_estructurado = f0Data;
      context.previousData.f1_estructurado = f1Data;
    } catch (err) {
      console.warn('[F2] No se pudieron inyectar datos estructurados:', err);
    }
  }

  if (body.phaseId === 'F3') {
    try {
      const f2Data = await supabase.getF2Analisis(body.projectId);
      const f2_5Data = await supabase.getF2_5Recomendaciones(body.projectId);
      const context = body.context;
      if (!context.previousData) context.previousData = {};
      
      const numModulos = f2Data?.estructura_tematica?.length ?? 3;
      
      context.previousData.f2_estructurado = f2Data;
      context.previousData.f2_5_estructurado = {
        total_videos: f2_5Data?.total_videos ?? (numModulos * 2 + 2),
        duracion_promedio_video: f2_5Data?.duracion_promedio_minutos ?? 5,
        estructura_videos: (f2_5Data as any)?.estructura_videos ?? null,
        actividades: f2_5Data?.actividades ?? null,
        metricas: f2_5Data?.metricas ?? null,
        num_modulos: numModulos
      };
    } catch (err) {
      console.warn('[F3] No se pudieron inyectar datos de F2.5:', err);
    }
  }

  // PASO 0: Enriquecer contexto con búsqueda web (código puro)
  let enrichedContext = { ...body.context };
  const webSearch = new WebSearchService(env);

  // Detectar si falta información que requiere búsqueda
  const needsWebSearch = !enrichedContext.industry || !enrichedContext.courseTopic;

  if (needsWebSearch && body.promptId === 'F0') {
    console.log('[F0-ENRICH] Ejecutando búsqueda web pre-pipeline');
    
    const searchQuery = enrichedContext.courseTopic || enrichedContext.projectName;
    const searchResults = await webSearch.search(searchQuery);
    
    // Extraer industria de los resultados si no existe
    if (!enrichedContext.industry && searchResults) {
      enrichedContext.industry = extractIndustryFromResults(searchResults);
    }
    
    (enrichedContext as any).webSearchResults = searchResults;
    
    // Guardar contexto enriquecido para referencia
    await supabase.saveEnrichedContext(body.projectId, 'F0', enrichedContext);
  }

  try {
    const content = await ai.generate({
      promptId:   body.promptId as PromptId,
      context:    enrichedContext as Record<string, unknown>,
      userInputs: body.userInputs,
      onProgress: async (progress) => {
        await jobsSvc.updateJobProgress(jobId, progress);
      },
      onAgentOutput: async (agentName, output, _out): Promise<string | void> => {
        await pipelineService.saveAgentOutput(jobId, agentName, output);

        if (agentName === 'agente_preguntas' && body.promptId === 'F0') {
          try {
            const lines = output
              .split('\n')
              .map((l: string) => l.replace(/^[-\d.*)\s]+/, '').replace(/^\*\*|\*\*$/g, '').trim())
              .filter((l: string) => l.includes('?') && l.length > 5);
            
            if (lines.length > 0) {
              await supabase.saveFaseQuestions({
                projectId: body.projectId,
                faseDestino: 1,
                preguntas: lines
              });
            }
          } catch (err) {
            console.warn('[pipeline] saveFaseQuestions F0 failed:', err);
          }
        }
        if (agentName === 'ensamblador_f0' && body.promptId === 'F0') {
          return await handleF0Assembler({
            jobId,
            projectId: body.projectId,
            pipelineService,
            supabase,
            projectService
          });
        }

        if (agentName.startsWith('juez_') && (body.promptId === 'F0' || body.promptId === 'F2')) {
          try {
            const decisionObj = parseJsonSafely(output || '{}', { seleccion: 'A', razon: '' });
            const seccion = agentName.replace('juez_', '');
            
            if (body.promptId === 'F0') {
              await supabase.saveF0JuezDecision(jobId, seccion, {
                seleccion: decisionObj.seleccion || 'A',
                razon: decisionObj.razon || ''
              });
            } else {
              await supabase.saveF2JuezDecision(jobId, seccion, decisionObj);
            }
          } catch (err) {
            console.warn(`[pipeline] saveJuezDecision failed for ${agentName}:`, err);
          }
        }

        if (agentName === 'sintetizador_final' && body.promptId === 'F1') {
          try {
            const parsed = parseInformeNecesidades(output);
            const extractorRaw = await pipelineService.getAgentOutput(jobId, 'extractor').catch(() => null);
            if (extractorRaw) {
              const extractorData = parseJsonSafely(extractorRaw, null as any);
              if (extractorData) {
                if (extractorData.qa && extractorData.qa.length > 0) {
                  parsed.preguntas_respuestas = extractorData.qa
                    .filter((p: any) => p.pregunta?.trim())
                    .map((p: any) => ({ pregunta: p.pregunta, respuesta: p.respuesta ?? 'No especificada' }));
                }
                if (extractorData.perfilParticipante && Object.keys(extractorData.perfilParticipante).length > 0) {
                  parsed.perfil_participante = extractorData.perfilParticipante;
                }
              }
            }
            await supabase.saveF1Informe({ projectId: body.projectId, jobId, ...parsed });
          } catch (err) {
            console.warn('[pipeline] saveF1Informe failed:', err);
          }
        }
        if (agentName === 'sintetizador_final_f2' && body.promptId === 'F2') {
          const borradorA = (await pipelineService.getAgentOutput(jobId, 'sintetizador_a_f2')) ?? '';
          const borradorB = (await pipelineService.getAgentOutput(jobId, 'sintetizador_b_f2')) ?? '';
          const parsed = parseAnalisisF2(output);
          
          return await handleF2Assembler({
            jobId,
            projectId: body.projectId,
            projectName: body.context.projectName,
            pipelineService,
            supabase,
            borradorA,
            borradorB,
            parsed
          });
        }
        if (agentName === 'sintetizador_final_f3' && body.promptId === 'F3') {
          try {
            const parsed   = parseEspecificacionesF3(output);
            const borradorA = (await pipelineService.getAgentOutput(jobId, 'agente_doble_A_f3')) ?? '';
            const borradorB = (await pipelineService.getAgentOutput(jobId, 'agente_doble_B_f3')) ?? '';
            const juezRaw   = (await pipelineService.getAgentOutput(jobId, 'agente_juez_f3')) ?? '';
            const decMatch  = juezRaw.match(/"decision"\s*:\s*"([^"]+)"/i);
            const simMatch  = juezRaw.match(/"similitud_general"\s*:\s*(\d+)/i);
            await supabase.saveF3Especificaciones({
              projectId:            body.projectId,
              jobId,
              documento_final:      output,
              borrador_A:           borradorA,
              borrador_B:           borradorB,
              juez_decision:        decMatch?.[1] ?? 'ok',
              juez_similitud:       simMatch?.[1] ? parseInt(simMatch[1]) : 0,
              ...parsed,
            });
          } catch (err) {
            console.warn('[pipeline] saveF3Especificaciones failed:', err);
          }
        }
        if (agentName === 'sintetizador_final_f2_5' && body.promptId === 'F2_5') {
          return await handleF2_5Assembler({
            jobId,
            projectId: body.projectId,
            projectName: body.context.projectName,
            pipelineService,
            supabase
          });
        }
        if (agentName === 'sintetizador_final_f4' && body.promptId.startsWith('F4_P')) {
          try {
            const producto = body.promptId.replace('F4_', '');
            const px       = producto.toLowerCase();
            const borradorA = (await pipelineService.getAgentOutput(jobId, `agente_a_${px}`)) ?? '';
            const borradorB = (await pipelineService.getAgentOutput(jobId, `agente_b_${px}`)) ?? '';
            const juezRaw   = (await pipelineService.getAgentOutput(jobId, `juez_${px}`)) ?? '';
            const validRaw  = (await pipelineService.getAgentOutput(jobId, `validador_${px}`)) ?? '{}';
            const juezDecision = parseJsonSafely(juezRaw, {});
            const vd = parseJsonSafely(validRaw, { passed: true });
            let validacionEstado = 'aprobado';
            if (vd.passed === false) validacionEstado = 'revision_humana';
            
            const saveParams: any = {
              projectId:        body.projectId,
              producto,
              documentoFinal:   output,
              borradorA,
              borradorB,
              juezDecision,
              validacionEstado,
              jobId,
              validacionErrores: vd
            };
            await supabase.saveF4Producto(saveParams);
          } catch (err) {
            console.warn('[pipeline] saveF4Producto failed:', err);
          }
        }
      },
      getAgentOutput: async (agentName) => {
        return pipelineService.getAgentOutput(jobId, agentName);
      },
    });

    const { documentId } = await supabase.saveDocument({
      projectId: body.projectId,
      stepId:    body.stepId,
      phaseId:   body.phaseId,
      title:     `${body.phaseId} - ${body.context.projectName}`,
      content,
    });

    await jobsSvc.completeJob(jobId, { documentId, content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Pipeline error';
    await jobsSvc.failJob(jobId, msg);
  }
}
```

## F0-marco-referencia.md
```markdown
---
id: F0
name: Marco de Referencia del Cliente
version: 7.0.0
tags: [EC0366, analisis, sector, competencia]
pipeline_steps:
  # ── Extractor ────────────────────────────────────────────────────────────
  - agent: extractor_f0
    model: "llama3.1:8b"
    inputs_from: []
    include_template: false
    task: |
      Extrae del contexto: projectName, industry, courseTopic.
      El contexto YA INCLUYE resultados de búsqueda web en webSearchResults.
      NO necesitas buscar nada. Usa SOLO la información proporcionada.
      Devuelve SOLO JSON: {"projectName": "...", "industry": "...", "courseTopic": "..."}

  # ── SECCIÓN 1: SECTOR ──────────────────────────────────────────────────
  - agent: agente_sector_A
    model: "llama3.1:8b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      El contexto YA TIENE información de búsqueda web en webSearchResults.
      USA ESA INFORMACIÓN para responder. NO hagas nuevas búsquedas.
      
      IMPORTANTE: NO uses "Hallazgo con fuente", "Fuente", "Hallazgo o vacío" o "Texto" como valores.
      Si no encuentras información para un campo, déjalo vacío (cadena vacía "").

      Devuelve SOLO JSON con esta estructura:
      {
        "tamaño": "dato real con fuente específica",
        "fuente_tamaño": "nombre específico de la fuente",
        "tendencias": "dato real",
        "fuente_tendencias": "fuente específica",
        "regulaciones": "dato real o vacío",
        "fuente_regulaciones": "fuente o vacío",
        "certificaciones": "dato real o vacío",
        "fuente_certificaciones": "fuente o vacío",
        "desafios": [{"desafio": "dato real", "fuente": "fuente específica"}]
      }

  - agent: agente_sector_B
    model: "qwen2.5:7b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      El contexto YA TIENE información de búsqueda web en webSearchResults (perspectiva B).
      USA ESA INFORMACIÓN para responder. NO hagas nuevas búsquedas.
      
      IMPORTANTE: NO uses "Hallazgo con fuente", "Fuente", "Hallazgo o vacío" o "Texto" como valores.
      Si no encuentras información para un campo, déjalo vacío (cadena vacía "").

      Mismo JSON que agente_sector_A.

  - agent: juez_sector
    inputs_from: [agente_sector_A, agente_sector_B]
    include_template: false
    task: |
      Compara ambos JSON. Elige el más completo (más campos llenos, mejores fuentes).
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 2: MEJORES PRÁCTICAS ─────────────────────────────────────────
  - agent: agente_practicas_A
    model: "llama3.1:8b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      El contexto YA TIENE información de búsqueda web en webSearchResults.
      USA ESA INFORMACIÓN para identificar mejores prácticas. NO hagas nuevas búsquedas.

      REGLAS ADICIONALES:
      - Devuelve UN ARRAY de objetos. El primer carácter debe ser "[" y el último "]".
      - Cada objeto debe tener EXACTAMENTE las propiedades: practica, descripcion, fuente.
      - No uses comillas triples. No uses markdown.

      Devuelve array de objetos:
      [{"practica": "...", "descripcion": "...", "fuente": "..."}]

  - agent: agente_practicas_B
    model: "qwen2.5:7b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().
      
      El contexto YA TIENE información de búsqueda web en webSearchResults.
      USA ESA INFORMACIÓN para identificar mejores prácticas (perspectiva B).
      
      Devuelve UN ARRAY de objetos. El primer carácter debe ser "[" y el último "]".
      Cada objeto debe tener EXACTAMENTE: {"practica": "...", "descripcion": "...", "fuente": "..."}
      
      REGLAS ESTRICTAS:
      - NO uses placeholders como "texto" o "fuente".
      - Si no encuentras información para una práctica, omítela.
      
      Ejemplo CORRECTO: [
        {"practica": "Usar referencias visuales", "descripcion": "Mejorar el contraste mediante referencias", "fuente": "Artículo de arte"},
        {"practica": "Practicar con materiales básicos", "descripcion": "Experimentar sin costo adicional", "fuente": "Guía para principiantes"}
      ]

  - agent: juez_practicas
    inputs_from: [agente_practicas_A, agente_practicas_B]
    include_template: false
    task: |
      Compara ambos arrays. Elige el más completo y relevante.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 3: COMPETENCIA ──────────────────────────────────────────────
  - agent: agente_competencia_A
    model: "llama3.1:8b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().
      
      El contexto YA TIENE información de búsqueda web en webSearchResults.
      USA ESA INFORMACIÓN para identificar cursos competidores reales.
      
      Devuelve UN ARRAY de objetos. El primer carácter debe ser "[" y el último "]".
      Cada objeto debe tener EXACTAMENTE estas propiedades:
      
      {
        "curso": "nombre real del curso",
        "plataforma": "nombre de la plataforma",
        "precio": "precio en USD o 'Gratis'",
        "alumnos": "número aproximado de alumnos",
        "duracion": "duración del curso",
        "enfoque": "enfoque principal del curso",
        "oportunidad": "qué oportunidad ofrece este curso"
      }
      
      REGLAS ESTRICTAS:
      - NO uses cadenas vacías "". Si no encuentras información para un campo, omite el objeto completo.
      - Identifica competidores reales a partir del contexto.
      - Ejemplo CORRECTO: [{"curso": "Miniaturas Pro", "plataforma": "Udemy", "precio": "$29", "alumnos": "1500", "duracion": "3h", "enfoque": "Técnicas avanzadas", "oportunidad": "Aprender desde cero"}]

  - agent: agente_competencia_B
    model: "qwen2.5:7b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().
      
      El contexto YA TIENE información de búsqueda web en webSearchResults.
      USA ESA INFORMACIÓN para identificar cursos competidores (perspectiva B).
      
      Devuelve UN ARRAY de objetos. El primer carácter debe ser "[" y el último "]".
      Cada objeto debe tener EXACTAMENTE estas propiedades:
      
      {
        "curso": "nombre real del curso",
        "plataforma": "nombre de la plataforma",
        "precio": "precio en USD o 'Gratis'",
        "alumnos": "número aproximado de alumnos",
        "duracion": "duración del curso",
        "enfoque": "enfoque principal del curso",
        "oportunidad": "qué oportunidad ofrece este curso"
      }
      
      REGLAS ESTRICTAS:
      - NO uses cadenas vacías "". Si no encuentras información para un campo, omite el objeto completo.
      - Identifica competidores reales a partir del contexto.
      - Ejemplo CORRECTO: [{"curso": "Miniaturas Pro", "plataforma": "Udemy", "precio": "$29", "alumnos": "1500", "duracion": "3h", "enfoque": "Técnicas avanzadas", "oportunidad": "Aprender desde cero"}]

  - agent: juez_competencia
    inputs_from: [agente_competencia_A, agente_competencia_B]
    include_template: false
    task: |
      Compara. Elige el array más completo con datos reales.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 4: ESTÁNDARES EC ─────────────────────────────────────────────
  - agent: agente_estandares_A
    model: "llama3.1:8b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      REGLAS ADICIONALES:
      - Devuelve UN ARRAY de objetos. El primer carácter debe ser "[" y el último "]".
      - Cada objeto debe tener: codigo, nombre, proposito, aplicabilidad.
      - El código EC0366 es obligatorio. Si no hay otros estándares, devuelve solo ese.
      - NO uses comillas dobles dentro de las strings sin escapar.

      Identifica estándares EC (EC0366 es obligatorio).
      Devuelve array: [{"codigo": "EC0366", "nombre": "...", "proposito": "...", "aplicabilidad": "sí"}]

  - agent: agente_estandares_B
    model: "mistral:7b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      REGLAS ADICIONALES:
      - Devuelve UN ARRAY de objetos. El primer carácter debe ser "[" y el último "]".
      - Cada objeto debe tener: codigo, nombre, proposito, aplicabilidad.
      - El código EC0366 es obligatorio. Si no hay otros estándares, devuelve solo ese.
      - NO uses comillas dobles dentro de las strings sin escapar.

      Identifica estándares EC (perspectiva B). Mismo formato.

  - agent: juez_estandares
    inputs_from: [agente_estandares_A, agente_estandares_B]
    include_template: false
    task: |
      Compara. Elige el array más completo.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 5: GAPS ──────────────────────────────────────────────────────
  - agent: agente_gaps_A
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      Analiza brechas. Devuelve JSON:
      {"mejores_practicas": "texto", "competencia": "texto"}

  - agent: agente_gaps_B
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      Analiza brechas (perspectiva B). Mismo formato.

  - agent: juez_gaps
    inputs_from: [agente_gaps_A, agente_gaps_B]
    include_template: false
    task: |
      Compara. Elige el análisis más profundo.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 6: PREGUNTAS ─────────────────────────────────────────────────
  - agent: agente_preguntas_A
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      Genera 9 preguntas para el cliente. Devuelve array de 9 strings.

  - agent: agente_preguntas_B
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      Genera 9 preguntas (perspectiva B). Devuelve array de 9 strings.

  - agent: juez_preguntas
    inputs_from: [agente_preguntas_A, agente_preguntas_B]
    include_template: false
    task: |
      Compara. Elige el set de preguntas más relevante.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 7: RECOMENDACIONES ───────────────────────────────────────────
  - agent: agente_recomendaciones_A
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      REGLAS ADICIONALES:
      - Devuelve UN ARRAY de 3 strings. El primer carácter debe ser "[" y el último "]".
      - Cada recomendación debe ser una string corta, sin saltos de línea internos.
      - Ejemplo: ["recomendación 1", "recomendación 2", "recomendación 3"]

      Genera 3 recomendaciones. Devuelve array de 3 strings.

  - agent: agente_recomendaciones_B
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples. No uses frases como "Aquí está el resultado".
      El JSON debe ser válido y parseable directamente por JSON.parse().

      REGLAS ADICIONALES:
      - Devuelve UN ARRAY de 3 strings. El primer carácter debe ser "[" y el último "]".
      - Cada recomendación debe ser una string corta, sin saltos de línea internos.
      - Ejemplo: ["recomendación 1", "recomendación 2", "recomendación 3"]

      Genera 3 recomendaciones (perspectiva B). Devuelve array de 3 strings.

  - agent: juez_recomendaciones
    inputs_from: [agente_recomendaciones_A, agente_recomendaciones_B]
    include_template: false
    task: |
      Compara. Elige las recomendaciones más accionables.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── SECCIÓN 8: REFERENCIAS ───────────────────────────────────────────────
  - agent: agente_referencias_A
    model: "llama3.1:8b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().
      
      El contexto YA TIENE información de búsqueda web en webSearchResults.
      USA ESA INFORMACIÓN para identificar referencias bibliográficas reales.
      
      IMPORTANTE: CADA referencia debe ser un OBJETO entre LLAVES {}.
      El array completo debe comenzar con "[" y terminar con "]".
      
      Formato CORRECTO:
      [
        {"id": 1, "referencia": "Apellido, N. (Año). Título. Editorial."},
        {"id": 2, "referencia": "Apellido, N. (Año). Título. Editorial."}
      ]
      
      REGLAS ESTRICTAS:
      - CADA referencia = OBJETO con { "id": número, "referencia": "texto" }
      - NO uses arrays de pares

  - agent: agente_referencias_B
    model: "qwen2.5:7b"
    inputs_from: [extractor_f0]
    include_template: false
    task: |
      IMPORTANTE: Tu respuesta debe ser SOLO el JSON. No incluyas texto antes, después, ni explicaciones.
      No uses markdown. No uses comillas triples.
      El JSON debe ser válido y parseable directamente por JSON.parse().
      
      El contexto YA TIENE información de búsqueda web en webSearchResults.
      USA ESA INFORMACIÓN para identificar referencias bibliográficas reales (perspectiva B).
      
      IMPORTANTE: CADA referencia debe ser un OBJETO entre LLAVES {}.
      El array completo debe comenzar con "[" y terminar con "]".
      
      Formato CORRECTO:
      [
        {"id": 1, "referencia": "Apellido, N. (Año). Título. Editorial."},
        {"id": 2, "referencia": "Apellido, N. (Año). Título. Editorial."}
      ]
      
      REGLAS ESTRICTAS:
      - CADA referencia = OBJETO con { "id": número, "referencia": "texto" }
      - NO uses arrays de pares

  - agent: juez_referencias
    inputs_from: [agente_referencias_A, agente_referencias_B]
    include_template: false
    task: |
      Compara. Elige las referencias reales con mejores fuentes.
      Devuelve SOLO JSON: {"seleccion": "A" | "B", "razon": "..."}

  # ── Ensamblador (CÓDIGO PURO) ────────────────────────────────────────────
  - agent: ensamblador_f0
    inputs_from: [juez_sector, juez_practicas, juez_competencia, juez_estandares, juez_gaps, juez_preguntas, juez_recomendaciones, juez_referencias]
    include_template: false
    task: "CÓDIGO - El ensamblaje se realiza en wizard.route.ts"
---
```

## ai.service.ts
```typescript
  private async _runAgentWithTools(
    step: any,
    renderedPrompt: string,
    tools?: any[]
  ): Promise<string> {
    console.log(`[RUN_AGENT] Agente: ${step.agent}`);
    
    // Si no hay tools, usar generate normal (recomendado)
    if (!tools || tools.length === 0) {
      console.log(`[RUN_AGENT] Sin herramientas, usando generate`);
      return await this.provider.generate(renderedPrompt, step.model);
    }
    
    // Fallback para fases que aún usan tools (legacy)
    console.log(`[RUN_AGENT] Con herramientas (legacy), usando chat`);
    const formattedTools = tools.map(tool => ({
      type: 'function',
      function: {
        name: typeof tool === 'string' ? tool : tool.name,
        description: tool.description || '',
        parameters: tool.parameters || {
          type: 'object',
          properties: { query: { type: 'string' } },
          required: ['query']
        }
      }
    }));
    
    const response = await this.provider.chat(renderedPrompt, formattedTools);
    return response.content;
  }
```

## supabase.service.ts
```typescript
  /**
   * Guarda el contexto enriquecido con resultados de búsqueda web
   */
  async saveEnrichedContext(
    projectId: string,
    phaseId: string,
    enrichedContext: Record<string, unknown>
  ): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client
      .from('pipeline_jobs')
      .update({ enriched_context: enrichedContext })
      .eq('project_id', projectId)
      .eq('phase_id', phaseId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.warn('[Supabase] Error saving enriched context:', error);
    }
  }
```

## 018_add_enriched_context.sql
```sql
-- Agregar columna enriched_context a pipeline_jobs
ALTER TABLE pipeline_jobs
ADD COLUMN IF NOT EXISTS enriched_context JSONB DEFAULT '{}'::jsonb;

-- Crear índice GIN para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_enriched_context 
ON pipeline_jobs USING gin (enriched_context);

-- Comentario para documentación
COMMENT ON COLUMN pipeline_jobs.enriched_context IS 'Contexto enriquecido con resultados de búsqueda web pre-pipeline';
```
