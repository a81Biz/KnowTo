// src/routes/health.route.ts
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Env } from '../types/env';

const routeHealth = createRoute({
  method: 'get',
  path: '/',
  tags: ['Sistema'],
  summary: 'Health check',
  description: 'Verifica que el worker está activo. No requiere autenticación.',
  responses: {
    200: {
      description: 'Servicio activo',
      content: {
        'application/json': {
          schema: z
            .object({
              success: z.literal(true),
              service: z.string(),
              environment: z.string(),
              timestamp: z.string(),
            })
            .openapi('HealthResponse'),
        },
      },
    },
  },
});

const health = new OpenAPIHono<{ Bindings: Env }>();

health.openapi(routeHealth, (c) =>
  c.json({
    success: true as const,
    service: 'knowto-backend',
    environment: c.env.ENVIRONMENT ?? 'unknown',
    timestamp: new Date().toISOString(),
  })
);

export { health };
