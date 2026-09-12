import type { TravelMode } from "./theme";

export type Place = {
  id: string;
  label: string;
  kind: "city" | "airport" | "station" | "address";
  lat: number;
  lng: number;
  region?: string;
  /** IATA when this is an airport. OpenFlights picker will fill this later. */
  iata?: string;
};

export type LatLng = { lat: number; lng: number };

export type PlaceRef =
  | { placeId: string; iata?: string }
  | { label: string; lat: number; lng: number; iata?: string };

export type LegInput = {
  mode: TravelMode;
  origin: PlaceRef;
  destination: PlaceRef;
};

export type EstimatedLeg = {
  seq: number;
  mode: TravelMode;
  origin: Place;
  destination: Place;
  distanceKm: number;
  durationMin: number;
  co2eKg: number;
  kgCo2ePerKm: number;
  factor: {
    id: number;
    activity: string;
    band: string | null;
    source: string;
    year: number;
  };
  polyline: LatLng[];
};

export type TripTotals = {
  distanceKm: number;
  durationMin: number;
  co2eKg: number;
};

export type EstimateRequest =
  | { legs: LegInput[] }
  | { mode: TravelMode; origin: PlaceRef; destination: PlaceRef };

export type EstimateResponse = {
  legs: EstimatedLeg[];
  totals: TripTotals;
};

export type Trip = EstimateResponse & {
  id: string;
  title: string;
  createdAt: string;
};

export type CreateTripRequest = EstimateRequest & { title?: string };
