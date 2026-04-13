# FORMATO DE ENTRADA DEL CLIENTE PARA EL CONSULTOR

## PROPÓSITO

Este documento es el **insumo principal** del micrositio `cce.sitio`. El usuario (consultor) debe llenarlo con la información de la empresa antes de comenzar a usar los prompts. La IA tomará estos datos como entrada para la Fase 0 (Marco de referencia).

---

## INSTRUCCIONES PARA EL USUARIO

1. **Completa todos los campos** que puedas. Si no sabes algo, escribe "no definido".
2. **Sé específico** en las respuestas. Cuanto más detalle, mejor será la investigación de la IA.
3. **Este documento se arrastra** como referencia en todas las fases del proceso.
4. **Guarda este archivo** como `DATOS_EMPRESA_[nombre_proyecto].md`

---

## FORMATO PARA LLENAR

```markdown
# DATOS BÁSICOS DE LA EMPRESA
**Fecha de captura:** [DD/MM/AAAA]
**Versión:** 1.0

## 1. IDENTIFICACIÓN DE LA EMPRESA

| Campo | Respuesta |
|:---|:---|
| Nombre de la empresa | [texto] |
| Nombre comercial (si aplica) | [texto] |
| Giro o actividad principal | [texto] |
| Sector económico | [seleccionar o escribir] |
| Subsector (si se conoce) | [texto] |

## 2. UBICACIÓN Y OPERACIONES

| Campo | Respuesta |
|:---|:---|
| Ciudad | [texto] |
| Estado | [texto] |
| ¿Tiene múltiples centros de trabajo? | [Sí / No] |
| Años de operación en México | [número] |
| ¿La empresa es parte de una corporación? | [Sí / No] |

## 3. TAMAÑO Y ESTRUCTURA

| Campo | Respuesta |
|:---|:---|
| Número total de trabajadores | [número] |
| Número de trabajadores sindicalizados | [número o 0] |
| ¿La empresa tiene más de 50 trabajadores? | [Sí / No] |
| Principales áreas o departamentos | [lista separada por comas] |
| Número de trabajadores por área | [texto] |

## 4. SÍNTOMAS O PROBLEMAS CONOCIDOS

| Campo | Respuesta |
|:---|:---|
| ¿Cuál es el problema principal que el cliente quiere resolver? | [texto] |
| ¿Qué síntomas observables hay? (mínimo 2-3) | [lista] |
| ¿Desde cuándo ocurre? | [texto] |
| ¿Hay datos cuantitativos? (ej. porcentajes, números) | [texto] |
| ¿El cliente ha intentado algo para resolverlo? | [texto] |

## 5. OBLIGACIONES Y CAPACITACIÓN PREVIA

| Campo | Respuesta |
|:---|:---|
| ¿La empresa tiene registro patronal ante el IMSS? | [Sí / No / No sé] |
| ¿Ha presentado Programas Anuales de Capacitación (DC-2) ante la STPS? | [Sí / No / No sé] |
| ¿Tiene Comisión Mixta de Capacitación? (si tiene >50 es obligatoria) | [Sí / No / No aplica] |
| ¿Ha recibido inspecciones de la STPS? | [Sí / No / No sé] |
| ¿Han dado capacitación en los últimos 2 años? | [Sí / No] |
| ¿Tienen constancias DC-3 de esas capacitaciones? | [Sí / No / No sé] |

## 6. RECURSOS DISPONIBLES PARA CAPACITACIÓN

| Campo | Respuesta |
|:---|:---|
| ¿Hay presupuesto asignado para capacitación? | [Sí / No / No sé] |
| ¿Cuentan con instalaciones para capacitación presencial? | [Sí / No / Parcial] |
| ¿Cuentan con LMS o plataforma de aprendizaje? | [Sí / No] |
| ¿Hay personal interno que pueda fungir como instructor? | [Sí / No / Parcial] |
| ¿Hay disponibilidad horaria para capacitarse? | [Alta / Media / Baja / No sé] |

## 7. EXPECTATIVAS DEL CLIENTE

| Campo | Respuesta |
|:---|:---|
| ¿Qué espera lograr con este proceso de consultoría? | [texto] |
| ¿Hay algún resultado específico que quiera medir? | [texto] |
| ¿En qué plazo espera ver resultados? | [texto] |
| ¿Hay restricciones o condiciones especiales? | [texto] |

## 8. DATOS DE CONTACTO

| Campo | Respuesta |
|:---|:---|
| Nombre del contacto principal | [texto] |
| Cargo | [texto] |
| Correo electrónico | [email] |
| Teléfono | [texto] |
| Horario disponible para entrevistas | [texto] |

## 9. PRESENCIA DIGITAL DEL CLIENTE (opcional pero RECOMENDADO)

| Campo | Respuesta |
|:---|:---|
| **Sitio web (URL)** | [texto]  |
| **Redes sociales (URLs)** | [lista]  |
| **¿Qué redes son las más activas?** | [lista] |
| **¿Hay perfiles de reseñas?** | [lista] |

```

