-- =============================================================================
-- Neighborly MVP — Initial Schema
-- Migration: 001_initial_schema.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- Helpers: updated_at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------

CREATE TABLE profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL DEFAULT '',
  avatar_url   TEXT,
  neighborhood TEXT,
  location     GEOGRAPHY(POINT, 4326),
  bio          TEXT,
  rating       NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
  exchanges    INT           NOT NULL DEFAULT 0,
  verified     BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_profiles_location ON profiles USING GIST (location);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_all"
  ON profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Trigger: auto-create profile row on auth.users INSERT
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. listings
-- ---------------------------------------------------------------------------

CREATE TYPE listing_status AS ENUM ('available', 'reserved', 'given');
CREATE TYPE price_type     AS ENUM ('free', 'symbolic');

CREATE TABLE listings (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID           NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT           NOT NULL,
  description  TEXT,
  category     TEXT           NOT NULL,
  images       TEXT[]         NOT NULL DEFAULT '{}',
  location     GEOGRAPHY(POINT, 4326),
  neighborhood TEXT,
  status       listing_status NOT NULL DEFAULT 'available',
  price_type   price_type     NOT NULL DEFAULT 'free',
  price_euro   NUMERIC(6, 2),
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_listings_location ON listings USING GIST (location);
CREATE INDEX idx_listings_owner    ON listings (owner_id);
CREATE INDEX idx_listings_status   ON listings (status);

-- RLS
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listings_read_all"
  ON listings FOR SELECT
  USING (TRUE);

CREATE POLICY "listings_insert_own"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "listings_update_own"
  ON listings FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "listings_delete_own"
  ON listings FOR DELETE
  USING (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- 3. conversations
-- ---------------------------------------------------------------------------

CREATE TABLE conversations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID        REFERENCES listings(id) ON DELETE SET NULL,
  participant_1 UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2 UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_different_participants CHECK (participant_1 <> participant_2),
  UNIQUE (participant_1, participant_2, listing_id)
);

CREATE INDEX idx_conversations_p1 ON conversations (participant_1);
CREATE INDEX idx_conversations_p2 ON conversations (participant_2);

-- RLS — only participants can see their conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_participants_only"
  ON conversations FOR SELECT
  USING (
    auth.uid() = participant_1 OR
    auth.uid() = participant_2
  );

CREATE POLICY "conversations_insert_participant"
  ON conversations FOR INSERT
  WITH CHECK (
    auth.uid() = participant_1 OR
    auth.uid() = participant_2
  );

-- ---------------------------------------------------------------------------
-- 4. messages
-- ---------------------------------------------------------------------------

CREATE TABLE messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);

-- Realtime (publication must exist; default supabase_realtime publication used)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_read_participants"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

CREATE POLICY "messages_insert_sender"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 5. notifications
-- ---------------------------------------------------------------------------

CREATE TYPE notification_type AS ENUM ('listing', 'message', 'reservation', 'pickup');

CREATE TABLE notifications (
  id         UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT              NOT NULL,
  body       TEXT,
  read       BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);

-- RLS — own only
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own_only"
  ON notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. reviews
-- ---------------------------------------------------------------------------

CREATE TABLE reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reviewer_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (listing_id, reviewer_id)
);

CREATE INDEX idx_reviews_reviewee ON reviews (reviewee_id);

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_read_all"
  ON reviews FOR SELECT
  USING (TRUE);

CREATE POLICY "reviews_insert_reviewer"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- ---------------------------------------------------------------------------
-- Helper function: nearby_listings(lat, lng, radius_km)
-- Returns listings within radius ordered by distance.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION nearby_listings(
  lat       FLOAT,
  lng       FLOAT,
  radius_km FLOAT DEFAULT 5
)
RETURNS TABLE (
  id           UUID,
  owner_id     UUID,
  title        TEXT,
  description  TEXT,
  category     TEXT,
  images       TEXT[],
  neighborhood TEXT,
  status       listing_status,
  price_type   price_type,
  price_euro   NUMERIC,
  distance_km  FLOAT,
  created_at   TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.owner_id,
    l.title,
    l.description,
    l.category,
    l.images,
    l.neighborhood,
    l.status,
    l.price_type,
    l.price_euro,
    ROUND(
      (ST_Distance(
        l.location::geography,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
      ) / 1000.0)::NUMERIC,
      2
    )::FLOAT AS distance_km,
    l.created_at
  FROM listings l
  WHERE
    l.location IS NOT NULL AND
    l.status = 'available' AND
    ST_DWithin(
      l.location::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
