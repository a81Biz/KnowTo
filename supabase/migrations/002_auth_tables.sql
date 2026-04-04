-- =============================================================================
-- KNOWTO - Migration 002: Auth & RLS Policies
-- =============================================================================

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE wizard_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Profiles: solo el propio usuario puede leer/editar
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Projects: solo el dueño puede acceder
CREATE POLICY "Users can manage own projects"
  ON projects FOR ALL USING (auth.uid() = user_id);

-- Wizard steps: a través de project ownership
CREATE POLICY "Users can manage own wizard steps"
  ON wizard_steps FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = wizard_steps.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Documents: a través de project ownership
CREATE POLICY "Users can manage own documents"
  ON documents FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = documents.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Auto-crear profile al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
