-- Grant permissions for service_role on critical tables
GRANT ALL ON TABLE projects TO service_role, authenticated, anon;
GRANT ALL ON TABLE documents TO service_role, authenticated, anon;
GRANT ALL ON TABLE wizard_steps TO service_role, authenticated, anon;
GRANT ALL ON TABLE fase0_componentes TO service_role, authenticated, anon;
GRANT ALL ON TABLE pipeline_agent_outputs TO service_role, authenticated, anon;
GRANT ALL ON TABLE pipeline_jobs TO service_role, authenticated, anon;

-- Ensure sequences if any
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role, authenticated, anon;
