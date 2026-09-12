import type { EmissionFactor, Place, RouteEstimate, TransportMode, Trip, TripInput, TripStats } from "@carbonroute/shared";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:43124").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  health: () => request<{ ok: boolean }>("/api/health"),
  factors: () => request<{ factors: EmissionFactor[] }>("/api/factors"),
  searchPlaces: (query: string) =>
    request<{ places: Place[] }>(`/api/geocode/search?q=${encodeURIComponent(query)}`),
  estimate: (body: { origin: string; destination: string; mode: TransportMode }) =>
    request<RouteEstimate>("/api/routes/estimate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  trips: () => request<{ trips: Trip[] }>("/api/trips"),
  trip: (id: string) => request<{ trip: Trip }>(`/api/trips/${id}`),
  createTrip: (body: TripInput) =>
    request<{ trip: Trip }>("/api/trips", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  stats: () => request<TripStats>("/api/stats"),
};

export { BASE as API_BASE };
