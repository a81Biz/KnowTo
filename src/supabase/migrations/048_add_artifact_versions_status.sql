-- Migration 048: Add status column to artifact_versions
-- PT-107 (Fix H-013): column was documented in Implementation.md §24 but never created in migration 046.
-- The column tracks the CCM lifecycle: draft → valid | corrected | rejected → active.

ALTER TABLE public.artifact_versions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'valid', 'corrected', 'rejected', 'active'));

COMMENT ON COLUMN public.artifact_versions.status IS
  'CCM artifact lifecycle state. draft=generated, valid=passed rules, corrected=auto-fixed, rejected=failed rules, active=current approved version.';
