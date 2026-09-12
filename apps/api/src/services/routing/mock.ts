import {
  durationMinutesFor,
  geocodeMock,
  greatCirclePolyline,
  haversineMiles,
  type RoutingEstimate,
} from "@carbonroute/shared";
import type { RoutingProvider, RoutingRequest } from "./types.js";

const ROAD_FACTOR = 1.22;
const RAIL_FACTOR = 1.12;

export class MockRoutingProvider implements RoutingProvider {
  readonly name = "mock";

  async estimate(request: RoutingRequest): Promise<RoutingEstimate> {
    const origin = request.originCoords ?? geocodeMock(request.origin);
    const dest = request.destCoords ?? geocodeMock(request.destination);
    const greatCircle = haversineMiles(origin, dest);

    const polyline = greatCirclePolyline(origin, dest);

    if (request.mode === "plane") {
      return {
        distanceMiles: round1(greatCircle),
        durationMinutes: durationMinutesFor(greatCircle, 480, 45),
        originCoords: origin,
        destCoords: dest,
        polyline,
        provider: this.name,
        method: "haversine",
      };
    }

    if (request.mode === "train") {
      const distance = greatCircle * RAIL_FACTOR;
      return {
        distanceMiles: round1(distance),
        durationMinutes: durationMinutesFor(distance, 75, 15),
        originCoords: origin,
        destCoords: dest,
        polyline,
        provider: this.name,
        method: "mock",
      };
    }

    const distance = greatCircle * ROAD_FACTOR;
    return {
      distanceMiles: round1(distance),
      durationMinutes: durationMinutesFor(distance, 50, 8),
      originCoords: origin,
      destCoords: dest,
      polyline,
      provider: this.name,
      method: "mock",
    };
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
