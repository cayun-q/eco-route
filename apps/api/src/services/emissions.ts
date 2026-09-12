import {
  ROAD_FACTOR,
  MILES_TO_KM,
  carLbPerMileToGPerKm,
  carTripEmissions,
  kgFromDistance,
  lbToKg,
  planeTripEmissions,
  round3,
  type CabinClass,
  type CarPresetKey,
  type RouteProvider,
  type TransportMode,
} from "@carbonroute/shared";
import { loadFactor, type FactorRow } from "../db";

export function factorToDto(row: FactorRow) {
  return {
    mode: row.mode,
    gPerKm: Number(row.g_per_km),
    source: row.source,
    notes: row.notes,
    updatedAt: row.updated_at.toISOString(),
  };
}

export type EmissionsOptions = {
  /** Routing provider; haversine car distances get ROAD_FACTOR before CO2. */
  provider?: RouteProvider;
  passengers?: number;
  vehicle?: CarPresetKey;
  cabinClass?: CabinClass;
  /**
   * Optional separate road distance (km) for vsDriving when mode is plane/train.
   * If omitted, estimated as distanceKm * ROAD_FACTOR (great-circle → road).
   */
  drivingDistanceKm?: number;
};

/**
 * ROAD_FACTOR policy (car only, applied here — not in routing display):
 * - mapbox / google / ors / osrm: use routed distanceKm as-is (real roads).
 * - haversine: multiply by ROAD_FACTOR before car CO2 (matches Python MVP).
 * Plane display distance is never ROAD_FACTORed; the 8% uplift stays inside
 * planeTripEmissions only.
 */
function carDistanceMilesForCo2(
  distanceKm: number,
  provider: RouteProvider | undefined,
): number {
  const miles = distanceKm / MILES_TO_KM;
  if (provider === "haversine" || provider == null) {
    return miles * ROAD_FACTOR;
  }
  return miles;
}

function syntheticFactor(
  mode: TransportMode,
  gPerKm: number,
  source: string,
  notes: string | null,
): ReturnType<typeof factorToDto> {
  return {
    mode,
    gPerKm: round3(gPerKm),
    source,
    notes,
    updatedAt: new Date().toISOString(),
  };
}

export async function emissionsFor(
  mode: TransportMode,
  distanceKm: number,
  options: EmissionsOptions = {},
): Promise<{
  co2eKg: number;
  factor: ReturnType<typeof factorToDto>;
  drivingCo2eKg: number | null;
  vsDrivingKg: number | null;
  /** Python-default travel time in minutes when useful for haversine overrides. */
  travelTimeHours: number | null;
}> {
  const passengers = options.passengers ?? 1;
  if (passengers < 1) {
    throw Object.assign(new Error("passengers must be >= 1"), { status: 400 });
  }

  if (mode === "train") {
    const row = await loadFactor(mode);
    if (!row) {
      throw Object.assign(new Error(`No factor row for mode "${mode}"`), { status: 500 });
    }
    const factor = factorToDto(row);
    const co2eKg = kgFromDistance(distanceKm, factor.gPerKm);

    const drivingKm =
      options.drivingDistanceKm ?? distanceKm * ROAD_FACTOR;
    const driveMiles = drivingKm / MILES_TO_KM;
    const driveTrip = carTripEmissions(driveMiles, "gas_average", 1);
    const drivingCo2eKg = round3(lbToKg(driveTrip.total_co2_lb));
    const vsDrivingKg = round3(co2eKg - drivingCo2eKg);

    return {
      co2eKg,
      factor,
      drivingCo2eKg,
      vsDrivingKg,
      travelTimeHours: null,
    };
  }

  if (mode === "car") {
    const vehicle = options.vehicle ?? "gas_average";
    const miles = carDistanceMilesForCo2(distanceKm, options.provider);
    const trip = carTripEmissions(miles, vehicle, passengers);
    const co2eKg = round3(lbToKg(trip.total_co2_lb));
    const gPerKm =
      distanceKm > 0 ? (co2eKg * 1000) / distanceKm : carLbPerMileToGPerKm(trip.co2_per_mile_lb);

    const isEv = vehicle === "ev";
    const source = isEv
      ? "EPA eGRID 2023 (US grid) + EPA MY2025 median EV kWh/100 mi"
      : "EPA tailpipe (MVP presets)";

    return {
      co2eKg,
      factor: syntheticFactor(
        "car",
        gPerKm,
        source,
        `vehicle=${vehicle}; passengers=${passengers}; ROAD_FACTOR applied when provider=haversine`,
      ),
      drivingCo2eKg: null,
      vsDrivingKg: null,
      travelTimeHours: trip.travel_time_hours,
    };
  }

  // plane
  const cabinClass = options.cabinClass ?? "economy";
  const miles = distanceKm / MILES_TO_KM;
  const trip = planeTripEmissions(miles, passengers, null, cabinClass);
  // API default passengers=1 → total == per-passenger; if >1 report total for party.
  const co2eKg = round3(lbToKg(trip.total_co2_lb));
  const gPerKm = distanceKm > 0 ? (co2eKg * 1000) / distanceKm : 0;

  const drivingKm = options.drivingDistanceKm ?? distanceKm * ROAD_FACTOR;
  const driveMiles = drivingKm / MILES_TO_KM;
  const driveTrip = carTripEmissions(driveMiles, "gas_average", 1);
  const drivingCo2eKg = round3(lbToKg(driveTrip.total_co2_lb));
  const vsDrivingKg = round3(co2eKg - drivingCo2eKg);

  return {
    co2eKg,
    factor: syntheticFactor(
      "plane",
      gPerKm,
      "UK Government 2026 GHG (direct CO2 + 8% distance uplift)",
      `cabin=${cabinClass}; passengers=${passengers}; classifyFlight on great-circle km`,
    ),
    drivingCo2eKg,
    vsDrivingKg,
    travelTimeHours: trip.travel_time_hours,
  };
}
