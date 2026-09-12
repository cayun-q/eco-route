# Leaflet Map + OpenRouteService

A Vite + Leaflet app that loads [Leaflet](https://leafletjs.com/) from the CDN, fetches driving routes from [OpenRouteService](https://openrouteservice.org/), and estimates CO₂ for the route.

## Setup

1. Copy the env example and add your OpenRouteService API key:

```bash
cp .env.example .env
```

2. Install and run:

```bash
npm install
npm run dev
```

Open the URL printed in the terminal (port `43123` by default).

## Usage

1. Click the map to set a **start** point.
2. Click again to set an **end** point.
3. The app requests a `driving-car` route from OpenRouteService and shows distance, duration, and estimated CO₂.

CO₂ is calculated as:

`distance_km × 171 g CO₂/km` (average petrol passenger car factor), shown in g or kg.

## Notes

- Keep `.env` private. It is gitignored; only `.env.example` is committed.
- If you pasted an API key in chat or committed it by mistake, rotate it at [openrouteservice.org](https://openrouteservice.org/).
