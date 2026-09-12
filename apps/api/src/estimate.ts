import {
  getPlace,
  round,
  sumTotals,
  tripTitle,
  type EstimateRequest,
  type EstimatedLeg,
  type EstimateResponse,
  type LegInput,
  type Place,
  type PlaceRef,
  type TravelMode,
} from "@carbonroute/shared";
import { query } from "./db.js";
import { assertAirportConnect } from "./airports.js";
import { estimateDurationMin, factorBand, routeLeg } from "./routing.js";

type FactorRow = {
  id: number;
  mode: TravelMode;
  band: string | null;
  activity: string;
  kg_co2e_per_km: string;
  source: string;
  year: number;
};

export function normalizeLegs(body: EstimateRequest): LegInput[] {
  if ("legs" in body && Array.isArray(body.legs)) {
    return body.legs;
  }
  if ("mode" in body && body.origin && body.destination) {
    return [{ mode: body.mode, origin: body.origin, destination: body.destination }];
  }
  throw Object.assign(new Error("Provide legs[] or a single mode/origin/destination"), { status: 400 });
}

export function resolvePlace(ref: PlaceRef): Place {
  if ("placeId" in ref) {
    const found = getPlace(ref.placeId);
    if (!found) {
      throw Object.assign(new Error(`Unknown placeId: ${ref.placeId}`), { status: 400 });
    }
    return ref.iata ? { ...found, iata: ref.iata } : found;
  }
  if (!Number.isFinite(ref.lat) || !Number.isFinite(ref.lng) || !ref.label?.trim()) {
    throw Object.assign(new Error("Place needs label, lat, and lng"), { status: 400 });
  }
  const iata = ref.iata?.trim().toUpperCase() || undefined;
  return {
    id: iata ? `iata:${iata}` : `custom:${ref.label}:${ref.lat}:${ref.lng}`,
    label: ref.label.trim(),
    kind: iata ? "airport" : "city",
    lat: ref.lat,
    lng: ref.lng,
    iata,
  };
}

export async function loadFactor(mode: TravelMode, band: string): Promise<FactorRow> {
  const { rows } = await query<FactorRow>(
    `SELECT id, mode, band, activity, kg_co2e_per_km::text, source, year
     FROM emission_factors
     WHERE mode = $1 AND band = $2
     LIMIT 1`,
    [mode, band],
  );
  if (!rows[0]) {
    throw Object.assign(new Error(`No emission factor for ${mode}/${band}`), { status: 500 });
  }
  return rows[0];
}

export async function estimateItinerary(body: EstimateRequest): Promise<EstimateResponse> {
  const inputs = normalizeLegs(body);
  if (inputs.length === 0) {
    throw Object.assign(new Error("At least one leg is required"), { status: 400 });
  }

  // Resolve + validate all places first (sync), then route in parallel.
  const prepared = inputs.map((input, index) => {
    if (!["car", "plane", "train"].includes(input.mode)) {
      throw Object.assign(new Error(`Unsupported mode: ${input.mode}`), { status: 400 });
    }
    const origin = resolvePlace(input.origin);
    const destination = resolvePlace(input.destination);
    if (origin.lat === destination.lat && origin.lng === destination.lng) {
      throw Object.assign(new Error(`Leg ${index + 1} origin and destination are the same`), { status: 400 });
    }
    if (input.mode === "plane") {
      // TODO(openflights): HARD BLOCK — no estimate for plane OD pairs
      // not in the OpenFlights snapshot. Great-circle geometry either way.
      assertAirportConnect(origin, destination);
    }
    return { index, mode: input.mode, origin, destination };
  });

  const routedList = await Promise.all(
    prepared.map((leg) => routeLeg(leg.mode, leg.origin, leg.destination)),
  );

  // Factor lookups depend on routed distance; run them in parallel after routing.
  const factorCache = new Map<string, Promise<FactorRow>>();
  function factorFor(mode: TravelMode, band: string): Promise<FactorRow> {
    const key = `${mode}:${band}`;
    let pending = factorCache.get(key);
    if (!pending) {
      pending = loadFactor(mode, band);
      factorCache.set(key, pending);
    }
    return pending;
  }

  const legs: EstimatedLeg[] = await Promise.all(
    prepared.map(async (leg, i) => {
      const routed = routedList[i];
      const distanceKm = round(routed.distanceKm, 2);
      const band = factorBand(leg.mode, distanceKm);
      const factor = await factorFor(leg.mode, band);
      const kgPerKm = Number(factor.kg_co2e_per_km);
      const co2eKg = round(distanceKm * kgPerKm, 3);
      const durationMin = estimateDurationMin(leg.mode, distanceKm);

      return {
        seq: leg.index,
        mode: leg.mode,
        origin: leg.origin,
        destination: leg.destination,
        distanceKm,
        durationMin,
        co2eKg,
        kgCo2ePerKm: kgPerKm,
        factor: {
          id: factor.id,
          activity: factor.activity,
          band: factor.band,
          source: factor.source,
          year: factor.year,
        },
        polyline: routed.polyline,
      };
    }),
  );

  legs.sort((a, b) => a.seq - b.seq);
  return { legs, totals: sumTotals(legs) };
}

export { tripTitle };
