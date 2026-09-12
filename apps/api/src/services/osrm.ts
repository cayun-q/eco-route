export type LngLat = [number, number];

export const DEFAULT_OSRM_BASE = "https://router.project-osrm.org";

export type OsrmRoute = {
  coordinates: LngLat[];
  distanceKm: number;
  durationSec: number;
};

type OsrmResponse = {
  code?: string;
  message?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { type?: string; coordinates?: LngLat[] };
  }>;
};

export function osrmBaseUrl(): string {
  return (process.env.OSRM_BASE_URL ?? DEFAULT_OSRM_BASE).replace(/\/$/, "");
}

export function buildOsrmUrl(origin: LngLat, destination: LngLat, base = osrmBaseUrl()): string {
  const coords = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
  return `${base}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
}

export function parseOsrmResponse(payload: OsrmResponse): OsrmRoute {
  if (payload.code && payload.code !== "Ok") {
    throw new Error(payload.message || `OSRM returned ${payload.code}`);
  }
  const route = payload.routes?.[0];
  const coordinates = route?.geometry?.coordinates;
  if (!route || !coordinates || coordinates.length < 2) {
    throw new Error("OSRM returned no road geometry");
  }
  return {
    coordinates,
    distanceKm: (route.distance ?? 0) / 1000,
    durationSec: route.duration ?? 0,
  };
}

export async function fetchOsrmRoute(origin: LngLat, destination: LngLat): Promise<OsrmRoute> {
  const url = buildOsrmUrl(origin, destination);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`OSRM HTTP ${response.status}`);
    }
    return parseOsrmResponse((await response.json()) as OsrmResponse);
  } finally {
    clearTimeout(timer);
  }
}
