import {
  calculateEmissions,
  geocodeMock,
  greatCirclePolyline,
  pickFactor,
  resolveSubtype,
  type CreateTripRequest,
  type EmissionFactor,
  type EstimateResult,
  type Trip,
} from "@carbonroute/shared";
import { createTrip, fetchFactors, fetchTrips, pingHealth } from "./api";
import {
  cacheFactors,
  cacheTrips,
  loadCachedFactors,
  loadCachedTrips,
  loadQueue,
  saveQueue,
  type QueuedTrip,
} from "./storage";

export function newClientId(): string {
  return `crt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function localEstimate(
  input: CreateTripRequest,
  factors: EmissionFactor[],
): EstimateResult {
  if (input.distanceMiles == null || input.durationMinutes == null) {
    throw new Error("Offline estimate needs distance and duration");
  }
  const subtype = resolveSubtype(input.mode, input.subtype, input.distanceMiles);
  const emissionFactor = pickFactor(factors, input.mode, subtype);
  const emissions = calculateEmissions(
    {
      distanceMiles: input.distanceMiles,
      durationMinutes: input.durationMinutes,
    },
    emissionFactor,
  );
  const originCoords = input.originCoords ?? geocodeMock(input.origin);
  const destCoords = input.destCoords ?? geocodeMock(input.destination);
  return {
    route: {
      origin: input.origin,
      destination: input.destination,
      originCoords,
      destCoords,
      mode: input.mode,
      subtype,
      distanceMiles: input.distanceMiles,
      durationMinutes: input.durationMinutes,
      polyline: greatCirclePolyline(originCoords, destCoords),
    },
    emissionFactor,
    emissions,
    routing: { provider: "offline", method: "mock" },
  };
}

export function tripFromEstimate(
  clientId: string,
  estimate: EstimateResult,
  loggedAt = new Date().toISOString(),
): Trip {
  return {
    id: clientId,
    clientId,
    userId: "local",
    route: estimate.route,
    emissionFactor: estimate.emissionFactor,
    gramsCo2e: estimate.emissions.gramsCo2e,
    fromDistance: estimate.emissions.fromDistance,
    fromDuration: estimate.emissions.fromDuration,
    loggedAt,
    pendingSync: true,
  };
}

export async function enqueue(payload: CreateTripRequest): Promise<QueuedTrip[]> {
  const queue = await loadQueue();
  const next = [
    ...queue.filter((item) => item.clientId !== payload.clientId),
    {
      clientId: payload.clientId,
      payload,
      createdAt: payload.loggedAt ?? new Date().toISOString(),
    },
  ];
  await saveQueue(next);
  return next;
}

export async function flushQueue(): Promise<{
  queue: QueuedTrip[];
  trips: Trip[];
  synced: number;
}> {
  const queue = await loadQueue();
  const remaining: QueuedTrip[] = [];
  let synced = 0;
  for (const item of queue) {
    try {
      await createTrip(item.payload);
      synced += 1;
    } catch (error) {
      remaining.push({
        ...item,
        lastError: error instanceof Error ? error.message : "Sync failed",
      });
    }
  }
  await saveQueue(remaining);
  const trips = await fetchTrips();
  await cacheTrips(trips);
  return { queue: remaining, trips, synced };
}

export async function hydrate(): Promise<{
  online: boolean;
  factors: EmissionFactor[];
  trips: Trip[];
  queue: QueuedTrip[];
}> {
  const [cachedFactors, cachedTrips, queue] = await Promise.all([
    loadCachedFactors(),
    loadCachedTrips(),
    loadQueue(),
  ]);

  const online = await pingHealth();
  if (!online) {
    return { online, factors: cachedFactors, trips: cachedTrips, queue };
  }

  try {
    const factors = await fetchFactors();
    await cacheFactors(factors);
    const flushed = queue.length ? await flushQueue() : { queue, trips: await fetchTrips(), synced: 0 };
    if (!queue.length) await cacheTrips(flushed.trips);
    return { online: true, factors, trips: flushed.trips, queue: flushed.queue };
  } catch {
    return { online: false, factors: cachedFactors, trips: cachedTrips, queue };
  }
}
