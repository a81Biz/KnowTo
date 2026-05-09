import { OpenAPIHono } from '@hono/zod-openapi';
import type { Env } from '../../core/types/env';
import { handleTestRunAll, handleTestReset } from '../handlers/test.handlers';

const router = new OpenAPIHono<{ Bindings: Env }>();

// POST /test/run-all  { projectId }
// Fires all 8 F4 products sequentially in background. Returns 202 immediately.
router.post('/run-all', handleTestRunAll);

// DELETE /test/reset/:projectId
// Removes fase4_productos, producto_form_schemas, pipeline_jobs (F4) for a project.
router.delete('/reset/:projectId', handleTestReset);

export { router as testRoutes };
