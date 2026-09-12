export const TRAVEL_MODES = ["car", "plane", "train"] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];

export const FACTOR_SUBTYPES = [
  "petrol",
  "ev",
  "short_haul",
  "long_haul",
  "diesel",
  "electric",
] as const;
export type FactorSubtype = (typeof FACTOR_SUBTYPES)[number];

export const MODE_SUBTYPES: Record<TravelMode, FactorSubtype[]> = {
  car: ["petrol", "ev"],
  plane: ["short_haul", "long_haul"],
  train: ["diesel", "electric"],
};

export const SHORT_HAUL_MILE_LIMIT = 1500;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Route {
  id?: string;
  origin: string;
  destination: string;
  originCoords?: GeoPoint | null;
  destCoords?: GeoPoint | null;
  mode: TravelMode;
  subtype: FactorSubtype;
  distanceMiles: number;
  durationMinutes: number;
}

export interface EmissionFactor {
  id: number;
  mode: TravelMode;
  subtype: FactorSubtype;
  gramsCo2ePerMile: number | null;
  gramsCo2ePerHour: number | null;
  source: string;
  year: number;
  isActive: boolean;
}

export interface EmissionBreakdown {
  gramsCo2e: number;
  fromDistance: number;
  fromDuration: number;
}

export interface Trip {
  id: string;
  clientId: string;
  userId: string;
  route: Route;
  emissionFactor: EmissionFactor;
  gramsCo2e: number;
  fromDistance: number;
  fromDuration: number;
  loggedAt: string;
  pendingSync?: boolean;
}

export interface TripSummary {
  tripCount: number;
  totalGramsCo2e: number;
  byMode: Array<{
    mode: TravelMode;
    tripCount: number;
    gramsCo2e: number;
  }>;
}

export interface CreateTripRequest {
  clientId: string;
  origin: string;
  destination: string;
  mode: TravelMode;
  subtype?: FactorSubtype;
  originCoords?: GeoPoint | null;
  destCoords?: GeoPoint | null;
  distanceMiles?: number;
  durationMinutes?: number;
  loggedAt?: string;
}

export interface EstimateRequest {
  origin: string;
  destination: string;
  mode: TravelMode;
  subtype?: FactorSubtype;
  originCoords?: GeoPoint | null;
  destCoords?: GeoPoint | null;
  distanceMiles?: number;
  durationMinutes?: number;
}

export interface EstimateResult {
  route: Route;
  emissionFactor: EmissionFactor;
  emissions: EmissionBreakdown;
}

export interface RoutingEstimate {
  distanceMiles: number;
  durationMinutes: number;
  originCoords: GeoPoint;
  destCoords: GeoPoint;
  provider: string;
  method: "directions" | "haversine" | "mock";
}
