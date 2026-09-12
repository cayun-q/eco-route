-- Passenger CO₂e factors from UK DESNZ / DEFRA GHG Conversion Factors 2024.
-- The API calculator reads these rows. It does not hardcode g/km.
INSERT INTO emission_factors (mode, g_per_km, source, notes)
VALUES
  (
    'car',
    164.5400,
    'DESNZ/DEFRA 2024',
    'Average car, unknown fuel, passenger. kg CO2e/km converted to g/km.'
  ),
  (
    'plane',
    245.8700,
    'DESNZ/DEFRA 2024',
    'Short-haul flight to/from UK, average passenger, with radiative forcing.'
  ),
  (
    'train',
    35.4900,
    'DESNZ/DEFRA 2024',
    'National rail, passenger. kg CO2e/pkm converted to g/km.'
  )
ON CONFLICT (mode) DO NOTHING;
