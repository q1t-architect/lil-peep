-- =============================================================================
-- Neighborly MVP — Reservations, triggers, and profile stats
-- Migration: 003_reservations_and_triggers.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Reservation status enum & table
-- ---------------------------------------------------------------------------

CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

CREATE TABLE reservations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  borrower_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       reservation_status NOT NULL DEFAULT 'pending',
  mode         TEXT        NOT NULL CHECK (mode IN ('borrow', 'reserve')),
  pickup_code  TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservations_listing  ON reservations (listing_id);
CREATE INDEX idx_reservations_borrower ON reservations (borrower_id);
CREATE INDEX idx_reservations_owner    ON reservations (owner_id);

CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_read_participants"
  ON reservations FOR SELECT
  USING (auth.uid() = borrower_id OR auth.uid() = owner_id);

CREATE POLICY "reservations_insert_borrower"
  ON reservations FOR INSERT
  WITH CHECK (auth.uid() = borrower_id);

CREATE POLICY "reservations_update_participants"
  ON reservations FOR UPDATE
  USING (auth.uid() = borrower_id OR auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- 2. RPC: create reservation atomically + notify owner
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_reservation(
  p_listing_id  UUID,
  p_borrower_id UUID,
  p_mode        TEXT,
  p_pickup_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_reservation_id UUID;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM listings
  WHERE id = p_listing_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF v_owner_id = p_borrower_id THEN
    RAISE EXCEPTION 'Cannot borrow your own item';
  END IF;

  INSERT INTO reservations (listing_id, borrower_id, owner_id, status, mode, pickup_code)
  VALUES (p_listing_id, p_borrower_id, v_owner_id, 'pending', p_mode, p_pickup_code)
  RETURNING id INTO v_reservation_id;

  UPDATE listings
  SET status = 'reserved'
  WHERE id = p_listing_id;

  INSERT INTO notifications (user_id, type, title, body)
  VALUES (
    v_owner_id,
    'reservation',
    'New borrow request',
    'Someone wants to borrow your item. Open your profile to see details.'
  );

  RETURN jsonb_build_object(
    'id', v_reservation_id,
    'pickup_code', p_pickup_code,
    'status', 'pending'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. RPC: recalculate profile rating & exchanges from reviews
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION recalculate_profile_stats(p_profile_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_avg   NUMERIC(3,2);
BEGIN
  SELECT COUNT(*), COALESCE(AVG(rating), 0)::NUMERIC(3,2)
  INTO v_count, v_avg
  FROM reviews
  WHERE reviewee_id = p_profile_id;

  UPDATE profiles
  SET exchanges = v_count,
      rating    = v_avg,
      updated_at = NOW()
  WHERE id = p_profile_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Trigger: recalculate profile stats on new review
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_on_review_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM recalculate_profile_stats(NEW.reviewee_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_recalculate ON reviews;
CREATE TRIGGER trg_reviews_recalculate
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION trg_on_review_insert();
