import type { GeoPoint, RoutingEstimate, TravelMode } from "@carbonroute/shared";

export interface RoutingRequest {
  origin: string;
  destination: string;
  mode: TravelMode;
  originCoords?: GeoPoint | null;
  destCoords?: GeoPoint | null;
}

export interface RoutingProvider {
  readonly name: string;
  estimate(request: RoutingRequest): Promise<RoutingEstimate>;
}
