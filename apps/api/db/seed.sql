-- Carbon baselines ported from score-ui for surface modes.
-- Plane keeps Luma's existing DESNZ/DEFRA factor.
DELETE FROM emission_factors WHERE mode = 'train';

INSERT INTO emission_factors (mode, g_per_km, source, notes)
VALUES
  ('car', 171.0000, 'score-ui baseline', 'Average petrol passenger car baseline used by score-ui.'),
  ('ev', 45.0000, 'score-ui baseline', 'Battery EV on a typical grid mix; same road route as car.'),
  ('bus', 89.0000, 'score-ui baseline', 'Average local bus per passenger-kilometre.'),
  ('bike', 0.0000, 'score-ui baseline', 'No direct exhaust emissions; excludes food and lifecycle emissions.'),
  ('walk', 0.0000, 'score-ui baseline', 'No direct exhaust emissions; excludes food and lifecycle emissions.'),
  ('plane', 245.8700, 'DESNZ/DEFRA 2024', 'Short-haul flight to/from UK, average passenger, with radiative forcing.')
ON CONFLICT (mode) DO UPDATE SET
  g_per_km = EXCLUDED.g_per_km,
  source = EXCLUDED.source,
  notes = EXCLUDED.notes,
  updated_at = NOW();
