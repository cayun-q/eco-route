import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  factorForMode,
  kgFromDistance,
  lookupOfflineEstimate,
  type EmissionFactor,
  type RouteEstimate,
  type TransportMode,
  type Trip,
  type TripInput,
} from "@carbonroute/shared";

const FACTORS_KEY = "carbonroute.factors.v1";
const QUEUE_KEY = "carbonroute.queue.v1";

export async function cacheFactors(factors: EmissionFactor[]): Promise<void> {
  await AsyncStorage.setItem(FACTORS_KEY, JSON.stringify({ savedAt: Date.now(), factors }));
}

export async function readCachedFactors(): Promise<EmissionFactor[]> {
  const raw = await AsyncStorage.getItem(FACTORS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { factors?: EmissionFactor[] };
    return parsed.factors ?? [];
  } catch {
    return [];
  }
}

export async function readQueue(): Promise<Trip[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Trip[];
  } catch {
    return [];
  }
}

export async function writeQueue(trips: Trip[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(trips));
}

export async function enqueueTrip(input: TripInput): Promise<Trip> {
  const trip: Trip = {
    ...input,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    pending: true,
    createdAt: new Date().toISOString(),
  };
  const q = await readQueue();
  q.unshift(trip);
  await writeQueue(q);
  return trip;
}

export async function removeQueued(id: string): Promise<void> {
  const q = await readQueue();
  await writeQueue(q.filter((t) => t.id !== id));
}

/** Offline estimate using cached factors + local gazetteer/haversine. */
export function offlineEstimate(
  origin: string,
  destination: string,
  mode: TransportMode,
  factors: EmissionFactor[],
): RouteEstimate {
  const routed = lookupOfflineEstimate(origin, destination, mode);
  const factor = factorForMode(factors, mode);
  const co2eKg = kgFromDistance(routed.distanceKm, factor.gPerKm);
  let drivingCo2eKg: number | null = null;
  let vsDrivingKg: number | null = null;
  if (mode !== "car") {
    try {
      const car = factorForMode(factors, "car");
      drivingCo2eKg = kgFromDistance(routed.distanceKm, car.gPerKm);
      vsDrivingKg = Math.round((co2eKg - drivingCo2eKg) * 1000) / 1000;
    } catch {
      drivingCo2eKg = null;
    }
  }
  return {
    ...routed,
    mode,
    co2eKg,
    factor,
    drivingCo2eKg,
    vsDrivingKg,
    provider: "haversine",
    offline: true,
  };
}
