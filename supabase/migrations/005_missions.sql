-- ============================================================================
-- 005_missions.sql — Missions & Push Subscriptions + Notifications
-- ============================================================================

-- Mission status enum
DO $$ BEGIN
  CREATE TYPE mission_status AS ENUM (
    'created',
    'assigned',
    'in_progress',
    'waiting_completion',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Mission type enum
DO $$ BEGIN
  CREATE TYPE mission_type AS ENUM ('roof');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Mission sub-type enum
DO $$ BEGIN
  CREATE TYPE mission_subtype AS ENUM ('cleaning', 'coating');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Missions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Assignment
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_workers UUID[] DEFAULT '{}',

  -- Status
  status mission_status NOT NULL DEFAULT 'created',

  -- Client Info
  client_first_name TEXT NOT NULL,
  client_last_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  client_address TEXT NOT NULL,
  client_latitude DECIMAL(10, 8),
  client_longitude DECIMAL(11, 8),

  -- Appointment
  appointment_time TIMESTAMPTZ NOT NULL,

  -- Mission Details
  mission_type mission_type NOT NULL DEFAULT 'roof',
  mission_subtypes mission_subtype[] NOT NULL DEFAULT '{}',
  surface_area DECIMAL(10, 2),
  facade_count INTEGER DEFAULT 1,
  additional_info TEXT,

  -- Property Features
  features JSONB DEFAULT '{}',

  -- Timer
  before_pictures_submitted_at TIMESTAMPTZ,
  completion_unlocked_at TIMESTAMPTZ,

  -- Report references
  pre_report_id UUID REFERENCES reports(id),
  final_report_id UUID REFERENCES reports(id),

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_appointment ON missions(appointment_time);
CREATE INDEX IF NOT EXISTS idx_missions_assigned_workers ON missions USING GIN(assigned_workers);
CREATE INDEX IF NOT EXISTS idx_missions_created_by ON missions(created_by);

-- ============================================================================
-- updated_at trigger (reuse existing function if available)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_missions_updated_at ON missions;
CREATE TRIGGER update_missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS — Missions
-- ============================================================================
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can do everything on missions" ON missions;
CREATE POLICY "Admins can do everything on missions"
  ON missions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT auth.uid())
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Workers can view their assigned missions" ON missions;
CREATE POLICY "Workers can view their assigned missions"
  ON missions FOR SELECT
  USING ((SELECT auth.uid()) = ANY(assigned_workers));

DROP POLICY IF EXISTS "Workers can update their assigned missions" ON missions;
CREATE POLICY "Workers can update their assigned missions"
  ON missions FOR UPDATE
  USING ((SELECT auth.uid()) = ANY(assigned_workers));

-- ============================================================================
-- Push Subscriptions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- In-app Notifications table
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- Admins/service role can insert notifications for any user (handled via service role key)
