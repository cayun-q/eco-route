import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { EmissionFactor, Trip, TripInput, TripStats } from "@carbonroute/shared";
import { api } from "./api";
import {
  cacheFactors,
  enqueueTrip,
  readCachedFactors,
  readQueue,
  removeQueued,
} from "./offline";

const emptyStats = (): TripStats => ({
  tripCount: 0,
  totalCo2eKg: 0,
  byMode: {
    car: { count: 0, co2eKg: 0 },
    plane: { count: 0, co2eKg: 0 },
  },
});

type Store = {
  trips: Trip[];
  stats: TripStats;
  factors: EmissionFactor[];
  online: boolean;
  loading: boolean;
  error: string | null;
  lastRefreshedAt: number | null;
  refresh: () => Promise<void>;
  saveTrip: (input: TripInput) => Promise<Trip>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState<TripStats>(emptyStats);
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);

  const flushQueue = useCallback(async () => {
    const queued = await readQueue();
    for (const item of queued) {
      try {
        await api.createTrip({
          originLabel: item.originLabel,
          destinationLabel: item.destinationLabel,
          originLat: item.originLat,
          originLng: item.originLng,
          destLat: item.destLat,
          destLng: item.destLng,
          mode: item.mode,
          logMethod: item.logMethod,
          distanceKm: item.distanceKm,
          durationMin: item.durationMin,
          co2eKg: item.co2eKg,
          polyline: item.polyline,
          legs: item.legs,
          factorGPerKm: item.factorGPerKm,
          factorSource: item.factorSource,
        });
        await removeQueued(item.id);
      } catch {
        break;
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const cached = await readCachedFactors();
    if (cached.length) setFactors(cached);
    const queued = await readQueue();

    try {
      await flushQueue();
      const [factorRes, tripRes, statsRes] = await Promise.all([api.factors(), api.trips(), api.stats()]);
      await cacheFactors(factorRes.factors);
      const stillQueued = await readQueue();
      setFactors(factorRes.factors);
      setTrips([...stillQueued, ...tripRes.trips]);
      setStats(statsRes);
      setOnline(true);
      setError(null);
      setLastRefreshedAt(Date.now());
    } catch (err) {
      setOnline(false);
      setTrips(queued);
      setStats({
        ...emptyStats(),
        tripCount: queued.length,
        totalCo2eKg: queued.reduce((n, t) => n + t.co2eKg, 0),
      });
      setError(err instanceof Error ? err.message : "Could not reach the API.");
    } finally {
      setLoading(false);
    }
  }, [flushQueue]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveTrip = useCallback(
    async (input: TripInput) => {
      try {
        const { trip } = await api.createTrip(input);
        await refresh();
        return trip;
      } catch {
        const queued = await enqueueTrip(input);
        await refresh();
        return queued;
      }
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ trips, stats, factors, online, loading, error, lastRefreshedAt, refresh, saveTrip }),
    [trips, stats, factors, online, loading, error, lastRefreshedAt, refresh, saveTrip],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
