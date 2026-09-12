# Eco Trip

Look up two airports. If [OpenFlights](https://openflights.org/data.html) lists a connecting flight between them, the app shows the great-circle distance in kilometers and miles.

## Run locally

```bash
npm install
npm run dev -- --port 43147
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147). Enter IATA/ICAO codes or names (for example `SFO` and `JFK`).

## Data

Bundled snapshots:

- `data/airports.dat` — airport names, codes, and coordinates
- `data/routes.dat` — published airline routes (including stop counts)

Refresh from upstream if you want newer schedules:

```bash
curl -fsSL https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat -o data/airports.dat
curl -fsSL https://raw.githubusercontent.com/jpatokal/openflights/refs/heads/master/data/routes.dat -o data/routes.dat
```

OpenFlights data is available under the Open Database License.

## API

`POST /api/distance` with `{ "from": "SFO", "to": "JFK" }`. Distance is returned only when a connecting route exists.
