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

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Spherical interpolation between two WGS84 points. Used for flight paths
 * and as the mock road/rail preview when no directions geometry is available.
 */
export function greatCirclePolyline(
  a: GeoPoint,
  b: GeoPoint,
  steps = 48,
): GeoPoint[] {
  const lat1 = toRadians(a.lat);
  const lng1 = toRadians(a.lng);
  const lat2 = toRadians(b.lat);
  const lng2 = toRadians(b.lng);
  const d = 2 * Math.asin(
    Math.min(
      1,
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2,
      ),
    ),
  );

  if (d < 1e-12) {
    return [
      { lat: a.lat, lng: a.lng },
      { lat: b.lat, lng: b.lng },
    ];
  }

  const count = Math.max(2, steps);
  const points: GeoPoint[] = [];
  for (let i = 0; i <= count; i += 1) {
    const f = i / count;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2);
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lng = Math.atan2(y, x);
    points.push({
      lat: roundCoord(toDegrees(lat)),
      lng: roundCoord(toDegrees(lng)),
    });
  }
  return points;
}

export function simplifyPolyline(points: GeoPoint[], maxPoints = 200): GeoPoint[] {
  if (points.length <= maxPoints) return points;
  const last = maxPoints - 1;
  const step = (points.length - 1) / last;
  const out: GeoPoint[] = [];
  for (let i = 0; i < last; i += 1) {
    out.push(points[Math.round(i * step)]);
  }
  out.push(points[points.length - 1]);
  return out;
}

function roundCoord(value: number): number {
  return Math.round(value * 100_000) / 100_000;
}
