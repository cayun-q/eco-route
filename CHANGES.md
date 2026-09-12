# CarbonRoute perf follow-ups (`cursor/perf-typeahead-osrm`)

Base: local HEAD `e76a041` (restore + DesignBridge bow/stroke). Branch: `cursor/perf-typeahead-osrm`. No fetch/pull/push.

## Files touched

### `apps/mobile/app/(tabs)/log.tsx`
- Pass `mode={mode}` into both `PlaceField`s so plane uses airport suggest/local airport search.
- Abort in-flight `/estimate` (auto + manual) via `AbortController` when origin/destination/mode changes or a newer estimate starts; stale responses do not overwrite UI.
- Keep map-after-OD SVG stub from `autoLegs` and `buildAutoLegs` car→plane→car behavior.

### `apps/mobile/components/PlaceField.tsx`
- Local-first typeahead: for query length ≥ `MIN_CHARS` (2) and open, immediately show `searchPlaces` / `searchAirports` hits.
- Remote `suggestPlaces` / `suggestAirports` after ~240ms debounce.
- `AbortController` aborts previous remote request on query/mode/open change or unmount.
- Merge remote into local (dedupe by id/label); never blank the list while loading if local hits are showing.

### `apps/mobile/lib/api.ts`
- Optional `AbortSignal` on `request`, threaded through `suggestPlaces`, `suggestAirports`, and `estimateTrip`.

### `apps/api/src/geocode.ts`
- When gazetteer/local (+ latlng) hits exist, do not block the first HTTP response on Nominatim: race `providerSearch` with a ~400ms budget and merge if it wins; otherwise return local immediately.
- Skip Mapbox/Google when env tokens are unset (no await on empty providers).
- Keep existing suggest cache; add `clearSuggestCache()` for tests.

### `apps/api/src/routing.ts`
- OSRM `overview=simplified` (was `full`).
- In-process `routeLeg` cache keyed by mode + lat/lng rounded to 4 decimals; `clearRouteCache()` for tests.

### `apps/api/src/estimate.ts`
- Resolve/validate places first, then `Promise.all` independent `routeLeg` calls, then parallel factor loads (deduped by mode+band).

### `apps/api/test/geocode.test.ts`
- Cover local-first / no Nominatim block when gazetteer hits (hanging fetch + budget).
- Align plane geometry assertion with DesignBridge medium bow on current HEAD.

### `apps/api/test/routing.test.ts`
- Cover OSRM `overview=simplified` and same-OD cache (single fetch).

### Unchanged
- `apps/api/test/autoLegs.test.ts` — still passes; no code change required.

## Tests
`npm run test -w @carbonroute/api` → 22 pass / 0 fail (after focused api workspace install).
