import type { EstimateResponse, Trip } from "@carbonroute/shared";

let lastEstimate: EstimateResponse | null = null;
let lastRequest: unknown = null;

export function stashEstimate(estimate: EstimateResponse, request: unknown) {
  lastEstimate = estimate;
  lastRequest = request;
}

export function readEstimate(): { estimate: EstimateResponse; request: unknown } | null {
  if (!lastEstimate) return null;
  return { estimate: lastEstimate, request: lastRequest };
}

export function stashTrip(trip: Trip) {
  lastEstimate = trip;
}
