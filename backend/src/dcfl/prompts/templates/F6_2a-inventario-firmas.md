---
id: F6_2a
name: Lista de Verificación e Inventario del Expediente EC0366
version: 1.0.0
tags: [EC0366, firmas, inventario, expediente, certificacion]
---

Actúa como un coordinador de certificación EC0366 responsable del cierre del expediente ante el CONOCER.

## CONTEXTO ACUMULADO DEL PROYECTO
{{context}}

## DATOS DE ENTRADA DEL USUARIO EN ESTA FASE
{{userInputs}}

## INSTRUCCIÓN
Genera ÚNICAMENTE el inventario completo del expediente y los espacios de firma. No generes el resumen ejecutivo ni la declaración final (esos son parte de F6_2b).

Usa el contexto acumulado para determinar qué documentos están completados y llenar los datos disponibles.

## FORMATO DE SALIDA OBLIGATORIO

# LISTA DE VERIFICACIÓN E INVENTARIO DEL EXPEDIENTE EC0366
**Proyecto:** {{projectName}}
**Candidato:** {{clientName}}
**Folio de expediente:** EC0366-[AÑO]-[4 dígitos aleatorios]
**Fecha de elaboración:** {{fechaActual}}

---

## 1. INVENTARIO COMPLETO DEL EXPEDIENTE

| # | Documento | Fase | Elemento EC | Estado | Páginas aprox. | Firma requerida |
|:---|:---|:---|:---|:---|:---|:---|
| 1 | Marco de Referencia del Cliente | F0 | E1219 | Completado | 2 | Candidato |
| 2 | Informe de Necesidades de Capacitación | F1 | E1219 | Completado | 4 | Candidato |
| 3 | Especificaciones de Análisis | F2 | E1219 | Completado | 3 | Candidato |
| 4 | Recomendaciones Pedagógicas | F2.5 | E1219 | Completado | 2 | Candidato |
| 5 | Especificaciones Técnicas | F3 | E1219 | Completado | 3 | Candidato |
| 6 | Cronograma de Desarrollo | F4-P8 | E1219 | {EVALUAR_P8} | {PAGS} | Candidato + Revisor |
| 7 | Documento de Información General | F4-P1 | E1219 | {EVALUAR_P1} | {PAGS} | Candidato |
| 8 | Guías de Actividades por Módulo | F4-P5 | E1220 | {EVALUAR_P5} | {PAGS} | Candidato |
| 9 | Calendario General de Actividades | F4-P6 | E1220 | {EVALUAR_P6} | {PAGS} | Candidato |
| 10 | Documentos de Texto (contenido) | F4-P4 | E1220 | {EVALUAR_P4} | {PAGS} | Candidato |
| 11 | Presentación Electrónica | F4-P2 | E1220 | {EVALUAR_P2} | {PAGS} | Candidato |
| 12 | Guiones de Material Multimedia | F4-P3 | E1220 | {EVALUAR_P3} | {PAGS} | Candidato |
| 13 | Instrumentos de Evaluación | F4-P7 | E1220 | {EVALUAR_P7} | {PAGS} | Candidato + Revisor |
| 14 | Checklist de Verificación Técnica y Pedagógica | F5 | E1221 | {EVALUAR_F5} | {PAGS} | Candidato + Evaluador |
| 15 | Anexo de Evidencias | F5.2 | E1221 | {EVALUAR_F5_2} | {PAGS} | Candidato |
| 16 | Documento de Ajustes Post-Evaluación | F6 | E1221 | {EVALUAR_F6} | {PAGS} | Candidato |

**Documentos completados:** {CALCULAR_TOTAL_COMPLETADOS} de 16
**Documentos pendientes:** {CALCULAR_TOTAL_PENDIENTES} de 16

---

## 2. FIRMAS DE CIERRE

### Candidato a Certificación
**Nombre completo:** [clientName del contexto]
**CURP:** [candidateCurp de userInputs o "_________________________"]
**Firma:** _________________________
**Fecha:** _________________________

### Revisor Técnico
**Nombre completo:** [reviewerName de userInputs o "_________________________"]
**Cargo:** [reviewerRole de userInputs o "_________________________"]
**Firma:** _________________________
**Fecha:** _________________________

### Coordinador del Proceso (Organismo Certificador)
**Nombre completo:** [certifierName de userInputs o "_________________________"]
**Organismo Certificador:** [certifierOrg de userInputs o "_________________________"]
**Firma:** _________________________
**Fecha:** _________________________

## INSTRUCCIONES DE CALIDAD
- CRÍTICO PARA EL INVENTARIO: El array "productosTerminados" en el contexto contiene todos los productos (P1, P2... P8) que realmente están generados. Si un producto está en ese array, pon su estado como "Completado".
- CRÍTICO PARA F5 y F6: El array "documentosAdicionalesTerminados" contiene los IDs (ej: "F5.1", "F5.2", "F6.1"). Si el documento está allí, pon "Completado".
- Reemplaza los placeholders {EVALUAR_PX}, {EVALUAR_FX}, {PAGS}, {CALCULAR...} con el texto real calculado. NUNCA imprimas llaves en el resultado.
- El folio debe generarse con formato EC0366-[AÑO actual]-[4 dígitos].
- Responde SOLO en español. Genera únicamente este documento, sin preámbulos.
