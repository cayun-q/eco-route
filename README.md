# Eco-Score Calculator

A tiny Vite app with one job: calculate an **Eco-Score (0–100)** from transport-mode carbon intensity. No map, no routing API.

## Formula

```text
score = round(100 × (1 − g_CO₂_per_km ÷ 171))
```

| Mode | Intensity | Score |
| --- | --- | --- |
| Driving (Car) | 171 g/km | 0 |
| Electric Vehicle (EV) | 45 g/km | 74 |
| Bicycle | 0 g/km | 100 |
| Walking | 0 g/km | 100 |

Core function: `calculateEcoScore(mode)` in `src/ecoScore.js`.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (port `43123` by default). Pick a transport mode to see the score.
