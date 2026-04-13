# PROMPT F0_CONSULTOR - Marco de Referencia del Cliente

## PROPÓSITO
Investigar a fondo el sector de la empresa, identificar NOMs aplicables, estándares EC relacionados, benchmarking y mejores prácticas. Generar preguntas específicas para el cliente.

## JUSTIFICACIÓN
- S1 (Sesión 1): Marco normativo - la LFT y STPS aplican diferente por sector
- EC0249 (Elemento 1): Establecer acuerdos con el cliente - investigación de contexto

## REGLAS OBLIGATORIAS
1. NO inventes ningún referente normativo, técnico o bibliográfico.
2. Para cada afirmación, busca y cita la fuente (link del DOF para NOMs, link del CONOCER para ECs).
3. Si no encuentras fuente confiable, INDÍCALO y PREGUNTA al usuario.
4. Prioriza: dof.gob.mx para NOMs, conocer.gob.mx para ECs.

## ENTRADAS

### Entrada 1: Datos básicos de la empresa
[PEGAR AQUÍ LOS DATOS BÁSICOS DE LA EMPRESA - incluir: nombre, sector, tamaño, años, ubicación, síntomas conocidos]

## INSTRUCCIONES

Genera el siguiente documento con EXACTAMENTE estas 6 secciones. Cada sección debe tener su header exacto.

### Sección 1: ANÁLISIS DEL SECTOR/INDUSTRIA
- Clasificación SCIAN (con fuente INEGI)
- Características del sector en México
- Tendencias y desafíos comunes
- Factores críticos de éxito
- **Cada afirmación debe tener fuente**

### Sección 2: NOMs APLICABLES AL SECTOR
- Lista cada NOM encontrada con:
  - Número y nombre completo
  - Link al DOF
  - Qué regula (1-2 líneas)
  - Por qué aplica a esta empresa
- **Mínimo 2 NOMs, máximo 5**

### Sección 3: ESTÁNDARES EC OBLIGATORIOS O RECOMENDADOS
- Lista cada EC encontrado con:
  - Clave y nombre completo
  - Link al CONOCER
  - Relevancia para la empresa
  - ¿Obligatorio o recomendado?
- **Mínimo 2 ECs, máximo 4**

### Sección 4: BENCHMARKING Y MEJORES PRÁCTICAS
- 3 mejores prácticas del sector
- Cada una con: nombre, fuente, descripción, cómo aplica a esta empresa

### Sección 5: ANÁLISIS DE GAPS INICIALES
- Compara los síntomas conocidos con las mejores prácticas
- Lista de brechas (mínimo 3)
- Cada brecha con: descripción, evidencia, prioridad

### Sección 6: RECOMENDACIONES INICIALES
- 3-5 recomendaciones generales
- Cada una con: descripción, justificación, fuente

### Sección 7: PREGUNTAS PARA EL CLIENTE (máximo 10)
- Preguntas cerradas o semiabiertas
- Basadas en los hallazgos de tu investigación
- Ejemplo: "En una escala del 1 al 10, ¿qué tan documentado está...?"

## FORMATO DE SALIDA ESPERADO

```markdown
## 1. ANÁLISIS DEL SECTOR/INDUSTRIA
[contenido]

## 2. NOMs APLICABLES AL SECTOR
[contenido]

## 3. ESTÁNDARES EC OBLIGATORIOS O RECOMENDADOS
[contenido]

## 4. BENCHMARKING Y MEJORES PRÁCTICAS
[contenido]

## 5. ANÁLISIS DE GAPS INICIALES
[contenido]

## 6. RECOMENDACIONES INICIALES
[contenido]

### Preguntas para el cliente (máximo 10)
1. [Pregunta 1]
2. [Pregunta 2]
...