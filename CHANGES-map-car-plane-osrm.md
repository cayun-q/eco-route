# Car-on-roads + airport plane corridors

NEW map geometry off PR #1 tip (not multimodal/restore).

- **Car:** public OSRM road polylines, stroke `#1F6FEB` @ 3.75. Fails friendly if OSRM unreachable (no silent fake roads unless `OSRM_LABELED_FALLBACK=1`).
- **Plane:** nearest major airport + slight geodesic bulge, stroke `#C2410C` @ 3.75; optional city→airport dashed connectors.
- **Train:** geodesic only (documented).
- Map tiles: Esri World Street Map (no API key).
- Origin agent artifact ported into `apps/api` + `apps/mobile` monorepo layout.
