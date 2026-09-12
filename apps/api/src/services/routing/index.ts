import { GoogleRoutingProvider } from "./google.js";
import { MapboxRoutingProvider } from "./mapbox.js";
import { MockRoutingProvider } from "./mock.js";
import { OrsRoutingProvider } from "./ors.js";
import type { RoutingProvider, RoutingRequest } from "./types.js";

export type { RoutingProvider, RoutingRequest } from "./types.js";

export function createRoutingProvider(
  name = process.env.ROUTING_PROVIDER ?? "mock",
): RoutingProvider {
  switch (name) {
    case "mapbox":
      return new MapboxRoutingProvider();
    case "google":
      return new GoogleRoutingProvider();
    case "ors":
      return new OrsRoutingProvider();
    default:
      return new MockRoutingProvider();
  }
}

export const routingProvider = createRoutingProvider();

export async function estimateRoute(request: RoutingRequest) {
  return routingProvider.estimate(request);
}
