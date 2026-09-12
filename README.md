# CarbonRoute

Passenger trip ledger. Log origin and destination, preview the route on a map, and store CO₂e from a **Postgres factor table** — not a hardcoded g/km.

This is an Expo + Express + Postgres monorepo. The mobile app stays Expo (not Vite). The map appears **only after both ends are set**.

## How to run

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run seed          # writes DESNZ/DEFRA 2024 factors if the table is empty
npm run api           # Express on http://127.0.0.1:43124
npm run web           # Expo web on http://127.0.0.1:43123
```

Native: `npm run mobile`, then open in Expo Go. Point `EXPO_PUBLIC_API_URL` at your machine.

Without Docker, create a Postgres database and set `DATABASE_URL`. The API runs `init.sql` + `seed.sql` on boot.

### Optional routing keys

Leave these blank for mock geocode + haversine / great-circle polylines.

| Env | Provider |
| --- | --- |
| `MAPBOX_ACCESS_TOKEN` | Mapbox Directions |
| `GOOGLE_MAPS_API_KEY` | Google Directions |
| `ORS_API_KEY` | OpenRouteService |

Plane and **train** trips always use a great-circle / haversine path plus `MODE_SPEED_KMH` (train ≈ 110 km/h, 20 min overhead). That is a rough duration — not a timetable. Road providers apply only to car.

## Product flow

1. **Home** — ledger totals and recent trips. Empty until you log one.
2. **Log trip** — type origin and destination, pick car / plane / train.
3. After **both** fields have values, `POST /api/routes/estimate` returns a polyline. The map then shows markers, the line, and distance / duration / CO₂e chips.
4. **Save** → `POST /api/trips` → **Results**. Home refreshes on focus.
5. Offline: last factor table is cached; failed saves go into a trip queue and flush when the API is reachable. Offline estimates use the same gazetteer + calculator.

## Structure

```
apps/api            Express + Postgres
  db/init.sql       schema
  db/seed.sql       emission_factors (DESNZ/DEFRA 2024)
  src/routes        /api/health, /factors, /routes/estimate, /trips, /stats
  src/services      geocode, routing, emissions calculator
apps/mobile         Expo (iOS / Android / web)
  src/theme.ts      eco-rough tokens
  src/ui.tsx        Card, Button, Chip, EmptyState, Field
  src/screens       Home, LogTrip, Results, TripDetail
  src/components    TripCard, RouteMap, MapPreview
  src/offline.ts    factor cache + trip queue
packages/shared     types, kgFromDistance, haversine, gazetteer
```

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | DB ping |
| GET | `/api/factors` | Factor table for the offline cache |
| POST | `/api/routes/estimate` | `{ origin, destination, mode }` → places, polyline, distance, duration, `co2eKg`, factor used, `provider` |
| GET | `/api/trips` | Recent trips |
| POST | `/api/trips` | Persist a logged trip |
| GET | `/api/trips/:id` | One trip |
| GET | `/api/stats` | Totals for Home |

Emissions: `co2eKg = distanceKm * factor.gPerKm / 1000`. The grams-per-km value is loaded from `emission_factors`.

### Rough train estimate

`POST /api/routes/estimate` with `mode: "train"` geocodes both ends (gazetteer, `lat,lng`, or Nominatim) and returns distance, duration, a great-circle polyline, and CO₂e from the train row in `emission_factors`. Mapbox / Google / ORS are not required.

```bash
curl -s http://127.0.0.1:43124/api/routes/estimate \
  -H 'Content-Type: application/json' \
  -d '{"origin":"Portland, OR","destination":"Seattle, WA","mode":"train"}'
```

Without the API or mobile app, the same calculator runs locally (gazetteer + haversine; CO₂e uses the DESNZ/DEFRA 2024 seed factor unless `G_PER_KM` is set):

```bash
npm run estimate -- "Portland, OR" "Seattle, WA"
# optional third arg: car | plane | train (default train)
```

## Eco-rough UI

Paper field-notebook: `#F2EEE4` ground, moss accent `#4A6741`, clay `#A65D3F` for high-emission chips. Cards are radius 8 with a 1px line and a hard 2px offset — no blur. Primary buttons are flat moss and darken on press. Chips are chunky; selected state is accent. Empty states are title + body only. Map chrome is paper / moss; map tiles stay white. Screens use theme tokens only.

## Tests

```bash
npm test
```

Shared tests cover the calculator and polyline helpers. They fail if someone hardcodes g/km into `kgFromDistance`.
