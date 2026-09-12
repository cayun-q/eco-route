# Eco-Score Calculator

Calculate an **Eco-Score (30–100)** from start/end locations, trip distance, and transport mode. No map UI.

## How it works

1. Enter a **start** and **end** place.
2. Choose a transport mode.
3. The app geocodes both places (OpenStreetMap Nominatim), measures great-circle distance, then scores the trip.

### Formula

```text
modeFactor      = g_CO₂_per_km ÷ 171
distanceFactor  = min(1, distance_km ÷ 20)
severity        = modeFactor × (0.35 + 0.65 × distanceFactor)
score           = round(30 + 70 × (1 − severity))   // clamped to 30–100
```

Petrol car no longer scores 0 — the floor is **30**. Longer, dirtier trips land nearer that floor; bike/walk stay near **100**.

| Mode | Intensity | ~20 km score |
| --- | --- | --- |
| Driving (Car) | 171 g/km | 30 |
| Electric Vehicle (EV) | 45 g/km | ~82 |
| Bicycle | 0 g/km | 100 |
| Walking | 0 g/km | 100 |

Core API: `calculateEcoScore(mode, distanceKm)` in `src/ecoScore.js`.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (port `43123` by default).
