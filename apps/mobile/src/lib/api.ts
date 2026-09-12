import type {
  CreateTripRequest,
  EmissionFactor,
  EstimateRequest,
  EstimateResult,
  Trip,
  TripSummary,
} from "@carbonroute/shared";

const DEFAULT_API = "http://127.0.0.1:43124";

export function apiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API).replace(/\/$/, "");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}/api${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  return body;
}

export async function fetchFactors(): Promise<EmissionFactor[]> {
  const data = await request<{ factors: EmissionFactor[] }>("/emission-factors");
  return data.factors;
}

export async function fetchTrips(): Promise<Trip[]> {
  const data = await request<{ trips: Trip[] }>("/trips");
  return data.trips;
}

export async function fetchSummary(): Promise<TripSummary> {
  return request<TripSummary>("/trips/summary");
}

export async function estimateTrip(input: EstimateRequest): Promise<EstimateResult> {
  return request<EstimateResult>("/routes/estimate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createTrip(input: CreateTripRequest): Promise<Trip> {
  return request<Trip>("/trips", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function pingHealth(): Promise<boolean> {
  try {
    const data = await request<{ ok: boolean }>("/health");
    return data.ok === true;
  } catch {
    return false;
  }
}
