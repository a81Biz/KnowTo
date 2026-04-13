# FASE 3 - Especificaciones Técnicas del PAC y Cursos

## PROPÓSITO
Calcular la duración total del PAC, definir recursos necesarios, calendarizar los cursos y especificar requisitos técnicos (LMS si aplica).

## JUSTIFICACIÓN
- S4 (Sesión 4): Etapas del PAC, asignación de recursos
- EC0301: Modalidades de impartición
- STPS: Formato DC-2 para PAC

## REGLAS OBLIGATORIAS
1. Duración total del PAC no debe exceder 2 años (LFT Art. 153H).
2. Calendarización realista (considerar tiempo de desarrollo e impartición).
3. Recursos específicos y alcanzables.

## ENTRADAS

### Entrada 1: Cursos priorizados y modalidad (de F2)
[PEGAR AQUÍ LA TABLA DE CURSOS PRIORIZADOS]

### Entrada 2: Recomendaciones pedagógicas (de F2_5)
[PEGAR AQUÍ ACTIVIDADES Y DURACIONES]

### Entrada 3: Datos de la empresa
[PEGAR AQUÍ TAMAÑO, UBICACIÓN, RECURSOS DISPONIBLES]

## INSTRUCCIONES

Genera EXACTAMENTE estas 4 secciones:

### Sección 1: DURACIÓN TOTAL DEL PAC
- Tabla con columnas: Tipo de curso, Cantidad, Horas por curso, Total horas
- Vigencia del PAC (fecha inicio a fecha fin)
- ¿Cumple con LFT Art. 153H? (Sí/No - justificar)

### Sección 2: RECURSOS NECESARIOS
- Recursos humanos (perfil, cantidad, justificación)
- Recursos materiales (recurso, cantidad, disponibilidad sugerida)
- Recursos tecnológicos (recurso, cantidad, justificación)

### Sección 3: CALENDARIZACIÓN POR TRIMESTRE
- Trimestre 1 (meses 1-3): cursos urgentes
- Trimestre 2 (meses 4-6): cursos necesarios
- Trimestre 3 (meses 7-9): cursos necesarios/críticos
- Trimestre 4 (meses 10-12): cursos críticos

### Sección 4: ESPECIFICACIONES TÉCNICAS (si aplica curso en línea)
- LMS recomendado (nombre, justificación, URL)
- Formatos multimedia (video, audio, documentos)
- Requisitos de navegación
- Accesibilidad (estándar aplicable)

## FORMATO DE SALIDA ESPERADO

```markdown
## 1. DURACIÓN TOTAL DEL PAC

| Tipo de curso | Cantidad | Horas por curso | Total horas |
|---------------|----------|-----------------|-------------|
| Urgentes | [n] | [horas] | [total] |
| Necesarios | [n] | [horas] | [total] |
| Críticos | [n] | [horas] | [total] |
| **TOTAL** | **[n]** | | **[total]** |

**Vigencia del PAC:** [fecha] a [fecha]
**¿Cumple con LFT Art. 153H?** [Sí/No - justificar]

## 2. RECURSOS NECESARIOS

### Recursos humanos
- [Perfil]: [cantidad] - [justificación]

### Recursos materiales
- [Recurso]: [cantidad] - [disponibilidad]

### Recursos tecnológicos
- [Recurso]: [cantidad] - [justificación]

## 3. CALENDARIZACIÓN POR TRIMESTRE

### Trimestre 1 (meses 1-3)
- [Curso 1] - [fechas]
- [Curso 2] - [fechas]

### Trimestre 2 (meses 4-6)
- [Curso 3] - [fechas]
- [Curso 4] - [fechas]

### Trimestre 3 (meses 7-9)
- [Curso 5] - [fechas]

### Trimestre 4 (meses 10-12)
- [Curso 6] - [fechas]

## 4. ESPECIFICACIONES TÉCNICAS

### LMS recomendado
- Nombre: [LMS]
- Justificación: [texto]
- URL de referencia: [link]

### Formatos multimedia
- Video: [especificaciones]
- Audio: [especificaciones]
- Documentos: [formato]

### Requisitos de navegación
- [Requisito 1]
- [Requisito 2]

### Accesibilidad
- [Estándar aplicable] - [justificación o "no aplica"]
```

## LISTA DE VERIFICACIÓN
- [ ] ¿Tiene 4 secciones con headers exactos?
- [ ] ¿Tabla de duración total completa?
- [ ] ¿Recursos humanos, materiales y tecnológicos especificados?
- [ ] ¿Calendarización por trimestre con fechas?
- [ ] ¿Especificaciones técnicas incluidas (si aplica)?