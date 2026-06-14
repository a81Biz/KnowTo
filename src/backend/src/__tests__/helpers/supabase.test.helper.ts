// backend/src/__tests__/helpers/supabase.test.helper.ts
//
// Helpers para tests de integración con Supabase self-hosted.
// Uso: solo cuando SUPABASE_URL está definida en el entorno (tests de integración reales).
// Los tests unitarios con mocks no necesitan este helper.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL              = process.env['SUPABASE_URL']              ?? 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

let _testClient: SupabaseClient | null = null;

/**
 * Devuelve un cliente Supabase con service_role para operaciones de test
 * (lectura/escritura sin restricciones RLS).
 */
export function createTestSupabaseClient(): SupabaseClient {
  if (!_testClient) {
    _testClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _testClient;
}

/**
 * Limpia las tablas de datos de test entre casos.
 * Solo borra filas cuyo user_id sea el DEV_USER_ID o que tengan project_id de test.
 *
 * Llamar en beforeEach de los tests de integración que necesiten estado limpio.
 */
export async function clearTestDatabase(): Promise<void> {
  const client = createTestSupabaseClient();

  // Borrar en orden para respetar foreign keys
  const tables = [
    'pipeline_jobs',
    'cce_step_outputs',
    'cce_extracted_contexts',
    'cce_documents',
    'cce_steps',
    'cce_projects',
    'dcfl_extracted_contexts',
    'dcfl_documents',
    'dcfl_steps',
    'dcfl_projects',
  ];

  for (const table of tables) {
    // Filtramos por user_id de dev para no borrar datos de producción accidentalmente
    await client
      .from(table)
      .delete()
      .eq('user_id', '00000000-0000-0000-0000-000000000001');
  }
}
