-- =============================================================================
-- Neighborly MVP — Reports, Blocks & Content Moderation
-- Migration: 003_reports_and_blocks.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. reports
-- ---------------------------------------------------------------------------

CREATE TYPE report_reason AS ENUM ('spam', 'inappropriate', 'scam', 'harassment', 'illegal', 'other');
CREATE TYPE report_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');
CREATE TYPE report_target_type AS ENUM ('profile', 'listing', 'message');

CREATE TABLE reports (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type     report_target_type NOT NULL,
  target_id       UUID           NOT NULL,   -- profile_id, listing_id, or message_id
  target_owner_id UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  reason          report_reason  NOT NULL,
  details         TEXT,
  status          report_status  NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_reporter ON reports (reporter_id, created_at DESC);
CREATE INDEX idx_reports_target    ON reports (target_type, target_id);
CREATE INDEX idx_reports_status    ON reports (status);

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_own"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_read_own"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- ---------------------------------------------------------------------------
-- 2. blocks
-- ---------------------------------------------------------------------------

CREATE TABLE blocks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (blocker_id, blocked_id),
  CONSTRAINT chk_block_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks (blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks (blocked_id);

-- RLS
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks_manage_own"
  ON blocks FOR ALL
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- ---------------------------------------------------------------------------
-- 3. listings moderation flag
-- ---------------------------------------------------------------------------

ALTER TABLE listings ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS flagged_reason TEXT;

-- ---------------------------------------------------------------------------
-- 4. Helper: check if user A is blocked by user B (either direction)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_blocked(a UUID, b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = a AND blocked_id = b)
       OR (blocker_id = b AND blocked_id = a)
  );
END;
$$ LANGUAGE plpgsql STABLE;
