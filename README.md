# Luma

Passenger travel carbon ledger. Log an origin and destination, preview the route on a map, and store estimated CO₂e from a **Postgres factor table** rather than a hardcoded g/km value.

Luma is an Expo + Express + Postgres monorepo. The app runs on iOS, Android, and web from the same React Native codebase.

## How to run

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run seed
npm run api           # Express on http://127.0.0.1:43124
npm run web           # Expo web on port 43123, LAN-hosted
```

Native: `npm run mobile`, then open the Expo project on a phone. Set `EXPO_PUBLIC_API_URL` to the LAN address of the computer running the API when testing from another device.

Without Docker, create a Postgres database and set `DATABASE_URL`. The API runs `init.sql` + `seed.sql` on boot.

### Optional routing keys

| Env | Provider |
| --- | --- |
| `MAPBOX_ACCESS_TOKEN` | Mapbox Directions |
| `GOOGLE_MAPS_API_KEY` | Google Directions |
| `ORS_API_KEY` | openrouteservice |

OSRM is used as the public road-routing fallback. Car routes are validated before display so malformed or disconnected road geometry is rejected instead of drawing a fake ocean-crossing route.

## Product flow

1. **Trips** — ledger totals and recent journeys.
2. **Log trip / Automatic** — enter the start and finish. Luma builds the route and, for flights, airport access + flight connections.
3. **Log trip / Manual itinerary** — add car and plane legs yourself when you already know the itinerary. Airport IATA codes such as `JFK`, `ATL`, or `AUS` are supported directly.
4. **Route preview** — shows road legs in blue, flight legs in orange, plus distance, duration, and estimated CO₂e.
5. **Save** — persists the trip and its individual itinerary legs to Postgres.
6. **About / Credits** — available from the top-left Luma menu throughout the app.
7. Offline saves can queue on-device and sync after the API is reachable again.

## Structure

```
apps/api            Express + Postgres
  db/init.sql       schema
  db/seed.sql       emission factors
  src/routes        /api/health, /factors, /geocode, /routes/estimate, /trips, /stats
  src/services      geocode, road routing, airport graph, multimodal routing, emissions
apps/mobile         Expo (iOS / Android / web)
  src/theme.ts      UI tokens
  src/ui.tsx        Card, Button, Chip, EmptyState, Field
  src/screens       Trips, LogTrip, Results, TripDetail, About, Credits
  src/components    TripCard, RouteMap, MapPreview, LumaMenu
  src/offline.ts    factor cache + trip queue
packages/shared     shared types, emissions helpers, geometry, gazetteer
```

The root `1.png`, `2.png`, and `3.png` files are Luma brand assets used by the app home/menu, About, and Credits experiences.

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | DB ping |
| GET | `/api/factors` | Emission factor table |
| GET | `/api/geocode/search` | Address / airport suggestions |
| POST | `/api/routes/estimate` | Route or direct/manual leg estimate |
| GET | `/api/trips` | Recent trips |
| POST | `/api/trips` | Persist a logged trip and optional legs |
| GET | `/api/trips/:id` | One trip |
| GET | `/api/stats` | Ledger totals |

Emissions are calculated from route distance and the factor loaded from `emission_factors`.

## Visual direction

Luma keeps the original field-notebook palette: `#F2EEE4` ground, moss accent `#4A6741`, clay accents, simple outlined cards, and restrained map chrome. The new Luma artwork is layered into the home/menu and informational screens without replacing the functional map and trip UI.

## Tests

```bash
npm test
```
