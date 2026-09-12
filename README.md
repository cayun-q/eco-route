# CarbonRoute

Multi-leg, multi-modal travel emissions planner. Expo mobile + Express + Postgres.

One trip is an ordered list of **legs**. Each leg has an origin, destination, and mode (`car` | `plane` | `train`). Total CO₂e is the **sum of legs**, using a DESNZ/DEFRA 2024 factor table in Postgres — never a hardcoded g/km.

## Log a trip (map after OD, auto legs)

One origin, one destination, one mode. No Add/Remove leg cards.

1. Typeahead origin and destination (Nominatim + gazetteer, streets and cities).
2. The map draws only after **both** ends are set.
3. The client **auto-builds** `legs[]` for estimate/save:
   - **Car / train** → one hop.
   - **Plane** → `car → plane → car` when a city sits off a nearby airport (e.g. San Francisco → Brooklyn). Airport-to-airport stays a single plane hop.
4. Multi-segment map uses mode colors (car `#1F6FEB`, plane `#C2410C`, train `#6D28D9`). Drives sit flat on the ground plane; the flight is a slight great-circle bow — almost flat, not a chord.

Per-auto-leg CO₂ plus a sticky total. Not an itinerary editor.

## Autofill / geocode

Baseline, no Places key:

`latlng` pair → local gazetteer → **Nominatim** `limit=1`

Typeahead on every origin/destination (2+ characters):

```
GET  /api/geocode/suggest?q=1+Market+St
POST /api/geocode/suggest   { "q": "1 Market St" }
```

Nominatim `limit≥5` (streets + cities), merged with the gazetteer. Selecting a hit stores **label + lat/lng** (and optional **iata** on airports) and shows the human label. If `MAPBOX_TOKEN` / `MAPBOX_ACCESS_TOKEN` or `GOOGLE_MAPS_API_KEY` is set, those providers are preferred; otherwise Nominatim.

**Plane legs** use an airport picker seam (`GET /api/airports/suggest`) shaped as `{ label, lat, lng, iata? }` so an OpenFlights IATA snapshot can drop in later. Geometry stays a slight great-circle bow. Car/train stay on Nominatim.

Later OpenFlights PR (not this pass): connect-check is a **hard block** — no suggest and no estimate for plane OD pairs that are not in the snapshot. Multi-leg + Nominatim typeahead ship without that gate.

Car/train geometry uses OSRM when it answers; otherwise a mock road. Planes stay great-circle.

## API

| Method | Path | Body |
| --- | --- | --- |
| `GET`/`POST` | `/api/geocode/suggest?q=` | typeahead (`mode=plane` → airport seam) |
| `GET`/`POST` | `/api/airports/suggest?q=` | IATA picker stub (gazetteer today) |
| `GET` | `/api/geocode?q=` | single geocode (latlng → gazetteer → Nominatim 1) |
| `POST` | `/estimate` | `{ legs: LegInput[] }` **or** `{ mode, origin, destination }` |
| `POST` | `/trips` | same, plus optional `title` — persists trip **and** legs |
| `GET` | `/trips`, `/trips/:id` | saved itineraries with nested legs |
| `GET` | `/factors` | DESNZ/DEFRA seed rows |
| `GET` | `/places?q=` | gazetteer only |
| `GET` | `/health` | API + Postgres check |

A place is `{ placeId }` or `{ label, lat, lng }`. The client auto-builds legs from one origin, one destination, and a mode.

## Mobile (eco-rough)

- Single origin + destination form, vivid mode chips, forest accent CTA.
- Map only after both ends are set. Car/train: flat ground polylines. Plane: slight great-circle bow.
- Sticky total CO₂ plus a read-only per-auto-leg breakdown — not an itinerary editor.
- Offline queue keeps the full multi-leg payload if save fails.

## Run locally

Needs Node 20+ and Postgres 16.

```bash
# Postgres (Docker)
docker compose up -d postgres

# or: createdb carbonroute
# export DATABASE_URL=postgres://USER@127.0.0.1:5432/carbonroute

cp .env.example .env
npm install
npm test              # leg summing + geocode/gazetteer + factor-table estimates
npm run api           # Express on :47832 (migrates + seeds factors)
npm run mobile:web    # Expo web on :47831
```

Default URL: `postgres://carbonroute:carbonroute@127.0.0.1:5432/carbonroute`.

One-origin preview (UI + API):

```bash
EXPO_WEB_PROXY=http://127.0.0.1:47831 API_PORT=47832 npm run api
```

Then visit `http://127.0.0.1:47832`.

## Theme

Forest eco-rough (PR #1 tones): bg `#F3F6F1`, surface `#FFFFFF`, accent `#1B7A4E`, ink `#14241C`. Mode colors: car `#1F6FEB`, plane `#C2410C`, train `#6D28D9`. Cards: radius 8, 1px line, hard shadow — no glass.

## Factors

Seeded from **DESNZ/DEFRA GHG Conversion Factors 2024**. The estimate path **reads `emission_factors`**.

| mode | band | kg CO₂e / km |
| --- | --- | --- |
| car | average | 0.16475 |
| train | national_rail | 0.03546 |
| plane | domestic / short_haul / long_haul | 0.27258 / 0.18592 / 0.14787 |

Flight band: &lt; 800 km domestic, &lt; 3700 km short-haul, else long-haul.

## Repo

```
apps/api        Express + Postgres
apps/mobile     Expo (iOS / Android / web)
packages/shared types, theme, place catalog, totalling
```
