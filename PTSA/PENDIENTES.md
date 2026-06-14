# PENDIENTES — Bloqueantes y preguntas abiertas
**Motor v4.1**

---

## Bloqueantes activos

Ninguno. La auditoría puede proceder de forma autónoma.

---

## Preguntas abiertas

| # | Pregunta | Fase relevante | Prioridad |
|:---|:---|:---|:---|
| Q-001 | ¿El stack Docker está corriendo actualmente? (necesario para F5/F8 con queries reales a la BD) | F5, F8 | ALTA |
| Q-002 | ¿Los 8 productos F4 han sido generados para algún proyecto real de prueba? (necesario para F6) | F6 | ALTA |
| Q-003 | ¿Existe un `.env` con `TAVILY_API_KEY` real o solo el dev value? | F5 | MEDIA |
| Q-004 | ¿Por qué existe `src/backend/src/graphify-out/` dentro del source del backend? ¿Error de path en graphify? | F2 | BAJA |

---

## Elementos a confirmar con el usuario

- Q-001 es crítico para las fases F5 y F8. Si Docker no está corriendo, documentar como bloqueante parcial.
