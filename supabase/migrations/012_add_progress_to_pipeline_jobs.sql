-- Migration 012: Add progress column to pipeline_jobs
ALTER TABLE pipeline_jobs ADD COLUMN IF NOT EXISTS progress JSONB DEFAULT '{"currentStep": null, "stepIndex": 0, "totalSteps": 0}'::jsonb;

-- Optional: Add index for faster queries on progress
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_progress ON pipeline_jobs USING gin (progress);
