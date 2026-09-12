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
import type {
  LogMethod,
  Place,
  RouteEstimate,
  RouteLeg,
  TransportMode,
} from "@carbonroute/shared";
import type { RootStackParamList } from "../navigation";
import { api } from "../api";
import { useStore } from "../store";
import { colors, space, type as font } from "../theme";
import { Button, Chip, Field, Heading, Muted, Screen } from "../ui";
import { MapPreview } from "../components/MapPreview";
import { vsDrivingCopy } from "../format";

type Props = NativeStackScreenProps<RootStackParamList, "LogTrip">;

const MODES: TransportMode[] = ["car", "plane"];
type CarStatus = "idle" | "checking" | "available" | "unavailable";
type ManualLegDraft = { origin: string; destination: string; mode: TransportMode };

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
      {searching ? <Text style={styles.searchStatus}>Searching…</Text> : null}
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

function shortLabel(label: string): string {
  return label.split(",")[0].trim();
}

export function LogTripScreen({ navigation }: Props) {
  const { saveTrip } = useStore();
  const [logMethod, setLogMethod] = useState<LogMethod>("automatic");

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState<TransportMode>("car");
  const [carStatus, setCarStatus] = useState<CarStatus>("idle");

  const [manualLegs, setManualLegs] = useState<ManualLegDraft[]>([
    { origin: "", destination: "", mode: "car" },
  ]);

  const [estimate, setEstimate] = useState<RouteEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const bothEnds = origin.trim().length > 0 && destination.trim().length > 0;

  function switchMethod(next: LogMethod) {
    if (next === logMethod) return;
    setLogMethod(next);
    setEstimate(null);
    setEstimateError(null);
    setSaveError(null);
  }

  useEffect(() => {
    if (logMethod !== "automatic" || !bothEnds) {
      setCarStatus("idle");
      return;
    }

    let cancelled = false;
    setCarStatus("checking");
    const handle = setTimeout(async () => {
      try {
        await api.estimate({ origin: origin.trim(), destination: destination.trim(), mode: "car" });
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
  }, [origin, destination, bothEnds, logMethod]);

  useEffect(() => {
    if (logMethod !== "automatic") return;
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
        const result = await api.estimate({ origin: origin.trim(), destination: destination.trim(), mode });
        if (!cancelled) setEstimate(result);
      } catch (err) {
        if (!cancelled) {
          setEstimate(null);
          setEstimateError(
            err instanceof Error
              ? err.message
              : mode === "plane"
                ? "Could not build an airport itinerary."
                : "Could not verify a real drivable route for these locations.",
          );
        }
      } finally {
        if (!cancelled) setEstimating(false);
      }
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [origin, destination, mode, bothEnds, carStatus, logMethod]);

  const compare = useMemo(() => vsDrivingCopy(estimate?.vsDrivingKg), [estimate]);

  function updateManualLeg(index: number, patch: Partial<ManualLegDraft>) {
    setEstimate(null);
    setEstimateError(null);
    setManualLegs((current) => {
      const next = current.map((leg) => ({ ...leg }));
      const oldDestination = next[index].destination;
      next[index] = { ...next[index], ...patch };
      if (patch.destination !== undefined && index + 1 < next.length) {
        if (!next[index + 1].origin.trim() || next[index + 1].origin === oldDestination) {
          next[index + 1].origin = patch.destination;
        }
      }
      return next;
    });
  }

  function addManualLeg() {
    setEstimate(null);
    setEstimateError(null);
    setManualLegs((current) => [
      ...current,
      {
        origin: current[current.length - 1]?.destination ?? "",
        destination: "",
        mode: "car",
      },
    ]);
  }

  function removeManualLeg(index: number) {
    setEstimate(null);
    setEstimateError(null);
    setManualLegs((current) => current.filter((_, i) => i !== index));
  }

  async function previewManual() {
    if (!manualLegs.length) return;
    const incomplete = manualLegs.findIndex((leg) => !leg.origin.trim() || !leg.destination.trim());
    if (incomplete >= 0) {
      setEstimateError(`Finish the origin and destination for leg ${incomplete + 1}.`);
      return;
    }

    setEstimating(true);
    setEstimate(null);
    setEstimateError(null);

    try {
      const routedLegs: RouteLeg[] = [];
      let totalDistanceKm = 0;
      let totalDurationMin = 0;
      let totalCo2eKg = 0;

      for (let i = 0; i < manualLegs.length; i += 1) {
        const draft = manualLegs[i];
        const result = await api.estimate({
          origin: draft.origin.trim(),
          destination: draft.destination.trim(),
          mode: draft.mode,
          direct: draft.mode === "plane",
        });
        const leg: RouteLeg = {
          mode: draft.mode,
          origin: result.origin,
          destination: result.destination,
          distanceKm: result.distanceKm,
          durationMin: result.durationMin,
          polyline: result.polyline,
          provider: result.provider,
          summary:
            draft.mode === "plane"
              ? `Fly ${shortLabel(result.origin.label)} → ${shortLabel(result.destination.label)}`
              : `Drive ${shortLabel(result.origin.label)} → ${shortLabel(result.destination.label)}`,
        };
        routedLegs.push(leg);
        totalDistanceKm += result.distanceKm;
        totalDurationMin += result.durationMin;
        totalCo2eKg += result.co2eKg;
      }

      const first = routedLegs[0];
      const last = routedLegs[routedLegs.length - 1];
      const overallMode: TransportMode = routedLegs.some((leg) => leg.mode === "plane") ? "plane" : "car";
      const effectiveFactor = totalDistanceKm > 0 ? (totalCo2eKg * 1000) / totalDistanceKm : 0;

      setEstimate({
        origin: first.origin,
        destination: last.destination,
        mode: overallMode,
        distanceKm: Math.round(totalDistanceKm * 1000) / 1000,
        durationMin: Math.round(totalDurationMin),
        polyline: routedLegs.flatMap((leg) => leg.polyline),
        legs: routedLegs,
        co2eKg: Math.round(totalCo2eKg * 1000) / 1000,
        factor: {
          mode: overallMode,
          gPerKm: Math.round(effectiveFactor * 1000) / 1000,
          source: "Manual itinerary · per-leg factors",
        },
        drivingCo2eKg: null,
        vsDrivingKg: null,
        provider: routedLegs.some((leg) => leg.mode === "plane") ? "haversine" : routedLegs[0].provider,
      });
    } catch (err) {
      setEstimateError(err instanceof Error ? err.message : "Could not preview this itinerary.");
    } finally {
      setEstimating(false);
    }
  }

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
        logMethod,
        distanceKm: estimate.distanceKm,
        durationMin: estimate.durationMin,
        co2eKg: estimate.co2eKg,
        polyline: estimate.polyline,
        legs: estimate.legs,
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

          <View style={styles.methodBox}>
            <Text style={styles.modeLabel}>Logging method</Text>
            <View style={styles.modes}>
              <Chip label="Automatic" selected={logMethod === "automatic"} onPress={() => switchMethod("automatic")} />
              <Chip label="Manual itinerary" selected={logMethod === "manual"} tone="muted" onPress={() => switchMethod("manual")} />
            </View>
            <Muted>
              {logMethod === "automatic"
                ? "Enter the trip endpoints and Luma will build the road / airport / flight itinerary for you."
                : "Already know the itinerary? Add each drive or flight leg yourself; Luma will only calculate it."}
            </Muted>
          </View>

          {logMethod === "automatic" ? (
            <>
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
                  <Text style={styles.holdBody}>Add a start and finish to build the trip automatically.</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.manualWrap}>
              {manualLegs.map((leg, index) => (
                <View key={index} style={styles.legEditor}>
                  <View style={styles.legHeader}>
                    <Text style={styles.legHeading}>Leg {index + 1}</Text>
                    {manualLegs.length > 1 ? (
                      <Pressable onPress={() => removeManualLeg(index)} accessibilityRole="button">
                        <Text style={styles.removeLeg}>Remove</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={styles.modes}>
                    {MODES.map((m) => (
                      <Chip
                        key={m}
                        label={m === "car" ? "Car" : "Plane"}
                        selected={leg.mode === m}
                        tone={m}
                        onPress={() => updateManualLeg(index, { mode: m })}
                      />
                    ))}
                  </View>

                  <AddressSearch
                    label="From"
                    value={leg.origin}
                    onChange={(value) => updateManualLeg(index, { origin: value })}
                    placeholder={leg.mode === "plane" ? "JFK or John F. Kennedy Airport" : "Start address"}
                  />
                  <AddressSearch
                    label="To"
                    value={leg.destination}
                    onChange={(value) => updateManualLeg(index, { destination: value })}
                    placeholder={leg.mode === "plane" ? "AVL or Asheville Regional Airport" : "Destination address"}
                  />
                </View>
              ))}

              <Button label="+ Add leg" variant="ghost" onPress={addManualLeg} />
              <Button
                label={estimating ? "Building itinerary…" : "Preview manual itinerary"}
                onPress={() => void previewManual()}
                disabled={estimating}
              />
            </View>
          )}

          {estimating && !estimate ? (
            <View style={styles.hold}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.holdBody}>
                {logMethod === "manual"
                  ? "Calculating each itinerary leg…"
                  : mode === "plane"
                    ? "Finding airports and flight connections…"
                    : "Plotting the route…"}
              </Text>
            </View>
          ) : null}

          {estimateError ? <Text style={styles.error}>{estimateError}</Text> : null}

          {estimate ? (
            <View style={styles.preview}>
              <MapPreview estimate={estimate} />
              <Text style={styles.factor}>
                {logMethod === "manual"
                  ? "Manual itinerary · each leg calculated independently"
                  : estimate.legs?.length
                    ? "Automatic multimodal estimate · airport network + road routing"
                    : `${estimate.factor.gPerKm} g/km · ${estimate.factor.source} · ${estimate.provider}`}
              </Text>
              {compare && logMethod === "automatic" ? <Text style={styles.compare}>{compare}</Text> : null}
            </View>
          ) : null}

          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

          <Button
            label={saving ? "Saving…" : logMethod === "manual" ? "Save itinerary" : "Save trip"}
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
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
    gap: space.md,
    paddingBottom: 48,
  },
  methodBox: {
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
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
  manualWrap: {
    gap: space.md,
  },
  legEditor: {
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  legHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legHeading: {
    fontFamily: font.display,
    fontSize: 18,
    color: colors.ink,
  },
  removeLeg: {
    fontFamily: font.bodyMed,
    fontSize: 13,
    color: colors.danger,
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