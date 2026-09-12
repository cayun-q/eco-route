import type { EmissionFactor, GeoPoint, Route, TravelMode, FactorSubtype } from "@carbonroute/shared";

export interface FactorRow {
  id: number;
  mode: string;
  subtype: string;
  grams_co2e_per_mile: string | null;
  grams_co2e_per_hour: string | null;
  source: string;
  year: number;
  is_active: boolean;
}

export function mapFactor(row: FactorRow): EmissionFactor {
  return {
    id: row.id,
    mode: row.mode as TravelMode,
    subtype: row.subtype as FactorSubtype,
    gramsCo2ePerMile: row.grams_co2e_per_mile == null ? null : Number(row.grams_co2e_per_mile),
    gramsCo2ePerHour: row.grams_co2e_per_hour == null ? null : Number(row.grams_co2e_per_hour),
    source: row.source,
    year: row.year,
    isActive: row.is_active,
  };
}

export interface RouteRow {
  id: string;
  origin: string;
  destination: string;
  origin_lat: string | null;
  origin_lng: string | null;
  dest_lat: string | null;
  dest_lng: string | null;
  mode: string;
  subtype: string;
  distance_miles: string;
  duration_minutes: string;
}

function point(lat: string | null, lng: string | null): GeoPoint | null {
  if (lat == null || lng == null) return null;
  return { lat: Number(lat), lng: Number(lng) };
}

export function mapRoute(row: RouteRow): Route {
  return {
    id: row.id,
    origin: row.origin,
    destination: row.destination,
    originCoords: point(row.origin_lat, row.origin_lng),
    destCoords: point(row.dest_lat, row.dest_lng),
    mode: row.mode as TravelMode,
    subtype: row.subtype as FactorSubtype,
    distanceMiles: Number(row.distance_miles),
    durationMinutes: Number(row.duration_minutes),
  };
}
