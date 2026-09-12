CREATE TABLE IF NOT EXISTS emission_factors (
  mode TEXT PRIMARY KEY,
  g_per_km NUMERIC(12, 4) NOT NULL,
  source TEXT NOT NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_label TEXT NOT NULL,
  destination_label TEXT NOT NULL,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lng DOUBLE PRECISION NOT NULL,
  mode TEXT NOT NULL,
  distance_km NUMERIC(12, 3) NOT NULL,
  duration_min INTEGER NOT NULL,
  co2e_kg NUMERIC(12, 3) NOT NULL,
  polyline JSONB NOT NULL,
  factor_g_per_km NUMERIC(12, 4) NOT NULL,
  factor_source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trips_created_at_idx ON trips (created_at DESC);
