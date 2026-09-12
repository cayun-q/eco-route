import type { GeoPoint, TravelMode } from "@carbonroute/shared";

export interface RouteMapProps {
  origin: GeoPoint;
  destination: GeoPoint;
  originLabel: string;
  destinationLabel: string;
  polyline: GeoPoint[];
  mode: TravelMode;
  height?: number;
}
