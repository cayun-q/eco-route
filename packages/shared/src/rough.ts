import { kgFromDistance } from "./emissions";
import { lookupOfflineEstimate } from "./gazetteer";
import type { EmissionFactor, RouteEstimate, TransportMode } from "./types";

export type RoughEstimate = Pick<
  RouteEstimate,
  | "origin"
  | "destination"
  | "mode"
  | "distanceKm"
  | "durationMin"
  | "polyline"
  | "co2eKg"
  | "factor"
  | "provider"
>;

/**
 * Gazetteer + haversine / great-circle estimate. Caller supplies the
 * emission factor (API: Postgres `emission_factors`; CLI/tests: same table).
 */
export function roughEstimate(
  originQ: string,
  destQ: string,
  mode: TransportMode,
  factor: Pick<EmissionFactor, "mode" | "gPerKm" | "source" | "notes">,
): RoughEstimate {
  if (factor.mode !== mode) {
    throw new Error(`Factor mode "${factor.mode}" does not match requested mode "${mode}"`);
  }
  const routed = lookupOfflineEstimate(originQ, destQ, mode);
  if (routed.origin.lat === routed.destination.lat && routed.origin.lng === routed.destination.lng) {
    throw new Error("Origin and destination need to be different places.");
  }
  return {
    ...routed,
    mode,
    co2eKg: kgFromDistance(routed.distanceKm, factor.gPerKm),
    factor: {
      mode: factor.mode,
      gPerKm: factor.gPerKm,
      source: factor.source,
      notes: factor.notes,
    },
    provider: "haversine",
  };
}
