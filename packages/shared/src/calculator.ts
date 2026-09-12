import {
  SHORT_HAUL_MILE_LIMIT,
  type EmissionBreakdown,
  type EmissionFactor,
  type FactorSubtype,
  type TravelMode,
} from "./types";

export function resolveSubtype(
  mode: TravelMode,
  subtype?: FactorSubtype,
  distanceMiles?: number,
): FactorSubtype {
  if (subtype) return subtype;
  if (mode === "plane") {
    return (distanceMiles ?? 0) < SHORT_HAUL_MILE_LIMIT ? "short_haul" : "long_haul";
  }
  if (mode === "car") return "petrol";
  return "electric";
}

export function calculateEmissions(
  route: { distanceMiles: number; durationMinutes: number },
  factor: EmissionFactor,
): EmissionBreakdown {
  if (route.distanceMiles < 0 || route.durationMinutes < 0) {
    throw new Error("Distance and duration must be non-negative");
  }
  if (factor.gramsCo2ePerMile == null && factor.gramsCo2ePerHour == null) {
    throw new Error(
      `Emission factor ${factor.mode}/${factor.subtype} has no per-mile or per-hour value`,
    );
  }

  const fromDistance =
    factor.gramsCo2ePerMile != null
      ? factor.gramsCo2ePerMile * route.distanceMiles
      : 0;
  const fromDuration =
    factor.gramsCo2ePerHour != null
      ? factor.gramsCo2ePerHour * (route.durationMinutes / 60)
      : 0;

  return {
    gramsCo2e: round2(fromDistance + fromDuration),
    fromDistance: round2(fromDistance),
    fromDuration: round2(fromDuration),
  };
}

export function pickFactor(
  factors: EmissionFactor[],
  mode: TravelMode,
  subtype: FactorSubtype,
): EmissionFactor {
  const match = factors.find(
    (factor) =>
      factor.isActive && factor.mode === mode && factor.subtype === subtype,
  );
  if (!match) {
    throw new Error(`No active emission factor for ${mode}/${subtype}`);
  }
  return match;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
