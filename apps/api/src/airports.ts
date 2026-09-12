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
 * Product decision (later PR): connect-check is a HARD BLOCK —
 * no suggest and no estimate for plane OD pairs not in the OpenFlights
 * snapshot (and none with no connection). Not enforced this pass so
 * multi-leg + Nominatim can ship.
 */
export function suggestAirports(query: string, limit = 6): Place[] {
  return searchAirports(query, limit);
}

/**
 * TODO(openflights): HARD BLOCK once the snapshot lands.
 * Throw 400 if origin or destination IATA is absent from OpenFlights,
 * or the pair has no connection. No-op today.
 */
export function assertAirportConnect(_origin: Place, _destination: Place): void {
  // Intentionally empty — do not block current multimodal ship.
}
