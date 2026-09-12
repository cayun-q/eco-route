-- Canonical schema (same as apps/api/src/db/migrations/001_init.sql).
-- Applied by `npm run db:migrate`. Safe to inspect or load by hand.

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emission_factors (
  id SERIAL PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('car', 'plane', 'train')),
  subtype TEXT NOT NULL,
  grams_co2e_per_mile NUMERIC,
  grams_co2e_per_hour NUMERIC,
  source TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT emission_factors_has_intensity CHECK (
    grams_co2e_per_mile IS NOT NULL OR grams_co2e_per_hour IS NOT NULL
  ),
  CONSTRAINT emission_factors_unique UNIQUE (mode, subtype, source, year)
);

CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  origin_lat NUMERIC,
  origin_lng NUMERIC,
  dest_lat NUMERIC,
  dest_lng NUMERIC,
  mode TEXT NOT NULL CHECK (mode IN ('car', 'plane', 'train')),
  subtype TEXT NOT NULL,
  distance_miles NUMERIC NOT NULL CHECK (distance_miles >= 0),
  duration_minutes NUMERIC NOT NULL CHECK (duration_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL DEFAULT 'local',
  emission_factor_id INTEGER NOT NULL REFERENCES emission_factors (id),
  grams_co2e NUMERIC NOT NULL,
  from_distance NUMERIC NOT NULL,
  from_duration NUMERIC NOT NULL,
  client_id TEXT NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trips_client_id_unique UNIQUE (client_id)
);

CREATE INDEX IF NOT EXISTS trips_logged_at_idx ON trips (logged_at DESC);
CREATE INDEX IF NOT EXISTS trips_user_id_idx ON trips (user_id);
CREATE INDEX IF NOT EXISTS emission_factors_mode_subtype_idx
  ON emission_factors (mode, subtype)
  WHERE is_active;
