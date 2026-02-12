-- ============================================================================
-- 007_consolidate_reports.sql — Consolidate pre_report_id and final_report_id into single report_id
-- ============================================================================

-- Add new report_id column
ALTER TABLE missions ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES reports(id);

-- Migrate existing data: prioritize final_report_id, fallback to pre_report_id
UPDATE missions
SET report_id = COALESCE(final_report_id, pre_report_id)
WHERE report_id IS NULL AND (final_report_id IS NOT NULL OR pre_report_id IS NOT NULL);

-- Drop old columns
ALTER TABLE missions DROP COLUMN IF EXISTS pre_report_id;
ALTER TABLE missions DROP COLUMN IF EXISTS final_report_id;

-- Add index for report_id
CREATE INDEX IF NOT EXISTS idx_missions_report_id ON missions(report_id);

-- Add comment
COMMENT ON COLUMN missions.report_id IS 'Single report that starts as draft and transitions to completed';
