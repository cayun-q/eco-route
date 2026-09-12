import { searchAirports, type Place } from "@carbonroute/shared";

/**
 * Airport suggest seam for plane legs.
 *
 * Today: gazetteer airports shaped as `{ label, lat, lng, iata? }`.
 * Car/train keep Nominatim via `/api/geocode/suggest` — do not route those here.
 *
 * TODO(openflights): swap this body for an OpenFlights snapshot search
 * (`GET /api/airports/suggest`). Do not vendor the dataset in this pass.
 *
 * TODO(openflights): connect-check is a HARD BLOCK once it lands —
 * no suggest and no estimate for plane OD pairs missing from the snapshot
 * or with no connection in the graph. Callers should keep `iata` on places
 * so that check can key on IATA (fallback: lat/lng).
 */
export function suggestAirports(query: string, limit = 6): Place[] {
  return searchAirports(query, limit);
}

/**
 * TODO(openflights): implement against the snapshot + route graph.
 * Until then this is a no-op so multi-leg + Nominatim can ship.
 */
export function assertAirportConnect(_origin: Place, _destination: Place): void {
  // HARD BLOCK later: throw 400 if either end is not in OpenFlights
  // or the pair has no connection. Not enforced this pass.
}
