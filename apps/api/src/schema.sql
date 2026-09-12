CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS emission_factors (
  id SERIAL PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('car', 'plane', 'train')),
  band TEXT,
  activity TEXT NOT NULL,
  kg_co2e_per_km NUMERIC(12, 6) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg CO2e / passenger.km',
  source TEXT NOT NULL,
  year INT NOT NULL,
  UNIQUE (mode, band)
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  distance_km NUMERIC(12, 3) NOT NULL,
  duration_min NUMERIC(12, 2) NOT NULL,
  co2e_kg NUMERIC(12, 4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_legs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seq INT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('car', 'plane', 'train')),
  origin_label TEXT NOT NULL,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  origin_kind TEXT NOT NULL,
  origin_place_id TEXT,
  origin_iata TEXT,
  destination_label TEXT NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,
  destination_kind TEXT NOT NULL,
  destination_place_id TEXT,
  destination_iata TEXT,
  distance_km NUMERIC(12, 3) NOT NULL,
  duration_min NUMERIC(12, 2) NOT NULL,
  co2e_kg NUMERIC(12, 4) NOT NULL,
  factor_id INT REFERENCES emission_factors(id),
  kg_co2e_per_km NUMERIC(12, 6) NOT NULL,
  polyline JSONB NOT NULL,
  UNIQUE (trip_id, seq)
);

CREATE INDEX IF NOT EXISTS trip_legs_trip_id_idx ON trip_legs (trip_id, seq);
CREATE INDEX IF NOT EXISTS trips_created_at_idx ON trips (created_at DESC);
