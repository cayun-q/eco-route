import {
  mockRoute,
  type LatLng,
  type RouteProvider,
  type TransportMode,
} from "@carbonroute/shared";
import { AIRPORTS } from "../data/airports";
import {
  flightArc,
  geodesicLine,
  haversineKm,
  nearestAirport,
  type LngLat,
} from "./flightGeo";
import { fetchOsrmRoute } from "./osrm";

export type Routed = {
  distanceKm: number;
  durationMin: number;
  polyline: [number, number][];
  provider: RouteProvider;
  strokeColor: string;
  routerLabel: string;
  note?: string;
  airports?: { originIata: string; destinationIata: string };
  connectors?: [number, number][][];
};

export class RoutingError extends Error {
  status = 502;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
    this.name = "RoutingError";
  }
}

const STROKE = {
  car: "#1F6FEB",
  plane: "#C2410C",
  train: "#3F6212",
} as const;

const CITY_TO_AIRPORT_CONNECTOR_KM = 15;

function labeledFallbackEnabled(): boolean {
  return process.env.OSRM_LABELED_FALLBACK === "1";
}

function lngLat(p: LatLng): LngLat {
  return [p.lng, p.lat];
}

function toLatLngPolyline(coords: LngLat[]): [number, number][] {
  return coords.map(([lng, lat]) => [lat, lng]);
}

export async function routeBetween(
  origin: LatLng,
  dest: LatLng,
  mode: TransportMode,
): Promise<Routed> {
  if (mode === "car") {
    try {
      const road = await fetchOsrmRoute(lngLat(origin), lngLat(dest));
      return {
        distanceKm: Math.round(road.distanceKm * 1000) / 1000,
        durationMin: Math.max(1, Math.round(road.durationSec / 60)),
        polyline: toLatLngPolyline(road.coordinates),
        provider: "osrm",
        strokeColor: STROKE.car,
        routerLabel: "Public OSRM (OpenStreetMap roads)",
      };
    } catch (err) {
      if (labeledFallbackEnabled()) {
        const mock = mockRoute(origin, dest, mode);
        return {
          ...mock,
          provider: "haversine",
          strokeColor: STROKE.car,
          routerLabel: "Labeled fallback — not a road trace (OSRM unavailable)",
          note: "Road router was unreachable. This line is a labeled fallback, not a drive.",
        };
      }
      const detail = err instanceof Error ? err.message : "unknown error";
      throw new RoutingError(
        `Couldn't trace that drive on real roads (${detail}). Try different places, or check OSRM_BASE_URL.`,
      );
    }
  }

  if (mode === "plane") {
    const originAirport = nearestAirport(lngLat(origin), AIRPORTS);
    const destAirport = nearestAirport(lngLat(dest), AIRPORTS);
    if (originAirport.iata === destAirport.iata) {
      throw new RoutingError(
        `Those places both snap to ${originAirport.iata}. Pick a longer hop for a flight path.`,
        400,
      );
    }
    const from: LngLat = [originAirport.lng, originAirport.lat];
    const to: LngLat = [destAirport.lng, destAirport.lat];
    const airKm = haversineKm(from, to);
    const connectors: [number, number][][] = [];
    const originLL = lngLat(origin);
    const destLL = lngLat(dest);
    if (haversineKm(originLL, from) >= CITY_TO_AIRPORT_CONNECTOR_KM) {
      connectors.push(toLatLngPolyline([originLL, from]));
    }
    if (haversineKm(destLL, to) >= CITY_TO_AIRPORT_CONNECTOR_KM) {
      connectors.push(toLatLngPolyline([to, destLL]));
    }
    const durationMin = Math.max(30, Math.round((airKm / 800) * 60) + 30);
    return {
      distanceKm: Math.round(airKm * 1000) / 1000,
      durationMin,
      polyline: toLatLngPolyline(flightArc(from, to)),
      provider: "airport-arc",
      strokeColor: STROKE.plane,
      routerLabel: "Airport-aware flight corridor (curved great-circle, not roads)",
      note: `Flight via ${originAirport.iata} → ${destAirport.iata}. Curve is an air corridor, not a road trace.`,
      airports: { originIata: originAirport.iata, destinationIata: destAirport.iata },
      connectors,
    };
  }

  // train — geodesic only in this slice
  const rail = geodesicLine(lngLat(origin), lngLat(dest));
  const railKm = haversineKm(lngLat(origin), lngLat(dest));
  return {
    distanceKm: Math.round(railKm * 1000) / 1000,
    durationMin: Math.max(1, Math.round((railKm / 90) * 60)),
    polyline: toLatLngPolyline(rail),
    provider: "haversine",
    strokeColor: STROKE.train,
    routerLabel: "Geodesic (no rail router in this slice)",
    note: "Train geometry is a geodesic until a rail router is added.",
  };
}
