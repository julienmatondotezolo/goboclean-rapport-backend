-- ============================================================================
-- 006_remove_created_status.sql — Remove 'created' from mission_status enum
-- ============================================================================

-- Step 1: Update any existing missions with status 'created' to 'assigned'
UPDATE missions SET status = 'assigned' WHERE status = 'created';

-- Step 2: Change default from 'created' to 'assigned'
ALTER TABLE missions ALTER COLUMN status SET DEFAULT 'assigned';

-- Step 3: Recreate enum without 'created'
-- PostgreSQL doesn't support DROP VALUE from enum, so we need to recreate
ALTER TYPE mission_status RENAME TO mission_status_old;

CREATE TYPE mission_status AS ENUM (
    'assigned',
    'in_progress',
    'waiting_completion',
    'completed',
    'cancelled'
);

-- Step 4: Convert column to new enum
ALTER TABLE missions 
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE mission_status USING status::text::mission_status,
    ALTER COLUMN status SET DEFAULT 'assigned';

-- Step 5: Drop old enum
DROP TYPE mission_status_old;
