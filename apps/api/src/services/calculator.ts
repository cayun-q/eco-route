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
  const routed =
    input.distanceMiles != null && input.durationMinutes != null
      ? null
      : await estimateRoute({
          origin: input.origin,
          destination: input.destination,
          mode: input.mode,
          originCoords: input.originCoords,
          destCoords: input.destCoords,
        });

  const distanceMiles = input.distanceMiles ?? routed!.distanceMiles;
  const durationMinutes = input.durationMinutes ?? routed!.durationMinutes;
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
      originCoords: input.originCoords ?? routed?.originCoords ?? null,
      destCoords: input.destCoords ?? routed?.destCoords ?? null,
      mode: input.mode,
      subtype,
      distanceMiles,
      durationMinutes,
    },
    emissionFactor,
    emissions,
  };
}
