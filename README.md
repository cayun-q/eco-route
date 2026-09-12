# CarbonRoute

Multi-leg, multi-modal travel emissions planner. Expo mobile + Express + Postgres.

One trip is an ordered list of **legs**. Each leg has an origin, destination, and mode (`car` | `plane` | `train`). Total CO₂e is the **sum of legs**, using a DESNZ/DEFRA 2024 factor table in Postgres — never a hardcoded g/km.

## Multi-leg example

Drive to the airport, fly, drive onward:

1. Type **San Francisco** in origin (typeahead after 2 characters) → pick the city.
2. Destination **SFO** · mode **car**.
3. **Add leg** — origin autofills to SFO. Change mode to **plane**, destination **JFK**.
4. **Add leg** — origin autofills to JFK. Mode **car**, destination **Brooklyn**.
5. Or tap **Flight with drives** to scaffold the empty car → plane → car cards first.

The map appears once any leg has both ends. Each segment is stroked in its mode color (car `#6E7340`, plane `#A65D3F`, train `#3D5560`). Plane legs are a great-circle arc, not a straight chord. A sticky **Total CO₂e** sits under the map; the breakdown lists `A → B`, a mode chip, and that leg’s kg.

Single-leg still works: leave the default one empty card, pick train, London St Pancras → Paris Gare du Nord.

## Autofill / geocode

Baseline, no Places key:

`latlng` pair → local gazetteer → **Nominatim** `limit=1`

Typeahead on every origin/destination (2+ characters):

```
GET  /api/geocode/suggest?q=1+Market+St
POST /api/geocode/suggest   { "q": "1 Market St" }
```

Nominatim `limit≥5` (streets + cities), merged with the gazetteer. Selecting a hit stores **label + lat/lng** (and optional **iata** on airports) and shows the human label. If `MAPBOX_TOKEN` / `MAPBOX_ACCESS_TOKEN` or `GOOGLE_MAPS_API_KEY` is set, those providers are preferred; otherwise Nominatim.

**Plane legs** use an airport picker seam (`GET /api/airports/suggest`) shaped as `{ label, lat, lng, iata? }` so an OpenFlights IATA snapshot can drop in later. Geometry stays a great-circle arc. Car/train stay on Nominatim. A later connect-check will **hard-block** suggest/estimate for plane OD pairs missing from that snapshot — not enforced this pass.

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

A place is `{ placeId }` or `{ label, lat, lng }`. Adding a leg copies the previous destination into the new origin (editable).

## Mobile (eco-rough)

- Vertical paper cards (radius 8, 1px line, hard shadow), mode chips + origin + destination.
- Muted connector between cards. **Add leg** is a ghost button. Remove on leg 2+.
- Default = one empty leg. Optional **Flight with drives** preset.
- Map only when ≥1 complete leg. Sticky total CO₂ near the map.
- Home / results / trip detail: `A → B`, mode chip, CO₂; total prominent, not glossy.
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

| Token | Value |
| --- | --- |
| paper | `#F2EEE4` |
| moss | `#4A6741` |
| car / plane / train | `#6E7340` / `#A65D3F` / `#3D5560` |
| cards | radius 8, 1px line, 4px hard shadow |

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
