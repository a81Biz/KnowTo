-- =============================================================================
-- run_all.sql - Ejecuta todas las migraciones en orden
-- Este archivo se monta en /docker-entrypoint-initdb.d/ y Postgres lo ejecuta
-- automáticamente al iniciar (incluso si el volumen ya existe)
-- =============================================================================

-- Nota: \ir incluye archivos relativos al directorio donde está run_all.sql
-- Como run_all.sql está en /docker-entrypoint-initdb.d/run_all.sql,
-- los archivos referenciados deben estar en el mismo directorio.

\ir 001_create_projects.sql
\ir 002_create_wizard_steps.sql
\ir 003_create_pipeline_jobs.sql
\ir 004_create_pipeline_agent_outputs.sql
\ir 005_create_documents.sql
\ir 006_add_soft_delete_to_projects.sql
\ir 007_add_project_status.sql
\ir 008_create_chat_analysis.sql
\ir 009_create_agent_analysis.sql
\ir 010_create_evaluation_results.sql
\ir 011_create_preguntas_fase.sql
\ir 012_create_fase1_informe_necesidades.sql
\ir 013_create_fase2_analisis_alcance.sql
\ir 014_create_fase2_resolucion_discrepancias.sql
\ir 015_create_fase3_especificaciones.sql
\ir 016_create_fase2_5_recomendaciones.sql
\ir 017_create_fase4_productos.sql

-- Todas las migraciones futuras se añaden aquí arriba