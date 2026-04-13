## FASE 4 SUB-WIZARD (7 productos)

Debido a la extensión, aquí están los **encabezados y requisitos mínimos** para cada uno.

### F4_P0_CONSULTOR: PAC (Formato DC-2)

```markdown
# PROMPT F4_P0_CONSULTOR - PAC (Formato DC-2)

## PROPÓSITO
Generar el Programa Anual de Capacitación en formato DC-2 según Acuerdo STPS 14/jun/2013.

## ENTRADAS
[PEGAR AQUÍ: cursos priorizados de F2, especificaciones de F3, datos de la empresa]

## SALIDA REQUERIDA
- Datos generales de la empresa
- Vigencia del plan
- Número de trabajadores a capacitar
- Tabla de cursos con: nombre, objetivo, duración, periodo, población
- Firma del patrón o representante legal
- Firma del representante de los trabajadores (si aplica)
```

### F4_P1_CONSULTOR: Carta Descriptiva (EC0301)

```markdown
# PROMPT F4_P1_CONSULTOR - Carta Descriptiva (EC0301)

## PROPÓSITO
Generar la carta descriptiva del curso prioritario según EC0301.

## ENTRADAS
[PEGAR AQUÍ: estructura temática de F2, recomendaciones pedagógicas de F2_5, perfil de ingreso de F2]

## SALIDA REQUERIDA
- Datos generales del curso (nombre, duración, modalidad, perfil del participante)
- Objetivo general (integrando 3 áreas de dominio)
- Objetivos particulares por módulo (mínimo 3 módulos)
- Contenido temático (módulos, temas, subtemas)
- Metodología y técnicas instruccionales
- Recursos y requerimientos
- Estrategia de evaluación (diagnóstica, formativa, sumativa)
```

### F4_P2_CONSULTOR: Manual del Instructor (EC0301)

```markdown
# PROMPT F4_P2_CONSULTOR - Manual del Instructor (EC0301)

## PROPÓSITO
Generar el manual del instructor para el curso prioritario.

## ENTRADAS
[PEGAR AQUÍ: carta descriptiva (F4_P1)]

## SALIDA REQUERIDA
- Guía de impartición sesión por sesión
- Para cada sesión: duración, objetivo, actividades del instructor, actividades de los participantes, materiales, puntos clave
- Sugerencias para manejo de grupos
- Solucionario o respuestas esperadas
```

### F4_P3_CONSULTOR: Instrumentos de Evaluación (EC0301)

```markdown
# PROMPT F4_P3_CONSULTOR - Instrumentos de Evaluación (EC0301)

## PROPÓSITO
Generar los instrumentos de evaluación: cuestionario, lista de cotejo y rúbrica.

## ENTRADAS
[PEGAR AQUÍ: carta descriptiva (F4_P1)]

## SALIDA REQUERIDA
- Cuestionario (mínimo 10 preguntas, mixto)
- Lista de cotejo (mínimo 10 ítems)
- Rúbrica (mínimo 5 criterios, 4 niveles de desempeño)
- Escala de calificación
```

### F4_P4_CONSULTOR: Materiales Didácticos (EC0301)

```markdown
# PROMPT F4_P4_CONSULTOR - Materiales Didácticos (EC0301)

## PROPÓSITO
Generar la estructura de los materiales didácticos: presentación y guías de trabajo.

## ENTRADAS
[PEGAR AQUÍ: carta descriptiva (F4_P1)]

## SALIDA REQUERIDA
- Estructura de presentación electrónica (mínimo 10 diapositivas con descripción de contenido visual)
- Guías de trabajo o lecturas complementarias (mínimo 2)
- Cada guía con: propósito, instrucciones, contenido, ejercicios
```

### F4_P5_CONSULTOR: Formato DC-5 (Registro del Curso ante STPS)

```markdown
# PROMPT F4_P5_CONSULTOR - DC-5 (Registro del Curso ante STPS)

## PROPÓSITO
Generar el formato DC-5 llenado para que el consultor registre el curso ante la STPS.

## ENTRADAS
[PEGAR AQUÍ: datos del consultor (nombre, RFC, domicilio), datos del curso de F4_P1]

## SALIDA REQUERIDA
- Homoclave del formato (STPS-04-005)
- Datos del solicitante (nombre, RFC, domicilio, correo, teléfono)
- Datos del programa (nombre, duración, área temática, población objetivo)
- Temas principales (mínimo 3, máximo 5)
- Declaración y firma
```

### F4_P6_CONSULTOR: Reporte Ejecutivo para el Cliente

```markdown
# PROMPT F4_P6_CONSULTOR - Reporte Ejecutivo para el Cliente

## PROPÓSITO
Generar un reporte ejecutivo que resuma todo el trabajo para presentar al cliente.

## ENTRADAS
[PEGAR AQUÍ: diagnóstico (F1_2), PAC (F4_P0), carta descriptiva (F4_P1)]

## SALIDA REQUERIDA
- Resumen del diagnóstico (problema central, causa raíz)
- Solución propuesta (cursos urgentes, necesarios, críticos)
- Cronograma de ejecución
- Recursos necesarios
- Próximos pasos (call to action)
```

---
