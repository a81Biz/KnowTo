-- Migration 053: Clean up orphan documents (step_id = NULL) created by the
-- PT-167 bug where saveDocument was called without p_step_id before the backend
-- was properly restarted. Also resets wizard_steps to pending so users can
-- regenerate and have them correctly marked as 'completed'.

-- Step 1: Delete documents with no step association
DELETE FROM documents
WHERE step_id IS NULL;

-- Step 2: Reset wizard_steps that are 'pending' or 'processing' but have no
-- associated document (output_text already NULL from migration 052)
UPDATE wizard_steps
SET    status     = 'pending',
       output_text = NULL,
       updated_at = NOW()
WHERE  status IN ('pending', 'processing')
  AND  output_text IS NULL;
