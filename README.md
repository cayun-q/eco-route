# Eco-Route Recommendations

Compare multi-modal routes for an origin and destination, estimate CO₂e, filter impractical options, and show greener alternatives with time vs carbon tradeoffs.

## Pipeline

1. **Carbon baselines** (`src/carbonBaselines.js`) — g CO₂e / km for car, EV, bus, bike, walk  
2. **Routing** (`src/routing.js`) — OpenRouteService in parallel for car/EV/bike/walk; bus estimated from driving  
3. **Filter & compare** (`src/compareRoutes.js`) — distance/duration thresholds + % CO₂ savings; Park & Ride for long drives  
4. **UI cards** (`src/renderRecommendations.js`) — recommendation cards + gamified framing (`src/gamification.js`)

## Setup

```bash
cp .env.example .env
# set VITE_ORS_API_KEY from https://openrouteservice.org/
npm install
npm run dev
```

Open the URL Vite prints (default port `43123`).

## Thresholds

| Mode | Max distance |
| --- | --- |
| Walking | 5 km |
| Cycling | 25 km |
| Transit (estimated) | 80 km |

Active modes slower than **2.75×** your selected mode are hidden. **Park & Ride** appears for car/EV trips over ~25 km.
