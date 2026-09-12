import {
  calculateEmissions,
  resolveSubtype,
  type EstimateRequest,
  type EstimateResult,
} from "@carbonroute/shared";
import { getFactor } from "./factors.js";
import { estimateRoute } from "./routing/index.js";

export async function estimateEmissions(
  input: EstimateRequest,
): Promise<EstimateResult> {
  // Always ask the router for coordinates + a preview polyline. Distance and
  // duration overrides only replace the numeric estimate, not the geometry.
  const routed = await estimateRoute({
    origin: input.origin,
    destination: input.destination,
    mode: input.mode,
    originCoords: input.originCoords,
    destCoords: input.destCoords,
  });

  const distanceMiles = input.distanceMiles ?? routed.distanceMiles;
  const durationMinutes = input.durationMinutes ?? routed.durationMinutes;
  const subtype = resolveSubtype(input.mode, input.subtype, distanceMiles);
  const emissionFactor = await getFactor(input.mode, subtype);
  const emissions = calculateEmissions(
    { distanceMiles, durationMinutes },
    emissionFactor,
  );

  return {
    route: {
      origin: input.origin,
      destination: input.destination,
      originCoords: input.originCoords ?? routed.originCoords,
      destCoords: input.destCoords ?? routed.destCoords,
      mode: input.mode,
      subtype,
      distanceMiles,
      durationMinutes,
      polyline: routed.polyline,
    },
    emissionFactor,
    emissions,
    routing: {
      provider: routed.provider,
      method: routed.method,
    },
  };
}
