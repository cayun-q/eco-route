import type { LatLng, TransportMode } from "./types";
import { round3 } from "./emissions";

const EARTH_KM = 6371;

export const MODE_SPEED_KMH: Record<TransportMode, number> = {
  car: 72,
  plane: 780,
  train: 110,
};

export const MODE_OVERHEAD_MIN: Record<TransportMode, number> = {
  car: 8,
  plane: 75,
  train: 20,
};

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function deg(r: number): number {
  return (r * 180) / Math.PI;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

function interpolateGreatCircle(a: LatLng, b: LatLng, t: number): [number, number] {
  const lat1 = rad(a.lat);
  const lon1 = rad(a.lng);
  const lat2 = rad(b.lat);
  const lon2 = rad(b.lng);
  const d = 2 * Math.asin(
    Math.min(
      1,
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
      ),
    ),
  );
  if (d < 1e-9) return [a.lat, a.lng];
  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
  const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);
  return [deg(Math.atan2(z, Math.sqrt(x * x + y * y))), deg(Math.atan2(y, x))];
}

/** Google Maps–style path without a routing key: points along the great circle. */
export function greatCirclePolyline(
  a: LatLng,
  b: LatLng,
  minPoints = 12,
): [number, number][] {
  const dist = haversineKm(a, b);
  const steps = Math.max(minPoints, Math.ceil(dist / 22));
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i += 1) {
    points.push(interpolateGreatCircle(a, b, i / steps));
  }
  return points;
}

export function durationMinForMode(distanceKm: number, mode: TransportMode): number {
  const hours = distanceKm / MODE_SPEED_KMH[mode];
  return Math.max(1, Math.round(hours * 60 + MODE_OVERHEAD_MIN[mode]));
}

export function mockRoute(a: LatLng, b: LatLng, mode: TransportMode): {
  distanceKm: number;
  durationMin: number;
  polyline: [number, number][];
} {
  const distanceKm = round3(haversineKm(a, b));
  return {
    distanceKm,
    durationMin: durationMinForMode(distanceKm, mode),
    polyline: greatCirclePolyline(a, b),
  };
}

/** Decode a Google/Mapbox encoded polyline into [lat, lng] pairs. */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export function parseLatLng(input: string): LatLng | null {
  const m = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
