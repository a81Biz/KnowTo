-- Migration 050: Canonical Production Spec freeze gate (PT-159)
-- Adds a user-confirmation flag to `projects` so production pipelines
-- (F4/F5/F6/F7) can block unless the instructor has explicitly confirmed
-- the canonical spec (temario + video plan + tracking standard) is ready.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS canonical_spec_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS canonical_spec_frozen_at TIMESTAMPTZ;

COMMENT ON COLUMN projects.canonical_spec_frozen IS
  'PT-159: TRUE when the instructor has confirmed temario_base + F2.5 + F3 specs. '
  'Required gate before any F4/F5/F6/F7 pipeline job can run.';
