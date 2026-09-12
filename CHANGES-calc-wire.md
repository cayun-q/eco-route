# Calc wire — ecotourism port into Express estimate

## What changed

Faithful TypeScript port of `distance_ecotourism.py` into `@carbonroute/shared` (`packages/shared/src/ecotourism.ts`), wired into the Express `POST /estimate` path so **car** and **plane** no longer use DESNZ/Postgres factor lookups.

Companion uploads (not parsed at request time) live at:

- `apps/api/calc/distance_ecotourism.py`
- `apps/api/calc/ecotourism_emissions_backup_and_france_america.xlsx`

### Shared package

- New: `packages/shared/src/ecotourism.ts` — constants + `greatCircleMiles`, `roadDistanceMiles`, `carCo2LbPerMile`, `evCo2LbPerMile`, `carTripEmissions`, `classifyFlight`, `planeCo2LbPerPassenger`, `planeTripEmissions`, `compareTrip`, `lbToKg`
- New: `packages/shared/src/ecotourism.test.ts` — golden NY→LA distances, Pittsburgh→NYC compare, classify thresholds, 1.08 uplift
- `packages/shared/src/index.ts` re-exports ecotourism
- Existing `emissions.test.ts` / `kgFromDistance` kept for **train**

### API

- `apps/api/src/services/emissions.ts` — `emissionsFor(mode, distanceKm, options?)`
  - **car**: `carTripEmissions`; default vehicle `gas_average`, passengers `1`; `total_co2_lb → co2eKg`; source `EPA tailpipe (MVP presets)` (EV: EPA eGRID 2023…)
  - **plane**: `planeTripEmissions` (economy, `classifyFlight`, uplift on); source `UK Government 2026 GHG (direct CO2 + 8% distance uplift)`
  - **train**: unchanged DESNZ seed via `loadFactor` + `kgFromDistance`
- `apps/api/src/routes/estimate.ts` — optional body: `passengers`, `vehicle`, `cabinClass` (mobile still works with origin/destination/mode only)
- Haversine duration may use Python defaults (car 55 mph; plane 500 mph + 0.5 h); Mapbox/Google/ORS durations are not overwritten

### ROAD_FACTOR policy (documented in emissions.ts)

Applied **only for car CO2** when `provider === "haversine"` (great-circle × 1.25), matching the Python MVP. Real road providers (mapbox/google/ors) use routed `distanceKm` as-is. **Not** applied to plane display distance; plane’s 8% uplift stays inside the plane CO2 factor only.

### vsDriving

For plane/train: driving comparison uses `gas_average` on road distance ≈ `distanceKm * ROAD_FACTOR` (or optional `drivingDistanceKm`). For car: `drivingCo2eKg` / `vsDrivingKg` stay `null`.

## Defaults

| Knob | Default |
|------|---------|
| Car vehicle | `gas_average` (30 mpg gasoline) |
| Plane cabin | `economy` |
| Passengers | `1` |
| Train | DESNZ seed / Postgres (`~35.49 g/km`) — **not** from Python |

## Golden Pittsburgh → New York (2 passengers, lb/person, 1 decimal)

From Python `compare_trip` / TS port:

| Mode | lb/person |
|------|-----------|
| Battery EV | 58.9 |
| Hybrid | 77.1 |
| Gasoline — efficient car | 110.2 |
| Gasoline — average car | 128.5 |
| Diesel car | 147.2 |
| Plane — Domestic — Economy | 149.6 |
| Gasoline — SUV | 192.8 |

NY→LA: fly ~2446 mi, drive ~3057 mi.

## Mismatches vs Python

None resolved as mismatches: goldens match. Note the Python docstring for `classify_flight` mentions mile bands; the **code** (and this port) uses **km** bands (`<1000` domestic, `<3700` short_haul), which is what the tests assert.
