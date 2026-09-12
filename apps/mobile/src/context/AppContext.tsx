import {
  calculateEmissions,
  pickFactor,
  resolveSubtype,
  type CreateTripRequest,
  type EmissionFactor,
  type EstimateResult,
  type Trip,
  type TripSummary,
} from "@carbonroute/shared";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createTrip, estimateTrip, fetchSummary } from "../lib/api";
import { enqueue, hydrate, localEstimate, newClientId, tripFromEstimate } from "../lib/offline";
import { cacheTrips, type QueuedTrip } from "../lib/storage";

export type Screen =
  | { name: "home" }
  | { name: "log" }
  | { name: "detail"; tripId: string };

interface AppState {
  screen: Screen;
  online: boolean;
  loading: boolean;
  factors: EmissionFactor[];
  trips: Trip[];
  queue: QueuedTrip[];
  summary: TripSummary;
  error: string | null;
  go: (screen: Screen) => void;
  refresh: () => Promise<void>;
  estimate: (input: Omit<CreateTripRequest, "clientId">) => Promise<EstimateResult>;
  saveTrip: (input: Omit<CreateTripRequest, "clientId">) => Promise<Trip>;
}

const emptySummary: TripSummary = { tripCount: 0, totalGramsCo2e: 0, byMode: [] };

const AppContext = createContext<AppState | null>(null);

function summarize(trips: Trip[]): TripSummary {
  const byMode = new Map<Trip["route"]["mode"], { tripCount: number; gramsCo2e: number }>();
  for (const trip of trips) {
    const current = byMode.get(trip.route.mode) ?? { tripCount: 0, gramsCo2e: 0 };
    current.tripCount += 1;
    current.gramsCo2e += trip.gramsCo2e;
    byMode.set(trip.route.mode, current);
  }
  return {
    tripCount: trips.length,
    totalGramsCo2e: trips.reduce((sum, trip) => sum + trip.gramsCo2e, 0),
    byMode: [...byMode.entries()].map(([mode, value]) => ({ mode, ...value })),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [queue, setQueue] = useState<QueuedTrip[]>([]);
  const [summary, setSummary] = useState<TripSummary>(emptySummary);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await hydrate();
      setOnline(snapshot.online);
      setFactors(snapshot.factors);
      setTrips(snapshot.trips);
      setQueue(snapshot.queue);
      if (snapshot.online) {
        try {
          setSummary(await fetchSummary());
        } catch {
          setSummary(summarize(snapshot.trips));
        }
      } else {
        setSummary(summarize(snapshot.trips));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const estimate = async (input: Omit<CreateTripRequest, "clientId">) => {
    try {
      const result = await estimateTrip(input);
      setOnline(true);
      return result;
    } catch (err) {
      if (factors.length && input.distanceMiles != null && input.durationMinutes != null) {
        setOnline(false);
        return localEstimate({ ...input, clientId: "preview" }, factors);
      }
      throw err instanceof Error ? err : new Error("Estimate failed");
    }
  };

  const saveTrip = async (input: Omit<CreateTripRequest, "clientId">) => {
    const payload: CreateTripRequest = {
      ...input,
      clientId: newClientId(),
      loggedAt: new Date().toISOString(),
    };
    try {
      const trip = await createTrip(payload);
      const next = [trip, ...trips.filter((item) => item.clientId !== trip.clientId)];
      setTrips(next);
      setSummary(summarize(next));
      setOnline(true);
      await cacheTrips(next);
      return trip;
    } catch {
      let estimateResult: EstimateResult;
      if (payload.distanceMiles != null && payload.durationMinutes != null && factors.length) {
        estimateResult = localEstimate(payload, factors);
      } else {
        const subtype = resolveSubtype(payload.mode, payload.subtype, payload.distanceMiles);
        const factor = pickFactor(factors, payload.mode, subtype);
        const miles = payload.distanceMiles ?? 0;
        const minutes = payload.durationMinutes ?? 0;
        if (!miles || !factors.length) {
          throw new Error(
            "You are offline. Add distance and duration, or reconnect, to log this trip.",
          );
        }
        estimateResult = {
          route: {
            origin: payload.origin,
            destination: payload.destination,
            originCoords: payload.originCoords,
            destCoords: payload.destCoords,
            mode: payload.mode,
            subtype,
            distanceMiles: miles,
            durationMinutes: minutes,
          },
          emissionFactor: factor,
          emissions: calculateEmissions(
            { distanceMiles: miles, durationMinutes: minutes },
            factor,
          ),
        };
      }
      const local = tripFromEstimate(payload.clientId, estimateResult, payload.loggedAt);
      const nextQueue = await enqueue({
        ...payload,
        distanceMiles: local.route.distanceMiles,
        durationMinutes: local.route.durationMinutes,
        subtype: local.route.subtype,
      });
      const nextTrips = [local, ...trips];
      setOnline(false);
      setQueue(nextQueue);
      setTrips(nextTrips);
      setSummary(summarize(nextTrips));
      await cacheTrips(nextTrips);
      return local;
    }
  };

  const value = useMemo<AppState>(
    () => ({
      screen,
      online,
      loading,
      factors,
      trips,
      queue,
      summary,
      error,
      go: setScreen,
      refresh,
      estimate,
      saveTrip,
    }),
    [screen, online, loading, factors, trips, queue, summary, error],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
