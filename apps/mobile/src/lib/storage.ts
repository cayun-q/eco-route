import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CreateTripRequest, EmissionFactor, Trip } from "@carbonroute/shared";

const KEYS = {
  factors: "cr.factors",
  trips: "cr.trips",
  queue: "cr.queue",
};

export interface QueuedTrip {
  clientId: string;
  payload: CreateTripRequest;
  createdAt: string;
  lastError?: string;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function cacheFactors(factors: EmissionFactor[]) {
  return AsyncStorage.setItem(
    KEYS.factors,
    JSON.stringify({ cachedAt: new Date().toISOString(), factors }),
  );
}

export async function loadCachedFactors(): Promise<EmissionFactor[]> {
  const data = await readJson<{ factors?: EmissionFactor[] }>(KEYS.factors, {});
  return data.factors ?? [];
}

export function cacheTrips(trips: Trip[]) {
  return AsyncStorage.setItem(KEYS.trips, JSON.stringify(trips));
}

export function loadCachedTrips(): Promise<Trip[]> {
  return readJson<Trip[]>(KEYS.trips, []);
}

export function loadQueue(): Promise<QueuedTrip[]> {
  return readJson<QueuedTrip[]>(KEYS.queue, []);
}

export function saveQueue(queue: QueuedTrip[]) {
  return AsyncStorage.setItem(KEYS.queue, JSON.stringify(queue));
}
