import type { GeoPoint } from "./types";

const EARTH_RADIUS_MILES = 3958.7613;

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two WGS84 points, in statute miles. */
export function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function durationMinutesFor(
  distanceMiles: number,
  speedMph: number,
  extraMinutes = 0,
): number {
  if (speedMph <= 0) throw new Error("Speed must be positive");
  return Math.round((distanceMiles / speedMph) * 60 + extraMinutes);
}
