import type { Airport } from "../types";
export type LngLat = [number, number];

const EARTH_KM = 6371;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function haversineKm(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

type Vec3 = [number, number, number];

export function lngLatToVec(point: LngLat): Vec3 {
  const lng = toRad(point[0]);
  const lat = toRad(point[1]);
  return [Math.cos(lat) * Math.cos(lng), Math.cos(lat) * Math.sin(lng), Math.sin(lat)];
}

export function vecToLngLat(vec: Vec3): LngLat {
  const norm = Math.hypot(vec[0], vec[1], vec[2]) || 1;
  const x = vec[0] / norm;
  const y = vec[1] / norm;
  const z = vec[2] / norm;
  return [toDeg(Math.atan2(y, x)), toDeg(Math.asin(Math.max(-1, Math.min(1, z))))];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function normalize(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

export function slerp(a: LngLat, b: LngLat, t: number): LngLat {
  const va = lngLatToVec(a);
  const vb = lngLatToVec(b);
  const omega = Math.acos(Math.max(-1, Math.min(1, dot(va, vb))));
  if (omega < 1e-6) return a;
  const so = Math.sin(omega);
  const p = add(scale(va, Math.sin((1 - t) * omega) / so), scale(vb, Math.sin(t * omega) / so));
  return vecToLngLat(p);
}

export function geodesicLine(a: LngLat, b: LngLat, samples = 48): LngLat[] {
  const points: LngLat[] = [];
  for (let i = 0; i <= samples; i += 1) {
    points.push(slerp(a, b, i / samples));
  }
  return points;
}

/**
 * Slight air-corridor curve: geodesic interpolation plus a sine bulge
 * along the great-circle normal. Planes do not follow roads.
 */
export function flightArc(a: LngLat, b: LngLat, bulge = 0.16, samples = 64): LngLat[] {
  const va = lngLatToVec(a);
  const vb = lngLatToVec(b);
  const normal = normalize(cross(va, vb));
  const chordKm = haversineKm(a, b);
  const offsetKm = Math.max(40, chordKm * bulge);
  const offsetAngle = offsetKm / EARTH_KM;
  const points: LngLat[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const base = lngLatToVec(slerp(a, b, t));
    const lift = Math.sin(Math.PI * t) * offsetAngle;
    points.push(vecToLngLat(add(base, scale(normal, lift))));
  }
  return points;
}

export function nearestAirport(point: LngLat, airports: Airport[]): Airport {
  let best = airports[0];
  let bestKm = Number.POSITIVE_INFINITY;
  for (const airport of airports) {
    const km = haversineKm(point, [airport.lng, airport.lat]);
    if (km < bestKm) {
      best = airport;
      bestKm = km;
    }
  }
  return best;
}

export function isFiniteLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
