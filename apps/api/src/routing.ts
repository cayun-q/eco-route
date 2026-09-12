import type { LatLng, TravelMode } from "@carbonroute/shared";

const EARTH_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function interpolateGreatCircle(a: LatLng, b: LatLng, t: number): LatLng {
  const lat1 = toRad(a.lat);
  const lon1 = toRad(a.lng);
  const lat2 = toRad(b.lat);
  const lon2 = toRad(b.lng);
  const d = 2 * Math.asin(
    Math.min(
      1,
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
      ),
    ),
  );
  if (d < 1e-9) return { lat: a.lat, lng: a.lng };
  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
  const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);
  return {
    lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
    lng: toDeg(Math.atan2(y, x)),
  };
}

/**
 * Plane: a slight great-circle bow — almost flat, clearly not a lat/lng
 * chord, no extra sine-lift rainbow, no 3D chrome.
 */
export function greatCircleArc(origin: LatLng, destination: LatLng): LatLng[] {
  const distance = haversineKm(origin, destination);
  const steps = Math.max(16, Math.min(48, Math.round(distance / 50) + 16));
  const points: LatLng[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push(interpolateGreatCircle(origin, destination, t));
  }
  points[0] = origin;
  points[points.length - 1] = destination;
  return points;
}

/** Car/train fallback: flat 2D chord on the ground plane — no arc lift. */
export function mockRoad(origin: LatLng, destination: LatLng, _mode: "car" | "train"): LatLng[] {
  const distance = haversineKm(origin, destination);
  const steps = Math.max(2, Math.min(12, Math.round(distance / 120) + 2));
  const points: LatLng[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    points.push({
      lat: origin.lat + (destination.lat - origin.lat) * t,
      lng: origin.lng + (destination.lng - origin.lng) * t,
    });
  }
  points[0] = origin;
  points[points.length - 1] = destination;
  return points;
}

export function mockRoute(mode: TravelMode, origin: LatLng, destination: LatLng): LatLng[] {
  if (mode === "plane") return greatCircleArc(origin, destination);
  return mockRoad(origin, destination, mode);
}

async function osrmGeometry(origin: LatLng, destination: LatLng): Promise<{ polyline: LatLng[]; distanceKm: number } | null> {
  const path = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: { distance: number; geometry?: { coordinates?: [number, number][] } }[];
    };
    const route = data.routes?.[0];
    const coords = route?.geometry?.coordinates;
    if (!route || !coords?.length) return null;
    return {
      distanceKm: route.distance / 1000,
      polyline: coords.map(([lng, lat]) => ({ lat, lng })),
    };
  } catch {
    return null;
  }
}

export async function routeLeg(
  mode: TravelMode,
  origin: LatLng,
  destination: LatLng,
): Promise<{ polyline: LatLng[]; distanceKm: number }> {
  const gc = haversineKm(origin, destination);
  if (mode === "plane") {
    return { polyline: greatCircleArc(origin, destination), distanceKm: gc * 1.08 };
  }
  const osrm = await osrmGeometry(origin, destination);
  if (osrm) return osrm;
  const factor = mode === "train" ? 1.18 : 1.22;
  return { polyline: mockRoad(origin, destination, mode), distanceKm: gc * factor };
}

export function estimateDurationMin(mode: TravelMode, distanceKm: number): number {
  if (mode === "plane") return Math.round(distanceKm / 13 + 50);
  if (mode === "train") return Math.round(distanceKm / 1.85 + 12);
  return Math.round(distanceKm / 1.15 + 8);
}

export function flightBand(distanceKm: number): "domestic" | "short_haul" | "long_haul" {
  if (distanceKm < 800) return "domestic";
  if (distanceKm < 3700) return "short_haul";
  return "long_haul";
}

export function factorBand(mode: TravelMode, distanceKm: number): string {
  if (mode === "plane") return flightBand(distanceKm);
  if (mode === "train") return "national_rail";
  return "average";
}