## EJEMPLO REAL (CASO TECHIC AGENCY)

```markdown
# DATOS BÁSICOS DE LA EMPRESA
**Fecha de captura:** 05/04/2026
**Versión:** 1.0

## 1. IDENTIFICACIÓN DE LA EMPRESA
| Campo | Respuesta |
|:---|:---|
| Nombre de la empresa | TECHIC Agency |
| Nombre comercial | TECHIC |
| Giro o actividad principal | Producción creativa y dirección visual |
| Sector económico | Servicios profesionales / Marketing |
| Subsector | Agencia de publicidad y producción audiovisual |

## 2. UBICACIÓN Y OPERACIONES
| Campo | Respuesta |
|:---|:---|
| Ciudad | Ciudad de México |
| Estado | CDMX |
| ¿Tiene múltiples centros de trabajo? | No |
| Años de operación | 8 años |
| ¿Es parte de una corporación? | No |

## 3. TAMAÑO Y ESTRUCTURA
| Campo | Respuesta |
|:---|:---|
| Número total de trabajadores | 45 |
| Número de trabajadores sindicalizados | 0 |
| ¿Tiene más de 50 trabajadores? | No |
| Principales áreas | Producción, Estrategia y cuentas, Administración |
| Número por área | Producción: 25, Cuentas: 12, Administración: 8 |

## 4. SÍNTOMAS O PROBLEMAS CONOCIDOS
| Campo | Respuesta |
|:---|:---|
| Problema principal | Entregas fuera de tiempo y errores en postproducción |
| Síntomas | 40% entregas fuera de tiempo, 6 renuncias último año, quejas de 2 clientes (30% ingresos) |
| ¿Desde cuándo? | Últimos 6-8 meses |
| Datos cuantitativos | 40% entregas fuera de tiempo, 35% aumento horas extras |
| ¿Intentaron algo? | Contrataron más personal, no funcionó |

## 5. OBLIGACIONES Y CAPACITACIÓN PREVIA
| Campo | Respuesta |
|:---|:---|
| ¿Registro patronal IMSS? | Sí |
| ¿Ha presentado DC-2? | No |
| ¿Tiene Comisión Mixta? | No aplica |
| ¿Inspecciones STPS? | No |
| ¿Capacitación últimos 2 años? | Sí, cursos internos de software |
| ¿Constancias DC-3? | No |

## 6. RECURSOS DISPONIBLES
| Campo | Respuesta |
|:---|:---|
| ¿Presupuesto para capacitación? | No definido |
| ¿Instalaciones presenciales? | Sí, sala de juntas |
| ¿Cuentan con LMS? | No |
| ¿Personal instructor interno? | Parcial (líderes de área) |
| ¿Disponibilidad horaria? | Media |

## 7. EXPECTATIVAS DEL CLIENTE
| Campo | Respuesta |
|:---|:---|
| ¿Qué espera lograr? | Reducir entregas fuera de tiempo y estandarizar procesos |
| ¿Resultado medible? | Reducir reprocesos en un 50% en 3 meses |
| ¿Plazo? | 3-6 meses |
| ¿Restricciones? | Capacitación en horario laboral, máximo 4 horas/semana |

## 8. DATOS DE CONTACTO
| Campo | Respuesta |
|:---|:---|
| Nombre del contacto | Laura |
| Cargo | Directora General |
| Correo | laura@techic.agency |
| Teléfono | 55 1234 5678 |
| Horario disponible | Lunes a viernes 10am-1pm |

## 9. PRESENCIA DIGITAL DEL CLIENTE (opcional pero RECOMENDADO)

| Campo | Respuesta |
|:---|:---|
| **Sitio web (URL)** | [ej. "https://techic.agency"] |
| **Redes sociales (URLs)** | [ej. "https://instagram.com/techic", "https://linkedin.com/company/techic", "https://facebook.com/techic"] |
| **¿Qué redes son las más activas?** | [ej. "Instagram y LinkedIn"] |
| **¿Hay perfiles de reseñas?** | [ej. "Google Maps, Trustpilot"] |

```

## VALIDACIÓN DEL FORMATO

Antes de comenzar F0, verifica que:

- [ ] Todos los campos están completos (o marcados como "no definido")
- [ ] El nombre de la empresa y sector están claramente especificados
- [ ] Los síntomas están descritos con datos específicos
- [ ] El número de trabajadores es correcto (determina si aplica Comisión Mixta)

**Este documento es el PUNTO DE PARTIDA. Sin él, el aplicativo no puede funcionar.**