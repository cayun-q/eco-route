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

1. Choose a transport mode: Driving (Car), Electric Vehicle (EV), Bicycle, or Walking.
2. Click the map to set a **start** point.
3. Click again to set an **end** point.
4. The app requests a matching OpenRouteService profile and shows distance, duration, and estimated CO₂.
5. Changing the mode with both points set re-fetches and re-renders the route.
6. The **Eco-Score** card (0–100) updates with the mode: higher score means lower carbon intensity.

| Mode | ORS profile | CO₂ factor | Eco-Score |
| --- | --- | --- | --- |
| Driving (Car) | `driving-car` | 171 g/km | 0 |
| Electric Vehicle (EV) | `driving-car` | 45 g/km | 74 |
| Bicycle | `cycling-regular` | 0 g/km | 100 |
| Walking | `foot-walking` | 0 g/km | 100 |

Eco-Score is `round(100 × (1 − g_CO₂/km ÷ 171))`, implemented in `src/ecoScore.js`.

## Notes

- Keep `.env` private. It is gitignored; only `.env.example` is committed.
- If you pasted an API key in chat or committed it by mistake, rotate it at [openrouteservice.org](https://openrouteservice.org/).
