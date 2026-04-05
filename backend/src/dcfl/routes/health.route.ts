// src/dcfl/routes/health.route.ts
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Env } from '../../core/types/env';

const routeHealth = createRoute({
  method: 'get',
  path: '/',
  tags: ['dcfl'],
  summary: 'Health check DCFL',
  description: 'Verifica que el microsite EC0366 está activo. No requiere autenticación.',
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
            .openapi('DcflHealthResponse'),
        },
      },
    },
  },
});

const health = new OpenAPIHono<{ Bindings: Env }>();

health.openapi(routeHealth, (c) =>
  c.json({
    success: true as const,
    service: 'knowto-dcfl',
    environment: c.env.ENVIRONMENT ?? 'unknown',
    timestamp: new Date().toISOString(),
  })
);

export { health };
