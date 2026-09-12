import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { EmissionFactor, LogMethod, Trip, TripInput, TripStats } from "@carbonroute/shared";
import {
  setDefaultDisplayPrecision,
  setDefaultMeasurementSystem,
  setDefaultShowDrivingComparison,
  type DisplayPrecision,
  type MeasurementSystem,
} from "./format";
import type { ResolvedTheme, ThemePreference } from "./theme";
import { api } from "./api";
import {
  cacheFactors,
  clearQueue,
  enqueueTrip,
  readCachedFactors,
  readQueue,
  removeQueued,
} from "./offline";

const SETTINGS_KEY = "luma.preferences.v2";
const LEGACY_MEASUREMENT_KEY = "luma.measurement.v1";
export type RecentTripsPreference = 5 | 10 | 25 | "all";

type Preferences = {
  measurementSystem: MeasurementSystem;
  defaultLoggingMethod: LogMethod;
  themePreference: ThemePreference;
  displayPrecision: DisplayPrecision;
  showDrivingComparison: boolean;
  recentTrips: RecentTripsPreference;
};

const DEFAULT_PREFERENCES: Preferences = {
  measurementSystem: "metric",
  defaultLoggingMethod: "automatic",
  themePreference: "system",
  displayPrecision: "simple",
  showDrivingComparison: true,
  recentTrips: 10,
};

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
  preferencesLoaded: boolean;
  measurementSystem: MeasurementSystem;
  defaultLoggingMethod: LogMethod;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  displayPrecision: DisplayPrecision;
  showDrivingComparison: boolean;
  recentTrips: RecentTripsPreference;
  setMeasurementSystem: (value: MeasurementSystem) => Promise<void>;
  setDefaultLoggingMethod: (value: LogMethod) => Promise<void>;
  setThemePreference: (value: ThemePreference) => Promise<void>;
  setDisplayPrecision: (value: DisplayPrecision) => Promise<void>;
  setShowDrivingComparison: (value: boolean) => Promise<void>;
  setRecentTrips: (value: RecentTripsPreference) => Promise<void>;
  refresh: () => Promise<void>;
  saveTrip: (input: TripInput) => Promise<Trip>;
  deleteTrip: (trip: Trip) => Promise<void>;
  clearTrips: () => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState<TripStats>(emptyStats);
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      let next = DEFAULT_PREFERENCES;
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<Preferences>;
          next = { ...DEFAULT_PREFERENCES, ...saved };
        } else {
          const legacy = await AsyncStorage.getItem(LEGACY_MEASUREMENT_KEY);
          if (legacy === "metric" || legacy === "imperial") {
            next = { ...DEFAULT_PREFERENCES, measurementSystem: legacy };
          }
        }
      } catch {
        next = DEFAULT_PREFERENCES;
      }
      setDefaultMeasurementSystem(next.measurementSystem);
      setDefaultDisplayPrecision(next.displayPrecision);
      setDefaultShowDrivingComparison(next.showDrivingComparison);
      setPreferences(next);
      setPreferencesLoaded(true);
    })();
  }, []);

  const updatePreference = useCallback(async <K extends keyof Preferences,>(key: K, value: Preferences[K]) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      void AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setMeasurementSystem = useCallback(async (value: MeasurementSystem) => {
    setDefaultMeasurementSystem(value);
    await updatePreference("measurementSystem", value);
  }, [updatePreference]);

  const setDefaultLoggingMethod = useCallback(async (value: LogMethod) => {
    await updatePreference("defaultLoggingMethod", value);
  }, [updatePreference]);

  const setThemePreference = useCallback(async (value: ThemePreference) => {
    await updatePreference("themePreference", value);
  }, [updatePreference]);

  const setDisplayPrecision = useCallback(async (value: DisplayPrecision) => {
    setDefaultDisplayPrecision(value);
    await updatePreference("displayPrecision", value);
  }, [updatePreference]);

  const setShowDrivingComparison = useCallback(async (value: boolean) => {
    setDefaultShowDrivingComparison(value);
    await updatePreference("showDrivingComparison", value);
  }, [updatePreference]);

  const setRecentTrips = useCallback(async (value: RecentTripsPreference) => {
    await updatePreference("recentTrips", value);
  }, [updatePreference]);

  const resolvedTheme: ResolvedTheme =
    preferences.themePreference === "system"
      ? systemScheme === "dark" ? "dark" : "light"
      : preferences.themePreference;

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
      setStats({ ...emptyStats(), tripCount: queued.length, totalCo2eKg: queued.reduce((n, t) => n + t.co2eKg, 0) });
      setError(err instanceof Error ? err.message : "Could not reach the API.");
    } finally {
      setLoading(false);
    }
  }, [flushQueue]);

  useEffect(() => { void refresh(); }, [refresh]);

  const saveTrip = useCallback(async (input: TripInput) => {
    try {
      const { trip } = await api.createTrip(input);
      await refresh();
      return trip;
    } catch {
      const queued = await enqueueTrip(input);
      await refresh();
      return queued;
    }
  }, [refresh]);

  const deleteTrip = useCallback(async (trip: Trip) => {
    if (trip.pending || trip.id.startsWith("local-")) await removeQueued(trip.id);
    else await api.deleteTrip(trip.id);
    await refresh();
  }, [refresh]);

  const clearTrips = useCallback(async () => {
    await clearQueue();
    await api.clearTrips();
    await refresh();
  }, [refresh]);

  const value = useMemo(() => ({
    trips, stats, factors, online, loading, error, lastRefreshedAt, preferencesLoaded,
    measurementSystem: preferences.measurementSystem,
    defaultLoggingMethod: preferences.defaultLoggingMethod,
    themePreference: preferences.themePreference,
    resolvedTheme,
    displayPrecision: preferences.displayPrecision,
    showDrivingComparison: preferences.showDrivingComparison,
    recentTrips: preferences.recentTrips,
    setMeasurementSystem, setDefaultLoggingMethod, setThemePreference, setDisplayPrecision,
    setShowDrivingComparison, setRecentTrips, refresh, saveTrip, deleteTrip, clearTrips,
  }), [
    trips, stats, factors, online, loading, error, lastRefreshedAt, preferencesLoaded, preferences,
    resolvedTheme, setMeasurementSystem, setDefaultLoggingMethod, setThemePreference, setDisplayPrecision,
    setShowDrivingComparison, setRecentTrips, refresh, saveTrip, deleteTrip, clearTrips,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
