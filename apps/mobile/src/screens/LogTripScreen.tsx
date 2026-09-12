import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Place, RouteEstimate, TransportMode } from "@carbonroute/shared";
import type { RootStackParamList } from "../navigation";
import { api } from "../api";
import { offlineEstimate } from "../offline";
import { useStore } from "../store";
import { colors, space, type as font } from "../theme";
import { Button, Chip, Field, Heading, Muted, Screen } from "../ui";
import { MapPreview } from "../components/MapPreview";
import { vsDrivingCopy } from "../format";

type Props = NativeStackScreenProps<RootStackParamList, "LogTrip">;

const MODES: TransportMode[] = ["car", "plane"];
type CarStatus = "idle" | "checking" | "available" | "unavailable";

type AddressSearchProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

function AddressSearch({ label, value, onChange, placeholder }: AddressSearchProps) {
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [dismissedValue, setDismissedValue] = useState<string | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 3 || dismissedValue === value) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const result = await api.searchPlaces(query);
        if (!cancelled) setSuggestions(result.places);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [value, dismissedValue]);

  function change(next: string) {
    setDismissedValue(null);
    onChange(next);
  }

  function choose(place: Place) {
    setDismissedValue(place.label);
    setSuggestions([]);
    onChange(place.label);
  }

  return (
    <View style={styles.addressSearch}>
      <Field
        label={label}
        value={value}
        onChangeText={change}
        placeholder={placeholder}
        autoCapitalize="words"
        autoComplete="street-address"
      />
      {searching ? <Text style={styles.searchStatus}>Searching addresses…</Text> : null}
      {suggestions.length ? (
        <View style={styles.suggestions}>
          {suggestions.map((place, index) => (
            <Pressable
              key={`${place.lat}:${place.lng}:${place.label}`}
              onPress={() => choose(place)}
              style={({ pressed }) => [
                styles.suggestion,
                index > 0 && styles.suggestionBorder,
                pressed && styles.suggestionPressed,
              ]}
            >
              <Text style={styles.suggestionText} numberOfLines={2}>
                {place.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function isNoRoadError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("No drivable route exists");
}

function isHardRoutingError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : "";
  return (
    message.includes("No drivable route exists") ||
    message.includes("No usable airport connection") ||
    message.includes("Airport data is unavailable")
  );
}

export function LogTripScreen({ navigation }: Props) {
  const { factors, saveTrip } = useStore();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState<TransportMode>("car");
  const [carStatus, setCarStatus] = useState<CarStatus>("idle");
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const bothEnds = origin.trim().length > 0 && destination.trim().length > 0;

  useEffect(() => {
    if (!bothEnds) {
      setCarStatus("idle");
      return;
    }

    let cancelled = false;
    setCarStatus("checking");
    const handle = setTimeout(async () => {
      try {
        await api.estimate({
          origin: origin.trim(),
          destination: destination.trim(),
          mode: "car",
        });
        if (!cancelled) setCarStatus("available");
      } catch (err) {
        if (cancelled) return;
        if (isNoRoadError(err)) {
          setCarStatus("unavailable");
          setMode((current) => (current === "car" ? "plane" : current));
          setEstimate((current) => (current?.mode === "car" ? null : current));
        } else {
          setCarStatus("idle");
        }
      }
    }, 650);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [origin, destination, bothEnds]);

  useEffect(() => {
    if (!bothEnds) {
      setEstimate(null);
      setEstimateError(null);
      setEstimating(false);
      return;
    }
    if (mode === "car" && carStatus === "unavailable") {
      setEstimate(null);
      setEstimateError("Car is unavailable because these locations are not connected by a drivable road route.");
      setEstimating(false);
      return;
    }

    let cancelled = false;
    setEstimating(true);
    setEstimateError(null);
    const handle = setTimeout(async () => {
      try {
        const result = await api.estimate({
          origin: origin.trim(),
          destination: destination.trim(),
          mode,
        });
        if (!cancelled) setEstimate(result);
      } catch (err) {
        if (mode === "plane" || isHardRoutingError(err)) {
          if (!cancelled) {
            setEstimate(null);
            setEstimateError(
              err instanceof Error
                ? err.message
                : mode === "plane"
                  ? "Could not build an airport itinerary."
                  : "No drivable route exists between these locations.",
            );
          }
        } else {
          try {
            const fallback = offlineEstimate(origin.trim(), destination.trim(), mode, factors);
            if (!cancelled) setEstimate(fallback);
          } catch {
            if (!cancelled) {
              setEstimate(null);
              setEstimateError(err instanceof Error ? err.message : "Could not preview this route.");
            }
          }
        }
      } finally {
        if (!cancelled) setEstimating(false);
      }
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [origin, destination, mode, bothEnds, factors, carStatus]);

  const compare = useMemo(() => vsDrivingCopy(estimate?.vsDrivingKg), [estimate]);

  async function onSave() {
    if (!estimate) return;
    setSaving(true);
    setSaveError(null);
    try {
      const trip = await saveTrip({
        originLabel: estimate.origin.label,
        destinationLabel: estimate.destination.label,
        originLat: estimate.origin.lat,
        originLng: estimate.origin.lng,
        destLat: estimate.destination.lat,
        destLng: estimate.destination.lng,
        mode: estimate.mode,
        distanceKm: estimate.distanceKm,
        durationMin: estimate.durationMin,
        co2eKg: estimate.co2eKg,
        polyline: estimate.polyline,
        factorGPerKm: estimate.factor.gPerKm,
        factorSource: estimate.factor.source,
      });
      navigation.replace("Results", { trip });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save this trip.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Heading>Log trip</Heading>
          <Muted>Search a city, street, or full address. Choose a suggestion for the most precise route.</Muted>

          <AddressSearch
            label="Origin"
            value={origin}
            onChange={setOrigin}
            placeholder="17 Billings St, Pittsburgh, PA"
          />
          <AddressSearch
            label="Destination"
            value={destination}
            onChange={setDestination}
            placeholder="5000 Forbes Ave, Pittsburgh, PA"
          />

          <Text style={styles.modeLabel}>Mode</Text>
          <View style={styles.modes}>
            {MODES.map((m) => (
              <Chip
                key={m}
                label={m[0].toUpperCase() + m.slice(1)}
                selected={mode === m}
                tone={m}
                disabled={m === "car" && carStatus === "unavailable"}
                onPress={() => setMode(m)}
              />
            ))}
          </View>
          {carStatus === "checking" && bothEnds ? (
            <Text style={styles.modeHint}>Checking whether a road route exists…</Text>
          ) : null}
          {carStatus === "unavailable" ? (
            <Text style={styles.modeUnavailable}>Car unavailable · no continuous drivable route between these locations.</Text>
          ) : null}

          {!bothEnds ? (
            <View style={styles.hold}>
              <Text style={styles.holdTitle}>Waiting on both ends</Text>
              <Text style={styles.holdBody}>
                Add a start and a finish. CarbonRoute will plot markers, a route, and distance / duration / CO₂e
                chips.
              </Text>
            </View>
          ) : null}

          {bothEnds && estimating && !estimate ? (
            <View style={styles.hold}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.holdBody}>{mode === "plane" ? "Finding airports and flight connections…" : "Plotting the route…"}</Text>
            </View>
          ) : null}

          {estimateError ? <Text style={styles.error}>{estimateError}</Text> : null}

          {estimate ? (
            <View style={styles.preview}>
              <MapPreview estimate={estimate} />
              <Text style={styles.factor}>
                {estimate.legs?.length
                  ? `Multimodal estimate · airport network + road routing`
                  : `${estimate.factor.gPerKm} g/km · ${estimate.factor.source}${estimate.offline ? " · offline cache" : ` · ${estimate.provider}`}`}
              </Text>
              {compare ? <Text style={styles.compare}>{compare}</Text> : null}
            </View>
          ) : null}

          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

          <Button
            label={saving ? "Saving…" : "Save trip"}
            onPress={() => void onSave()}
            disabled={!estimate || saving}
          />
          <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: {
    padding: space.lg,
    paddingTop: space.xl,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    gap: space.md,
    paddingBottom: 48,
  },
  addressSearch: {
    gap: 4,
    position: "relative",
    zIndex: 10,
  },
  searchStatus: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.muted,
    paddingHorizontal: 2,
  },
  suggestions: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    overflow: "hidden",
  },
  suggestion: {
    paddingHorizontal: space.md,
    paddingVertical: 11,
    backgroundColor: colors.surface,
  },
  suggestionBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  suggestionPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  suggestionText: {
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 19,
    color: colors.ink,
  },
  modeLabel: {
    fontFamily: font.bodyMed,
    fontSize: 13,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: space.xs,
  },
  modes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  modeHint: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.muted,
    marginTop: -space.sm,
  },
  modeUnavailable: {
    fontFamily: font.bodyMed,
    fontSize: 12,
    color: colors.danger,
    marginTop: -space.sm,
  },
  hold: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
  },
  holdTitle: {
    fontFamily: font.display,
    fontSize: 18,
    color: colors.ink,
  },
  holdBody: {
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  preview: {
    gap: space.sm,
  },
  factor: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.muted,
  },
  compare: {
    fontFamily: font.bodyMed,
    fontSize: 14,
    color: colors.accentText,
  },
  error: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.danger,
  },
});
