
# DOCUMENTO 2: BATERÍA DE PROMPTS 


# BATERÍA DE PROMPTS ESPECÍFICOS PARA EC0366

## ESTRUCTURA GENERAL

| Fase | Nombre | Prompt | Propósito |
|:---|:---|:---|:---|
| **F0** | Marco de referencia | F0 | Investigar sector, competencia, mejores prácticas, estándares EC |
| **F1** | Informe de necesidades | F1 | Analizar brecha, declarar problema, definir objetivos SMART |
| **F2** | Especificaciones de análisis | F2 | Definir modalidad, interactividad, estructura, perfil de ingreso |
| **F3** | Especificaciones técnicas | F3 | Definir LMS, reporteo, formatos, duración calculada |
| **F4** | Producción (UNIFICADO) | F4 | Generar 8 productos (E1219 + E1220 completos) |
| **F5.1** | Verificación | F5.1 | Generar checklist, plantilla y ejemplo de reporte |
| **F5.2** | Evidencias | F5.2 | Generar anexo de capturas obligatorias |
| **F6.1** | Ajustes | F6.1 | Documentar correcciones post-evaluación |
| **F6.2** | Firmas | F6.2 | Generar formato de firmas para todos los productos |

---

## FORMATO ESTÁNDAR PARA CADA PROMPT

Cada prompt sigue esta estructura:

1. **Rol de la IA**
2. **Entrada que recibe** (del usuario o de fases anteriores)
3. **Proceso que debe seguir** (pasos específicos)
4. **Formato de salida** (estructura obligatoria)
5. **Instrucción de calidad** (qué no hacer)

---

## DIAGRAMA DE FLUJO DE PROMPTS (VERSIÓN FINAL)


┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO COMPLETO DE PROMPTS EC0366                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────────────────┐
                    │   INPUT USUARIO:                     │
                    │   DATOS BÁSICOS DEL CLIENTE          │
                    │   (Formato estándar - Documento 4)   │
                    └─────────────────┬────────────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │     F0        │
                              │ Marco de      │
                              │ referencia    │
                              └───────┬───────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │     F1        │
                              │ Informe de    │
                              │ necesidades   │
                              └───────┬───────┘
                                      │
                                      ▼
                              ┌─────────────────┐
                              │     F2          │
                              │ Especificaciones│
                              │ de análisis     │
                              └───────┬─────────┘
                                      │
                                      ▼
                              ┌─────────────────┐
                              │     F3          │
                              │ Especificaciones│
                              │ técnicas +      │
                              │ Duración        │
                              └───────┬─────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │     F4        │
                              │ PRODUCCIÓN    │
                              │ (UNIFICADO)   │
                              │               │
                              │ Genera 8      │
                              │ productos:    │
                              │ Prod 0 a 7    │
                              └───────┬───────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
            │ ACCIÓN MANUAL │ │    F5.1       │ │    F5.2       │
            │ Subir a LMS   │ │ Verificación  │ │ Anexo de      │
            │ Configurar    │ │ (checklist +  │ │ evidencias    │
            │               │ │  plantilla +  │ │ (capturas)    │
            │               │ │  ejemplo)     │ │               │
            └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │    F6.1       │
                              │ Ajustes       │
                              │ documentados  │
                              └───────┬───────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │    F6.2       │
                              │ Firmas        │
                              └───────┬───────┘
                                      │
                                      ▼
                    ┌───────────────────────────────────────┐
                    │   CURSO COMPLETO PARA CERTIFICACIÓN   │
                    │   EC0366                              │
                    └───────────────────────────────────────┘


---

## LISTA DE VERIFICACIÓN FINAL PARA EL USUARIO

### Antes de comenzar F0
- [ ] Tengo los **datos básicos del cliente** listos (Documento 4)
- [ ] Tengo acceso a internet para que la IA investigue el sector y la competencia

### Antes de F1
- [ ] Recibí el **Marco de referencia (F0)** de la IA
- [ ] Revisé la investigación y respondí las **preguntas específicas** que la IA me hizo

### Antes de F2
- [ ] Confirmé que el **Informe de necesidades (F1)** refleja correctamente el problema a resolver

### Antes de F3
- [ ] Confirmé las **Especificaciones de análisis (F2)** : modalidad, interactividad, estructura, perfil de ingreso

### Antes de F4
- [ ] Confirmé las **Especificaciones técnicas (F3)** : plataforma, reporteo, duración

### Antes de F5.1 y F5.2
- [ ] Recibí los **productos de F4** (8 productos: Prod 0 al 7)
- [ ] Subí todos los materiales a mi **plataforma LMS**
- [ ] Configuré las actividades según las guías
- [ ] Tengo **cuentas de prueba** (admin, instructor, alumno)

### Antes de F6.1
- [ ] Realicé las **pruebas funcionales** usando la checklist de F5.1
- [ ] Tomé las **capturas de pantalla** listadas en F5.2
- [ ] Llené el **reporte de revisión** con mis observaciones reales
- [ ] Corregí las observaciones críticas y mayores

### Antes de F6.2
- [ ] Completé el **Documento de ajustes (F6.1)** confirmando que el curso está listo
- [ ] Firmé todos los productos que requieren firma (según F6.2)

### Final
- [ ] Tengo mi **expediente completo** con todos los productos firmados y las capturas


---
