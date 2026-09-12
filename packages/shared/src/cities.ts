import type { GeoPoint } from "./types";

/** Common demo cities so mock routing feels real without an API key. */
export const KNOWN_CITIES: Record<string, GeoPoint> = {
  london: { lat: 51.5074, lng: -0.1278 },
  "new york": { lat: 40.7128, lng: -74.006 },
  nyc: { lat: 40.7128, lng: -74.006 },
  paris: { lat: 48.8566, lng: 2.3522 },
  berlin: { lat: 52.52, lng: 13.405 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  madrid: { lat: 40.4168, lng: -3.7038 },
  rome: { lat: 41.9028, lng: 12.4964 },
  lisbon: { lat: 38.7223, lng: -9.1393 },
  dublin: { lat: 53.3498, lng: -6.2603 },
  edinburgh: { lat: 55.9533, lng: -3.1883 },
  manchester: { lat: 53.4808, lng: -2.2426 },
  birmingham: { lat: 52.4862, lng: -1.8904 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  chicago: { lat: 41.8781, lng: -87.6298 },
  boston: { lat: 42.3601, lng: -71.0589 },
  seattle: { lat: 47.6062, lng: -122.3321 },
  miami: { lat: 25.7617, lng: -80.1918 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  vancouver: { lat: 49.2827, lng: -123.1207 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  singapore: { lat: 1.3521, lng: 103.8198 },
};

function normalizePlace(name: string): string {
  return name.trim().toLowerCase().replace(/,.*$/, "").replace(/\s+/g, " ");
}

/** Deterministic fallback coords so unknown places still produce a stable route. */
export function hashToPoint(name: string): GeoPoint {
  let hash = 0;
  for (const char of name.toLowerCase()) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  const lat = hash % 14000 / 100 - 70;
  const lng = (hash / 14000) % 36000 / 100 - 180;
  return { lat: Math.round(lat * 10000) / 10000, lng: Math.round(lng * 10000) / 10000 };
}

export function geocodeMock(name: string): GeoPoint {
  const key = normalizePlace(name);
  return KNOWN_CITIES[key] ?? hashToPoint(name);
}
