export const MODES = ["car", "ev", "bus", "bike", "walk", "plane"] as const;
export type TransportMode = (typeof MODES)[number];
export type LogMethod = "automatic" | "manual";

export type LatLng = {
  lat: number;
  lng: number;
};

export type Place = LatLng & {
  label: string;
};

export type EmissionFactor = {
  mode: TransportMode;
  gPerKm: number;
  source: string;
  notes?: string | null;
  updatedAt?: string;
};

export type RouteProvider = "haversine" | "mapbox" | "google" | "ors" | "osrm" | "openflights" | "estimated";

export type RouteLeg = {
  mode: TransportMode;
  origin: Place;
  destination: Place;
  distanceKm: number;
  durationMin: number;
  polyline: [number, number][];
  provider: RouteProvider;
  summary?: string;
};

export type RouteEstimate = {
  origin: Place;
  destination: Place;
  mode: TransportMode;
  distanceKm: number;
  durationMin: number;
  polyline: [number, number][];
  legs?: RouteLeg[];
  co2eKg: number;
  factor: EmissionFactor;
  drivingCo2eKg: number | null;
  vsDrivingKg: number | null;
  comparisonMode?: TransportMode | null;
  comparisonCo2eKg?: number | null;
  vsComparisonKg?: number | null;
  provider: RouteProvider;
  offline?: boolean;
};

export type Trip = {
  id: string;
  originLabel: string;
  destinationLabel: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  mode: TransportMode;
  logMethod?: LogMethod;
  distanceKm: number;
  durationMin: number;
  co2eKg: number;
  polyline: [number, number][];
  legs?: RouteLeg[];
  factorGPerKm: number;
  factorSource: string;
  pending?: boolean;
  createdAt: string;
};

export type TripInput = {
  originLabel: string;
  destinationLabel: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  mode: TransportMode;
  logMethod?: LogMethod;
  distanceKm: number;
  durationMin: number;
  co2eKg: number;
  polyline: [number, number][];
  legs?: RouteLeg[];
  factorGPerKm: number;
  factorSource: string;
};

export type TripStats = {
  tripCount: number;
  totalCo2eKg: number;
  byMode: Record<TransportMode, { count: number; co2eKg: number }>;
};
