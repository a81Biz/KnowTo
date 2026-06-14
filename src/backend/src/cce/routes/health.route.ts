// src/cce/routes/health.route.ts
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Env } from '../../core/types/env';

const routeHealth = createRoute({
  method: 'get',
  path: '/',
  tags: ['cce'],
  summary: 'Health check CCE',
  description: 'Verifica que el microsite EC0249 (Consultoría) está activo. No requiere autenticación.',
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
            .openapi('CceHealthResponse'),
        },
      },
    },
  },
});

const health = new OpenAPIHono<{ Bindings: Env }>();

health.openapi(routeHealth, (c) =>
  c.json({
    success: true as const,
    service: 'knowto-cce',
    environment: c.env.ENVIRONMENT ?? 'unknown',
    timestamp: new Date().toISOString(),
  })
);

export { health };
