import {
  geocodeMock,
  greatCirclePolyline,
  type GeoPoint,
} from "@carbonroute/shared";

export function hasBothEnds(origin: string, destination: string): boolean {
  return origin.trim().length > 0 && destination.trim().length > 0;
}

export function localRouteGeometry(
  origin: string,
  destination: string,
  originCoords?: GeoPoint | null,
  destCoords?: GeoPoint | null,
): { origin: GeoPoint; destination: GeoPoint; polyline: GeoPoint[] } {
  const start = originCoords ?? geocodeMock(origin);
  const end = destCoords ?? geocodeMock(destination);
  return {
    origin: start,
    destination: end,
    polyline: greatCirclePolyline(start, end),
  };
}
