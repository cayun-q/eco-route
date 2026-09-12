-- Passenger CO₂e factors from UK DESNZ / DEFRA GHG Conversion Factors 2024.
-- EV factor uses the EPA eGRID / MY2025 assumptions already used by distance_ecotourism.py.
-- The API calculator reads these rows. It does not hardcode g/km.
DELETE FROM emission_factors WHERE mode = 'train';

INSERT INTO emission_factors (mode, g_per_km, source, notes)
VALUES
  (
    'car',
    164.5400,
    'DESNZ/DEFRA 2024',
    'Average car, unknown fuel, passenger. kg CO2e/km converted to g/km.'
  ),
  (
    'ev',
    84.3325,
    'EPA eGRID 2023 + EPA MY2025',
    'Battery EV using U.S. average grid CO2 (0.767209 lb/kWh) and EPA Model Year 2025 median EV energy use (39 kWh/100 mi).'
  ),
  (
    'plane',
    245.8700,
    'DESNZ/DEFRA 2024',
    'Short-haul flight to/from UK, average passenger, with radiative forcing.'
  )
ON CONFLICT (mode) DO NOTHING;
