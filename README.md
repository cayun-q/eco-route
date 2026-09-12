# CarbonRoute

Mobile starter for logging travel (car, plane, train) and estimating carbon emissions from a **swappable Postgres factor table** — not hardcoded constants. The routing layer is an interface: it ships with a mock + haversine implementation so you can drop in a Mapbox, Google, or OpenRouteService key later.

```
apps/api        Express + TypeScript REST API
apps/mobile     Expo (React Native + TypeScript) app
packages/shared Shared types + emission calculator
```

## What you get

- **Calculator** — `grams = miles × g/mile + hours × g/hour`, using the active row for that mode/subtype
- **Emission factors** — petrol car, EV car, short-haul flight, long-haul flight, diesel train, electric train (DEFRA/EPA-style starter values)
- **Routing stub** — city lookup + haversine for flights; mock road/rail distances. Swap via `ROUTING_PROVIDER` (`mock`, `mapbox`, `google`, or `ors`)
- **REST** — create trip, list trips, cumulative summary, list factors, preview an estimate (includes a route polyline)
- **Expo screens** — Home (recent + cumulative), Log a trip (type both ends, then a Google Maps–style route preview), Trip results
- **Offline** — cached factors, queued trips, sync on reconnect

## Prerequisites

- Node 20+
- Postgres 16 (Docker Compose or local)

## Quick start (local Postgres)

Create a database and user (defaults match `.env.example`):

```bash
createdb carbonroute
# or: docker compose up -d postgres
```

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
npm install
npm run db:migrate
npm run db:seed
npm run api
```

In a second terminal:

```bash
npm run mobile:web          # Expo web on http://127.0.0.1:43123
# or: npm run mobile        # Expo Go / simulator
```

API listens on **http://127.0.0.1:43124**.

On a physical phone, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your computer’s LAN IP (`http://192.168.x.x:43124`), then restart Expo.

### Reset the database

```bash
npm run db:reset
```

## Docker Compose

```bash
docker compose up --build
```

This starts Postgres and the API. Run Expo on the host as above. The API container still uses `ROUTING_PROVIDER=mock` unless you export Mapbox/Google keys.

## REST

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness + active routing provider |
| `GET` | `/api/emission-factors` | Active factor table (mobile caches this) |
| `POST` | `/api/routes/estimate` | Preview emissions without saving |
| `POST` | `/api/trips` | Create a trip (`clientId` is idempotent for offline sync) |
| `GET` | `/api/trips` | Recent trips |
| `GET` | `/api/trips/summary` | Cumulative totals by mode |
| `GET` | `/api/trips/:id` | One trip |

Example:

```bash
curl -s http://127.0.0.1:43124/api/routes/estimate \
  -H 'content-type: application/json' \
  -d '{"origin":"London","destination":"Paris","mode":"plane"}'
```

## Route preview (Log Trip)

The Expo app stays mobile-first. On **Log a trip**, the map stays hidden until **both origin and destination** are filled (typed city, sample chip, or GPS for origin). Then it:

1. Shows start/end markers and a route polyline
2. Asks `POST /api/routes/estimate` for distance, duration, and emissions
3. Overlays chips for those three numbers — confirmation before **Save trip**

Native iOS/Android use `react-native-maps` (Apple Maps on iOS; Google Maps on Android). Expo web uses Leaflet + OpenStreetMap tiles so the same flow works in `npm run mobile:web`. The maps package is a JS dependency only — it is not registered as an Expo config plugin, so Expo web can start without loading native JSX.

Emissions always come from the **Postgres factor table / calculator**, never hardcoded g/km constants.

## Plug in Mapbox, Google, or OpenRouteService

1. Copy `apps/api/.env.example` → `apps/api/.env`
2. Set one of:

```bash
ROUTING_PROVIDER=mapbox
MAPBOX_ACCESS_TOKEN=pk.your_token
```

```bash
ROUTING_PROVIDER=google
GOOGLE_MAPS_API_KEY=your_key
```

```bash
ROUTING_PROVIDER=ors
ORS_API_KEY=your_openrouteservice_key
```

3. Restart the API.

Behavior:

- **Car** — Mapbox Directions, Google Directions, or OpenRouteService `driving-car` when a key is present
- **Train** — Mapbox/Google directions when those providers are selected; ORS has no rail profile, so train stays on the mock path
- **Plane** — always great-circle **haversine** (ICAO-style), even with a key
- **Missing key or API error** — falls back to the mock provider (city lookup + haversine polyline)

No mobile code change is required. The app already posts origin/destination (and optional GPS coords) to the same estimate/create endpoints.

Optional native map key (Android Google Maps tiles / production builds):

```bash
# apps/mobile/.env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
```

Expo web does not need this — it uses Leaflet. Do not put ORS/Mapbox/Google **routing** secrets in the mobile app; those stay on `apps/api`.

## Domain model

1. **Route** — origin, destination, mode, distance, duration
2. **EmissionFactor** — mode, subtype, g CO₂e per mile and/or per hour, source, year
3. **Trip** — logged route + calculated emissions + the factor row used

Schema: `apps/api/src/db/migrations/001_init.sql`  
Seed: `apps/api/src/db/seed.ts`  
Calc: `packages/shared/src/calculator.ts`

Update factors by inserting new rows (or re-seeding). The calculator always reads the active table.

## Tests

```bash
npm test
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run api` | Start the API with reload |
| `npm run mobile` | Expo dev server |
| `npm run mobile:web` | Expo web (port 43123) |
| `npm run db:migrate` | Apply SQL migrations |
| `npm run db:seed` | Upsert starter emission factors |
| `npm run db:reset` | Drop + migrate + seed |
| `npm test` | Calculator + routing unit tests |
