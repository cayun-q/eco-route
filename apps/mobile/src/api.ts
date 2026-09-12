import type { EmissionFactor, Place, RouteEstimate, TransportMode, Trip, TripInput, TripStats } from "@carbonroute/shared";

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:43124").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const requestPath = method === "GET"
    ? `${path}${path.includes("?") ? "&" : "?"}_=${Date.now()}`
    : path;
  const res = await fetch(`${BASE}${requestPath}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
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
  estimate: (body: { origin: string; destination: string; mode: TransportMode; direct?: boolean }) =>
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
  deleteTrip: (id: string) =>
    request<{ deleted: boolean }>(`/api/trips/${encodeURIComponent(id)}`, { method: "DELETE" }),
  clearTrips: () => request<{ deleted: number }>("/api/trips", { method: "DELETE" }),
  stats: () => request<TripStats>("/api/stats"),
};

export { BASE as API_BASE };
