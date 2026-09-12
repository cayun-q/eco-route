import type { CreateTripRequest, EstimateRequest, EstimateResponse, Place, TravelMode, Trip } from "@carbonroute/shared";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (typeof window !== "undefined" ? "" : "http://127.0.0.1:47832");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function suggestPlaces(q: string, mode?: TravelMode): Promise<{ places: Place[] }> {
  const params = new URLSearchParams({ q });
  if (mode) params.set("mode", mode);
  return request(`/api/geocode/suggest?${params.toString()}`);
}

export function suggestAirports(q: string): Promise<{ places: Place[] }> {
  // TODO(openflights): IATA picker. Later HARD BLOCK — no suggest for OD not in snapshot.
  return request(`/api/airports/suggest?q=${encodeURIComponent(q)}`);
}

export function searchPlaces(q: string): Promise<{ places: Place[] }> {
  return suggestPlaces(q);
}

export function estimateTrip(body: EstimateRequest): Promise<EstimateResponse> {
  return request("/estimate", { method: "POST", body: JSON.stringify(body) });
}

export function createTrip(body: CreateTripRequest): Promise<Trip> {
  return request("/trips", { method: "POST", body: JSON.stringify(body) });
}

export function listTrips(): Promise<{ trips: Trip[] }> {
  return request("/trips");
}

export function getTrip(id: string): Promise<Trip> {
  return request(`/trips/${id}`);
}
